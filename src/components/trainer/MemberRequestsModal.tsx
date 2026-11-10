import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  UserX,
  Shield,
  AlertTriangle,
  Heart,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MemberRegistrationRequest, Member } from '../../types';
import { Avatar, showToast, useBodyScrollLock } from '../common/CommonUI';

interface MemberRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: MemberRegistrationRequest[];
  onApprove: (requestId: string) => Promise<Member | null>;
  onReject: (requestId: string, reason?: string) => void;
}

export const MemberRequestsModal: React.FC<MemberRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onApprove,
  onReject
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Inline decline state (replaces window.prompt)
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState(
    'Gym capacity reached or requires preliminary medical clearance.'
  );

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const filtered = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'Pending';
    if (filter === 'approved') return r.status === 'Approved';
    return true;
  });

  const selectedRequest = filtered.find((r) => r.id === selectedReqId) || filtered[0] || null;

  const handleApprove = async (id: string) => {
    let newMember: Member | null = null;
    try {
      newMember = await onApprove(id);
    } catch (err) {
      showToast((err as Error).message, 'error');
      return;
    }
    setDecliningId(null);
    if (newMember) {
      const msg = `Member profile created for ${newMember.fullName}!`;
      setActionSuccessMessage(msg);
      showToast(msg);
      setTimeout(() => setActionSuccessMessage(null), 3200);
    }
  };

  const handleConfirmReject = (id: string) => {
    onReject(id, declineReason.trim() || 'Application declined by coach.');
    setDecliningId(null);
    setActionSuccessMessage('Application declined.');
    showToast('Registration application declined.', 'info');
    setTimeout(() => setActionSuccessMessage(null), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white rounded-3xl w-full max-w-4xl shadow-[0_24px_64px_rgba(0,0,0,0.16)] border border-neutral-100 overflow-hidden flex flex-col max-h-[88vh] my-auto"
          >
            {/* Top Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#7155E8] uppercase tracking-wider bg-[#F0EEFC] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Member Registration Approvals
                  </span>
                  <span className="text-xs text-neutral-400">
                    Coach Oliul Azim Review Queue
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#171717] mt-1">
                  Prospective Member Applications
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action feedback alert */}
            {actionSuccessMessage && (
              <div className="mx-5 sm:mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Tab Filters */}
            <div className="px-5 sm:px-6 pt-3 pb-3 flex items-center gap-2 border-b border-neutral-100 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'pending'
                    ? 'bg-[#7155E8] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Pending Review ({requests.filter((r) => r.status === 'Pending').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'approved'
                    ? 'bg-[#7155E8] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Approved ({requests.filter((r) => r.status === 'Approved').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-[#7155E8] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Requests ({requests.length})
              </button>
            </div>

            {/* Content Body: Split View (Single scroll on mobile, independent dual scroll on desktop) */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
              {/* Left Column: Applicant List */}
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-neutral-100 md:overflow-y-auto p-4 space-y-2">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400 space-y-1">
                    <Shield className="w-8 h-8 mx-auto text-neutral-300" />
                    <p className="font-semibold text-neutral-600">No applications in this view</p>
                    <p>New applicants will appear here once they register with their body details.</p>
                  </div>
                ) : (
                  filtered.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedReqId(req.id);
                        setDecliningId(null);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedRequest?.id === req.id
                          ? 'border-[#7155E8] bg-[#F0EEFC]/50 shadow-xs'
                          : 'border-neutral-200/70 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={req.avatarUrl}
                          name={req.fullName}
                          size="md"
                          className="rounded-2xl"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-sm text-[#171717] truncate">
                              {req.fullName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                                req.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : req.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-500 block truncate">
                            {req.fitnessGoal} · {req.currentWeightKg}kg
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                            Submitted: {req.submittedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Applicant Detailed Physical Dossier */}
              <div className="md:col-span-7 md:overflow-y-auto p-5 sm:p-6 space-y-5">
                {selectedRequest ? (
                  <div className="space-y-5">
                    {/* Applicant Hero */}
                    <div className="flex items-start gap-4">
                      <Avatar
                        src={selectedRequest.avatarUrl}
                        name={selectedRequest.fullName}
                        size="lg"
                        className="rounded-3xl border border-neutral-100 shadow-xs"
                      />
                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold text-[#171717]">
                          {selectedRequest.fullName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 mt-0.5">
                          <span className="font-mono">{selectedRequest.phone}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{selectedRequest.email}</span>
                          <span aria-hidden="true">·</span>
                          <span>{selectedRequest.gender}, {selectedRequest.age} yrs</span>
                        </div>
                        <span className="inline-block mt-2 text-[11px] font-bold text-[#7155E8] bg-[#F0EEFC] px-2.5 py-0.5 rounded-md">
                          Requested Duration: {selectedRequest.membershipDuration}
                        </span>
                      </div>
                    </div>

                    {/* Body Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums text-center">
                      <div className="p-3 bg-[#F5F5F5] rounded-2xl">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">
                          Height
                        </span>
                        <span className="text-base font-extrabold text-[#171717]">
                          {selectedRequest.heightCm} cm
                        </span>
                      </div>
                      <div className="p-3 bg-[#F5F5F5] rounded-2xl">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">
                          Weight
                        </span>
                        <span className="text-base font-extrabold text-[#7155E8]">
                          {selectedRequest.currentWeightKg} kg
                        </span>
                      </div>
                      <div className="p-3 bg-[#F5F5F5] rounded-2xl">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">
                          Target
                        </span>
                        <span className="text-base font-extrabold text-[#10B981]">
                          {selectedRequest.targetWeightKg || selectedRequest.currentWeightKg - 5} kg
                        </span>
                      </div>
                    </div>

                    {/* Body Condition & Physical Description Submitted by Member */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Member's Submitted Body Condition & Assessment</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed font-sans italic bg-white/70 p-3 rounded-xl border border-amber-100">
                        "{selectedRequest.bodyConditionNotes}"
                      </p>
                    </div>

                    {/* Health & Medical Disclosures */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-[#F5F5F5] space-y-1">
                        <span className="font-bold text-[#171717] flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Medical Conditions
                        </span>
                        <p className="text-neutral-500">
                          {selectedRequest.medicalConditions || 'No chronic conditions reported.'}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#F5F5F5] space-y-1">
                        <span className="font-bold text-[#171717] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Injuries / Restrictions
                        </span>
                        <p className="text-neutral-500">
                          {selectedRequest.injuriesOrRestrictions || 'No structural injuries reported.'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {selectedRequest.status === 'Pending' ? (
                      <div className="pt-3 border-t border-neutral-100 space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleApprove(selectedRequest.id)}
                            className="flex-1 py-3 px-4 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <UserCheck className="w-4 h-4 shrink-0" />
                            Approve & Create Member Profile
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDecliningId(decliningId === selectedRequest.id ? null : selectedRequest.id)
                            }
                            className="py-3 px-4 rounded-2xl border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <UserX className="w-4 h-4 shrink-0" />
                            Reject
                          </button>
                        </div>

                        {decliningId === selectedRequest.id && (
                          <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2.5 text-xs">
                            <label className="block font-bold text-rose-900">
                              Reason for declining application:
                            </label>
                            <input
                              type="text"
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              className="w-full p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDecliningId(null)}
                                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmReject(selectedRequest.id)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
                              >
                                Confirm Decline
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-[#F5F5F5] text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Status: <strong className="text-[#171717]">{selectedRequest.status}</strong>
                        </span>
                        {selectedRequest.reviewedAt && (
                          <span className="font-mono text-[11px]">Reviewed: {selectedRequest.reviewedAt}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-neutral-400 text-center">
                    Select an applicant from the list to view their body condition details.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
