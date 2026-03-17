import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

interface StudentAttendanceProps {
  user: User;
}

interface StudentAttendanceRow {
  id: string;
  date: string;
  subjectName: string;
  timeRange: string;
  status: AttendanceStatus;
  typeLabel: 'Class' | 'Lab';
  createdAt?: string;
}

const StudentAttendance: React.FC<StudentAttendanceProps> = ({ user }) => {
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const normalizeDay = (value: string) => String(value || '').trim().toLowerCase();

  const normalizeTime = (value: string) => {
    if (!value) return '';
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return value.trim().toUpperCase();
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || '0', 10);
    const period = match[4]?.toUpperCase();
    if (period) {
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (value: string) => {
    const normalized = normalizeTime(value);
    if (!normalized || normalized.length !== 5) return value;
    const [hourText, minuteText] = normalized.split(':');
    const hours = Number(hourText);
    const minutes = Number(minuteText);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = ((hours + 11) % 12) + 1;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTimeRange = (start: string, end: string) => {
    if (!start && !end) return '';
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const loadAttendance = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, date, subject_id, status, created_at')
        .eq('student_id', user.id)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      const attendanceRows = attendanceData || [];
      const subjectIds = Array.from(
        new Set(attendanceRows.map((item: any) => item.subject_id).filter((id: string | null): id is string => Boolean(id)))
      );

      let subjectById = new Map<string, { name: string; faculty_id?: string }>();
      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, faculty_id')
          .in('id', subjectIds);
        if (subjectsError) throw subjectsError;

        subjectById = new Map(
          (subjectsData || []).map((subject: any) => [
            subject.id,
            { name: subject.name || 'Unknown Subject', faculty_id: subject.faculty_id || undefined }
          ])
        );
      }

      let timetableRows: any[] = [];
      if (subjectIds.length > 0) {
        const { data: timetableData, error: timetableError } = await supabase
          .from('timetable')
          .select('subject_id, day_of_week, start_time, end_time')
          .in('subject_id', subjectIds);
        if (!timetableError) {
          timetableRows = timetableData || [];
        }
      }

      const timetableByKey = new Map<string, { start: string; end: string }>();
      timetableRows
        .sort((a, b) => normalizeTime(a.start_time || '').localeCompare(normalizeTime(b.start_time || '')))
        .forEach((entry: any) => {
          const key = `${entry.subject_id}-${normalizeDay(entry.day_of_week)}`;
          if (!timetableByKey.has(key)) {
            timetableByKey.set(key, {
              start: entry.start_time || '',
              end: entry.end_time || ''
            });
          }
        });

      const mappedRows: StudentAttendanceRow[] = attendanceRows.map((item: any) => {
        const subject = subjectById.get(item.subject_id);
        const dateObj = new Date(`${item.date}T00:00:00`);
        const dayKey = normalizeDay(dateObj.toLocaleDateString('en-US', { weekday: 'long' }));
        const timetableMatch = timetableByKey.get(`${item.subject_id}-${dayKey}`);
        const fallbackTime = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const timeRange = timetableMatch
          ? formatTimeRange(timetableMatch.start, timetableMatch.end)
          : fallbackTime
          ? `Marked at ${fallbackTime}`
          : 'Time not available';
        const subjectName = subject?.name || 'Unknown Subject';
        const typeLabel: 'Class' | 'Lab' = /lab|practical|workshop/i.test(subjectName) ? 'Lab' : 'Class';

        return {
          id: item.id,
          date: item.date,
          subjectName,
          timeRange,
          status: (item.status as AttendanceStatus) || 'ABSENT',
          typeLabel,
          createdAt: item.created_at || undefined
        };
      });

      setRows(mappedRows);
      if (mappedRows.length > 0) {
        setSelectedDate((prev) => (mappedRows.some((row) => row.date === prev) ? prev : mappedRows[0].date));
      }
    } catch (err) {
      console.warn('Failed to load student attendance:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`student-attendance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          void loadAttendance();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAttendance, user.id]);

  const sortedUniqueDates = useMemo(
    () => {
      const dates = Array.from(new Set(rows.map((row) => String(row.date)))) as string[];
      return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    },
    [rows]
  );

  const selectedDateRows = useMemo(
    () => rows.filter((row) => row.date === selectedDate),
    [rows, selectedDate]
  );

  const dateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : '';

  const monthLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative -m-6 p-4 sm:p-6 min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200">
      <div className="pointer-events-none absolute -top-24 -left-10 w-72 h-72 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="rounded-[2rem] overflow-hidden shadow-lg shadow-indigo-900/10 border border-indigo-200/30">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 text-white px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Attendance</h2>
                <p className="text-indigo-100 text-sm mt-1">{dateLabel || 'No date selected'}</p>
              </div>
              <div className="flex items-center gap-2 text-indigo-50 bg-white/10 rounded-xl px-3 py-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-semibold">{monthLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-white px-4 py-3 sm:px-6 border-b border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto">
              {sortedUniqueDates.map((day) => {
                const d = new Date(`${day}T00:00:00`);
                const isActive = day === selectedDate;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`min-w-[68px] px-3 py-2 rounded-2xl transition ${
                      isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <p className={`text-[11px] font-bold ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-black leading-none mt-1">{d.getDate()}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => void loadAttendance()}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading attendance...
          </div>
        ) : selectedDateRows.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center text-slate-500 text-sm">
            No attendance records found for this date.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateRows.map((row) => {
              const isPresent = row.status === 'PRESENT';
              const statusClass = isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
              const statusText = isPresent ? 'Present' : 'Absent';
              const typeClass = row.typeLabel === 'Lab' ? 'bg-violet-500' : 'bg-sky-500';

              return (
                <div
                  key={row.id}
                  className="relative overflow-hidden rounded-[1.7rem] bg-white shadow-sm border border-slate-100 p-5 sm:p-6 pr-20 sm:pr-24"
                >
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{row.subjectName}</h3>
                    <p className="text-sm text-slate-600 font-semibold">
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString()} | {row.timeRange}
                    </p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>
                      {isPresent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {statusText}
                    </span>
                  </div>

                  <div
                    className={`absolute right-0 top-0 h-full w-14 sm:w-16 text-white ${typeClass} rounded-l-[1.7rem] flex items-center justify-center`}
                  >
                    <span className="text-xs sm:text-sm font-bold tracking-wider rotate-90 whitespace-nowrap">
                      {row.typeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;
