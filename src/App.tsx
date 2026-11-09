import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  MemberRegistrationRequest
} from './types';
import { storage } from './services/storage';
import { Header } from './components/common/Header';
import { FloatingBottomNav } from './components/common/FloatingBottomNav';
import { ToastViewport, showToast } from './components/common/CommonUI';
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('trainer');
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

  // Active member for Member Portal
  const [activeMemberId, setActiveMemberId] = useState<string>('mem-01');

  // Modals
  const [isMemberRequestsOpen, setIsMemberRequestsOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Sync state from storage service
  const refreshState = () => {
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
  };

  useEffect(() => {
    refreshState();
    const unsubscribe = storage.subscribe(() => {
      refreshState();
    });
    return unsubscribe;
  }, []);

  const handleSwitchRole = (role: UserRole, memberId?: string) => {
    setCurrentRole(role);
    if (role === 'trainer') {
      setActiveTab('dashboard');
      setSelectedMemberId(null);
    } else {
      if (memberId) {
        setActiveMemberId(memberId);
      } else if (!activeMemberId && members.length > 0) {
        setActiveMemberId(members[0].id);
      }
      setActiveTab('member-dashboard');
    }
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

  const currentMember = members.find((m) => m.id === activeMemberId) || members[0];
  const profileMember = members.find((m) => m.id === selectedMemberId);

  // Pending counts
  const pendingMealCount = mealLogs.filter((m) => m.trainerReviewStatus === 'Pending').length;
  const unreadNoticesCount = notices.filter(
    (n) => currentMember && !n.readByMemberIds.includes(currentMember.id)
  ).length;
  const pendingRegistrationCount = registrationRequests.filter((r) => r.status === 'Pending').length;

  if (!isAuthenticated) {
    return (
      <>
        <ToastViewport />
        <AuthPage
          allMembers={members}
          onLogin={(role, memberId) => {
            setIsAuthenticated(true);
            handleSwitchRole(role, memberId);
          }}
          onActivateAccount={(memberId) => {
            storage.activateMemberAccount(memberId);
          }}
          onSubmitRegistrationRequest={(data) => {
            storage.addRegistrationRequest(data);
            refreshState();
          }}
        />
      </>
    );
  }

  const routeMotionKey =
    currentRole === 'trainer'
      ? `trainer-${activeTab}-${selectedMemberId || 'list'}`
      : `member-${currentMember?.id || 'none'}`;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#171717] flex flex-col font-sans selection:bg-[#7155E8] selection:text-white overflow-x-clip">
      {/* Global Non-Overlapping Toast Viewport */}
      <ToastViewport />

      {/* Universal Top Header */}
      <Header
        currentRole={currentRole}
        currentMember={currentMember}
        allMembers={members}
        onSwitchRole={handleSwitchRole}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        notifications={notifications}
        onMarkNotificationRead={(id) => storage.markNotificationRead(id)}
        onResetData={() => storage.init(true)}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Main Viewport Container */}
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
                    onResolveAlert={(id) => {
                      storage.resolveAlert(id);
                      showToast('Alert dismissed.', 'info');
                    }}
                    onOpenAddMember={() => setIsAddMemberOpen(true)}
                    onOpenMemberRequests={() => setIsMemberRequestsOpen(true)}
                    onOpenRecordPayment={() => setActiveTab('payments')}
                    onOpenPublishNotice={() => setActiveTab('notices')}
                    onApprovePaymentRequest={(id) => {
                      storage.approvePaymentRequest(id);
                      refreshState();
                      showToast('Payment approved! Member workout & diet plans unlocked.');
                    }}
                    onRejectPaymentRequest={(id, reason) => {
                      storage.rejectPaymentRequest(id, reason);
                      refreshState();
                      showToast('Payment verification declined.', 'info');
                    }}
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
                        onAssignWorkoutPlan={(mId: string, pId: string) => {
                          storage.assignWorkoutPlan(mId, pId);
                          showToast('Workout routine assigned to client!');
                        }}
                        onAssignDietPlan={(mId: string, dId: string) => {
                          storage.assignDietPlan(mId, dId);
                          showToast('Diet blueprint assigned to client!');
                        }}
                        onCreateCustomWorkout={(mId: string, planData: any) => {
                          storage.createCustomWorkoutPlanForMember(mId, planData);
                          showToast('Custom workout routine created & assigned!');
                        }}
                        onCreateCustomDiet={(mId: string, planData: any) => {
                          storage.createCustomDietPlanForMember(mId, planData);
                          showToast('Custom diet blueprint created & assigned!');
                        }}
                        onUpdateTrainerNotes={(mId: string, notes: string) =>
                          storage.updateMember(mId, { trainerPrivateNotes: notes })
                        }
                        onReviewMealLog={(mId: string, st: 'Approved' | 'Correction Requested', fb: string) => {
                          storage.reviewMealLog(mId, st, fb);
                          showToast(`Meal log marked as ${st}.`);
                        }}
                        onVerifyWorkoutSession={(sId: string, st: 'Verified' | 'Needs Correction', fb: string) => {
                          storage.verifyWorkoutSession(sId, st, fb);
                          showToast(`Workout session marked as ${st}.`);
                        }}
                        onAddProgressRecord={(data: any) => {
                          storage.addProgressRecord(data);
                          showToast('Body assessment logged!');
                        }}
                        onScheduleSession={(data: any) => {
                          storage.scheduleSession(data);
                          showToast('1-on-1 PT session scheduled!');
                        }}
                        onDeleteMember={(id: string) => {
                          storage.deleteMember(id);
                          setSelectedMemberId(null);
                          showToast('Client profile permanently removed.', 'info');
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
                        onActivateAccount={(id) => storage.activateMemberAccount(id)}
                        onDeleteMember={(id) => storage.deleteMember(id)}
                      />
                    )}
                  </>
                )}

                {activeTab === 'fitness' && (
                  <FitnessPlanHub
                    workoutPlans={workoutPlans}
                    dietPlans={dietPlans}
                    members={members}
                    onCreateWorkoutPlan={(p: any) => storage.createWorkoutPlan(p)}
                    onUpdateWorkoutPlan={(id: string, u: any) => storage.updateWorkoutPlan(id, u)}
                    onAssignWorkoutPlan={(mId: string, pId: string) => storage.assignWorkoutPlan(mId, pId)}
                    onCreateDietPlan={(d: any) => storage.createDietPlan(d)}
                    onUpdateDietPlan={(id: string, u: any) => storage.updateDietPlan(id, u)}
                    onAssignDietPlan={(mId: string, dId: string) => storage.assignDietPlan(mId, dId)}
                  />
                )}

                {activeTab === 'meal-hub' && (
                  <MealAccountabilityHub
                    mealLogs={mealLogs}
                    members={members}
                    onReviewMealLog={(id, status, feedback) => {
                      storage.reviewMealLog(id, status, feedback);
                      showToast(`Meal submission marked as ${status}.`);
                    }}
                    onSelectMember={(mId) => {
                      setSelectedMemberId(mId);
                      setActiveTab('members');
                    }}
                  />
                )}

                {activeTab === 'payments' && (
                  <PaymentManagement
                    payments={payments}
                    members={members}
                    paymentRequests={paymentRequests}
                    onRecordPayment={(p) => storage.recordPayment(p)}
                    onApprovePaymentRequest={(id) => {
                      storage.approvePaymentRequest(id);
                      refreshState();
                      showToast('Payment approved! Member plans unlocked.');
                    }}
                    onRejectPaymentRequest={(id, reason) => {
                      storage.rejectPaymentRequest(id, reason);
                      refreshState();
                      showToast('Payment verification declined.', 'info');
                    }}
                    onSendReminderNotice={(m, due) => {
                      storage.publishNotice({
                        title: `Payment Reminder: ৳${due.toLocaleString()} Due`,
                        message: `Hi ${m.fullName.split(' ')[0]}, your membership payment of ৳${due.toLocaleString()} is due. Please settle via bKash or Cash between the 1st and 10th to maintain active workout & diet plans.`,
                        category: 'Payment',
                        targetAudience: 'Specific Member',
                        targetMemberId: m.id,
                        priority: 'Urgent'
                      });
                      showToast(`Payment reminder sent to ${m.fullName}!`);
                    }}
                    onSelectMember={(mId) => {
                      setSelectedMemberId(mId);
                      setActiveTab('members');
                    }}
                  />
                )}

                {activeTab === 'schedule' && (
                  <TrainingCalendar
                    sessions={trainingSessions}
                    members={members}
                    onScheduleSession={(s) => storage.scheduleSession(s)}
                    onMarkAttendance={(sId, status, notes) => {
                      storage.markAttendance(sId, status, notes);
                      showToast(`Session marked as ${status}.`);
                    }}
                    onSelectMember={(mId) => {
                      setSelectedMemberId(mId);
                      setActiveTab('members');
                    }}
                  />
                )}

                {activeTab === 'notices' && (
                  <NoticesManager
                    notices={notices}
                    members={members}
                    onPublishNotice={(n) => storage.publishNotice(n)}
                    onSelectMember={(mId) => {
                      setSelectedMemberId(mId);
                      setActiveTab('members');
                    }}
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
            {currentRole === 'member' && currentMember && (
              <MemberPortalView
                member={currentMember}
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
                onSubmitWorkout={(session) => storage.logWorkoutSession(session)}
                onSubmitMealLog={(meal) => storage.logMeal(meal)}
                onAddProgressRecord={(prog) => storage.addProgressRecord(prog)}
                onMarkNoticeRead={(nId) => storage.markNoticeRead(nId, currentMember.id)}
                onToggleGymCheckIn={(mId, dStr) => storage.toggleGymCheckIn(mId, dStr)}
                onSubmitPaymentRequest={(data) => {
                  storage.submitPaymentRequest(data);
                  refreshState();
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Member Registration Requests Approval Modal */}
      <MemberRequestsModal
        isOpen={isMemberRequestsOpen}
        onClose={() => setIsMemberRequestsOpen(false)}
        requests={registrationRequests}
        onApprove={(id) => {
          const newMember = storage.approveRegistrationRequest(id);
          refreshState();
          return newMember;
        }}
        onReject={(id, reason) => {
          storage.rejectRegistrationRequest(id, reason);
          refreshState();
        }}
      />

      {/* Direct Member Enrollment Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={(data) => {
          storage.addMember(data);
          refreshState();
        }}
      />

      {/* Modern Floating Bottom Navigation Bar (Island Dock) */}
      <FloatingBottomNav
        currentRole={currentRole}
        currentMember={currentMember}
        allMembers={members}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onSwitchRole={handleSwitchRole}
        pendingMealCount={pendingMealCount}
        unreadNoticesCount={unreadNoticesCount}
        pendingRequestsCount={pendingRegistrationCount}
        onOpenAddMember={() => setIsMemberRequestsOpen(true)}
        onOpenDirectEnroll={() => setIsAddMemberOpen(true)}
        onOpenRecordPayment={() => setActiveTab('payments')}
        onResetData={() => storage.init(true)}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Ambient Sub-Footer (Cleanly padded above floating island dock with zero gap/overlap) */}
      <footer className="mt-auto border-t border-neutral-200/70 bg-white pt-4 pb-24 sm:pb-28 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>Azims Workout Manager · Professional Personal Coaching Platform by Coach Oliul Azim</span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-neutral-400">
            <span>bKash: 01717014371</span>
            <span aria-hidden="true">·</span>
            <span>Dhaka (৳ BDT)</span>
            <span aria-hidden="true">·</span>
            <span>Asia/Dhaka</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
