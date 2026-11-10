import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Camera, ExternalLink, KeyRound, Search, ShieldCheck, UserRound } from 'lucide-react';
import { AccountRole, InAppNotification } from '../../types';
import { Avatar, Modal, showToast } from './CommonUI';
import { storage } from '../../services/storage';
import { disablePush, enablePush, getPushState, PushState } from '../../services/push';
import { supabase } from '../../lib/supabase';
import { formatDateTime, relativeTime } from '../../lib/dates';
import { PHOTO_READ_ERROR, resizeImage } from '../../lib/image';

const inputClass =
  'w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]';

// ---------------------------------------------------------------------------
// Notification detail
// ---------------------------------------------------------------------------
interface NotificationDetailModalProps {
  notification: InAppNotification | null;
  isStaff: boolean;
  onClose: () => void;
  onOpenMember: (memberId: string) => void;
  onGoToTab: (tab: string) => void;
}

const Detail: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value === undefined || value === null || value === '' ? null : (
    <div className="flex justify-between gap-3 py-1.5 border-b border-neutral-100 last:border-b-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-[#171717] text-right">{value}</span>
    </div>
  );

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isStaff,
  onClose,
  onOpenMember,
  onGoToTab
}) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    setImageUrl(undefined);
    if (!notification?.imageBucket || !notification.imagePath) return;
    let cancelled = false;
    setImageLoading(true);
    storage
      .getSignedUrl(notification.imageBucket, notification.imagePath)
      .then((url) => !cancelled && setImageUrl(url))
      .finally(() => !cancelled && setImageLoading(false));
    return () => {
      cancelled = true;
    };
  }, [notification?.id, notification?.imageBucket, notification?.imagePath]);

  const details = useMemo(() => {
    if (!notification?.entityId) return null;
    const id = notification.entityId;
    switch (notification.entityType) {
      case 'meal_log': {
        const m = storage.getMealLogs().find((x) => x.id === id);
        return m ? (
          <>
            <Detail label="Meal" value={`${m.scheduledMealName} · ${m.date}`} />
            <Detail label="Adherence" value={m.adherence} />
            <Detail label="Foods" value={m.foodsConsumed.map((f) => f.name).join(', ')} />
            <Detail label="Macros" value={`${m.totalCalories} kcal · ${m.totalProteinG}g P · ${m.totalCarbsG}g C · ${m.totalFatG}g F`} />
            <Detail label="Client note" value={m.memberNotes} />
            <Detail label="Review status" value={m.trainerReviewStatus} />
          </>
        ) : null;
      }
      case 'progress_record': {
        const p = storage.getProgressRecords().find((x) => x.id === id);
        return p ? (
          <>
            <Detail label="Date" value={p.date} />
            <Detail label="Weight" value={`${p.weightKg} kg`} />
            <Detail label="Waist" value={p.waistCm ? `${p.waistCm} cm` : undefined} />
            <Detail label="Bench press PR" value={p.personalBests?.benchPressKg ? `${p.personalBests.benchPressKg} kg` : undefined} />
            <Detail label="Note" value={p.notes} />
          </>
        ) : null;
      }
      case 'workout_session': {
        const w = storage.getWorkoutSessions().find((x) => x.id === id);
        return w ? (
          <>
            <Detail label="Workout" value={`${w.planName} · ${w.dayName}`} />
            <Detail label="Date" value={`${w.scheduledDate} ${w.startTime}${w.endTime ? `–${w.endTime}` : ''}`} />
            <Detail label="Completion" value={`${w.completionPercentage}% · ${w.durationMinutes} min`} />
            <Detail label="Exercises done" value={`${w.exerciseLogs.filter((l) => l.completed).length} of ${w.exerciseLogs.length}`} />
            <Detail label="Client note" value={w.memberNotes} />
            <Detail label="Review status" value={w.trainerReviewStatus} />
          </>
        ) : null;
      }
      case 'member_update': {
        const u = storage.getMemberUpdates().find((x) => x.id === id);
        return u ? (
          <>
            <Detail label="Subject" value={u.subject} />
            {u.message && <p className="pt-2 text-[#171717] leading-relaxed whitespace-pre-wrap">{u.message}</p>}
          </>
        ) : null;
      }
      case 'payment_request': {
        const r = storage.getPaymentRequests().find((x) => x.id === id);
        return r ? (
          <>
            <Detail label="Amount" value={`৳${r.amount.toLocaleString()} via ${r.method}`} />
            <Detail label="TrxID" value={r.trxId} />
            <Detail label="Sender number" value={r.senderBkashNumber} />
            <Detail label="Billing month" value={r.billingMonth} />
            <Detail label="Status" value={r.status} />
          </>
        ) : null;
      }
      default:
        return null;
    }
  }, [notification]);

  if (!notification) return null;

  return (
    <Modal isOpen={Boolean(notification)} onClose={onClose} title={notification.title} maxWidth="lg">
      <div className="space-y-4 text-xs">
        <div className="flex items-center gap-3">
          {notification.actorName && (
            <Avatar src={notification.actorAvatarUrl} name={notification.actorName} size="md" />
          )}
          <div className="min-w-0">
            {notification.actorName && (
              <span className="font-bold text-sm text-[#171717] block truncate">{notification.actorName}</span>
            )}
            <span className="text-neutral-500 font-mono text-[11px]">
              {formatDateTime(notification.createdAt)} · {relativeTime(notification.createdAt)} ·{' '}
              <span className="capitalize">{notification.category}</span>
            </span>
          </div>
        </div>

        <p className="text-neutral-700 leading-relaxed">{notification.description}</p>

        {notification.imagePath && (
          <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 min-h-40 flex items-center justify-center">
            {imageUrl ? (
              <a href={imageUrl} target="_blank" rel="noreferrer" title="Open full size">
                <img src={imageUrl} alt="Submitted photo" className="w-full max-h-[60vh] object-contain" />
              </a>
            ) : (
              <span className="text-neutral-400 py-12">{imageLoading ? 'Loading photo…' : 'Photo unavailable'}</span>
            )}
          </div>
        )}

        {details && <div className="p-3 bg-[#F5F5F5] rounded-2xl">{details}</div>}

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-neutral-100">
          {isStaff && notification.actorMemberId && (
            <button
              type="button"
              onClick={() => onOpenMember(notification.actorMemberId!)}
              className="px-4 py-2.5 rounded-2xl border border-neutral-200 font-bold text-neutral-700 hover:bg-[#F5F5F5] inline-flex items-center gap-1.5"
            >
              <UserRound className="w-3.5 h-3.5" />
              Open client profile
            </button>
          )}
          {notification.linkTab && (
            <button
              type="button"
              onClick={() => onGoToTab(notification.linkTab!)}
              className="px-4 py-2.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] text-white font-bold inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Go to section
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Notification history
// ---------------------------------------------------------------------------
interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onOpenNotification: (n: InAppNotification) => void;
  onMarkAllRead: () => void;
}

export const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onOpenNotification,
  onMarkAllRead
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const shown = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notification History" description="Your latest 200 notifications" maxWidth="xl">
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-[#F5F5F5] rounded-xl p-1">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                  filter === f ? 'bg-white shadow-xs text-[#171717]' : 'text-neutral-500'
                }`}
              >
                {f === 'unread' ? `Unread (${unread})` : 'All'}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button type="button" onClick={onMarkAllRead} className="font-semibold text-[#7155E8] hover:underline">
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {shown.length === 0 && <div className="py-10 text-center text-neutral-400">Nothing here.</div>}
          {shown.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpenNotification(n)}
              className={`w-full text-left p-3 rounded-2xl flex items-start gap-2.5 transition-colors ${
                n.isRead ? 'hover:bg-[#F5F5F5]' : 'bg-[#F0EEFC]/60 hover:bg-[#F0EEFC]'
              }`}
            >
              {n.actorName && <Avatar src={n.actorAvatarUrl} name={n.actorName} size="sm" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[#171717]">{n.title}</span>
                  <span className={`text-[10px] font-bold shrink-0 ${n.isRead ? 'text-neutral-400' : 'text-[#7155E8]'}`}>
                    {n.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
                <p className="text-neutral-500 mt-0.5">{n.description}</p>
                <span className="text-[10px] text-neutral-400 font-mono">{formatDateTime(n.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStaff: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isStaff }) => {
  const [pushState, setPushState] = useState<PushState>('disabled');
  const [pushBusy, setPushBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const coach = isStaff ? storage.getTrainer() : null;
  const [coachForm, setCoachForm] = useState({ fullName: '', title: '', phone: '', gymName: '', bkashNumber: '', bio: '' });
  const [coachBusy, setCoachBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getPushState().then(setPushState);
    setNewPassword('');
    if (coach) {
      setCoachForm({
        fullName: coach.fullName,
        title: coach.title,
        phone: coach.phone,
        gymName: coach.gymName,
        bkashNumber: coach.bkashNumber,
        bio: coach.bio
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      const next = pushState === 'enabled' ? await disablePush() : await enablePush();
      setPushState(next);
      if (next === 'enabled') showToast('Notifications enabled on this device.');
      if (next === 'denied') showToast('Notifications are blocked. Allow them in your browser settings.', 'error');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Use at least 8 characters.', 'error');
      return;
    }
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setNewPassword('');
    showToast('Password updated.');
  };

  const saveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoachBusy(true);
    try {
      await storage.updateTrainer(coachForm);
      showToast('Coach profile saved.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setCoachBusy(false);
    }
  };

  const uploadCoachPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setCoachBusy(true);
    try {
      await storage.uploadTrainerPhoto(await resizeImage(file, 800));
      showToast('Coach photo updated for every client.');
    } catch (err) {
      showToast(err instanceof Error && err.message.includes('decode') ? PHOTO_READ_ERROR : (err as Error).message, 'error');
    } finally {
      setCoachBusy(false);
      input.value = '';
    }
  };

  const pushCopy: Record<PushState, string> = {
    enabled: 'On for this device. You will be notified even when the app is closed.',
    disabled: 'Off for this device.',
    denied: 'Blocked by your browser. Allow notifications for this site in browser settings.',
    unsupported: 'This browser does not support push notifications. On iPhone, add the app to your Home Screen first.',
    'not-configured': 'Push notifications have not been configured for this app yet.'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="xl">
      <div className="space-y-5 text-xs">
        <section className="p-4 bg-[#F5F5F5] rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {pushState === 'enabled' ? (
              <Bell className="w-5 h-5 text-[#7155E8] shrink-0" />
            ) : (
              <BellOff className="w-5 h-5 text-neutral-400 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-bold text-[#171717] block">Push notifications</span>
              <span className="text-neutral-500">{pushCopy[pushState]}</span>
            </div>
          </div>
          {(pushState === 'enabled' || pushState === 'disabled') && (
            <button
              type="button"
              onClick={togglePush}
              disabled={pushBusy}
              className={`px-4 py-2 rounded-xl font-bold shrink-0 disabled:opacity-60 ${
                pushState === 'enabled' ? 'bg-white border border-neutral-200 text-neutral-700' : 'bg-[#7155E8] text-white'
              }`}
            >
              {pushBusy ? '…' : pushState === 'enabled' ? 'Turn off' : 'Turn on'}
            </button>
          )}
        </section>

        {isStaff && coach && (
          <form onSubmit={saveCoach} className="space-y-3">
            <span className="font-bold text-sm text-[#171717] block">Coach profile</span>
            <div className="flex items-center gap-3">
              <Avatar src={coach.avatarUrl} name={coach.fullName} size="lg" className="rounded-3xl" />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-[#7155E8]">
                <Camera className="w-3.5 h-3.5" />
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={uploadCoachPhoto} />
              </label>
              {coach.isMainCoach && <span className="text-[11px] font-bold text-[#7155E8]">Main coach · shown to every client</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-neutral-600 mb-1">Full name</span>
                <input className={inputClass} value={coachForm.fullName} onChange={(e) => setCoachForm({ ...coachForm, fullName: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-neutral-600 mb-1">Title</span>
                <input className={inputClass} value={coachForm.title} onChange={(e) => setCoachForm({ ...coachForm, title: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-neutral-600 mb-1">Phone</span>
                <input className={`${inputClass} font-mono`} value={coachForm.phone} onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-neutral-600 mb-1">bKash number for client payments</span>
                <input className={`${inputClass} font-mono`} value={coachForm.bkashNumber} onChange={(e) => setCoachForm({ ...coachForm, bkashNumber: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-neutral-600 mb-1">Gym name</span>
                <input className={inputClass} value={coachForm.gymName} onChange={(e) => setCoachForm({ ...coachForm, gymName: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-neutral-600 mb-1">Bio</span>
                <textarea rows={2} className={inputClass} value={coachForm.bio} onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={coachBusy} className="px-5 py-2.5 rounded-2xl bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white font-bold">
                {coachBusy ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        )}

        <form onSubmit={changePassword} className="space-y-2 pt-4 border-t border-neutral-100">
          <span className="font-bold text-sm text-[#171717] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-neutral-400" />
            {isStaff ? 'Change password' : 'Set or change password'}
          </span>
          <p className="text-neutral-500">Lets you sign in with your email as well as with Google.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className={inputClass}
            />
            <button type="submit" disabled={passwordBusy} className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-bold disabled:opacity-60 shrink-0">
              {passwordBusy ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Super admin: coaches and roles
// ---------------------------------------------------------------------------
interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const roleLabels: Record<AccountRole, string> = {
  super_admin: 'Super Admin',
  trainer: 'Coach',
  member: 'Client'
};

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const accounts = storage.getStaffProfiles();
  const term = search.trim().toLowerCase();
  const shown = accounts
    .filter((a) => !term || a.fullName.toLowerCase().includes(term) || a.email.toLowerCase().includes(term))
    .sort((a, b) => (a.role === b.role ? a.fullName.localeCompare(b.fullName) : a.role === 'member' ? 1 : -1));

  const changeRole = async (id: string, role: AccountRole) => {
    setBusyId(id);
    try {
      await storage.setUserRole(id, role);
      showToast(`Role updated to ${roleLabels[role]}.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Coaches & Roles"
      description="Promote an account to coach, or return a coach to a client account. Changes apply immediately."
      maxWidth="2xl"
    >
      <div className="space-y-3 text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="divide-y divide-neutral-100 border border-neutral-200/70 rounded-2xl max-h-[55vh] overflow-y-auto">
          {shown.length === 0 && <div className="p-6 text-center text-neutral-400">No accounts found.</div>}
          {shown.map((a) => (
            <div key={a.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={a.avatarUrl} name={a.fullName} size="sm" />
                <div className="min-w-0">
                  <span className="font-bold text-[#171717] block truncate">
                    {a.fullName}
                    {a.id === currentUserId && <span className="text-neutral-400 font-medium"> (you)</span>}
                  </span>
                  <span className="text-neutral-500 block truncate">{a.email}</span>
                </div>
              </div>
              {a.id === currentUserId || a.role === 'super_admin' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0EEFC] text-[#7155E8] font-bold self-start sm:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {roleLabels[a.role]}
                </span>
              ) : (
                <select
                  value={a.role}
                  disabled={busyId === a.id}
                  onChange={(e) => changeRole(a.id, e.target.value as AccountRole)}
                  aria-label={`Role for ${a.fullName}`}
                  className="p-2 bg-[#F5F5F5] border border-neutral-200 rounded-xl font-semibold self-start sm:self-auto disabled:opacity-60"
                >
                  <option value="member">Client</option>
                  <option value="trainer">Coach</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
