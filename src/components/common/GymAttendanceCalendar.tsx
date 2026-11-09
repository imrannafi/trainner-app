import React, { useState } from 'react';
import {
  CheckCircle2,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';

interface GymAttendanceCalendarProps {
  memberId: string;
  memberName: string;
  checkInDates: string[]; // YYYY-MM-DD
  onToggleDate: (dateStr: string) => void;
  isEditable?: boolean;
  roleLabel?: 'client' | 'trainer';
}

export const GymAttendanceCalendar: React.FC<GymAttendanceCalendarProps> = ({
  memberName,
  checkInDates = [],
  onToggleDate,
  isEditable = true,
  roleLabel = 'client'
}) => {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 0-indexed, 10 = November

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentYear(2026);
    setCurrentMonth(10);
  };

  const formatDateStr = (year: number, month: number, day: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const startDayOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const checkInSet = new Set(checkInDates);

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const thisMonthCheckIns = checkInDates.filter((d) => d.startsWith(monthPrefix));
  const monthlyCount = thisMonthCheckIns.length;

  const todayStr = '2026-11-02';
  const isCheckedInToday = checkInSet.has(todayStr);

  return (
    <div className="bg-white border border-neutral-200/70 rounded-3xl p-4 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
      {/* Top Header & Monthly Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#F0EEFC] text-[#7155E8] rounded-2xl shrink-0">
              <Dumbbell className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[#171717] tracking-tight truncate">
              Monthly Gym Attendance Grid
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {roleLabel === 'client'
              ? 'Tap any day you attended the gym or completed a workout session'
              : `Workout attendance calendar logged for ${memberName}`}
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-[#F5F5F5] text-neutral-600 rounded-xl transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold font-mono text-[#171717] min-w-32 text-center whitespace-nowrap">
            {monthNames[currentMonth]} {currentYear}
          </span>

          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-[#F5F5F5] text-neutral-600 rounded-xl transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {(currentYear !== 2026 || currentMonth !== 10) && (
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="text-xs font-bold text-[#7155E8] ml-1 px-3 py-1 bg-[#F0EEFC] rounded-full whitespace-nowrap"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-200/80">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[11px] font-semibold text-neutral-500 block truncate">
            Workouts Attended
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {monthlyCount}
            </span>
            <span className="text-xs text-neutral-500 font-medium truncate">
              days in {monthNames[currentMonth].slice(0, 3)}
            </span>
          </div>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-[11px] font-semibold text-neutral-500 block truncate">
            Target Consistency
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {Math.min(100, Math.round((monthlyCount / 16) * 100))}%
            </span>
            <span className="text-xs text-neutral-500 truncate">of 16 sessions</span>
          </div>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-[11px] font-semibold text-neutral-500 block truncate">
            Active Streak
          </span>
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span className="text-base sm:text-lg font-bold font-mono text-neutral-900 tabular-nums truncate">
              {monthlyCount >= 3 ? `${monthlyCount} Days` : 'Building'}
            </span>
          </div>
        </div>

        {/* 1-Tap Check-In for Today */}
        <div className="flex items-center justify-end col-span-2 lg:col-span-1">
          {isEditable ? (
            <button
              type="button"
              onClick={() => onToggleDate(todayStr)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                isCheckedInToday
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isCheckedInToday ? 'Attended Today' : 'Mark Attended Today'}</span>
            </button>
          ) : (
            <div className="text-right w-full">
              <span className="text-[11px] font-mono text-neutral-500 block">Today's Status</span>
              <span
                className={`text-xs font-bold ${
                  isCheckedInToday ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                {isCheckedInToday ? 'Attended Today' : 'Not Logged Yet'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 bg-neutral-100/70 border-b border-neutral-200 text-center py-2 text-[10px] sm:text-[11px] font-semibold text-neutral-600 font-mono">
          {daysOfWeek.map((day) => (
            <div key={day} className="truncate px-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100">
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-13 sm:min-h-16 p-1 bg-neutral-50/40 text-neutral-300"
            />
          ))}

          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = formatDateStr(currentYear, currentMonth, dayNum);
            const isChecked = checkInSet.has(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={!isEditable}
                onClick={() => isEditable && onToggleDate(dateStr)}
                className={`min-h-13 sm:min-h-16 p-1 sm:p-1.5 flex flex-col justify-between items-start transition-colors relative text-left select-none overflow-hidden min-w-0 ${
                  isEditable ? 'cursor-pointer hover:bg-neutral-50' : 'cursor-default'
                } ${
                  isChecked ? 'bg-emerald-50/80 hover:bg-emerald-100/80' : 'bg-white'
                } ${isToday ? 'ring-2 ring-inset ring-neutral-900 z-10' : ''}`}
                title={`${dateStr}: ${
                  isChecked ? 'Worked out / Attended Gym' : 'Rest day / Click to mark attended'
                }`}
              >
                {/* Day Number and Mobile-Safe Today Indicator */}
                <div className="w-full flex items-center justify-between gap-0.5 min-w-0">
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-bold leading-none tabular-nums ${
                      isChecked
                        ? 'text-emerald-900'
                        : isToday
                        ? 'text-neutral-900 font-extrabold'
                        : 'text-neutral-600'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="hidden sm:inline-block text-[9px] font-semibold px-1 py-0.5 bg-neutral-900 text-white rounded font-mono leading-none shrink-0">
                      Today
                    </span>
                  )}
                </div>

                {/* Checked-in Indicator */}
                <div className="w-full mt-auto pt-1 flex items-center justify-center sm:justify-start">
                  {isChecked && (
                    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-1 sm:px-1.5 py-0.5 rounded w-full min-w-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span className="hidden md:inline truncate">Attended</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Footer / Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 pt-1">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 text-[10px] font-bold">
              ✓
            </span>
            <span className="font-medium text-neutral-700">Gym Attended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-neutral-200" />
            <span>Rest / Not Logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-neutral-900" />
            <span>Today</span>
          </div>
        </div>

        <div className="font-mono text-[11px] text-neutral-600 tabular-nums">
          Total Month Record:{' '}
          <span className="font-bold text-neutral-900">{monthlyCount} Days</span>
        </div>
      </div>
    </div>
  );
};
