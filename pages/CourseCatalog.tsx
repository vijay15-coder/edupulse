
import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Plus, Check, Info, AlertCircle, ShieldCheck } from 'lucide-react';
import { User, Subject } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CourseCatalogProps {
  user: User;
}

const CourseCatalog: React.FC<CourseCatalogProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    if (!isSupabaseConfigured) {
      setSubjects([]);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSubjects(data.map((s: any) => ({
          id: s.id,
          college_id: s.college_id,
          code: s.code,
          name: s.name,
          credits: s.credits,
          semester: s.semester,
          course_id: s.course_id,
          faculty_id: s.faculty_id,
          created_at: s.created_at,
        })));
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.warn('Failed to load subjects:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = enrolledIds.reduce((acc, id) => {
    const sub = subjects.find(s => s.id === id);
    return acc + (sub?.credits || 0);
  }, 0);

  const handleEnroll = async (id: string) => {
    if (enrolledIds.includes(id)) return;
    
    const newEnrollments = [...enrolledIds, id];
    setEnrolledIds(newEnrollments);
    
    // Save to database
    if (isSupabaseConfigured && user?.id) {
      try {
        const { error } = await supabase.from('marks').insert([{
          student_id: user.id,
          subject_id: id,
          score: 0,
          max_score: 100,
          type: 'ASSIGNMENT',
          evaluation_date: new Date().toISOString().split('T')[0]
        }]);
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to save enrollment:', err);
      }
    }
    
    // Also save locally
    localStorage.setItem('enrolledSubjects', JSON.stringify(newEnrollments));
  };

  const filteredSubjects = subjects.filter(s => 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === 'All' || s.code.startsWith(selectedCategory))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Academic Catalog</h2>
          <p className="text-slate-500 font-medium mt-1">Browse and register for upcoming semester subjects.</p>
        </div>
        <div className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Total Credits</p>
            <p className="text-xl font-black">{totalCredits} / 18</p>
          </div>
          <div className="w-[1px] h-8 bg-white/20"></div>
          <button className="bg-white text-indigo-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors">
            Finalize Selection
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by subject name or course code..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['All', 'CS', 'EE', 'ME'].map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map((sub) => {
          const isEnrolled = enrolledIds.includes(sub.id);
          return (
            <div key={sub.id} className={`group bg-white p-6 rounded-[2.5rem] border transition-all hover:shadow-xl ${isEnrolled ? 'border-indigo-100 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEnrolled ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">{sub.credits} CREDITS</span>
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{sub.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{sub.code}</p>
              
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Info className="w-3.5 h-3.5" /> Prerequisite: CS100
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Accreditation: ABET
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/${sub.id}${i}/100`} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100" />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border-2 border-white">+12</div>
                </div>
                <button 
                  onClick={() => handleEnroll(sub.id)}
                  disabled={isEnrolled}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    isEnrolled ? 'bg-emerald-50 text-emerald-600 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                  }`}
                >
                  {isEnrolled ? <><Check className="w-4 h-4" /> Enrolled</> : <><Plus className="w-4 h-4" /> Register</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-800">No subjects found</h4>
          <p className="text-slate-400 text-sm">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default CourseCatalog;
