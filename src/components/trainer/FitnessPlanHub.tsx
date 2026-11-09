import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Utensils,
  Plus,
  Copy
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { WorkoutPlan, DietPlan, Member } from '../../types';
import { Modal, showToast } from '../common/CommonUI';

interface FitnessPlanHubProps {
  workoutPlans: WorkoutPlan[];
  dietPlans: DietPlan[];
  members: Member[];
  onCreateWorkoutPlan: (plan: any) => void;
  onUpdateWorkoutPlan: (id: string, updates: any) => void;
  onAssignWorkoutPlan: (memberId: string, planId: string) => void;
  onCreateDietPlan: (plan: any) => void;
  onUpdateDietPlan: (id: string, updates: any) => void;
  onAssignDietPlan: (memberId: string, planId: string) => void;
}

export const FitnessPlanHub: React.FC<FitnessPlanHubProps> = ({
  workoutPlans,
  dietPlans,
  members,
  onCreateWorkoutPlan,
  onAssignWorkoutPlan,
  onCreateDietPlan,
  onAssignDietPlan
}) => {
  const [subTab, setSubTab] = useState<'workouts' | 'diets'>('workouts');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(workoutPlans[0]?.id || '');
  const [selectedDietId, setSelectedDietId] = useState<string>(dietPlans[0]?.id || '');

  useEffect(() => {
    if (!workoutPlans.some((p) => p.id === selectedWorkoutId) && workoutPlans[0]) {
      setSelectedWorkoutId(workoutPlans[0].id);
    }
  }, [workoutPlans, selectedWorkoutId]);

  useEffect(() => {
    if (!dietPlans.some((d) => d.id === selectedDietId) && dietPlans[0]) {
      setSelectedDietId(dietPlans[0].id);
    }
  }, [dietPlans, selectedDietId]);

  const selectedWorkout = workoutPlans.find((p) => p.id === selectedWorkoutId) || workoutPlans[0] || null;
  const selectedDiet = dietPlans.find((d) => d.id === selectedDietId) || dietPlans[0] || null;

  // Modal states for creating / editing
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);

  // New Workout Form state
  const [planName, setPlanName] = useState('');
  const [planGoal, setPlanGoal] = useState('Muscle Hypertrophy & Strength');
  const [planDifficulty, setPlanDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [planInstructions, setPlanInstructions] = useState('');

  // New Diet Form state
  const [dietName, setDietName] = useState('');
  const [dietCalories, setDietCalories] = useState('2400');
  const [dietProtein, setDietProtein] = useState('170');
  const [dietCarbs, setDietCarbs] = useState('240');
  const [dietFat, setDietFat] = useState('65');
  const [dietWater, setDietWater] = useState('3.5');
  const [dietInstructions, setDietInstructions] = useState('');

  const handleDuplicateWorkout = (plan: WorkoutPlan) => {
    onCreateWorkoutPlan({
      ...plan,
      name: `${plan.name} (Copy)`,
      assignedMemberIds: []
    });
    showToast(`Duplicated "${plan.name}".`);
  };

  const handleDuplicateDiet = (plan: DietPlan) => {
    onCreateDietPlan({
      ...plan,
      name: `${plan.name} (Copy)`,
      assignedMemberIds: []
    });
    showToast(`Duplicated "${plan.name}".`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Workout & Nutrition Plan Builder
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure periodized training routines, scheduled meals, and member macro assignments
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-neutral-200/70 rounded-full shadow-2xs">
            <button
              type="button"
              onClick={() => setSubTab('workouts')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                subTab === 'workouts'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-neutral-500 hover:text-[#171717]'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              Workout Plans ({workoutPlans.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('diets')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                subTab === 'diets'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-neutral-500 hover:text-[#171717]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              Diet Plans ({dietPlans.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (subTab === 'workouts') setIsEditingWorkout(true);
              else setIsEditingDiet(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Create {subTab === 'workouts' ? 'Workout' : 'Diet'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* WORKOUT PLANS VIEW */}
          {subTab === 'workouts' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left list of plans */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Available Training Plans
                </span>

                {workoutPlans.map((plan) => {
                  const isSelected = selectedWorkout?.id === plan.id;
                  const assignedMembers = members.filter((m) => plan.assignedMemberIds.includes(m.id));

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedWorkoutId(plan.id)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#7155E8] bg-white shadow-[0_8px_25px_rgba(113,85,232,0.12)]'
                          : 'border-neutral-200/70 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-[#171717] text-sm min-w-0">{plan.name}</h3>
                        <span className="text-[10px] font-bold text-[#7155E8] bg-[#F0EEFC] px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                          {plan.difficulty}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{plan.description}</p>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] tabular-nums">
                        <span className="font-mono text-neutral-500">
                          {plan.days.length} Training Days
                        </span>
                        <span className="font-bold text-[#10B981]">
                          {assignedMembers.length} Clients
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right 2 cols: Selected Plan Detail */}
              {selectedWorkout && (
                <div className="lg:col-span-2 bg-white border border-neutral-200/70 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6 min-w-0">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-neutral-900">{selectedWorkout.name}</h2>
                        <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                          {selectedWorkout.goal}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">{selectedWorkout.description}</p>
                      <div className="text-xs text-neutral-600 mt-2">
                        <span className="font-semibold text-neutral-800">Trainer Cue:</span>{' '}
                        {selectedWorkout.trainerInstructions}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateWorkout(selectedWorkout)}
                        className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
                        title="Duplicate Plan"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assign to Athlete quick control */}
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-neutral-900 block">Assign this routine to a client:</span>
                      <span className="text-neutral-500 text-[11px]">
                        Instantly syncs to the member's portal dashboard.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        id="assign-member-select"
                        className="w-full sm:w-auto text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-white font-medium focus:outline-none focus:border-[#7155E8]"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const m = members.find((item) => item.id === e.target.value);
                            onAssignWorkoutPlan(e.target.value, selectedWorkout.id);
                            e.target.value = '';
                            showToast(`Workout plan assigned to ${m?.fullName || 'client'}!`);
                          }
                        }}
                      >
                        <option value="">Select Client...</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.assignedWorkoutPlanId === selectedWorkout.id ? 'Already Assigned' : 'Assign'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Training Days Breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Program Schedule & Exercises
                    </h3>

                    {selectedWorkout.days.map((day) => (
                      <div key={day.id} className="border border-neutral-200/80 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-50/80 px-4 py-3 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-neutral-900">{day.dayName}</span>
                            <span className="text-neutral-500 ml-2 font-mono text-[11px]">
                              ({day.focusArea})
                            </span>
                          </div>
                          <span className="text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                            {day.isRestDay ? 'Rest & Recovery' : `${day.exercises.length} Exercises`}
                          </span>
                        </div>

                        {!day.isRestDay ? (
                          <div className="divide-y divide-neutral-100">
                            {day.exercises.map((ex, idx) => (
                              <div
                                key={ex.id}
                                className="p-3.5 hover:bg-neutral-50/40 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-neutral-400 text-[11px]">{idx + 1}.</span>
                                    <span className="font-bold text-neutral-900">{ex.name}</span>
                                    <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {ex.muscleGroup}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-500 mt-1 pl-4">
                                    {ex.instructions}
                                  </p>
                                  {ex.alternativeExercise && (
                                    <p className="text-[10px] text-neutral-400 pl-4 mt-0.5">
                                      Alt: {ex.alternativeExercise}
                                    </p>
                                  )}
                                </div>

                                <div className="sm:text-right font-mono tabular-nums shrink-0 pl-4 sm:pl-0">
                                  <span className="font-bold text-neutral-900 text-xs">
                                    {ex.sets} sets × {ex.reps}
                                  </span>
                                  {ex.targetWeightKg && (
                                    <span className="text-emerald-700 font-bold ml-1.5">
                                      @{ex.targetWeightKg}kg
                                    </span>
                                  )}
                                  <div className="text-[10px] text-neutral-400">
                                    Rest: {ex.restSeconds}s
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            Active Recovery Day: Focus on hydration, light walking, and mobility.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DIET PLANS VIEW */}
          {subTab === 'diets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left list of diets */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Available Nutrition Blueprints
                </span>

                {dietPlans.map((dp) => {
                  const isSelected = selectedDiet?.id === dp.id;
                  const assignedCount = members.filter((m) => dp.assignedMemberIds.includes(m.id)).length;

                  return (
                    <div
                      key={dp.id}
                      onClick={() => setSelectedDietId(dp.id)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#7155E8] bg-white shadow-[0_8px_25px_rgba(113,85,232,0.12)]'
                          : 'border-neutral-200/70 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-neutral-900 text-sm min-w-0">{dp.name}</h3>
                        <span className="text-[11px] font-mono tabular-nums font-bold text-emerald-700 shrink-0 whitespace-nowrap">
                          {dp.dailyCalorieTarget} kcal
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{dp.description}</p>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-600">
                        <span>{dp.proteinTargetG}g P · {dp.carbsTargetG}g C</span>
                        <span className="font-sans font-bold text-[#10B981]">
                          {assignedCount} Assigned
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right 2 cols: Selected Diet Plan Detail */}
              {selectedDiet && (
                <div className="lg:col-span-2 bg-white border border-neutral-200/70 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5 min-w-0">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-neutral-900">{selectedDiet.name}</h2>
                      <p className="text-xs text-neutral-500 mt-1">{selectedDiet.description}</p>
                      <div className="text-xs text-neutral-600 mt-2">
                        <span className="font-semibold text-neutral-800">Coach Guideline:</span>{' '}
                        {selectedDiet.trainerInstructions}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDuplicateDiet(selectedDiet)}
                      className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
                      title="Duplicate Blueprint"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Macro Bar Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 font-mono tabular-nums text-xs">
                    <div className="p-3 bg-[#F5F5F5] rounded-2xl text-center">
                      <span className="text-[10px] text-neutral-400 font-sans uppercase block">Calories</span>
                      <div className="text-base font-bold text-neutral-900 mt-0.5">{selectedDiet.dailyCalorieTarget} kcal</div>
                    </div>
                    <div className="p-3 bg-[#F5F5F5] rounded-2xl text-center">
                      <span className="text-[10px] text-neutral-400 font-sans uppercase block">Protein</span>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">{selectedDiet.proteinTargetG}g</div>
                    </div>
                    <div className="p-3 bg-[#F5F5F5] rounded-2xl text-center">
                      <span className="text-[10px] text-neutral-400 font-sans uppercase block">Carbs</span>
                      <div className="text-base font-bold text-sky-700 mt-0.5">{selectedDiet.carbsTargetG}g</div>
                    </div>
                    <div className="p-3 bg-[#F5F5F5] rounded-2xl text-center">
                      <span className="text-[10px] text-neutral-400 font-sans uppercase block">Fats</span>
                      <div className="text-base font-bold text-amber-700 mt-0.5">{selectedDiet.fatTargetG}g</div>
                    </div>
                    <div className="p-3 bg-[#F5F5F5] rounded-2xl text-center col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-neutral-400 font-sans uppercase block">Daily Water</span>
                      <div className="text-base font-bold text-blue-700 mt-0.5">{selectedDiet.waterIntakeLiters} L</div>
                    </div>
                  </div>

                  {/* Assign to Athlete quick control */}
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-neutral-900 block">Assign diet plan to a client:</span>
                      <span className="text-neutral-500 text-[11px]">
                        Updates the member's daily meal schedule and macro targets.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        className="w-full sm:w-auto text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-white font-medium focus:outline-none focus:border-[#7155E8]"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const m = members.find((item) => item.id === e.target.value);
                            onAssignDietPlan(e.target.value, selectedDiet.id);
                            e.target.value = '';
                            showToast(`Diet plan assigned to ${m?.fullName || 'client'}!`);
                          }
                        }}
                      >
                        <option value="">Select Client...</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Scheduled Meals */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Configured Daily Meals & Portions
                    </h3>

                    {selectedDiet.meals.map((meal) => (
                      <div key={meal.id} className="border border-neutral-200/80 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-50/80 px-4 py-3 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-neutral-900">{meal.name}</span>
                            <span className="text-neutral-500 ml-2 font-mono text-[11px]">
                              Scheduled: {meal.scheduledTime}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                            {meal.foodItems.reduce((acc, f) => acc + f.calories, 0)} kcal
                          </span>
                        </div>

                        <div className="divide-y divide-neutral-100 text-xs">
                          {meal.foodItems.map((f) => (
                            <div
                              key={f.id}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-neutral-50/50"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-neutral-800">{f.name}</span>
                                <span className="text-neutral-500 text-[11px] ml-2 font-mono">
                                  ({f.quantity} {f.unit})
                                </span>
                              </div>
                              <div className="font-mono tabular-nums text-[11px] text-neutral-600 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 shrink-0">
                                <span className="font-bold text-neutral-900">{f.calories} kcal</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 font-semibold">{f.proteinG}g P</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-sky-700">{f.carbsG}g C</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-700">{f.fatG}g F</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {meal.preparationNotes && (
                          <div className="bg-neutral-50/40 p-3 text-[11px] text-neutral-500 border-t border-neutral-100 italic">
                            Prep Note: {meal.preparationNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create Workout Plan Modal */}
      <Modal
        isOpen={isEditingWorkout}
        onClose={() => setIsEditingWorkout(false)}
        title="Create New Workout Routine"
        description="Build a reusable periodized workout routine for your members."
        maxWidth="lg"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Routine Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. 5-Day Powerbuilding & Lat Focus"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Difficulty</label>
              <select
                value={planDifficulty}
                onChange={(e: any) => setPlanDifficulty(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Target Goal</label>
              <input
                type="text"
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
              />
            </div>
          </div>
          <div>
            <label className="block text-neutral-600 mb-1">Trainer Instructions</label>
            <textarea
              rows={3}
              value={planInstructions}
              onChange={(e) => setPlanInstructions(e.target.value)}
              placeholder="Warm-up sets, tempo, rest interval directions..."
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsEditingWorkout(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!planName.trim()) {
                  showToast('Please enter a routine name.', 'error');
                  return;
                }
                onCreateWorkoutPlan({
                  name: planName.trim(),
                  description: 'Custom periodized routine created by Coach Oliul Azim.',
                  assignedMemberIds: [],
                  goal: planGoal,
                  difficulty: planDifficulty,
                  trainerInstructions: planInstructions || 'Execute with strict technique.',
                  days: [
                    {
                      id: 'd-new-1',
                      dayName: 'Day 1: Upper Body Push & Pull',
                      focusArea: 'Chest & Back',
                      isRestDay: false,
                      exercises: [
                        {
                          id: 'ex-n1',
                          name: 'Flat Dumbbell Press',
                          muscleGroup: 'Chest',
                          sets: 4,
                          reps: '10 reps',
                          targetWeightKg: 24,
                          restSeconds: 90,
                          instructions: 'Keep elbows tucked at 45 degrees.'
                        },
                        {
                          id: 'ex-n2',
                          name: 'Seated Cable Row',
                          muscleGroup: 'Back',
                          sets: 4,
                          reps: '12 reps',
                          targetWeightKg: 50,
                          restSeconds: 75,
                          instructions: 'Squeeze lats at contraction.'
                        }
                      ]
                    },
                    {
                      id: 'd-new-2',
                      dayName: 'Day 2: Legs & Core Power',
                      focusArea: 'Quads & Hamstrings',
                      isRestDay: false,
                      exercises: [
                        {
                          id: 'ex-n3',
                          name: 'Barbell Squat',
                          muscleGroup: 'Quads',
                          sets: 4,
                          reps: '8 reps',
                          targetWeightKg: 80,
                          restSeconds: 120,
                          instructions: 'Parallel depth.'
                        }
                      ]
                    }
                  ]
                });
                setIsEditingWorkout(false);
                setPlanName('');
                showToast('New workout routine created!');
              }}
              className="px-5 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl font-bold shadow-xs transition-all active:scale-95"
            >
              Save Routine
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Diet Plan Modal */}
      <Modal
        isOpen={isEditingDiet}
        onClose={() => setIsEditingDiet(false)}
        title="Create Nutrition Blueprint"
        description="Configure daily calorie targets, macro splits, and scheduled meals."
        maxWidth="lg"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Plan Title</label>
            <input
              type="text"
              value={dietName}
              onChange={(e) => setDietName(e.target.value)}
              placeholder="e.g. 2,200 kcal Clean Lean Shred"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-neutral-600 mb-1">Calories</label>
              <input
                type="number"
                value={dietCalories}
                onChange={(e) => setDietCalories(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Protein (g)</label>
              <input
                type="number"
                value={dietProtein}
                onChange={(e) => setDietProtein(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={dietCarbs}
                onChange={(e) => setDietCarbs(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Fat (g)</label>
              <input
                type="number"
                value={dietFat}
                onChange={(e) => setDietFat(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-neutral-600 mb-1">Coaching Instructions</label>
            <textarea
              rows={2}
              value={dietInstructions}
              onChange={(e) => setDietInstructions(e.target.value)}
              placeholder="Meal timing, water intake, supplements..."
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsEditingDiet(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!dietName.trim()) {
                  showToast('Please enter a nutrition plan title.', 'error');
                  return;
                }
                onCreateDietPlan({
                  name: dietName.trim(),
                  description: 'Custom macro blueprint designed for Dhaka climate and local foods.',
                  assignedMemberIds: [],
                  dailyCalorieTarget: parseInt(dietCalories) || 2200,
                  proteinTargetG: parseInt(dietProtein) || 160,
                  carbsTargetG: parseInt(dietCarbs) || 220,
                  fatTargetG: parseInt(dietFat) || 60,
                  waterIntakeLiters: parseFloat(dietWater) || 3.0,
                  dietaryPreferences: 'Halal, wholesome local ingredients',
                  restrictions: 'Avoid refined palm oil and sugary sodas',
                  trainerInstructions: dietInstructions || 'Stay consistent with scheduled meal times.',
                  meals: [
                    {
                      id: 'm-dn1',
                      name: 'Breakfast',
                      scheduledTime: '08:30',
                      foodItems: [
                        { id: 'fn-1', name: 'Boiled Eggs', quantity: 3, unit: 'pcs', calories: 215, proteinG: 18, carbsG: 1, fatG: 15 },
                        { id: 'fn-2', name: 'Oats with hot water', quantity: 60, unit: 'g', calories: 230, proteinG: 8, carbsG: 40, fatG: 4 }
                      ]
                    },
                    {
                      id: 'm-dn2',
                      name: 'Lunch',
                      scheduledTime: '13:30',
                      foodItems: [
                        { id: 'fn-3', name: 'Chicken Breast Curry (light)', quantity: 180, unit: 'g', calories: 290, proteinG: 50, carbsG: 4, fatG: 6 },
                        { id: 'fn-4', name: 'Steamed Rice', quantity: 180, unit: 'g', calories: 210, proteinG: 4, carbsG: 44, fatG: 1 }
                      ]
                    }
                  ]
                });
                setIsEditingDiet(false);
                setDietName('');
                showToast('New nutrition blueprint created!');
              }}
              className="px-5 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl font-bold shadow-xs transition-all active:scale-95"
            >
              Save Blueprint
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
