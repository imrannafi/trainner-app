import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import { Dumbbell } from 'lucide-react';
import {
  UserRole,
  Member,
  PaymentRecord,
  WorkoutPlan,
  WorkoutSession,
  DietPlan,
  MealLog,
  ProgressRecord,
  TrainingSessionEvent,
  Notice,
  InAppNotification,
  NeedsAttentionAlert,
  AuditLogItem,
  PaymentVerificationRequest,
  MemberRegistrationRequest,
  TrainerProfile
} from './types';
import { storage } from './services/storage';
import { AppAccess, resolveAccess, signOut } from './services/session';
import { detachPushSubscription, refreshPushSubscription, registerServiceWorker } from './services/push';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { Header } from './components/common/Header';
import { FloatingBottomNav, AccountSummary } from './components/common/FloatingBottomNav';
import { Modal, ToastViewport, showToast } from './components/common/CommonUI';
import {
  NotificationDetailModal,
  NotificationHistoryModal,
  SettingsModal,
  StaffManagerModal
} from './components/common/AccountModals';
import { AuthPage } from './components/auth/AuthPage';
import { TrainerDashboard } from './components/trainer/TrainerDashboard';
import { MembersList } from './components/trainer/MembersList';
import { MemberProfileView } from './components/trainer/MemberProfileView';
import { FitnessPlanHub } from './components/trainer/FitnessPlanHub';
import { MealAccountabilityHub } from './components/trainer/MealAccountabilityHub';
import { PaymentManagement } from './components/trainer/PaymentManagement';
import { TrainingCalendar } from './components/trainer/TrainingCalendar';
import { NoticesManager } from './components/trainer/NoticesManager';
import { ReportsSection } from './components/trainer/ReportsSection';
import { MemberPortalView } from './components/member/MemberPortalView';
import { MemberRequestsModal } from './components/trainer/MemberRequestsModal';
import { AddMemberModal } from './components/trainer/AddMemberModal';

type AccessState = AppAccess | { kind: 'loading' };

/** Runs a write and reports any failure; screens already show their own success messages. */
const run = (promise: Promise<unknown>, success?: string) =>
  promise
    .then(() => {
      if (success) showToast(success);
    })
    .catch((err: Error) => showToast(err.message, 'error'));

const FullScreenMessage: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F5] text-[#171717]">
    <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/70 p-8 text-center space-y-3 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7155E8] text-white">
        <Dumbbell className="w-6 h-6" />
      </div>
      <h1 className="text-lg font-extrabold">{title}</h1>
      {children}
    </div>
  </div>
);

export default function App() {
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const resolvedUserRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Storage synced state
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSessionEvent[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [alerts, setAlerts] = useState<NeedsAttentionAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentVerificationRequest[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<MemberRegistrationRequest[]>([]);
  const [ownTrainer, setOwnTrainer] = useState<TrainerProfile | null>(null);
  const [mainCoach, setMainCoach] = useState<TrainerProfile | undefined>(undefined);

  // Modals
  const [isMemberRequestsOpen, setIsMemberRequestsOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [openNotification, setOpenNotification] = useState<InAppNotification | null>(null);
  const pendingNotificationId = useRef<string | null>(new URLSearchParams(window.location.search).get('notification'));

  const refreshState = useCallback(() => {
    setMembers(storage.getMembers());
    setPayments(storage.getPayments());
    setWorkoutPlans(storage.getWorkoutPlans());
    setWorkoutSessions(storage.getWorkoutSessions());
    setDietPlans(storage.getDietPlans());
    setMealLogs(storage.getMealLogs());
    setProgressRecords(storage.getProgressRecords());
    setTrainingSessions(storage.getTrainingSessions());
    setNotices(storage.getNotices());
    setNotifications(storage.getNotifications());
    setAlerts(storage.getNeedsAttentionAlerts());
    setAuditLogs(storage.getAuditLogs());
    setPaymentRequests(storage.getPaymentRequests());
    setRegistrationRequests(storage.getRegistrationRequests());
    setOwnTrainer(storage.isStaff ? storage.getTrainer() : null);
    setMainCoach(storage.getMainCoach());
  }, []);

  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------
  const applySession = useCallback(async (session: Session | null, force = false) => {
    const userId = session?.user?.id ?? null;
    if (!force && userId && resolvedUserRef.current === userId) return;
    resolvedUserRef.current = userId;
    setStartupError(null);

    try {
      const next = await resolveAccess(session);
      if (next.kind === 'staff') {
        await storage.start({ userId: next.user.id, role: next.role, memberId: null });
        setActiveTab((t) => (t.startsWith('member-') ? 'dashboard' : t));
      } else if (next.kind === 'member') {
        await storage.start({ userId: next.user.id, role: 'member', memberId: next.memberId });
        setActiveTab((t) => (t.startsWith('member-') ? t : 'member-dashboard'));
      } else {
        storage.stop();
      }
      setAccess(next);
      if (next.kind === 'staff' || next.kind === 'member') refreshPushSubscription();
    } catch (err) {
      resolvedUserRef.current = null;
      setStartupError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      // Supabase advises against awaiting its own calls inside this callback.
      setTimeout(() => applySession(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [applySession]);

  // While an application is pending, check back periodically so approval takes effect without a reload.
  useEffect(() => {
    if (access.kind !== 'applicant' || access.registration?.status !== 'Pending') return;
    const timer = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      applySession(data.session, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [access, applySession]);

  // ---------------------------------------------------------------------------
  // Data and notifications
  // ---------------------------------------------------------------------------
  useEffect(() => {
    registerServiceWorker();
    const unsubscribe = storage.subscribe(refreshState);
    storage.onError((message) => showToast(message, 'error'));
    const offNew = storage.onNewNotifications((fresh) => {
      const first = fresh[0];
      showToast(fresh.length > 1 ? `${fresh.length} new notifications` : first.title, 'info');
    });

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'open-notification' && event.data.notificationId) {
        pendingNotificationId.current = event.data.notificationId;
        storage.scheduleReload(0);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    const onVisible = () => {
      if (document.visibilityState === 'visible') storage.scheduleReload(0);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubscribe();
      offNew();
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshState]);

  const handleOpenNotification = useCallback((n: InAppNotification) => {
    storage.markNotificationRead(n.id);
    setIsHistoryOpen(false);
    setOpenNotification({ ...n, isRead: true });
  }, []);

  // Opening the app from a push notification lands on that notification.
  useEffect(() => {
    const id = pendingNotificationId.current;
    if (!id) return;
    const match = notifications.find((n) => n.id === id);
    if (match) {
      pendingNotificationId.current = null;
      window.history.replaceState(null, '', window.location.pathname);
      handleOpenNotification(match);
    }
  }, [notifications, handleOpenNotification]);

  const handleLogout = async () => {
    await detachPushSubscription().catch(() => undefined);
    await signOut();
    storage.stop();
    resolvedUserRef.current = null;
    setAccess({ kind: 'signed-out' });
    setSelectedMemberId(null);
    setActiveTab('dashboard');
  };

  const handleSelectTab = (tab: string, meta?: any) => {
    if ((tab === 'member-profile' || tab === 'members') && meta?.memberId) {
      setSelectedMemberId(meta.memberId);
      setActiveTab('members');
      return;
    }
    setActiveTab(tab);
    if (tab !== 'members') {
      setSelectedMemberId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Screens before the app
  // ---------------------------------------------------------------------------
  if (!isSupabaseConfigured) {
    return (
      <FullScreenMessage title="Connect Supabase to continue">
        <p className="text-xs text-neutral-500 leading-relaxed">
          Set <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
          <code className="font-mono">.env.local</code> (or your hosting provider's environment settings), then restart the app.
        </p>
      </FullScreenMessage>
    );
  }

  if (startupError) {
    return (
      <FullScreenMessage title="Something went wrong">
        <p className="text-xs text-neutral-500 leading-relaxed">{startupError}</p>
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={async () => {
              const { data } = await supabase.auth.getSession();
              applySession(data.session, true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#7155E8] text-white text-xs font-bold"
          >
            Try again
          </button>
          <button type="button" onClick={handleLogout} className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold">
            Sign out
          </button>
        </div>
      </FullScreenMessage>
    );
  }

  const recoveryModal = (
    <Modal
      isOpen={isRecoveringPassword}
      onClose={() => setIsRecoveringPassword(false)}
      title="Choose a new password"
      maxWidth="sm"
    >
      <form
        className="space-y-3 text-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          if (recoveryPassword.length < 8) {
            showToast('Use at least 8 characters.', 'error');
            return;
          }
          const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
          if (error) {
            showToast(error.message, 'error');
            return;
          }
          setRecoveryPassword('');
          setIsRecoveringPassword(false);
          showToast('Password updated. You are signed in.');
        }}
      >
        <input
          type="password"
          autoComplete="new-password"
          value={recoveryPassword}
          onChange={(e) => setRecoveryPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
        />
        <button type="submit" className="w-full py-2.5 rounded-xl bg-[#7155E8] text-white font-bold">
          Save password
        </button>
      </form>
    </Modal>
  );

  if (access.kind === 'loading') {
    return (
      <FullScreenMessage title="Loading your portal…">
        <div className="mx-auto w-8 h-8 border-2 border-[#7155E8]/30 border-t-[#7155E8] rounded-full animate-spin" />
      </FullScreenMessage>
    );
  }

  if (access.kind === 'signed-out' || access.kind === 'applicant') {
    const meta = access.kind === 'applicant' ? access.user.user_metadata ?? {} : {};
    return (
      <>
        <ToastViewport />
        {recoveryModal}
        <AuthPage
          key={access.kind === 'applicant' ? `applicant-${access.user.id}` : 'signed-out'}
          mode={access.kind === 'applicant' ? 'complete-registration' : 'sign-in'}
          prefill={
            access.kind === 'applicant'
              ? {
                  email: access.user.email ?? '',
                  fullName: (meta.full_name as string) || (meta.name as string) || '',
                  avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined
                }
              : undefined
          }
          registration={access.kind === 'applicant' ? access.registration : null}
          onRegistrationSubmitted={async () => {
            const { data } = await supabase.auth.getSession();
            applySession(data.session, true);
          }}
          onSignOut={handleLogout}
        />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Signed-in app
  // ---------------------------------------------------------------------------
  const isStaff = access.kind === 'staff';
  const isSuperAdmin = access.kind === 'staff' && access.role === 'super_admin';
  const currentRole: UserRole = isStaff ? 'trainer' : 'member';
  const currentMember = access.kind === 'member' ? members.find((m) => m.id === access.memberId) : undefined;
  const profileMember = members.find((m) => m.id === selectedMemberId);

  const account: AccountSummary = isStaff
    ? {
        name: ownTrainer?.fullName || access.user.email || 'Coach',
        subtitle: isSuperAdmin ? 'Super Admin · Head Coach' : ownTrainer?.title || 'Coach',
        avatarUrl: ownTrainer?.avatarUrl
      }
    : {
        name: currentMember?.fullName || access.user.email || 'Member',
        subtitle: currentMember ? `${currentMember.fitnessGoal} · ${currentMember.status}` : 'Client',
        avatarUrl: currentMember?.avatarUrl
      };

  // Pending counts
  const pendingMealCount = mealLogs.filter((m) => m.trainerReviewStatus === 'Pending').length;
  const unreadNoticesCount = notices.filter(
    (n) => currentMember && !n.readByMemberIds.includes(currentMember.id)
  ).length;
  const pendingRegistrationCount = registrationRequests.filter((r) => r.status === 'Pending').length;

  const routeMotionKey =
    currentRole === 'trainer'
      ? `trainer-${activeTab}-${selectedMemberId || 'list'}`
      : `member-${currentMember?.id || 'none'}`;

  const openMember = (mId: string) => {
    setSelectedMemberId(mId);
    setActiveTab('members');
  };

  const footerCoach = mainCoach;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#171717] flex flex-col font-sans selection:bg-[#7155E8] selection:text-white overflow-x-clip">
      <ToastViewport />
      {recoveryModal}

      <Header
        currentRole={currentRole}
        account={account}
        isSuperAdmin={isSuperAdmin}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        notifications={notifications}
        onOpenNotification={handleOpenNotification}
        onMarkAllNotificationsRead={() => storage.markAllNotificationsRead()}
        onViewAllNotifications={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStaffManager={() => setIsStaffManagerOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeMotionKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* TRAINER PORTAL ROUTING */}
            {currentRole === 'trainer' && (
              <>
                {activeTab === 'dashboard' && (
                  <TrainerDashboard
                    members={members}
                    payments={payments}
                    workoutSessions={workoutSessions}
                    mealLogs={mealLogs}
                    alerts={alerts}
                    auditLogs={auditLogs}
                    notices={notices}
                    paymentRequests={paymentRequests}
                    registrationRequests={registrationRequests}
                    onSelectTab={handleSelectTab}
                    onResolveAlert={(id) => run(storage.resolveAlert(id), 'Alert dismissed.')}
                    onOpenAddMember={() => setIsAddMemberOpen(true)}
                    onOpenMemberRequests={() => setIsMemberRequestsOpen(true)}
                    onOpenRecordPayment={() => setActiveTab('payments')}
                    onOpenPublishNotice={() => setActiveTab('notices')}
                    onApprovePaymentRequest={(id) =>
                      run(storage.approvePaymentRequest(id), 'Payment approved! Member workout & diet plans unlocked.')
                    }
                    onRejectPaymentRequest={(id, reason) =>
                      run(storage.rejectPaymentRequest(id, reason), 'Payment verification declined.')
                    }
                  />
                )}

                {activeTab === 'members' && (
                  <>
                    {profileMember ? (
                      <MemberProfileView
                        member={profileMember}
                        allWorkoutPlans={workoutPlans}
                        allDietPlans={dietPlans}
                        payments={payments}
                        workoutSessions={workoutSessions}
                        mealLogs={mealLogs}
                        progressRecords={progressRecords}
                        trainingSessions={trainingSessions}
                        notices={notices}
                        onBack={() => setSelectedMemberId(null)}
                        onOpenRecordPayment={() => setActiveTab('payments')}
                        onAssignWorkoutPlan={(mId: string, pId: string) =>
                          run(storage.assignWorkoutPlan(mId, pId), 'Workout routine assigned to client!')
                        }
                        onAssignDietPlan={(mId: string, dId: string) =>
                          run(storage.assignDietPlan(mId, dId), 'Diet blueprint assigned to client!')
                        }
                        onCreateCustomWorkout={(mId: string, planData: any) =>
                          run(storage.createCustomWorkoutPlanForMember(mId, planData), 'Custom workout routine created & assigned!')
                        }
                        onCreateCustomDiet={(mId: string, planData: any) =>
                          run(storage.createCustomDietPlanForMember(mId, planData), 'Custom diet blueprint created & assigned!')
                        }
                        onUpdateTrainerNotes={(mId: string, notes: string) =>
                          run(storage.updateMember(mId, { trainerPrivateNotes: notes }))
                        }
                        onReviewMealLog={(mId: string, st: 'Approved' | 'Correction Requested', fb: string) =>
                          run(storage.reviewMealLog(mId, st, fb), `Meal log marked as ${st}.`)
                        }
                        onVerifyWorkoutSession={(sId: string, st: 'Verified' | 'Needs Correction', fb: string) =>
                          run(storage.verifyWorkoutSession(sId, st, fb), `Workout session marked as ${st}.`)
                        }
                        onAddProgressRecord={(data: any) => run(storage.addProgressRecord(data), 'Body assessment logged!')}
                        onScheduleSession={(data: any) => run(storage.scheduleSession(data), '1-on-1 PT session scheduled!')}
                        onDeleteMember={(id: string) => {
                          setSelectedMemberId(null);
                          run(storage.deleteMember(id), 'Client profile permanently removed.');
                        }}
                        onToggleGymCheckIn={(mId: string, dStr: string) => storage.toggleGymCheckIn(mId, dStr)}
                      />
                    ) : (
                      <MembersList
                        members={members}
                        onSelectMember={(id) => setSelectedMemberId(id)}
                        onOpenAddMember={() => setIsMemberRequestsOpen(true)}
                        onOpenDirectEnroll={() => setIsAddMemberOpen(true)}
                        onOpenRecordPayment={() => setActiveTab('payments')}
                        onActivateAccount={async (id) => {
                          await storage.activateMemberAccount(id);
                        }}
                        onDeleteMember={(id) => run(storage.deleteMember(id), 'Client profile permanently removed.')}
                      />
                    )}
                  </>
                )}

                {activeTab === 'fitness' && (
                  <FitnessPlanHub
                    workoutPlans={workoutPlans}
                    dietPlans={dietPlans}
                    members={members}
                    onCreateWorkoutPlan={(p: any) => run(storage.createWorkoutPlan(p))}
                    onUpdateWorkoutPlan={(id: string, u: any) => run(storage.updateWorkoutPlan(id, u))}
                    onAssignWorkoutPlan={(mId: string, pId: string) => run(storage.assignWorkoutPlan(mId, pId))}
                    onCreateDietPlan={(d: any) => run(storage.createDietPlan(d))}
                    onUpdateDietPlan={(id: string, u: any) => run(storage.updateDietPlan(id, u))}
                    onAssignDietPlan={(mId: string, dId: string) => run(storage.assignDietPlan(mId, dId))}
                  />
                )}

                {activeTab === 'meal-hub' && (
                  <MealAccountabilityHub
                    mealLogs={mealLogs}
                    members={members}
                    onReviewMealLog={(id, status, feedback) =>
                      run(storage.reviewMealLog(id, status, feedback), `Meal submission marked as ${status}.`)
                    }
                    onSelectMember={openMember}
                  />
                )}

                {activeTab === 'payments' && (
                  <PaymentManagement
                    payments={payments}
                    members={members}
                    paymentRequests={paymentRequests}
                    onRecordPayment={(p) => run(storage.recordPayment(p))}
                    onApprovePaymentRequest={(id) =>
                      run(storage.approvePaymentRequest(id), 'Payment approved! Member plans unlocked.')
                    }
                    onRejectPaymentRequest={(id, reason) =>
                      run(storage.rejectPaymentRequest(id, reason), 'Payment verification declined.')
                    }
                    onSendReminderNotice={(m, due) =>
                      run(
                        storage.publishNotice({
                          title: `Payment Reminder: ৳${due.toLocaleString()} Due`,
                          message: `Hi ${m.fullName.split(' ')[0]}, your membership payment of ৳${due.toLocaleString()} is due. Please settle via bKash or Cash between the 1st and 10th to maintain active workout & diet plans.`,
                          category: 'Payment',
                          targetAudience: 'Specific Member',
                          targetMemberId: m.id,
                          priority: 'Urgent'
                        }),
                        `Payment reminder sent to ${m.fullName}!`
                      )
                    }
                    onSelectMember={openMember}
                  />
                )}

                {activeTab === 'schedule' && (
                  <TrainingCalendar
                    sessions={trainingSessions}
                    members={members}
                    onScheduleSession={(s) => run(storage.scheduleSession(s))}
                    onMarkAttendance={(sId, status, notes) =>
                      run(storage.markAttendance(sId, status, notes), `Session marked as ${status}.`)
                    }
                    onSelectMember={openMember}
                  />
                )}

                {activeTab === 'notices' && (
                  <NoticesManager
                    notices={notices}
                    members={members}
                    onPublishNotice={(n) => run(storage.publishNotice(n))}
                    onSelectMember={openMember}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsSection
                    members={members}
                    payments={payments}
                    workoutSessions={workoutSessions}
                    mealLogs={mealLogs}
                  />
                )}
              </>
            )}

            {/* MEMBER PORTAL ROUTING */}
            {currentRole === 'member' && !currentMember && (
              <FullScreenMessage title="Loading your profile…" />
            )}
            {currentRole === 'member' && currentMember && (
              <MemberPortalView
                member={currentMember}
                coach={mainCoach}
                assignedWorkout={workoutPlans.find((p) => p.id === currentMember.assignedWorkoutPlanId)}
                assignedDiet={dietPlans.find((p) => p.id === currentMember.assignedDietPlanId)}
                workoutSessions={workoutSessions}
                mealLogs={mealLogs}
                payments={payments}
                paymentRequests={paymentRequests}
                progressRecords={progressRecords}
                trainingSessions={trainingSessions}
                notices={notices}
                activeTab={activeTab}
                onSelectTab={handleSelectTab}
                onSendUpdate={(subject, message, photo) => storage.sendMemberUpdate(currentMember.id, subject, message, photo)}
                onSubmitWorkout={(session) => storage.logWorkoutSession(session)}
                onSubmitMealLog={(meal) => storage.logMeal(meal)}
                onAddProgressRecord={(prog) => storage.addProgressRecord(prog)}
                onMarkNoticeRead={(nId) => run(storage.markNoticeRead(nId, currentMember.id))}
                onToggleGymCheckIn={(mId, dStr) => storage.toggleGymCheckIn(mId, dStr)}
                onSubmitPaymentRequest={(data) => storage.submitPaymentRequest(data)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {isStaff && (
        <>
          <MemberRequestsModal
            isOpen={isMemberRequestsOpen}
            onClose={() => setIsMemberRequestsOpen(false)}
            requests={registrationRequests}
            onApprove={(id) => storage.approveRegistrationRequest(id)}
            onReject={(id, reason) => run(storage.rejectRegistrationRequest(id, reason))}
          />

          <AddMemberModal
            isOpen={isAddMemberOpen}
            onClose={() => setIsAddMemberOpen(false)}
            onAddMember={async (data) => {
              await storage.addMember(data);
            }}
          />
        </>
      )}

      <NotificationDetailModal
        notification={openNotification}
        isStaff={isStaff}
        onClose={() => setOpenNotification(null)}
        onOpenMember={(mId) => {
          setOpenNotification(null);
          openMember(mId);
        }}
        onGoToTab={(tab) => {
          setOpenNotification(null);
          handleSelectTab(tab);
        }}
      />
      <NotificationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        notifications={notifications}
        onOpenNotification={handleOpenNotification}
        onMarkAllRead={() => storage.markAllNotificationsRead()}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isStaff={isStaff} />
      {isSuperAdmin && (
        <StaffManagerModal
          isOpen={isStaffManagerOpen}
          onClose={() => setIsStaffManagerOpen(false)}
          currentUserId={access.user.id}
        />
      )}

      {/* Modern Floating Bottom Navigation Bar (Island Dock) */}
      <FloatingBottomNav
        currentRole={currentRole}
        currentMember={currentMember}
        account={account}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        pendingMealCount={pendingMealCount}
        unreadNoticesCount={unreadNoticesCount}
        pendingRequestsCount={pendingRegistrationCount}
        onOpenAddMember={() => setIsMemberRequestsOpen(true)}
        onOpenDirectEnroll={() => setIsAddMemberOpen(true)}
        onOpenRecordPayment={() => setActiveTab('payments')}
        onLogout={handleLogout}
      />

      <footer className="mt-auto border-t border-neutral-200/70 bg-white pt-4 pb-24 sm:pb-28 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>
            Azims Workout Manager · Professional Personal Coaching Platform
            {footerCoach ? ` by ${footerCoach.fullName}` : ''}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-neutral-400">
            {footerCoach?.bkashNumber && (
              <>
                <span>bKash: {footerCoach.bkashNumber}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>Dhaka (৳ BDT)</span>
            <span aria-hidden="true">·</span>
            <span>Asia/Dhaka</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
