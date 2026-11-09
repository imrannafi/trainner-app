import React, { useState } from 'react';
import {
  Dumbbell,
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
import { UserRole, Member, MemberRegistrationRequest } from '../../types';

const MAX_PHOTO_DIMENSION = 512;

// Photos are persisted in localStorage (~5 MB total), so originals must be downscaled to fit.
const resizePhotoToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas is not available'));
        return;
      }
      // JPEG has no alpha channel; without this, transparent areas turn black.
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be decoded'));
    };
    image.src = objectUrl;
  });

interface AuthPageProps {
  onLogin: (role: UserRole, memberId?: string) => void;
  allMembers: Member[];
  onActivateAccount: (memberId: string) => void;
  onSubmitRegistrationRequest: (
    data: Omit<MemberRegistrationRequest, 'id' | 'submittedAt' | 'status'>
  ) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  allMembers,
  onSubmitRegistrationRequest
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In inputs
  const [email, setEmail] = useState('tariq@apexperformance.bd');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up inputs (Member registration with full body condition & photo)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('017');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('pass1234');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [age, setAge] = useState('26');
  const [gender, setGender] = useState('Male');
  const [heightCm, setHeightCm] = useState('175');
  const [currentWeightKg, setCurrentWeightKg] = useState('78');
  const [targetWeightKg, setTargetWeightKg] = useState('70');
  const [fitnessGoal, setFitnessGoal] = useState('Muscle Building & Hypertrophy');
  const [fitnessLevel, setFitnessLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete'>('Beginner');
  const [medicalConditions, setMedicalConditions] = useState('None');
  const [injuries, setInjuries] = useState('None');
  const [bodyConditionNotes, setBodyConditionNotes] = useState(
    'Sedentary lifestyle with desk job for 2 years. High belly fat, low stamina, slight posture slouch. Looking for structured progressive guidance.'
  );

  // Submission state
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedCandidateName, setSubmittedCandidateName] = useState('');

  // Messages
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Not an image file');
      }
      setAvatarUrl(await resizePhotoToDataUrl(file));
      setPhotoFileName(file.name);
      setPhotoError(null);
      setErrorMessage(null);
    } catch {
      setPhotoError('That file could not be read as a photo. Please choose a JPG or PNG image.');
    } finally {
      // Lets the same file be picked again after an error or a change of mind.
      input.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!phone.trim() || phone.length < 10) {
        setErrorMessage('Please enter a valid phone number.');
        return;
      }
      if (!avatarUrl) {
        setPhotoError('Please upload your profile photo.');
        setErrorMessage('Please upload your profile photo.');
        return;
      }
      if (!bodyConditionNotes.trim()) {
        setErrorMessage('Please provide your current body condition details for Coach Oliul Azim.');
        return;
      }

      onSubmitRegistrationRequest({
        fullName: name.trim(),
        email: signupEmail.trim(),
        phone: phone.trim(),
        password: signupPassword,
        avatarUrl,
        age: parseInt(age) || 25,
        gender,
        heightCm: parseFloat(heightCm) || 175,
        currentWeightKg: parseFloat(currentWeightKg) || 75,
        targetWeightKg: parseFloat(targetWeightKg) || 70,
        fitnessGoal,
        fitnessLevel,
        medicalConditions,
        injuriesOrRestrictions: injuries,
        bodyConditionNotes: bodyConditionNotes.trim(),
        frontPhotoUrl: avatarUrl,
        membershipDuration: '1 month'
      });

      setSubmittedCandidateName(name);
      setSubmittedSuccess(true);
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      if (
        trimmedEmail.includes('azim') ||
        trimmedEmail.includes('oliul') ||
        trimmedEmail.includes('tariq') ||
        trimmedEmail.includes('trainer') ||
        trimmedEmail.includes('admin') ||
        trimmedEmail.includes('apexperformance.bd') ||
        trimmedEmail.includes('workoutmanager.com')
      ) {
        onLogin('trainer');
      } else {
        const matched = allMembers.find((m) => m.email.toLowerCase() === trimmedEmail);
        if (matched) {
          onLogin('member', matched.id);
        } else {
          onLogin('member', allMembers[0]?.id || 'mem-01');
        }
      }
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage(`Password reset instructions sent to ${email || 'your email'}!`);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F5F5F5] selection:bg-[#7155E8] selection:text-white overflow-x-clip">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full ${
          isSignUp ? 'max-w-2xl' : 'max-w-md'
        } bg-white border border-neutral-200/70 rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] space-y-6 z-10`}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7155E8] text-white shadow-[0_4px_16px_rgba(113,85,232,0.35)] mb-1">
            <Dumbbell className="w-6 h-6 stroke-[2.2]" />
          </div>
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
                  Your photograph, biometric metrics, and full body condition details have been submitted directly to <strong>Coach Oliul Azim</strong>.
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
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setIsSignUp(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onLogin('trainer')}
                  className="px-4 py-2.5 rounded-xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-xs transition-all"
                >
                  Switch to Coach Portal (Review Application)
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
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="athlete@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-2xl focus:bg-white focus:outline-none focus:border-[#7155E8] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#171717] font-bold mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
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

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-neutral-300 text-[#7155E8] focus:ring-[#7155E8]"
                      />
                      <span className="text-neutral-500 font-medium">Remember me</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-2"
              >
                <span>
                  {isSignUp ? 'Submit Registration Application for Coach Approval' : 'Sign In'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Toggle Mode */}
        {!submittedSuccess && (
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

        {/* 1-Tap Quick Demo Credentials */}
        {!submittedSuccess && (
          <div className="p-3.5 rounded-2xl bg-[#F5F5F5] border border-neutral-200/60 space-y-2 text-xs">
            <span className="font-bold text-neutral-500 text-[10px] uppercase tracking-wider block">
              1-Tap Demo Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('oliul.azim@workoutmanager.com');
                  onLogin('trainer');
                }}
                className="p-2.5 rounded-xl bg-white border border-neutral-200/80 hover:border-[#7155E8] transition-colors text-left"
              >
                <span className="font-bold text-[#171717] block">Coach Oliul Azim</span>
                <span className="text-[10px] text-neutral-400 block font-mono">Head Coach Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const m = allMembers[0];
                  setEmail(m?.email || 'farhan@apexperformance.bd');
                  onLogin('member', m?.id);
                }}
                className="p-2.5 rounded-xl bg-white border border-neutral-200/80 hover:border-[#7155E8] transition-colors text-left"
              >
                <span className="font-bold text-[#171717] block">Farhan (Athlete)</span>
                <span className="text-[10px] text-neutral-400 block font-mono">Active Client Portal</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
