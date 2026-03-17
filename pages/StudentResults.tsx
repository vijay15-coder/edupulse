import React, { useState, useEffect } from 'react';
import {
    Award, BookOpen, Calendar, TrendingUp, Download, ArrowLeft,
    CheckCircle, XCircle, Loader2, BarChart3, AlertTriangle
} from 'lucide-react';
import { User, SemesterResult, ResultSubject } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface StudentResultsProps {
    user: User;
    setActiveTab?: (tab: string) => void;
}

interface ResultWithSubjects extends SemesterResult {
    subjects: ResultSubject[];
}

const StudentResults: React.FC<StudentResultsProps> = ({ user, setActiveTab }) => {
    const [results, setResults] = useState<ResultWithSubjects[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => {
        loadResults();
    }, [user.id]);

    const loadResults = async () => {
        if (!isSupabaseConfigured) {
            setLoading(false);
            return;
        }

        try {
            // Fetch semester results for this student (by student_id link or by roll number)
            let query = supabase
                .from('semester_results')
                .select('*')
                .eq('college_id', user.college_id);

            // Match by student_id (profile id) or student_roll (roll number)
            if (user.student_id) {
                query = query.or(`student_id.eq.${user.id},student_roll.eq.${user.student_id}`);
            } else {
                query = query.eq('student_id', user.id);
            }

            const { data: semResults, error: semError } = await query
                .order('year', { ascending: false })
                .order('semester', { ascending: false });

            if (semError) throw semError;

            if (!semResults || semResults.length === 0) {
                setResults([]);
                setLoading(false);
                return;
            }

            // Fetch subjects for all results
            const resultIds = semResults.map(r => r.id);
            const { data: subjectsData, error: subError } = await supabase
                .from('result_subjects')
                .select('*')
                .in('result_id', resultIds);

            if (subError) throw subError;

            // Merge subjects into results
            const resultsWithSubjects: ResultWithSubjects[] = semResults.map(r => ({
                ...r,
                subjects: (subjectsData || []).filter(s => s.result_id === r.id) as ResultSubject[]
            }));

            setResults(resultsWithSubjects);
            // Auto-expand first card
            if (resultsWithSubjects.length > 0) {
                setExpandedCard(resultsWithSubjects[0].id);
            }
        } catch (err: any) {
            console.warn('Failed to load student results:', err);
        } finally {
            setLoading(false);
        }
    };

    const getYearLabel = (y: number) => {
        const labels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th' };
        return labels[y] || `${y}th`;
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-slate-500 text-sm font-medium">Loading your results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 px-2">
                <button
                    onClick={() => setActiveTab?.('dashboard')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Go back"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Results</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        View your semester results organized by year and semester. Click a card to see details.
                    </p>
                </div>
            </div>

            {/* Summary strip */}
            {results.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Semesters</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{results.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest CGPA</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{results[0]?.cgpa?.toFixed(2) || '—'}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Clear</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">
                            {results.filter(r => r.overall_status === 'PASS').length}/{results.length}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest SGPA</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{results[0]?.sgpa?.toFixed(2) || '—'}</p>
                    </div>
                </div>
            )}

            {/* No results */}
            {results.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-100/50 p-12 text-center">
                    <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Results Available</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Your semester results will appear here once they are published by your college admin.
                        Check back later or contact your college administration for more information.
                    </p>
                </div>
            )}

            {/* Result Cards */}
            <div className="space-y-4">
                {results.map((result) => {
                    const isExpanded = expandedCard === result.id;
                    const hasFails = result.overall_status === 'FAIL';

                    return (
                        <div
                            key={result.id}
                            className={`bg-white rounded-2xl border shadow-lg transition-all duration-300 overflow-hidden cursor-pointer ${hasFails
                                    ? 'border-l-4 border-l-red-500 border-red-200 shadow-red-50'
                                    : 'border-l-4 border-l-emerald-500 border-emerald-200 shadow-emerald-50'
                                }`}
                            onClick={() => setExpandedCard(isExpanded ? null : result.id)}
                        >
                            {/* Card Header */}
                            <div className={`px-6 py-5 flex items-center justify-between ${hasFails ? 'bg-red-50/50' : 'bg-emerald-50/50'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasFails ? 'bg-red-100' : 'bg-emerald-100'
                                        }`}>
                                        {hasFails
                                            ? <AlertTriangle className="w-6 h-6 text-red-600" />
                                            : <CheckCircle className="w-6 h-6 text-emerald-600" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">
                                            {getYearLabel(result.year)} Year — Semester {result.semester}
                                        </h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {result.academic_year}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SGPA</p>
                                                <p className="text-xl font-black text-indigo-600">{result.sgpa?.toFixed(2)}</p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200"></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CGPA</p>
                                                <p className="text-xl font-black text-slate-900">{result.cgpa?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${hasFails
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {result.overall_status}
                                    </span>
                                </div>
                            </div>

                            {/* Mobile SGPA/CGPA row */}
                            <div className="md:hidden px-6 py-3 grid grid-cols-2 gap-4 bg-slate-50/50 border-b border-slate-100">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SGPA</p>
                                    <p className="text-xl font-black text-indigo-600">{result.sgpa?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CGPA</p>
                                    <p className="text-xl font-black text-slate-900">{result.cgpa?.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-6 py-4 animate-in slide-in-from-top duration-300" onClick={e => e.stopPropagation()}>
                                    {/* Subject Table */}
                                    {result.subjects.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                                        <th className="text-left py-3 font-medium">#</th>
                                                        <th className="text-left py-3 font-medium">Subject</th>
                                                        <th className="text-left py-3 font-medium">Code</th>
                                                        <th className="text-center py-3 font-medium">Grade</th>
                                                        <th className="text-center py-3 font-medium">Credits</th>
                                                        <th className="text-center py-3 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.subjects.map((sub, idx) => (
                                                        <tr
                                                            key={sub.id}
                                                            className={`border-b border-slate-100 transition-colors ${sub.status === 'FAIL' ? 'bg-red-50/70' : 'hover:bg-emerald-50/30'
                                                                }`}
                                                        >
                                                            <td className="py-3 text-slate-400 text-xs">{idx + 1}</td>
                                                            <td className="py-3 font-medium text-slate-900">{sub.subject_name}</td>
                                                            <td className="py-3 text-slate-500">{sub.subject_code || '—'}</td>
                                                            <td className="py-3 text-center">
                                                                <span className={`inline-block w-10 text-center py-1 rounded-lg text-xs font-black ${sub.status === 'FAIL'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-indigo-100 text-indigo-700'
                                                                    }`}>
                                                                    {sub.grade}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-center text-slate-600">{sub.credits || '—'}</td>
                                                            <td className="py-3 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${sub.status === 'FAIL'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                    {sub.status === 'FAIL'
                                                                        ? <XCircle className="w-3 h-3" />
                                                                        : <CheckCircle className="w-3 h-3" />
                                                                    }
                                                                    {sub.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-4">No subject details available.</p>
                                    )}

                                    {/* Stats Footer */}
                                    <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                                            <p className="text-lg font-black text-slate-900">{result.total_subjects}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Passed</p>
                                            <p className="text-lg font-black text-emerald-700">{result.passed_subjects}</p>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Failed</p>
                                            <p className="text-lg font-black text-red-700">{result.failed_subjects}</p>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">SGPA</p>
                                            <p className="text-lg font-black text-indigo-700">{result.sgpa?.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CGPA</p>
                                            <p className="text-lg font-black text-slate-900">{result.cgpa?.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Download PDF button */}
                                    {result.pdf_url && (
                                        <div className="mt-4 flex justify-end">
                                            <a
                                                href={result.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download Result PDF
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentResults;
