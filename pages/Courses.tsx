import React, { useState } from 'react';
import { BookOpen, Search, Plus, Edit2, Trash2, Code, Users, Calendar, Filter, X, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Course, User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CoursesPageProps {
  courses: Course[];
  onAdd?: (course: Course) => void;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
  role?: UserRole;
  user?: User | null;
  setActiveTab?: (tab: string) => void;
}

interface FormData {
  code: string;
  name: string;
  credits_required: number;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ courses, onAdd, onEdit, onDelete, role, user, setActiveTab }) => {
  const isStudentView = role === UserRole.STUDENT;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    creditsRequired: 120
  });

  const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  const getDepartmentKey = (department?: string) => {
    if (!department) return '';
    const tokens = normalizeText(department).split(' ').filter(Boolean);
    if (tokens.length === 0) return '';
    if (tokens.length === 1) return tokens[0].slice(0, 3).toUpperCase();
    return tokens.map(token => token[0].toUpperCase()).join('');
  };

  const departmentKey = getDepartmentKey(user?.department);
  const departmentTokens = normalizeText(user?.department || '').split(' ').filter(token => token.length > 2);

  const matchesDepartment = (course: Course) => {
    if (!departmentKey && departmentTokens.length === 0) return true;
    const name = normalizeText(course.name);
    const code = (course.code || '').toUpperCase();
    if (departmentKey && code.includes(departmentKey)) return true;
    return departmentTokens.some(token => name.includes(token) || code.toLowerCase().includes(token));
  };

  const visibleCourses = isStudentView ? courses.filter(matchesDepartment) : courses;

  const totalPrograms = visibleCourses.length;
  const totalCredits = visibleCourses.reduce((sum, c) => sum + (c.creditsRequired || 0), 0);
  const activePrograms = visibleCourses.length;
  const completedPrograms = 0;

  const filteredCourses = visibleCourses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddForm = () => {
    setSelectedCourse(null);
    setFormData({
      code: '',
      name: '',
      credits_required: 120
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsAdding(true);
  };

  const handleOpenEditForm = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      credits_required: course.credits_required || 120
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsAdding(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!formData.code || !formData.name) {
        throw new Error('Course code and name are required');
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('courses')
          .upsert([
            {
              id: selectedCourse?.id || crypto.randomUUID(),
              code: formData.code,
              name: formData.name,
              credits_required: formData.credits_required,
              created_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;

        const newCourse: Course = {
          id: selectedCourse?.id || crypto.randomUUID(),
          college_id: user?.college_id || '',
          code: formData.code,
          name: formData.name,
          credits_required: formData.credits_required,
          created_at: selectedCourse?.created_at || new Date().toISOString()
        };

        onAdd?.(newCourse);
        setSuccessMsg(selectedCourse ? 'Course updated successfully!' : 'Course added successfully!');

        setTimeout(() => {
          setIsAdding(false);
          setFormData({
            code: '',
            name: '',
            credits_required: 120
          });
          setSelectedCourse(null);
        }, 2000);
      } else {
        // Offline mode
        const newCourse: Course = {
          id: selectedCourse?.id || crypto.randomUUID(),
          college_id: user?.college_id || '',
          code: formData.code,
          name: formData.name,
          credits_required: formData.credits_required,
          created_at: selectedCourse?.created_at || new Date().toISOString()
        };

        onAdd?.(newCourse);
        setSuccessMsg(selectedCourse ? 'Course updated successfully!' : 'Course added successfully!');

        setTimeout(() => {
          setIsAdding(false);
          setFormData({
            code: '',
            name: '',
            credits_required: 120
          });
          setSelectedCourse(null);
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Academic Curriculum</h1>
          <p className="text-slate-500 text-sm">Manage courses and programs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div></div>
          {!isStudentView && (
            <button 
              onClick={handleOpenAddForm}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-5 h-5" /> Add Course
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isStudentView ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Programs</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{totalPrograms}</h3>
            </div>
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Credits</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{totalCredits}</h3>
            </div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Calendar className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{activePrograms}</h3>
            </div>
            <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center">
              <Code className="w-7 h-7" />
            </div>
          </div>
        </div>

        {isStudentView && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{completedPrograms}</h3>
              </div>
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by course name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Course Name</th>
                <th className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Credits</th>
                {isStudentView && (
                  <th className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                )}
                {!isStudentView && (
                  <th className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={isStudentView ? 4 : 4} className="px-6 sm:px-8 py-16 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No courses found</p>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 sm:px-8 py-5">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{course.name}</p>
                      </div>
                    </td>
                    <td className="px-6 sm:px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                        {course.code}
                      </span>
                    </td>
                    <td className="px-6 sm:px-8 py-5 hidden sm:table-cell">
                      <p className="text-sm text-slate-600 font-medium">{course.credits_required || 120} Credits</p>
                    </td>
                    {isStudentView && (
                      <td className="px-6 sm:px-8 py-5">
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                          Active
                        </span>
                      </td>
                    )}
                    {!isStudentView && (
                      <td className="px-6 sm:px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEditForm(course)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete?.(course.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Course Modal */}
      {isAdding && !isStudentView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 sm:p-8 border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-900">{selectedCourse ? 'Edit Course' : 'Add New Course'}</h3>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {successMsg && (
              <div className="m-6 sm:m-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="m-6 sm:m-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <p className="text-sm font-bold text-rose-700">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Course Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="BSCSE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Course Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="Bachelor of Science in Computer Science"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Credits Required</label>
                <input
                  type="number"
                  min="0"
                  value={formData.credits_required}
                  onChange={(e) => setFormData({...formData, credits_required: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="120"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || successMsg !== ''}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Course'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default CoursesPage;
