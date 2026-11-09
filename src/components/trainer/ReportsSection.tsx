import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Member, PaymentRecord, WorkoutSession, MealLog } from '../../types';
import { showToast } from '../common/CommonUI';

interface ReportsSectionProps {
  members: Member[];
  payments: PaymentRecord[];
  workoutSessions: WorkoutSession[];
  mealLogs: MealLog[];
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({
  members,
  payments,
  workoutSessions,
  mealLogs
}) => {
  const [reportType, setReportType] = useState<
    'payments' | 'outstanding' | 'members' | 'expirations' | 'compliance'
  >('payments');

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV audit report downloaded!');
  };

  const handleExportPayments = () => {
    const headers = ['PaymentID', 'Client', 'Date', 'Amount (BDT)', 'Method', 'TransactionRef', 'BillingPeriod', 'Status'];
    const rows = payments.map((p) => [
      p.id,
      `"${p.memberName}"`,
      p.date,
      p.amount,
      p.method,
      p.transactionRef || 'N/A',
      `"${p.billingPeriod}"`,
      p.status
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('apexpulse_payment_collections', csv);
  };

  const handleExportMembers = () => {
    const headers = ['ClientID', 'Name', 'Email', 'Phone', 'Goal', 'Status', 'PackagePrice', 'AmountPaid', 'RemainingDues', 'ExpiryDate'];
    const rows = members.map((m) => {
      const balance = Math.max(0, m.packagePrice - m.amountPaid);
      return [
        m.id,
        `"${m.fullName}"`,
        m.email,
        m.phone,
        `"${m.fitnessGoal}"`,
        m.status,
        m.packagePrice,
        m.amountPaid,
        balance,
        m.membershipEndDate
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('apexpulse_member_directory', csv);
  };

  const totalCollected = payments.filter((p) => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0);
  const totalContract = members.reduce((sum, m) => sum + m.packagePrice, 0);
  const totalBalance = Math.max(0, totalContract - totalCollected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Financial & Performance Reports
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Verified ledger analytics, exportable CSV audits, and client progress metrics
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={reportType === 'payments' ? handleExportPayments : handleExportMembers}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7155E8] text-white font-bold text-xs rounded-2xl hover:bg-[#6245DE] transition-all shadow-[0_4px_16px_rgba(113,85,232,0.35)] active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'payments', label: 'Payment Collections' },
          { id: 'outstanding', label: 'Outstanding Dues' },
          { id: 'members', label: 'Member Directory' },
          { id: 'expirations', label: 'Expirations' },
          { id: 'compliance', label: 'Diet & Workout Adherence' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap active:scale-95 ${
              reportType === tab.id
                ? 'bg-[#171717] text-white shadow-xs'
                : 'bg-white border border-neutral-200/80 text-neutral-600 hover:text-[#171717] hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report View Panel */}
      <div className="bg-white border border-neutral-200/70 rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={reportType}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            {reportType === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Payment Collection Report</h3>
                    <span className="text-xs text-neutral-500">
                      Total valid collections: <strong className="font-mono tabular-nums">৳{totalCollected.toLocaleString()}</strong> BDT
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                        <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Athlete</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Amount</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Method</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Trx Reference</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Billing Cycle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono tabular-nums text-[11px]">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 whitespace-nowrap">{p.date}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 whitespace-nowrap">{p.memberName}</td>
                          <td className="py-2.5 px-3 font-bold text-neutral-900 whitespace-nowrap">৳{p.amount.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-sans whitespace-nowrap">{p.method}</td>
                          <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">{p.transactionRef || 'N/A'}</td>
                          <td className="py-2.5 px-3 font-sans text-neutral-600">{p.billingPeriod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'outstanding' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Outstanding Balances & Dues Report</h3>
                    <span className="text-xs text-rose-700 font-semibold font-mono tabular-nums">
                      Total Uncollected Balance: ৳{totalBalance.toLocaleString()} BDT
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[660px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                        <th className="py-2.5 px-3 whitespace-nowrap">Athlete</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Phone</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Package Value</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Paid Amount</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Outstanding Due</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Deadline</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono tabular-nums text-[11px]">
                      {members.map((m) => {
                        const balance = Math.max(0, m.packagePrice - m.amountPaid);
                        return (
                          <tr key={m.id}>
                            <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 whitespace-nowrap">{m.fullName}</td>
                            <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">{m.phone}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">৳{m.packagePrice.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-emerald-700 whitespace-nowrap">৳{m.amountPaid.toLocaleString()}</td>
                            <td className="py-2.5 px-3 font-bold text-rose-700 whitespace-nowrap">৳{balance.toLocaleString()}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{m.nextPaymentDeadline}</td>
                            <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                              <span
                                className={`font-semibold ${
                                  m.paymentStatus === 'Paid'
                                    ? 'text-emerald-700'
                                    : m.paymentStatus === 'Partially Paid'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {m.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'members' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  Athlete Enrollment & Package Roster
                </h3>
                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                        <th className="py-2.5 px-3 whitespace-nowrap">Athlete</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Age/Gender</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Primary Goal</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Weight (kg)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Membership Tier</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {members.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2.5 px-3 font-bold text-neutral-900 whitespace-nowrap">{m.fullName}</td>
                          <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">{m.age} / {m.gender}</td>
                          <td className="py-2.5 px-3 text-neutral-800">{m.fitnessGoal}</td>
                          <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">{m.currentWeightKg} kg</td>
                          <td className="py-2.5 px-3 font-mono whitespace-nowrap">{m.membershipDuration}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-700 font-semibold whitespace-nowrap">{m.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'expirations' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  Membership Expirations Schedule
                </h3>
                <div className="divide-y divide-neutral-100 text-xs">
                  {members.map((m) => (
                    <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-neutral-900">{m.fullName}</span>
                        <div className="text-[11px] text-neutral-500 font-mono tabular-nums mt-0.5">
                          Period: {m.membershipStartDate} to {m.membershipEndDate} ({m.membershipDuration})
                        </div>
                      </div>
                      <div className="sm:text-right font-mono tabular-nums">
                        <span className="font-bold text-xs text-neutral-900">{m.status}</span>
                        <span className="text-[11px] text-neutral-400 block">{m.remainingSessions} coaching sessions left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportType === 'compliance' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  Diet & Workout Compliance Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                    <span className="font-bold text-neutral-900 block mb-2">Workout Verification Rate</span>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {workoutSessions.filter((s) => s.trainerReviewStatus === 'Verified').length} out of {workoutSessions.length} total logged sessions have been verified by Coach Oliul Azim with form confirmation.
                    </p>
                  </div>
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                    <span className="font-bold text-neutral-900 block mb-2">Meal Evidence Compliance</span>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {mealLogs.filter((m) => m.adherence === 'Followed Plan').length} out of {mealLogs.length} logged meals followed exact portion sizes and calorie blueprints.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
