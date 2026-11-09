import React, { useState } from 'react';
import { MembershipDuration } from '../../types';
import { Modal, showToast } from '../common/CommonUI';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (data: any) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+880 1');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState('Male');
  const [heightCm, setHeightCm] = useState('175');
  const [currentWeightKg, setCurrentWeightKg] = useState('75');
  const [fitnessGoal, setFitnessGoal] = useState('Muscle Building & Athletic Conditioning');
  const [fitnessLevel, setFitnessLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete'>('Intermediate');
  const [trainingPreferences] = useState('Barbell, dumbbells, and high intensity conditioning');
  const [medicalConditions] = useState('None');
  const [injuries, setInjuries] = useState('None');
  const [membershipDuration, setMembershipDuration] = useState<MembershipDuration>('3 months');
  const [packagePrice, setPackagePrice] = useState('24000');
  const [totalSessions, setTotalSessions] = useState('36');
  const [emergencyName] = useState('');
  const [emergencyPhone] = useState('');
  const [emergencyRelation] = useState('Family');
  const [avatarUrl, setAvatarUrl] = useState('/src/assets/images/member_avatar_male_1793655258127.jpg');
  const [trainerNotes, setTrainerNotes] = useState('New client assessment completed.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Client name and email address are required.', 'error');
      return;
    }

    // Calculate dates
    const start = new Date().toISOString().split('T')[0];
    const d = new Date();
    const monthsToAdd =
      membershipDuration === '1 month'
        ? 1
        : membershipDuration === '3 months'
        ? 3
        : membershipDuration === '6 months'
        ? 6
        : 12;
    d.setMonth(d.getMonth() + monthsToAdd);
    const end = d.toISOString().split('T')[0];

    const dDeadline = new Date();
    dDeadline.setDate(dDeadline.getDate() + 7);
    const deadline = dDeadline.toISOString().split('T')[0];

    const sessionsNum = parseInt(totalSessions) || 24;

    onAddMember({
      userId: `usr-${fullName.toLowerCase().replace(/[^a-z]/g, '')}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone,
      avatarUrl,
      age: parseInt(age) || 25,
      gender,
      heightCm: parseInt(heightCm) || 175,
      currentWeightKg: parseFloat(currentWeightKg) || 75,
      emergencyContact: {
        name: emergencyName || 'Family Contact',
        phone: emergencyPhone || phone,
        relation: emergencyRelation
      },
      fitnessGoal,
      fitnessLevel,
      trainingPreferences,
      medicalConditions: medicalConditions !== 'None' ? medicalConditions : undefined,
      injuriesOrRestrictions: injuries !== 'None' ? injuries : undefined,
      trainerPrivateNotes: trainerNotes,
      membershipStartDate: start,
      membershipEndDate: end,
      membershipDuration,
      trainingFrequencyPerWeek: 3,
      totalPackageSessions: sessionsNum,
      remainingSessions: sessionsNum,
      packagePrice: parseFloat(packagePrice) || 20000,
      nextPaymentDeadline: deadline,
      paymentStatus: 'Unpaid',
      status: 'Active',
      activationStatus: 'Active'
    });

    const enrolledName = fullName.trim();
    setFullName('');
    setEmail('');
    onClose();
    showToast(`Client ${enrolledName} enrolled! Temporary activation code generated.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll New Gym Member"
      description="Set profile details, package pricing, coaching duration, and activation terms"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Personal Info */}
        <div>
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-2.5">
            1. Personal Information & Photograph
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mahinul Islam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="mahin@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-neutral-600 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-neutral-600 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-neutral-600 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Photo selector */}
        <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt="Avatar preview"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-cover border border-neutral-300 shrink-0"
            />
            <div>
              <span className="font-semibold text-neutral-900 block">Athlete Profile Photo</span>
              <span className="text-[11px] text-neutral-500">Pick from studio portraits:</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAvatarUrl('/src/assets/images/member_avatar_male_1793655258127.jpg')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${
                avatarUrl.includes('male')
                  ? 'bg-[#7155E8] text-white border-[#7155E8]'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Male Avatar
            </button>
            <button
              type="button"
              onClick={() => setAvatarUrl('/src/assets/images/member_avatar_female_1793655258393.jpg')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${
                avatarUrl.includes('female')
                  ? 'bg-[#7155E8] text-white border-[#7155E8]'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Female Avatar
            </button>
          </div>
        </div>

        {/* Fitness Assessment */}
        <div className="pt-2 border-t border-neutral-100">
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-2.5">
            2. Fitness Goals & Assessment
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Primary Fitness Goal</label>
              <input
                type="text"
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Fitness Level</label>
              <select
                value={fitnessLevel}
                onChange={(e: any) => setFitnessLevel(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Athlete">Athlete</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Initial Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Injuries / Exercise Restrictions</label>
              <input
                type="text"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="e.g. Mild lower back sensitivity"
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Membership & Payment */}
        <div className="pt-2 border-t border-neutral-100">
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-2.5">
            3. Membership Terms & Pricing (BDT)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Duration</label>
              <select
                value={membershipDuration}
                onChange={(e: any) => setMembershipDuration(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="12 months">12 months</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Total Package Price (৳)</label>
              <input
                type="number"
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Total 1-on-1 Sessions</label>
              <input
                type="number"
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Private Trainer Note</label>
          <input
            type="text"
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-neutral-200 rounded-2xl font-bold text-xs text-neutral-600 hover:bg-[#F5F5F5] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white font-bold text-xs rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all active:scale-95"
          >
            Enroll Client & Send Invitation
          </button>
        </div>
      </form>
    </Modal>
  );
};
