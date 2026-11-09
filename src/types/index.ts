export type UserRole = 'trainer' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  phone?: string;
  createdAt: string;
}

export interface TrainerProfile {
  id: string;
  userId: string;
  fullName: string;
  gymName: string;
  title: string;
  phone: string;
  email: string;
  avatarUrl: string;
  currency: string; // '৳'
  timezone: string; // 'Asia/Dhaka'
  bio: string;
}

export type MembershipDuration = '1 month' | '3 months' | '6 months' | '12 months' | 'custom';
export type MembershipStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Inactive';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue';
export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer' | 'Other';

export interface Member {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  fitnessGoal: string;
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete';
  trainingPreferences: string;
  medicalConditions?: string;
  injuriesOrRestrictions?: string;
  trainerPrivateNotes: string;
  assignedWorkoutPlanId?: string;
  assignedDietPlanId?: string;
  membershipStartDate: string;
  membershipEndDate: string;
  membershipDuration: MembershipDuration;
  trainingFrequencyPerWeek: number;
  totalPackageSessions: number;
  remainingSessions: number;
  packagePrice: number;
  amountPaid: number;
  nextPaymentDeadline: string;
  paymentStatus: PaymentStatus;
  status: MembershipStatus;
  activationStatus: 'Active' | 'Invited' | 'Pending Activation';
  temporaryPassword?: string;
  gymCheckInDates?: string[]; // Array of 'YYYY-MM-DD' dates attended gym
  joinedAt: string;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionRef?: string;
  billingPeriod: string;
  recordedBy: string;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Refunded';
}

export interface PaymentVerificationRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  memberPhone: string;
  amount: number;
  method: 'bKash' | 'Cash';
  targetBkashNumber?: string; // '01717014371'
  senderBkashNumber?: string;
  trxId?: string;
  submittedAt: string;
  billingMonth: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  reviewedAt?: string;
}

export interface MemberRegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  avatarUrl: string;
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  fitnessGoal: string;
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete';
  medicalConditions?: string;
  injuriesOrRestrictions?: string;
  bodyConditionNotes: string;
  frontPhotoUrl?: string;
  membershipDuration: MembershipDuration;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  createdMemberId?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  targetWeightKg?: number;
  restSeconds: number;
  instructions: string;
  mediaUrl?: string;
  alternativeExercise?: string;
}

export interface WorkoutDay {
  id: string;
  dayName: string; // e.g. "Monday", "Day 1"
  focusArea: string; // e.g. "Chest & Triceps"
  isRestDay: boolean;
  exercises: ExerciseItem[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  assignedMemberIds: string[];
  goal: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  trainerInstructions: string;
  days: WorkoutDay[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  exerciseName: string;
  completed: boolean;
  prescribedSets: number;
  prescribedReps: string;
  actualSets: number;
  actualReps: string;
  weightUsedKg: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  dayName: string;
  scheduledDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  exerciseLogs: WorkoutExerciseLog[];
  completionPercentage: number;
  status: 'Completed' | 'Missed' | 'In Progress';
  memberNotes?: string;
  trainerReviewStatus: 'Pending Review' | 'Verified' | 'Needs Correction';
  trainerFeedback?: string;
  verifiedAt?: string;
}

export interface DietFoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // 'g', 'pcs', 'cup', 'ml'
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DietMeal {
  id: string;
  name: string; // "Breakfast", "Lunch", "Snack", "Dinner"
  scheduledTime: string; // "08:30", "13:30"
  foodItems: DietFoodItem[];
  preparationNotes?: string;
  alternativeOptions?: string;
}

export interface DietPlan {
  id: string;
  name: string;
  description: string;
  assignedMemberIds: string[];
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  waterIntakeLiters: number;
  dietaryPreferences: string;
  restrictions: string;
  trainerInstructions: string;
  meals: DietMeal[];
  createdAt: string;
  updatedAt: string;
}

export type MealPlanAdherence = 'Followed Plan' | 'Partially Followed' | 'Deviated from Plan' | 'Skipped Meal' | 'Not Reported';

export interface MealLogItem {
  id: string;
  name: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  wasInPlan: boolean;
}

export interface MealLog {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  dietPlanId: string;
  scheduledMealName: string; // "Breakfast", etc.
  date: string;
  loggedAt: string;
  adherence: MealPlanAdherence;
  prescribedFoodsSummary: string;
  foodsConsumed: MealLogItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  photoUrl?: string;
  memberNotes?: string;
  trainerReviewStatus: 'Pending' | 'Approved' | 'Correction Requested' | 'Flagged';
  trainerFeedback?: string;
  reviewedAt?: string;
}

export interface ProgressRecord {
  id: string;
  memberId: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  photoUrl?: string;
  personalBests?: {
    benchPressKg?: number;
    squatKg?: number;
    deadliftKg?: number;
    overheadPressKg?: number;
  };
  notes?: string;
  trainerFeedback?: string;
}

export interface TrainingSessionEvent {
  id: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  title: string;
  focusArea: string;
  attendanceStatus: 'Scheduled' | 'Present' | 'Absent' | 'Cancelled' | 'Rescheduled';
  trainerNotes?: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  category: 'General' | 'Payment' | 'Workout' | 'Diet' | 'Schedule' | 'Urgent';
  targetAudience: 'All Members' | 'Specific Member' | 'Overdue Members' | 'Expiring Soon';
  targetMemberId?: string;
  priority: 'Normal' | 'High' | 'Urgent';
  publishedDate: string;
  expiryDate?: string;
  readByMemberIds: string[];
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'notice' | 'payment' | 'workout' | 'diet' | 'system';
  isRead: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface NeedsAttentionAlert {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  category: 'Payment' | 'Workout' | 'Diet' | 'Membership';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendedAction: string;
  date: string;
  isResolved: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}
