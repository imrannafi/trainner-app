import React, { useState } from 'react';
import {
  Home,
  Users,
  Plus,
  Flame,
  User,
  Compass,
  Bell,
  Utensils,
  CreditCard,
  Calendar,
  Send,
  FileSpreadsheet,
  X,
  TrendingUp,
  Camera,
  Dumbbell,
  Scale,
  UserPlus,
  LogOut,
  Settings
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { UserRole, Member } from '../../types';
import { Avatar, useBodyScrollLock } from './CommonUI';

export interface AccountSummary {
  name: string;
  subtitle: string;
  avatarUrl?: string;
}

interface FloatingBottomNavProps {
  currentRole: UserRole;
  currentMember?: Member;
  account: AccountSummary;
  activeTab: string;
  onSelectTab: (tab: string, meta?: any) => void;
  onOpenSettings: () => void;
  pendingMealCount: number;
  unreadNoticesCount: number;
  pendingRequestsCount?: number;
  onOpenAddMember: () => void;
  onOpenDirectEnroll?: () => void;
  onOpenRecordPayment: () => void;
  onLogout?: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentRole,
  currentMember,
  account,
  activeTab,
  onSelectTab,
  onOpenSettings,
  pendingMealCount,
  unreadNoticesCount,
  pendingRequestsCount = 0,
  onOpenAddMember,
  onOpenDirectEnroll,
  onOpenRecordPayment,
  onLogout
}) => {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);

  useBodyScrollLock(showMoreDrawer || showQuickLogModal);

  const handleCenterAction = () => {
    if (currentRole === 'trainer') {
      onOpenAddMember();
    } else {
      setShowQuickLogModal(true);
    }
  };

  // Active tab mappings
  const isTrainerHome = activeTab === 'dashboard';
  const isTrainerMembers = activeTab === 'members';
  const isTrainerActivity = activeTab === 'fitness' || activeTab === 'meal-hub';
  const isTrainerProfile =
    activeTab === 'reports' ||
    activeTab === 'payments' ||
    activeTab === 'schedule' ||
    activeTab === 'notices';

  const isMemberHome = activeTab === 'member-dashboard';
  const isMemberExplore =
    activeTab === 'member-workout' ||
    activeTab === 'member-diet' ||
    activeTab === 'member-attendance';
  const isMemberInbox = activeTab === 'member-notices';
  const isMemberProfile =
    activeTab === 'member-progress' ||
    activeTab === 'member-payments' ||
    activeTab === 'member-schedule';

  return (
    <>
      {/* Floating Bottom Dock - z-30 so Header popovers (z-50) & Modals (z-[100]) always layer cleanly above */}
      <aside
        aria-label="Bottom Navigation Bar"
        className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-30 flex justify-center px-3 sm:px-4 pointer-events-none safe-area-bottom"
      >
        <div className="pointer-events-auto relative w-full max-w-[390px] sm:max-w-[430px]">
          <div className="relative bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.12)] rounded-[28px] px-2 py-2 grid grid-cols-5 items-center gap-1 ring-1 ring-black/5">
            {/* TRAINER NAVIGATION (5 Equal Columns - Zero Protrusion Overlap) */}
            {currentRole === 'trainer' && (
              <>
                {/* 1. Home */}
                <button
                  type="button"
                  onClick={() => onSelectTab('dashboard')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isTrainerHome ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Home"
                >
                  {isTrainerHome && (
                    <motion.span
                      layoutId="bottomNavHighlightTrainer"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <Home className={`w-5 h-5 ${isTrainerHome ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isTrainerHome ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Home
                  </span>
                </button>

                {/* 2. Members */}
                <button
                  type="button"
                  onClick={() => onSelectTab('members')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isTrainerMembers ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Members"
                >
                  {isTrainerMembers && (
                    <motion.span
                      layoutId="bottomNavHighlightTrainer"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <Users className={`w-5 h-5 ${isTrainerMembers ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isTrainerMembers ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Members
                  </span>
                </button>

                {/* 3. Center Action Button (Contained cleanly inside grid cell) */}
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={handleCenterAction}
                    aria-label="Member Registration Requests"
                    className="w-12 h-12 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white flex items-center justify-center shadow-[0_6px_18px_rgba(113,85,232,0.4)] transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-none relative cursor-pointer"
                  >
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-neutral-900 text-[10px] font-extrabold border-2 border-white flex items-center justify-center shadow-xs tabular-nums">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* 4. Activity */}
                <button
                  type="button"
                  onClick={() => onSelectTab('meal-hub')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isTrainerActivity ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Activity"
                >
                  {isTrainerActivity && (
                    <motion.span
                      layoutId="bottomNavHighlightTrainer"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <div className="relative">
                    <Flame className={`w-5 h-5 ${isTrainerActivity ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                    {pendingMealCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono ring-1 ring-white tabular-nums">
                        {pendingMealCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isTrainerActivity ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Meals
                  </span>
                </button>

                {/* 5. More / Profile */}
                <button
                  type="button"
                  onClick={() => setShowMoreDrawer(true)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isTrainerProfile ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="More Options and Profile"
                >
                  {isTrainerProfile && (
                    <motion.span
                      layoutId="bottomNavHighlightTrainer"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <User className={`w-5 h-5 ${isTrainerProfile ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isTrainerProfile ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Menu
                  </span>
                </button>
              </>
            )}

            {/* MEMBER NAVIGATION (5 Equal Columns) */}
            {currentRole === 'member' && (
              <>
                {/* 1. Home */}
                <button
                  type="button"
                  onClick={() => onSelectTab('member-dashboard')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isMemberHome ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Home"
                >
                  {isMemberHome && (
                    <motion.span
                      layoutId="bottomNavHighlightMember"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <Home className={`w-5 h-5 ${isMemberHome ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isMemberHome ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Home
                  </span>
                </button>

                {/* 2. Explore */}
                <button
                  type="button"
                  onClick={() => onSelectTab('member-workout')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isMemberExplore ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Workout Plans"
                >
                  {isMemberExplore && (
                    <motion.span
                      layoutId="bottomNavHighlightMember"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <Compass className={`w-5 h-5 ${isMemberExplore ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isMemberExplore ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Plans
                  </span>
                </button>

                {/* 3. Center Action Button (Quick Log) */}
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={handleCenterAction}
                    aria-label="Quick Activity Log"
                    className="w-12 h-12 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white flex items-center justify-center shadow-[0_6px_18px_rgba(113,85,232,0.4)] transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </button>
                </div>

                {/* 4. Inbox */}
                <button
                  type="button"
                  onClick={() => onSelectTab('member-notices')}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isMemberInbox ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Inbox"
                >
                  {isMemberInbox && (
                    <motion.span
                      layoutId="bottomNavHighlightMember"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <div className="relative">
                    <Bell className={`w-5 h-5 ${isMemberInbox ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                    {unreadNoticesCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono ring-1 ring-white tabular-nums">
                        {unreadNoticesCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isMemberInbox ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Inbox
                  </span>
                </button>

                {/* 5. Menu / Profile */}
                <button
                  type="button"
                  onClick={() => setShowMoreDrawer(true)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors duration-150 active:scale-95 cursor-pointer ${
                    isMemberProfile ? 'text-[#7155E8]' : 'text-neutral-400 hover:text-neutral-800'
                  }`}
                  aria-label="Account Menu"
                >
                  {isMemberProfile && (
                    <motion.span
                      layoutId="bottomNavHighlightMember"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#F0EEFC]/80 rounded-2xl -z-10"
                    />
                  )}
                  <User className={`w-5 h-5 ${isMemberProfile ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span
                    className={`text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isMemberProfile ? 'text-[#7155E8]' : 'text-neutral-500'
                    }`}
                  >
                    Menu
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Member Quick Log Action Modal */}
      <AnimatePresence>
        {showQuickLogModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
              onClick={() => setShowQuickLogModal(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="font-bold text-base text-[#171717]">Quick Activity Log</h3>
                  <p className="text-xs text-neutral-500">Record your nutrition or workout for today</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickLogModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickLogModal(false);
                    onSelectTab('member-meallog');
                  }}
                  className="p-3.5 rounded-2xl bg-[#F5F5F5] hover:bg-[#F0EEFC] border border-neutral-200/60 hover:border-[#7155E8]/30 text-left flex items-center gap-3.5 transition-all group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-white text-[#7155E8] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#171717] group-hover:text-[#7155E8] block truncate">
                      Upload Meal Photo Evidence
                    </span>
                    <span className="text-xs text-neutral-500 block truncate">
                      Log breakfast, lunch, snack, or dinner
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowQuickLogModal(false);
                    onSelectTab('member-workout');
                  }}
                  className="p-3.5 rounded-2xl bg-[#F5F5F5] hover:bg-[#F0EEFC] border border-neutral-200/60 hover:border-[#7155E8]/30 text-left flex items-center gap-3.5 transition-all group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-white text-[#10B981] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#171717] group-hover:text-[#7155E8] block truncate">
                      Complete Today's Workout
                    </span>
                    <span className="text-xs text-neutral-500 block truncate">
                      Check off exercises, sets, and weights
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowQuickLogModal(false);
                    onSelectTab('member-progress');
                  }}
                  className="p-3.5 rounded-2xl bg-[#F5F5F5] hover:bg-[#F0EEFC] border border-neutral-200/60 hover:border-[#7155E8]/30 text-left flex items-center gap-3.5 transition-all group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-white text-[#F59E0B] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#171717] group-hover:text-[#7155E8] block truncate">
                      Log Weight & Body Metrics
                    </span>
                    <span className="text-xs text-neutral-500 block truncate">
                      Update current body weight and waist stats
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide-Up Profile & Application Hub Drawer */}
      <AnimatePresence>
        {showMoreDrawer && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
              onClick={() => setShowMoreDrawer(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-neutral-200 p-6 pb-8 space-y-4 max-h-[86vh] overflow-y-auto z-10"
            >
              {/* Grab Handle on mobile */}
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-1 sm:hidden" />

              <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-[#171717] truncate">
                    {currentRole === 'trainer' ? 'Trainer Command & Menu' : 'Member Account & Services'}
                  </h3>
                  <p className="text-xs text-neutral-500 truncate">
                    {currentRole === 'trainer'
                      ? 'Workout builder, payment ledgers, PT calendar, and notices'
                      : 'Personal invoices, coach schedule, and body reports'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreDrawer(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Signed-in account */}
              <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-neutral-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={account.avatarUrl} name={account.name} size="md" />
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#171717] block truncate">{account.name}</span>
                    <span className="text-xs text-neutral-500 block truncate">{account.subtitle}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onOpenSettings();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-neutral-200 text-[#171717] hover:bg-neutral-100 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>

              {/* Trainer Management Modules */}
              {currentRole === 'trainer' && (
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-bold text-neutral-400 block">
                    Management Sections
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('fitness');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7155E8] flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Plan Builder
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">Workouts & Diets</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('payments');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Payments & Dues
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">bKash ledger</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('schedule');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#7155E8] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          PT Schedule
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">1-on-1 Sessions</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('notices');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Notices
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">Gym broadcasts</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('reports');
                        setShowMoreDrawer(false);
                      }}
                      className="col-span-2 p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Audit & Financial Reports
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">
                          Exportable CSV ledgers & compliance metrics
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreDrawer(false);
                        if (onOpenDirectEnroll) onOpenDirectEnroll();
                        else onOpenAddMember();
                      }}
                      className="py-2.5 px-3 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 shrink-0" /> Enroll Member
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreDrawer(false);
                        onOpenRecordPayment();
                      }}
                      className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
                    >
                      <CreditCard className="w-4 h-4 shrink-0" /> Record Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Member Account Modules */}
              {currentRole === 'member' && (
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-bold text-neutral-400 block">
                    Member Portal Hub
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('member-diet');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Diet Blueprint
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">Meal schedule</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('member-payments');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          My Invoices
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">bKash receipts</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('member-schedule');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          PT Schedule
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">Coach bookings</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('member-progress');
                        setShowMoreDrawer(false);
                      }}
                      className="p-3 rounded-2xl border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-left flex items-center gap-2.5 transition-colors group shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7155E8] flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#171717] group-hover:text-[#7155E8] block truncate">
                          Body Metrics
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate">Weight & waist</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Drawer Bottom Actions: Sign Out */}
              {onLogout && (
                <div className="pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreDrawer(false);
                      onLogout();
                    }}
                    className="w-full py-2.5 text-center text-xs font-semibold text-[#EF4444] hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
};
