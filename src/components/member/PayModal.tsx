import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Copy,
  Check,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Member, PaymentVerificationRequest } from '../../types';
import { showToast, useBodyScrollLock } from '../common/CommonUI';
import { storage } from '../../services/storage';
import { currentBillingMonth } from '../../lib/dates';

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  onSubmitPaymentRequest: (
    data: Omit<PaymentVerificationRequest, 'id' | 'submittedAt' | 'status'>
  ) => Promise<void> | void;
}

export const PayModal: React.FC<PayModalProps> = ({
  isOpen,
  onClose,
  member,
  onSubmitPaymentRequest
}) => {
  const [method, setMethod] = useState<'bKash' | 'Cash'>('bKash');
  const balanceDue = Math.max(member.packagePrice - member.amountPaid, 0);
  const [amount, setAmount] = useState<string>(String(balanceDue || member.packagePrice || ''));
  const [senderPhone, setSenderPhone] = useState<string>(member.phone || '');
  const [trxId, setTrxId] = useState<string>('');
  const [notes, setNotes] = useState<string>(`${currentBillingMonth()} Monthly Coaching Fee`);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const bkashNumber = storage.getMainCoach()?.bkashNumber || '';

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(bkashNumber);
    setIsCopied(true);
    showToast(`Copied bKash number: ${bkashNumber}`, 'info');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenBkash = () => {
    window.location.href = `tel:${bkashNumber}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (method === 'bKash' && !bkashNumber) {
      const errMsg = 'The coach has not added a bKash number yet. Please pay in cash or contact the coach.';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    if (!(parseFloat(amount) > 0)) {
      const errMsg = 'Please enter the amount you paid.';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    if (method === 'bKash' && !trxId.trim()) {
      const errMsg = 'Please enter your bKash Transaction ID (TrxID) after completing the Send Money transfer.';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    setIsSubmitting(true);
    Promise.resolve(
      onSubmitPaymentRequest({
        memberId: member.id,
        memberName: member.fullName,
        memberAvatar: member.avatarUrl,
        memberPhone: member.phone,
        amount: parseFloat(amount),
        method,
        targetBkashNumber: method === 'bKash' ? bkashNumber : undefined,
        senderBkashNumber: method === 'bKash' ? senderPhone : undefined,
        trxId: method === 'bKash' ? trxId.trim().toUpperCase() : undefined,
        billingMonth: currentBillingMonth(),
        notes: notes.trim()
      })
    )
      .then(() => {
        setSubmittedSuccess(true);
        setTrxId('');
        setTimeout(() => {
          setSubmittedSuccess(false);
          onClose();
        }, 1700);
      })
      .catch((err: Error) => {
        setValidationError(err.message);
        showToast(err.message, 'error');
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
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
            className="relative z-10 bg-white rounded-3xl w-full max-w-lg shadow-[0_24px_64px_rgba(0,0,0,0.16)] border border-neutral-100 overflow-hidden flex flex-col max-h-[88vh] my-auto"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#7155E8] uppercase tracking-wider bg-[#F0EEFC] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Monthly Fee Payment
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> Pay by 10th
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#171717] mt-1 font-mono tabular-nums">
                  <span className="font-sans">Pay Coaching Fee · </span>৳{Number(amount || 3500).toLocaleString()}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors shrink-0"
                aria-label="Close payment modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedSuccess ? (
              <div className="p-8 text-center space-y-3 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-[#171717]">Payment Request Dispatched!</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Coach Oliul Azim has received your {method} payment notification. Once the coach verifies and accepts it, your workout routine and diet plan will be immediately activated!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {validationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* 1st - 10th Policy Notice */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Monthly Payment Window: 1st – 10th</span>
                    <span className="text-[11px] text-amber-800 leading-snug">
                      All active members must complete payment between 1st to 10th of every month to keep workout routines and diet blueprints active.
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* bKash Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setMethod('bKash');
                        setValidationError(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        method === 'bKash'
                          ? 'border-[#E2136E] bg-[#E2136E]/5 ring-2 ring-[#E2136E]/20'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-sm text-[#E2136E]">bKash</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#E2136E] text-white rounded-md whitespace-nowrap">
                          Send Money
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {bkashNumber || 'Not set'}
                      </span>
                    </button>

                    {/* Cash Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setMethod('Cash');
                        setValidationError(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        method === 'Cash'
                          ? 'border-[#7155E8] bg-[#7155E8]/5 ring-2 ring-[#7155E8]/20'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-sm text-[#171717]">Cash</span>
                        <DollarSign className="w-4 h-4 text-[#7155E8]" />
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        In-Person at Gym
                      </span>
                    </button>
                  </div>
                </div>

                {/* bKash Specific Panel */}
                {method === 'bKash' ? (
                  <div className="space-y-4">
                    {/* Send Money Number Card */}
                    <div className="p-4 rounded-2xl bg-[#E2136E]/5 border border-[#E2136E]/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#E2136E] tracking-wider block">
                            Coach's bKash Personal Number
                          </span>
                          <span className="font-mono text-xl sm:text-2xl font-black text-[#E2136E] tracking-wider">
                            {bkashNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyNumber}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2136E]/30 text-[#E2136E] hover:bg-[#E2136E] hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenBkash}
                            className="px-3 py-1.5 rounded-xl bg-[#E2136E] text-white hover:bg-[#c00f5c] transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                            title="Open phone dialer or bKash"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Send Money
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-600 bg-white/80 p-3 rounded-xl border border-neutral-100 space-y-1">
                        <span className="font-bold text-[#E2136E] block">Steps to pay via bKash:</span>
                        <p className="leading-snug">
                          1. Open your bKash App or dial <span className="font-mono font-bold">*247#</span>
                        </p>
                        <p className="leading-snug">
                          2. Choose <span className="font-bold">Send Money</span> and enter <span className="font-mono font-bold text-[#E2136E]">{bkashNumber}</span>
                        </p>
                        <p className="leading-snug">
                          3. Enter Amount <span className="font-bold font-mono">৳{amount}</span> and your Name as reference
                        </p>
                        <p className="leading-snug">
                          4. Copy the <span className="font-bold">Transaction ID (TrxID)</span> and paste below.
                        </p>
                      </div>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#171717] mb-1">
                          Payment Amount (৳ BDT)
                        </label>
                        <input
                          type="number"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-[#E2136E]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#171717] mb-1">
                          Your bKash Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono text-sm focus:bg-white focus:outline-none focus:border-[#E2136E]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#171717] mb-1">
                        bKash Transaction ID (TrxID) <span className="text-[#E2136E]">*</span>
                      </label>
                      <input
                        type="text"
                        value={trxId}
                        onChange={(e) => {
                          setTrxId(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        placeholder="e.g. BL93K09X8A"
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono font-bold text-sm uppercase tracking-wider focus:bg-white focus:outline-none focus:border-[#E2136E] placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        Found in your bKash confirmation SMS or app transfer receipt.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Cash Specific Panel */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#7155E8]/5 border border-[#7155E8]/20 space-y-2">
                      <div className="flex items-center gap-2 text-[#7155E8] font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>In-Person Gym Cash Handover</span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        You can pay physically in cash directly to Coach Oliul Azim at the gym counter during your scheduled training sessions.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#171717] mb-1">
                        Cash Amount (৳ BDT)
                      </label>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-[#7155E8]"
                      />
                    </div>
                  </div>
                )}

                {/* Note / Billing Month */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Note / Billing Period
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`e.g. ${currentBillingMonth()} Monthly Coaching Fee`}
                    className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:border-[#7155E8]"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Submit {method} Payment for Coach Verification
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-neutral-400 text-center block mt-2">
                    Coach Oliul Azim will verify and accept your request to unlock your workout & diet blueprints.
                  </span>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
