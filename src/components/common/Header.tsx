import React, { useState, useRef, useEffect } from 'react';
import { Bell, Dumbbell, ChevronDown, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { UserRole, InAppNotification } from '../../types';
import { Avatar } from './CommonUI';
import { relativeTime } from '../../lib/dates';
import type { AccountSummary } from './FloatingBottomNav';

interface HeaderProps {
  currentRole: UserRole;
  account: AccountSummary;
  isSuperAdmin: boolean;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  notifications: InAppNotification[];
  onOpenNotification: (notification: InAppNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onViewAllNotifications: () => void;
  onOpenSettings: () => void;
  onOpenStaffManager: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  account,
  isSuperAdmin,
  activeTab,
  onSelectTab,
  notifications,
  onOpenNotification,
  onMarkAllNotificationsRead,
  onViewAllNotifications,
  onOpenSettings,
  onOpenStaffManager,
  onLogout
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click or Escape key
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifications(false);
      if (accountRef.current && !accountRef.current.contains(target)) setShowAccountMenu(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowAccountMenu(false);
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

  const menuItem =
    'w-full text-left px-2.5 py-2 rounded-xl hover:bg-[#F5F5F5] text-neutral-700 flex items-center gap-2 text-xs font-medium cursor-pointer';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:gap-5 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => onSelectTab(currentRole === 'trainer' ? 'dashboard' : 'member-dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#7155E8] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(113,85,232,0.32)] group-hover:scale-105 transition-transform duration-150 shrink-0">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="hidden min-[400px]:inline text-base sm:text-lg font-extrabold tracking-tight text-[#171717] whitespace-nowrap truncate">
                Azims Workout Manager
              </span>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links */}
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
                    isActive ? 'text-white' : 'text-neutral-600 hover:text-[#171717] hover:bg-[#F5F5F5]'
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

          {/* Zone 3: Notifications & Account */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowAccountMenu(false);
                }}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors relative active:scale-95 cursor-pointer ${
                  showNotifications ? 'bg-[#F0EEFC] text-[#7155E8]' : 'bg-[#F5F5F5] hover:bg-neutral-200/70 text-neutral-700'
                }`}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={showNotifications}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono ring-2 ring-white tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed left-4 right-4 top-[4.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-neutral-200/80 p-4 z-50 text-xs"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100 gap-2">
                      <span className="font-bold text-sm text-[#171717]">Notifications</span>
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="text-[11px] font-semibold text-[#7155E8] hover:underline cursor-pointer"
                        >
                          Mark all read ({unreadCount})
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-neutral-400">All caught up</span>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-80 overflow-y-auto mt-2.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-neutral-400 text-xs">No notifications yet</div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setShowNotifications(false);
                              onOpenNotification(n);
                            }}
                            className={`w-full text-left p-3 rounded-2xl cursor-pointer transition-colors flex items-start gap-2.5 ${
                              n.isRead ? 'opacity-75 hover:bg-[#F5F5F5]' : 'bg-[#F0EEFC]/60 hover:bg-[#F0EEFC]'
                            }`}
                          >
                            {n.actorName && <Avatar src={n.actorAvatarUrl} name={n.actorName} size="sm" />}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-[#171717] leading-snug">{n.title}</span>
                                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#7155E8] shrink-0 mt-1" />}
                              </div>
                              <p className="text-neutral-500 mt-1 leading-snug line-clamp-2">{n.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1.5 font-mono">
                                <span>{relativeTime(n.createdAt)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="capitalize">{n.category}</span>
                                {n.imagePath && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Photo</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onViewAllNotifications();
                      }}
                      className="w-full mt-2 pt-2.5 border-t border-neutral-100 text-center text-[11px] font-bold text-[#7155E8] hover:underline cursor-pointer"
                    >
                      View notification history
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAccountMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                aria-expanded={showAccountMenu}
                aria-label="Account menu"
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200/80 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-neutral-200 cursor-pointer"
              >
                <Avatar src={account.avatarUrl} name={account.name} size="xs" />
                <span className="hidden sm:inline text-xs font-bold text-[#171717] max-w-[116px] truncate whitespace-nowrap">
                  {account.name.split(' ').slice(0, 2).join(' ')}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-150 ${
                    showAccountMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed right-4 left-4 sm:left-auto top-[4.5rem] sm:absolute sm:right-0 sm:top-full sm:mt-2.5 sm:w-64 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-neutral-200/80 p-3 z-50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 p-2.5 pb-3 border-b border-neutral-100">
                      <Avatar src={account.avatarUrl} name={account.name} size="sm" />
                      <div className="min-w-0">
                        <span className="block font-bold text-xs text-[#171717] truncate">{account.name}</span>
                        <span className="text-[10px] text-neutral-400 block truncate">{account.subtitle}</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-1">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAccountMenu(false);
                            onOpenStaffManager();
                          }}
                          className={menuItem}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#7155E8] shrink-0" />
                          <span className="whitespace-nowrap">Manage Coaches & Roles</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onOpenSettings();
                        }}
                        className={menuItem}
                      >
                        <Settings className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="whitespace-nowrap">Settings & Notifications</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
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
