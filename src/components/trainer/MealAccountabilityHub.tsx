import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MealLog, Member } from '../../types';
import { Avatar, useBodyScrollLock } from '../common/CommonUI';

interface MealAccountabilityHubProps {
  mealLogs: MealLog[];
  members: Member[];
  onReviewMealLog: (
    mealId: string,
    status: 'Approved' | 'Correction Requested' | 'Flagged',
    feedback?: string
  ) => void;
  onSelectMember: (memberId: string) => void;
}

export const MealAccountabilityHub: React.FC<MealAccountabilityHubProps> = ({
  mealLogs,
  onReviewMealLog,
  onSelectMember
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAdherence, setFilterAdherence] = useState<string>('all');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [feedbackTextMap, setFeedbackTextMap] = useState<Record<string, string>>({});

  useBodyScrollLock(Boolean(selectedPhotoModal));

  useEffect(() => {
    if (!selectedPhotoModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhotoModal(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPhotoModal]);

  const filteredLogs = mealLogs.filter((log) => {
    const matchesStatus =
      filterStatus === 'all' || log.trainerReviewStatus === filterStatus;
    const matchesAdherence =
      filterAdherence === 'all' || log.adherence === filterAdherence;
    return matchesStatus && matchesAdherence;
  });

  // Calculate compliance statistics across current members
  const totalSubmissions = mealLogs.length;
  const compliantCount = mealLogs.filter((l) => l.adherence === 'Followed Plan').length;
  const partialCount = mealLogs.filter((l) => l.adherence === 'Partially Followed').length;
  const deviatedCount = mealLogs.filter((l) => l.adherence === 'Deviated from Plan').length;
  const pendingCount = mealLogs.filter((l) => l.trainerReviewStatus === 'Pending').length;

  const handleFeedbackChange = (logId: string, text: string) => {
    setFeedbackTextMap((prev) => ({ ...prev, [logId]: text }));
  };

  const handleApprove = (logId: string) => {
    const feedback = feedbackTextMap[logId] || 'Meal verified. Macros aligned with target plan.';
    onReviewMealLog(logId, 'Approved', feedback);
  };

  const handleRequestCorrection = (logId: string) => {
    const feedback = feedbackTextMap[logId] || 'Please weigh protein portion and reduce extra cooking oils.';
    onReviewMealLog(logId, 'Correction Requested', feedback);
  };

  const handleFlag = (logId: string) => {
    const feedback = feedbackTextMap[logId] || 'Noticeable deviation from nutrition prescription. Discussion needed.';
    onReviewMealLog(logId, 'Flagged', feedback);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Meal Accountability & Photo Evidence Hub
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Verify actual food consumption photographs against prescribed nutrition blueprints
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-bold font-mono tabular-nums text-[#7155E8] bg-[#F0EEFC] px-4 py-2 rounded-2xl border border-[#7155E8]/20 whitespace-nowrap">
            {pendingCount} Awaiting Verification
          </span>
        </div>
      </div>

      {/* Compliance Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Followed Plan (100%)
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#10B981] mt-1">
            {compliantCount} <span className="text-xs font-normal text-neutral-400">/ {totalSubmissions}</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">
            {totalSubmissions > 0 ? Math.round((compliantCount / totalSubmissions) * 100) : 0}% exact adherence
          </span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Partially Followed
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#F59E0B] mt-1">
            {partialCount}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Minor portion adjustments</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Deviated from Plan
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#EF4444] mt-1">
            {deviatedCount}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Unprescribed foods</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Pending Review
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#7155E8] mt-1">
            {pendingCount}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Requires Coach Action</span>
        </div>
      </div>

      {/* Filter Toolbar (Pill tabs) */}
      <div className="bg-white rounded-3xl p-4 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
          <span className="font-bold text-[#171717] shrink-0">Filter Status:</span>
          <div className="flex items-center gap-1 p-1 bg-[#F5F5F5] rounded-full shrink-0">
            {['all', 'Pending', 'Approved', 'Correction Requested', 'Flagged'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-neutral-500 hover:text-[#171717]'
                }`}
              >
                {status === 'all' ? 'All Submissions' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-[#171717] whitespace-nowrap">Adherence:</span>
          <select
            value={filterAdherence}
            onChange={(e) => setFilterAdherence(e.target.value)}
            className="border border-neutral-200 rounded-2xl px-3 py-1.5 bg-[#F5F5F5] font-semibold text-[#171717] focus:outline-none focus:border-[#7155E8]"
          >
            <option value="all">All Adherence Levels</option>
            <option value="Followed Plan">Followed Plan (100%)</option>
            <option value="Partially Followed">Partially Followed</option>
            <option value="Deviated from Plan">Deviated from Plan</option>
          </select>
        </div>
      </div>

      {/* Evidence Cards */}
      <div className="space-y-5">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No meal logs match the selected filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left: Member Identity & Meal Comparison */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={log.memberAvatar} name={log.memberName} size="md" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectMember(log.memberId)}
                          className="font-extrabold text-[#171717] hover:text-[#7155E8] transition-colors text-base text-left block truncate"
                        >
                          {log.memberName}
                        </button>
                        <span className="text-xs text-neutral-400 font-mono tabular-nums">
                          {log.loggedAt}
                        </span>
                      </div>
                    </div>

                    {/* Scheduled Meal & Adherence Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F5F5F5] text-[#171717] whitespace-nowrap">
                        {log.scheduledMealName}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          log.adherence === 'Followed Plan'
                            ? 'bg-emerald-50 text-[#10B981]'
                            : log.adherence === 'Partially Followed'
                            ? 'bg-amber-50 text-[#F59E0B]'
                            : 'bg-rose-50 text-[#EF4444]'
                        }`}
                      >
                        {log.adherence}
                      </span>
                    </div>
                  </div>

                  {/* Prescribed vs Reported Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Assigned Nutrition Blueprint
                      </span>
                      <p className="text-[#171717] mt-1 font-medium leading-relaxed">
                        {log.prescribedFoodsSummary}
                      </p>
                    </div>

                    <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Foods Actually Consumed (Client Report)
                      </span>
                      <div className="mt-1 space-y-1.5">
                        {log.foodsConsumed.map((f, i) => (
                          <div
                            key={i}
                            className={`flex flex-wrap items-center justify-between gap-2 ${
                              !f.wasInPlan ? 'text-[#EF4444] font-bold' : 'text-[#171717]'
                            }`}
                          >
                            <span className="min-w-0">{f.name} ({f.quantity})</span>
                            <span className="font-mono tabular-nums text-[11px] text-neutral-500 whitespace-nowrap">
                              {f.calories} kcal {!f.wasInPlan && '(Off-Plan)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reported Macros Strip (Flex-wrapped so zero clipping on mobile) */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-3 px-4 py-2.5 bg-[#F0EEFC] rounded-2xl text-xs font-mono tabular-nums text-[#7155E8] font-bold">
                    <span>Total: {log.totalCalories} kcal</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.totalProteinG}g Protein</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.totalCarbsG}g Carbs</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.totalFatG}g Fat</span>
                  </div>

                  {log.memberNotes && (
                    <p className="text-xs text-neutral-500 italic mt-3 bg-neutral-50 p-3 rounded-2xl">
                      Client Note: "{log.memberNotes}"
                    </p>
                  )}

                  {/* Trainer Feedback Input */}
                  <div className="mt-4 pt-3 border-t border-neutral-100">
                    <label className="block text-xs font-bold text-[#171717] mb-1.5">
                      Coach Feedback & Instructions:
                    </label>
                    <input
                      type="text"
                      placeholder="Add guidance (e.g. good portion control, watch sodium)..."
                      value={feedbackTextMap[log.id] !== undefined ? feedbackTextMap[log.id] : log.trainerFeedback || ''}
                      onChange={(e) => handleFeedbackChange(log.id, e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#F5F5F5] focus:bg-white border border-neutral-200/60 focus:border-[#7155E8] rounded-2xl focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Right: Meal Photograph Card */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col justify-between">
                  <div className="relative rounded-2xl overflow-hidden bg-neutral-100 group aspect-4/3">
                    {log.photoUrl ? (
                      <>
                        <img
                          src={log.photoUrl}
                          alt="Meal submission"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoModal(log.photoUrl!)}
                          className="absolute inset-0 bg-black/25 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-end sm:items-center justify-end sm:justify-center p-3 text-white transition-opacity font-bold text-xs gap-1.5"
                        >
                          <span className="px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-xs flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> Expand Photo
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        No photo provided
                      </div>
                    )}
                  </div>

                  {/* Review Actions */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Current Status:</span>
                      <span
                        className={`font-bold ${
                          log.trainerReviewStatus === 'Approved'
                            ? 'text-[#10B981]'
                            : log.trainerReviewStatus === 'Correction Requested'
                            ? 'text-[#F59E0B]'
                            : log.trainerReviewStatus === 'Flagged'
                            ? 'text-[#EF4444]'
                            : 'text-neutral-500'
                        }`}
                      >
                        {log.trainerReviewStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(log.id)}
                        className="py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestCorrection(log.id)}
                        className="py-2 bg-[#F59E0B] hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
                      >
                        Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFlag(log.id)}
                        className="py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
                      >
                        Flag
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox Modal (Elevated z-[100] with smooth animation & backdrop close) */}
      <AnimatePresence>
        {selectedPhotoModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setSelectedPhotoModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden p-3 shadow-2xl z-10"
            >
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="absolute top-5 right-5 p-2 bg-black/65 text-white rounded-full hover:bg-black/90 transition-colors z-10"
                aria-label="Close photo lightbox"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedPhotoModal}
                alt="Meal Evidence Full"
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
