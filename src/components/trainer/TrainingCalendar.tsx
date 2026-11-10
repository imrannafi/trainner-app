import React, { useState } from 'react';
import { todayDhaka } from '../../lib/dates';
import { storage } from '../../services/storage';
import { Plus } from 'lucide-react';
import { TrainingSessionEvent, Member } from '../../types';
import { Avatar, Modal, showToast } from '../common/CommonUI';

interface TrainingCalendarProps {
  sessions: TrainingSessionEvent[];
  members: Member[];
  onScheduleSession: (session: any) => void;
  onMarkAttendance: (sessionId: string, status: 'Scheduled' | 'Present' | 'Absent' | 'Cancelled' | 'Rescheduled', notes?: string) => void;
  onSelectMember: (memberId: string) => void;
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  sessions,
  members,
  onScheduleSession,
  onMarkAttendance,
  onSelectMember
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(todayDhaka());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [sessionTitle, setSessionTitle] = useState('Personal Coaching: Hypertrophy & Technique');
  const [focusArea, setFocusArea] = useState('Chest & Heavy Triceps');
  const [trainerNotes, setTrainerNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;

    onScheduleSession({
      memberId: member.id,
      memberName: member.fullName,
      trainerId: storage.getTrainer().id,
      sessionDate,
      startTime,
      endTime,
      title: sessionTitle,
      focusArea,
      attendanceStatus: 'Scheduled',
      trainerNotes
    });

    setShowModal(false);
    showToast(`1-on-1 PT session scheduled for ${member.fullName}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Training Calendar & Attendance
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Book 1-on-1 personal coaching slots, manage package deductions, and mark attendance
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all self-start md:self-auto active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Schedule 1-on-1 Session
        </button>
      </div>

      {/* Package Sessions Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white border border-neutral-200/70 rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-w-0"
          >
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <Avatar src={m.avatarUrl} name={m.fullName} size="xs" />
              <span className="font-bold text-xs text-neutral-900 truncate">{m.fullName}</span>
            </div>
            <div className="flex items-baseline justify-between font-mono tabular-nums text-xs">
              <span className="text-neutral-500">Remaining:</span>
              <span className="font-bold text-emerald-700">
                {m.remainingSessions} / {m.totalPackageSessions}
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((m.remainingSessions / Math.max(1, m.totalPackageSessions)) * 100))}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sessions Table / List */}
      <div className="bg-white border border-neutral-200/70 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            All Scheduled & Historical Sessions
          </span>
          <span className="text-xs font-mono tabular-nums text-neutral-500">{sessions.length} Sessions Logged</span>
        </div>

        <div className="divide-y divide-neutral-100 text-xs">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 hover:bg-neutral-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#F5F5F5] border border-neutral-200/70 flex flex-col items-center justify-center font-mono tabular-nums text-[11px] shrink-0">
                  <span className="font-bold text-neutral-900">{s.sessionDate.split('-')[2]}</span>
                  <span className="text-[9px] text-neutral-500 uppercase">{s.sessionDate.split('-')[1]}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectMember(s.memberId)}
                      className="font-bold text-neutral-900 hover:text-[#7155E8] transition-colors"
                    >
                      {s.memberName}
                    </button>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="text-neutral-700 font-medium">{s.title}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-neutral-500 font-mono tabular-nums text-[11px] mt-1">
                    <span>{s.startTime} - {s.endTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>Focus: {s.focusArea}</span>
                  </div>

                  {s.trainerNotes && (
                    <p className="text-[11px] text-neutral-500 italic mt-1">
                      Note: {s.trainerNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Status and Attendance Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 pl-14 lg:pl-0">
                <span
                  className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    s.attendanceStatus === 'Present'
                      ? 'text-emerald-700 bg-emerald-50'
                      : s.attendanceStatus === 'Absent'
                      ? 'text-rose-700 bg-rose-50'
                      : s.attendanceStatus === 'Rescheduled'
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-neutral-700 bg-neutral-100'
                  }`}
                >
                  {s.attendanceStatus}
                </span>

                {s.attendanceStatus === 'Scheduled' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onMarkAttendance(s.id, 'Present', 'Completed scheduled workout')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-[11px] transition-all active:scale-95 whitespace-nowrap"
                    >
                      Mark Present
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkAttendance(s.id, 'Absent', 'Client no-show')}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl font-semibold text-[11px] transition-all active:scale-95 whitespace-nowrap"
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkAttendance(s.id, 'Rescheduled', 'Moved to next open slot')}
                      className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-xl text-[11px] font-medium transition-all active:scale-95 whitespace-nowrap"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Session Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Book 1-on-1 Coaching Session"
        description="Schedule a personal coaching slot and sync to client calendar."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Athlete</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl bg-[#F5F5F5] focus:bg-white font-medium focus:outline-none focus:border-[#7155E8]"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.remainingSessions} sessions left)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-neutral-600 mb-1">Date</label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">Start</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-600 mb-1">End</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-600 mb-1">Session Title</label>
            <input
              type="text"
              required
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-neutral-600 mb-1">Target Focus Area</label>
            <input
              type="text"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-neutral-600 mb-1">Trainer Cues & Preparation</label>
            <input
              type="text"
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="e.g. Check knee wrap tightness, spot on 95kg squat"
              className="w-full p-2.5 bg-[#F5F5F5] focus:bg-white border border-neutral-200 rounded-xl"
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
              Confirm & Sync to Calendar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
