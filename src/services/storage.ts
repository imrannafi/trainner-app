import {
  TrainerProfile,
  Member,
  PaymentRecord,
  WorkoutPlan,
  WorkoutSession,
  DietPlan,
  MealLog,
  ProgressRecord,
  TrainingSessionEvent,
  Notice,
  InAppNotification,
  NeedsAttentionAlert,
  AuditLogItem,
  PaymentStatus,
  MembershipStatus,
  PaymentVerificationRequest,
  MemberRegistrationRequest
} from '../types';

import {
  SEED_TRAINER,
  SEED_MEMBERS,
  SEED_PAYMENTS,
  SEED_WORKOUT_PLANS,
  SEED_WORKOUT_SESSIONS,
  SEED_DIET_PLANS,
  SEED_MEAL_LOGS,
  SEED_PROGRESS_RECORDS,
  SEED_TRAINING_SESSIONS,
  SEED_NOTICES,
  SEED_NOTIFICATIONS,
  SEED_NEEDS_ATTENTION,
  SEED_AUDIT_LOGS,
  SEED_REGISTRATION_REQUESTS,
  SEED_PAYMENT_REQUESTS
} from '../data/seedData';

const STORAGE_KEYS = {
  TRAINER: 'apexpulse_trainer',
  MEMBERS: 'apexpulse_members',
  PAYMENTS: 'apexpulse_payments',
  WORKOUT_PLANS: 'apexpulse_workout_plans',
  WORKOUT_SESSIONS: 'apexpulse_workout_sessions',
  DIET_PLANS: 'apexpulse_diet_plans',
  MEAL_LOGS: 'apexpulse_meal_logs',
  PROGRESS_RECORDS: 'apexpulse_progress_records',
  TRAINING_SESSIONS: 'apexpulse_training_sessions',
  NOTICES: 'apexpulse_notices',
  NOTIFICATIONS: 'apexpulse_notifications',
  NEEDS_ATTENTION: 'apexpulse_needs_attention',
  AUDIT_LOGS: 'apexpulse_audit_logs',
  REGISTRATION_REQUESTS: 'apexpulse_registration_requests',
  PAYMENT_REQUESTS: 'apexpulse_payment_requests',
  INITIALIZED: 'azims_workout_manager_v2_init'
};

type Listener = () => void;

class FitnessStorageService {
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.init();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify();
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  public init(forceReset = false) {
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized || forceReset) {
      localStorage.setItem(STORAGE_KEYS.TRAINER, JSON.stringify(SEED_TRAINER));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(SEED_MEMBERS));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
      localStorage.setItem(STORAGE_KEYS.WORKOUT_PLANS, JSON.stringify(SEED_WORKOUT_PLANS));
      localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(SEED_WORKOUT_SESSIONS));
      localStorage.setItem(STORAGE_KEYS.DIET_PLANS, JSON.stringify(SEED_DIET_PLANS));
      localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(SEED_MEAL_LOGS));
      localStorage.setItem(STORAGE_KEYS.PROGRESS_RECORDS, JSON.stringify(SEED_PROGRESS_RECORDS));
      localStorage.setItem(STORAGE_KEYS.TRAINING_SESSIONS, JSON.stringify(SEED_TRAINING_SESSIONS));
      localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(SEED_NOTICES));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      localStorage.setItem(STORAGE_KEYS.NEEDS_ATTENTION, JSON.stringify(SEED_NEEDS_ATTENTION));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
      localStorage.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, JSON.stringify(SEED_REGISTRATION_REQUESTS));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_REQUESTS, JSON.stringify(SEED_PAYMENT_REQUESTS));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      this.notify();
    } else {
      // Ensure trainer profile has updated Coach Oliul Azim name and avatar
      const existingTrainer = this.getItem<TrainerProfile>(STORAGE_KEYS.TRAINER, SEED_TRAINER);
      if (existingTrainer.fullName.includes('Tariq') || !existingTrainer.avatarUrl.includes('oliul_azim')) {
        localStorage.setItem(STORAGE_KEYS.TRAINER, JSON.stringify(SEED_TRAINER));
        this.notify();
      }
    }
  }

  // --- TRAINER PROFILE ---
  public getTrainer(): TrainerProfile {
    const trainer = this.getItem<TrainerProfile>(STORAGE_KEYS.TRAINER, SEED_TRAINER);
    if (trainer.fullName.includes('Tariq')) {
      return SEED_TRAINER;
    }
    return trainer;
  }

  public updateTrainer(profile: Partial<TrainerProfile>) {
    const current = this.getTrainer();
    const updated = { ...current, ...profile };
    this.setItem(STORAGE_KEYS.TRAINER, updated);
    this.logAudit('UPDATE_TRAINER_PROFILE', 'Trainer business details updated');
    return updated;
  }

  // --- MEMBERS ---
  public getMembers(): Member[] {
    const members = this.getItem<Member[]>(STORAGE_KEYS.MEMBERS, SEED_MEMBERS);
    const payments = this.getPayments();
    const today = new Date().toISOString().split('T')[0];

    // Compute dynamic statuses based on dates and payments
    return members.map((m) => {
      const validPayments = payments
        .filter((p) => p.memberId === m.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = Math.max(0, m.packagePrice - validPayments);

      let paymentStatus: PaymentStatus = 'Paid';
      if (validPayments === 0) {
        paymentStatus = m.nextPaymentDeadline < today ? 'Overdue' : 'Unpaid';
      } else if (balance > 0) {
        paymentStatus = m.nextPaymentDeadline < today ? 'Overdue' : 'Partially Paid';
      }

      let status: MembershipStatus = m.status;
      const end = new Date(m.membershipEndDate).getTime();
      const now = new Date(today).getTime();
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        status = 'Expired';
      } else if (daysLeft <= 7 && status !== 'Inactive') {
        status = 'Expiring Soon';
      } else if (status !== 'Inactive') {
        status = 'Active';
      }

      return {
        ...m,
        amountPaid: validPayments,
        paymentStatus,
        status
      };
    });
  }

  public getMemberById(id: string): Member | undefined {
    return this.getMembers().find((m) => m.id === id);
  }

  public addMember(memberData: Omit<Member, 'id' | 'joinedAt' | 'amountPaid'>): Member {
    const members = this.getMembers();
    const newId = `mem-${Date.now().toString().slice(-4)}`;
    const newMember: Member = {
      ...memberData,
      id: newId,
      amountPaid: 0,
      joinedAt: new Date().toISOString().split('T')[0]
    };

    members.unshift(newMember);
    this.setItem(STORAGE_KEYS.MEMBERS, members);
    this.logAudit('ENROLL_MEMBER', `Created profile for ${newMember.fullName} (${newMember.membershipDuration})`);
    
    // Add activation notification
    this.addNotification({
      userId: newMember.userId,
      title: 'Welcome to Azims Workout Manager!',
      description: `Your membership has been set up with ${newMember.totalPackageSessions} coaching sessions.`,
      category: 'system'
    });

    return newMember;
  }

  public updateMember(id: string, updates: Partial<Member>): Member | null {
    const members = this.getMembers();
    const idx = members.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    members[idx] = { ...members[idx], ...updates };
    this.setItem(STORAGE_KEYS.MEMBERS, members);
    this.logAudit('UPDATE_MEMBER', `Updated member records for ${members[idx].fullName}`);
    return members[idx];
  }

  public activateMemberAccount(id: string): boolean {
    const member = this.getMemberById(id);
    if (!member) return false;
    this.updateMember(id, {
      activationStatus: 'Active',
      status: 'Active'
    });
    this.logAudit('ACTIVATE_MEMBER_ACCOUNT', `Client ${member.fullName} completed account activation`);
    return true;
  }

  public deleteMember(id: string): boolean {
    const member = this.getMemberById(id);
    if (!member) return false;

    const members = this.getMembers().filter((m) => m.id !== id);
    this.setItem(STORAGE_KEYS.MEMBERS, members);

    // Remove client ID from workout plans
    const workoutPlans = this.getWorkoutPlans();
    workoutPlans.forEach((wp) => {
      if (wp.assignedMemberIds.includes(id)) {
        wp.assignedMemberIds = wp.assignedMemberIds.filter((mId) => mId !== id);
      }
    });
    this.setItem(STORAGE_KEYS.WORKOUT_PLANS, workoutPlans);

    // Remove client ID from diet plans
    const dietPlans = this.getDietPlans();
    dietPlans.forEach((dp) => {
      if (dp.assignedMemberIds.includes(id)) {
        dp.assignedMemberIds = dp.assignedMemberIds.filter((mId) => mId !== id);
      }
    });
    this.setItem(STORAGE_KEYS.DIET_PLANS, dietPlans);

    this.logAudit('DELETE_MEMBER', `Coach removed client "${member.fullName}" (${member.phone}) from system`);
    return true;
  }

  public toggleGymCheckIn(memberId: string, date: string): string[] {
    const member = this.getMemberById(memberId);
    if (!member) return [];

    const currentDates = new Set(member.gymCheckInDates || []);
    const wasCheckedIn = currentDates.has(date);

    if (wasCheckedIn) {
      currentDates.delete(date);
    } else {
      currentDates.add(date);
    }

    const updatedDates = Array.from(currentDates).sort().reverse();
    this.updateMember(memberId, { gymCheckInDates: updatedDates });

    this.logAudit(
      'GYM_CHECK_IN',
      `Client ${member.fullName} ${wasCheckedIn ? 'removed check-in for' : 'checked into gym for'} ${date}`
    );

    return updatedDates;
  }

  public createCustomWorkoutPlanForMember(
    memberId: string,
    planData: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt' | 'assignedMemberIds'>
  ): WorkoutPlan {
    const newPlan = this.createWorkoutPlan({
      ...planData,
      assignedMemberIds: [memberId]
    });
    this.assignWorkoutPlan(memberId, newPlan.id);
    return newPlan;
  }

  public createCustomDietPlanForMember(
    memberId: string,
    planData: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt' | 'assignedMemberIds'>
  ): DietPlan {
    const newPlan = this.createDietPlan({
      ...planData,
      assignedMemberIds: [memberId]
    });
    this.assignDietPlan(memberId, newPlan.id);
    return newPlan;
  }

  // --- PAYMENTS ---
  public getPayments(): PaymentRecord[] {
    return this.getItem<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
  }

  public recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'status'> & { status?: 'Completed' | 'Pending' | 'Refunded' }): PaymentRecord {
    const payments = this.getPayments();
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now().toString().slice(-5)}`,
      status: paymentData.status || 'Completed'
    };

    payments.unshift(newPayment);
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);

    // Update member's paid amount & audit
    const member = this.getMemberById(paymentData.memberId);
    if (member) {
      const allValid = payments
        .filter((p) => p.memberId === member.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = Math.max(0, member.packagePrice - allValid);
      const isPaid = balance === 0;

      this.updateMember(member.id, {
        amountPaid: allValid,
        paymentStatus: isPaid ? 'Paid' : 'Partially Paid'
      });

      this.logAudit(
        'RECORD_PAYMENT',
        `Recorded ${paymentData.method} payment of ৳${paymentData.amount.toLocaleString()} for ${member.fullName}. Balance: ৳${balance.toLocaleString()}`
      );

      this.addNotification({
        userId: member.userId,
        title: 'Payment Received',
        description: `Your payment of ৳${paymentData.amount.toLocaleString()} via ${paymentData.method} was recorded. Outstanding: ৳${balance.toLocaleString()}.`,
        category: 'payment',
        linkTab: 'payments'
      });
    }

    return newPayment;
  }

  // --- PAYMENT VERIFICATION REQUESTS (bKash 01717014371 & Cash) ---
  public getPaymentRequests(): PaymentVerificationRequest[] {
    return this.getItem<PaymentVerificationRequest[]>(
      STORAGE_KEYS.PAYMENT_REQUESTS,
      SEED_PAYMENT_REQUESTS
    );
  }

  public submitPaymentRequest(
    requestData: Omit<PaymentVerificationRequest, 'id' | 'submittedAt' | 'status'>
  ): PaymentVerificationRequest {
    const requests = this.getPaymentRequests();
    const newRequest: PaymentVerificationRequest = {
      ...requestData,
      id: `payreq-${Date.now().toString().slice(-5)}`,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Pending'
    };

    requests.unshift(newRequest);
    this.setItem(STORAGE_KEYS.PAYMENT_REQUESTS, requests);

    // Notify Trainer
    this.addNotification({
      userId: 'usr-tariq',
      title: `Payment Request: ${newRequest.memberName}`,
      description: `${newRequest.memberName} submitted ৳${newRequest.amount.toLocaleString()} via ${newRequest.method}${newRequest.trxId ? ` (TrxID: ${newRequest.trxId})` : ''} for ${newRequest.billingMonth}. Please review & accept.`,
      category: 'payment',
      linkTab: 'payments'
    });

    this.logAudit(
      'SUBMIT_PAYMENT_REQUEST',
      `Member ${newRequest.memberName} submitted ${newRequest.method} payment request for ৳${newRequest.amount} (TrxID: ${newRequest.trxId || 'N/A'})`
    );

    return newRequest;
  }

  public approvePaymentRequest(requestId: string): boolean {
    const requests = this.getPaymentRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'Approved';
    req.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.setItem(STORAGE_KEYS.PAYMENT_REQUESTS, requests);

    // Record official completed payment record
    this.recordPayment({
      memberId: req.memberId,
      memberName: req.memberName,
      amount: req.amount,
      date: new Date().toISOString().split('T')[0],
      method: req.method,
      transactionRef: req.trxId || (req.method === 'bKash' ? 'bKash-01717014371' : 'CASH-VERIFIED'),
      billingPeriod: req.billingMonth || 'November 2026',
      recordedBy: 'Coach Oliul Azim',
      notes: req.notes || `Verified ${req.method} payment of ৳${req.amount.toLocaleString()}`,
      status: 'Completed'
    });

    // Update member status to Paid and extend deadline to 10th of next month
    const member = this.getMemberById(req.memberId);
    if (member) {
      this.updateMember(member.id, {
        paymentStatus: 'Paid',
        nextPaymentDeadline: '2026-12-10'
      });

      // Send notification to member that workouts & diet are unlocked
      this.addNotification({
        userId: member.userId,
        title: 'Payment Accepted! Plans Unlocked',
        description: `Coach Oliul Azim verified your ${req.method} payment of ৳${req.amount.toLocaleString()}. Your workout routine and diet blueprint are now fully active!`,
        category: 'payment',
        linkTab: 'member-dashboard'
      });
    }

    this.logAudit(
      'APPROVE_PAYMENT',
      `Coach Oliul Azim ACCEPTED payment request for ${req.memberName} (৳${req.amount} via ${req.method}). Diet & Workout unlocked.`
    );

    return true;
  }

  public rejectPaymentRequest(requestId: string, reason?: string): boolean {
    const requests = this.getPaymentRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'Rejected';
    req.rejectionReason = reason || 'Could not verify transaction with bKash/reception.';
    req.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.setItem(STORAGE_KEYS.PAYMENT_REQUESTS, requests);

    const member = this.getMemberById(req.memberId);
    if (member) {
      this.addNotification({
        userId: member.userId,
        title: 'Payment Request Not Verified',
        description: `Coach Oliul Azim could not verify your ${req.method} payment: ${req.rejectionReason}. Please check TrxID/details and resubmit.`,
        category: 'payment',
        linkTab: 'member-payments'
      });
    }

    this.logAudit(
      'REJECT_PAYMENT',
      `Coach Oliul Azim REJECTED payment request for ${req.memberName}: ${req.rejectionReason}`
    );

    return true;
  }

  // --- MEMBER ACCESS RULE (1st - 10th Monthly Window) ---
  public isMemberWorkoutDietUnlocked(memberId: string): {
    isUnlocked: boolean;
    reason?: string;
    pendingRequest?: PaymentVerificationRequest;
    rejectedRequest?: PaymentVerificationRequest;
  } {
    const member = this.getMemberById(memberId);
    if (!member) return { isUnlocked: false, reason: 'Member profile not found.' };

    const paymentRequests = this.getPaymentRequests();
    const pendingReq = paymentRequests.find(
      (pr) => pr.memberId === memberId && pr.status === 'Pending'
    );
    const rejectedReq = paymentRequests.find(
      (pr) => pr.memberId === memberId && pr.status === 'Rejected'
    );

    // If member has paymentStatus 'Paid', access is unlocked
    if (member.paymentStatus === 'Paid') {
      return { isUnlocked: true };
    }

    // Check if there is an approved payment request for current month
    const hasApprovedCurrentRequest = paymentRequests.some(
      (pr) => pr.memberId === memberId && pr.status === 'Approved'
    );
    if (hasApprovedCurrentRequest) {
      return { isUnlocked: true };
    }

    // Check if member has completed payment record for this month
    const payments = this.getPayments();
    const hasCurrentPayment = payments.some(
      (p) => p.memberId === memberId && p.status === 'Completed' && (p.billingPeriod.includes('November') || p.date.startsWith('2026-11'))
    );
    if (hasCurrentPayment) {
      return { isUnlocked: true };
    }

    // Access locked until payment is verified
    return {
      isUnlocked: false,
      reason: 'Monthly coaching fee due. Every member must complete payment between 1st–10th of the month.',
      pendingRequest: pendingReq,
      rejectedRequest: rejectedReq
    };
  }

  // --- MEMBER REGISTRATION REQUESTS (Self-registration with Body Condition & Photos) ---
  public getRegistrationRequests(): MemberRegistrationRequest[] {
    return this.getItem<MemberRegistrationRequest[]>(
      STORAGE_KEYS.REGISTRATION_REQUESTS,
      SEED_REGISTRATION_REQUESTS
    );
  }

  public addRegistrationRequest(
    data: Omit<MemberRegistrationRequest, 'id' | 'submittedAt' | 'status'>
  ): MemberRegistrationRequest {
    const requests = this.getRegistrationRequests();
    const newRequest: MemberRegistrationRequest = {
      ...data,
      id: `req-${Date.now().toString().slice(-4)}`,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Pending'
    };

    requests.unshift(newRequest);
    this.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, requests);

    // Notify Trainer about new registration with body condition details
    this.addNotification({
      userId: 'usr-tariq',
      title: 'New Member Registration Request',
      description: `${newRequest.fullName} submitted registration with full body condition details & photo. Please review & approve to create profile.`,
      category: 'system',
      linkTab: 'members'
    });

    this.logAudit(
      'REGISTER_REQUEST',
      `New client ${newRequest.fullName} (${newRequest.phone}) submitted registration with body condition description.`
    );

    return newRequest;
  }

  public approveRegistrationRequest(requestId: string): Member | null {
    const requests = this.getRegistrationRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return null;

    const newId = `mem-${Date.now().toString().slice(-4)}`;
    const newMember: Member = {
      id: newId,
      userId: `usr-${req.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      fullName: req.fullName,
      email: req.email,
      phone: req.phone,
      avatarUrl: req.avatarUrl || '/src/assets/images/member_avatar_male_1793655258127.jpg',
      age: req.age || 26,
      gender: req.gender || 'Male',
      heightCm: req.heightCm || 175,
      currentWeightKg: req.currentWeightKg || 75,
      targetWeightKg: req.targetWeightKg || req.currentWeightKg - 5,
      emergencyContact: {
        name: 'Family Contact',
        phone: req.phone,
        relation: 'Primary'
      },
      fitnessGoal: req.fitnessGoal || 'Fat Loss & Conditioning',
      fitnessLevel: req.fitnessLevel || 'Beginner',
      trainingPreferences: 'Standard Progressive Overload',
      medicalConditions: req.medicalConditions || 'None',
      injuriesOrRestrictions: req.injuriesOrRestrictions || 'None',
      trainerPrivateNotes: `Approved registration. Initial Body Condition: ${req.bodyConditionNotes}`,
      assignedWorkoutPlanId: 'wp-01',
      assignedDietPlanId: 'dp-01',
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      membershipDuration: req.membershipDuration || '1 month',
      trainingFrequencyPerWeek: 4,
      totalPackageSessions: 12,
      remainingSessions: 12,
      packagePrice: 3500,
      amountPaid: 0,
      nextPaymentDeadline: '2026-11-10', // 1-10 payment window
      paymentStatus: 'Unpaid',
      status: 'Active',
      activationStatus: 'Active',
      gymCheckInDates: [],
      joinedAt: new Date().toISOString().split('T')[0]
    };

    // Add to members
    const members = this.getMembers();
    members.unshift(newMember);
    this.setItem(STORAGE_KEYS.MEMBERS, members);

    // Update request
    req.status = 'Approved';
    req.createdMemberId = newMember.id;
    req.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, requests);

    // Assign to workout plan
    const workoutPlans = this.getWorkoutPlans();
    if (workoutPlans[0]) {
      workoutPlans[0].assignedMemberIds.push(newMember.id);
      this.setItem(STORAGE_KEYS.WORKOUT_PLANS, workoutPlans);
    }

    // Assign to diet plan
    const dietPlans = this.getDietPlans();
    if (dietPlans[0]) {
      dietPlans[0].assignedMemberIds.push(newMember.id);
      this.setItem(STORAGE_KEYS.DIET_PLANS, dietPlans);
    }

    this.addNotification({
      userId: newMember.userId,
      title: 'Welcome to Azims Workout Manager!',
      description: 'Coach Oliul Azim approved your registration application! Your profile, workout split, and diet plan are now ready.',
      category: 'system'
    });

    this.logAudit(
      'APPROVE_MEMBER_REGISTRATION',
      `Coach Oliul Azim APPROVED registration application for ${newMember.fullName}. Member profile #${newMember.id} created.`
    );

    return newMember;
  }

  public rejectRegistrationRequest(requestId: string, reason?: string): boolean {
    const requests = this.getRegistrationRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'Rejected';
    req.rejectionReason = reason || 'Requirements or capacity criteria not met.';
    req.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, requests);

    this.logAudit(
      'REJECT_MEMBER_REGISTRATION',
      `Coach Oliul Azim REJECTED registration application for ${req.fullName}: ${req.rejectionReason}`
    );

    return true;
  }

  // --- WORKOUT PLANS ---
  public getWorkoutPlans(): WorkoutPlan[] {
    return this.getItem<WorkoutPlan[]>(STORAGE_KEYS.WORKOUT_PLANS, SEED_WORKOUT_PLANS);
  }

  public createWorkoutPlan(plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>): WorkoutPlan {
    const plans = this.getWorkoutPlans();
    const newPlan: WorkoutPlan = {
      ...plan,
      id: `wp-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    plans.unshift(newPlan);
    this.setItem(STORAGE_KEYS.WORKOUT_PLANS, plans);
    this.logAudit('CREATE_WORKOUT_PLAN', `Created workout plan "${newPlan.name}"`);
    return newPlan;
  }

  public updateWorkoutPlan(id: string, updates: Partial<WorkoutPlan>): WorkoutPlan | null {
    const plans = this.getWorkoutPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    plans[idx] = {
      ...plans[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.setItem(STORAGE_KEYS.WORKOUT_PLANS, plans);
    this.logAudit('UPDATE_WORKOUT_PLAN', `Updated workout plan "${plans[idx].name}"`);
    return plans[idx];
  }

  public assignWorkoutPlan(memberId: string, planId: string): boolean {
    const member = this.getMemberById(memberId);
    const plan = this.getWorkoutPlans().find((p) => p.id === planId);
    if (!member || !plan) return false;

    this.updateMember(memberId, { assignedWorkoutPlanId: planId });

    // Update assignedMemberIds on plan
    const plans = this.getWorkoutPlans();
    plans.forEach((p) => {
      if (p.id === planId && !p.assignedMemberIds.includes(memberId)) {
        p.assignedMemberIds.push(memberId);
      } else if (p.id !== planId) {
        p.assignedMemberIds = p.assignedMemberIds.filter((id) => id !== memberId);
      }
    });
    this.setItem(STORAGE_KEYS.WORKOUT_PLANS, plans);

    this.logAudit('ASSIGN_WORKOUT_PLAN', `Assigned workout plan "${plan.name}" to ${member.fullName}`);

    this.addNotification({
      userId: member.userId,
      title: 'New Workout Routine Assigned',
      description: `Coach Oliul Azim assigned the "${plan.name}" routine to your profile. Check your daily schedule!`,
      category: 'workout',
      linkTab: 'workout'
    });

    return true;
  }

  // --- WORKOUT SESSIONS ---
  public getWorkoutSessions(): WorkoutSession[] {
    return this.getItem<WorkoutSession[]>(STORAGE_KEYS.WORKOUT_SESSIONS, SEED_WORKOUT_SESSIONS);
  }

  public logWorkoutSession(sessionData: Omit<WorkoutSession, 'id'>): WorkoutSession {
    const sessions = this.getWorkoutSessions();
    const newSession: WorkoutSession = {
      ...sessionData,
      id: `ws-${Date.now().toString().slice(-4)}`
    };
    sessions.unshift(newSession);
    this.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, sessions);

    this.logAudit('SUBMIT_WORKOUT_LOG', `Member ${sessionData.memberName} submitted workout report (${sessionData.dayName})`);
    return newSession;
  }

  public verifyWorkoutSession(id: string, status: 'Verified' | 'Needs Correction', feedback?: string) {
    const sessions = this.getWorkoutSessions();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    sessions[idx].trainerReviewStatus = status;
    sessions[idx].trainerFeedback = feedback;
    sessions[idx].verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, sessions);

    const member = this.getMemberById(sessions[idx].memberId);
    if (member) {
      this.addNotification({
        userId: member.userId,
        title: `Workout ${status}`,
        description: `Coach Oliul Azim marked your session as ${status}.${feedback ? ` Note: "${feedback}"` : ''}`,
        category: 'workout',
        linkTab: 'workout'
      });
    }

    this.logAudit('VERIFY_WORKOUT_SESSION', `Trainer set session ${id} status to ${status}`);
    return sessions[idx];
  }

  // --- DIET PLANS ---
  public getDietPlans(): DietPlan[] {
    return this.getItem<DietPlan[]>(STORAGE_KEYS.DIET_PLANS, SEED_DIET_PLANS);
  }

  public createDietPlan(plan: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'>): DietPlan {
    const plans = this.getDietPlans();
    const newPlan: DietPlan = {
      ...plan,
      id: `dp-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    plans.unshift(newPlan);
    this.setItem(STORAGE_KEYS.DIET_PLANS, plans);
    this.logAudit('CREATE_DIET_PLAN', `Created diet plan "${newPlan.name}"`);
    return newPlan;
  }

  public updateDietPlan(id: string, updates: Partial<DietPlan>): DietPlan | null {
    const plans = this.getDietPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    plans[idx] = {
      ...plans[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.setItem(STORAGE_KEYS.DIET_PLANS, plans);
    this.logAudit('UPDATE_DIET_PLAN', `Updated diet plan "${plans[idx].name}"`);
    return plans[idx];
  }

  public assignDietPlan(memberId: string, planId: string): boolean {
    const member = this.getMemberById(memberId);
    const plan = this.getDietPlans().find((p) => p.id === planId);
    if (!member || !plan) return false;

    this.updateMember(memberId, { assignedDietPlanId: planId });

    const plans = this.getDietPlans();
    plans.forEach((p) => {
      if (p.id === planId && !p.assignedMemberIds.includes(memberId)) {
        p.assignedMemberIds.push(memberId);
      } else if (p.id !== planId) {
        p.assignedMemberIds = p.assignedMemberIds.filter((id) => id !== memberId);
      }
    });
    this.setItem(STORAGE_KEYS.DIET_PLANS, plans);

    this.logAudit('ASSIGN_DIET_PLAN', `Assigned nutrition plan "${plan.name}" to ${member.fullName}`);

    this.addNotification({
      userId: member.userId,
      title: 'Personalized Nutrition Plan Assigned',
      description: `Coach Oliul configured your "${plan.name}" meal targets (${plan.dailyCalorieTarget} kcal).`,
      category: 'diet',
      linkTab: 'diet'
    });

    return true;
  }

  // --- MEAL LOGS & ACCOUNTABILITY ---
  public getMealLogs(): MealLog[] {
    return this.getItem<MealLog[]>(STORAGE_KEYS.MEAL_LOGS, SEED_MEAL_LOGS);
  }

  public logMeal(mealData: Omit<MealLog, 'id' | 'loggedAt' | 'trainerReviewStatus'>): MealLog {
    const logs = this.getMealLogs();
    const newLog: MealLog = {
      ...mealData,
      id: `ml-${Date.now().toString().slice(-4)}`,
      loggedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      trainerReviewStatus: 'Pending'
    };
    logs.unshift(newLog);
    this.setItem(STORAGE_KEYS.MEAL_LOGS, logs);

    this.logAudit('SUBMIT_MEAL_LOG', `${mealData.memberName} reported ${mealData.scheduledMealName} (${mealData.adherence})`);
    return newLog;
  }

  public reviewMealLog(
    id: string,
    status: 'Approved' | 'Correction Requested' | 'Flagged',
    feedback?: string
  ): MealLog | null {
    const logs = this.getMealLogs();
    const idx = logs.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    logs[idx].trainerReviewStatus = status;
    logs[idx].trainerFeedback = feedback;
    logs[idx].reviewedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.setItem(STORAGE_KEYS.MEAL_LOGS, logs);

    const member = this.getMemberById(logs[idx].memberId);
    if (member) {
      this.addNotification({
        userId: member.userId,
        title: `Meal Log ${status}`,
        description: `Coach Oliul reviewed your ${logs[idx].scheduledMealName} log.${feedback ? ` Feedback: "${feedback}"` : ''}`,
        category: 'diet',
        linkTab: 'diet'
      });
    }

    this.logAudit('REVIEW_MEAL_LOG', `Trainer reviewed meal log ${id} as ${status}`);
    return logs[idx];
  }

  // --- PROGRESS RECORDS ---
  public getProgressRecords(memberId?: string): ProgressRecord[] {
    const records = this.getItem<ProgressRecord[]>(STORAGE_KEYS.PROGRESS_RECORDS, SEED_PROGRESS_RECORDS);
    if (memberId) {
      return records.filter((r) => r.memberId === memberId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return records;
  }

  public addProgressRecord(recordData: Omit<ProgressRecord, 'id'>): ProgressRecord {
    const records = this.getProgressRecords();
    const newRecord: ProgressRecord = {
      ...recordData,
      id: `pr-${Date.now().toString().slice(-4)}`
    };
    records.push(newRecord);
    this.setItem(STORAGE_KEYS.PROGRESS_RECORDS, records);

    // Update member current weight
    const member = this.getMemberById(recordData.memberId);
    if (member && recordData.weightKg) {
      this.updateMember(member.id, { currentWeightKg: recordData.weightKg });
    }

    this.logAudit('ADD_PROGRESS_RECORD', `Recorded weight & measurements update (${recordData.weightKg} kg)`);
    return newRecord;
  }

  // --- TRAINING SESSIONS & CALENDAR ---
  public getTrainingSessions(): TrainingSessionEvent[] {
    return this.getItem<TrainingSessionEvent[]>(STORAGE_KEYS.TRAINING_SESSIONS, SEED_TRAINING_SESSIONS);
  }

  public scheduleSession(sessionData: Omit<TrainingSessionEvent, 'id'>): TrainingSessionEvent {
    const sessions = this.getTrainingSessions();
    const newSession: TrainingSessionEvent = {
      ...sessionData,
      id: `ts-${Date.now().toString().slice(-4)}`
    };
    sessions.unshift(newSession);
    this.setItem(STORAGE_KEYS.TRAINING_SESSIONS, sessions);
    this.logAudit('SCHEDULE_SESSION', `Scheduled coaching session with ${sessionData.memberName} on ${sessionData.sessionDate}`);

    const member = this.getMemberById(sessionData.memberId);
    if (member) {
      this.addNotification({
        userId: member.userId,
        title: 'Training Session Scheduled',
        description: `Coach Oliul scheduled your session: ${sessionData.title} on ${sessionData.sessionDate} at ${sessionData.startTime}.`,
        category: 'workout',
        linkTab: 'sessions'
      });
    }

    return newSession;
  }

  public markAttendance(
    sessionId: string,
    status: 'Scheduled' | 'Present' | 'Absent' | 'Cancelled' | 'Rescheduled',
    notes?: string
  ): TrainingSessionEvent | null {
    const sessions = this.getTrainingSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return null;

    const prevStatus = sessions[idx].attendanceStatus;
    sessions[idx].attendanceStatus = status;
    if (notes) sessions[idx].trainerNotes = notes;

    // Deduct remaining sessions if marked Present for the first time
    if (status === 'Present' && prevStatus !== 'Present') {
      const member = this.getMemberById(sessions[idx].memberId);
      if (member && member.remainingSessions > 0) {
        this.updateMember(member.id, {
          remainingSessions: member.remainingSessions - 1
        });
      }
    }

    this.setItem(STORAGE_KEYS.TRAINING_SESSIONS, sessions);
    this.logAudit('MARK_ATTENDANCE', `Session ${sessionId} marked as ${status}`);
    return sessions[idx];
  }

  // --- NOTICES ---
  public getNotices(): Notice[] {
    return this.getItem<Notice[]>(STORAGE_KEYS.NOTICES, SEED_NOTICES);
  }

  public publishNotice(noticeData: Omit<Notice, 'id' | 'readByMemberIds' | 'publishedDate'>): Notice {
    const notices = this.getNotices();
    const newNotice: Notice = {
      ...noticeData,
      id: `not-${Date.now().toString().slice(-4)}`,
      publishedDate: new Date().toISOString().split('T')[0],
      readByMemberIds: []
    };
    notices.unshift(newNotice);
    this.setItem(STORAGE_KEYS.NOTICES, notices);

    // Notify targets
    const members = this.getMembers();
    members.forEach((m) => {
      let isTarget = false;
      if (newNotice.targetAudience === 'All Members') isTarget = true;
      else if (newNotice.targetAudience === 'Specific Member' && newNotice.targetMemberId === m.id) isTarget = true;
      else if (newNotice.targetAudience === 'Overdue Members' && m.paymentStatus === 'Overdue') isTarget = true;
      else if (newNotice.targetAudience === 'Expiring Soon' && m.status === 'Expiring Soon') isTarget = true;

      if (isTarget) {
        this.addNotification({
          userId: m.userId,
          title: `Notice: ${newNotice.title}`,
          description: newNotice.message.substring(0, 90) + '...',
          category: 'notice',
          linkTab: 'notices'
        });
      }
    });

    this.logAudit('PUBLISH_NOTICE', `Published notice "${newNotice.title}" (${newNotice.targetAudience})`);
    return newNotice;
  }

  public markNoticeRead(noticeId: string, memberId: string) {
    const notices = this.getNotices();
    const notice = notices.find((n) => n.id === noticeId);
    if (notice && !notice.readByMemberIds.includes(memberId)) {
      notice.readByMemberIds.push(memberId);
      this.setItem(STORAGE_KEYS.NOTICES, notices);
    }
  }

  // --- IN-APP NOTIFICATIONS ---
  public getNotifications(userId?: string): InAppNotification[] {
    const list = this.getItem<InAppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    if (userId) {
      return list.filter((n) => n.userId === userId);
    }
    return list;
  }

  public addNotification(notification: Omit<InAppNotification, 'id' | 'isRead' | 'createdAt'>): InAppNotification {
    const list = this.getNotifications();
    const newNotification: InAppNotification = {
      ...notification,
      id: `in-${Date.now().toString().slice(-4)}`,
      isRead: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(newNotification);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, list);
    return newNotification;
  }

  public markNotificationRead(id: string) {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  // --- NEEDS ATTENTION ALERTS ---
  public getNeedsAttentionAlerts(): NeedsAttentionAlert[] {
    return this.getItem<NeedsAttentionAlert[]>(STORAGE_KEYS.NEEDS_ATTENTION, SEED_NEEDS_ATTENTION);
  }

  public resolveAlert(id: string) {
    const alerts = this.getNeedsAttentionAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (alert) {
      alert.isResolved = true;
      this.setItem(STORAGE_KEYS.NEEDS_ATTENTION, alerts);
      this.logAudit('RESOLVE_ALERT', `Dismissed/resolved alert: ${alert.title} for ${alert.memberName}`);
    }
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLogItem[] {
    return this.getItem<AuditLogItem[]>(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  }

  private logAudit(action: string, details: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLogItem = {
      id: `aud-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: 'Coach Oliul Azim',
      action,
      details
    };
    logs.unshift(newLog);
    // keep max 100
    if (logs.length > 100) logs.length = 100;
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- DASHBOARD CALCULATED METRICS ---
  public getCalculatedDashboardMetrics() {
    const members = this.getMembers();
    const payments = this.getPayments();
    const sessions = this.getWorkoutSessions();
    const meals = this.getMealLogs();
    const today = new Date().toISOString().split('T')[0];

    const activeMembers = members.filter((m) => m.status === 'Active').length;
    const inactiveMembers = members.filter((m) => m.status === 'Inactive').length;
    const expiringSoon = members.filter((m) => m.status === 'Expiring Soon').length;
    const expiredMembers = members.filter((m) => m.status === 'Expired').length;

    // Payments received in current month
    const currentMonth = today.substring(0, 7); // e.g. "2026-11"
    const monthlyPayments = payments
      .filter((p) => p.date.startsWith(currentMonth) && p.status === 'Completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPackageValues = members.reduce((sum, m) => sum + m.packagePrice, 0);
    const totalCollected = members.reduce((sum, m) => sum + m.amountPaid, 0);
    const totalOutstanding = Math.max(0, totalPackageValues - totalCollected);

    const unpaidMembers = members.filter((m) => m.paymentStatus === 'Unpaid' || m.paymentStatus === 'Overdue').length;

    // Workout completion today
    const todaysWorkouts = sessions.filter((s) => s.scheduledDate === today);
    const completedWorkouts = todaysWorkouts.filter((s) => s.status === 'Completed').length;
    const workoutCompletionRate = todaysWorkouts.length > 0
      ? Math.round((completedWorkouts / todaysWorkouts.length) * 100)
      : 88; // sensible default when no scheduled sessions

    // Diet compliance today
    const todaysMeals = meals.filter((m) => m.date === today);
    const compliantMeals = todaysMeals.filter((m) => m.adherence === 'Followed Plan').length;
    const dietComplianceRate = todaysMeals.length > 0
      ? Math.round((compliantMeals / todaysMeals.length) * 100)
      : 82;

    const missingReportsCount = members.filter((m) => {
      // member has assigned plan but no meal logged today
      const hasLogged = todaysMeals.some((ml) => ml.memberId === m.id);
      return m.status === 'Active' && !hasLogged;
    }).length;

    return {
      activeMembers,
      inactiveMembers,
      expiringSoon,
      expiredMembers,
      monthlyPayments,
      totalOutstanding,
      unpaidMembers,
      workoutCompletionRate,
      dietComplianceRate,
      missingReportsCount,
      totalMembers: members.length
    };
  }
}

export const storage = new FitnessStorageService();
