import React, { useState } from 'react';
import { todayDhaka } from '../../lib/dates';
import { resizeImage } from '../../lib/image';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Flame,
  Camera,
  Search,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Phone,
  Calendar,
  Check,
  X,
  UserPlus
} from 'lucide-react';
import {
  Member,
  PaymentRecord,
  WorkoutSession,
  MealLog,
  NeedsAttentionAlert,
  AuditLogItem,
  Notice,
  PaymentVerificationRequest,
  MemberRegistrationRequest
} from '../../types';
import { StatCard, Avatar, EmptyState, showToast } from '../common/CommonUI';
import { AreaTrendChart } from '../common/SvgCharts';
import { storage } from '../../services/storage';

interface TrainerDashboardProps {
  members: Member[];
  payments: PaymentRecord[];
  workoutSessions: WorkoutSession[];
  mealLogs: MealLog[];
  alerts: NeedsAttentionAlert[];
  auditLogs: AuditLogItem[];
  notices: Notice[];
  paymentRequests?: PaymentVerificationRequest[];
  registrationRequests?: MemberRegistrationRequest[];
  onSelectTab: (tab: string, meta?: any) => void;
  onResolveAlert: (id: string) => void;
  onOpenAddMember: () => void;
  onOpenRecordPayment: () => void;
  onOpenPublishNotice: () => void;
  onApprovePaymentRequest?: (id: string) => void;
  onRejectPaymentRequest?: (id: string, reason?: string) => void;
  onOpenMemberRequests?: () => void;
}

export const TrainerDashboard: React.FC<TrainerDashboardProps> = ({
  members,
  payments,
  workoutSessions,
  mealLogs,
  alerts,
  paymentRequests = [],
  registrationRequests = [],
  onSelectTab,
  onResolveAlert,
  onOpenAddMember,
  onOpenRecordPayment,
  onOpenPublishNotice,
  onApprovePaymentRequest,
  onRejectPaymentRequest,
  onOpenMemberRequests
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'active' | 'payment_due' | 'expiring' | 'attention'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline payment rejection state (replaces disallowed window.prompt)
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid transaction ID or payment not received.');

  // Calculations from real records
  const activeMembers = members.filter((m) => m.status === 'Active');
  const expiringSoonMembers = members.filter((m) => m.status === 'Expiring Soon');
  const overdueMembers = members.filter(
    (m) => m.paymentStatus === 'Overdue' || m.paymentStatus === 'Partially Paid'
  );
  const totalPackageValue = members.reduce((sum, m) => sum + m.packagePrice, 0);
  const totalPaid = members.reduce((sum, m) => sum + m.amountPaid, 0);
  const totalOutstanding = Math.max(0, totalPackageValue - totalPaid);

  const currentMonthPrefix = todayDhaka().slice(0, 7);
  const monthlyCollections = payments
    .filter((p) => p.date.startsWith(currentMonthPrefix) && p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingMealReviews = mealLogs.filter((m) => m.trainerReviewStatus === 'Pending');
  const activeAlerts = alerts.filter((a) => !a.isResolved);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fitnessGoal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (selectedCategory === 'active') return m.status === 'Active';
    if (selectedCategory === 'payment_due')
      return m.paymentStatus === 'Overdue' || m.paymentStatus === 'Partially Paid';
    if (selectedCategory === 'expiring') return m.status === 'Expiring Soon';
    if (selectedCategory === 'attention')
      return m.paymentStatus === 'Overdue' || m.status === 'Expiring Soon';
    return true;
  });

  const trainerProfile = storage.getTrainer();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Coach Oliul!';
    if (hour < 17) return 'Good Afternoon, Coach Oliul!';
    return 'Good Evening, Coach Oliul!';
  };

  const revenueTrendData = [
    { label: 'Jun', value: 48000 },
    { label: 'Jul', value: 62000 },
    { label: 'Aug', value: 74000 },
    { label: 'Sep', value: 68000 },
    { label: 'Oct', value: 92000 },
    { label: 'Nov', value: monthlyCollections + 35000 }
  ];

  const pendingRegistrations = registrationRequests.filter((r) => r.status === 'Pending');
  const pendingPayments = paymentRequests.filter((p) => p.status === 'Pending');

  return (
    <div className="space-y-7">
      {/* 1. TOP GREETING & SEARCH */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-neutral-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Trainer profile info & greeting */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0 group">
              <Avatar
                src={trainerProfile.avatarUrl}
                name="Coach Oliul"
                size="lg"
                className="rounded-3xl border-2 border-white shadow-md object-cover"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#10B981] border-2 border-white rounded-full" />
              <label
                title="Change Coach Photo"
                className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-bold"
              >
                <span>Edit</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const input = e.target;
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const resized = await resizeImage(file, 800);
                      await storage.uploadTrainerPhoto(resized);
                      showToast('Coach profile photo updated for every client!');
                    } catch (err) {
                      showToast((err as Error).message, 'error');
                    } finally {
                      input.value = '';
                    }
                  }}
                />
              </label>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-bold text-[#7155E8] uppercase tracking-wider">
                  {trainerProfile.gymName || "Azim's Workout Arena & Performance Club"}
                </span>
                <span className="text-neutral-300 hidden sm:inline">·</span>
                <span className="text-xs text-neutral-400 font-medium">Head Coach Oliul Azim</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#171717] mt-0.5 truncate">
                {getGreeting()}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Let's check your members' progress and daily meal logs today.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={onOpenMemberRequests}
              className="px-4 py-2.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Applications</span>
              {pendingRegistrations.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-amber-400 text-neutral-900 text-[10px] font-black flex items-center justify-center tabular-nums">
                  {pendingRegistrations.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAddMember}
              className="px-4 py-2.5 rounded-2xl bg-[#F0EEFC] hover:bg-[#E4DFFA] text-[#7155E8] text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Enroll Client</span>
            </button>

            <button
              type="button"
              onClick={onOpenRecordPayment}
              className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Payments</span>
              {pendingPayments.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-[#E2136E] text-white text-[10px] font-black flex items-center justify-center tabular-nums">
                  {pendingPayments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="mt-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search members by name, fitness goal, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-xs bg-[#F5F5F5] hover:bg-[#EFEFEF] focus:bg-white border border-neutral-200/60 focus:border-[#7155E8] rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-[#7155E8]/20"
          />
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={members.length}
          subtitle="All enrolled clients"
          trendText={`${activeMembers.length} active`}
          trendPositive={true}
          icon={<Users className="w-5 h-5" />}
          accentColor="#7155E8"
          onClick={() => onSelectTab('members')}
        />

        <StatCard
          title="Active Members"
          value={activeMembers.length}
          subtitle={`${expiringSoonMembers.length} expiring soon`}
          trendText="92% active rate"
          trendPositive={true}
          icon={<Flame className="w-5 h-5" />}
          accentColor="#10B981"
          onClick={() => onSelectTab('members')}
        />

        <StatCard
          title="Payments Received"
          value={`৳${monthlyCollections.toLocaleString()}`}
          subtitle="November collections"
          trendText="Verified"
          icon={<CreditCard className="w-5 h-5" />}
          accentColor="#10B981"
          onClick={() => onSelectTab('payments')}
        />

        <StatCard
          title="Outstanding Dues"
          value={`৳${totalOutstanding.toLocaleString()}`}
          subtitle={`${overdueMembers.length} with balances`}
          trendText="Action Required"
          trendPositive={false}
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="#EF4444"
          onClick={() => onSelectTab('payments')}
        />
      </div>

      {/* 3. COACH ACTION CENTER HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7155E8] via-[#7B60EC] to-[#9176F7] text-white p-6 sm:p-8 shadow-[0_12px_32px_rgba(113,85,232,0.32)]">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 right-24 w-36 h-36 rounded-full bg-black/10 blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
            <span>Coach Action Center · Dhaka Studio</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {pendingMealReviews.length > 0
              ? `${pendingMealReviews.length} Meal Photo Submissions Need Your Verification`
              : 'All Client Diet & Workout Records Are Up to Date'}
          </h2>

          <p className="text-xs sm:text-sm text-purple-100 mt-2 leading-relaxed">
            {overdueMembers.length > 0
              ? `There are ${overdueMembers.length} client memberships with pending fee renewals. Review evidence photos and send instant payment reminders.`
              : 'Review client macro compliance, log training check-ins, or broadcast urgent gym announcements.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTab('meal-hub')}
              className="px-5 py-2.5 rounded-2xl bg-white text-[#7155E8] hover:bg-neutral-100 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Review Meal Photos ({pendingMealReviews.length})</span>
            </button>

            <button
              type="button"
              onClick={onOpenPublishNotice}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              Send Notice Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* 3.1 PENDING PAYMENT REQUESTS (bKash & Cash) */}
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E2136E]/30 shadow-[0_4px_24px_rgba(226,19,110,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#E2136E]/10 text-[#E2136E] flex items-center justify-center font-bold shrink-0">
                ৳
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#171717]">
                  Payment Verification Requests ({pendingPayments.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Accepting a payment automatically marks member as Paid and unlocks their workout & diet plans.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 whitespace-nowrap self-start sm:self-auto shrink-0">
              Payment Window: 1st – 10th
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {pendingPayments.map((pr) => (
              <div key={pr.id} className="py-4 space-y-3 text-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar src={pr.memberAvatar} name={pr.memberName} size="md" className="rounded-2xl shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#171717]">{pr.memberName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            pr.method === 'bKash'
                              ? 'bg-[#E2136E] text-white'
                              : 'bg-[#7155E8] text-white'
                          }`}
                        >
                          {pr.method}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-500 mt-1 font-mono text-[11px]">
                        <span className="font-bold text-[#171717]">৳{pr.amount.toLocaleString()}</span>
                        <span>·</span>
                        <span>{pr.billingMonth}</span>
                        {pr.trxId && (
                          <>
                            <span>·</span>
                            <span className="font-bold text-[#E2136E] bg-[#E2136E]/10 px-1.5 py-0.5 rounded">
                              TrxID: {pr.trxId}
                            </span>
                          </>
                        )}
                        {pr.senderBkashNumber && (
                          <>
                            <span>·</span>
                            <span>From: {pr.senderBkashNumber}</span>
                          </>
                        )}
                      </div>

                      {pr.notes && (
                        <p className="text-neutral-500 mt-1 italic font-sans">"{pr.notes}"</p>
                      )}
                    </div>
                  </div>

                  {/* Accept or Reject actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => onApprovePaymentRequest && onApprovePaymentRequest(pr.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Accept Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(rejectingId === pr.id ? null : pr.id);
                        setRejectReason('Invalid transaction ID or payment not received.');
                      }}
                      className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 font-bold text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Inline Rejection Reason Box */}
                {rejectingId === pr.id && (
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejecting payment..."
                      className="flex-1 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-400"
                    />
                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-600 font-semibold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRejectPaymentRequest) {
                            onRejectPaymentRequest(pr.id, rejectReason.trim() || undefined);
                          }
                          setRejectingId(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap"
                      >
                        Confirm Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3.2 PENDING MEMBER REGISTRATION APPLICATIONS */}
      {pendingRegistrations.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#7155E8]/30 shadow-[0_4px_24px_rgba(113,85,232,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#7155E8]/10 text-[#7155E8] flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#171717]">
                  New Prospective Member Applications ({pendingRegistrations.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Prospective clients registered with photos and body condition assessment. Approve to create profile.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenMemberRequests || onOpenAddMember}
              className="px-4 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap self-start sm:self-auto shrink-0 cursor-pointer"
            >
              Review All Applications →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingRegistrations.slice(0, 2).map((req) => (
              <div
                key={req.id}
                onClick={onOpenMemberRequests || onOpenAddMember}
                className="p-4 bg-[#F5F5F5] hover:bg-[#EFEFEF] transition-colors cursor-pointer rounded-2xl border border-neutral-200/80 flex items-start gap-3"
              >
                <Avatar src={req.avatarUrl} name={req.fullName} size="md" className="rounded-2xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-sm text-[#171717] block truncate">
                    {req.fullName}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono block truncate">
                    {req.phone} · {req.currentWeightKg}kg ({req.gender}, {req.age}y)
                  </span>
                  <p className="text-[11px] text-neutral-600 mt-1 line-clamp-2 italic bg-white/70 p-2 rounded-xl">
                    "{req.bodyConditionNotes}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HORIZONTAL SCROLLING CATEGORY FILTERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#171717] tracking-tight">
              Member Directory
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              Browse athlete cards, workout completion, and diet adherence
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('members')}
            className="text-xs font-bold text-[#7155E8] hover:text-[#5d41d1] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>See All ({members.length})</span> <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Category Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {[
            { id: 'all', label: `All Members (${members.length})` },
            { id: 'active', label: `Active (${activeMembers.length})` },
            { id: 'payment_due', label: `Payment Due (${overdueMembers.length})` },
            { id: 'expiring', label: `Expiring Soon (${expiringSoonMembers.length})` },
            { id: 'attention', label: `Needs Attention (${activeAlerts.length})` }
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-sm'
                    : 'bg-white border border-neutral-200/80 text-neutral-600 hover:text-[#171717] hover:bg-neutral-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. RESPONSIVE GRID OF MEMBER CARDS */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          title="No matching members found"
          description="Try clearing your search query or switching the category filter above."
          actionText="Show All Members"
          onAction={() => {
            setSelectedCategory('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const isOverdue =
              member.paymentStatus === 'Overdue' || member.paymentStatus === 'Partially Paid';
            const dueAmount = Math.max(0, member.packagePrice - member.amountPaid);

            const memberSessions = workoutSessions.filter((s) => s.memberId === member.id);
            const completedSessions = memberSessions.filter((s) => s.status === 'Completed').length;
            const workoutRate =
              memberSessions.length > 0
                ? Math.round((completedSessions / memberSessions.length) * 100)
                : 90;

            const memberMeals = mealLogs.filter((m) => m.memberId === member.id);
            const followedMeals = memberMeals.filter((m) => m.adherence === 'Followed Plan').length;
            const dietRate =
              memberMeals.length > 0 ? Math.round((followedMeals / memberMeals.length) * 100) : 85;

            return (
              <div
                key={member.id}
                onClick={() => onSelectTab('members', { memberId: member.id })}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group min-w-0"
              >
                <div>
                  {/* Large Profile Photograph Container */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-neutral-100 mb-3.5">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F0EEFC] text-[#7155E8] text-4xl font-extrabold">
                        {member.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}
                    {/* Unified Top Overlay Flex Row - Prevents Left/Right Badge Collisions */}
                    <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 pointer-events-none">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-xs whitespace-nowrap ${
                          member.status === 'Active'
                            ? 'bg-emerald-500/90 text-white'
                            : member.status === 'Expiring Soon'
                            ? 'bg-amber-500/90 text-white'
                            : 'bg-rose-500/90 text-white'
                        }`}
                      >
                        {member.status}
                      </span>

                      {isOverdue && (
                        <span className="bg-red-600/95 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs whitespace-nowrap font-mono tabular-nums">
                          Due: ৳{dueAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Member Identity & Goal */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-base text-[#171717] group-hover:text-[#7155E8] transition-colors truncate">
                        {member.fullName}
                      </h4>
                      <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">
                        {member.fitnessGoal} · {member.fitnessLevel}
                      </p>
                    </div>

                    <a
                      href={`tel:${member.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-[#F5F5F5] hover:bg-[#7155E8]/10 text-neutral-600 hover:text-[#7155E8] flex items-center justify-center shrink-0 transition-colors"
                      title={`Call ${member.fullName}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Workout & Diet Progress Gauges */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 bg-[#F5F5F5] rounded-2xl">
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-neutral-500">Workout</span>
                        <span className="font-bold text-[#10B981] font-mono tabular-nums">
                          {workoutRate}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] rounded-full transition-all"
                          style={{ width: `${workoutRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-neutral-500">Diet</span>
                        <span className="font-bold text-[#7155E8] font-mono tabular-nums">
                          {dietRate}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#7155E8] rounded-full transition-all"
                          style={{ width: `${dietRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Next Payment & Expiry */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-neutral-400 font-medium min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">Next: {member.nextPaymentDeadline}</span>
                  </div>

                  <span className="font-bold text-[#7155E8] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 whitespace-nowrap shrink-0">
                    View Profile <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. NEEDS ATTENTION ALERTS */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100 shadow-[0_4px_24px_rgba(239,68,68,0.06)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#171717]">
                  Needs Trainer Attention ({activeAlerts.length} Action Items)
                </h3>
                <p className="text-xs text-neutral-400">
                  Priority client situations requiring follow-up
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-[#F5F5F5] border border-neutral-200/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar src={alert.memberAvatar} name={alert.memberName} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-[#171717]">{alert.memberName}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800 mt-1">{alert.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{alert.description}</p>
                    <div className="mt-2 text-[11px] font-medium text-[#7155E8]">
                      Suggested: {alert.recommendedAction}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-1.5 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-600 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('members', { memberId: alert.memberId })}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#171717] hover:bg-neutral-800 rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    Open Client
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. VISUAL ANALYTICS & RECENT MEAL EVIDENCE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#171717]">
                Monthly Fee Collections (৳ BDT)
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Verified collections across bKash, Nagad, and Bank Wire transfers
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-neutral-400 block">November Target</span>
              <span className="text-sm font-extrabold font-mono tabular-nums text-[#10B981]">
                ৳100,000
              </span>
            </div>
          </div>

          <AreaTrendChart
            data={revenueTrendData}
            height={200}
            color="#7155E8"
            valuePrefix="৳"
            valueSuffix=""
          />
        </div>

        {/* Right 1 Col: Recent Meal Photos */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                Recent Meal Evidence
              </h3>
              <button
                type="button"
                onClick={() => onSelectTab('meal-hub')}
                className="text-xs font-bold text-[#7155E8] hover:underline cursor-pointer"
              >
                View Hub
              </button>
            </div>

            <div className="space-y-2.5">
              {mealLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  onClick={() => onSelectTab('meal-hub')}
                  className="p-2.5 rounded-2xl bg-[#F5F5F5] hover:bg-[#EFEFEF] cursor-pointer transition-colors flex items-center gap-3 min-w-0"
                >
                  {log.photoUrl ? (
                    <img
                      src={log.photoUrl}
                      alt="Meal"
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#171717] truncate">
                        {log.memberName}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                        {log.scheduledMealName}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {log.prescribedFoodsSummary}
                    </p>
                    <div className="flex items-center justify-between text-[10px] mt-0.5">
                      <span className="font-mono text-[#7155E8] font-semibold tabular-nums">
                        {log.totalCalories} kcal
                      </span>
                      <span
                        className={`font-bold ${
                          log.trainerReviewStatus === 'Approved'
                            ? 'text-[#10B981]'
                            : 'text-[#F59E0B]'
                        }`}
                      >
                        {log.trainerReviewStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Total verified submissions</span>
            <span className="font-bold text-[#171717] font-mono tabular-nums">{mealLogs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
