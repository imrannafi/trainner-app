import React, { useState } from 'react';
import {
  Camera,
  Calendar,
  CreditCard,
  Clock,
  AlertTriangle,
  Play,
  Check,
  Send,
  Lock,
  Utensils
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Member,
  WorkoutPlan,
  DietPlan,
  WorkoutSession,
  WorkoutExerciseLog,
  MealLog,
  PaymentRecord,
  ProgressRecord,
  TrainingSessionEvent,
  Notice,
  MealPlanAdherence,
  PaymentVerificationRequest,
  TrainerProfile
} from '../../types';
import { Avatar, EmptyState, showToast } from '../common/CommonUI';
import { AreaTrendChart } from '../common/SvgCharts';
import { GymAttendanceCalendar } from '../common/GymAttendanceCalendar';
import { PayModal } from './PayModal';
import { storage } from '../../services/storage';
import { CoachConnectCard } from './CoachConnectCard';
import { PHOTO_READ_ERROR, resizeImage } from '../../lib/image';
import { nowTimeDhaka, todayDhaka } from '../../lib/dates';

interface MemberPortalViewProps {
  member: Member;
  assignedWorkout?: WorkoutPlan;
  assignedDiet?: DietPlan;
  workoutSessions: WorkoutSession[];
  mealLogs: MealLog[];
  payments: PaymentRecord[];
  progressRecords: ProgressRecord[];
  trainingSessions: TrainingSessionEvent[];
  notices: Notice[];
  paymentRequests?: PaymentVerificationRequest[];
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  coach?: TrainerProfile;
  onSendUpdate: (subject: string, message: string, photo: Blob | null) => Promise<void>;
  onSubmitWorkout: (session: any) => Promise<void>;
  onSubmitMealLog: (mealLog: any) => Promise<void>;
  onAddProgressRecord: (progress: any) => Promise<void>;
  onMarkNoticeRead: (noticeId: string) => void;
  onToggleGymCheckIn: (memberId: string, dateStr: string) => void;
  onSubmitPaymentRequest?: (
    data: Omit<PaymentVerificationRequest, 'id' | 'submittedAt' | 'status'>
  ) => Promise<void>;
}

type MemberSectionTab =
  | 'dashboard'
  | 'attendance'
  | 'workout'
  | 'diet'
  | 'meallog'
  | 'progress'
  | 'payments'
  | 'schedule'
  | 'notices';

export const MemberPortalView: React.FC<MemberPortalViewProps> = ({
  member,
  assignedWorkout,
  assignedDiet,
  mealLogs,
  payments,
  progressRecords,
  trainingSessions,
  notices,
  paymentRequests,
  activeTab,
  onSelectTab,
  coach,
  onSendUpdate,
  onSubmitWorkout,
  onSubmitMealLog,
  onAddProgressRecord,
  onMarkNoticeRead,
  onToggleGymCheckIn,
  onSubmitPaymentRequest
}) => {
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const accessStatus = storage.isMemberWorkoutDietUnlocked(member.id);
  const memberPaymentRequests = (paymentRequests ?? []).filter(
    (pr) => pr.memberId === member.id
  );

  const [memberTab, setMemberTab] = useState<MemberSectionTab>('dashboard');

  React.useEffect(() => {
    if (activeTab) {
      if (activeTab === 'member-dashboard') setMemberTab('dashboard');
      else if (activeTab === 'member-attendance') setMemberTab('attendance');
      else if (activeTab === 'member-workout') setMemberTab('workout');
      else if (activeTab === 'member-diet') setMemberTab('diet');
      else if (activeTab === 'member-meallog') setMemberTab('meallog');
      else if (activeTab === 'member-progress') setMemberTab('progress');
      else if (activeTab === 'member-payments') setMemberTab('payments');
      else if (activeTab === 'member-schedule') setMemberTab('schedule');
      else if (activeTab === 'member-notices') setMemberTab('notices');
    }
  }, [activeTab]);

  const switchTab = (tab: MemberSectionTab) => {
    setMemberTab(tab);
    onSelectTab?.(`member-${tab}`);
  };

  // Workout Session active logging state
  const [isWorkingOut, setIsWorkingOut] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<
    Record<string, { completed: boolean; actualSets: number; actualReps: string; weightUsedKg: number; notes: string }>
  >({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('65');

  // Meal Log Submission Form state
  const [mealName, setMealName] = useState('Lunch');
  const mealDate = todayDhaka();
  const [mealAdherence, setMealAdherence] = useState<MealPlanAdherence>('Followed Plan');
  const [foodsInput, setFoodsInput] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFat, setMealFat] = useState('');
  const [mealPhotoPreview, setMealPhotoPreview] = useState<string>('');
  const [mealPhotoFile, setMealPhotoFile] = useState<Blob | null>(null);
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [progressPhotoFile, setProgressPhotoFile] = useState<Blob | null>(null);
  const [progressPhotoPreview, setProgressPhotoPreview] = useState('');
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  const pickPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (b: Blob | null) => void,
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setFile(resized);
      setPreview((old) => {
        if (old.startsWith('blob:')) URL.revokeObjectURL(old);
        return URL.createObjectURL(resized);
      });
    } catch {
      showToast(PHOTO_READ_ERROR, 'error');
    } finally {
      input.value = '';
    }
  };
  const [memberNotesInput, setMemberNotesInput] = useState('');

  // Progress Logger Form state
  const [logWeight, setLogWeight] = useState(member.currentWeightKg.toString());
  const [logWaist, setLogWaist] = useState('');
  const [logBenchPR, setLogBenchPR] = useState('');

  // Sync logWeight when member changes
  React.useEffect(() => {
    setLogWeight(member.currentWeightKg.toString());
  }, [member.id, member.currentWeightKg]);

  // Calculations
  const memberPayments = payments.filter((p) => p.memberId === member.id);
  const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, member.packagePrice - totalPaid);

  const memberMeals = mealLogs.filter((m) => m.memberId === member.id);
  const memberProgress = progressRecords.filter((r) => r.memberId === member.id);
  const memberTrainingSessions = trainingSessions.filter((s) => s.memberId === member.id);
  // The database already returns only the notices aimed at this member.
  const memberNotices = notices.filter(
    (n) => n.targetAudience !== 'Specific Member' || n.targetMemberId === member.id
  );

  const today = todayDhaka();
  const todayMs = new Date(today).getTime();
  const endMs = new Date(member.membershipEndDate).getTime();
  const remainingDays = Math.max(0, Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24)));

  // Today's meal logs
  const todayMeals = memberMeals.filter((m) => m.date === today);
  const novCheckIns = (member.gymCheckInDates || []).filter((d) => d.startsWith(today.slice(0, 7))).length;
  const totalCheckIns = (member.gymCheckInDates || []).length;

  // Active workout day
  const currentWorkoutDay = assignedWorkout?.days[selectedDayIdx] || assignedWorkout?.days[0];

  const handleStartWorkout = () => {
    setIsWorkingOut(true);
    if (currentWorkoutDay) {
      const initial: any = {};
      currentWorkoutDay.exercises.forEach((ex) => {
        initial[ex.id] = {
          completed: true,
          actualSets: ex.sets,
          actualReps: ex.reps,
          weightUsedKg: ex.targetWeightKg || 0,
          notes: ''
        };
      });
      setExerciseProgress(initial);
    }
  };

  const handleSubmitWorkoutSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkoutDay || isSubmittingWorkout) return;

    const completedExercises: WorkoutExerciseLog[] = currentWorkoutDay.exercises.map((ex) => {
      const prog = exerciseProgress[ex.id] || {
        completed: true,
        actualSets: ex.sets,
        actualReps: ex.reps,
        weightUsedKg: ex.targetWeightKg || 0,
        notes: ''
      };
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        completed: prog.completed,
        prescribedSets: ex.sets,
        prescribedReps: ex.reps,
        actualSets: prog.actualSets,
        actualReps: prog.actualReps,
        weightUsedKg: prog.weightUsedKg,
        notes: prog.notes
      };
    });

    const duration = parseInt(workoutDuration) || 60;
    const endTime = nowTimeDhaka();
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = Math.max(0, endH * 60 + endM - duration);
    const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
    const doneCount = completedExercises.filter((x) => x.completed).length;

    const newSession: WorkoutSession = {
      id: '',
      memberId: member.id,
      memberName: member.fullName,
      planId: assignedWorkout?.id || '',
      planName: assignedWorkout?.name || 'Workout',
      dayName: currentWorkoutDay.dayName,
      scheduledDate: todayDhaka(),
      startTime,
      endTime,
      durationMinutes: duration,
      exerciseLogs: completedExercises,
      completionPercentage: completedExercises.length ? Math.round((doneCount / completedExercises.length) * 100) : 100,
      status: 'Completed',
      trainerReviewStatus: 'Pending Review',
      memberNotes: sessionNotes
    };

    setIsSubmittingWorkout(true);
    try {
      await onSubmitWorkout(newSession);
      setIsWorkingOut(false);
      setSessionNotes('');
      showToast(`Great work! Your workout was sent to ${coach?.fullName ?? 'your coach'} to verify.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsSubmittingWorkout(false);
    }
  };

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMeal) return;
    if (!mealPhotoFile) {
      showToast('Please add a photo of your meal for your coach to verify.', 'error');
      return;
    }

    const newMealLog: MealLog & { photoFile: Blob | null } = {
      id: '',
      photoFile: mealPhotoFile,
      memberId: member.id,
      memberName: member.fullName,
      memberAvatar: member.avatarUrl,
      dietPlanId: assignedDiet?.id || '',
      date: mealDate,
      scheduledMealName: mealName,
      adherence: mealAdherence,
      prescribedFoodsSummary:
        assignedDiet?.meals
          .find((m) => m.name === mealName)
          ?.foodItems.map((f) => f.name)
          .join(', ') || 'Custom meal',
      foodsConsumed: [
        {
          id: '',
          name: foodsInput,
          quantity: 'Portion as consumed',
          calories: parseInt(mealCalories) || 0,
          proteinG: parseInt(mealProtein) || 0,
          carbsG: parseInt(mealCarbs) || 0,
          fatG: parseInt(mealFat) || 0,
          wasInPlan: mealAdherence === 'Followed Plan' || mealAdherence === 'Partially Followed'
        }
      ],
      totalCalories: parseInt(mealCalories) || 0,
      totalProteinG: parseInt(mealProtein) || 0,
      totalCarbsG: parseInt(mealCarbs) || 0,
      totalFatG: parseInt(mealFat) || 0,
      memberNotes: memberNotesInput,
      trainerReviewStatus: 'Pending',
      loggedAt: ''
    };

    setIsSubmittingMeal(true);
    try {
      await onSubmitMealLog(newMealLog);
      showToast(`Meal photo submitted! ${coach?.fullName ?? 'Your coach'} has been notified.`);
      setFoodsInput('');
      setMealCalories('');
      setMealProtein('');
      setMealCarbs('');
      setMealFat('');
      setMemberNotesInput('');
      setMealPhotoFile(null);
      setMealPhotoPreview('');
      switchTab('dashboard');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsSubmittingMeal(false);
    }
  };

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProgress) return;
    const newProg: ProgressRecord & { photoFile: Blob | null } = {
      id: '',
      photoFile: progressPhotoFile,
      memberId: member.id,
      date: todayDhaka(),
      weightKg: parseFloat(logWeight) || member.currentWeightKg,
      waistCm: logWaist ? parseFloat(logWaist) : undefined,
      personalBests: logBenchPR ? { benchPressKg: parseFloat(logBenchPR) } : undefined,
      notes: 'Morning weigh-in recorded via Member Portal'
    };
    setIsSavingProgress(true);
    try {
      await onAddProgressRecord(newProg);
      showToast('Body assessment saved! Progress history updated.');
      setLogWaist('');
      setLogBenchPR('');
      setProgressPhotoFile(null);
      setProgressPhotoPreview('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsSavingProgress(false);
    }
  };

  const renderAccessLockedCard = (sectionName: 'Workout Routine' | 'Diet Blueprint') => (
    <div className="bg-white rounded-3xl p-8 sm:p-10 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] text-center max-w-xl mx-auto space-y-5">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
        <Lock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Monthly Fee Window: 1st – 10th
        </div>
        <h2 className="text-2xl font-black text-[#171717]">
          {sectionName} Locked
        </h2>
        <p className="text-xs text-neutral-500 leading-relaxed max-w-md mx-auto">
          Per Azims Workout Manager gym policy, all members must complete their monthly coaching fee between the <strong>1st and 10th of every month</strong>. Once Coach Oliul Azim verifies and accepts your payment, your {sectionName.toLowerCase()} will unlock immediately.
        </p>
      </div>

      {accessStatus.pendingRequest ? (
        <div className="p-4 rounded-2xl bg-[#F0EEFC] border border-[#7155E8]/30 text-xs text-[#7155E8] text-left space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="w-4 h-4 shrink-0" />
            Payment Verification Pending Coach Review
          </div>
          <p className="text-neutral-600 leading-snug">
            You submitted <strong>৳{accessStatus.pendingRequest.amount.toLocaleString()}</strong> via{' '}
            <strong>{accessStatus.pendingRequest.method}</strong>
            {accessStatus.pendingRequest.trxId ? ` (TrxID: ${accessStatus.pendingRequest.trxId})` : ''} on {accessStatus.pendingRequest.submittedAt}.
            Waiting for Coach Oliul Azim to accept.
          </p>
        </div>
      ) : accessStatus.rejectedRequest ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 text-left space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Payment Request Rejected
          </div>
          <p className="leading-snug">
            Reason: {accessStatus.rejectedRequest.rejectionReason}. Please re-submit with the correct bKash TrxID or hand in cash to the coach.
          </p>
        </div>
      ) : null}

      <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => setIsPayModalOpen(true)}
          className="px-6 py-3.5 rounded-2xl bg-[#E2136E] hover:bg-[#c00f5c] text-white text-xs font-bold shadow-[0_4px_16px_rgba(226,19,110,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          Pay via bKash{coach?.bkashNumber ? ` (${coach.bkashNumber})` : ''} / Cash Now
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. TOP GREETING & ATHLETE PROFILE HERO */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <Avatar
                src={member.avatarUrl}
                name={member.fullName}
                size="lg"
                className="rounded-3xl border-2 border-white shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#10B981] border-2 border-white rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-bold text-[#7155E8] uppercase tracking-wider">
                  Athlete Member
                </span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span className="text-xs text-neutral-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#171717] mt-0.5 truncate">
                {(() => {
                  const h = Number(nowTimeDhaka().slice(0, 2));
                  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
                })()}, {member.fullName.split(' ')[0]}!
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Goal: <span className="font-semibold text-neutral-700">{member.fitnessGoal}</span> · {member.fitnessLevel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#E2136E] hover:bg-[#c00f5c] text-white text-xs font-bold shadow-[0_4px_16px_rgba(226,19,110,0.35)] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              Pay Fee (bKash/Cash)
            </button>
            <button
              type="button"
              onClick={() => switchTab('meallog')}
              className="px-4 py-2.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 shrink-0" />
              Log Meal Photo
            </button>
            <button
              type="button"
              onClick={() => {
                switchTab('workout');
                handleStartWorkout();
              }}
              className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              Start Workout
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Category Filter Pills (Navigation Strip — all 9 Member sections accessible) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Overview' },
          { id: 'attendance', label: `Gym Check-ins (${novCheckIns}d)` },
          { id: 'workout', label: 'Workout Routine' },
          { id: 'diet', label: 'Diet Blueprint' },
          { id: 'meallog', label: 'Submit Meal' },
          { id: 'progress', label: 'Body Metrics' },
          { id: 'schedule', label: `PT Schedule (${memberTrainingSessions.length})` },
          { id: 'payments', label: 'Invoices & Receipts' },
          { id: 'notices', label: `Coach Notices (${memberNotices.length})` }
        ].map((tab) => {
          const isSelected = memberTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id as MemberSectionTab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                isSelected
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-white border border-neutral-200/80 text-neutral-600 hover:text-[#171717] hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Animated Tab Viewport */}
      <AnimatePresence mode="wait">
        <motion.div
          key={memberTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* SECTION: DASHBOARD */}
          {memberTab === 'dashboard' && (
            <div className="space-y-6">
              <CoachConnectCard coach={coach} onSendUpdate={onSendUpdate} />

              {/* Calendar Check-in Grid */}
              <GymAttendanceCalendar
                memberId={member.id}
                memberName={member.fullName}
                checkInDates={member.gymCheckInDates || []}
                onToggleDate={(d) => onToggleGymCheckIn(member.id, d)}
                isEditable={true}
                roleLabel="client"
              />

              {/* Stat Cards: Today's Workout, Macro Target, Membership Remaining */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Today's Workout */}
                <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Today's Workout
                      </span>
                      <span className="text-xs font-bold text-[#10B981] font-mono truncate">
                        {currentWorkoutDay?.focusArea || 'Rest Day'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-lg text-[#171717]">
                      {currentWorkoutDay?.dayName || 'Rest & Mobility'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Plan: {assignedWorkout?.name || 'Personalized Routine'}
                    </p>

                    {currentWorkoutDay && !currentWorkoutDay.isRestDay && (
                      <div className="mt-4 space-y-2 text-xs">
                        {currentWorkoutDay.exercises.slice(0, 3).map((ex) => (
                          <div key={ex.id} className="flex justify-between items-center gap-2 p-2.5 rounded-xl bg-[#F5F5F5]">
                            <span className="font-semibold text-[#171717] truncate">{ex.name}</span>
                            <span className="font-mono tabular-nums text-neutral-500 text-[11px] shrink-0">
                              {ex.sets} × {ex.reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      switchTab('workout');
                      handleStartWorkout();
                    }}
                    className="mt-5 w-full py-2.5 bg-[#171717] hover:bg-neutral-800 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Today's Workout
                  </button>
                </div>

                {/* Card 2: Today's Diet & Macro Target */}
                <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Daily Nutrition Target
                      </span>
                      <span className="text-xs font-bold text-[#7155E8] font-mono tabular-nums">
                        {assignedDiet?.dailyCalorieTarget || 2400} kcal
                      </span>
                    </div>

                    <h3 className="font-extrabold text-lg text-[#171717]">
                      {assignedDiet?.name || 'Healthy Diet Blueprint'}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="p-2.5 rounded-2xl bg-[#F5F5F5]">
                        <span className="text-[10px] text-neutral-400 block font-semibold">Protein</span>
                        <span className="text-sm font-extrabold text-[#7155E8] font-mono tabular-nums">{assignedDiet?.proteinTargetG || 160}g</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-[#F5F5F5]">
                        <span className="text-[10px] text-neutral-400 block font-semibold">Carbs</span>
                        <span className="text-sm font-extrabold text-[#10B981] font-mono tabular-nums">{assignedDiet?.carbsTargetG || 220}g</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-[#F5F5F5]">
                        <span className="text-[10px] text-neutral-400 block font-semibold">Fats</span>
                        <span className="text-sm font-extrabold text-[#F59E0B] font-mono tabular-nums">{assignedDiet?.fatTargetG || 60}g</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-[#F0EEFC] flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#7155E8]">Meal Reporting:</span>
                      <span className="font-mono tabular-nums text-[#7155E8] font-semibold">{todayMeals.length} logged today</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => switchTab('meallog')}
                    className="mt-5 w-full py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_16px_rgba(113,85,232,0.35)]"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Upload Meal Photo Proof
                  </button>
                </div>

                {/* Card 3: Coaching Subscription & Sessions */}
                <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between min-w-0">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-3">
                      Membership & Dues
                    </span>

                    <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                      <span className="text-2xl font-extrabold text-[#171717]">
                        {remainingDays} days
                      </span>
                      <span className="text-xs text-neutral-400 truncate">
                        Expires {member.membershipEndDate}
                      </span>
                    </div>

                    <div className="w-full bg-[#F5F5F5] rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="bg-[#10B981] h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.round((remainingDays / 30) * 100))}%` }}
                      />
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-neutral-400 font-medium">PT Sessions:</span>
                        <span className="font-mono tabular-nums font-bold text-[#171717]">
                          {member.remainingSessions} of {member.totalPackageSessions} left
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-neutral-400 font-medium">Balance Due:</span>
                        <span className={`font-mono tabular-nums font-bold ${balance > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                          {balance > 0 ? `৳${balance.toLocaleString()}` : 'Paid in Full'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsPayModalOpen(true)}
                      className="w-full py-2.5 bg-[#E2136E] hover:bg-[#c00f5c] text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay Monthly Fee (bKash / Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('payments')}
                      className="w-full py-2.5 border border-neutral-200 hover:bg-[#F5F5F5] text-neutral-700 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      View Receipts & Statement
                    </button>
                  </div>
                </div>
              </div>

              {/* Historical Weight Trend Chart */}
              <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#171717]">Weight & Body Progression</h3>
                    <span className="text-xs text-neutral-400 font-mono tabular-nums">Current Weight: {member.currentWeightKg} kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab('progress')}
                    className="text-xs font-bold text-[#7155E8] hover:underline whitespace-nowrap"
                  >
                    Log Weigh-in →
                  </button>
                </div>

                <AreaTrendChart
                  data={memberProgress.map((p) => ({
                    label: p.date.substring(5),
                    value: p.weightKg
                  }))}
                  height={190}
                  color="#7155E8"
                  valueSuffix=" kg"
                />
              </div>
            </div>
          )}

          {/* SECTION: GYM CHECK-INS & ATTENDANCE (Previously Missing!) */}
          {memberTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <span className="text-xs font-semibold text-neutral-400 block">This Month Check-ins</span>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-[#7155E8] mt-1">
                    {novCheckIns} days
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">Target: {member.trainingFrequencyPerWeek * 4} days / month</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <span className="text-xs font-semibold text-neutral-400 block">All-Time Gym Visits</span>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-[#10B981] mt-1">
                    {totalCheckIns} visits
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">Verified floor attendance</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <span className="text-xs font-semibold text-neutral-400 block">Weekly Frequency Target</span>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-[#171717] mt-1">
                    {member.trainingFrequencyPerWeek}x / week
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">Tap any calendar day below to toggle</span>
                </div>
              </div>

              <GymAttendanceCalendar
                memberId={member.id}
                memberName={member.fullName}
                checkInDates={member.gymCheckInDates || []}
                onToggleDate={(d) => onToggleGymCheckIn(member.id, d)}
                isEditable={true}
                roleLabel="client"
              />
            </div>
          )}

          {/* SECTION: PT SCHEDULE (Previously Missing!) */}
          {memberTab === 'schedule' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#7155E8] uppercase tracking-wider">
                    1-on-1 Personal Coaching
                  </span>
                  <h2 className="text-xl font-extrabold text-[#171717] mt-0.5">
                    Scheduled PT Sessions with Coach Oliul Azim
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Your upcoming booked coaching slots and completed attendance log
                  </p>
                </div>

                <div className="px-4 py-3 rounded-2xl bg-[#F0EEFC] border border-[#7155E8]/20 text-xs font-mono tabular-nums shrink-0">
                  <span className="text-neutral-500 font-sans block text-[10px] uppercase font-bold">Package Balance</span>
                  <span className="text-base font-extrabold text-[#7155E8]">
                    {member.remainingSessions} / {member.totalPackageSessions} Sessions Left
                  </span>
                </div>
              </div>

              {memberTrainingSessions.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-8 h-8" />}
                  title="No 1-on-1 PT Sessions Scheduled"
                  description="Coach Oliul Azim has not booked an upcoming 1-on-1 slot yet. Follow your daily workout routine or check Coach Notices."
                />
              ) : (
                <div className="bg-white rounded-3xl border border-neutral-200/70 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)] divide-y divide-neutral-100">
                  {memberTrainingSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-neutral-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] border border-neutral-200/70 flex flex-col items-center justify-center font-mono tabular-nums shrink-0">
                          <span className="font-extrabold text-sm text-[#171717]">{s.sessionDate.split('-')[2]}</span>
                          <span className="text-[10px] text-neutral-400 uppercase">{s.sessionDate.split('-')[1]}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-[#171717]">{s.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-neutral-500 font-mono tabular-nums text-[11px] mt-1">
                            <span>{s.sessionDate}</span>
                            <span aria-hidden="true">·</span>
                            <span>{s.startTime} – {s.endTime}</span>
                            <span aria-hidden="true">·</span>
                            <span>Focus: {s.focusArea}</span>
                          </div>
                          {s.trainerNotes && (
                            <p className="text-neutral-500 italic mt-1">
                              Coach Cue: "{s.trainerNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`self-start sm:self-center px-3 py-1 rounded-full font-mono text-xs font-bold whitespace-nowrap ${
                          s.attendanceStatus === 'Present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : s.attendanceStatus === 'Absent'
                            ? 'bg-rose-50 text-rose-700'
                            : s.attendanceStatus === 'Rescheduled'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-[#F0EEFC] text-[#7155E8]'
                        }`}
                      >
                        {s.attendanceStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: DIET DISCOVERY PAGE */}
          {memberTab === 'diet' &&
            (!accessStatus.isUnlocked ? (
              renderAccessLockedCard('Diet Blueprint')
            ) : (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#7155E8] uppercase tracking-wider">
                        Assigned Meal Blueprint
                      </span>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <span className="text-xs text-neutral-400">Coach Oliul Azim</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-[#171717] mt-1">
                      {assignedDiet?.name || 'Personalized Clean Recomposition Diet'}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      {assignedDiet?.trainerInstructions}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => switchTab('meallog')}
                      className="px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      Upload Meal Photo
                    </button>
                  </div>
                </div>

                {/* Daily Macros Overview Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 font-mono tabular-nums text-xs">
                  <div className="p-4 bg-white rounded-3xl border border-neutral-200/70 text-center shadow-2xs">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">Calories</span>
                    <div className="text-lg font-extrabold text-[#171717] mt-0.5">{assignedDiet?.dailyCalorieTarget} kcal</div>
                  </div>
                  <div className="p-4 bg-white rounded-3xl border border-neutral-200/70 text-center shadow-2xs">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">Protein</span>
                    <div className="text-lg font-extrabold text-[#7155E8] mt-0.5">{assignedDiet?.proteinTargetG}g</div>
                  </div>
                  <div className="p-4 bg-white rounded-3xl border border-neutral-200/70 text-center shadow-2xs">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">Carbs</span>
                    <div className="text-lg font-extrabold text-[#10B981] mt-0.5">{assignedDiet?.carbsTargetG}g</div>
                  </div>
                  <div className="p-4 bg-white rounded-3xl border border-neutral-200/70 text-center shadow-2xs">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">Healthy Fats</span>
                    <div className="text-lg font-extrabold text-[#F59E0B] mt-0.5">{assignedDiet?.fatTargetG}g</div>
                  </div>
                  <div className="p-4 bg-white rounded-3xl border border-neutral-200/70 text-center shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">Hydration</span>
                    <div className="text-lg font-extrabold text-[#0284c7] mt-0.5">{assignedDiet?.waterIntakeLiters} L / day</div>
                  </div>
                </div>

                {/* Food Discovery Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(assignedDiet?.meals ?? []).length === 0 && (
                    <div className="md:col-span-2">
                      <EmptyState
                        title="No meals in your plan yet"
                        description="Your coach has not added meals to your diet blueprint."
                      />
                    </div>
                  )}
                  {(assignedDiet?.meals ?? []).map((assignedMeal) => {
                    const sum = (key: 'calories' | 'proteinG' | 'carbsG' | 'fatG') =>
                      Math.round(assignedMeal.foodItems.reduce((acc, f) => acc + f[key], 0));
                    const meal = {
                      name: assignedMeal.name,
                      time: assignedMeal.scheduledTime,
                      desc: assignedMeal.preparationNotes || '',
                      calories: sum('calories'),
                      protein: sum('proteinG'),
                      carbs: sum('carbsG'),
                      fat: sum('fatG')
                    };
                    return (
                      <div
                        key={assignedMeal.id}
                        className="bg-white rounded-3xl p-5 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.07)] transition-shadow flex flex-col justify-between group"
                      >
                        <div>
                          {/* Meal Food Photograph (Unified top overlay container prevents left/right pill collision) */}
                          <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-[#F0EEFC] via-white to-[#ECFDF5] flex items-center justify-center">
                            <Utensils className="w-12 h-12 text-[#7155E8]/40 group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 pointer-events-none">
                              <span className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#171717] shadow-xs truncate">
                                {meal.name}
                              </span>
                              <span className="bg-black/65 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-mono font-bold shrink-0 whitespace-nowrap">
                                {assignedMeal?.scheduledTime || meal.time}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-lg text-[#171717]">{meal.name}</h3>
                          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                            {assignedMeal?.preparationNotes || meal.desc}
                          </p>

                          {/* Prescribed Food Items */}
                          <div className="mt-3 space-y-1 text-xs">
                            {assignedMeal?.foodItems.map((f) => (
                              <div
                                key={f.id}
                                className="flex flex-wrap justify-between items-center gap-2 py-1.5 border-b border-neutral-100 last:border-b-0"
                              >
                                <span className="font-medium text-[#171717]">
                                  {f.name} ({f.quantity} {f.unit})
                                </span>
                                <span className="font-mono tabular-nums text-neutral-400 text-[11px] whitespace-nowrap">
                                  {f.calories} kcal · {f.proteinG}g P
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Macros Chip (Flex-wrapped so zero overflow on mobile) */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-4 p-3 bg-[#F5F5F5] rounded-2xl text-[11px] font-mono tabular-nums text-neutral-600 font-bold">
                            <span className="text-[#171717]">
                              {assignedMeal?.foodItems.reduce((acc, f) => acc + f.calories, 0) || meal.calories} kcal
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#7155E8]">{meal.protein}g Protein</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#10B981]">{meal.carbs}g Carbs</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#F59E0B]">{meal.fat}g Fat</span>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-400 font-medium truncate">
                            Scheduled: {assignedMeal?.scheduledTime || meal.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMealName(meal.name);
                              switchTab('meallog');
                            }}
                            className="px-4 py-2 bg-[#F0EEFC] hover:bg-[#7155E8] text-[#7155E8] hover:text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
                          >
                            Log This Meal →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* SECTION: WORKOUT UI */}
          {memberTab === 'workout' &&
            (!accessStatus.isUnlocked ? (
              renderAccessLockedCard('Workout Routine')
            ) : (
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div>
                    <span className="text-xs font-bold text-[#7155E8] uppercase tracking-wider">
                      Workout Program
                    </span>
                    <h2 className="text-xl font-extrabold text-[#171717] mt-0.5">
                      {assignedWorkout?.name || 'Assigned Training Program'}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      Prescribed by Coach Oliul Azim · {assignedWorkout?.trainerInstructions}
                    </p>
                  </div>

                  {/* Day Selector Pills */}
                  {assignedWorkout && (
                    <div className="flex items-center gap-1.5 p-1 bg-[#F5F5F5] rounded-full overflow-x-auto no-scrollbar shrink-0">
                      {assignedWorkout.days.map((d, idx) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDayIdx(idx);
                            setIsWorkingOut(false);
                          }}
                          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                            selectedDayIdx === idx
                              ? 'bg-[#171717] text-white shadow-xs'
                              : 'text-neutral-500 hover:text-[#171717]'
                          }`}
                        >
                          {d.dayName.split(':')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentWorkoutDay ? (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F5F5F5] rounded-2xl">
                      <div>
                        <h3 className="font-extrabold text-base text-[#171717]">{currentWorkoutDay.dayName}</h3>
                        <span className="text-xs text-neutral-400 font-medium">
                          Focus Area: {currentWorkoutDay.focusArea}
                        </span>
                      </div>
                      {!isWorkingOut ? (
                        <button
                          type="button"
                          onClick={handleStartWorkout}
                          className="px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white font-bold text-xs rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap self-start sm:self-auto"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start Active Session
                        </button>
                      ) : (
                        <span className="text-xs font-mono font-bold text-[#10B981] bg-emerald-50 px-3 py-1.5 rounded-full self-start sm:self-auto whitespace-nowrap">
                          ● Session In Progress
                        </span>
                      )}
                    </div>

                    {/* Active workout logging form */}
                    {isWorkingOut ? (
                      <form onSubmit={handleSubmitWorkoutSession} className="space-y-5">
                        <div className="space-y-3.5">
                          {currentWorkoutDay.exercises.map((ex, idx) => {
                            const prog = exerciseProgress[ex.id] || {
                              completed: true,
                              actualSets: ex.sets,
                              actualReps: ex.reps,
                              weightUsedKg: ex.targetWeightKg || 0,
                              notes: ''
                            };

                            return (
                              <div
                                key={ex.id}
                                className="p-4 sm:p-5 border border-neutral-200/80 rounded-3xl space-y-3 text-xs bg-white shadow-2xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-neutral-400 font-bold">{idx + 1}.</span>
                                      <span className="font-extrabold text-sm text-[#171717]">{ex.name}</span>
                                      <span className="text-[10px] text-neutral-500 bg-[#F5F5F5] px-2 py-0.5 rounded-full font-semibold">
                                        {ex.muscleGroup}
                                      </span>
                                    </div>
                                    <p className="text-neutral-400 text-xs mt-1 pl-4 font-mono tabular-nums">
                                      Prescribed: {ex.sets} sets × {ex.reps} @ {ex.targetWeightKg || 'bodyweight'}kg · Rest {ex.restSeconds}s
                                    </p>
                                  </div>

                                  <label className="flex items-center gap-2 cursor-pointer bg-[#F5F5F5] px-3 py-1.5 rounded-full self-start shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={prog.completed}
                                      onChange={(e) =>
                                        setExerciseProgress({
                                          ...exerciseProgress,
                                          [ex.id]: { ...prog, completed: e.target.checked }
                                        })
                                      }
                                      className="w-4 h-4 text-[#7155E8] rounded cursor-pointer"
                                    />
                                    <span className="font-bold text-xs text-[#171717]">Completed</span>
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:pl-4 pt-2 border-t border-neutral-100">
                                  <div>
                                    <label className="block text-[11px] text-neutral-400 mb-1">Weight Used (kg)</label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={prog.weightUsedKg}
                                      onChange={(e) =>
                                        setExerciseProgress({
                                          ...exerciseProgress,
                                          [ex.id]: { ...prog, weightUsedKg: parseFloat(e.target.value) || 0 }
                                        })
                                      }
                                      className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-neutral-400 mb-1">Actual Reps Completed</label>
                                    <input
                                      type="text"
                                      value={prog.actualReps}
                                      onChange={(e) =>
                                        setExerciseProgress({
                                          ...exerciseProgress,
                                          [ex.id]: { ...prog, actualReps: e.target.value }
                                        })
                                      }
                                      placeholder="e.g. 10, 10, 9, 8"
                                      className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-neutral-400 mb-1">Notes / Cues</label>
                                    <input
                                      type="text"
                                      value={prog.notes}
                                      onChange={(e) =>
                                        setExerciseProgress({
                                          ...exerciseProgress,
                                          [ex.id]: { ...prog, notes: e.target.value }
                                        })
                                      }
                                      placeholder="Clean form, felt strong"
                                      className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-5 bg-[#F5F5F5] rounded-3xl space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block font-bold text-[#171717] mb-1">Duration (minutes)</label>
                              <input
                                type="number"
                                value={workoutDuration}
                                onChange={(e) => setWorkoutDuration(e.target.value)}
                                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-[#171717] mb-1">Session Notes for Coach</label>
                              <input
                                type="text"
                                value={sessionNotes}
                                onChange={(e) => setSessionNotes(e.target.value)}
                                placeholder="No knee pain, energy was high"
                                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingWorkout}
                            className="w-full py-3 bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white font-bold text-xs rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Check className="w-4 h-4" /> {isSubmittingWorkout ? 'Submitting…' : 'Submit Workout Report for Verification'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="divide-y divide-neutral-100 rounded-3xl border border-neutral-200/70 overflow-hidden">
                        {currentWorkoutDay.exercises.map((ex, idx) => (
                          <div
                            key={ex.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F5F5F5] transition-colors"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-neutral-400 font-bold mr-2">{idx + 1}.</span>
                              <span className="font-bold text-sm text-[#171717]">{ex.name}</span>
                              <span className="text-neutral-400 ml-2 font-mono text-[11px]">
                                ({ex.sets} sets × {ex.reps})
                              </span>
                              <p className="text-neutral-400 text-xs mt-0.5 pl-5">{ex.instructions}</p>
                            </div>
                            <div className="font-mono tabular-nums sm:text-right shrink-0 pl-5 sm:pl-0">
                              <span className="text-[#10B981] font-bold">
                                {ex.targetWeightKg ? `${ex.targetWeightKg} kg` : 'Bodyweight'}
                              </span>
                              <span className="text-neutral-400 block text-[10px]">Rest: {ex.restSeconds}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No workout routine assigned yet. Ask Coach Oliul Azim!
                  </div>
                )}
              </div>
            ))}

          {/* SECTION: MEAL EVIDENCE LOGGER */}
          {memberTab === 'meallog' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] max-w-2xl mx-auto space-y-5">
              <div className="border-b border-neutral-100 pb-3">
                <h2 className="text-xl font-extrabold text-[#171717]">Upload Daily Meal Evidence</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Photo verification and actual food records reviewed directly by Coach Oliul Azim
                </p>
              </div>

              <form onSubmit={handleSubmitMeal} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#171717] mb-1">Meal Category</label>
                    <select
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      className="w-full p-2.5 border border-neutral-200 rounded-2xl bg-[#F5F5F5] font-semibold"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Afternoon Snack">Afternoon Snack</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#171717] mb-1">Plan Adherence</label>
                    <select
                      value={mealAdherence}
                      onChange={(e: any) => setMealAdherence(e.target.value)}
                      className="w-full p-2.5 border border-neutral-200 rounded-2xl bg-[#F5F5F5] font-semibold"
                    >
                      <option value="Followed Plan">Followed Plan (100% exact)</option>
                      <option value="Partially Followed">Partially Followed</option>
                      <option value="Deviated from Plan">Deviated from Plan</option>
                    </select>
                  </div>
                </div>

                {/* Photo Evidence Card */}
                <div>
                  <label className="block font-bold text-[#171717] mb-1.5">
                    Food Plate Photograph Proof
                  </label>
                  <div className="border border-neutral-200/70 rounded-3xl p-4 bg-[#F5F5F5] flex flex-col sm:flex-row items-center gap-4">
                    {mealPhotoPreview ? (
                      <img
                        src={mealPhotoPreview}
                        alt="Meal proof"
                        referrerPolicy="no-referrer"
                        className="w-36 h-28 object-cover rounded-2xl border border-neutral-200 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-36 h-28 bg-neutral-200 rounded-2xl flex items-center justify-center text-neutral-400">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                    <div className="space-y-2 text-xs text-center sm:text-left">
                      <span className="font-bold text-[#171717] block">
                        Upload or snap a photo of your meal plate:
                      </span>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <label className="px-4 py-2 bg-[#7155E8] text-white rounded-xl cursor-pointer hover:bg-[#6245DE] transition-colors inline-block text-xs font-bold shadow-xs active:scale-95">
                          {mealPhotoFile ? 'Change Photo' : 'Choose Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => pickPhoto(e, setMealPhotoFile, setMealPhotoPreview)}
                          />
                        </label>
                      </div>
                      <span className="text-[11px] text-neutral-400 block">
                        Photo evidence helps Coach Oliul Azim verify accurate portion size and clean preparation.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">
                    Foods Actually Consumed (Description & Quantities)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={foodsInput}
                    onChange={(e) => setFoodsInput(e.target.value)}
                    placeholder="e.g. 180g grilled chicken breast, 200g brown rice, 150g broccoli"
                    className="w-full p-3 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl leading-relaxed focus:bg-white focus:outline-none focus:border-[#7155E8]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Calories</label>
                    <input
                      type="number"
                      value={mealCalories}
                      onChange={(e) => setMealCalories(e.target.value)}
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={mealProtein}
                      onChange={(e) => setMealProtein(e.target.value)}
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={mealCarbs}
                      onChange={(e) => setMealCarbs(e.target.value)}
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={mealFat}
                      onChange={(e) => setMealFat(e.target.value)}
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Notes / Deviations</label>
                  <input
                    type="text"
                    value={memberNotesInput}
                    onChange={(e) => setMemberNotesInput(e.target.value)}
                    placeholder="e.g. drank 500ml water with meal, felt full"
                    className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingMeal}
                  className="w-full py-3 bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white font-bold text-xs rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" /> {isSubmittingMeal ? 'Uploading…' : 'Submit Meal Report for Coach Review'}
                </button>
              </form>
            </div>
          )}

          {/* SECTION: BODY METRICS & PROGRESS */}
          {memberTab === 'progress' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-[#171717]">Record Today's Weight & Measurements</h3>
                    <p className="text-xs text-neutral-400">Weigh in the morning before breakfast for accurate tracking</p>
                  </div>
                </div>

                <form onSubmit={handleLogProgress} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-500 mb-1">Body Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={logWeight}
                      onChange={(e) => setLogWeight(e.target.value)}
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-500 mb-1">Waist Circumference (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={logWaist}
                      onChange={(e) => setLogWaist(e.target.value)}
                      placeholder="e.g. 84"
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-500 mb-1">Bench Press PR (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={logBenchPR}
                      onChange={(e) => setLogBenchPR(e.target.value)}
                      placeholder="e.g. 82.5"
                      className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSavingProgress}
                      className="w-full py-2.5 bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-95"
                    >
                      {isSavingProgress ? 'Saving…' : 'Save Assessment'}
                    </button>
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-2xl border border-neutral-200/80">
                    {progressPhotoPreview ? (
                      <img
                        src={progressPhotoPreview}
                        alt="Progress photo preview"
                        className="w-12 h-12 rounded-xl object-cover border border-white shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[#171717] block">Progress photo (optional)</span>
                      <span className="text-[11px] text-neutral-500">Only you and your coach can see it.</span>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 font-semibold cursor-pointer hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-[#7155E8] shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                      {progressPhotoFile ? 'Change' : 'Add Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => pickPhoto(e, setProgressPhotoFile, setProgressPhotoPreview)}
                      />
                    </label>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                <h3 className="text-base font-extrabold text-[#171717] mb-4">Historical Weigh-ins</h3>
                <AreaTrendChart
                  data={memberProgress.map((p) => ({
                    label: p.date.substring(5),
                    value: p.weightKg
                  }))}
                  height={200}
                  color="#7155E8"
                  valueSuffix=" kg"
                />
              </div>
            </div>
          )}

          {/* SECTION: PAYMENTS & INVOICES */}
          {memberTab === 'payments' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#171717]">Membership & Invoices</h2>
                  <p className="text-xs text-neutral-400">Official receipt history and verified coaching installments</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-4 py-2 bg-[#E2136E] hover:bg-[#c00f5c] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay via bKash / Cash
                  </button>
                  <div className="sm:text-right font-mono tabular-nums">
                    <span className={`text-base font-extrabold ${balance > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      {balance > 0 ? `৳${balance.toLocaleString()} Due` : 'No Dues'}
                    </span>
                    <span className="text-[10px] text-neutral-400 block font-sans">Payment Status</span>
                  </div>
                </div>
              </div>

              {/* Pending Verification Requests */}
              {memberPaymentRequests.filter((r) => r.status === 'Pending').length > 0 && (
                <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-2.5">
                  <span className="font-bold text-xs text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    Payment Submitted · Awaiting Coach Oliul Azim Verification
                  </span>
                  {memberPaymentRequests
                    .filter((r) => r.status === 'Pending')
                    .map((pr) => (
                      <div
                        key={pr.id}
                        className="p-3 bg-white rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#171717]">{pr.billingMonth} · {pr.method}</span>
                          <span className="text-[11px] text-neutral-500 block font-mono tabular-nums">
                            Submitted: {pr.submittedAt} {pr.trxId ? `· TrxID: ${pr.trxId}` : ''}
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="font-bold text-[#7155E8] font-mono tabular-nums">
                            ৳{pr.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full inline-block sm:block mt-0.5 ml-2 sm:ml-0 font-bold">
                            Pending Coach Acceptance
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="divide-y divide-neutral-100">
                {memberPayments.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-[#171717] block truncate">{p.billingPeriod}</span>
                      <span className="text-neutral-400 text-[11px] font-mono tabular-nums">
                        {p.date} · via {p.method}
                      </span>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="font-extrabold text-sm text-[#10B981]">৳{p.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-neutral-400 block font-sans">Status: {p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: COACH NOTICES */}
          {memberTab === 'notices' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <h2 className="text-xl font-extrabold text-[#171717]">Coach Notices & Announcements</h2>
              <div className="space-y-3">
                {memberNotices.map((n) => {
                  const isRead = n.readByMemberIds.includes(member.id);
                  return (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isRead ? 'border-neutral-200/80 bg-[#F5F5F5]' : 'border-[#7155E8]/30 bg-[#F0EEFC]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-sm text-[#171717]">{n.title}</span>
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkNoticeRead(n.id);
                              showToast('Notice marked as read.', 'info');
                            }}
                            className="text-xs font-bold text-[#7155E8] hover:underline shrink-0 whitespace-nowrap"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">{n.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Pay Modal (bKash & Cash) */}
      <PayModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        member={member}
        onSubmitPaymentRequest={async (data) => {
          await (onSubmitPaymentRequest ?? ((d) => storage.submitPaymentRequest(d)))(data);
          showToast(`Payment request sent to ${coach?.fullName ?? 'your coach'} for verification!`);
        }}
      />
    </div>
  );
};
