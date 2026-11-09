import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Phone,
  Mail,
  Plus,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import {
  Member,
  PaymentRecord,
  WorkoutPlan,
  WorkoutSession,
  DietPlan,
  MealLog,
  ProgressRecord,
  TrainingSessionEvent,
  Notice
} from '../../types';
import { Avatar, Modal, showToast } from '../common/CommonUI';
import { AreaTrendChart } from '../common/SvgCharts';
import { GymAttendanceCalendar } from '../common/GymAttendanceCalendar';

interface MemberProfileViewProps {
  member: Member;
  allWorkoutPlans: WorkoutPlan[];
  allDietPlans: DietPlan[];
  payments: PaymentRecord[];
  workoutSessions: WorkoutSession[];
  mealLogs: MealLog[];
  progressRecords: ProgressRecord[];
  trainingSessions: TrainingSessionEvent[];
  notices: Notice[];
  onBack: () => void;
  onOpenRecordPayment: (memberId: string) => void;
  onAssignWorkoutPlan: (memberId: string, planId: string) => void;
  onAssignDietPlan: (memberId: string, planId: string) => void;
  onUpdateTrainerNotes: (memberId: string, notes: string) => void;
  onReviewMealLog: (mealId: string, status: 'Approved' | 'Correction Requested', feedback: string) => void;
  onVerifyWorkoutSession: (sessionId: string, status: 'Verified' | 'Needs Correction', feedback: string) => void;
  onAddProgressRecord: (data: any) => void;
  onScheduleSession: (data: any) => void;
  onDeleteMember: (memberId: string) => void;
  onToggleGymCheckIn: (memberId: string, dateStr: string) => void;
  onCreateCustomWorkout?: (memberId: string, planData: any) => void;
  onCreateCustomDiet?: (memberId: string, planData: any) => void;
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  member,
  allWorkoutPlans,
  allDietPlans,
  payments,
  workoutSessions,
  mealLogs,
  progressRecords,
  trainingSessions,
  notices,
  onBack,
  onOpenRecordPayment,
  onAssignWorkoutPlan,
  onAssignDietPlan,
  onUpdateTrainerNotes,
  onReviewMealLog,
  onVerifyWorkoutSession,
  onAddProgressRecord,
  onDeleteMember,
  onToggleGymCheckIn,
  onCreateCustomWorkout,
  onCreateCustomDiet
}) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [trainerNotesInput, setTrainerNotesInput] = useState(member.trainerPrivateNotes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  // Delete confirmation modal (replaces disallowed window.confirm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New progress modal state
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [newWeight, setNewWeight] = useState(member.currentWeightKg.toString());
  const [newWaist, setNewWaist] = useState('');
  const [newChest, setNewChest] = useState('');
  const [newArm, setNewArm] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Custom Workout Routine Modal State
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [customWorkoutName, setCustomWorkoutName] = useState(`${member.fullName}'s Personalized Split`);
  const [customWorkoutGoal, setCustomWorkoutGoal] = useState(member.fitnessGoal);
  const [customWorkoutInstructions, setCustomWorkoutInstructions] = useState(
    'Tailored exclusively for this client. Focus on form control, mind-muscle connection, and progressive overload.'
  );
  const [customWorkoutDifficulty, setCustomWorkoutDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    member.fitnessLevel === 'Athlete' ? 'Advanced' : (member.fitnessLevel as any) || 'Intermediate'
  );
  const [customWorkoutDay1Name, setCustomWorkoutDay1Name] = useState('Day 1: Chest & Shoulders');
  const [customWorkoutDay1Exercises, setCustomWorkoutDay1Exercises] = useState(
    'Incline Dumbbell Press (4x10 @ 24kg)\nFlat Barbell Bench Press (3x8 @ 70kg)\nLateral Raises (4x15 @ 10kg)\nTricep Rope Pushdown (3x12 @ 20kg)'
  );
  const [customWorkoutDay2Name, setCustomWorkoutDay2Name] = useState('Day 2: Back & Biceps');
  const [customWorkoutDay2Exercises, setCustomWorkoutDay2Exercises] = useState(
    'Lat Pulldown (4x10 @ 60kg)\nSeated Cable Row (3x12 @ 55kg)\nDumbbell Bicep Curls (3x12 @ 12kg)\nFace Pulls (3x15 @ 17.5kg)'
  );

  // Custom Diet Plan Modal State
  const [showCustomDietModal, setShowCustomDietModal] = useState(false);
  const [customDietName, setCustomDietName] = useState(`${member.fullName}'s Custom Nutrition Blueprint`);
  const [customCalories, setCustomCalories] = useState('2300');
  const [customProtein, setCustomProtein] = useState('160');
  const [customCarbs, setCustomCarbs] = useState('240');
  const [customFat, setCustomFat] = useState('60');
  const [customWater, setCustomWater] = useState('3.5');
  const [customBreakfast, setCustomBreakfast] = useState('3 Whole Boiled Eggs + 70g Oats + 1 Banana (480 kcal, 28g P)');
  const [customLunch, setCustomLunch] = useState('180g Grilled Chicken Breast + 200g Brown Rice + Cucumber Salad (580 kcal, 55g P)');
  const [customPreWorkout, setCustomPreWorkout] = useState('1 Apple + 1 Scoop Whey Isolate in water (180 kcal, 25g P)');
  const [customDinner, setCustomDinner] = useState('150g Grilled Fish (Rui/Tilapia) + Mixed Vegetables + 1 Roti (450 kcal, 42g P)');

  // Calculations
  const memberPayments = payments.filter((p) => p.memberId === member.id);
  const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, member.packagePrice - totalPaid);

  const memberSessions = workoutSessions.filter((s) => s.memberId === member.id);
  const memberMeals = mealLogs.filter((m) => m.memberId === member.id);
  const memberProgress = progressRecords.filter((r) => r.memberId === member.id);
  const memberTrainingEvents = trainingSessions.filter((t) => t.memberId === member.id);
  const memberNotices = notices.filter(
    (n) =>
      n.targetAudience === 'All Members' ||
      (n.targetAudience === 'Specific Member' && n.targetMemberId === member.id)
  );

  const assignedWorkout = allWorkoutPlans.find((p) => p.id === member.assignedWorkoutPlanId);
  const assignedDiet = allDietPlans.find((p) => p.id === member.assignedDietPlanId);

  const thisMonthCheckIns = (member.gymCheckInDates || []).filter((d) => d.startsWith('2026-11')).length;

  const todayMs = new Date('2026-11-02').getTime();
  const endMs = new Date(member.membershipEndDate).getTime();
  const remainingDays = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24));

  const tabs = [
    { id: 1, label: 'Overview' },
    { id: 2, label: 'Personal Info' },
    { id: 3, label: 'Membership' },
    { id: 4, label: `Payments (${memberPayments.length})` },
    { id: 5, label: 'Workout Plans' },
    { id: 6, label: 'Diet Plans' },
    { id: 7, label: `Daily Meal Logs (${memberMeals.length})` },
    { id: 8, label: `Workout Logs (${memberSessions.length})` },
    { id: 9, label: `Progress (${memberProgress.length})` },
    { id: 10, label: `Gym Attendance (${thisMonthCheckIns} Days)` },
    { id: 11, label: `Notices (${memberNotices.length})` },
    { id: 12, label: 'Trainer Notes' }
  ];

  const handleSaveNotes = () => {
    onUpdateTrainerNotes(member.id, trainerNotesInput);
    setNotesSaved(true);
    showToast('Confidential trainer notes saved.');
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleCreateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProgressRecord({
      memberId: member.id,
      date: '2026-11-02',
      weightKg: parseFloat(newWeight) || member.currentWeightKg,
      waistCm: newWaist ? parseFloat(newWaist) : undefined,
      chestCm: newChest ? parseFloat(newChest) : undefined,
      armCm: newArm ? parseFloat(newArm) : undefined,
      notes: newNotes
    });
    setShowAddProgress(false);
  };

  const handleSaveCustomWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const parseExercises = (text: string) => {
      return text
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((line, idx) => ({
          id: `ex-cust-${Date.now()}-${idx}`,
          name: line.trim(),
          muscleGroup: 'Target Muscle',
          sets: 3,
          reps: '10-12',
          restSeconds: 60,
          instructions: 'Perform with controlled tempo and strict form'
        }));
    };

    const newCustomPlan = {
      name: customWorkoutName,
      description: `Custom individual workout plan designed specifically for ${member.fullName}`,
      goal: customWorkoutGoal,
      difficulty: customWorkoutDifficulty,
      trainerInstructions: customWorkoutInstructions,
      days: [
        {
          id: `d-c1-${Date.now()}`,
          dayName: customWorkoutDay1Name,
          focusArea: customWorkoutDay1Name.split(':')[1]?.trim() || 'Focus Area',
          isRestDay: false,
          exercises: parseExercises(customWorkoutDay1Exercises)
        },
        {
          id: `d-c2-${Date.now()}`,
          dayName: customWorkoutDay2Name,
          focusArea: customWorkoutDay2Name.split(':')[1]?.trim() || 'Focus Area',
          isRestDay: false,
          exercises: parseExercises(customWorkoutDay2Exercises)
        }
      ]
    };

    if (onCreateCustomWorkout) {
      onCreateCustomWorkout(member.id, newCustomPlan);
    }
    setShowCustomWorkoutModal(false);
  };

  const handleSaveCustomDiet = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomDiet = {
      name: customDietName,
      description: `Individual nutrition prescription customized for ${member.fullName}`,
      dailyCalorieTarget: parseInt(customCalories) || 2200,
      proteinTargetG: parseInt(customProtein) || 150,
      carbsTargetG: parseInt(customCarbs) || 220,
      fatTargetG: parseInt(customFat) || 55,
      waterIntakeLiters: parseFloat(customWater) || 3.0,
      dietaryPreferences: 'Halal, wholesome local ingredients',
      restrictions: 'Limit saturated fats and sugary drinks',
      trainerInstructions: 'Stick closely to prescribed protein totals and daily hydration goals',
      meals: [
        {
          id: `m-c1-${Date.now()}`,
          name: 'Breakfast',
          scheduledTime: '08:30',
          preparationNotes: customBreakfast,
          foodItems: [
            {
              id: `f-c1-${Date.now()}`,
              name: customBreakfast,
              quantity: 1,
              unit: 'serving',
              calories: Math.round(parseInt(customCalories) * 0.25) || 500,
              proteinG: Math.round(parseInt(customProtein) * 0.25) || 35,
              carbsG: Math.round(parseInt(customCarbs) * 0.25) || 50,
              fatG: 12
            }
          ]
        },
        {
          id: `m-c2-${Date.now()}`,
          name: 'Lunch',
          scheduledTime: '13:30',
          preparationNotes: customLunch,
          foodItems: [
            {
              id: `f-c2-${Date.now()}`,
              name: customLunch,
              quantity: 1,
              unit: 'serving',
              calories: Math.round(parseInt(customCalories) * 0.35) || 700,
              proteinG: Math.round(parseInt(customProtein) * 0.35) || 50,
              carbsG: Math.round(parseInt(customCarbs) * 0.35) || 70,
              fatG: 18
            }
          ]
        },
        {
          id: `m-c3-${Date.now()}`,
          name: 'Pre-Workout Fuel',
          scheduledTime: '17:00',
          preparationNotes: customPreWorkout,
          foodItems: [
            {
              id: `f-c3-${Date.now()}`,
              name: customPreWorkout,
              quantity: 1,
              unit: 'serving',
              calories: 200,
              proteinG: 25,
              carbsG: 25,
              fatG: 2
            }
          ]
        },
        {
          id: `m-c4-${Date.now()}`,
          name: 'Dinner',
          scheduledTime: '21:00',
          preparationNotes: customDinner,
          foodItems: [
            {
              id: `f-c4-${Date.now()}`,
              name: customDinner,
              quantity: 1,
              unit: 'serving',
              calories: Math.round(parseInt(customCalories) * 0.3) || 600,
              proteinG: Math.round(parseInt(customProtein) * 0.3) || 40,
              carbsG: Math.round(parseInt(customCarbs) * 0.3) || 60,
              fatG: 14
            }
          ]
        }
      ]
    };

    if (onCreateCustomDiet) {
      onCreateCustomDiet(member.id, newCustomDiet);
    }
    setShowCustomDietModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back and Header Lockup */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-2xl transition-all border border-neutral-200/80 bg-white shadow-xs active:scale-95 shrink-0 cursor-pointer"
            title="Back to Clients Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <Avatar
              src={member.avatarUrl}
              name={member.fullName}
              size="xl"
              className="rounded-3xl border-2 border-white shadow-md"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#171717] truncate">
                  {member.fullName}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    member.status === 'Active'
                      ? 'bg-emerald-50 text-[#10B981]'
                      : member.status === 'Expiring Soon'
                      ? 'bg-amber-50 text-[#F59E0B]'
                      : 'bg-rose-50 text-[#EF4444]'
                  }`}
                >
                  {member.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Goal: <span className="font-semibold text-neutral-700">{member.fitnessGoal}</span> ·{' '}
                {member.age} yrs · {member.gender} · Joined {member.joinedAt}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action buttons */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <a
            href={`tel:${member.phone}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
            title={`Direct Phone Call to ${member.fullName}`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>Call Member</span>
          </a>

          <button
            type="button"
            onClick={() => onOpenRecordPayment(member.id)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(12)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F5F5] hover:bg-neutral-200/70 text-neutral-700 text-xs font-bold rounded-2xl transition-all whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Trainer Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 p-2.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer"
            title="Delete this Client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent Member Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Membership Expiry
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#171717] mt-1 truncate">
            {member.membershipEndDate}
          </div>
          <span
            className={`text-xs font-mono font-bold mt-1 block ${
              remainingDays <= 3 ? 'text-[#F59E0B]' : 'text-[#10B981]'
            }`}
          >
            {remainingDays > 0 ? `${remainingDays} days left` : 'Expired'}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Financial Balance
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#171717] mt-1 truncate">
            ৳{balance.toLocaleString()}
          </div>
          <span
            className={`text-xs font-bold mt-1 block ${
              balance > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
            }`}
          >
            {balance > 0 ? `${member.paymentStatus}` : 'Paid in Full'}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Coaching PT Sessions
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#171717] mt-1 truncate">
            {member.remainingSessions}{' '}
            <span className="text-xs font-normal text-neutral-400 font-sans">
              / {member.totalPackageSessions} left
            </span>
          </div>
          <span className="text-xs text-neutral-400 mt-1 block truncate">
            {member.trainingFrequencyPerWeek} sessions / week
          </span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Gym Check-ins (Nov)
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#7155E8] mt-1">
            {thisMonthCheckIns} Days
          </div>
          <span className="text-xs text-neutral-400 mt-1 block truncate">
            Logged via Calendar
          </span>
        </div>
      </div>

      {/* 12 Tab Header Scroll Navigation */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <nav className="flex space-x-1.5 py-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-white border border-neutral-200/80 text-neutral-600 hover:text-[#171717] hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Animated Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Tab 1: Overview */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6 min-w-0">
                <GymAttendanceCalendar
                  memberId={member.id}
                  memberName={member.fullName}
                  checkInDates={member.gymCheckInDates || []}
                  onToggleDate={(d) => onToggleGymCheckIn(member.id, d)}
                  isEditable={true}
                  roleLabel="trainer"
                />

                {/* Weight Progression Chart */}
                <div className="bg-white border border-neutral-100 rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        Body Weight Progression (kg)
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Tracked from baseline {member.joinedAt} to current
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddProgress(true)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Weight
                    </button>
                  </div>

                  {memberProgress.length > 0 ? (
                    <AreaTrendChart
                      data={memberProgress.map((p) => ({
                        label: p.date.substring(5),
                        value: p.weightKg
                      }))}
                      height={190}
                      color="#0284c7"
                      valueSuffix=" kg"
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-neutral-400">
                      No progress records logged yet.
                    </div>
                  )}
                </div>

                {/* Recent Meal Submissions & Reviews */}
                <div className="bg-white border border-neutral-100 rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900">
                      Recent Food Logs & Evidence
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab(7)}
                      className="text-xs text-[#7155E8] hover:underline font-bold cursor-pointer"
                    >
                      View All ({memberMeals.length})
                    </button>
                  </div>

                  {memberMeals.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      No meals reported by this client yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberMeals.slice(0, 3).map((meal) => (
                        <div
                          key={meal.id}
                          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/70"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {meal.photoUrl && (
                              <img
                                src={meal.photoUrl}
                                alt="Meal plate"
                                referrerPolicy="no-referrer"
                                className="w-14 h-14 rounded-xl object-cover border border-neutral-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-neutral-900">
                                  {meal.scheduledMealName}
                                </span>
                                <span aria-hidden="true" className="text-neutral-300">
                                  ·
                                </span>
                                <span className="font-mono text-neutral-500">{meal.loggedAt}</span>
                              </div>
                              <p className="text-xs text-neutral-700 mt-0.5">
                                {meal.prescribedFoodsSummary}
                              </p>
                              <div className="text-[11px] font-mono text-emerald-700 mt-1">
                                {meal.totalCalories} kcal · {meal.totalProteinG}g Protein
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span
                              className={`text-xs font-semibold ${
                                meal.trainerReviewStatus === 'Approved'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {meal.trainerReviewStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Quick Stats & Contacts */}
              <div className="space-y-6">
                <div className="bg-white border border-neutral-100 rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900">
                      Contact & Communication
                    </h3>
                    <a
                      href={`tel:${member.phone}`}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Now
                    </a>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-700">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-mono">{member.phone}</span>
                      </div>
                      <a
                        href={`tel:${member.phone}`}
                        className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-semibold"
                      >
                        Dial
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-100">
                      <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                        Emergency Contact
                      </span>
                      <div className="font-semibold text-neutral-800 mt-0.5">
                        {member.emergencyContact.name} ({member.emergencyContact.relation})
                      </div>
                      <div className="text-neutral-500 font-mono mt-0.5">
                        {member.emergencyContact.phone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-100 rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                  <h3 className="text-sm font-bold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">
                    Coaching Prescriptions
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Assigned Workout</span>
                      <span className="font-bold text-neutral-900 block mt-0.5">
                        {assignedWorkout ? assignedWorkout.name : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Assigned Diet Plan</span>
                      <span className="font-bold text-neutral-900 block mt-0.5">
                        {assignedDiet ? assignedDiet.name : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Weekly Sessions</span>
                      <span className="font-mono text-neutral-800 font-bold block mt-0.5">
                        {member.trainingFrequencyPerWeek} sessions / week ({member.remainingSessions}{' '}
                        remaining)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Personal Info */}
          {activeTab === 2 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <h3 className="text-base font-bold text-neutral-900">
                  Client Demographics & Profile
                </h3>
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call {member.fullName}
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-400 block font-semibold">Full Name</span>
                  <span className="text-neutral-800 text-sm font-medium">{member.fullName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Phone Number</span>
                  <span className="text-neutral-800 font-mono">{member.phone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Email Address</span>
                  <span className="text-neutral-800">{member.email}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Age & Gender</span>
                  <span className="text-neutral-800">
                    {member.age} years old · {member.gender}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Height & Weight</span>
                  <span className="text-neutral-800 font-mono">
                    {member.heightCm} cm · {member.currentWeightKg} kg
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Target Goal Weight</span>
                  <span className="text-neutral-800 font-mono">
                    {member.targetWeightKg
                      ? `${member.targetWeightKg} kg`
                      : 'General recomposition'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-3 text-xs">
                <div>
                  <span className="text-neutral-400 block font-semibold">Fitness Goal</span>
                  <p className="text-neutral-800 font-medium mt-0.5">{member.fitnessGoal}</p>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Training Preferences</span>
                  <p className="text-neutral-700 mt-0.5">{member.trainingPreferences}</p>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Medical Conditions</span>
                  <p className="text-neutral-700 mt-0.5">
                    {member.medicalConditions || 'No conditions voluntarily disclosed.'}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">
                    Injuries & Exercise Restrictions
                  </span>
                  <p className="text-rose-800 font-medium mt-0.5">
                    {member.injuriesOrRestrictions || 'None reported.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Membership Details */}
          {activeTab === 3 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] max-w-3xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-base font-bold text-neutral-900">Membership Terms & Package</h3>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  {member.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">Start Date</span>
                  <span className="text-neutral-900 font-bold text-sm">
                    {member.membershipStartDate}
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">End Date</span>
                  <span className="text-neutral-900 font-bold text-sm">
                    {member.membershipEndDate}
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">
                    Duration Package
                  </span>
                  <span className="text-neutral-900 font-bold">{member.membershipDuration}</span>
                </div>
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">
                    Coaching Sessions
                  </span>
                  <span className="text-neutral-900 font-bold">
                    {member.remainingSessions} remaining of {member.totalPackageSessions}
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">Package Price</span>
                  <span className="text-neutral-900 font-bold">
                    ৳{member.packagePrice.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50 rounded-2xl">
                  <span className="text-neutral-400 font-sans block text-[11px]">
                    Next Payment Deadline
                  </span>
                  <span className="text-neutral-900 font-bold">{member.nextPaymentDeadline}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Payment History */}
          {activeTab === 4 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Member Payment Ledger</h3>
                  <p className="text-xs text-neutral-500">
                    Outstanding Balance: ৳{balance.toLocaleString()} · Total Paid: ৳
                    {totalPaid.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment(member.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Payment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Transaction Ref</th>
                      <th className="py-2.5 px-3">Billing Cycle</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {memberPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-neutral-400">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      memberPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50/70">
                          <td className="py-3 px-3 font-mono">{p.date}</td>
                          <td className="py-3 px-3 font-mono tabular-nums font-bold text-neutral-900">
                            ৳{p.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-neutral-700">{p.method}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-neutral-500">
                            {p.transactionRef || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-neutral-600">{p.billingPeriod}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-emerald-700 font-mono text-[11px]">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Workout Plans */}
          {activeTab === 5 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Individual Workout Routine
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Assign from library or customize a separate workout plan specifically for{' '}
                    {member.fullName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowCustomWorkoutModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Customize for {member.fullName.split(' ')[0]}
                  </button>

                  <select
                    value={member.assignedWorkoutPlanId || ''}
                    onChange={(e) => {
                      if (e.target.value) onAssignWorkoutPlan(member.id, e.target.value);
                    }}
                    className="text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-neutral-50 font-semibold focus:outline-none max-w-full"
                  >
                    <option value="">-- Assign a Routine --</option>
                    {allWorkoutPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {assignedWorkout ? (
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-neutral-900 text-sm">{assignedWorkout.name}</h4>
                      <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                        {assignedWorkout.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{assignedWorkout.description}</p>
                    <div className="mt-2 text-xs text-neutral-500">
                      <span className="font-semibold text-neutral-700">Coach Guidance:</span>{' '}
                      {assignedWorkout.trainerInstructions}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {assignedWorkout.days.map((day) => (
                      <div key={day.id} className="border border-neutral-200 rounded-2xl p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-neutral-900">{day.dayName}</span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {day.focusArea} {day.isRestDay && '(Rest Day)'}
                          </span>
                        </div>

                        {!day.isRestDay && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                            {day.exercises.map((ex) => (
                              <div
                                key={ex.id}
                                className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs"
                              >
                                <div className="font-bold text-neutral-800">{ex.name}</div>
                                <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                                  {ex.sets} sets × {ex.reps}{' '}
                                  {ex.targetWeightKg ? `(@ ${ex.targetWeightKg}kg)` : ''}
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  Rest: {ex.restSeconds}s · {ex.instructions}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No workout plan currently assigned. Select one above or click "Customize for{' '}
                  {member.fullName.split(' ')[0]}".
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Diet Plans */}
          {activeTab === 6 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Individual Nutrition Plan
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Prescribed calories, macronutrients, and custom meal schedule for{' '}
                    {member.fullName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowCustomDietModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Customize Diet for {member.fullName.split(' ')[0]}
                  </button>

                  <select
                    value={member.assignedDietPlanId || ''}
                    onChange={(e) => {
                      if (e.target.value) onAssignDietPlan(member.id, e.target.value);
                    }}
                    className="text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-neutral-50 font-semibold focus:outline-none max-w-full"
                  >
                    <option value="">-- Assign a Diet Plan --</option>
                    {allDietPlans.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} ({dp.dailyCalorieTarget} kcal)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {assignedDiet ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 bg-neutral-50 rounded-2xl text-center">
                      <span className="text-neutral-400 text-[10px] uppercase font-sans">
                        Daily Calories
                      </span>
                      <div className="text-base font-bold text-neutral-900">
                        {assignedDiet.dailyCalorieTarget} kcal
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-2xl text-center">
                      <span className="text-neutral-400 text-[10px] uppercase font-sans">
                        Protein Target
                      </span>
                      <div className="text-base font-bold text-emerald-700">
                        {assignedDiet.proteinTargetG}g
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-2xl text-center">
                      <span className="text-neutral-400 text-[10px] uppercase font-sans">
                        Carbs Target
                      </span>
                      <div className="text-base font-bold text-sky-700">
                        {assignedDiet.carbsTargetG}g
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-2xl text-center">
                      <span className="text-neutral-400 text-[10px] uppercase font-sans">
                        Fat Target
                      </span>
                      <div className="text-base font-bold text-amber-700">
                        {assignedDiet.fatTargetG}g
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {assignedDiet.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="border border-neutral-200 rounded-2xl p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="font-bold text-neutral-900">{meal.name}</span>
                          <span className="font-mono text-[11px] text-neutral-500">
                            Scheduled: {meal.scheduledTime}
                          </span>
                        </div>

                        <div className="divide-y divide-neutral-100">
                          {meal.foodItems.map((f) => (
                            <div
                              key={f.id}
                              className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-neutral-700"
                            >
                              <span>
                                {f.name} ({f.quantity} {f.unit})
                              </span>
                              <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                                {f.calories} kcal · {f.proteinG}g P · {f.carbsG}g C · {f.fatG}g F
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No diet plan assigned. Choose one above or click "Customize Diet for{' '}
                  {member.fullName.split(' ')[0]}".
                </div>
              )}
            </div>
          )}

          {/* Tab 7: Daily Meal Logs */}
          {activeTab === 7 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Food Logging & Nutrition Verification
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Audit photo proofs and adherence status submitted by {member.fullName}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {memberMeals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No meal submissions logged yet by this client.
                  </div>
                ) : (
                  memberMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-4 border border-neutral-200 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start text-xs"
                    >
                      <div className="flex gap-4 min-w-0">
                        {meal.photoUrl ? (
                          <img
                            src={meal.photoUrl}
                            alt="Meal verification"
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-xl object-cover border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 text-[10px] shrink-0">
                            No Photo
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900">
                              {meal.scheduledMealName}
                            </span>
                            <span className="font-mono text-neutral-400 text-[11px]">
                              {meal.loggedAt}
                            </span>
                          </div>
                          <p className="text-neutral-700">{meal.prescribedFoodsSummary}</p>
                          <div className="font-mono text-[11px] text-emerald-700">
                            {meal.totalCalories} kcal · {meal.totalProteinG}g P ·{' '}
                            {meal.totalCarbsG}g C · {meal.totalFatG}g F
                          </div>
                          {meal.memberNotes && (
                            <p className="text-neutral-500 italic text-[11px]">
                              Note: "{meal.memberNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onReviewMealLog(meal.id, 'Approved', 'Great adherence, keep it up!')
                          }
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Approve Meal
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onReviewMealLog(
                              meal.id,
                              'Correction Requested',
                              'Try to reduce cooking oil next time.'
                            )
                          }
                          className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white font-semibold rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Correction
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 8: Workout Logs */}
          {activeTab === 8 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Workout Execution Logs</h3>
                  <p className="text-xs text-neutral-500">
                    Lifting performance logs and trainer verification status
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {memberSessions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No session logs recorded yet.
                  </div>
                ) : (
                  memberSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border border-neutral-200 rounded-2xl text-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-neutral-900">
                            {session.dayName}
                          </span>
                          <span className="text-neutral-400 font-mono ml-2">
                            {session.scheduledDate}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl">
                          {session.trainerReviewStatus}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {session.exerciseLogs.map((log) => (
                          <div
                            key={log.exerciseId}
                            className="flex items-center justify-between gap-2 py-1.5 border-b border-neutral-100"
                          >
                            <span className="font-medium text-neutral-800">{log.exerciseName}</span>
                            <div className="font-mono text-[11px] text-neutral-600 shrink-0">
                              {log.actualSets} sets × {log.actualReps} @ {log.weightUsedKg} kg
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() =>
                            onVerifyWorkoutSession(session.id, 'Verified', 'Form and reps verified.')
                          }
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-[11px] cursor-pointer"
                        >
                          Verify Session
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onVerifyWorkoutSession(
                              session.id,
                              'Needs Correction',
                              'Watch tempo on compound lifts.'
                            )
                          }
                          className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white font-semibold rounded-xl text-[11px] cursor-pointer"
                        >
                          Request Correction
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 9: Progress Reports */}
          {activeTab === 9 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Physical Progress & Measurements
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Body weight history, waist, chest, arms, and strength records
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProgress(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Assessment
                </button>
              </div>

              <div className="space-y-3">
                {memberProgress.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-4 border border-neutral-200 rounded-2xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-sm text-neutral-900">{pr.date}</span>
                      <span className="font-bold text-base text-emerald-700">{pr.weightKg} kg</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-neutral-600 font-mono text-[11px]">
                      {pr.waistCm && <span>Waist: {pr.waistCm} cm</span>}
                      {pr.chestCm && <span>Chest: {pr.chestCm} cm</span>}
                      {pr.armCm && <span>Arm: {pr.armCm} cm</span>}
                    </div>
                    {pr.personalBests && (
                      <div className="p-2.5 bg-neutral-50 rounded-xl font-mono text-[11px] text-neutral-700 flex flex-wrap gap-4">
                        {pr.personalBests.benchPressKg && (
                          <span>Bench: {pr.personalBests.benchPressKg} kg</span>
                        )}
                        {pr.personalBests.squatKg && (
                          <span>Squat: {pr.personalBests.squatKg} kg</span>
                        )}
                        {pr.personalBests.deadliftKg && (
                          <span>Deadlift: {pr.personalBests.deadliftKg} kg</span>
                        )}
                      </div>
                    )}
                    {pr.notes && <p className="text-neutral-500 text-[11px] italic">{pr.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 10: Attendance & Monthly Gym Check-in Calendar */}
          {activeTab === 10 && (
            <div className="space-y-6">
              <GymAttendanceCalendar
                memberId={member.id}
                memberName={member.fullName}
                checkInDates={member.gymCheckInDates || []}
                onToggleDate={(d) => onToggleGymCheckIn(member.id, d)}
                isEditable={true}
                roleLabel="trainer"
              />

              <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      1-on-1 Coaching Attendance Sessions
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">
                      {member.remainingSessions} / {member.totalPackageSessions} sessions remaining
                      in package
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {memberTrainingEvents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-400">
                      No personal sessions booked yet.
                    </div>
                  ) : (
                    memberTrainingEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 border border-neutral-200 rounded-2xl text-xs"
                      >
                        <div>
                          <span className="font-bold text-neutral-900">{evt.title}</span>
                          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            {evt.sessionDate} · {evt.startTime} - {evt.endTime} ({evt.focusArea})
                          </div>
                        </div>

                        <span
                          className={`font-semibold font-mono text-xs shrink-0 ${
                            evt.attendanceStatus === 'Present'
                              ? 'text-emerald-700'
                              : evt.attendanceStatus === 'Scheduled'
                              ? 'text-sky-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {evt.attendanceStatus}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 11: Notices & Messages */}
          {activeTab === 11 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                Targeted Notices for {member.fullName}
              </h3>

              <div className="space-y-3">
                {memberNotices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">
                    No notices sent to this client.
                  </div>
                ) : (
                  memberNotices.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 border border-neutral-200 rounded-2xl text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-neutral-900">{n.title}</span>
                        <span className="font-mono text-neutral-400 text-[11px]">
                          {n.publishedDate}
                        </span>
                      </div>
                      <p className="text-neutral-700 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 12: Trainer Private Notes */}
          {activeTab === 12 && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] max-w-2xl space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-base font-bold text-neutral-900">Confidential Trainer Notes</h3>
                <p className="text-xs text-neutral-500">
                  Only visible to head coach. Record progression insights, psychological cues, and
                  injury observations.
                </p>
              </div>

              <textarea
                rows={6}
                value={trainerNotesInput}
                onChange={(e) => setTrainerNotesInput(e.target.value)}
                placeholder="Record private training notes, cues, strengths, and rehabilitation requirements..."
                className="w-full p-3.5 border border-neutral-200 rounded-2xl text-xs focus:ring-2 focus:ring-[#7155E8]/20 focus:border-[#7155E8] focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">Stored locally</span>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {notesSaved ? 'Saved!' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* MODAL: CONFIRM CLIENT REMOVAL */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Remove Client Profile"
        description="This action permanently deletes the member's attendance history and plan links."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to permanently remove <strong>{member.fullName}</strong>?
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDeleteMember(member.id);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
            >
              Delete Client
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CUSTOM WORKOUT ROUTINE FOR THIS CLIENT */}
      <Modal
        isOpen={showCustomWorkoutModal}
        onClose={() => setShowCustomWorkoutModal(false)}
        title={`Customize Routine for ${member.fullName}`}
        description="Create an individualized split tailored to this client's specific goals and physiology"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveCustomWorkout} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Routine Title</label>
            <input
              type="text"
              required
              value={customWorkoutName}
              onChange={(e) => setCustomWorkoutName(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Target Goal</label>
              <input
                type="text"
                value={customWorkoutGoal}
                onChange={(e) => setCustomWorkoutGoal(e.target.value)}
                className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Difficulty Level</label>
              <select
                value={customWorkoutDifficulty}
                onChange={(e) => setCustomWorkoutDifficulty(e.target.value as any)}
                className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs bg-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Coach Instructions</label>
            <textarea
              rows={2}
              value={customWorkoutInstructions}
              onChange={(e) => setCustomWorkoutInstructions(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs"
            />
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
            <label className="block font-bold text-neutral-900">Day 1 Split Name</label>
            <input
              type="text"
              value={customWorkoutDay1Name}
              onChange={(e) => setCustomWorkoutDay1Name(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-xl bg-white font-semibold text-xs"
            />
            <label className="block font-semibold text-neutral-600 text-[11px]">
              Exercises (One per line with sets & reps)
            </label>
            <textarea
              rows={3}
              value={customWorkoutDay1Exercises}
              onChange={(e) => setCustomWorkoutDay1Exercises(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-xl bg-white font-mono text-xs"
            />
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
            <label className="block font-bold text-neutral-900">Day 2 Split Name</label>
            <input
              type="text"
              value={customWorkoutDay2Name}
              onChange={(e) => setCustomWorkoutDay2Name(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-xl bg-white font-semibold text-xs"
            />
            <label className="block font-semibold text-neutral-600 text-[11px]">
              Exercises (One per line with sets & reps)
            </label>
            <textarea
              rows={3}
              value={customWorkoutDay2Exercises}
              onChange={(e) => setCustomWorkoutDay2Exercises(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-xl bg-white font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowCustomWorkoutModal(false)}
              className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white font-semibold rounded-xl shadow-xs"
            >
              Assign Custom Routine to {member.fullName.split(' ')[0]}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CUSTOM DIET PLAN FOR THIS CLIENT */}
      <Modal
        isOpen={showCustomDietModal}
        onClose={() => setShowCustomDietModal(false)}
        title={`Customize Diet for ${member.fullName}`}
        description="Set specific target calories, macros, and scheduled daily meals"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveCustomDiet} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Nutrition Plan Name</label>
            <input
              type="text"
              required
              value={customDietName}
              onChange={(e) => setCustomDietName(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Calories (kcal)</label>
              <input
                type="number"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Protein (g)</label>
              <input
                type="number"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl font-mono font-bold text-sky-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Fat (g)</label>
              <input
                type="number"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl font-mono font-bold text-amber-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Water (L/day)</label>
              <input
                type="number"
                step="0.5"
                value={customWater}
                onChange={(e) => setCustomWater(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl font-mono font-bold text-blue-700"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="font-bold text-neutral-900 block text-xs">Prescribed Meals</span>

            <div>
              <label className="block font-medium text-neutral-600 mb-0.5">Breakfast (08:30)</label>
              <input
                type="text"
                value={customBreakfast}
                onChange={(e) => setCustomBreakfast(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-600 mb-0.5">Lunch (13:30)</label>
              <input
                type="text"
                value={customLunch}
                onChange={(e) => setCustomLunch(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-600 mb-0.5">
                Pre-Workout Fuel (17:00)
              </label>
              <input
                type="text"
                value={customPreWorkout}
                onChange={(e) => setCustomPreWorkout(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-600 mb-0.5">Dinner (21:00)</label>
              <input
                type="text"
                value={customDinner}
                onChange={(e) => setCustomDinner(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowCustomDietModal(false)}
              className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white font-semibold rounded-xl shadow-xs"
            >
              Assign Custom Diet to {member.fullName.split(' ')[0]}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NEW PROGRESS RECORD */}
      <Modal
        isOpen={showAddProgress}
        onClose={() => setShowAddProgress(false)}
        title="Record Progress Assessment"
        description="Log updated body weight and circumference metrics"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProgress} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Body Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              required
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono">
            <div>
              <label className="block font-sans text-neutral-600 mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.5"
                value={newWaist}
                onChange={(e) => setNewWaist(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-sans text-neutral-600 mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.5"
                value={newChest}
                onChange={(e) => setNewChest(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-sans text-neutral-600 mb-1">Arm (cm)</label>
              <input
                type="number"
                step="0.5"
                value={newArm}
                onChange={(e) => setNewArm(e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Assessment Notes</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Body composition improvements, posture notes..."
              className="w-full p-2.5 border border-neutral-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowAddProgress(false)}
              className="px-3.5 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl font-semibold"
            >
              Save Assessment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
