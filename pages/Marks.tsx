
import React, { useEffect, useMemo, useState } from 'react';
import { Award, Search, Save, Filter, ChevronDown, Download, FileSpreadsheet, Info, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { User, UserRole, Subject, Grade } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MarksProps {
  user: User;
  onAction?: () => void;
  onSave?: (newGrades: Grade[]) => void;
  setActiveTab?: (tab: string) => void;
}

const Marks: React.FC<MarksProps> = ({ user, onAction, onSave, setActiveTab }) => {
  const isAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.SUPERADMIN;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentList, setStudentList] = useState<User[]>([]);
  const availableSubjects = useMemo(
    () => (isAdmin ? subjects : subjects.filter(s => s.faculty_id === user.id)),
    [isAdmin, subjects, user.id]
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0]?.id || '');
  const [examType, setExamType] = useState<'ASSIGNMENT' | 'MIDTERM' | 'FINAL'>('MIDTERM');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSubjects([]);
      setStudentList([]);
      return;
    }

    const loadData = async () => {
      try {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('college_id', user.college_id);

        const { data: studentsData } = await supabase
          .from('profiles')
          .select('*')
          .eq('college_id', user.college_id)
          .eq('role', UserRole.STUDENT);

        if (subjectsData && subjectsData.length > 0) {
          setSubjects(subjectsData.map((s: any) => ({
            id: s.id,
            college_id: s.college_id,
            course_id: s.course_id,
            faculty_id: s.faculty_id,
            code: s.code,
            name: s.name,
            semester: s.semester,
            credits: s.credits,
            created_at: s.created_at
          })));
        }

        if (studentsData && studentsData.length > 0) {
          setStudentList(studentsData.map((p: any) => ({
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
          })));
        }
      } catch (err) {
        console.warn('Failed to load results data:', err);
      }
    };

    loadData();
  }, [user.id, user.role]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some(s => s.id === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubject]);

  const handleSaveCompleted = (gradesToAdd: Grade[]) => {
    onAction?.();
    onSave?.(gradesToAdd);
  };

  const handleScoreChange = (studentId: string, score: string) => {
    const val = parseFloat(score);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setScores(prev => ({ ...prev, [studentId]: val }));
    } else if (score === '') {
      setScores(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
    }
  };

  const handleSave = async () => {
    if (!selectedSubject || Object.keys(scores).length === 0) return;
    setIsSaving(true);
    
    try {
      const records = Object.entries(scores).map(([studentId, score]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        score: score,
        type: examType,
        evaluation_date: new Date().toISOString().split('T')[0]
      }));
      if (!isSupabaseConfigured) {
        return;
      }

      const { error } = await supabase.from('marks').insert(records);
      if (error) throw error;

      handleSaveCompleted([]);
      setScores({});
    } catch (err) {
      console.error("Marks save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab && setActiveTab('dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Database Marks Entry</h2>
            <p className="text-slate-500 font-medium mt-1">Configure assessment scores for central database storage.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 outline-none">
            {availableSubjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 outline-none">
            <option value="ASSIGNMENT">Assignment</option>
            <option value="MIDTERM">Midterm</option>
            <option value="FINAL">Final Exam</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-50/50 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {studentList.map((student) => (
            <div key={student.id} className="flex items-center justify-between px-10 py-8 hover:bg-slate-50/50 transition-all">
              <div className="flex items-center gap-4">
                <img src={student.avatar || "https://picsum.photos/seed/student/120"} className="w-12 h-12 rounded-[1.5rem] border-2 border-slate-100" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">{student.name}</h4>
                  <p className="text-xs font-bold text-slate-200">{student.student_id || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" min="0" max="100" className="w-[66px] h-12 px-4 py-3 bg-slate-50 border-none rounded-2xl text-2sm font-black text-slate-800 text-center" onChange={(e) => handleScoreChange(student.id, e.target.value)} placeholder="0" />
                <span className="text-2lg font-black text-slate-300">/ 100</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-12 border-t border-slate-50 bg-white flex justify-end">
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Publish Results"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Marks;
