import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Dumbbell,
  ChevronDown,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { UserRole, Member, InAppNotification } from '../../types';
import { Avatar, showToast } from './CommonUI';

interface HeaderProps {
  currentRole: UserRole;
  currentMember?: Member;
  allMembers: Member[];
  onSwitchRole: (role: UserRole, memberId?: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  notifications: InAppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onResetData: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentMember,
  allMembers,
  onSwitchRole,
  activeTab,
  onSelectTab,
  notifications,
  onMarkNotificationRead,
  onResetData,
  onLogout
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click or Escape key
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (roleRef.current && !roleRef.current.contains(target)) {
        setShowRoleMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowRoleMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const trainerNavLinks = [
    { id: 'dashboard', label: 'Home' },
    { id: 'members', label: 'Members' },
    { id: 'fitness', label: 'Workouts' },
    { id: 'meal-hub', label: 'Meals' },
    { id: 'payments', label: 'Payments' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'notices', label: 'Notices' },
    { id: 'reports', label: 'Reports' }
  ];

  const memberNavLinks = [
    { id: 'member-dashboard', label: 'Home' },
    { id: 'member-workout', label: 'Workout' },
    { id: 'member-diet', label: 'Diet Plan' },
    { id: 'member-meallog', label: 'Log Meal' },
    { id: 'member-progress', label: 'Progress' },
    { id: 'member-payments', label: 'Invoices' },
    { id: 'member-notices', label: 'Notices' }
  ];

  const navLinks = currentRole === 'trainer' ? trainerNavLinks : memberNavLinks;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:gap-5 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab(currentRole === 'trainer' ? 'dashboard' : 'member-dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#7155E8] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(113,85,232,0.32)] group-hover:scale-105 transition-transform duration-150 shrink-0">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#171717] whitespace-nowrap">
                Azims Workout Manager
              </span>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links (No Scrollbar Overlap + Animated Active Pill) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center justify-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1 py-1 px-2"
          >
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onSelectTab(link.id)}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-neutral-600 hover:text-[#171717] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="headerActiveNavPill"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#171717] -z-10"
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Notifications & Account Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowRoleMenu(false);
                }}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors relative active:scale-95 cursor-pointer ${
                  showNotifications
                    ? 'bg-[#F0EEFC] text-[#7155E8]'
                    : 'bg-[#F5F5F5] hover:bg-neutral-200/70 text-neutral-700'
                }`}
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono ring-2 ring-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover - Mobile viewport safe */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed left-4 right-4 top-[4.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-neutral-200/80 p-4 z-50 text-xs"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <span className="font-bold text-sm text-[#171717]">Notifications</span>
                      <span className="text-[11px] font-semibold text-[#7155E8] font-mono tabular-nums">
                        {unreadCount} Unread
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto mt-2.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-neutral-400 text-xs">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              onMarkNotificationRead(n.id);
                              if (n.linkTab) {
                                onSelectTab(n.linkTab);
                                setShowNotifications(false);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-2xl cursor-pointer transition-colors ${
                              n.isRead
                                ? 'opacity-75 hover:bg-[#F5F5F5]'
                                : 'bg-[#F0EEFC]/60 hover:bg-[#F0EEFC]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-[#171717] leading-snug">{n.title}</span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#7155E8] shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-neutral-500 mt-1 leading-snug">{n.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1.5 font-mono">
                              <span>{n.createdAt.split('T')[0]}</span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{n.category}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Role Switcher Pill */}
            <div className="relative" ref={roleRef}>
              <button
                type="button"
                onClick={() => {
                  setShowRoleMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                aria-expanded={showRoleMenu}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200/80 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-neutral-200 cursor-pointer"
              >
                <Avatar
                  src={
                    currentRole === 'trainer'
                      ? '/src/assets/images/oliul_azim_coach_1794068467381.jpg'
                      : currentMember?.avatarUrl
                  }
                  name={currentRole === 'trainer' ? 'Coach Oliul' : currentMember?.fullName || 'User'}
                  size="xs"
                />
                <span className="text-xs font-bold text-[#171717] max-w-[92px] sm:max-w-[116px] truncate whitespace-nowrap">
                  {currentRole === 'trainer'
                    ? 'Coach Oliul'
                    : currentMember?.fullName.split(' ')[0] || 'Member'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-150 ${
                    showRoleMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {showRoleMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed right-4 left-4 sm:left-auto top-[4.5rem] sm:absolute sm:right-0 sm:top-full sm:mt-2.5 sm:w-68 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-neutral-200/80 p-3 z-50 text-xs"
                  >
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400">
                      Switch Active Portal
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole('trainer');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                        currentRole === 'trainer'
                          ? 'bg-[#F0EEFC] font-bold text-[#7155E8]'
                          : 'hover:bg-[#F5F5F5] text-[#171717]'
                      }`}
                    >
                      <Avatar
                        src="/src/assets/images/oliul_azim_coach_1794068467381.jpg"
                        name="Coach Oliul"
                        size="xs"
                      />
                      <div className="min-w-0">
                        <span className="block font-bold text-xs truncate">Coach Oliul Azim</span>
                        <span className="text-[10px] text-neutral-400 block truncate">
                          Head Coach & Admin
                        </span>
                      </div>
                    </button>

                    <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold text-neutral-400">
                      Gym Athletes
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                      {allMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onSwitchRole('member', m.id);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left p-2 rounded-2xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                            currentRole === 'member' && currentMember?.id === m.id
                              ? 'bg-[#F0EEFC] font-bold text-[#7155E8]'
                              : 'hover:bg-[#F5F5F5] text-neutral-700'
                          }`}
                        >
                          <Avatar src={m.avatarUrl} name={m.fullName} size="xs" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-semibold text-xs truncate">{m.fullName}</span>
                            <span className="text-[10px] text-neutral-400 block truncate">
                              {m.fitnessGoal}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-neutral-100 pt-2 mt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          onResetData();
                          showToast('Demo data restored to initial state.', 'info');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-[#F5F5F5] text-neutral-600 flex items-center gap-2 text-xs font-medium cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="whitespace-nowrap">Reset Demo Data</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-red-50 text-[#EF4444] flex items-center gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
