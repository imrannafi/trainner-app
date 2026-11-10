import React, { useState } from 'react';
import { todayDhaka } from '../../lib/dates';
import {
  Search,
  Phone,
  ChevronRight,
  Star,
  ArrowUpDown,
  Grid,
  List,
  Mail,
  Check,
  Users,
  UserPlus
} from 'lucide-react';
import { Member } from '../../types';
import { Avatar, EmptyState, showToast } from '../common/CommonUI';

interface MembersListProps {
  members: Member[];
  onSelectMember: (memberId: string) => void;
  onOpenAddMember: () => void;
  onOpenDirectEnroll?: () => void;
  onOpenRecordPayment: (memberId?: string) => void;
  onActivateAccount: (memberId: string) => Promise<void>;
  onDeleteMember: (memberId: string) => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  onSelectMember,
  onOpenAddMember,
  onOpenDirectEnroll,
  onActivateAccount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'days' | 'due' | 'status'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendInvitation = async (m: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    if (m.userId) {
      showToast(`${m.fullName} already has an account.`, 'info');
      return;
    }
    setCopiedId(m.id);
    try {
      await onActivateAccount(m.id);
      showToast(`Invitation emailed to ${m.email}.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setCopiedId(null);
    }
  };

  const filtered = members
    .filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.fitnessGoal.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'Active' && m.status === 'Active') ||
        (statusFilter === 'Expiring' && m.status === 'Expiring Soon') ||
        (statusFilter === 'Expired' && m.status === 'Expired') ||
        (statusFilter === 'Favorites' && favorites.has(m.id)) ||
        (statusFilter === 'Payment Due' &&
          (m.paymentStatus === 'Overdue' || m.paymentStatus === 'Partially Paid'));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'due') {
        const dueA = a.packagePrice - a.amountPaid;
        const dueB = b.packagePrice - b.amountPaid;
        return dueB - dueA;
      }
      if (sortBy === 'days') {
        return new Date(a.membershipEndDate).getTime() - new Date(b.membershipEndDate).getTime();
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
            Member Directory
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse active clients, subscription validity, workout compliance, and outstanding fee ledgers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {onOpenDirectEnroll && (
            <button
              type="button"
              onClick={onOpenDirectEnroll}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F0EEFC] hover:bg-[#E4DFFA] text-[#7155E8] text-xs font-bold rounded-2xl transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Enroll Member</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddMember}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7155E8] hover:bg-[#6245DE] text-white text-xs font-bold rounded-2xl shadow-[0_4px_16px_rgba(113,85,232,0.35)] transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Review Applications</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members by name, goal, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-xs bg-[#F5F5F5] hover:bg-[#EFEFEF] focus:bg-white border border-neutral-200/60 focus:border-[#7155E8] rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-[#7155E8]/20"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1.5 bg-[#F5F5F5] px-3 py-1.5 rounded-2xl border border-neutral-200/60 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="text-neutral-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort members"
                className="bg-transparent font-bold text-[#171717] focus:outline-none cursor-pointer"
              >
                <option value="name">Name (A-Z)</option>
                <option value="due">Highest Dues</option>
                <option value="days">Expiring Soonest</option>
              </select>
            </div>

            <div className="flex items-center bg-[#F5F5F5] p-1 rounded-2xl border border-neutral-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-xs text-[#7155E8]'
                    : 'text-neutral-400 hover:text-neutral-700'
                }`}
                title="Grid Cards View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white shadow-xs text-[#7155E8]'
                    : 'text-neutral-400 hover:text-neutral-700'
                }`}
                title="List Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {[
            { id: 'all', label: `All (${members.length})` },
            { id: 'Favorites', label: `Starred (${favorites.size})` },
            { id: 'Active', label: 'Active' },
            { id: 'Expiring', label: 'Expiring Soon' },
            { id: 'Expired', label: 'Expired' },
            { id: 'Payment Due', label: 'Payment Due' }
          ].map((cat) => {
            const isSelected = statusFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setStatusFilter(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'bg-[#F5F5F5] text-neutral-600 hover:bg-neutral-200/70 hover:text-[#171717]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No members match your filter"
          description="Clear the search input or select another membership filter pill above."
          actionText="Reset Filters"
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((member) => {
            const dueAmount = Math.max(0, member.packagePrice - member.amountPaid);
            const isFavorite = favorites.has(member.id);

            const todayMs = new Date(todayDhaka()).getTime();
            const endMs = new Date(member.membershipEndDate).getTime();
            const remainingDays = Math.max(0, Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24)));

            const workoutScore = member.status === 'Expired' ? 45 : 92;
            const dietScore = member.status === 'Expired' ? 50 : 88;

            return (
              <div
                key={member.id}
                onClick={() => onSelectMember(member.id)}
                className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative min-w-0"
              >
                <div>
                  {/* Large Profile Photograph */}
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-neutral-100 mb-4">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F0EEFC] text-[#7155E8] text-4xl font-extrabold">
                        {member.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}

                    {/* Unified Top Overlay Flex Row */}
                    <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 pointer-events-none">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-xs whitespace-nowrap ${
                          member.status === 'Active'
                            ? 'bg-[#10B981]/90 text-white'
                            : member.status === 'Expiring Soon'
                            ? 'bg-[#F59E0B]/90 text-white'
                            : 'bg-[#EF4444]/90 text-white'
                        }`}
                      >
                        {member.status}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(member.id, e)}
                        className={`pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shrink-0 cursor-pointer ${
                          isFavorite
                            ? 'bg-white text-[#F59E0B] shadow-md scale-105'
                            : 'bg-black/30 text-white hover:bg-white hover:text-[#F59E0B]'
                        }`}
                        title={isFavorite ? 'Remove Star' : 'Star Athlete'}
                      >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-[#F59E0B]' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Name, Goal, and Remaining Days */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-lg text-[#171717] group-hover:text-[#7155E8] transition-colors truncate">
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">
                        {member.fitnessGoal} · {member.fitnessLevel}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-neutral-400 block font-mono tabular-nums">
                        {remainingDays}d left
                      </span>
                      <span className="text-[10px] text-neutral-300">Validity</span>
                    </div>
                  </div>

                  {/* Adherence and Payment Status Strip */}
                  <div className="mt-4 p-3.5 bg-[#F5F5F5] rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-neutral-200/60">
                      <span className="text-neutral-500 font-medium">Payment Ledger:</span>
                      <span
                        className={`font-bold font-mono tabular-nums whitespace-nowrap ${
                          dueAmount > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                        }`}
                      >
                        {dueAmount > 0 ? `৳${dueAmount.toLocaleString()} Due` : 'Fully Paid'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-neutral-500">Workout</span>
                          <span className="font-bold text-[#10B981] font-mono tabular-nums">
                            {workoutScore}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#10B981] rounded-full"
                            style={{ width: `${workoutScore}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-neutral-500">Diet</span>
                          <span className="font-bold text-[#7155E8] font-mono tabular-nums">
                            {dietScore}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#7155E8] rounded-full"
                            style={{ width: `${dietScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => sendInvitation(member, e)}
                      disabled={copiedId === member.id}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      title={member.userId ? 'Client has an account' : 'Email an invitation to create their account'}
                      aria-label={member.userId ? 'Client has an account' : `Email an invitation to ${member.fullName}`}
                    >
                      {member.userId ? (
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`tel:${member.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-neutral-400 hover:text-[#7155E8] hover:bg-neutral-100 rounded-xl transition-colors"
                      title={`Call ${member.fullName}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <span className="font-bold text-[#7155E8] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 whitespace-nowrap">
                    View Profile <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#F5F5F5] border-b border-neutral-200 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Member</th>
                  <th className="py-3.5 px-4">Goal & Level</th>
                  <th className="py-3.5 px-4">Membership Period</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filtered.map((m) => {
                  const due = Math.max(0, m.packagePrice - m.amountPaid);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => onSelectMember(m.id)}
                      className="hover:bg-[#F0EEFC]/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar src={m.avatarUrl} name={m.fullName} size="sm" />
                          <div>
                            <span className="font-bold text-[#171717] block">{m.fullName}</span>
                            <span className="text-[11px] text-neutral-400 font-mono">{m.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-700 block">{m.fitnessGoal}</span>
                        <span className="text-[11px] text-neutral-400">{m.fitnessLevel}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-neutral-700 block">{m.membershipDuration}</span>
                        <span className="text-[11px] text-neutral-400">Ends {m.membershipEndDate}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold font-mono tabular-nums block ${
                            due > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}
                        >
                          {due > 0 ? `৳${due.toLocaleString()} Due` : 'Paid in Full'}
                        </span>
                        <span className="text-[11px] text-neutral-400">{m.paymentStatus}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMember(m.id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-[#7155E8] bg-[#F0EEFC] hover:bg-[#7155E8] hover:text-white rounded-xl transition-all cursor-pointer"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
