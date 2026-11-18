import React, { useEffect, useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { storage } from '../../services/storage';
import { RegistrationStatus, signInWithGoogle } from '../../services/session';
import { PHOTO_READ_ERROR, resizeImage } from '../../lib/image';
import { MembershipDuration, RegistrationPaymentMethod } from '../../types';

const DURATION_OPTIONS: { value: MembershipDuration; label: string }[] = [
  { value: '1 month', label: '1 Month' },
  { value: '3 months', label: '3 Months' },
  { value: '6 months', label: '6 Months' }
];
const PAYMENT_METHODS: RegistrationPaymentMethod[] = ['Cash', 'bKash', 'Nagad', 'Bank Transfer'];

// Email sign-up needs a confirmation click before there is a session, so the form is kept
// in this browser and restored when the applicant signs in to finish.
const DRAFT_KEY = 'awm-registration-draft';
interface RegistrationDraft {
  email: string;
  name: string;
  phone: string;
  avatarDataUrl?: string;
  age: string;
  gender: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  fitnessGoal: string;
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete';
  medicalConditions: string;
  injuries: string;
  bodyConditionNotes: string;
  membershipDuration: MembershipDuration;
  amountPaid: string;
  paymentMethod: RegistrationPaymentMethod;
}
const readDraft = (): RegistrationDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as RegistrationDraft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (draft: RegistrationDraft | null) => {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage full or blocked: the applicant just re-enters the form.
  }
};
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Turns Supabase Auth errors into something an applicant can act on. */
const friendlySignUpError = (message: string) => {
  if (/signups? not allowed/i.test(message)) {
    return 'New registrations are switched off for this app right now. Please ask Coach Oliul Azim to enable sign-ups, or try again later.';
  }
  if (/already registered|already exists/i.test(message)) {
    return 'An account with this email already exists. Sign in instead to finish your registration.';
  }
  if (/amount_paid|payment_method/i.test(message) && /column|schema/i.test(message)) {
    return 'Registration is being updated on the server. Please try again in a few minutes.';
  }
  return message;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.86-3c-1.08.72-2.45 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.98H1.27v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.25 14.25A7.2 7.2 0 0 1 4.87 12c0-.78.14-1.54.38-2.25v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.35l3.98-3.1z" />
    <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.65l3.98 3.1C6.2 6.89 8.86 4.77 12 4.77z" />
  </svg>
);

export interface AuthPrefill {
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthPageProps {
  /** 'complete-registration': signed in (e.g. with Google) but not yet an approved client. */
  mode: 'sign-in' | 'complete-registration';
  prefill?: AuthPrefill;
  registration?: RegistrationStatus | null;
  onRegistrationSubmitted: () => void;
  onSignOut: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  prefill,
  registration,
  onRegistrationSubmitted,
  onSignOut
}) => {
  const isCompleting = mode === 'complete-registration';
  const [isSignUp, setIsSignUp] = useState(isCompleting);
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Sign In inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up inputs (Member registration with full body condition & photo)
  const [name, setName] = useState(prefill?.fullName ?? '');
  const [phone, setPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState(prefill?.email ?? '');
  const [signupPassword, setSignupPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(prefill?.avatarUrl ?? '');
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [photoFileName, setPhotoFileName] = useState(prefill?.avatarUrl ? 'Google profile photo' : '');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Muscle Building & Hypertrophy');
  const [fitnessLevel, setFitnessLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete'>('Beginner');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [injuries, setInjuries] = useState('');
  const [bodyConditionNotes, setBodyConditionNotes] = useState('');
  const [membershipDuration, setMembershipDuration] = useState<MembershipDuration>('1 month');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<RegistrationPaymentMethod>('Cash');

  // Submission state
  const [submittedSuccess, setSubmittedSuccess] = useState(registration?.status === 'Pending');
  const [submittedCandidateName, setSubmittedCandidateName] = useState(registration?.fullName ?? '');

  // Messages
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    registration?.status === 'Rejected'
      ? `Your previous application was declined: ${registration.rejectionReason ?? 'no reason given'}. You can update your details and apply again.`
      : null
  );

  useEffect(() => {
    setSubmittedSuccess(registration?.status === 'Pending');
    if (registration?.fullName) setSubmittedCandidateName(registration.fullName);
  }, [registration?.status, registration?.fullName]);

  useEffect(() => {
    if (avatarUrl.startsWith('blob:')) return () => URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  // Restore the form saved before email confirmation, for the same email only.
  useEffect(() => {
    if (!isCompleting) return;
    const draft = readDraft();
    if (!draft || draft.email.toLowerCase() !== (prefill?.email ?? '').toLowerCase()) return;
    setName(draft.name || prefill?.fullName || '');
    setPhone(draft.phone);
    setAge(draft.age);
    setGender(draft.gender);
    setHeightCm(draft.heightCm);
    setCurrentWeightKg(draft.currentWeightKg);
    setTargetWeightKg(draft.targetWeightKg);
    setFitnessGoal(draft.fitnessGoal);
    setFitnessLevel(draft.fitnessLevel);
    setMedicalConditions(draft.medicalConditions);
    setInjuries(draft.injuries);
    setBodyConditionNotes(draft.bodyConditionNotes);
    setMembershipDuration(draft.membershipDuration);
    setAmountPaid(draft.amountPaid);
    setPaymentMethod(draft.paymentMethod);
    if (draft.avatarDataUrl) {
      fetch(draft.avatarDataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          setAvatarFile(blob);
          setAvatarUrl(URL.createObjectURL(blob));
          setPhotoFileName('Saved profile photo');
        })
        .catch(() => undefined);
    }
    setInfoMessage('We restored the details you entered. Check them and submit to finish your registration.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleting, prefill?.email]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file, 512);
      setAvatarFile(resized);
      setAvatarUrl(URL.createObjectURL(resized));
      setPhotoFileName(file.name);
      setPhotoError(null);
      setErrorMessage(null);
    } catch {
      setPhotoError(PHOTO_READ_ERROR);
    } finally {
      // Lets the same file be picked again after an error or a change of mind.
      input.value = '';
    }
  };

  const handleGoogle = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setErrorMessage(null);
    setInfoMessage(null);

    if (isSignUp) {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!signupEmail.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      if (!isCompleting && signupPassword.length < 8) {
        setErrorMessage('Please choose a password with at least 8 characters.');
        return;
      }
      if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
        setErrorMessage('Please enter a valid phone number.');
        return;
      }
      if (!avatarUrl) {
        setPhotoError('Please upload your profile photo.');
        setErrorMessage('Please upload your profile photo.');
        return;
      }
      if (!bodyConditionNotes.trim()) {
        setErrorMessage('Please describe your current body condition for your coach.');
        return;
      }
      const paid = Number(amountPaid);
      if (amountPaid.trim() === '' || !Number.isFinite(paid) || paid < 0) {
        setErrorMessage('Please enter the amount you have paid (enter 0 if you have not paid yet).');
        return;
      }

      setIsBusy(true);
      try {
        if (!isCompleting) {
          const { data, error } = await supabase.auth.signUp({
            email: signupEmail.trim(),
            password: signupPassword,
            options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin }
          });
          if (error) throw error;
          if (!data.session) {
            let avatarDataUrl: string | undefined;
            try {
              if (avatarFile) avatarDataUrl = await blobToDataUrl(avatarFile);
            } catch {
              avatarDataUrl = undefined;
            }
            writeDraft({
              email: signupEmail.trim(),
              name: name.trim(),
              phone: phone.trim(),
              avatarDataUrl,
              age,
              gender,
              heightCm,
              currentWeightKg,
              targetWeightKg,
              fitnessGoal,
              fitnessLevel,
              medicalConditions,
              injuries,
              bodyConditionNotes,
              membershipDuration,
              amountPaid,
              paymentMethod
            });
            setInfoMessage(
              'One more step: your registration has not been sent to the coach yet. Open the confirmation email we sent you, tap the link, then sign in here and tap Submit. Your details are saved and will be filled in for you.'
            );
            setIsSignUp(false);
            setEmail(signupEmail.trim());
            return;
          }
        }

        await storage.addRegistrationRequest({
          fullName: name.trim(),
          email: signupEmail.trim(),
          phone: phone.trim(),
          avatarFile,
          avatarUrl: avatarFile ? undefined : avatarUrl,
          age: parseInt(age) || 0,
          gender,
          heightCm: parseFloat(heightCm) || 0,
          currentWeightKg: parseFloat(currentWeightKg) || 0,
          targetWeightKg: parseFloat(targetWeightKg) || undefined,
          fitnessGoal,
          fitnessLevel,
          medicalConditions: medicalConditions.trim() || undefined,
          injuriesOrRestrictions: injuries.trim() || undefined,
          bodyConditionNotes: bodyConditionNotes.trim(),
          membershipDuration,
          amountPaid: Math.round(paid * 100) / 100,
          paymentMethod
        });

        writeDraft(null);
        setSubmittedCandidateName(name);
        setSubmittedSuccess(true);
        onRegistrationSubmitted();
      } catch (err) {
        setErrorMessage(friendlySignUpError((err as Error).message));
      } finally {
        setIsBusy(false);
      }
    } else {
      setIsBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setIsBusy(false);
      if (error) {
        setErrorMessage(
          /invalid login/i.test(error.message)
            ? 'Incorrect email or password. If you joined with Google, use Continue with Google.'
            : /email not confirmed/i.test(error.message)
              ? 'Please confirm your email first: open the link we emailed you (check Spam too), then sign in again to send your registration.'
              : friendlySignUpError(error.message)
        );
      }
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Enter your email address first, then tap "Forgot password?".');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (error) setErrorMessage(error.message);
    else setInfoMessage(`If an account exists for ${email.trim()}, a reset link is on its way.`);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F5F5F5] selection:bg-[#7155E8] selection:text-white overflow-x-clip">
      <div className="app-ambient" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`relative w-full ${
          isSignUp ? 'max-w-2xl' : 'max-w-md'
        } glass-strong rounded-3xl p-6 sm:p-8 space-y-6 z-10`}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/icons/logo-256.png"
            alt="Azim Trainer logo"
            width={80}
            height={80}
            className="inline-block w-20 h-20 rounded-[22px] object-cover shadow-[0_10px_28px_rgba(37,84,226,0.35)] mb-1"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717] font-sans">
            Azims Workout Manager
          </h1>
          <p className="text-xs text-neutral-400">
            {isSignUp
              ? 'New Athlete Registration with Body Condition Assessment'
              : 'Sign in to access your workout, diet & coaching portal'}
          </p>
        </div>

        {/* Notifications / Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {submittedSuccess ? (
            /* Application Submitted State */
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 bg-[#F0EEFC]/50 border border-[#7155E8]/30 rounded-3xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-[#7155E8] text-white mx-auto flex items-center justify-center shadow-[0_4px_16px_rgba(113,85,232,0.35)]">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7155E8] block mb-1">
                  Application Received
                </span>
                <h3 className="text-lg font-black text-[#171717]">
                  Thank you, {submittedCandidateName}!
                </h3>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed max-w-md mx-auto">
                  Your photograph, biometric metrics, and full body condition details have been submitted directly to your coach. You will be notified here once you are approved.
                </p>
                <div className="p-3.5 mt-3 bg-white rounded-2xl border border-neutral-100 text-xs text-neutral-500 text-left space-y-1">
                  <span className="font-bold text-[#171717] block">Coach Approval Required:</span>
                  <p>
                    Per club policy, your official member profile and personalized workout/diet blueprint will be generated once Coach Oliul Azim reviews and accepts your application.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-4 py-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={onRegistrationSubmitted}
                  className="px-4 py-2.5 rounded-xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-xs transition-all"
                >
                  Check approval status
                </button>
              </div>
            </motion.div>
          ) : (
            /* Main Auth Form */
            <motion.form
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSubmit}
              className="space-y-4 text-xs"
            >
              {!isCompleting && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={isBusy}
                    className="w-full py-3 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-[#171717] transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span className="h-px flex-1 bg-neutral-200" />
                    {isSignUp ? 'or register with email' : 'or sign in with email'}
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>
                </div>
              )}

              {isSignUp ? (
                /* FULL REGISTRATION FORM WITH BODY CONDITION */
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Submit your photo and body assessment. Coach Oliul Azim will review your condition and approve your account before your profile is created.
                    </span>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#171717] font-bold mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Tanvir Hossain"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#171717] font-bold mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl font-mono focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#171717] font-bold mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="email"
                          required
                          readOnly={isCompleting}
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="athlete@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors"
                        />
                      </div>
                    </div>

                    {!isCompleting && (
                    <div>
                      <label className="block text-[#171717] font-bold mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Member Photograph Preview / Upload */}
                  <div>
                    <span className="block text-[#171717] font-bold mb-1">
                      Member Photograph *
                    </span>
                    <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-2xl border border-neutral-200/80">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Selected profile photo preview"
                          className="w-12 h-12 rounded-2xl object-cover border border-white shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="font-bold text-[#171717] block truncate">
                          {photoFileName || 'Add your profile photo'}
                        </span>
                        <label className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#7155E8] text-white cursor-pointer transition-colors hover:bg-[#6245DE] focus-within:ring-2 focus-within:ring-[#7155E8] focus-within:ring-offset-2">
                          <Upload className="w-3 h-3" />
                          {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handlePhotoChange}
                          />
                        </label>
                      </div>
                    </div>
                    {photoError && (
                      <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                        {photoError}
                      </p>
                    )}
                  </div>

                  {/* Biometrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono">
                    <div>
                      <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Age</label>
                      <input
                        type="number"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-sans"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={currentWeightKg}
                        onChange={(e) => setCurrentWeightKg(e.target.value)}
                        className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl text-[#7155E8] font-bold"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-sans font-bold text-neutral-500 mb-1">Target (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        className="w-full p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl text-[#10B981] font-bold"
                      />
                    </div>
                  </div>

                  {/* Fitness Goal & Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#171717] font-bold mb-1">Primary Fitness Goal</label>
                      <select
                        value={fitnessGoal}
                        onChange={(e) => setFitnessGoal(e.target.value)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-semibold"
                      >
                        <option value="Muscle Building & Hypertrophy">Muscle Building & Hypertrophy</option>
                        <option value="Fat Loss & Lean Definition">Fat Loss & Lean Definition</option>
                        <option value="Strength & Powerlifting">Strength & Powerlifting</option>
                        <option value="Cardio Stamina & General Health">Cardio Stamina & General Health</option>
                        <option value="Posture & Core Recomposition">Posture & Core Recomposition</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#171717] font-bold mb-1">Experience Level</label>
                      <select
                        value={fitnessLevel}
                        onChange={(e) => setFitnessLevel(e.target.value as any)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-semibold"
                      >
                        <option value="Beginner">Beginner (0 - 6 months)</option>
                        <option value="Intermediate">Intermediate (6 months - 2 years)</option>
                        <option value="Advanced">Advanced (2+ years training)</option>
                        <option value="Athlete">Athlete / Competitive</option>
                      </select>
                    </div>
                  </div>

                  {/* Membership Duration & Payment */}
                  <fieldset className="p-3.5 sm:p-4 bg-[#F0EEFC]/50 border border-[#7155E8]/20 rounded-2xl space-y-3">
                    <legend className="sr-only">Membership and payment</legend>
                    <div>
                      <span id="duration-label" className="block text-[#171717] font-bold mb-1.5">
                        Trainer Membership Duration *
                      </span>
                      <div role="radiogroup" aria-labelledby="duration-label" className="grid grid-cols-3 gap-2">
                        {DURATION_OPTIONS.map((opt) => {
                          const selected = membershipDuration === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setMembershipDuration(opt.value)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                                selected
                                  ? 'bg-[#7155E8] border-[#7155E8] text-white shadow-[0_4px_12px_rgba(113,85,232,0.3)]'
                                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-[#7155E8]/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="reg-amount-paid" className="block text-[#171717] font-bold mb-1">
                          Amount Paid (৳) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">৳</span>
                          <input
                            id="reg-amount-paid"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            required
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder="e.g. 3500 (0 if not paid yet)"
                            className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-neutral-200/80 rounded-2xl font-mono focus:outline-none focus:border-[#7155E8] transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="reg-payment-method" className="block text-[#171717] font-bold mb-1">
                          Payment Method *
                        </label>
                        <select
                          id="reg-payment-method"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as RegistrationPaymentMethod)}
                          className="w-full p-2.5 bg-white border border-neutral-200/80 rounded-2xl font-semibold focus:outline-none focus:border-[#7155E8] transition-colors"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      Your coach confirms this payment when approving your registration.
                    </p>
                  </fieldset>

                  {/* Body Condition & Assessment Details */}
                  <div>
                    <label className="block text-[#171717] font-bold mb-1 flex flex-wrap items-center justify-between gap-1">
                      <span>Full Body Condition & Physical Details *</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Required for Coach Oliul Azim</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={bodyConditionNotes}
                      onChange={(e) => setBodyConditionNotes(e.target.value)}
                      placeholder="Describe your current body shape, fat distribution, daily energy, back/neck posture, past sports history, and goals."
                      className="w-full p-3 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Medical Conditions (Optional)</label>
                      <input
                        type="text"
                        value={medicalConditions}
                        onChange={(e) => setMedicalConditions(e.target.value)}
                        placeholder="e.g. Asthma, High BP, None"
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Injuries / Restrictions (Optional)</label>
                      <input
                        type="text"
                        value={injuries}
                        onChange={(e) => setInjuries(e.target.value)}
                        placeholder="e.g. Lower back pain, None"
                        className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* SIGN IN FORM */
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#171717] font-bold mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[#171717] font-bold">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-neutral-400 hover:text-[#7155E8] text-[11px] font-semibold transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-2"
              >
                <span>
                  {isBusy ? 'Please wait…' : isSignUp ? 'Submit Registration Application for Coach Approval' : 'Sign In'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Toggle Mode */}
        {!submittedSuccess && isCompleting && (
          <div className="text-center pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            Signed in as <span className="font-semibold text-[#171717]">{signupEmail}</span>.{' '}
            <button type="button" onClick={onSignOut} className="font-bold text-[#7155E8] hover:underline cursor-pointer">
              Use a different account
            </button>
          </div>
        )}

        {!submittedSuccess && !isCompleting && (
          <div className="text-center pt-2 border-t border-neutral-100">
            <span className="text-xs text-neutral-500">
              {isSignUp ? 'Already have an approved account?' : 'New athlete?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="font-bold text-[#7155E8] hover:underline cursor-pointer"
              >
                {isSignUp ? 'Sign In here' : 'Register with Body Assessment'}
              </button>
            </span>
          </div>
        )}

      </motion.div>
    </div>
  );
};
