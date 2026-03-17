import React, { useState, useEffect, useRef } from 'react';
import {
    Upload, FileText, CheckCircle, AlertCircle, Trash2, Eye, Save,
    Plus, X, Download, Loader2, ArrowLeft, Calendar, BookOpen, BarChart3, RefreshCw
} from 'lucide-react';
import { User, UserRole, ResultUpload } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { parsePdfResults, ParsedStudentResult, ParsedSubject, createEmptyResult } from '../lib/pdfResultParser';

interface AdminResultsProps {
    user: User;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setActiveTab?: (tab: string) => void;
}

const AdminResults: React.FC<AdminResultsProps> = ({ user, showToast, setActiveTab }) => {
    // Upload form state
    const [academicYear, setAcademicYear] = useState('2024-2025');
    const [year, setYear] = useState(1);
    const [semester, setSemester] = useState(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Parsing state
    const [isParsing, setIsParsing] = useState(false);
    const [parsedResults, setParsedResults] = useState<ParsedStudentResult[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);

    // Upload history
    const [uploads, setUploads] = useState<ResultUpload[]>([]);
    const [loadingUploads, setLoadingUploads] = useState(true);

    // Manual entry
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualRoll, setManualRoll] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadUploads();
    }, [user.id]);

    const loadUploads = async () => {
        if (!isSupabaseConfigured) {
            setLoadingUploads(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('result_uploads')
                .select('*')
                .eq('college_id', user.college_id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setUploads((data || []) as ResultUpload[]);
        } catch (err: any) {
            console.warn('Failed to load upload history:', err);
        } finally {
            setLoadingUploads(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else {
            showToast('Please select a valid PDF file.', 'error');
        }
    };

    const handleParsePdf = async () => {
        if (!selectedFile) {
            showToast('Please select a PDF file first.', 'error');
            return;
        }

        setIsParsing(true);
        try {
            const results = await parsePdfResults(selectedFile);
            if (results.length === 0) {
                showToast('No student results could be extracted from the PDF. You can add results manually.', 'info');
            } else {
                showToast(`Successfully parsed ${results.length} student result(s) from PDF.`, 'success');
            }
            setParsedResults(results);
            setShowPreview(true);
        } catch (err: any) {
            showToast('Failed to parse PDF: ' + (err.message || 'Unknown error'), 'error');
            setParsedResults([]);
            setShowPreview(true);
        } finally {
            setIsParsing(false);
        }
    };

    const handleAddManualResult = () => {
        if (!manualRoll.trim()) {
            showToast('Enter a roll number.', 'error');
            return;
        }
        const existing = parsedResults.find(r => r.student_roll === manualRoll.toUpperCase().trim());
        if (existing) {
            showToast('Roll number already exists in the list.', 'error');
            return;
        }
        setParsedResults([...parsedResults, createEmptyResult(manualRoll.toUpperCase().trim())]);
        setManualRoll('');
        setShowManualEntry(false);
        setShowPreview(true);
    };

    const handleAddSubject = (studentIndex: number) => {
        const updated = [...parsedResults];
        updated[studentIndex].subjects.push({
            subject_name: '',
            subject_code: '',
            grade: '',
            status: 'PASS'
        });
        setParsedResults(updated);
    };

    const handleRemoveSubject = (studentIndex: number, subjectIndex: number) => {
        const updated = [...parsedResults];
        updated[studentIndex].subjects.splice(subjectIndex, 1);
        // Recalculate
        const subs = updated[studentIndex].subjects;
        updated[studentIndex].total_subjects = subs.length;
        updated[studentIndex].passed_subjects = subs.filter(s => s.status === 'PASS').length;
        updated[studentIndex].failed_subjects = subs.filter(s => s.status === 'FAIL').length;
        updated[studentIndex].overall_status = updated[studentIndex].failed_subjects > 0 ? 'FAIL' : 'PASS';
        setParsedResults(updated);
    };

    const handleUpdateSubject = (studentIndex: number, subjectIndex: number, field: keyof ParsedSubject, value: string) => {
        const updated = [...parsedResults];
        const sub = updated[studentIndex].subjects[subjectIndex];
        if (field === 'status') {
            sub.status = value as 'PASS' | 'FAIL';
        } else if (field === 'credits') {
            sub.credits = parseFloat(value) || undefined;
        } else {
            (sub as any)[field] = value;
        }
        // Recalculate totals
        const subs = updated[studentIndex].subjects;
        updated[studentIndex].total_subjects = subs.length;
        updated[studentIndex].passed_subjects = subs.filter(s => s.status === 'PASS').length;
        updated[studentIndex].failed_subjects = subs.filter(s => s.status === 'FAIL').length;
        updated[studentIndex].overall_status = updated[studentIndex].failed_subjects > 0 ? 'FAIL' : 'PASS';
        setParsedResults(updated);
    };

    const handleUpdateStudentField = (studentIndex: number, field: string, value: string) => {
        const updated = [...parsedResults];
        if (field === 'sgpa' || field === 'cgpa') {
            (updated[studentIndex] as any)[field] = parseFloat(value) || 0;
        } else {
            (updated[studentIndex] as any)[field] = value;
        }
        setParsedResults(updated);
    };

    const handleRemoveStudent = (studentIndex: number) => {
        const updated = [...parsedResults];
        updated.splice(studentIndex, 1);
        setParsedResults(updated);
    };

    const handleSaveResults = async () => {
        if (parsedResults.length === 0) {
            showToast('No results to save.', 'error');
            return;
        }

        if (!isSupabaseConfigured) {
            showToast('Database not configured. Results cannot be saved.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create upload record
            const { data: uploadRecord, error: uploadError } = await supabase
                .from('result_uploads')
                .insert({
                    college_id: user.college_id,
                    uploaded_by: user.id,
                    academic_year: academicYear,
                    year,
                    semester,
                    file_name: selectedFile?.name || 'manual_entry',
                    students_processed: parsedResults.length,
                    status: 'COMPLETED'
                })
                .select()
                .single();

            if (uploadError) throw uploadError;

            // 2. For each student, try to find their profile by student_id (roll number)
            for (const result of parsedResults) {
                // Look up student profile
                let studentId: string | null = null;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('college_id', user.college_id)
                    .eq('student_id', result.student_roll)
                    .maybeSingle();

                if (profile) studentId = profile.id;

                // 3. Upsert semester result
                const { data: semResult, error: semError } = await supabase
                    .from('semester_results')
                    .upsert({
                        college_id: user.college_id,
                        student_id: studentId,
                        student_roll: result.student_roll,
                        year,
                        semester,
                        academic_year: academicYear,
                        sgpa: result.sgpa,
                        cgpa: result.cgpa,
                        total_subjects: result.total_subjects,
                        passed_subjects: result.passed_subjects,
                        failed_subjects: result.failed_subjects,
                        overall_status: result.overall_status,
                        upload_id: uploadRecord.id
                    }, {
                        onConflict: 'college_id,student_roll,year,semester,academic_year'
                    })
                    .select()
                    .single();

                if (semError) {
                    console.warn(`Failed to save result for ${result.student_roll}:`, semError);
                    continue;
                }

                // 4. Delete old subjects for this result and insert new ones
                await supabase
                    .from('result_subjects')
                    .delete()
                    .eq('result_id', semResult.id);

                if (result.subjects.length > 0) {
                    const subjectRows = result.subjects.map(sub => ({
                        result_id: semResult.id,
                        subject_name: sub.subject_name,
                        subject_code: sub.subject_code || null,
                        grade: sub.grade,
                        status: sub.status,
                        credits: sub.credits || null
                    }));

                    const { error: subError } = await supabase
                        .from('result_subjects')
                        .insert(subjectRows);

                    if (subError) {
                        console.warn(`Failed to save subjects for ${result.student_roll}:`, subError);
                    }
                }
            }

            showToast(`Successfully saved results for ${parsedResults.length} student(s)!`, 'success');
            setParsedResults([]);
            setShowPreview(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadUploads();
        } catch (err: any) {
            showToast('Failed to save results: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 px-2">
                <button
                    onClick={() => setActiveTab?.('admin-dashboard')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Go back"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Result Management</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        Upload semester result PDFs, review parsed data, and publish results for students.
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-100/50 p-6 space-y-5">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-600" />
                    Upload Semester Results
                </h3>

                <p className="text-sm text-slate-500">
                    Choose the academic year, year, and semester, then upload a result PDF.
                    The system will extract student results automatically. You can review and edit before publishing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year</label>
                        <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                        >
                            {['2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027'].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                        >
                            {[1, 2, 3, 4, 5, 6].map(y => (
                                <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</label>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Result PDF</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-medium file:text-xs"
                        />
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={handleParsePdf}
                        disabled={!selectedFile || isParsing}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
                    >
                        {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {isParsing ? 'Parsing PDF...' : 'Parse PDF'}
                    </button>

                    <button
                        onClick={() => {
                            setShowManualEntry(true);
                            setShowPreview(true);
                        }}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Manually
                    </button>
                </div>
            </div>

            {/* Preview / Edit Section */}
            {showPreview && (
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-100/50 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Eye className="w-5 h-5 text-indigo-600" />
                            Preview & Edit Results
                            <span className="text-sm font-normal text-slate-500">
                                ({parsedResults.length} student{parsedResults.length !== 1 ? 's' : ''})
                            </span>
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowManualEntry(true);
                                }}
                                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Student
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setParsedResults([]);
                                }}
                                className="px-3 py-2 text-slate-500 hover:text-slate-700 rounded-lg text-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Manual entry form */}
                    {showManualEntry && (
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                            <input
                                type="text"
                                value={manualRoll}
                                onChange={(e) => setManualRoll(e.target.value)}
                                placeholder="Enter student roll number (e.g., 21BCE1234)"
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddManualResult()}
                            />
                            <button
                                onClick={handleAddManualResult}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowManualEntry(false)}
                                className="px-3 py-2.5 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {parsedResults.length === 0 && !showManualEntry && (
                        <div className="text-center py-12 text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No results parsed. Use "Add Student" to enter results manually.</p>
                        </div>
                    )}

                    {/* Student results cards */}
                    <div className="space-y-4">
                        {parsedResults.map((result, studentIdx) => (
                            <div
                                key={studentIdx}
                                className={`border rounded-xl overflow-hidden ${result.overall_status === 'FAIL'
                                        ? 'border-red-200 bg-red-50/30'
                                        : 'border-emerald-200 bg-emerald-50/30'
                                    }`}
                            >
                                {/* Student header */}
                                <div className={`px-5 py-3 flex items-center justify-between ${result.overall_status === 'FAIL' ? 'bg-red-50' : 'bg-emerald-50'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${result.overall_status === 'FAIL'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {result.overall_status}
                                        </span>
                                        <input
                                            type="text"
                                            value={result.student_roll}
                                            onChange={(e) => handleUpdateStudentField(studentIdx, 'student_roll', e.target.value)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold w-44"
                                            placeholder="Roll Number"
                                        />
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>SGPA:</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="10"
                                                value={result.sgpa}
                                                onChange={(e) => handleUpdateStudentField(studentIdx, 'sgpa', e.target.value)}
                                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-center"
                                            />
                                            <span className="ml-2">CGPA:</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="10"
                                                value={result.cgpa}
                                                onChange={(e) => handleUpdateStudentField(studentIdx, 'cgpa', e.target.value)}
                                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-center"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            {result.passed_subjects}P / {result.failed_subjects}F
                                        </span>
                                        <button
                                            onClick={() => handleRemoveStudent(studentIdx)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Subjects table */}
                                <div className="px-5 py-3">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                                <th className="text-left py-2 font-medium">Subject Name</th>
                                                <th className="text-left py-2 font-medium">Code</th>
                                                <th className="text-left py-2 font-medium">Grade</th>
                                                <th className="text-left py-2 font-medium">Credits</th>
                                                <th className="text-left py-2 font-medium">Status</th>
                                                <th className="text-right py-2 font-medium"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.subjects.map((sub, subIdx) => (
                                                <tr key={subIdx} className={`border-b border-slate-100 ${sub.status === 'FAIL' ? 'bg-red-50/50' : ''
                                                    }`}>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="text"
                                                            value={sub.subject_name}
                                                            onChange={(e) => handleUpdateSubject(studentIdx, subIdx, 'subject_name', e.target.value)}
                                                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                                                            placeholder="Subject name"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="text"
                                                            value={sub.subject_code}
                                                            onChange={(e) => handleUpdateSubject(studentIdx, subIdx, 'subject_code', e.target.value)}
                                                            className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                                                            placeholder="Code"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="text"
                                                            value={sub.grade}
                                                            onChange={(e) => handleUpdateSubject(studentIdx, subIdx, 'grade', e.target.value)}
                                                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-center"
                                                            placeholder="A+"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="number"
                                                            value={sub.credits || ''}
                                                            onChange={(e) => handleUpdateSubject(studentIdx, subIdx, 'credits', e.target.value)}
                                                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-sm text-center"
                                                            placeholder="3"
                                                            step="0.5"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <select
                                                            value={sub.status}
                                                            onChange={(e) => handleUpdateSubject(studentIdx, subIdx, 'status', e.target.value)}
                                                            className={`px-2 py-1 border rounded text-xs font-bold ${sub.status === 'FAIL'
                                                                    ? 'bg-red-100 text-red-700 border-red-200'
                                                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                }`}
                                                        >
                                                            <option value="PASS">PASS</option>
                                                            <option value="FAIL">FAIL</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        <button
                                                            onClick={() => handleRemoveSubject(studentIdx, subIdx)}
                                                            className="p-1 text-slate-400 hover:text-red-500"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        onClick={() => handleAddSubject(studentIdx)}
                                        className="mt-2 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Subject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {parsedResults.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500">
                                <strong>{parsedResults.length}</strong> student(s) •{' '}
                                <strong className="text-emerald-600">{parsedResults.filter(r => r.overall_status === 'PASS').length}</strong> passed •{' '}
                                <strong className="text-red-600">{parsedResults.filter(r => r.overall_status === 'FAIL').length}</strong> failed
                            </p>
                            <button
                                onClick={handleSaveResults}
                                disabled={isSaving}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Publishing...' : 'Publish Results'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Upload History */}
            <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-100/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Upload History
                    </h3>
                    <button
                        onClick={loadUploads}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {loadingUploads ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    </div>
                ) : uploads.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No result uploads yet.</p>
                        <p className="text-sm mt-1">Upload a semester result PDF above to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left py-3 px-3 font-medium">Date</th>
                                    <th className="text-left py-3 px-3 font-medium">File</th>
                                    <th className="text-left py-3 px-3 font-medium">Academic Year</th>
                                    <th className="text-left py-3 px-3 font-medium">Year</th>
                                    <th className="text-left py-3 px-3 font-medium">Semester</th>
                                    <th className="text-left py-3 px-3 font-medium">Students</th>
                                    <th className="text-left py-3 px-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((upload) => (
                                    <tr key={upload.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="py-3 px-3 text-slate-600">
                                            {new Date(upload.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-3 font-medium text-slate-900">{upload.file_name}</td>
                                        <td className="py-3 px-3 text-slate-600">{upload.academic_year}</td>
                                        <td className="py-3 px-3 text-slate-600">Year {upload.year}</td>
                                        <td className="py-3 px-3 text-slate-600">Sem {upload.semester}</td>
                                        <td className="py-3 px-3 text-slate-600">{upload.students_processed}</td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${upload.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                    upload.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {upload.status}
                                            </span>
                                        </td>
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

export default AdminResults;
