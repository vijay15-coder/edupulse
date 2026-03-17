
import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Calendar, TrendingUp, Info, ChevronRight, Download, ArrowLeft } from 'lucide-react';
import { User, Grade, Subject } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MyGradesProps {
  user: User;
  grades: Grade[];
  setActiveTab?: (tab: string) => void;
}

const MyGrades: React.FC<MyGradesProps> = ({ user, grades, setActiveTab }) => {
  const [studentGradesState, setStudentGradesState] = useState<Grade[]>(grades || []);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGradesFromDatabase();
  }, [user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStudentGradesState(grades || []);
      setSubjects([]);
    }
  }, [grades]);

  const loadGradesFromDatabase = async () => {
    if (!isSupabaseConfigured) {
      setStudentGradesState(grades || []);
      return;
    }

    try {
      setLoading(true);
      const { data: gradesData, error: grError } = await supabase
        .from('marks')
        .select('*, subjects(*)')
        .eq('student_id', user.id);
      
      const { data: subjectsData, error: subError } = await supabase
        .from('subjects')
        .select('*');

      if (gradesData && !grError) {
        setStudentGradesState(gradesData.map((g: any) => ({
          id: g.id,
          college_id: g.college_id,
          student_id: g.student_id,
          subject_id: g.subject_id,
          score: g.score,
          max_score: g.max_score,
          type: g.type,
          evaluation_date: g.evaluation_date,
          created_at: g.created_at
        })));
      } else {
        setStudentGradesState(grades || []);
      }

      if (subjectsData && !subError) {
        setSubjects(subjectsData.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          credits: s.credits,
          semester: s.semester,
          course_id: s.course_id,
          faculty_id: s.faculty_id,
          college_id: s.college_id,
          created_at: s.created_at
        })));
      }
    } catch (err) {
      console.warn('Failed to load grades:', err);
      setStudentGradesState(grades || []);
    } finally {
      setLoading(false);
    }
  };

  const studentGrades = studentGradesState.filter(g => g.student_id === user.id);
  
  // Calculate average score
  const avgScore = studentGrades.length > 0 
    ? (studentGrades.reduce((acc, curr) => acc + curr.score, 0) / studentGrades.length).toFixed(1)
    : "0.0";
  
  // Convert 100-scale to 4.0 GPA scale (approximate)
  const gpa = (parseFloat(avgScore) / 25).toFixed(2);

  return (
    <div className="space-y-6 px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Academic Results</h1>
          <p className="text-slate-500 text-sm">Detailed breakdown of your performance this semester.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div></div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Download Transcript
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between h-48 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Overall GPA</p>
            <h3 className="text-5xl font-black mt-2">{gpa}</h3>
          </div>
          <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
            <TrendingUp className="w-3 h-3" /> Top 15% of Class
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Average Score</p>
            <h3 className="text-5xl font-black text-slate-900 mt-2">{avgScore}<span className="text-xl text-slate-300 ml-1">%</span></h3>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avgScore}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assessments Done</p>
            <h3 className="text-5xl font-black text-slate-900 mt-2">{studentGrades.length}</h3>
          </div>
          <p className="text-xs font-bold text-slate-400">Next exam in 12 days</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Grades Breakdown</h3>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
             <span className="text-xs font-bold text-slate-500">Satisfactory</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {studentGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No grades have been published yet.</p>
                  </td>
                </tr>
              ) : (
                studentGrades.map((grade) => {
                  const subject = subjects.find(s => s.id === grade.subject_id);
                  return (
                    <tr key={grade.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{subject?.name || 'Unknown Subject'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{subject?.code || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          grade.type === 'FINAL' ? 'bg-indigo-100 text-indigo-600' :
                          grade.type === 'MIDTERM' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {grade.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-medium">{new Date(grade.evaluation_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${grade.score >= 90 ? 'bg-emerald-500' : grade.score >= 75 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${grade.score}%` }}></div>
                          </div>
                          <span className="text-sm font-black text-slate-800">{grade.score}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 border-dashed flex items-center gap-4">
        <div className="p-3 bg-white rounded-2xl">
          <Info className="w-6 h-6 text-indigo-500" />
        </div>
        <p className="text-xs font-medium text-slate-500">
          Grades are finalized 7 days after publication. For any discrepancies, please contact your faculty member within the evaluation window.
        </p>
      </div>
      </div>
    </div>
  );
};

export default MyGrades;
