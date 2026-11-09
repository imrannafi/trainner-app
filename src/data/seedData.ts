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
  PaymentVerificationRequest,
  MemberRegistrationRequest
} from '../types';

export const SEED_TRAINER: TrainerProfile = {
  id: 'trainer-01',
  userId: 'usr-azim',
  fullName: 'Coach Oliul Azim',
  gymName: "Azim's Workout Arena & Performance Club",
  title: 'CSCS & Head Performance Coach',
  phone: '+880 1711-234567',
  email: 'oliul.azim@workoutmanager.com',
  avatarUrl: '/src/assets/images/oliul_azim_coach_1794068467381.jpg',
  currency: '৳',
  timezone: 'Asia/Dhaka',
  bio: 'Certified Strength & Conditioning Specialist with 9+ years coaching competitive athletes and transformation clients across Dhaka.'
};

export const SEED_WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: 'wp-01',
    name: '4-Day Hypertrophy & Power Split',
    description: 'Periodized 4-day split emphasizing upper body pressing, back density, squat power, and shoulder hypertrophy.',
    assignedMemberIds: ['mem-01', 'mem-04'],
    goal: 'Muscle Hypertrophy & Strength',
    difficulty: 'Intermediate',
    trainerInstructions: 'Maintain progressive overload. Rest 90-120 seconds on compound lifts, 60 seconds on isolation work.',
    createdAt: '2026-10-01',
    updatedAt: '2026-11-01',
    days: [
      {
        id: 'd-1',
        dayName: 'Day 1: Chest & Triceps',
        focusArea: 'Chest & Triceps',
        isRestDay: false,
        exercises: [
          {
            id: 'ex-101',
            name: 'Barbell Flat Bench Press',
            muscleGroup: 'Chest',
            sets: 4,
            reps: '8-10 reps',
            targetWeightKg: 80,
            restSeconds: 90,
            instructions: 'Retract scapulae, touch lower sternum under control, drive explosively.',
            alternativeExercise: 'Dumbbell Flat Bench Press'
          },
          {
            id: 'ex-102',
            name: 'Incline Dumbbell Press',
            muscleGroup: 'Upper Chest',
            sets: 3,
            reps: '10-12 reps',
            targetWeightKg: 28,
            restSeconds: 75,
            instructions: 'Bench angle at 30 degrees. Feel deep stretch at bottom.',
            alternativeExercise: 'Incline Smith Machine Press'
          },
          {
            id: 'ex-103',
            name: 'Standing Cable Fly',
            muscleGroup: 'Chest',
            sets: 3,
            reps: '12-15 reps',
            targetWeightKg: 15,
            restSeconds: 60,
            instructions: 'Squeeze chest at peak contraction for 1 count.',
            alternativeExercise: 'Pec Deck Machine'
          },
          {
            id: 'ex-104',
            name: 'Triceps Rope Pushdown',
            muscleGroup: 'Triceps',
            sets: 4,
            reps: '12 reps',
            targetWeightKg: 22.5,
            restSeconds: 60,
            instructions: 'Keep elbows locked at sides, spread rope at bottom.',
            alternativeExercise: 'Skull Crushers'
          }
        ]
      },
      {
        id: 'd-2',
        dayName: 'Day 2: Back & Biceps',
        focusArea: 'Back & Biceps',
        isRestDay: false,
        exercises: [
          {
            id: 'ex-201',
            name: 'Conventional Barbell Deadlift',
            muscleGroup: 'Posterior Chain',
            sets: 4,
            reps: '5-6 reps',
            targetWeightKg: 120,
            restSeconds: 120,
            instructions: 'Brace core with Valsalva maneuver, push floor away.',
            alternativeExercise: 'Trap Bar Deadlift'
          },
          {
            id: 'ex-202',
            name: 'Lat Pulldown (Neutral Grip)',
            muscleGroup: 'Lats',
            sets: 4,
            reps: '10-12 reps',
            targetWeightKg: 65,
            restSeconds: 75,
            instructions: 'Pull with elbows down towards hip pockets.',
            alternativeExercise: 'Pull-ups'
          },
          {
            id: 'ex-203',
            name: 'Incline Dumbbell Bicep Curl',
            muscleGroup: 'Biceps',
            sets: 3,
            reps: '12 reps',
            targetWeightKg: 14,
            restSeconds: 60,
            instructions: 'Maintain bicep tension on eccentric portion.',
            alternativeExercise: 'Standing Barbell EZ Curl'
          }
        ]
      },
      {
        id: 'd-3',
        dayName: 'Day 3: Active Rest & Recovery',
        focusArea: 'Mobility & Walking',
        isRestDay: true,
        exercises: []
      },
      {
        id: 'd-4',
        dayName: 'Day 4: Legs & Core Power',
        focusArea: 'Quads, Hamstrings & Abs',
        isRestDay: false,
        exercises: [
          {
            id: 'ex-301',
            name: 'Barbell Back Squat',
            muscleGroup: 'Quads & Glutes',
            sets: 4,
            reps: '8 reps',
            targetWeightKg: 95,
            restSeconds: 120,
            instructions: 'Hit parallel depth, drive knees out.',
            alternativeExercise: 'Leg Press'
          },
          {
            id: 'ex-302',
            name: 'Romanian Deadlift (Dumbbell)',
            muscleGroup: 'Hamstrings',
            sets: 3,
            reps: '10 reps',
            targetWeightKg: 32,
            restSeconds: 90,
            instructions: 'Hinge hips backwards until hamstring stretch is felt.',
            alternativeExercise: 'Lying Leg Curl Machine'
          },
          {
            id: 'ex-303',
            name: 'Hanging Leg Raises',
            muscleGroup: 'Core',
            sets: 3,
            reps: '15 reps',
            restSeconds: 60,
            instructions: 'Avoid swinging; initiate curl from pelvis.',
            alternativeExercise: 'Cable Crunch'
          }
        ]
      }
    ]
  },
  {
    id: 'wp-02',
    name: '3-Day Fat Burn & Metabolic Conditioning',
    description: 'High-density circuit split targeting maximum metabolic burn and cardiovascular conditioning.',
    assignedMemberIds: ['mem-02'],
    goal: 'Fat Loss & Athletic Conditioning',
    difficulty: 'Intermediate',
    trainerInstructions: 'Maintain short rest intervals (45-60s) to keep heart rate in targeted zone.',
    createdAt: '2026-10-15',
    updatedAt: '2026-10-28',
    days: [
      {
        id: 'd-21',
        dayName: 'Day 1: Full Body Circuit A',
        focusArea: 'Full Body & Core',
        isRestDay: false,
        exercises: [
          {
            id: 'ex-401',
            name: 'Goblet Squats with Kettlebell',
            muscleGroup: 'Quads & Glutes',
            sets: 4,
            reps: '15 reps',
            targetWeightKg: 16,
            restSeconds: 45,
            instructions: 'Chest tall, elbows inside knees at bottom.'
          },
          {
            id: 'ex-402',
            name: 'Dumbbell Push Press',
            muscleGroup: 'Shoulders',
            sets: 3,
            reps: '12 reps',
            targetWeightKg: 10,
            restSeconds: 45,
            instructions: 'Dip hips slightly and drive upward overhead.'
          },
          {
            id: 'ex-403',
            name: 'Renegade Rows',
            muscleGroup: 'Back & Core',
            sets: 3,
            reps: '10 reps per side',
            targetWeightKg: 8,
            restSeconds: 60,
            instructions: 'Prevent hip rotation while rowing.'
          }
        ]
      },
      {
        id: 'd-22',
        dayName: 'Day 2: Cardio & Mobility',
        focusArea: 'LISS Cardio',
        isRestDay: false,
        exercises: [
          {
            id: 'ex-404',
            name: 'Incline Treadmill Walk',
            muscleGroup: 'Cardiovascular',
            sets: 1,
            reps: '35 mins @ 10% incline',
            restSeconds: 0,
            instructions: 'Heart rate target 125-135 BPM.'
          }
        ]
      }
    ]
  }
];

export const SEED_DIET_PLANS: DietPlan[] = [
  {
    id: 'dp-01',
    name: 'High-Protein Clean Recomposition Plan',
    description: 'Calculated macros for lean muscle retention and steady fat loss in Dhaka climate.',
    assignedMemberIds: ['mem-01', 'mem-04'],
    dailyCalorieTarget: 2450,
    proteinTargetG: 175,
    carbsTargetG: 260,
    fatTargetG: 65,
    waterIntakeLiters: 3.5,
    dietaryPreferences: 'High protein, local wholesome foods, halal',
    restrictions: 'No fried street foods, avoid excessive vegetable oil',
    trainerInstructions: 'Drink 500ml water immediately upon waking. Distribute protein across 4 main meals.',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-25',
    meals: [
      {
        id: 'm-1',
        name: 'Breakfast',
        scheduledTime: '08:30',
        preparationNotes: 'Boil or scramble eggs with 1/2 tsp olive oil. Cook oats in warm water or low fat milk.',
        foodItems: [
          { id: 'f-1', name: 'Whole Eggs (Boiled)', quantity: 3, unit: 'pcs', calories: 215, proteinG: 18, carbsG: 1.5, fatG: 15 },
          { id: 'f-2', name: 'Egg Whites', quantity: 2, unit: 'pcs', calories: 34, proteinG: 7, carbsG: 0.5, fatG: 0.2 },
          { id: 'f-3', name: 'Rolled Oats (Dry weight)', quantity: 70, unit: 'g', calories: 270, proteinG: 10, carbsG: 46, fatG: 5 },
          { id: 'f-4', name: 'Banana (Medium)', quantity: 1, unit: 'pcs', calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.3 }
        ]
      },
      {
        id: 'm-2',
        name: 'Lunch',
        scheduledTime: '13:30',
        preparationNotes: 'Grilled or boiled skinless chicken breast with turmeric and coriander. Steamed fragrant brown/Nazirshail rice.',
        foodItems: [
          { id: 'f-5', name: 'Skinless Chicken Breast', quantity: 180, unit: 'g', calories: 295, proteinG: 55, carbsG: 0, fatG: 6.5 },
          { id: 'f-6', name: 'Cooked Brown Rice', quantity: 200, unit: 'g', calories: 230, proteinG: 5, carbsG: 48, fatG: 1.8 },
          { id: 'f-7', name: 'Steamed Broccoli & Carrot', quantity: 150, unit: 'g', calories: 55, proteinG: 3.5, carbsG: 11, fatG: 0.6 },
          { id: 'f-8', name: 'Fresh Cucumber & Tomato Salad', quantity: 100, unit: 'g', calories: 20, proteinG: 1, carbsG: 4, fatG: 0.2 }
        ]
      },
      {
        id: 'm-3',
        name: 'Afternoon Pre-Workout Fuel',
        scheduledTime: '17:00',
        preparationNotes: 'Consume 60-90 minutes before your workout session.',
        foodItems: [
          { id: 'f-9', name: 'Plain Greek Yogurt / Curd (Tok Doi)', quantity: 200, unit: 'g', calories: 130, proteinG: 18, carbsG: 8, fatG: 3 },
          { id: 'f-10', name: 'Apple (Medium)', quantity: 1, unit: 'pcs', calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3 },
          { id: 'f-11', name: 'Raw Almonds', quantity: 15, unit: 'g', calories: 88, proteinG: 3.2, carbsG: 3.1, fatG: 7.5 }
        ]
      },
      {
        id: 'm-4',
        name: 'Dinner',
        scheduledTime: '21:00',
        preparationNotes: 'Rui fish steak or grilled chicken with sauteed greens in olive oil.',
        foodItems: [
          { id: 'f-12', name: 'Fresh Water Rui Fish / Salmon fillet', quantity: 180, unit: 'g', calories: 240, proteinG: 38, carbsG: 0, fatG: 9 },
          { id: 'f-13', name: 'Sweet Potato (Steamed)', quantity: 150, unit: 'g', calories: 130, proteinG: 2.5, carbsG: 30, fatG: 0.2 },
          { id: 'f-14', name: 'Mixed Leafy Greens (Palong Shaak)', quantity: 150, unit: 'g', calories: 35, proteinG: 3, carbsG: 5, fatG: 0.5 }
        ]
      }
    ]
  },
  {
    id: 'dp-02',
    name: 'Calorie Deficit & Toning Nutrition Plan',
    description: 'Controlled energy intake emphasizing satiety, micronutrients, and high protein for body fat reduction.',
    assignedMemberIds: ['mem-02'],
    dailyCalorieTarget: 1750,
    proteinTargetG: 135,
    carbsTargetG: 160,
    fatTargetG: 48,
    waterIntakeLiters: 3.0,
    dietaryPreferences: 'Balanced, high fiber, gluten conscious',
    restrictions: 'Limit sweet bakery snacks, carbonated sodas, and sweetened chai',
    trainerInstructions: 'Eat vegetables first during main meals for fiber satiety. Track all sauces.',
    createdAt: '2026-10-15',
    updatedAt: '2026-10-28',
    meals: [
      {
        id: 'm-201',
        name: 'Breakfast',
        scheduledTime: '08:30',
        foodItems: [
          { id: 'f-201', name: 'Egg Omelette (1 whole + 2 whites)', quantity: 1, unit: 'serving', calories: 150, proteinG: 16, carbsG: 2, fatG: 8 },
          { id: 'f-202', name: 'Brown Bread Slice (Toasted)', quantity: 2, unit: 'slices', calories: 140, proteinG: 6, carbsG: 26, fatG: 2 }
        ]
      },
      {
        id: 'm-202',
        name: 'Lunch',
        scheduledTime: '13:00',
        foodItems: [
          { id: 'f-203', name: 'Chicken Breast Curry (Low oil)', quantity: 150, unit: 'g', calories: 230, proteinG: 40, carbsG: 4, fatG: 6 },
          { id: 'f-204', name: 'Steamed Rice', quantity: 120, unit: 'g', calories: 155, proteinG: 3, carbsG: 33, fatG: 0.5 },
          { id: 'f-205', name: 'Mixed Vegetable Medley', quantity: 150, unit: 'g', calories: 60, proteinG: 3, carbsG: 12, fatG: 0.5 }
        ]
      }
    ]
  }
];

export const SEED_MEMBERS: Member[] = [
  {
    id: 'mem-01',
    userId: 'usr-farhan',
    fullName: 'Farhan Kabir',
    email: 'farhan.k@diu.edu.bd',
    phone: '+880 1819-876543',
    avatarUrl: '/src/assets/images/member_avatar_male_1793655258127.jpg',
    age: 28,
    gender: 'Male',
    heightCm: 178,
    currentWeightKg: 81.4,
    targetWeightKg: 78.0,
    emergencyContact: {
      name: 'Salma Kabir',
      phone: '+880 1819-000111',
      relation: 'Spouse'
    },
    fitnessGoal: 'Lean Muscle Hypertrophy & Fat Loss',
    fitnessLevel: 'Intermediate',
    trainingPreferences: 'Heavy barbell compounds, dumbbell hypertrophy, 4 days weekly',
    medicalConditions: 'Mild lumbar tension in 2024, fully resolved with glute activation',
    injuriesOrRestrictions: 'Avoid rounded back on heavy RDLs',
    trainerPrivateNotes: 'High discipline, rarely misses gym. Respond well to progressive overload on bench press. Target 80kg by December.',
    assignedWorkoutPlanId: 'wp-01',
    assignedDietPlanId: 'dp-01',
    membershipStartDate: '2026-09-15',
    membershipEndDate: '2026-12-15',
    membershipDuration: '3 months',
    trainingFrequencyPerWeek: 4,
    totalPackageSessions: 36,
    remainingSessions: 18,
    packagePrice: 24000,
    amountPaid: 24000,
    nextPaymentDeadline: '2026-12-10',
    paymentStatus: 'Paid',
    status: 'Active',
    activationStatus: 'Active',
    gymCheckInDates: [
      '2026-11-02',
      '2026-11-01',
      '2026-10-30',
      '2026-10-28',
      '2026-10-26',
      '2026-10-23',
      '2026-10-21',
      '2026-10-19',
      '2026-10-16',
      '2026-10-14',
      '2026-10-12',
      '2026-10-09',
      '2026-10-07',
      '2026-10-05',
      '2026-10-02'
    ],
    joinedAt: '2026-09-15'
  },
  {
    id: 'mem-02',
    userId: 'usr-sarah',
    fullName: 'Sarah Rahman',
    email: 'sarah.rahman@outlook.com',
    phone: '+880 1712-445566',
    avatarUrl: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    age: 26,
    gender: 'Female',
    heightCm: 165,
    currentWeightKg: 63.8,
    targetWeightKg: 58.0,
    emergencyContact: {
      name: 'Zahid Rahman',
      phone: '+880 1712-998877',
      relation: 'Brother'
    },
    fitnessGoal: 'Core Strength, Fat Reduction & Tone',
    fitnessLevel: 'Intermediate',
    trainingPreferences: 'Kettlebells, functional circuits, active mobility',
    medicalConditions: 'None',
    injuriesOrRestrictions: 'Mild patellar sensitivity on deep forward lunges',
    trainerPrivateNotes: 'Membership expires in 3 days. Send friendly renewal reminder. Outstanding balance ৳3,500 due today.',
    assignedWorkoutPlanId: 'wp-02',
    assignedDietPlanId: 'dp-02',
    membershipStartDate: '2026-08-05',
    membershipEndDate: '2026-11-05', // Expiring in 3 days!
    membershipDuration: '3 months',
    trainingFrequencyPerWeek: 3,
    totalPackageSessions: 24,
    remainingSessions: 2,
    packagePrice: 18000,
    amountPaid: 14500,
    nextPaymentDeadline: '2026-11-04',
    paymentStatus: 'Partially Paid',
    status: 'Expiring Soon',
    activationStatus: 'Active',
    gymCheckInDates: [
      '2026-11-01',
      '2026-10-29',
      '2026-10-27',
      '2026-10-24',
      '2026-10-22',
      '2026-10-20',
      '2026-10-17',
      '2026-10-15',
      '2026-10-13',
      '2026-10-10'
    ],
    joinedAt: '2026-08-05'
  },
  {
    id: 'mem-03',
    userId: 'usr-tanvir',
    fullName: 'Tanvir Hasan',
    email: 'tanvir.h@innovatebd.com',
    phone: '+880 1911-332211',
    avatarUrl: '', // uses fallback avatar
    age: 34,
    gender: 'Male',
    heightCm: 173,
    currentWeightKg: 89.2,
    targetWeightKg: 80.0,
    emergencyContact: {
      name: 'Rezaul Hasan',
      phone: '+880 1911-443322',
      relation: 'Father'
    },
    fitnessGoal: 'Desk Posture Correction & Weight Loss',
    fitnessLevel: 'Beginner',
    trainingPreferences: 'Machine guided exercises, ergonomic stretching, cardio',
    medicalConditions: 'Sedentary desk job back stiffness, borderline elevated blood pressure',
    injuriesOrRestrictions: 'Limit overhead heavy barbell pressing until shoulder mobility improves',
    trainerPrivateNotes: 'Missed two sessions last week. Overdue payment ৳12,000 for renewed 6-month tier.',
    assignedWorkoutPlanId: 'wp-01',
    assignedDietPlanId: 'dp-01',
    membershipStartDate: '2026-10-01',
    membershipEndDate: '2027-04-01',
    membershipDuration: '6 months',
    trainingFrequencyPerWeek: 3,
    totalPackageSessions: 48,
    remainingSessions: 40,
    packagePrice: 32000,
    amountPaid: 20000,
    nextPaymentDeadline: '2026-10-25', // Overdue!
    paymentStatus: 'Overdue',
    status: 'Active',
    activationStatus: 'Active',
    gymCheckInDates: [
      '2026-10-28',
      '2026-10-26',
      '2026-10-21',
      '2026-10-19',
      '2026-10-14',
      '2026-10-12',
      '2026-10-07'
    ],
    joinedAt: '2026-10-01'
  },
  {
    id: 'mem-04',
    userId: 'usr-mehnaz',
    fullName: 'Mehnaz Chowdhury',
    email: 'mehnaz.c@gmail.com',
    phone: '+880 1611-778899',
    avatarUrl: '',
    age: 31,
    gender: 'Female',
    heightCm: 160,
    currentWeightKg: 68.0,
    targetWeightKg: 62.0,
    emergencyContact: {
      name: 'Adnan Chowdhury',
      phone: '+880 1611-001122',
      relation: 'Spouse'
    },
    fitnessGoal: 'Cardiorespiratory Endurance & Glute Strength',
    fitnessLevel: 'Beginner',
    trainingPreferences: 'Pilates style mat work, resistance bands, progressive dumbells',
    medicalConditions: 'Post-pregnancy recovery completed 8 months ago',
    injuriesOrRestrictions: 'Protect pelvic floor alignment during heavy compound lifts',
    trainerPrivateNotes: 'Newly joined, very enthusiastic. Invited to portal, credentials generated.',
    assignedWorkoutPlanId: 'wp-01',
    assignedDietPlanId: 'dp-01',
    membershipStartDate: '2026-10-20',
    membershipEndDate: '2027-01-20',
    membershipDuration: '3 months',
    trainingFrequencyPerWeek: 3,
    totalPackageSessions: 24,
    remainingSessions: 22,
    packagePrice: 20000,
    amountPaid: 20000,
    nextPaymentDeadline: '2027-01-15',
    paymentStatus: 'Paid',
    status: 'Active',
    activationStatus: 'Active',
    gymCheckInDates: [
      '2026-11-02',
      '2026-10-31',
      '2026-10-28',
      '2026-10-26',
      '2026-10-24'
    ],
    joinedAt: '2026-10-20'
  }
];

export const SEED_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-101',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    amount: 24000,
    date: '2026-09-15',
    method: 'bKash',
    transactionRef: 'BK9X8722KLM',
    billingPeriod: '15 Sep 2026 - 15 Dec 2026',
    recordedBy: 'Coach Oliul Azim',
    notes: 'Full 3-month package fee paid via bKash Merchant pay.',
    status: 'Completed'
  },
  {
    id: 'pay-102',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    amount: 10000,
    date: '2026-08-05',
    method: 'Nagad',
    transactionRef: 'NGD430192TX',
    billingPeriod: '05 Aug 2026 - 05 Nov 2026 (Part 1)',
    recordedBy: 'Coach Oliul Azim',
    notes: 'First installment received at registration.',
    status: 'Completed'
  },
  {
    id: 'pay-103',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    amount: 4500,
    date: '2026-09-10',
    method: 'bKash',
    transactionRef: 'BK54099881A',
    billingPeriod: '05 Aug 2026 - 05 Nov 2026 (Part 2)',
    recordedBy: 'Coach Oliul Azim',
    notes: 'Second partial installment. Remaining ৳3,500 due before expiry.',
    status: 'Completed'
  },
  {
    id: 'pay-104',
    memberId: 'mem-03',
    memberName: 'Tanvir Hasan',
    amount: 20000,
    date: '2026-10-01',
    method: 'Bank Transfer',
    transactionRef: 'EBL-TR-9021882',
    billingPeriod: '01 Oct 2026 - 01 Apr 2027 (Deposit)',
    recordedBy: 'Coach Oliul Azim',
    notes: 'Eastern Bank transfer deposit. Remaining ৳12,000 balance overdue since Oct 25.',
    status: 'Completed'
  },
  {
    id: 'pay-105',
    memberId: 'mem-04',
    memberName: 'Mehnaz Chowdhury',
    amount: 20000,
    date: '2026-10-20',
    method: 'Rocket',
    transactionRef: 'RCK887201990',
    billingPeriod: '20 Oct 2026 - 20 Jan 2027',
    recordedBy: 'Coach Oliul Azim',
    notes: 'Dutch Bangla Rocket full payment.',
    status: 'Completed'
  }
];

export const SEED_WORKOUT_SESSIONS: WorkoutSession[] = [
  {
    id: 'ws-101',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    planId: 'wp-01',
    planName: '4-Day Hypertrophy & Power Split',
    dayName: 'Day 1: Chest & Triceps',
    scheduledDate: '2026-11-02',
    startTime: '18:15',
    endTime: '19:25',
    durationMinutes: 70,
    completionPercentage: 100,
    status: 'Completed',
    memberNotes: 'Felt very strong on bench press today. Hit all 4 sets with 80kg comfortably.',
    trainerReviewStatus: 'Verified',
    trainerFeedback: 'Great form maintenance Farhan. Ready to test 82.5kg next Monday.',
    verifiedAt: '2026-11-02 20:00',
    exerciseLogs: [
      {
        exerciseId: 'ex-101',
        exerciseName: 'Barbell Flat Bench Press',
        completed: true,
        prescribedSets: 4,
        prescribedReps: '8-10 reps',
        actualSets: 4,
        actualReps: '10, 10, 9, 8',
        weightUsedKg: 80,
        notes: 'Smooth bar path, tight leg drive'
      },
      {
        exerciseId: 'ex-102',
        exerciseName: 'Incline Dumbbell Press',
        completed: true,
        prescribedSets: 3,
        prescribedReps: '10-12 reps',
        actualSets: 3,
        actualReps: '12, 11, 10',
        weightUsedKg: 28,
        notes: 'Good deep stretch'
      },
      {
        exerciseId: 'ex-103',
        exerciseName: 'Standing Cable Fly',
        completed: true,
        prescribedSets: 3,
        prescribedReps: '12-15 reps',
        actualSets: 3,
        actualReps: '15, 14, 12',
        weightUsedKg: 15
      },
      {
        exerciseId: 'ex-104',
        exerciseName: 'Triceps Rope Pushdown',
        completed: true,
        prescribedSets: 4,
        prescribedReps: '12 reps',
        actualSets: 4,
        actualReps: '12, 12, 12, 12',
        weightUsedKg: 22.5
      }
    ]
  },
  {
    id: 'ws-102',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    planId: 'wp-02',
    planName: '3-Day Fat Burn & Metabolic Conditioning',
    dayName: 'Day 1: Full Body Circuit A',
    scheduledDate: '2026-11-01',
    startTime: '07:30',
    endTime: '08:20',
    durationMinutes: 50,
    completionPercentage: 85,
    status: 'Completed',
    memberNotes: 'Completed kettlebell work and dumbbell presses. Skipped renegade rows due to slight wrist tiredness.',
    trainerReviewStatus: 'Pending Review',
    exerciseLogs: [
      {
        exerciseId: 'ex-401',
        exerciseName: 'Goblet Squats with Kettlebell',
        completed: true,
        prescribedSets: 4,
        prescribedReps: '15 reps',
        actualSets: 4,
        actualReps: '15, 15, 15, 15',
        weightUsedKg: 16
      },
      {
        exerciseId: 'ex-402',
        exerciseName: 'Dumbbell Push Press',
        completed: true,
        prescribedSets: 3,
        prescribedReps: '12 reps',
        actualSets: 3,
        actualReps: '12, 12, 10',
        weightUsedKg: 10
      },
      {
        exerciseId: 'ex-403',
        exerciseName: 'Renegade Rows',
        completed: false,
        prescribedSets: 3,
        prescribedReps: '10 reps per side',
        actualSets: 0,
        actualReps: '0',
        weightUsedKg: 0,
        notes: 'Felt wrist discomfort'
      }
    ]
  }
];

export const SEED_MEAL_LOGS: MealLog[] = [
  {
    id: 'ml-01',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    memberAvatar: '/src/assets/images/member_avatar_male_1793655258127.jpg',
    dietPlanId: 'dp-01',
    scheduledMealName: 'Lunch',
    date: '2026-11-02',
    loggedAt: '2026-11-02 14:05',
    adherence: 'Followed Plan',
    prescribedFoodsSummary: '180g Chicken breast, 200g Brown rice, 150g Steamed broccoli & carrot',
    foodsConsumed: [
      { id: 'fc-1', name: 'Skinless Chicken Breast', quantity: '185g', calories: 300, proteinG: 56, carbsG: 0, fatG: 6.5, wasInPlan: true },
      { id: 'fc-2', name: 'Cooked Brown Rice', quantity: '200g', calories: 230, proteinG: 5, carbsG: 48, fatG: 1.8, wasInPlan: true },
      { id: 'fc-3', name: 'Steamed Broccoli & Avocado slice', quantity: '160g', calories: 95, proteinG: 3.8, carbsG: 10, fatG: 5, wasInPlan: true }
    ],
    totalCalories: 625,
    totalProteinG: 64.8,
    totalCarbsG: 58,
    totalFatG: 13.3,
    photoUrl: '/src/assets/images/meal_evidence_healthy_1793655257146.jpg',
    memberNotes: 'Weighed on digital scale before cooking. Exactly adhered to the macro targets.',
    trainerReviewStatus: 'Approved',
    trainerFeedback: 'Picture perfect portion sizes and clean presentation. Excellent adherence Farhan!',
    reviewedAt: '2026-11-02 15:30'
  },
  {
    id: 'ml-02',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    memberAvatar: '/src/assets/images/member_avatar_male_1793655258127.jpg',
    dietPlanId: 'dp-01',
    scheduledMealName: 'Breakfast',
    date: '2026-11-02',
    loggedAt: '2026-11-02 08:45',
    adherence: 'Followed Plan',
    prescribedFoodsSummary: '3 Boiled eggs, 2 whites, 70g Oats, 1 Banana',
    foodsConsumed: [
      { id: 'fc-4', name: 'Whole Boiled Eggs', quantity: '3 pcs', calories: 215, proteinG: 18, carbsG: 1.5, fatG: 15, wasInPlan: true },
      { id: 'fc-5', name: 'Egg whites', quantity: '2 pcs', calories: 34, proteinG: 7, carbsG: 0.5, fatG: 0.2, wasInPlan: true },
      { id: 'fc-6', name: 'Oats with hot water & banana', quantity: '1 bowl', calories: 375, proteinG: 11, carbsG: 73, fatG: 5.3, wasInPlan: true }
    ],
    totalCalories: 624,
    totalProteinG: 36,
    totalCarbsG: 75,
    totalFatG: 20.5,
    memberNotes: 'Consumed on time with 500ml water.',
    trainerReviewStatus: 'Approved'
  },
  {
    id: 'ml-03',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    memberAvatar: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    dietPlanId: 'dp-02',
    scheduledMealName: 'Lunch',
    date: '2026-11-02',
    loggedAt: '2026-11-02 14:15',
    adherence: 'Partially Followed',
    prescribedFoodsSummary: '150g Chicken breast curry (low oil), 120g Steamed rice, 150g Veggies',
    foodsConsumed: [
      { id: 'fc-7', name: 'Chicken Curry', quantity: '150g', calories: 250, proteinG: 38, carbsG: 5, fatG: 8, wasInPlan: true },
      { id: 'fc-8', name: 'Steamed Rice', quantity: '180g (ate a bit extra)', calories: 230, proteinG: 4.5, carbsG: 49, fatG: 0.7, wasInPlan: true },
      { id: 'fc-9', name: 'Gulab Jamun (1 small piece at office)', quantity: '1 pc', calories: 140, proteinG: 2, carbsG: 22, fatG: 5, wasInPlan: false }
    ],
    totalCalories: 620,
    totalProteinG: 44.5,
    totalCarbsG: 76,
    totalFatG: 13.7,
    memberNotes: 'Colleague brought sweets for birthday. I had 1 small piece and reduced dinner carbs to compensate.',
    trainerReviewStatus: 'Pending',
    trainerFeedback: ''
  }
];

export const SEED_PROGRESS_RECORDS: ProgressRecord[] = [
  {
    id: 'pr-01',
    memberId: 'mem-01',
    date: '2026-09-15',
    weightKg: 84.5,
    waistCm: 89,
    chestCm: 102,
    armCm: 37,
    personalBests: { benchPressKg: 70, squatKg: 85, deadliftKg: 100 },
    notes: 'Initial baseline assessment at enrollment.'
  },
  {
    id: 'pr-02',
    memberId: 'mem-01',
    date: '2026-10-01',
    weightKg: 83.2,
    waistCm: 87,
    chestCm: 103,
    armCm: 37.5,
    personalBests: { benchPressKg: 75, squatKg: 90, deadliftKg: 110 },
    notes: '2-week check-in. Waist dropped 2cm, bench increasing nicely.'
  },
  {
    id: 'pr-03',
    memberId: 'mem-01',
    date: '2026-10-18',
    weightKg: 82.0,
    waistCm: 85,
    chestCm: 104,
    armCm: 38,
    personalBests: { benchPressKg: 77.5, squatKg: 92.5, deadliftKg: 115 },
    notes: 'Mid-term check. Lean definition appearing in delts and upper abs.'
  },
  {
    id: 'pr-04',
    memberId: 'mem-01',
    date: '2026-11-01',
    weightKg: 81.4,
    waistCm: 84,
    chestCm: 105,
    armCm: 38.5,
    personalBests: { benchPressKg: 80, squatKg: 95, deadliftKg: 120 },
    notes: 'Excellent 6-week result. 3.1kg bodyweight drop while arm size expanded.'
  },
  {
    id: 'pr-05',
    memberId: 'mem-02',
    date: '2026-08-05',
    weightKg: 67.5,
    waistCm: 76,
    chestCm: 88,
    armCm: 28,
    notes: 'Baseline intake test.'
  },
  {
    id: 'pr-06',
    memberId: 'mem-02',
    date: '2026-10-25',
    weightKg: 63.8,
    waistCm: 71,
    chestCm: 86,
    armCm: 27.5,
    notes: 'Down 3.7kg. Noticeable fat loss across midsection and improved core endurance.'
  }
];

export const SEED_TRAINING_SESSIONS: TrainingSessionEvent[] = [
  {
    id: 'ts-01',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    trainerId: 'trainer-01',
    sessionDate: '2026-11-03',
    startTime: '18:00',
    endTime: '19:00',
    title: 'Personal Training: Upper Power & Bench Progression',
    focusArea: 'Chest & Heavy Triceps',
    attendanceStatus: 'Scheduled',
    trainerNotes: 'Spot on 82.5kg bench press attempt'
  },
  {
    id: 'ts-02',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    trainerId: 'trainer-01',
    sessionDate: '2026-11-04',
    startTime: '08:00',
    endTime: '09:00',
    title: 'Personal Training: Kettlebell Conditioning & Core',
    focusArea: 'Cardio metabolic circuit',
    attendanceStatus: 'Scheduled',
    trainerNotes: 'Review membership renewal and payment balance'
  },
  {
    id: 'ts-03',
    memberId: 'mem-03',
    memberName: 'Tanvir Hasan',
    trainerId: 'trainer-01',
    sessionDate: '2026-10-31',
    startTime: '19:00',
    endTime: '20:00',
    title: 'Personal Training: Posterior Chain & Posture Reset',
    focusArea: 'Thoracic extension & glutes',
    attendanceStatus: 'Absent',
    trainerNotes: 'Client missed session due to late work meeting'
  },
  {
    id: 'ts-04',
    memberId: 'mem-01',
    memberName: 'Farhan Kabir',
    trainerId: 'trainer-01',
    sessionDate: '2026-10-30',
    startTime: '18:00',
    endTime: '19:00',
    title: 'Personal Training: Heavy Deadlifts & Lat Rows',
    focusArea: 'Back hypertrophy',
    attendanceStatus: 'Present',
    trainerNotes: 'Clean 120kg pull with double overhand grip'
  }
];

export const SEED_NOTICES: Notice[] = [
  {
    id: 'not-01',
    title: 'Gym Holiday Schedule & Friday Open Training Hours',
    message: 'Please note that on upcoming National Friday, the private personal training studio will be open exclusively from 9:00 AM to 1:00 PM for scheduled personal sessions. Please book your slots in advance.',
    category: 'Schedule',
    targetAudience: 'All Members',
    priority: 'Normal',
    publishedDate: '2026-11-01',
    expiryDate: '2026-11-10',
    readByMemberIds: ['mem-01']
  },
  {
    id: 'not-02',
    title: 'Urgent: Membership Renewal & Balance Due',
    message: 'Hi Sarah, your current 3-month coaching package expires in 3 days on Nov 05, 2026. Please settle the remaining balance of ৳3,500 via bKash or Nagad to secure your morning slot for the next quarter.',
    category: 'Payment',
    targetAudience: 'Specific Member',
    targetMemberId: 'mem-02',
    priority: 'Urgent',
    publishedDate: '2026-11-02',
    expiryDate: '2026-11-06',
    readByMemberIds: []
  },
  {
    id: 'not-03',
    title: 'New High-Protein Nutrition Targets Published',
    message: 'Your personalized macro targets have been updated for November with higher clean carbohydrate allocations on heavy training days. Please check the My Diet tab.',
    category: 'Diet',
    targetAudience: 'Specific Member',
    targetMemberId: 'mem-01',
    priority: 'High',
    publishedDate: '2026-11-01',
    readByMemberIds: ['mem-01']
  }
];

export const SEED_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'in-01',
    userId: 'usr-farhan',
    title: 'Workout Reviewed',
    description: 'Coach Oliul verified your Day 1 Chest & Triceps workout session.',
    category: 'workout',
    isRead: false,
    createdAt: '2026-11-02 20:05',
    linkTab: 'workout'
  },
  {
    id: 'in-02',
    userId: 'usr-farhan',
    title: 'Meal Log Approved',
    description: 'Your Lunch report was reviewed and marked as 100% compliant.',
    category: 'diet',
    isRead: true,
    createdAt: '2026-11-02 15:31',
    linkTab: 'diet'
  },
  {
    id: 'in-03',
    userId: 'usr-sarah',
    title: 'Membership Renewal Notice',
    description: 'Your membership is expiring in 3 days. Balance: ৳3,500 due.',
    category: 'payment',
    isRead: false,
    createdAt: '2026-11-02 09:00',
    linkTab: 'payments'
  }
];

export const SEED_NEEDS_ATTENTION: NeedsAttentionAlert[] = [
  {
    id: 'att-01',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    memberAvatar: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    category: 'Membership',
    severity: 'high',
    title: 'Membership Expiring in 3 Days',
    description: 'Membership expires on Nov 05, 2026. Outstanding package balance of ৳3,500 remains unpaid.',
    recommendedAction: 'Send automated bKash/Nagad renewal payment link and confirm December training slot.',
    date: '2026-11-02',
    isResolved: false
  },
  {
    id: 'att-02',
    memberId: 'mem-03',
    memberName: 'Tanvir Hasan',
    memberAvatar: '',
    category: 'Payment',
    severity: 'high',
    title: 'Payment Overdue by 8 Days',
    description: 'Remaining installment of ৳12,000 for 6-month package was due on Oct 25, 2026.',
    recommendedAction: 'Call member or send official reminder notice with bank invoice details.',
    date: '2026-11-02',
    isResolved: false
  },
  {
    id: 'att-03',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    memberAvatar: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    category: 'Diet',
    severity: 'medium',
    title: 'Meal Log Deviated from Plan',
    description: 'Sarah logged an off-plan sweet item (Gulab Jamun) during lunch. Follow-up recommended.',
    recommendedAction: 'Review lunch report, provide positive encouragement, and adjust dinner carbs.',
    date: '2026-11-02',
    isResolved: false
  },
  {
    id: 'att-04',
    memberId: 'mem-03',
    memberName: 'Tanvir Hasan',
    memberAvatar: '',
    category: 'Workout',
    severity: 'medium',
    title: 'Missed Training Session',
    description: 'Marked absent on scheduled Saturday posture training session.',
    recommendedAction: 'Reschedule missed session within 7-day makeup window.',
    date: '2026-10-31',
    isResolved: false
  }
];

export const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-01',
    timestamp: '2026-11-02 20:00:15',
    actor: 'Coach Oliul Azim',
    action: 'VERIFY_WORKOUT',
    details: 'Verified Day 1 workout session for Farhan Kabir (100% completion).'
  },
  {
    id: 'aud-02',
    timestamp: '2026-11-02 15:30:22',
    actor: 'Coach Oliul Azim',
    action: 'APPROVE_MEAL',
    details: 'Approved lunch meal log with photo evidence for Farhan Kabir.'
  },
  {
    id: 'aud-03',
    timestamp: '2026-11-02 09:15:00',
    actor: 'Coach Oliul Azim',
    action: 'PUBLISH_NOTICE',
    details: 'Published urgent payment notice to Sarah Rahman (৳3,500 due).'
  },
  {
    id: 'aud-04',
    timestamp: '2026-10-20 11:40:00',
    actor: 'Coach Oliul Azim',
    action: 'ENROLL_MEMBER',
    details: 'Created member profile for Mehnaz Chowdhury. Recorded full ৳20,000 Rocket payment.'
  }
];

export const SEED_REGISTRATION_REQUESTS: MemberRegistrationRequest[] = [
  {
    id: 'req-01',
    fullName: 'Sabrina Rahman',
    email: 'sabrina.fit@gmail.com',
    phone: '01819234567',
    avatarUrl: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    age: 25,
    gender: 'Female',
    heightCm: 162,
    currentWeightKg: 68,
    targetWeightKg: 58,
    fitnessGoal: 'Weight Loss & Core Toning',
    fitnessLevel: 'Beginner',
    medicalConditions: 'Mild asthma during intense cardio',
    injuriesOrRestrictions: 'Mild right shoulder impingement from desk work',
    bodyConditionNotes: 'Postural slouch, high body fat around midsection. Sedentary lifestyle, looking for progressive guidance under Coach Oliul Azim.',
    frontPhotoUrl: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    membershipDuration: '3 months',
    submittedAt: '2026-11-03 08:30',
    status: 'Pending'
  },
  {
    id: 'req-02',
    fullName: 'Tanvir Ahmed',
    email: 'tanvir.fitbd@gmail.com',
    phone: '01712334455',
    avatarUrl: '/src/assets/images/member_avatar_male_1793655258127.jpg',
    age: 29,
    gender: 'Male',
    heightCm: 178,
    currentWeightKg: 86,
    targetWeightKg: 76,
    fitnessGoal: 'Muscle Hypertrophy & Fat Loss',
    fitnessLevel: 'Intermediate',
    medicalConditions: 'None',
    injuriesOrRestrictions: 'Occasional lower back stiffness after prolonged computer work',
    bodyConditionNotes: 'Gym hiatus for 18 months, muscle memory intact, approx 24% body fat. Needs disciplined diet & progressive strength routine.',
    frontPhotoUrl: '/src/assets/images/member_avatar_male_1793655258127.jpg',
    membershipDuration: '1 month',
    submittedAt: '2026-11-03 09:10',
    status: 'Pending'
  }
];

export const SEED_PAYMENT_REQUESTS: PaymentVerificationRequest[] = [
  {
    id: 'payreq-01',
    memberId: 'mem-02',
    memberName: 'Sarah Rahman',
    memberAvatar: '/src/assets/images/member_avatar_female_1793655258393.jpg',
    memberPhone: '+880 1812-345678',
    amount: 3500,
    method: 'bKash',
    targetBkashNumber: '01717014371',
    senderBkashNumber: '01812345678',
    trxId: 'BKS92048X1',
    submittedAt: '2026-11-03 09:05',
    billingMonth: 'November 2026',
    notes: 'November Monthly Fee sent to 01717014371 via bKash Send Money',
    status: 'Pending'
  }
];
