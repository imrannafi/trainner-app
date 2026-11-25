import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  UserX,
  Shield,
  AlertTriangle,
  Heart,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Dumbbell,
  Wallet,
  CalendarRange,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MemberRegistrationRequest, Member } from '../../types';
import { Avatar, showToast } from '../common/CommonUI';

interface RegistrationRequestsSectionProps {
  requests: MemberRegistrationRequest[];
  onApprove: (requestId: string) => Promise<Member | null>;
  onReject: (requestId: string, reason?: string) => Promise<void>;
  onOpenMember?: (memberId: string) => void;
}

type Filter = 'Pending' | 'Approved' | 'Rejected' | 'all';

const STATUS_STYLE: Record<MemberRegistrationRequest['status'], string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700'
};

const paymentLabel = (r: MemberRegistrationRequest) =>
  r.amountPaid > 0 ? `৳${r.amountPaid.toLocaleString('en-US')}${r.paymentMethod ? ` via ${r.paymentMethod}` : ''}` : 'Not paid yet';

const durationLabel = (d: string) => d.replace(/^(\d+) (month|months)$/, (_, n, u) => `${n} ${u[0].toUpperCase()}${u.slice(1)}`);

/** Super Admin only: every registration request, reviewed in place and updated live. */
export const RegistrationRequestsSection: React.FC<RegistrationRequestsSectionProps> = ({
  requests,
  onApprove,
  onReject,
  onOpenMember
}) => {
  const [filter, setFilter] = useState<Filter>('Pending');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  // On phones the list and the details are separate screens.
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('Gym capacity reached or requires preliminary medical clearance.');

  const counts = {
    Pending: requests.filter((r) => r.status === 'Pending').length,
    Approved: requests.filter((r) => r.status === 'Approved').length,
    Rejected: requests.filter((r) => r.status === 'Rejected').length,
    all: requests.length
  };
  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const selected = filtered.find((r) => r.id === selectedReqId) || filtered[0] || null;

  // A request that was just approved/rejected leaves the Pending view; keep the selection valid.
  useEffect(() => {
    if (selectedReqId && !filtered.some((r) => r.id === selectedReqId)) setSelectedReqId(null);
  }, [filtered, selectedReqId]);

  const handleApprove = async (req: MemberRegistrationRequest) => {
    setBusyId(req.id);
    try {
      const member = await onApprove(req.id);
      setDecliningId(null);
      showToast(`${member?.fullName ?? req.fullName} approved. Member profile created.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (req: MemberRegistrationRequest) => {
    setBusyId(req.id);
    try {
      await onReject(req.id, declineReason.trim() || 'Application declined by coach.');
      setDecliningId(null);
      showToast(`${req.fullName}'s registration was rejected.`, 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filterButton = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => {
        setFilter(value);
        setSelectedReqId(null);
        setShowDetailOnMobile(false);
      }}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        filter === value ? 'bg-[#D4AF37] text-white shadow-xs' : 'bg-white/80 text-neutral-600 hover:bg-white border border-neutral-200/70'
      }`}
    >
      {label} ({counts[value]})
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider bg-[#221C0D] px-2.5 py-0.5 rounded-full">
            Super Admin
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] mt-1.5 flex items-center gap-2">
            Registration Requests
            {counts.Pending > 0 && (
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-amber-400 text-black text-xs font-extrabold flex items-center justify-center tabular-nums">
                {counts.Pending}
              </span>
            )}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            New members appear here the moment they submit. Requests stay until you approve or reject them.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5" data-no-swipe>
        {filterButton('Pending', 'Pending')}
        {filterButton('Approved', 'Approved')}
        {filterButton('Rejected', 'Rejected')}
        {filterButton('all', 'All')}
      </div>

      <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 md:min-h-[520px]">
        {/* List */}
        <div
          className={`md:col-span-5 md:border-r border-neutral-100 p-3 sm:p-4 space-y-2 md:max-h-[75vh] md:overflow-y-auto ${
            showDetailOnMobile ? 'hidden md:block' : ''
          }`}
        >
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-400 space-y-1">
              <Shield className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="font-semibold text-neutral-600">
                {filter === 'Pending' ? 'No pending requests' : 'Nothing in this view'}
              </p>
              <p>New registrations appear here automatically.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((req) => (
                <motion.button
                  key={req.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  onClick={() => {
                    setSelectedReqId(req.id);
                    setDecliningId(null);
                    setShowDetailOnMobile(true);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-colors ${
                    selected?.id === req.id
                      ? 'border-neutral-200/70 bg-white md:border-[#D4AF37] md:bg-[#221C0D]/50'
                      : 'border-neutral-200/70 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={req.avatarUrl} name={req.fullName} size="md" className="rounded-2xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-sm text-[#F5F5F5] truncate">{req.fullName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[req.status]}`}>
                          {req.status}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 block truncate">
                        {durationLabel(req.membershipDuration)} · {paymentLabel(req)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono block mt-0.5 truncate">
                        {req.trainerName ? `${req.trainerName} · ` : ''}
                        {req.submittedAt}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Details */}
        <div
          className={`md:col-span-7 p-4 sm:p-6 md:max-h-[75vh] md:overflow-y-auto ${
            showDetailOnMobile ? '' : 'hidden md:block'
          }`}
        >
          {selected ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setShowDetailOnMobile(false)}
                className="md:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]"
              >
                <ArrowLeft className="w-4 h-4" /> All requests
              </button>

              <div className="flex items-start gap-4">
                <a href={selected.avatarUrl} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Open photo">
                  <Avatar src={selected.avatarUrl} name={selected.fullName} size="lg" className="rounded-3xl border border-neutral-100 shadow-xs" />
                </a>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#F5F5F5]">{selected.fullName}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status]}`}>
                      {selected.status}
                    </span>
                  </div>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono hover:text-[#D4AF37]">
                    <Phone className="w-3.5 h-3.5 shrink-0" /> {selected.phone}
                  </a>
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-[#D4AF37] min-w-0">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{selected.email}</span>
                  </a>
                  <span className="block text-[11px] text-neutral-400">
                    {selected.gender}
                    {selected.age ? `, ${selected.age} yrs` : ''} · Submitted {selected.submittedAt}
                  </span>
                </div>
              </div>

              {/* Trainer, membership, payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#221C0D]/60 border border-[#D4AF37]/15">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#D4AF37]">
                    <Dumbbell className="w-3.5 h-3.5" /> Trainer
                  </span>
                  <span className="block font-extrabold text-[#F5F5F5] mt-1">{selected.trainerName ?? 'Not chosen'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#221C0D]/60 border border-[#D4AF37]/15">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#D4AF37]">
                    <CalendarRange className="w-3.5 h-3.5" /> Membership
                  </span>
                  <span className="block font-extrabold text-[#F5F5F5] mt-1">{durationLabel(selected.membershipDuration)}</span>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    selected.amountPaid > 0 ? 'bg-emerald-50 border-emerald-200/70' : 'bg-amber-50 border-amber-200/70'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold ${
                      selected.amountPaid > 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Payment
                  </span>
                  <span className="block font-extrabold text-[#F5F5F5] mt-1 tabular-nums">
                    {selected.amountPaid > 0 ? `৳${selected.amountPaid.toLocaleString('en-US')}` : '৳0'}
                  </span>
                  <span className="block text-[11px] text-neutral-500">
                    {selected.amountPaid > 0 ? selected.paymentMethod ?? 'Method not given' : 'Not paid yet'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums text-center">
                {[
                  ['Height', selected.heightCm ? `${selected.heightCm} cm` : '–', 'text-[#F5F5F5]'],
                  ['Weight', selected.currentWeightKg ? `${selected.currentWeightKg} kg` : '–', 'text-[#D4AF37]'],
                  ['Target', selected.targetWeightKg ? `${selected.targetWeightKg} kg` : '–', 'text-[#10B981]']
                ].map(([label, value, color]) => (
                  <div key={label} className="p-3 bg-[#0E0E0E] rounded-2xl">
                    <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">{label}</span>
                    <span className={`text-base font-extrabold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-neutral-600">
                <span className="font-bold text-[#F5F5F5]">Goal:</span> {selected.fitnessGoal || '–'} ·{' '}
                <span className="font-bold text-[#F5F5F5]">Experience:</span> {selected.fitnessLevel}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Body condition</span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-amber-100 whitespace-pre-wrap">
                  {selected.bodyConditionNotes}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#0E0E0E] space-y-1">
                  <span className="font-bold text-[#F5F5F5] flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Medical Conditions
                  </span>
                  <p className="text-neutral-500">{selected.medicalConditions || 'None reported.'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0E0E0E] space-y-1">
                  <span className="font-bold text-[#F5F5F5] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Injuries / Restrictions
                  </span>
                  <p className="text-neutral-500">{selected.injuriesOrRestrictions || 'None reported.'}</p>
                </div>
              </div>

              {selected.status === 'Pending' ? (
                <div className="pt-3 border-t border-neutral-100 space-y-3">
                  {selected.amountPaid > 0 && (
                    <p className="text-[11px] text-neutral-500">
                      Approving creates the member profile and records {paymentLabel(selected)} as a completed payment.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => handleApprove(selected)}
                      className="flex-1 py-3 px-4 rounded-2xl bg-[#D4AF37] hover:bg-[#B8912B] disabled:opacity-60 text-white text-xs font-bold shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {busyId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 shrink-0" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => setDecliningId(decliningId === selected.id ? null : selected.id)}
                      className="py-3 px-4 rounded-2xl border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 text-neutral-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <UserX className="w-4 h-4 shrink-0" />
                      Reject
                    </button>
                  </div>

                  {decliningId === selected.id && (
                    <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2.5 text-xs">
                      <label htmlFor="decline-reason" className="block font-bold text-rose-900">
                        Reason (shown to the applicant)
                      </label>
                      <input
                        id="decline-reason"
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
                          disabled={busyId === selected.id}
                          onClick={() => handleReject(selected)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-bold shadow-xs"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#0E0E0E] text-xs text-neutral-500 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {selected.status === 'Approved' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      Status: <strong className="text-[#F5F5F5]">{selected.status}</strong>
                    </span>
                    {selected.reviewedAt && <span className="font-mono text-[11px]">Reviewed {selected.reviewedAt}</span>}
                  </div>
                  {selected.rejectionReason && <p>Reason: {selected.rejectionReason}</p>}
                  {selected.status === 'Approved' && selected.createdMemberId && onOpenMember && (
                    <button
                      type="button"
                      onClick={() => onOpenMember(selected.createdMemberId!)}
                      className="font-bold text-[#D4AF37] hover:underline"
                    >
                      Open member profile
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-neutral-400 text-center">
              Select a request to see its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
