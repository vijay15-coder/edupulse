
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, Calendar, Filter, Save, User as UserIcon, Loader2 } from 'lucide-react';
import { User, UserRole, Subject, AttendanceRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AttendanceProps {
  user: User;
  onAction?: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, onAction }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [allDepartmentStudents, setAllDepartmentStudents] = useState<User[]>([]);
  const [subjectScopes, setSubjectScopes] = useState<Record<string, Array<{ year?: number; section?: string }>>>({});
  const [students, setStudents] = useState<User[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);

  const isFaculty = user.role === UserRole.FACULTY;

  useEffect(() => {
    const loadData = async () => {
      if (!isSupabaseConfigured) {
        setFacultySubjects([]);
        setStudents([]);
        setStudentAttendance([]);
        return;
      }

      try {
        if (isFaculty) {
          const { data: subjectsData, error: subjectsError } = await supabase
            .from('subjects')
            .select('*')
            .eq('college_id', user.college_id)
            .eq('faculty_id', user.id);

          if (subjectsError) throw subjectsError;

          const subjectIds = (subjectsData || []).map((s: any) => s.id).filter(Boolean);

          const studentsQuery = supabase
            .from('profiles')
            .select('*')
            .eq('college_id', user.college_id)
            .eq('role', UserRole.STUDENT);

          const scopedStudentsQuery = user.department
            ? studentsQuery.eq('department', user.department)
            : studentsQuery;

          const [
            { data: studentsData, error: studentsError },
            timetableResponse
          ] = await Promise.all([
            scopedStudentsQuery,
            supabase
              .from('timetable')
              .select('subject_id, year, section')
              .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
          ]);

          if (studentsError) throw studentsError;

          const mappedSubjects: Subject[] = (subjectsData || []).map((s: any) => ({
            id: s.id,
            college_id: s.college_id,
            course_id: s.course_id,
            faculty_id: s.faculty_id,
            code: s.code,
            name: s.name,
            semester: s.semester,
            credits: s.credits,
            created_at: s.created_at
          }));

          const mappedStudents: User[] = (studentsData || []).map((p: any) => ({
            id: p.id,
            college_id: p.college_id,
            name: p.name,
            email: p.email,
            role: p.role as UserRole,
            department: p.department,
            avatar: p.avatar_url,
            student_id: p.student_id,
            faculty_id: p.faculty_id,
            phone: p.phone,
            address: p.address,
            created_at: p.created_at,
            updated_at: p.updated_at
          }));

          const timetableRows = timetableResponse.error ? [] : (timetableResponse.data || []);
          const scopesBySubject: Record<string, Array<{ year?: number; section?: string }>> = {};

          timetableRows.forEach((row: any) => {
            const subjectId = row.subject_id as string;
            if (!subjectId) return;
            if (!scopesBySubject[subjectId]) scopesBySubject[subjectId] = [];
            const sectionValue = String(row.section || '').trim().toUpperCase();
            const hasScope = typeof row.year === 'number' || !!sectionValue;
            if (!hasScope) return;
            const exists = scopesBySubject[subjectId].some(
              (scope) => scope.year === row.year && String(scope.section || '').toUpperCase() === sectionValue
            );
            if (!exists) {
              scopesBySubject[subjectId].push({
                year: typeof row.year === 'number' ? row.year : undefined,
                section: sectionValue || undefined,
              });
            }
          });

          setFacultySubjects(mappedSubjects);
          setAllDepartmentStudents(mappedStudents);
          setSubjectScopes(scopesBySubject);
          setSelectedSubject((prev) => prev || mappedSubjects[0]?.id || '');
          return;
        }

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', user.id);

        if (error) throw error;
        setStudentAttendance((data || []) as AttendanceRecord[]);
      } catch (err) {
        console.warn('Failed to load attendance data:', err);
      }
    };

    loadData();
  }, [user.id, user.college_id, isFaculty]);

  useEffect(() => {
    if (!isFaculty) return;

    if (!selectedSubject) {
      setStudents([]);
      return;
    }

    const selectedScopes = subjectScopes[selectedSubject] || [];
    if (selectedScopes.length === 0) {
      setStudents([]);
      return;
    }

    const scopedStudents = allDepartmentStudents.filter((student) => {
      const studentYear = typeof student.year === 'number' ? student.year : undefined;
      const studentSection = String(student.section || '').trim().toUpperCase();
      return selectedScopes.some((scope) => {
        const yearMatches = typeof scope.year === 'number' ? scope.year === studentYear : true;
        const sectionMatches = scope.section ? scope.section === studentSection : true;
        return yearMatches && sectionMatches;
      });
    });

    setStudents(scopedStudents);
  }, [isFaculty, selectedSubject, subjectScopes, allDepartmentStudents]);

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendanceList(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (Object.keys(attendanceList).length === 0 || !selectedSubject) return;
    setIsSubmitting(true);
    
    try {
      const records = Object.entries(attendanceList).map(([studentId, status]) => ({
        college_id: user.college_id,
        student_id: studentId,
        subject_id: selectedSubject,
        date: date,
        status: status,
        marked_by: user.id,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'college_id,student_id,subject_id,date' });
      if (error) throw error;
      
      onAction?.();
      setAttendanceList({});
    } catch (err) {
      console.error("Attendance save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setAttendanceList({});
  }, [selectedSubject, date]);

  useEffect(() => {
    if (isFaculty || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`attendance-student-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${user.id}`
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from('attendance')
              .select('*')
              .eq('student_id', user.id);
            if (error) throw error;
            setStudentAttendance((data || []) as AttendanceRecord[]);
          } catch (err) {
            console.warn('Failed to live-refresh attendance:', err);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isFaculty, user.id]);

  const renderFacultyView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex-1 space-y-1">
          <h2 className="text-xl font-bold text-slate-800">Mark Attendance</h2>
          <p className="text-sm text-slate-500">Roll call for your assigned subjects.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100" 
            />
          </div>
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 min-w-[200px]"
          >
            {facultySubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-8 text-center text-sm text-slate-500">
                    No students found for the selected subject/year/section allocation.
                  </td>
                </tr>
              )}
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} className="w-10 h-10 rounded-full border border-slate-100" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{student.student_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStatusChange(student.id, 'PRESENT')}
                        className={`p-2 rounded-xl transition-all ${attendanceList[student.id] === 'PRESENT' ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, 'ABSENT')}
                        className={`p-2 rounded-xl transition-all ${attendanceList[student.id] === 'ABSENT' ? 'bg-rose-100 text-rose-600 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, 'LATE')}
                        className={`p-2 rounded-xl transition-all ${attendanceList[student.id] === 'LATE' ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <input type="text" placeholder="Add note..." className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-100 w-48 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Submit to DB</>}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStudentView = () => {
    const presentCount = studentAttendance.filter(a => a.status === 'PRESENT').length;
    const percentage = Math.round((presentCount / studentAttendance.length) * 100) || 0;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">DB Record Status</p>
            <h3 className="text-4xl font-black text-indigo-600">{percentage}%</h3>
            <div className="mt-4 w-full h-2 bg-slate-100 rounded-full">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return <div className="max-w-6xl mx-auto">{isFaculty ? renderFacultyView() : renderStudentView()}</div>;
};

export default Attendance;
