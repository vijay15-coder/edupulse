import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Building2, Target } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type CareerTrackType =
  | 'student-internships'
  | 'student-placement-preparation'
  | 'student-government-exams'
  | 'student-target-attendance'
  | 'student-target-cgpa';

interface StudentCareerTrackProps {
  user: User;
  track: CareerTrackType;
  setActiveTab?: (tab: string) => void;
}

const trackMeta: Record<CareerTrackType, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  'student-internships': {
    title: 'Internships',
    description: 'Browse internship opportunities, track applications, and monitor progress.',
    icon: Briefcase,
  },
  'student-placement-preparation': {
    title: 'Placement Preparation',
    description: 'Prepare with aptitude plans, coding practice goals, and interview readiness tasks.',
    icon: Target,
  },
  'student-government-exams': {
    title: 'Government Exams',
    description: 'Plan your preparation schedule for public sector and competitive examinations.',
    icon: Building2,
  },
  'student-target-attendance': {
    title: 'Target Attendance',
    description: 'Track your current attendance and plan how to meet your target attendance percentage.',
    icon: Target,
  },
  'student-target-cgpa': {
    title: 'Target CGPA',
    description: 'Estimate the SGPA required in upcoming semesters to reach your target CGPA.',
    icon: Target,
  },
};

const StudentCareerTrack: React.FC<StudentCareerTrackProps> = ({ user, track, setActiveTab }) => {
  const currentTrack = trackMeta[track];
  const Icon = currentTrack.icon;
  const [attendancePresent, setAttendancePresent] = useState<number>(0);
  const [attendanceTotal, setAttendanceTotal] = useState<number>(0);
  const [attendanceTarget, setAttendanceTarget] = useState<number>(75);
  const [classesPerDay, setClassesPerDay] = useState<number>(6);
  const [attendanceDataLoaded, setAttendanceDataLoaded] = useState(false);

  const [currentCgpa, setCurrentCgpa] = useState<number>(7.2);
  const [completedCredits, setCompletedCredits] = useState<number>(80);
  const [remainingCredits, setRemainingCredits] = useState<number>(80);
  const [targetCgpa, setTargetCgpa] = useState<number>(8.0);
  const [expectedRemainingSgpa, setExpectedRemainingSgpa] = useState<number>(8.5);

  const attendancePlan = useMemo(() => {
    const present = Math.max(0, attendancePresent);
    const total = Math.max(0, attendanceTotal);
    const target = Math.min(100, Math.max(0, attendanceTarget));
    const currentPercent = total > 0 ? (present / total) * 100 : 0;

    if (target >= 100) {
      return {
        currentPercent,
        additionalClassesNeeded: present === total ? 0 : null,
        canReach: present === total,
      };
    }

    if (currentPercent >= target) {
      return { currentPercent, additionalClassesNeeded: 0, canReach: true };
    }

    const numerator = (target * total) - (100 * present);
    const denominator = 100 - target;
    const needed = Math.ceil(numerator / denominator);

    return {
      currentPercent,
      additionalClassesNeeded: Number.isFinite(needed) ? Math.max(0, needed) : null,
      canReach: Number.isFinite(needed),
    };
  }, [attendancePresent, attendanceTotal, attendanceTarget]);

  const attendanceDaysNeeded = useMemo(() => {
    if (attendancePlan.additionalClassesNeeded === null) return null;
    if (attendancePlan.additionalClassesNeeded === 0) return 0;
    const perDay = Math.max(1, Math.floor(classesPerDay || 1));
    return Math.ceil(attendancePlan.additionalClassesNeeded / perDay);
  }, [attendancePlan.additionalClassesNeeded, classesPerDay]);

  const cgpaPlan = useMemo(() => {
    const safeCurrent = Math.max(0, Math.min(10, currentCgpa));
    const safeTarget = Math.max(0, Math.min(10, targetCgpa));
    const done = Math.max(0, completedCredits);
    const remaining = Math.max(0, remainingCredits);
    const total = done + remaining;

    if (remaining === 0) {
      return {
        requiredSgpa: null as number | null,
        projectedCgpa: safeCurrent,
        canReach: safeCurrent >= safeTarget,
      };
    }

    const required = ((safeTarget * total) - (safeCurrent * done)) / remaining;
    const projected = ((safeCurrent * done) + (expectedRemainingSgpa * remaining)) / total;

    return {
      requiredSgpa: required,
      projectedCgpa: projected,
      canReach: required <= 10,
    };
  }, [currentCgpa, targetCgpa, completedCredits, remainingCredits, expectedRemainingSgpa]);

  useEffect(() => {
    const loadStudentAttendanceSnapshot = async () => {
      if (track !== 'student-target-attendance') return;
      if (!isSupabaseConfigured) {
        setAttendanceDataLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', user.id);

        if (error) throw error;

        const rows = data || [];
        const presentCount = rows.filter((row: any) => row.status === 'PRESENT').length;

        setAttendancePresent(presentCount);
        setAttendanceTotal(rows.length);
      } catch (err) {
        console.warn('Failed to load attendance snapshot for target planner:', err);
      } finally {
        setAttendanceDataLoaded(true);
      }
    };

    void loadStudentAttendanceSnapshot();
  }, [track, user.id]);

  useEffect(() => {
    if (track !== 'student-target-attendance') return;
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`student-target-attendance-live-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${user.id}`,
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from('attendance')
              .select('status')
              .eq('student_id', user.id);
            if (error) throw error;

            const rows = data || [];
            const presentCount = rows.filter((row: any) => row.status === 'PRESENT').length;
            setAttendancePresent(presentCount);
            setAttendanceTotal(rows.length);
            setAttendanceDataLoaded(true);
          } catch (err) {
            console.warn('Failed to refresh live attendance snapshot:', err);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [track, user.id]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab?.('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{currentTrack.title}</h1>
          <p className="text-slate-500 text-sm">Career module for {user.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{currentTrack.title}</h2>
        </div>

        <p className="text-slate-600 mb-6">{currentTrack.description}</p>

        {track === 'student-target-attendance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-sm text-slate-700">
                <span className="block mb-1 font-semibold">Present Classes</span>
                <input
                  type="number"
                  min={0}
                  value={attendancePresent}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-slate-100"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="block mb-1 font-semibold">Total Conducted Classes</span>
                <input
                  type="number"
                  min={0}
                  value={attendanceTotal}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-slate-100"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="block mb-1 font-semibold">Target Attendance (%) - Text Box</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={attendanceTarget}
                  onChange={(e) => setAttendanceTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Target %"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="block mb-1 font-semibold">Avg Classes / Day</span>
                <input
                  type="number"
                  min={1}
                  value={classesPerDay}
                  onChange={(e) => setClassesPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 6"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              {attendanceDataLoaded && (
                <p className="text-xs text-slate-500 mb-2">
                  Live attendance is auto-updated from your attendance records.
                </p>
              )}
              <p className="text-sm text-slate-600">
                Current attendance: <span className="font-bold text-slate-900">{attendancePlan.currentPercent.toFixed(2)}%</span>
              </p>
              {attendancePlan.additionalClassesNeeded === 0 && (
                <p className="text-sm mt-2 font-semibold text-emerald-700">You already meet your attendance target.</p>
              )}
              {attendancePlan.additionalClassesNeeded !== null && attendancePlan.additionalClassesNeeded > 0 && (
                <p className="text-sm mt-2 font-semibold text-indigo-700">
                  Attend <span className="font-bold">{attendancePlan.additionalClassesNeeded}</span> consecutive classes to reach {attendanceTarget}%.
                </p>
              )}
              {attendanceDaysNeeded !== null && attendanceDaysNeeded > 0 && (
                <p className="text-sm mt-2 font-semibold text-sky-700">
                  You need to come to college for approximately <span className="font-bold">{attendanceDaysNeeded}</span> days
                  {' '}at {Math.max(1, Math.floor(classesPerDay || 1))} classes/day.
                </p>
              )}
              {!attendancePlan.canReach && (
                <p className="text-sm mt-2 font-semibold text-rose-700">
                  100% target is only possible if all classes attended.
                </p>
              )}
            </div>
          </div>
        )}

        {track === 'student-target-cgpa' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="number"
                min={0}
                max={10}
                step={0.01}
                value={currentCgpa}
                onChange={(e) => setCurrentCgpa(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Current CGPA"
              />
              <input
                type="number"
                min={0}
                value={completedCredits}
                onChange={(e) => setCompletedCredits(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Completed credits"
              />
              <input
                type="number"
                min={0}
                value={remainingCredits}
                onChange={(e) => setRemainingCredits(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Remaining credits"
              />
              <input
                type="number"
                min={0}
                max={10}
                step={0.01}
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Target CGPA"
              />
              <input
                type="number"
                min={0}
                max={10}
                step={0.01}
                value={expectedRemainingSgpa}
                onChange={(e) => setExpectedRemainingSgpa(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Expected SGPA"
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
              {cgpaPlan.requiredSgpa !== null && (
                <p className="text-sm text-slate-700">
                  Required average SGPA for remaining credits:{' '}
                  <span className="font-bold text-slate-900">{cgpaPlan.requiredSgpa.toFixed(2)}</span>
                </p>
              )}
              {cgpaPlan.requiredSgpa !== null && !cgpaPlan.canReach && (
                <p className="text-sm font-semibold text-rose-700">
                  Target is not feasible with SGPA scale up to 10.00.
                </p>
              )}
              {cgpaPlan.requiredSgpa !== null && cgpaPlan.canReach && (
                <p className="text-sm font-semibold text-emerald-700">
                  Target is feasible. Stay above the required SGPA.
                </p>
              )}
              <p className="text-sm text-slate-700">
                Projected final CGPA (with expected SGPA):{' '}
                <span className="font-bold text-indigo-700">{cgpaPlan.projectedCgpa.toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCareerTrack;
