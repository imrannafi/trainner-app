// Supabase-backed data store.
//
// Screens read synchronously from an in-memory snapshot (the same getters the app used with
// localStorage) and write through async methods. Every write goes to Supabase; Realtime then
// reloads the snapshot, so a change made on one device shows up on every other device.

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { formatDateTime, todayDhaka } from '../lib/dates';
import {
  AccountRole,
  AuditLogItem,
  DietPlan,
  InAppNotification,
  MealLog,
  Member,
  MemberRegistrationRequest,
  MemberUpdate,
  NeedsAttentionAlert,
  Notice,
  PaymentRecord,
  PaymentVerificationRequest,
  ProgressRecord,
  StaffProfile,
  TrainerProfile,
  TrainingSessionEvent,
  WorkoutPlan,
  WorkoutSession
} from '../types';

type Listener = () => void;
type NotificationListener = (fresh: InAppNotification[]) => void;
type Row = Record<string, any>;

export interface SessionContext {
  userId: string;
  role: AccountRole;
  memberId: string | null;
}

interface Snapshot {
  trainers: TrainerProfile[];
  members: Member[];
  payments: PaymentRecord[];
  paymentRequests: PaymentVerificationRequest[];
  registrationRequests: MemberRegistrationRequest[];
  workoutPlans: WorkoutPlan[];
  dietPlans: DietPlan[];
  workoutSessions: WorkoutSession[];
  mealLogs: MealLog[];
  progressRecords: ProgressRecord[];
  trainingSessions: TrainingSessionEvent[];
  notices: Notice[];
  notifications: InAppNotification[];
  alerts: NeedsAttentionAlert[];
  auditLogs: AuditLogItem[];
  staff: StaffProfile[];
  memberUpdates: MemberUpdate[];
  unlocked: boolean;
}

const emptySnapshot = (): Snapshot => ({
  trainers: [],
  members: [],
  payments: [],
  paymentRequests: [],
  registrationRequests: [],
  workoutPlans: [],
  dietPlans: [],
  workoutSessions: [],
  mealLogs: [],
  progressRecords: [],
  trainingSessions: [],
  notices: [],
  notifications: [],
  alerts: [],
  auditLogs: [],
  staff: [],
  memberUpdates: [],
  unlocked: false
});

// Activity tables grow every day; the app works with a rolling window plus anything still pending.
const ACTIVITY_WINDOW_DAYS = 120;
const SIGNED_URL_SECONDS = 60 * 60;
const SIGNED_URL_REUSE_MS = 45 * 60 * 1000;

const num = (v: unknown, fallback = 0): number => (v === null || v === undefined || v === '' ? fallback : Number(v));
const optNum = (v: unknown): number | undefined => (v === null || v === undefined || v === '' ? undefined : Number(v));
const hhmm = (t: string | null | undefined): string => (t ? t.slice(0, 5) : '');
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const windowStart = () => {
  const d = new Date(`${todayDhaka()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ACTIVITY_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
};

const check = <T>(result: { data: T; error: any }, what: string): T => {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  return result.data;
};

class FitnessStorageService {
  private listeners = new Set<Listener>();
  private notificationListeners = new Set<NotificationListener>();
  private data: Snapshot = emptySnapshot();
  private ctx: SessionContext | null = null;
  private channel: RealtimeChannel | null = null;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private loading: Promise<void> | null = null;
  private reloadQueued = false;
  private knownNotificationIds: Set<string> | null = null;
  private signedUrls = new Map<string, { url: string; at: number }>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onNewNotifications(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public get context(): SessionContext | null {
    return this.ctx;
  }

  public get isStaff(): boolean {
    return this.ctx?.role === 'trainer' || this.ctx?.role === 'super_admin';
  }

  public get isSuperAdmin(): boolean {
    return this.ctx?.role === 'super_admin';
  }

  public async start(ctx: SessionContext) {
    this.stop();
    this.ctx = ctx;
    this.knownNotificationIds = null;
    await this.reload();

    this.channel = supabase
      .channel(`app-${ctx.userId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => this.scheduleReload())
      .subscribe();
  }

  public stop() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.ctx = null;
    this.data = emptySnapshot();
    this.signedUrls.clear();
    this.notify();
  }

  public scheduleReload(delayMs = 250) {
    if (!this.ctx) return;
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reload().catch((e) => console.error('Reload failed', e));
    }, delayMs);
  }

  public async reload(): Promise<void> {
    if (!this.ctx) return;
    if (this.loading) {
      this.reloadQueued = true;
      return this.loading;
    }
    this.loading = this.fetchSnapshot()
      .then((snap) => {
        this.detectNewNotifications(snap.notifications);
        this.data = snap;
        this.notify();
      })
      .finally(() => {
        this.loading = null;
        if (this.reloadQueued) {
          this.reloadQueued = false;
          this.scheduleReload(0);
        }
      });
    return this.loading;
  }

  private detectNewNotifications(next: InAppNotification[]) {
    const ids = new Set(next.map((n) => n.id));
    if (this.knownNotificationIds) {
      const fresh = next.filter((n) => !n.isRead && !this.knownNotificationIds!.has(n.id));
      if (fresh.length) this.notificationListeners.forEach((l) => l(fresh));
    }
    this.knownNotificationIds = ids;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  private async fetchSnapshot(): Promise<Snapshot> {
    const ctx = this.ctx!;
    const staff = this.isStaff;
    const since = windowStart();

    const [
      trainers, members, notes, checkIns, payments, paymentRequests, registrationRequests,
      workoutPlans, dietPlans, workoutSessions, mealLogs, progress, trainingSessions, notices,
      notifications, alerts, auditLogs, profiles, updates, unlocked
    ] = await Promise.all([
      supabase.from('trainer_profiles').select('*').order('is_main_coach', { ascending: false }),
      supabase.from('member_overview').select('*').order('created_at', { ascending: false }),
      staff ? supabase.from('member_private_notes').select('member_id, notes') : Promise.resolve({ data: [], error: null }),
      supabase.from('gym_check_ins').select('member_id, check_in_date').gte('check_in_date', since),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(2000),
      supabase.from('payment_requests').select('*').order('submitted_at', { ascending: false }).limit(1000),
      supabase.from('registration_requests').select('*').order('submitted_at', { ascending: false }).limit(500),
      supabase.from('workout_plans').select('*, workout_days(*, workout_exercises(*))').order('created_at', { ascending: false }),
      supabase.from('diet_plans').select('*, diet_meals(*, diet_food_items(*))').order('created_at', { ascending: false }),
      supabase.from('workout_sessions').select('*, workout_exercise_logs(*)')
        .or(`scheduled_date.gte.${since},trainer_review_status.eq."Pending Review"`)
        .order('scheduled_date', { ascending: false }).limit(1000),
      supabase.from('meal_logs').select('*, meal_log_items(*)')
        .or(`log_date.gte.${since},trainer_review_status.eq.Pending`)
        .order('logged_at', { ascending: false }).limit(1000),
      supabase.from('progress_records').select('*').order('record_date', { ascending: true }).limit(2000),
      supabase.from('training_sessions').select('*').gte('session_date', since).order('session_date', { ascending: false }).limit(1000),
      supabase.from('notices').select('*, notice_reads(member_id)').order('created_at', { ascending: false }).limit(300),
      supabase.from('notifications').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(200),
      staff ? supabase.from('needs_attention_alerts').select('*').order('alert_date', { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
      staff ? supabase.from('audit_logs').select('*').order('occurred_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      staff ? supabase.from('profiles').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      supabase.from('member_updates').select('*').order('created_at', { ascending: false }).limit(300),
      ctx.role === 'member' ? supabase.rpc('current_member_is_unlocked') : Promise.resolve({ data: true, error: null })
    ]);

    const memberRows = check(members, 'Members') as Row[];
    const notesById = new Map((check(notes, 'Notes') as Row[]).map((n) => [n.member_id, n.notes as string]));
    const checkInsById = new Map<string, string[]>();
    for (const c of check(checkIns, 'Check-ins') as Row[]) {
      const list = checkInsById.get(c.member_id) ?? [];
      list.push(c.check_in_date);
      checkInsById.set(c.member_id, list);
    }

    const workoutPlanRows = check(workoutPlans, 'Workout plans') as Row[];
    const dietPlanRows = check(dietPlans, 'Diet plans') as Row[];
    const mealRows = check(mealLogs, 'Meal logs') as Row[];
    const progressRows = check(progress, 'Progress') as Row[];
    const updateRows = check(updates, 'Client updates') as Row[];

    await this.signPaths([
      ...mealRows.map((r) => ['meal-photos', r.photo_path] as const),
      ...progressRows.map((r) => ['progress-photos', r.photo_path] as const),
      ...updateRows.map((r) => ['update-photos', r.photo_path] as const)
    ]);

    const mappedMembers = memberRows.map((r) => this.mapMember(r, notesById.get(r.id), checkInsById.get(r.id)));
    const byId = new Map(mappedMembers.map((m) => [m.id, m]));
    const nameOf = (id: string) => byId.get(id)?.fullName ?? 'Former client';
    const avatarOf = (id: string) => byId.get(id)?.avatarUrl ?? '';

    return {
      trainers: (check(trainers, 'Coach profiles') as Row[]).map(this.mapTrainer),
      members: mappedMembers,
      payments: (check(payments, 'Payments') as Row[]).map((r) => ({
        id: r.id,
        memberId: r.member_id ?? '',
        memberName: r.member_name,
        amount: num(r.amount),
        date: r.payment_date,
        method: r.method,
        transactionRef: r.transaction_ref ?? undefined,
        billingPeriod: r.billing_period,
        recordedBy: r.recorded_by,
        notes: r.notes ?? undefined,
        status: r.status
      })),
      paymentRequests: (check(paymentRequests, 'Payment requests') as Row[]).map((r) => ({
        id: r.id,
        memberId: r.member_id,
        memberName: nameOf(r.member_id),
        memberAvatar: avatarOf(r.member_id),
        memberPhone: byId.get(r.member_id)?.phone ?? '',
        amount: num(r.amount),
        method: r.method,
        targetBkashNumber: r.target_bkash_number ?? undefined,
        senderBkashNumber: r.sender_bkash_number ?? undefined,
        trxId: r.trx_id ?? undefined,
        submittedAt: formatDateTime(r.submitted_at),
        billingMonth: r.billing_month,
        notes: r.notes ?? undefined,
        status: r.status,
        rejectionReason: r.rejection_reason ?? undefined,
        reviewedAt: r.reviewed_at ? formatDateTime(r.reviewed_at) : undefined
      })),
      registrationRequests: (check(registrationRequests, 'Registration requests') as Row[]).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        avatarUrl: r.avatar_url,
        age: num(r.age),
        gender: r.gender,
        heightCm: num(r.height_cm),
        currentWeightKg: num(r.current_weight_kg),
        targetWeightKg: optNum(r.target_weight_kg),
        fitnessGoal: r.fitness_goal,
        fitnessLevel: r.fitness_level,
        medicalConditions: r.medical_conditions ?? undefined,
        injuriesOrRestrictions: r.injuries_or_restrictions ?? undefined,
        bodyConditionNotes: r.body_condition_notes,
        frontPhotoUrl: r.front_photo_url ?? undefined,
        membershipDuration: r.membership_duration,
        submittedAt: formatDateTime(r.submitted_at),
        status: r.status,
        rejectionReason: r.rejection_reason ?? undefined,
        reviewedAt: r.reviewed_at ? formatDateTime(r.reviewed_at) : undefined,
        createdMemberId: r.created_member_id ?? undefined
      })),
      workoutPlans: workoutPlanRows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        goal: p.goal,
        difficulty: p.difficulty,
        trainerInstructions: p.trainer_instructions,
        assignedMemberIds: mappedMembers.filter((m) => m.assignedWorkoutPlanId === p.id).map((m) => m.id),
        createdAt: String(p.created_at).slice(0, 10),
        updatedAt: String(p.updated_at).slice(0, 10),
        days: [...(p.workout_days ?? [])]
          .sort((a: Row, b: Row) => a.position - b.position)
          .map((d: Row) => ({
            id: d.id,
            dayName: d.day_name,
            focusArea: d.focus_area,
            isRestDay: d.is_rest_day,
            exercises: [...(d.workout_exercises ?? [])]
              .sort((a: Row, b: Row) => a.position - b.position)
              .map((e: Row) => ({
                id: e.id,
                name: e.name,
                muscleGroup: e.muscle_group,
                sets: num(e.sets),
                reps: e.reps,
                targetWeightKg: optNum(e.target_weight_kg),
                restSeconds: num(e.rest_seconds),
                instructions: e.instructions,
                mediaUrl: e.media_url ?? undefined,
                alternativeExercise: e.alternative_exercise ?? undefined
              }))
          }))
      })),
      dietPlans: dietPlanRows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        dailyCalorieTarget: num(p.daily_calorie_target),
        proteinTargetG: num(p.protein_target_g),
        carbsTargetG: num(p.carbs_target_g),
        fatTargetG: num(p.fat_target_g),
        waterIntakeLiters: num(p.water_intake_liters),
        dietaryPreferences: p.dietary_preferences,
        restrictions: p.restrictions,
        trainerInstructions: p.trainer_instructions,
        assignedMemberIds: mappedMembers.filter((m) => m.assignedDietPlanId === p.id).map((m) => m.id),
        createdAt: String(p.created_at).slice(0, 10),
        updatedAt: String(p.updated_at).slice(0, 10),
        meals: [...(p.diet_meals ?? [])]
          .sort((a: Row, b: Row) => a.position - b.position)
          .map((m: Row) => ({
            id: m.id,
            name: m.name,
            scheduledTime: hhmm(m.scheduled_time),
            preparationNotes: m.preparation_notes ?? undefined,
            alternativeOptions: m.alternative_options ?? undefined,
            foodItems: [...(m.diet_food_items ?? [])]
              .sort((a: Row, b: Row) => a.position - b.position)
              .map((f: Row) => ({
                id: f.id,
                name: f.name,
                quantity: num(f.quantity),
                unit: f.unit,
                calories: num(f.calories),
                proteinG: num(f.protein_g),
                carbsG: num(f.carbs_g),
                fatG: num(f.fat_g)
              }))
          }))
      })),
      workoutSessions: (check(workoutSessions, 'Workout sessions') as Row[]).map((s) => ({
        id: s.id,
        memberId: s.member_id,
        memberName: nameOf(s.member_id),
        planId: s.plan_id ?? '',
        planName: s.plan_name,
        dayName: s.day_name,
        scheduledDate: s.scheduled_date,
        startTime: hhmm(s.start_time),
        endTime: s.end_time ? hhmm(s.end_time) : undefined,
        durationMinutes: num(s.duration_minutes),
        completionPercentage: num(s.completion_percentage),
        status: s.status,
        memberNotes: s.member_notes ?? undefined,
        trainerReviewStatus: s.trainer_review_status,
        trainerFeedback: s.trainer_feedback ?? undefined,
        verifiedAt: s.verified_at ? formatDateTime(s.verified_at) : undefined,
        exerciseLogs: [...(s.workout_exercise_logs ?? [])]
          .sort((a: Row, b: Row) => a.position - b.position)
          .map((l: Row) => ({
            exerciseId: l.exercise_id ?? l.id,
            exerciseName: l.exercise_name,
            completed: l.completed,
            prescribedSets: num(l.prescribed_sets),
            prescribedReps: l.prescribed_reps,
            actualSets: num(l.actual_sets),
            actualReps: l.actual_reps,
            weightUsedKg: num(l.weight_used_kg),
            notes: l.notes ?? undefined
          }))
      })),
      mealLogs: mealRows.map((l) => ({
        id: l.id,
        memberId: l.member_id,
        memberName: nameOf(l.member_id),
        memberAvatar: avatarOf(l.member_id),
        dietPlanId: l.diet_plan_id ?? '',
        scheduledMealName: l.scheduled_meal_name,
        date: l.log_date,
        loggedAt: formatDateTime(l.logged_at),
        adherence: l.adherence,
        prescribedFoodsSummary: l.prescribed_foods_summary,
        totalCalories: num(l.total_calories),
        totalProteinG: num(l.total_protein_g),
        totalCarbsG: num(l.total_carbs_g),
        totalFatG: num(l.total_fat_g),
        photoUrl: this.cachedUrl('meal-photos', l.photo_path),
        memberNotes: l.member_notes ?? undefined,
        trainerReviewStatus: l.trainer_review_status,
        trainerFeedback: l.trainer_feedback ?? undefined,
        reviewedAt: l.reviewed_at ? formatDateTime(l.reviewed_at) : undefined,
        foodsConsumed: (l.meal_log_items ?? []).map((i: Row) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          calories: num(i.calories),
          proteinG: num(i.protein_g),
          carbsG: num(i.carbs_g),
          fatG: num(i.fat_g),
          wasInPlan: i.was_in_plan
        }))
      })),
      progressRecords: progressRows.map((r) => {
        const pbs = {
          benchPressKg: optNum(r.bench_press_kg),
          squatKg: optNum(r.squat_kg),
          deadliftKg: optNum(r.deadlift_kg),
          overheadPressKg: optNum(r.overhead_press_kg)
        };
        return {
          id: r.id,
          memberId: r.member_id,
          date: r.record_date,
          weightKg: num(r.weight_kg),
          waistCm: optNum(r.waist_cm),
          chestCm: optNum(r.chest_cm),
          armCm: optNum(r.arm_cm),
          photoUrl: this.cachedUrl('progress-photos', r.photo_path),
          personalBests: Object.values(pbs).some((v) => v !== undefined) ? pbs : undefined,
          notes: r.notes ?? undefined,
          trainerFeedback: r.trainer_feedback ?? undefined
        };
      }),
      trainingSessions: (check(trainingSessions, 'Training sessions') as Row[]).map((t) => ({
        id: t.id,
        memberId: t.member_id,
        memberName: nameOf(t.member_id),
        trainerId: t.trainer_id ?? '',
        sessionDate: t.session_date,
        startTime: hhmm(t.start_time),
        endTime: hhmm(t.end_time),
        title: t.title,
        focusArea: t.focus_area,
        attendanceStatus: t.attendance_status,
        trainerNotes: t.trainer_notes ?? undefined
      })),
      notices: (check(notices, 'Notices') as Row[]).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        category: n.category,
        targetAudience: n.target_audience,
        targetMemberId: n.target_member_id ?? undefined,
        priority: n.priority,
        publishedDate: n.published_date,
        expiryDate: n.expiry_date ?? undefined,
        readByMemberIds: (n.notice_reads ?? []).map((r: Row) => r.member_id)
      })),
      notifications: (check(notifications, 'Notifications') as Row[]).map((n) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        description: n.description,
        category: n.category,
        isRead: n.is_read,
        createdAt: n.created_at,
        linkTab: n.link_tab ?? undefined,
        actorMemberId: n.actor_member_id ?? undefined,
        actorName: n.actor_name ?? undefined,
        actorAvatarUrl: n.actor_avatar_url ?? undefined,
        entityType: n.entity_type ?? undefined,
        entityId: n.entity_id ?? undefined,
        imageBucket: n.image_bucket ?? undefined,
        imagePath: n.image_path ?? undefined
      })),
      alerts: (check(alerts, 'Alerts') as Row[]).map((a) => ({
        id: a.id,
        memberId: a.member_id,
        memberName: nameOf(a.member_id),
        memberAvatar: avatarOf(a.member_id),
        category: a.category,
        severity: a.severity,
        title: a.title,
        description: a.description,
        recommendedAction: a.recommended_action,
        date: a.alert_date,
        isResolved: a.is_resolved
      })),
      auditLogs: (check(auditLogs, 'Audit log') as Row[]).map((a) => ({
        id: a.id,
        timestamp: formatDateTime(a.occurred_at, true),
        actor: a.actor,
        action: a.action,
        details: a.details
      })),
      staff: (check(profiles, 'Accounts') as Row[]).map((p) => ({
        id: p.id,
        role: p.role,
        email: p.email ?? '',
        fullName: p.full_name ?? p.email ?? 'Unnamed account',
        username: p.username ?? undefined,
        avatarUrl: p.avatar_url ?? undefined,
        createdAt: p.created_at
      })),
      memberUpdates: updateRows.map((u) => ({
        id: u.id,
        memberId: u.member_id,
        memberName: nameOf(u.member_id),
        memberAvatar: avatarOf(u.member_id),
        subject: u.subject,
        message: u.message,
        photoUrl: this.cachedUrl('update-photos', u.photo_path),
        createdAt: u.created_at
      })),
      unlocked: Boolean(check(unlocked, 'Access status'))
    };
  }

  private mapTrainer = (r: Row): TrainerProfile => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    gymName: r.gym_name,
    title: r.title,
    phone: r.phone,
    email: r.email,
    avatarUrl: r.avatar_url ?? '',
    currency: r.currency,
    timezone: r.timezone,
    bio: r.bio,
    isMainCoach: r.is_main_coach,
    bkashNumber: r.bkash_number ?? ''
  });

  private mapMember(r: Row, notes: string | undefined, checkIns: string[] | undefined): Member {
    return {
      id: r.id,
      userId: r.user_id ?? '',
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      avatarUrl: r.avatar_url ?? '',
      age: num(r.age),
      gender: r.gender,
      heightCm: num(r.height_cm),
      currentWeightKg: num(r.current_weight_kg),
      targetWeightKg: optNum(r.target_weight_kg),
      emergencyContact: {
        name: r.emergency_contact_name,
        phone: r.emergency_contact_phone,
        relation: r.emergency_contact_relation
      },
      fitnessGoal: r.fitness_goal,
      fitnessLevel: r.fitness_level,
      trainingPreferences: r.training_preferences,
      medicalConditions: r.medical_conditions ?? undefined,
      injuriesOrRestrictions: r.injuries_or_restrictions ?? undefined,
      trainerPrivateNotes: notes ?? '',
      assignedWorkoutPlanId: r.assigned_workout_plan_id ?? undefined,
      assignedDietPlanId: r.assigned_diet_plan_id ?? undefined,
      membershipStartDate: r.membership_start_date,
      membershipEndDate: r.membership_end_date,
      membershipDuration: r.membership_duration,
      trainingFrequencyPerWeek: num(r.training_frequency_per_week),
      totalPackageSessions: num(r.total_package_sessions),
      remainingSessions: num(r.remaining_sessions),
      packagePrice: num(r.package_price),
      amountPaid: num(r.amount_paid),
      nextPaymentDeadline: r.next_payment_deadline,
      paymentStatus: r.payment_status,
      status: r.status,
      activationStatus: r.activation_status,
      gymCheckInDates: [...(checkIns ?? [])].sort().reverse(),
      joinedAt: r.joined_at
    };
  }

  // ---------------------------------------------------------------------------
  // Photos
  // ---------------------------------------------------------------------------
  private cachedUrl(bucket: string, path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    return this.signedUrls.get(`${bucket}/${path}`)?.url;
  }

  private async signPaths(entries: ReadonlyArray<readonly [string, string | null | undefined]>) {
    const now = Date.now();
    const needed = new Map<string, string[]>();
    for (const [bucket, path] of entries) {
      if (!path) continue;
      const hit = this.signedUrls.get(`${bucket}/${path}`);
      if (hit && now - hit.at < SIGNED_URL_REUSE_MS) continue;
      const list = needed.get(bucket) ?? [];
      list.push(path);
      needed.set(bucket, list);
    }
    await Promise.all(
      [...needed].map(async ([bucket, paths]) => {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_SECONDS);
        if (error || !data) {
          console.error('Could not sign photo links', bucket, error);
          return;
        }
        for (const item of data) {
          if (item.signedUrl && item.path) this.signedUrls.set(`${bucket}/${item.path}`, { url: item.signedUrl, at: now });
        }
      })
    );
  }

  public async getSignedUrl(bucket: string, path: string): Promise<string | undefined> {
    await this.signPaths([[bucket, path]]);
    return this.cachedUrl(bucket, path);
  }

  private async uploadPhoto(bucket: string, file: Blob): Promise<string> {
    const userId = this.ctx?.userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('You need to be signed in to upload photos.');
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false
    });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    return path;
  }

  /** Uploads to the public avatars bucket and returns a permanent URL. */
  public async uploadAvatar(file: Blob): Promise<string> {
    const path = await this.uploadPhoto('avatars', file);
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  // ---------------------------------------------------------------------------
  // Read API (synchronous, from the snapshot)
  // ---------------------------------------------------------------------------
  public getTrainers(): TrainerProfile[] {
    return this.data.trainers;
  }

  public getMainCoach(): TrainerProfile | undefined {
    return this.data.trainers.find((t) => t.isMainCoach) ?? this.data.trainers[0];
  }

  /** The signed-in coach's own profile; for clients, the main coach. */
  public getTrainer(): TrainerProfile {
    const own = this.data.trainers.find((t) => t.userId === this.ctx?.userId);
    return (
      own ??
      this.getMainCoach() ?? {
        id: '',
        userId: '',
        fullName: 'Coach',
        gymName: '',
        title: '',
        phone: '',
        email: '',
        avatarUrl: '',
        currency: '৳',
        timezone: 'Asia/Dhaka',
        bio: '',
        isMainCoach: false,
        bkashNumber: ''
      }
    );
  }

  public getMembers(): Member[] {
    return this.data.members;
  }

  public getMemberById(id: string): Member | undefined {
    return this.data.members.find((m) => m.id === id);
  }

  public getPayments(): PaymentRecord[] {
    return this.data.payments;
  }

  public getPaymentRequests(): PaymentVerificationRequest[] {
    return this.data.paymentRequests;
  }

  public getRegistrationRequests(): MemberRegistrationRequest[] {
    return this.data.registrationRequests;
  }

  public getWorkoutPlans(): WorkoutPlan[] {
    return this.data.workoutPlans;
  }

  public getDietPlans(): DietPlan[] {
    return this.data.dietPlans;
  }

  public getWorkoutSessions(): WorkoutSession[] {
    return this.data.workoutSessions;
  }

  public getMealLogs(): MealLog[] {
    return this.data.mealLogs;
  }

  public getProgressRecords(memberId?: string): ProgressRecord[] {
    return memberId ? this.data.progressRecords.filter((r) => r.memberId === memberId) : this.data.progressRecords;
  }

  public getTrainingSessions(): TrainingSessionEvent[] {
    return this.data.trainingSessions;
  }

  public getNotices(): Notice[] {
    return this.data.notices;
  }

  public getNotifications(): InAppNotification[] {
    return this.data.notifications;
  }

  public getNeedsAttentionAlerts(): NeedsAttentionAlert[] {
    return this.data.alerts;
  }

  public getAuditLogs(): AuditLogItem[] {
    return this.data.auditLogs;
  }

  public getStaffProfiles(): StaffProfile[] {
    return this.data.staff;
  }

  public getMemberUpdates(): MemberUpdate[] {
    return this.data.memberUpdates;
  }

  public isMemberWorkoutDietUnlocked(memberId: string): {
    isUnlocked: boolean;
    reason?: string;
    pendingRequest?: PaymentVerificationRequest;
    rejectedRequest?: PaymentVerificationRequest;
  } {
    if (this.isStaff) return { isUnlocked: true };
    if (this.data.unlocked) return { isUnlocked: true };
    const mine = this.data.paymentRequests.filter((r) => r.memberId === memberId);
    return {
      isUnlocked: false,
      reason: 'Monthly coaching fee due. Every member must complete payment between 1st–10th of the month.',
      pendingRequest: mine.find((r) => r.status === 'Pending'),
      rejectedRequest: mine.find((r) => r.status === 'Rejected')
    };
  }

  // ---------------------------------------------------------------------------
  // Coach profile
  // ---------------------------------------------------------------------------
  public async updateTrainer(updates: Partial<TrainerProfile>) {
    const own = this.data.trainers.find((t) => t.userId === this.ctx?.userId);
    if (!own) throw new Error('No coach profile is linked to this account.');
    const patch: Row = {};
    if (updates.fullName !== undefined) patch.full_name = updates.fullName;
    if (updates.gymName !== undefined) patch.gym_name = updates.gymName;
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl;
    if (updates.bkashNumber !== undefined) patch.bkash_number = updates.bkashNumber;
    check(await supabase.from('trainer_profiles').update(patch).eq('id', own.id), 'Saving coach profile');
    await this.reload();
  }

  public async uploadTrainerPhoto(file: Blob) {
    const url = await this.uploadAvatar(file);
    await this.updateTrainer({ avatarUrl: url });
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------
  public async addMember(data: Partial<Member> & { avatarFile?: Blob | null }): Promise<string> {
    const avatarUrl = data.avatarFile ? await this.uploadAvatar(data.avatarFile) : data.avatarUrl || null;
    const row = this.memberToRow(data);
    row.avatar_url = avatarUrl;
    row.activation_status = 'Invited';
    const inserted = check(await supabase.from('members').insert(row).select('id').single(), 'Enrolling client') as Row;
    if (data.trainerPrivateNotes) {
      check(
        await supabase.from('member_private_notes').insert({ member_id: inserted.id, notes: data.trainerPrivateNotes }),
        'Saving coach notes'
      );
    }
    await this.reload();
    return inserted.id;
  }

  private memberToRow(m: Partial<Member>): Row {
    const row: Row = {};
    const set = (key: string, value: unknown) => {
      if (value !== undefined) row[key] = value;
    };
    set('full_name', m.fullName);
    set('email', m.email);
    set('phone', m.phone);
    set('avatar_url', m.avatarUrl);
    set('age', m.age);
    set('gender', m.gender);
    set('height_cm', m.heightCm);
    set('current_weight_kg', m.currentWeightKg);
    set('target_weight_kg', m.targetWeightKg);
    if (m.emergencyContact) {
      row.emergency_contact_name = m.emergencyContact.name;
      row.emergency_contact_phone = m.emergencyContact.phone;
      row.emergency_contact_relation = m.emergencyContact.relation;
    }
    set('fitness_goal', m.fitnessGoal);
    set('fitness_level', m.fitnessLevel);
    set('training_preferences', m.trainingPreferences);
    set('medical_conditions', m.medicalConditions);
    set('injuries_or_restrictions', m.injuriesOrRestrictions);
    set('assigned_workout_plan_id', m.assignedWorkoutPlanId);
    set('assigned_diet_plan_id', m.assignedDietPlanId);
    set('membership_start_date', m.membershipStartDate);
    set('membership_end_date', m.membershipEndDate);
    set('membership_duration', m.membershipDuration);
    set('training_frequency_per_week', m.trainingFrequencyPerWeek);
    set('total_package_sessions', m.totalPackageSessions);
    set('remaining_sessions', m.remainingSessions);
    set('package_price', m.packagePrice);
    set('next_payment_deadline', m.nextPaymentDeadline);
    if (m.status === 'Inactive' || m.status === 'Active') row.base_status = m.status;
    if (m.activationStatus) row.activation_status = m.activationStatus;
    return row;
  }

  public async updateMember(id: string, updates: Partial<Member>) {
    const row = this.memberToRow(updates);
    if (Object.keys(row).length) {
      check(await supabase.from('members').update(row).eq('id', id), 'Updating client');
    }
    if (updates.trainerPrivateNotes !== undefined) {
      check(
        await supabase.from('member_private_notes').upsert({ member_id: id, notes: updates.trainerPrivateNotes }),
        'Saving coach notes'
      );
    }
    await this.reload();
  }

  /** Emails the client an invitation and links their new login to this record. */
  public async activateMemberAccount(id: string) {
    const { data, error } = await supabase.functions.invoke('invite-member', { body: { memberId: id } });
    if (error) {
      let detail = error.message;
      try {
        const body = await (error as any).context?.json?.();
        if (body?.error) detail = body.error;
      } catch {
        // keep the generic message
      }
      throw new Error(`Invitation failed: ${detail}`);
    }
    await this.reload();
    return data;
  }

  public async deleteMember(id: string) {
    check(await supabase.from('members').delete().eq('id', id), 'Removing client');
    await this.reload();
  }

  /** Returns the new list straight away so the calendar responds instantly. */
  public toggleGymCheckIn(memberId: string, date: string): string[] {
    const member = this.getMemberById(memberId);
    const current = new Set(member?.gymCheckInDates ?? []);
    const wasCheckedIn = current.has(date);
    wasCheckedIn ? current.delete(date) : current.add(date);
    const next = [...current].sort().reverse();

    if (member) {
      this.data = {
        ...this.data,
        members: this.data.members.map((m) => (m.id === memberId ? { ...m, gymCheckInDates: next } : m))
      };
      this.notify();
    }

    const request = wasCheckedIn
      ? supabase.from('gym_check_ins').delete().eq('member_id', memberId).eq('check_in_date', date)
      : supabase.from('gym_check_ins').insert({ member_id: memberId, check_in_date: date });
    Promise.resolve(request).then(({ error }) => {
      if (error) {
        this.reportError(`Check-in not saved: ${error.message}`);
        this.scheduleReload(0);
      }
    });
    return next;
  }

  // ---------------------------------------------------------------------------
  // Plans
  // ---------------------------------------------------------------------------
  private stripIds<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (key, v) => (key === 'id' ? undefined : v)));
  }

  private async saveWorkout(plan: Partial<WorkoutPlan>): Promise<string> {
    const id = check(await supabase.rpc('save_workout_plan', { p_plan: plan }), 'Saving workout plan') as string;
    if (plan.assignedMemberIds?.length) {
      check(
        await supabase.from('members').update({ assigned_workout_plan_id: id }).in('id', plan.assignedMemberIds),
        'Assigning workout plan'
      );
    }
    return id;
  }

  private async saveDiet(plan: Partial<DietPlan>): Promise<string> {
    const id = check(await supabase.rpc('save_diet_plan', { p_plan: plan }), 'Saving diet plan') as string;
    if (plan.assignedMemberIds?.length) {
      check(
        await supabase.from('members').update({ assigned_diet_plan_id: id }).in('id', plan.assignedMemberIds),
        'Assigning diet plan'
      );
    }
    return id;
  }

  // New plans always get new ids, so duplicating a plan never moves rows out of the original.
  public async createWorkoutPlan(plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> | WorkoutPlan) {
    const id = await this.saveWorkout(this.stripIds(plan));
    await this.reload();
    return id;
  }

  public async updateWorkoutPlan(id: string, updates: Partial<WorkoutPlan>) {
    const current = this.data.workoutPlans.find((p) => p.id === id);
    if (!current) throw new Error('Workout plan not found.');
    await this.saveWorkout({ ...current, ...updates, id, assignedMemberIds: updates.assignedMemberIds });
    await this.reload();
  }

  public async assignWorkoutPlan(memberId: string, planId: string) {
    check(await supabase.from('members').update({ assigned_workout_plan_id: planId }).eq('id', memberId), 'Assigning workout plan');
    await this.reload();
  }

  public async createCustomWorkoutPlanForMember(memberId: string, planData: Partial<WorkoutPlan>) {
    await this.saveWorkout({ ...this.stripIds(planData), assignedMemberIds: [memberId] });
    await this.reload();
  }

  public async createDietPlan(plan: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'> | DietPlan) {
    const id = await this.saveDiet(this.stripIds(plan));
    await this.reload();
    return id;
  }

  public async updateDietPlan(id: string, updates: Partial<DietPlan>) {
    const current = this.data.dietPlans.find((p) => p.id === id);
    if (!current) throw new Error('Diet plan not found.');
    await this.saveDiet({ ...current, ...updates, id, assignedMemberIds: updates.assignedMemberIds });
    await this.reload();
  }

  public async assignDietPlan(memberId: string, planId: string) {
    check(await supabase.from('members').update({ assigned_diet_plan_id: planId }).eq('id', memberId), 'Assigning diet plan');
    await this.reload();
  }

  public async createCustomDietPlanForMember(memberId: string, planData: Partial<DietPlan>) {
    await this.saveDiet({ ...this.stripIds(planData), assignedMemberIds: [memberId] });
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------
  public async logWorkoutSession(session: Partial<WorkoutSession>) {
    const inserted = check(
      await supabase
        .from('workout_sessions')
        .insert({
          member_id: session.memberId,
          plan_id: isUuid(session.planId) ? session.planId : null,
          plan_name: session.planName ?? 'Workout',
          day_name: session.dayName ?? '',
          scheduled_date: session.scheduledDate || todayDhaka(),
          start_time: session.startTime || '00:00',
          end_time: session.endTime || null,
          duration_minutes: session.durationMinutes ?? 0,
          completion_percentage: session.completionPercentage ?? 0,
          status: session.status ?? 'Completed',
          member_notes: session.memberNotes || null
        })
        .select('id')
        .single(),
      'Saving workout'
    ) as Row;

    const logs = (session.exerciseLogs ?? []).map((l, position) => ({
      session_id: inserted.id,
      exercise_id: isUuid(l.exerciseId) ? l.exerciseId : null,
      position,
      exercise_name: l.exerciseName,
      completed: l.completed,
      prescribed_sets: l.prescribedSets,
      prescribed_reps: l.prescribedReps,
      actual_sets: l.actualSets,
      actual_reps: l.actualReps,
      weight_used_kg: l.weightUsedKg,
      notes: l.notes || null
    }));
    if (logs.length) check(await supabase.from('workout_exercise_logs').insert(logs), 'Saving exercise logs');
    await this.reload();
  }

  public async verifyWorkoutSession(id: string, status: 'Verified' | 'Needs Correction', feedback?: string) {
    check(
      await supabase
        .from('workout_sessions')
        .update({ trainer_review_status: status, trainer_feedback: feedback || null, verified_at: new Date().toISOString() })
        .eq('id', id),
      'Reviewing workout'
    );
    await this.reload();
  }

  public async logMeal(meal: Partial<MealLog> & { photoFile?: Blob | null }) {
    const photoPath = meal.photoFile ? await this.uploadPhoto('meal-photos', meal.photoFile) : null;
    const inserted = check(
      await supabase
        .from('meal_logs')
        .insert({
          member_id: meal.memberId,
          diet_plan_id: isUuid(meal.dietPlanId) ? meal.dietPlanId : null,
          scheduled_meal_name: meal.scheduledMealName,
          log_date: meal.date || todayDhaka(),
          adherence: meal.adherence,
          prescribed_foods_summary: meal.prescribedFoodsSummary ?? '',
          total_calories: meal.totalCalories ?? 0,
          total_protein_g: meal.totalProteinG ?? 0,
          total_carbs_g: meal.totalCarbsG ?? 0,
          total_fat_g: meal.totalFatG ?? 0,
          photo_path: photoPath,
          member_notes: meal.memberNotes || null
        })
        .select('id')
        .single(),
      'Saving meal log'
    ) as Row;

    const items = (meal.foodsConsumed ?? []).map((i) => ({
      meal_log_id: inserted.id,
      name: i.name,
      quantity: i.quantity,
      calories: i.calories,
      protein_g: i.proteinG,
      carbs_g: i.carbsG,
      fat_g: i.fatG,
      was_in_plan: i.wasInPlan
    }));
    if (items.length) check(await supabase.from('meal_log_items').insert(items), 'Saving meal items');
    await this.reload();
  }

  public async reviewMealLog(id: string, status: 'Approved' | 'Correction Requested' | 'Flagged', feedback?: string) {
    check(
      await supabase
        .from('meal_logs')
        .update({ trainer_review_status: status, trainer_feedback: feedback || null, reviewed_at: new Date().toISOString() })
        .eq('id', id),
      'Reviewing meal log'
    );
    await this.reload();
  }

  public async addProgressRecord(record: Partial<ProgressRecord> & { photoFile?: Blob | null }) {
    const photoPath = record.photoFile ? await this.uploadPhoto('progress-photos', record.photoFile) : null;
    check(
      await supabase.from('progress_records').insert({
        member_id: record.memberId,
        record_date: record.date || todayDhaka(),
        weight_kg: record.weightKg,
        waist_cm: record.waistCm ?? null,
        chest_cm: record.chestCm ?? null,
        arm_cm: record.armCm ?? null,
        photo_path: photoPath,
        bench_press_kg: record.personalBests?.benchPressKg ?? null,
        squat_kg: record.personalBests?.squatKg ?? null,
        deadlift_kg: record.personalBests?.deadliftKg ?? null,
        overhead_press_kg: record.personalBests?.overheadPressKg ?? null,
        notes: record.notes || null,
        trainer_feedback: this.isStaff ? record.trainerFeedback || null : null
      }),
      'Saving progress'
    );
    await this.reload();
  }

  public async sendMemberUpdate(memberId: string, subject: string, message: string, photoFile?: Blob | null) {
    const photoPath = photoFile ? await this.uploadPhoto('update-photos', photoFile) : null;
    check(
      await supabase.from('member_updates').insert({ member_id: memberId, subject, message, photo_path: photoPath }),
      'Sending update'
    );
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Training calendar
  // ---------------------------------------------------------------------------
  public async scheduleSession(s: Partial<TrainingSessionEvent>) {
    const trainerId = isUuid(s.trainerId) ? s.trainerId : this.getTrainer().id || null;
    check(
      await supabase.from('training_sessions').insert({
        member_id: s.memberId,
        trainer_id: trainerId,
        session_date: s.sessionDate,
        start_time: s.startTime,
        end_time: s.endTime,
        title: s.title,
        focus_area: s.focusArea ?? '',
        attendance_status: s.attendanceStatus ?? 'Scheduled',
        trainer_notes: s.trainerNotes || null
      }),
      'Scheduling session'
    );
    await this.reload();
  }

  public async markAttendance(
    sessionId: string,
    status: 'Scheduled' | 'Present' | 'Absent' | 'Cancelled' | 'Rescheduled',
    notes?: string
  ) {
    const patch: Row = { attendance_status: status };
    if (notes) patch.trainer_notes = notes;
    check(await supabase.from('training_sessions').update(patch).eq('id', sessionId), 'Updating attendance');
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------
  public async recordPayment(p: Partial<PaymentRecord>) {
    const member = p.memberId ? this.getMemberById(p.memberId) : undefined;
    check(
      await supabase.from('payments').insert({
        member_id: p.memberId,
        member_name: p.memberName || member?.fullName || 'Client',
        amount: p.amount,
        payment_date: p.date || todayDhaka(),
        method: p.method,
        transaction_ref: p.transactionRef || null,
        billing_period: p.billingPeriod || '',
        recorded_by: this.getTrainer().fullName,
        notes: p.notes || null,
        status: p.status ?? 'Completed'
      }),
      'Recording payment'
    );
    await this.reload();
  }

  public async submitPaymentRequest(r: Partial<PaymentVerificationRequest>) {
    check(
      await supabase.from('payment_requests').insert({
        member_id: r.memberId,
        amount: r.amount,
        method: r.method,
        target_bkash_number: r.method === 'bKash' ? this.getMainCoach()?.bkashNumber || null : null,
        sender_bkash_number: r.senderBkashNumber || null,
        trx_id: r.trxId?.trim() || null,
        billing_month: r.billingMonth,
        notes: r.notes || null
      }),
      'Submitting payment'
    );
    await this.reload();
  }

  public async approvePaymentRequest(id: string) {
    check(await supabase.rpc('approve_payment_request', { p_request_id: id }), 'Approving payment');
    await this.reload();
  }

  public async rejectPaymentRequest(id: string, reason?: string) {
    check(await supabase.rpc('reject_payment_request', { p_request_id: id, p_reason: reason ?? null }), 'Declining payment');
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------
  public async addRegistrationRequest(
    data: Omit<MemberRegistrationRequest, 'id' | 'submittedAt' | 'status' | 'avatarUrl'> & {
      avatarUrl?: string;
      avatarFile?: Blob | null;
    }
  ) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Please sign in before submitting your registration.');
    const avatarUrl = data.avatarFile ? await this.uploadAvatar(data.avatarFile) : data.avatarUrl;
    if (!avatarUrl) throw new Error('Please upload your profile photo.');
    check(
      await supabase.from('registration_requests').insert({
        user_id: auth.user.id,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        avatar_url: avatarUrl,
        age: data.age,
        gender: data.gender,
        height_cm: data.heightCm,
        current_weight_kg: data.currentWeightKg,
        target_weight_kg: data.targetWeightKg ?? null,
        fitness_goal: data.fitnessGoal,
        fitness_level: data.fitnessLevel,
        medical_conditions: data.medicalConditions || null,
        injuries_or_restrictions: data.injuriesOrRestrictions || null,
        body_condition_notes: data.bodyConditionNotes,
        front_photo_url: avatarUrl,
        membership_duration: data.membershipDuration
      }),
      'Submitting registration'
    );
  }

  public async approveRegistrationRequest(id: string): Promise<Member | null> {
    const memberId = check(
      await supabase.rpc('approve_registration_request', { p_request_id: id }),
      'Approving registration'
    ) as string;
    await this.reload();
    return this.getMemberById(memberId) ?? null;
  }

  public async rejectRegistrationRequest(id: string, reason?: string) {
    check(
      await supabase.rpc('reject_registration_request', { p_request_id: id, p_reason: reason ?? null }),
      'Declining registration'
    );
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Notices, notifications, alerts
  // ---------------------------------------------------------------------------
  public async publishNotice(n: Partial<Notice>) {
    check(
      await supabase.from('notices').insert({
        title: n.title,
        message: n.message,
        category: n.category ?? 'General',
        target_audience: n.targetAudience ?? 'All Members',
        target_member_id: n.targetAudience === 'Specific Member' ? n.targetMemberId : null,
        priority: n.priority ?? 'Normal',
        expiry_date: n.expiryDate || null
      }),
      'Publishing notice'
    );
    await this.reload();
  }

  public async markNoticeRead(noticeId: string, memberId: string) {
    const notice = this.data.notices.find((n) => n.id === noticeId);
    if (!notice || notice.readByMemberIds.includes(memberId)) return;
    check(
      await supabase
        .from('notice_reads')
        .upsert({ notice_id: noticeId, member_id: memberId }, { onConflict: 'notice_id,member_id', ignoreDuplicates: true }),
      'Marking notice read'
    );
    await this.reload();
  }

  public async markNotificationRead(id: string) {
    const target = this.data.notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;
    this.data = {
      ...this.data,
      notifications: this.data.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    };
    this.notify();
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      this.reportError(`Could not update notification: ${error.message}`);
      this.scheduleReload(0);
    }
  }

  public async markAllNotificationsRead() {
    if (!this.ctx) return;
    this.data = { ...this.data, notifications: this.data.notifications.map((n) => ({ ...n, isRead: true })) };
    this.notify();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', this.ctx.userId)
      .eq('is_read', false);
    if (error) {
      this.reportError(`Could not update notifications: ${error.message}`);
      this.scheduleReload(0);
    }
  }

  public async resolveAlert(id: string) {
    check(await supabase.from('needs_attention_alerts').update({ is_resolved: true }).eq('id', id), 'Resolving alert');
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Super admin
  // ---------------------------------------------------------------------------
  public async setUserRole(userId: string, role: AccountRole) {
    check(await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role }), 'Changing role');
    await this.reload();
  }

  // ---------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------
  private errorHandler: ((message: string) => void) | null = null;

  public onError(handler: (message: string) => void) {
    this.errorHandler = handler;
  }

  public reportError(message: string) {
    console.error(message);
    this.errorHandler?.(message);
  }

  // ---------------------------------------------------------------------------
  // Dashboard metrics
  // ---------------------------------------------------------------------------
  public getCalculatedDashboardMetrics() {
    const members = this.data.members;
    const today = todayDhaka();
    const currentMonth = today.substring(0, 7);
    const todaysWorkouts = this.data.workoutSessions.filter((s) => s.scheduledDate === today);
    const todaysMeals = this.data.mealLogs.filter((m) => m.date === today);
    const totalPackageValues = members.reduce((sum, m) => sum + m.packagePrice, 0);
    const totalCollected = members.reduce((sum, m) => sum + m.amountPaid, 0);

    return {
      activeMembers: members.filter((m) => m.status === 'Active').length,
      inactiveMembers: members.filter((m) => m.status === 'Inactive').length,
      expiringSoon: members.filter((m) => m.status === 'Expiring Soon').length,
      expiredMembers: members.filter((m) => m.status === 'Expired').length,
      monthlyPayments: this.data.payments
        .filter((p) => p.date.startsWith(currentMonth) && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0),
      totalOutstanding: Math.max(0, totalPackageValues - totalCollected),
      unpaidMembers: members.filter((m) => m.paymentStatus === 'Unpaid' || m.paymentStatus === 'Overdue').length,
      workoutCompletionRate: todaysWorkouts.length
        ? Math.round((todaysWorkouts.filter((s) => s.status === 'Completed').length / todaysWorkouts.length) * 100)
        : 0,
      dietComplianceRate: todaysMeals.length
        ? Math.round((todaysMeals.filter((m) => m.adherence === 'Followed Plan').length / todaysMeals.length) * 100)
        : 0,
      missingReportsCount: members.filter((m) => m.status === 'Active' && !todaysMeals.some((ml) => ml.memberId === m.id)).length,
      totalMembers: members.length
    };
  }
}

export const storage = new FitnessStorageService();
