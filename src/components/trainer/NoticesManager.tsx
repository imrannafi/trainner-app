import React, { useState } from 'react';
import { todayDhaka } from '../../lib/dates';
import {
  Plus,
  Users,
  Eye
} from 'lucide-react';
import { Notice, Member } from '../../types';
import { Modal, showToast } from '../common/CommonUI';

interface NoticesManagerProps {
  notices: Notice[];
  members: Member[];
  onPublishNotice: (notice: any) => void;
  onSelectMember: (memberId: string) => void;
}

export const NoticesManager: React.FC<NoticesManagerProps> = ({
  notices,
  members,
  onPublishNotice
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'General' | 'Payment' | 'Workout' | 'Diet' | 'Schedule' | 'Urgent'>('General');
  const [targetAudience, setTargetAudience] = useState<'All Members' | 'Specific Member' | 'Overdue Members' | 'Expiring Soon'>('All Members');
  const [targetMemberId, setTargetMemberId] = useState(members[0]?.id || '');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  // Notices stay listed as current for two weeks.
  const expiryDate = (() => {
    const d = new Date(`${todayDhaka()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both a notice title and message.', 'error');
      return;
    }

    onPublishNotice({
      title: title.trim(),
      message: message.trim(),
      category,
      targetAudience,
      targetMemberId: targetAudience === 'Specific Member' ? targetMemberId : undefined,
      priority,
      expiryDate
    });

    setShowModal(false);
    setTitle('');
    setMessage('');
    showToast('Notice published and synced to member portals!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Notices & Announcements Broadcast
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Broadcast gym updates or dispatch private alerts with real-time read receipt tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all self-start md:self-auto active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Compose Notice
        </button>
      </div>

      {/* Notices Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.map((n) => {
          const targetMember = members.find((m) => m.id === n.targetMemberId);
          const isBroadcast = n.targetAudience === 'All Members';
          const readCount = n.readByMemberIds.length;
          const totalTargetCount = isBroadcast ? members.length : 1;

          return (
            <div
              key={n.id}
              className="bg-white border border-neutral-200/70 rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          n.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : n.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {n.priority} Priority
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase">
                        {n.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-neutral-900 text-sm mt-1.5">{n.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-neutral-500 shrink-0 whitespace-nowrap">
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      {readCount} / {totalTargetCount} Read
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">{n.message}</p>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-neutral-500 min-w-0">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Target:{' '}
                    <strong className="text-neutral-800">
                      {n.targetAudience === 'Specific Member'
                        ? targetMember?.fullName || 'Specific Athlete'
                        : n.targetAudience}
                    </strong>
                  </span>
                </div>

                <span className="font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                  Published: {n.publishedDate}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose Notice Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Compose Notice or Announcement"
        description="Broadcast a gym-wide announcement or send a targeted client alert."
        maxWidth="lg"
      >
        <form onSubmit={handlePublish} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Notice Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Update / Payment Due"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#7155E8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="General">General</option>
                <option value="Payment">Payment</option>
                <option value="Workout">Workout</option>
                <option value="Diet">Diet</option>
                <option value="Schedule">Schedule</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e: any) => setTargetAudience(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
              >
                <option value="All Members">All Members</option>
                <option value="Specific Member">Specific Member</option>
                <option value="Overdue Members">Members with Overdue Payments</option>
                <option value="Expiring Soon">Memberships Expiring Soon</option>
              </select>
            </div>

            {targetAudience === 'Specific Member' && (
              <div>
                <label className="block text-neutral-600 mb-1">Select Member</label>
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type the announcement or direct client instruction..."
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl leading-relaxed focus:outline-none focus:border-[#7155E8]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7155E8] hover:bg-[#6245DE] text-white rounded-xl font-bold shadow-xs transition-all active:scale-95"
            >
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
