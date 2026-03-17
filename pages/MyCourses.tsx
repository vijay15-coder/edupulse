import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, GraduationCap, Users } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MyCoursesProps {
  user: User;
  setActiveTab?: (tab: string) => void;
}

interface MyCourseRow {
  id: string;
  subjectName: string;
  subjectCode: string;
  courseName: string;
  semester: number;
  year: number;
  classesCount: number;
  sectionLabel: string;
  studentsCount: number;
  crNumbers: string;
}

const MyCourses: React.FC<MyCoursesProps> = ({ user, setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MyCourseRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          setRows([]);
          return;
        }

        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code, semester, max_students, course_id')
          .eq('college_id', user.college_id)
          .eq('faculty_id', user.id);

        if (subjectsError) throw subjectsError;

        const subjects = subjectsData || [];
        if (subjects.length === 0) {
          setRows([]);
          return;
        }

        const subjectIds = subjects.map((s: any) => s.id);
        const courseIds = [...new Set(subjects.map((s: any) => s.course_id).filter(Boolean))];

        const [coursesRes, timetableRes, attendanceRes, sectionsRes] = await Promise.all([
          courseIds.length
            ? supabase.from('courses').select('id, name').in('id', courseIds)
            : Promise.resolve({ data: [], error: null } as any),
          supabase.from('timetable').select('id, subject_id').in('subject_id', subjectIds),
          supabase.from('attendance').select('subject_id, student_id').in('subject_id', subjectIds),
          supabase
            .from('academic_sections')
            .select('department, year, section')
            .eq('college_id', user.college_id)
            .order('year', { ascending: true })
        ]);

        if (coursesRes.error) throw coursesRes.error;
        if (timetableRes.error) throw timetableRes.error;
        if (attendanceRes.error) throw attendanceRes.error;
        if (sectionsRes.error) throw sectionsRes.error;

        const coursesById = new Map<string, string>(
          (coursesRes.data || []).map((c: any) => [c.id, c.name])
        );

        const classesBySubject = new Map<string, number>();
        for (const slot of timetableRes.data || []) {
          const current = classesBySubject.get(slot.subject_id) || 0;
          classesBySubject.set(slot.subject_id, current + 1);
        }

        const studentsBySubject = new Map<string, Set<string>>();
        const studentHitBySubject = new Map<string, Map<string, number>>();
        for (const row of attendanceRes.data || []) {
          if (!studentsBySubject.has(row.subject_id)) studentsBySubject.set(row.subject_id, new Set());
          studentsBySubject.get(row.subject_id)!.add(row.student_id);

          if (!studentHitBySubject.has(row.subject_id)) studentHitBySubject.set(row.subject_id, new Map());
          const countMap = studentHitBySubject.get(row.subject_id)!;
          countMap.set(row.student_id, (countMap.get(row.student_id) || 0) + 1);
        }

        const allAttendingStudentIds = Array.from(
          new Set((attendanceRes.data || []).map((r: any) => r.student_id))
        );

        const profilesRes = allAttendingStudentIds.length
          ? await supabase
              .from('profiles')
              .select('id, student_id')
              .in('id', allAttendingStudentIds)
          : ({ data: [], error: null } as any);

        if (profilesRes.error) throw profilesRes.error;

        const studentIdByProfile = new Map<string, string>(
          (profilesRes.data || []).map((p: any) => [p.id, p.student_id || p.id])
        );

        const sections = sectionsRes.data || [];
        const normalize = (value?: string) =>
          String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const userDept = normalize(user.department);

        const builtRows = subjects.map((subject: any) => {
          const semester = subject.semester || 1;
          const year = Math.max(1, Math.ceil(semester / 2));
          const matchingSections = sections.filter((s: any) => {
            const sameYear = Number(s.year) === year;
            if (!userDept) return sameYear;
            return sameYear && normalize(s.department).includes(userDept);
          });

          const sectionLabel = matchingSections.length
            ? `Year ${year} / Section ${matchingSections.map((s: any) => s.section).join(', ')}`
            : `Year ${year} / Section N/A`;

          const studentsSet = studentsBySubject.get(subject.id);
          const studentsCount = studentsSet?.size || 0;

          const hitMap = studentHitBySubject.get(subject.id) || new Map<string, number>();
          const crProfileIds = Array.from(hitMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([profileId]) => profileId);
          const crNumbers = crProfileIds.length
            ? crProfileIds.map((profileId) => studentIdByProfile.get(profileId) || profileId).join(', ')
            : 'Not assigned';

          return {
            id: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            courseName: coursesById.get(subject.course_id) || 'N/A',
            semester,
            year,
            classesCount: classesBySubject.get(subject.id) || 0,
            sectionLabel,
            studentsCount: studentsCount || subject.max_students || 0,
            crNumbers
          } as MyCourseRow;
        });

        setRows(builtRows);
      } catch (err) {
        console.warn('Failed to load faculty courses:', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.id, user.college_id, user.department]);

  const totals = useMemo(() => {
    return {
      courses: rows.length,
      classes: rows.reduce((acc, row) => acc + row.classesCount, 0),
      students: rows.reduce((acc, row) => acc + row.studentsCount, 0)
    };
  }, [rows]);

  return (
    <div className="space-y-6 px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab?.('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 text-sm">Subjects assigned to you with classes, sections and student details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Assigned Courses</p>
          <p className="text-2xl font-bold text-slate-900">{totals.courses}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Total Classes</p>
          <p className="text-2xl font-bold text-slate-900">{totals.classes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Total Students</p>
          <p className="text-2xl font-bold text-slate-900">{totals.students}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Teaching Assignments</h2>
          <span className="text-xs text-slate-500">Faculty: {user.name}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading assigned courses...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            No assigned courses found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Course / Subject</th>
                  <th className="text-left p-3">Year / Class Section</th>
                  <th className="text-left p-3">Classes</th>
                  <th className="text-left p-3">Students</th>
                  <th className="text-left p-3">CR Number(s)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{row.subjectName}</div>
                      <div className="text-xs text-slate-500">{row.subjectCode} • {row.courseName} • Sem {row.semester}</div>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-2 text-slate-700">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        {row.sectionLabel}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {row.classesCount}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-2 text-slate-700">
                        <Users className="w-4 h-4 text-indigo-600" />
                        {row.studentsCount}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{row.crNumbers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
