import React, { useState } from 'react';
import { currentBillingMonth, todayDhaka } from '../../lib/dates';
import {
  Plus,
  Search,
  AlertTriangle,
  Send,
  Check,
  X
} from 'lucide-react';
import { Member, PaymentRecord, PaymentMethod, PaymentVerificationRequest } from '../../types';
import { Avatar, Modal, showToast } from '../common/CommonUI';

interface PaymentManagementProps {
  payments: PaymentRecord[];
  members: Member[];
  paymentRequests?: PaymentVerificationRequest[];
  onRecordPayment: (payment: any) => void;
  onSendReminderNotice: (member: Member, amountDue: number) => void;
  onSelectMember: (memberId: string) => void;
  onApprovePaymentRequest?: (id: string) => void;
  onRejectPaymentRequest?: (id: string, reason?: string) => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  payments,
  members,
  paymentRequests = [],
  onRecordPayment,
  onSendReminderNotice,
  onSelectMember,
  onApprovePaymentRequest,
  onRejectPaymentRequest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Inline payment rejection state (replaces window.prompt)
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid transaction ID or payment not received.');

  // New Payment Form state
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayDhaka());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bKash');
  const [transactionRef, setTransactionRef] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(`${currentBillingMonth()} Monthly PT`);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Calculations
  const totalReceived = payments
    .filter((p) => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalContractValue = members.reduce((sum, m) => sum + m.packagePrice, 0);
  const totalOutstanding = Math.max(0, totalContractValue - totalReceived);

  const overdueMembers = members.filter((m) => m.paymentStatus === 'Overdue');
  const partialMembers = members.filter((m) => m.paymentStatus === 'Partially Paid');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.billingPeriod.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;

    onRecordPayment({
      memberId: member.id,
      memberName: member.fullName,
      amount: parseFloat(paymentAmount) || 0,
      date: paymentDate,
      method: paymentMethod,
      transactionRef: transactionRef || undefined,
      billingPeriod,
      recordedBy: 'Coach Oliul Azim',
      notes: paymentNotes || 'Manual payment verified.',
      status: 'Completed'
    });

    setShowAddPaymentModal(false);
    setTransactionRef('');
    setPaymentNotes('');
    showToast(`Payment of ৳${Number(paymentAmount).toLocaleString()} recorded for ${member.fullName}!`);
  };

  const selectedMemberData = members.find((m) => m.id === selectedMemberId);
  const memberRemainingBalance = selectedMemberData
    ? Math.max(0, selectedMemberData.packagePrice - selectedMemberData.amountPaid)
    : 0;

  const pendingVerifications = paymentRequests.filter((p) => p.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Membership & Payment Management
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track collections, outstanding balances, bKash/Nagad transactions, and overdue reminders
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddPaymentModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all self-start md:self-auto active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Record New Payment
        </button>
      </div>

      {/* PENDING VERIFICATION REQUESTS (bKash & Cash) */}
      {pendingVerifications.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E2136E]/30 shadow-[0_4px_24px_rgba(226,19,110,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#E2136E]/10 text-[#E2136E] flex items-center justify-center font-bold shrink-0">
                ৳
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#171717]">
                  Pending Payment Verifications ({pendingVerifications.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Members must pay between the 1st and 10th of every month. Accepting unlocks their workout & diet blueprints.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 self-start sm:self-center whitespace-nowrap">
              Payment Window: 1st – 10th
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {pendingVerifications.map((pr) => (
              <div key={pr.id} className="py-4 space-y-3 text-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <Avatar src={pr.memberAvatar} name={pr.memberName} size="md" className="rounded-2xl shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#171717]">{pr.memberName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap ${
                            pr.method === 'bKash'
                              ? 'bg-[#E2136E] text-white'
                              : 'bg-[#7155E8] text-white'
                          }`}
                        >
                          {pr.method}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-500 mt-1 font-mono tabular-nums text-[11px]">
                        <span>৳{pr.amount.toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>{pr.billingMonth}</span>
                        {pr.trxId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-[#E2136E] bg-[#E2136E]/10 px-1.5 py-0.5 rounded">
                              TrxID: {pr.trxId}
                            </span>
                          </>
                        )}
                        {pr.senderBkashNumber && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Sender: {pr.senderBkashNumber}</span>
                          </>
                        )}
                      </div>

                      {pr.notes && (
                        <p className="text-neutral-500 mt-1 italic font-sans">
                          "{pr.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Accept / Reject Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => onApprovePaymentRequest && onApprovePaymentRequest(pr.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Accept Payment (Unlock Plans)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(rejectingId === pr.id ? null : pr.id);
                        setRejectReason('Invalid transaction ID or payment not received.');
                      }}
                      className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 font-bold text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Inline Rejection Reason Input */}
                {rejectingId === pr.id && (
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for declining payment..."
                      className="flex-1 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:border-rose-400"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRejectPaymentRequest) {
                            onRejectPaymentRequest(pr.id, rejectReason.trim() || 'Payment verification declined.');
                          }
                          setRejectingId(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs whitespace-nowrap"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Total Revenue Collected
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#10B981] mt-1 truncate">
            ৳{totalReceived.toLocaleString()}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Across completed transactions</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Outstanding Balance
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#EF4444] mt-1 truncate">
            ৳{totalOutstanding.toLocaleString()}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Remaining due from members</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Overdue Accounts
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#F59E0B] mt-1">
            {overdueMembers.length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Immediate follow-up needed</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-neutral-400 block truncate">
            Partially Paid
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#7155E8] mt-1">
            {partialMembers.length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block truncate">Partial installment accounts</span>
        </div>
      </div>

      {/* Overdue Alert Banner if any members are overdue */}
      {overdueMembers.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-4 sm:p-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-rose-200/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold text-rose-900">
                Action Required: {overdueMembers.length} Members with Overdue Payments
              </span>
            </div>
            <span className="text-[11px] font-mono text-rose-700">Bangladesh Taka (৳)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {overdueMembers.map((m) => {
              const bal = Math.max(0, m.packagePrice - m.amountPaid);
              return (
                <div
                  key={m.id}
                  className="bg-white p-3.5 rounded-2xl border border-rose-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={m.avatarUrl} name={m.fullName} size="xs" />
                    <div className="min-w-0">
                      <span className="font-bold text-neutral-900 block truncate">{m.fullName}</span>
                      <div className="text-[10px] text-rose-700 font-mono truncate">
                        Deadline passed: {m.nextPaymentDeadline}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold font-mono tabular-nums text-rose-800 text-xs">
                      ৳{bal.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendReminderNotice(m, bal)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap active:scale-95"
                      title="Send instant in-app payment reminder notice"
                    >
                      <Send className="w-3 h-3" /> Remind
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Ledger Data Table */}
      <div className="bg-white border border-neutral-200/70 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by athlete or transaction ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-2xl bg-[#F5F5F5] focus:bg-white focus:outline-none focus:border-[#7155E8]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-neutral-500 text-xs shrink-0">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full sm:w-auto border border-neutral-200 rounded-2xl px-3 py-2 text-xs bg-[#F5F5F5] font-medium focus:outline-none focus:border-[#7155E8]"
            >
              <option value="all">All Methods</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Athlete</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Amount Paid</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Method</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tx Reference</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Billing Cycle</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Recorded By</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">{p.date}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectMember(p.memberId)}
                      className="font-bold text-neutral-900 hover:text-[#7155E8] transition-colors"
                    >
                      {p.memberName}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums font-bold text-neutral-900 whitespace-nowrap">
                    ৳{p.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-full text-[11px]">
                      {p.method}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                    {p.transactionRef || 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-neutral-600">{p.billingPeriod}</td>
                  <td className="py-3 px-3 text-neutral-500 text-[11px] whitespace-nowrap">{p.recordedBy}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-mono text-[11px] font-semibold text-emerald-700">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title="Record Coaching Payment"
        description="Log a verified manual payment or bKash/cash settlement."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Select Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl bg-[#F5F5F5] focus:bg-white font-medium focus:outline-none focus:border-[#7155E8]"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} (Due: ৳{Math.max(0, m.packagePrice - m.amountPaid).toLocaleString()})
                </option>
              ))}
            </select>
            {selectedMemberData && (
              <p className="text-[11px] text-neutral-500 mt-1.5 font-mono tabular-nums">
                Package: ৳{selectedMemberData.packagePrice.toLocaleString()} · Paid: ৳{selectedMemberData.amountPaid.toLocaleString()} · Due: ৳{memberRemainingBalance.toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Amount (৳ BDT)</label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Payment Channel</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">TrxID / Reference</label>
              <input
                type="text"
                placeholder="e.g. BK892019TX"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-600 mb-1">Billing Period / Package</label>
            <input
              type="text"
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              placeholder="e.g. Nov 2026 - Jan 2027 (Quarterly)"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-neutral-600 mb-1">Trainer Payment Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Verified in bKash merchant statement"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowAddPaymentModal(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl font-bold shadow-xs transition-all active:scale-95"
            >
              Verify & Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
