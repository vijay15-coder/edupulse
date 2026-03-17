import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Course, Department, Subscription } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Users, BookOpen, DollarSign, TrendingUp, Plus, Edit2, Trash2,
  Search, Filter, MoreVertical, CheckCircle, AlertCircle, Building2, UserCog, X, Loader2, Download, Upload, Eye, ArrowLeft, FileText, GraduationCap, Megaphone, ChevronDown, Radio
} from 'lucide-react';
import {
  downloadDepartmentSample,
  downloadCourseSample,
  downloadUserSample,
  parseExcelFile,
  validateDepartmentData,
  validateCourseData,
  validateUserData,
  DepartmentBulkData,
  CourseBulkData,
  UserBulkData
} from '../lib/excelUtils';
import {
  logActivity,
  getRecentActivities,
  getAllActivities,
  formatActivityMessage,
  getTimeAgo,
  Activity
} from '../lib/activityUtils';

interface AdminDashboardProps {
  currentUser: User | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  collegeId: string;
  setActiveTab?: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, showToast, collegeId, setActiveTab: setParentTab }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [facultyList, setFacultyList] = useState<User[]>([]);
  const [showHODModal, setShowHODModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedHOD, setSelectedHOD] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.STUDENT as UserRole,
    department: '',
    student_id: '',
    faculty_id: ''
  });
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentFormData, setDepartmentFormData] = useState({
    code: '',
    name: ''
  });
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);
  const [deptSuccessMsg, setDeptSuccessMsg] = useState('');
  const [deptErrorMsg, setDeptErrorMsg] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    code: '',
    name: '',
    duration_years: 4,
    credits_required: 120,
    department_id: ''
  });
  const [isCourseSubmitting, setIsCourseSubmitting] = useState(false);
  const [courseSuccessMsg, setCourseSuccessMsg] = useState('');
  const [courseErrorMsg, setCourseErrorMsg] = useState('');

  // Department detail modal states
  const [showDepartmentDetailModal, setShowDepartmentDetailModal] = useState(false);
  const [selectedDepartmentDetail, setSelectedDepartmentDetail] = useState<any>(null);
  const [departmentStats, setDepartmentStats] = useState({ students: 0, faculty: 0 });

  // Results tab states
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<any[][]>([]);
  const [pdfHeaders, setPdfHeaders] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string>('');

  // Bulk import states
  const [showBulkDeptModal, setShowBulkDeptModal] = useState(false);
  const [showBulkCourseModal, setShowBulkCourseModal] = useState(false);
  const [showBulkUserModal, setShowBulkUserModal] = useState(false);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [bulkImportSuccess, setBulkImportSuccess] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);
  const [bulkImportType, setBulkImportType] = useState<'departments' | 'courses' | 'users'>('departments');

  // Course edit states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [openCourseMenuId, setOpenCourseMenuId] = useState<string | null>(null);

  // Activity logging states
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [activityPageNumber, setActivityPageNumber] = useState(0);
  const [totalActivityCount, setTotalActivityCount] = useState(0);

  // Marks entry states
  const [marks, setMarks] = useState<any[]>([]);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [marksFilters, setMarksFilters] = useState({
    department: '',
    course: '',
    semester: '',
    academicYear: ''
  });
  const [marksFormData, setMarksFormData] = useState({
    student_id: '',
    subject_id: '',
    score: '',
    max_score: '100',
    type: 'FINAL' as 'ASSIGNMENT' | 'MIDTERM' | 'FINAL'
  });
  const [isMarksSubmitting, setIsMarksSubmitting] = useState(false);
  const [marksSuccessMsg, setMarksSuccessMsg] = useState('');
  const [marksErrorMsg, setMarksErrorMsg] = useState('');

  // Announcements states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [showBroadcastingOptions, setShowBroadcastingOptions] = useState(false);
  const [showBroadcastingModal, setShowBroadcastingModal] = useState(false);
  const [broadcastingFormData, setBroadcastingFormData] = useState({
    title: '',
    content: '',
    priority: 'HIGH' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    broadcast_channels: [] as string[],
    scheduled_date: '',
    is_immediate: true
  });
  const [isBroadcastingSubmitting, setIsBroadcastingSubmitting] = useState(false);
  const [broadcastingSuccessMsg, setBroadcastingSuccessMsg] = useState('');
  const [broadcastingErrorMsg, setBroadcastingErrorMsg] = useState('');
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    target_audience: 'ALL' as 'ALL' | 'STUDENTS' | 'FACULTY' | 'HOD' | 'ADMIN',
    is_active: true,
    expires_at: ''
  });
  const [isAnnouncementSubmitting, setIsAnnouncementSubmitting] = useState(false);
  const [announcementSuccessMsg, setAnnouncementSuccessMsg] = useState('');
  const [announcementErrorMsg, setAnnouncementErrorMsg] = useState('');

  const isMissingAnnouncementsCollegeIdError = (error: any) =>
    /could not find the 'college_id' column of 'announcements'/i.test(error?.message || '');

  useEffect(() => {
    loadAdminData();
    loadRecentActivities();
    loadMarks();
    loadSubjects();
    loadAnnouncements();
  }, [collegeId]);

  useEffect(() => {
    if (!loading && (window as any).AOS) {
      // AOS is still useful for other scroll-reveal sections if any
      (window as any).AOS.refresh();
    }
  }, [loading, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showBroadcastingOptions && !target.closest('.broadcasting-dropdown')) {
        setShowBroadcastingOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBroadcastingOptions]);

  // Mouse Tilt Effect Hook/Component for 3D Interactive feel
  const TiltCard: React.FC<{ children: React.ReactNode, className?: string, delay?: number }> = ({ children, className, delay }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTilt({
        x: (y - 0.5) * 10, // Max 10 degrees
        y: (x - 0.5) * -10
      });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    return (
      <div
        className="h-full fade-in-up"
        style={{ animationDelay: `${(delay || 0) / 1000}s` }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: tilt.x === 0 ? 'transform 0.5s ease-out' : 'none',
            height: '100%'
          }}
          className={className}
        >
          {children}
        </div>
      </div>
    );
  };

  const loadRecentActivities = async () => {
    const activities = await getRecentActivities(collegeId, 5);
    setRecentActivities(activities);
  };

  const loadAdminData = async () => {
    try {
      if (!collegeId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Fetch real data from Supabase if configured
      if (isSupabaseConfigured) {
        // Fetch users for this college
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('college_id', collegeId);

        if (profiles && !profilesError) {
          const mappedUsers = profiles.map(p => ({
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
            updated_at: p.updated_at,
          }));
          setUsers(mappedUsers);
          setFacultyList(mappedUsers.filter(u => u.role === UserRole.FACULTY));
        }

        // Fetch departments for this college
        const { data: depts, error: deptsError } = await supabase
          .from('departments')
          .select('*')
          .eq('college_id', collegeId);

        if (deptsError) throw deptsError;

        const headFacultyIds = (depts || [])
          .map((dept: any) => dept.head_faculty_id)
          .filter((id: string | null) => !!id);

        let hodMap: Record<string, { name: string; email: string }> = {};

        if (headFacultyIds.length > 0) {
          const { data: hodProfiles, error: hodProfilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', headFacultyIds);

          if (hodProfilesError) throw hodProfilesError;

          hodMap = (hodProfiles || []).reduce((acc: Record<string, { name: string; email: string }>, profile: any) => {
            acc[profile.id] = { name: profile.name, email: profile.email };
            return acc;
          }, {});
        }

        const mappedDepartments = (depts || []).map((dept: any) => ({
          ...dept,
          hod_profile: dept.head_faculty_id ? hodMap[dept.head_faculty_id] : null,
        }));

        setDepartments(mappedDepartments as any);

        // Fetch courses for this college
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('college_id', collegeId);

        if (coursesData && !coursesError) {
          setCourses(coursesData);
        }

        setLoading(false);
      } else {
        throw new Error('Database is not configured. Real-time data cannot be fetched.');
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      showToast('Failed to load data: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const loadDepartmentStats = async (departmentId: string) => {
    try {
      if (isSupabaseConfigured) {
        // Count students in this department
        const { count: studentCount, error: studentError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('department', departmentId)
          .eq('role', UserRole.STUDENT);

        // Count faculty in this department
        const { count: facultyCount, error: facultyError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('department', departmentId)
          .eq('role', UserRole.FACULTY);

        if (studentError || facultyError) {
          console.error('Error loading department stats:', studentError || facultyError);
          return { students: 0, faculty: 0 };
        }

        return {
          students: studentCount || 0,
          faculty: facultyCount || 0
        };
      }
      return { students: 0, faculty: 0 };
    } catch (err) {
      console.error('Error loading department stats:', err);
      return { students: 0, faculty: 0 };
    }
  };

  const handleDepartmentClick = async (department: any) => {
    setSelectedDepartmentDetail(department);
    const stats = await loadDepartmentStats(department.id);
    setDepartmentStats(stats);
    setShowDepartmentDetailModal(true);
  };

  // PDF processing functions
  const processPdfFile = async (file: File) => {
    setIsProcessingPdf(true);
    setPdfError('');

    try {
      // Import pdfjs dynamically
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker path (using unpkg to ensure version match from package or a stable CDN)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let extractedText = '';

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        extractedText += pageText + '\n';
      }

      // Parse the extracted text to find tabular data
      const parsedData = parsePdfTextToTable(extractedText);
      setPdfData(parsedData.data);
      setPdfHeaders(parsedData.headers);

      showToast('PDF processed successfully!', 'success');
    } catch (error) {
      console.error('Error processing PDF:', error);
      setPdfError('Failed to process PDF. Please ensure it contains tabular data.');
      showToast('Failed to process PDF', 'error');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const parsePdfTextToTable = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const headers: string[] = [];
    const data: any[][] = [];

    // Simple table detection - look for lines with consistent spacing
    // This is a basic implementation - in production, you'd want more sophisticated parsing
    if (lines.length > 0) {
      // Assume first line might be headers
      const firstLine = lines[0].trim();
      const potentialHeaders = firstLine.split(/\s{2,}/).filter(h => h.trim());

      if (potentialHeaders.length > 1) {
        headers.push(...potentialHeaders);

        // Process remaining lines as data
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const rowData = line.split(/\s{2,}/).filter(d => d.trim());
            if (rowData.length >= headers.length - 1) { // Allow some flexibility
              data.push(rowData);
            }
          }
        }
      } else {
        // If no clear headers, create generic ones
        headers.push('Column 1', 'Column 2', 'Column 3');
        lines.forEach(line => {
          const rowData = line.split(/\s+/).filter(d => d.trim());
          if (rowData.length > 0) {
            data.push(rowData.slice(0, 3)); // Limit to 3 columns
          }
        });
      }
    }

    return { headers, data };
  };

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setPdfError('Please select a PDF file.');
        showToast('Please select a PDF file', 'error');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setPdfError('File size must be less than 10MB.');
        showToast('File size must be less than 10MB', 'error');
        return;
      }

      setUploadedPdf(file);
      processPdfFile(file);
    }
  };

  const clearPdfData = () => {
    setUploadedPdf(null);
    setPdfData([]);
    setPdfHeaders([]);
    setPdfError('');
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const userToDelete = users.find(u => u.id === userId);

        if (isSupabaseConfigured) {
          // Remove HOD assignment to prevent foreign key constraint violation
          await supabase
            .from('departments')
            .update({ head_faculty_id: null })
            .eq('head_faculty_id', userId);

          // Remove section creator assignment to prevent foreign key constraint violation
          await supabase
            .from('academic_sections')
            .update({ created_by: null })
            .eq('created_by', userId);

          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

          if (error) throw error;

          // Log activity
          await logActivity(
            collegeId,
            currentUser?.id || null,
            'DELETE_USER',
            'USER',
            userId,
            userToDelete?.email || 'Unknown',
            `Deleted user: ${userToDelete?.name}`
          );
        }

        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        showToast('User deleted successfully', 'success');
        await loadRecentActivities();
      } catch (err) {
        showToast('Failed to delete user', 'error');
      }
    }
  };

  const handleDeleteAllUsers = async () => {
    const confirmation = window.prompt('Type "DELETE ALL" to wipe all users (excluding yourself):');
    if (confirmation !== 'DELETE ALL') {
      if (confirmation !== null) {
        showToast('Action cancelled: incorrect confirmation text.', 'info');
      }
      return;
    }

    try {
      if (isSupabaseConfigured && currentUser) {
        // 1. Nullify References to prevent foreign key errors (excluding current user)
        
        // Departments Head
        await supabase
          .from('departments')
          .update({ head_faculty_id: null })
          .eq('college_id', collegeId)
          .neq('head_faculty_id', currentUser.id);

        // Academic Sections Creator
        await supabase
          .from('academic_sections')
          .update({ created_by: null })
          .eq('college_id', collegeId)
          .neq('created_by', currentUser.id);

        // Subjects Faculty
        await supabase
          .from('subjects')
          .update({ faculty_id: null })
          .eq('college_id', collegeId)
          .neq('faculty_id', currentUser.id);

        // Attendance Marked By
        await supabase
          .from('attendance')
          .update({ marked_by: null })
          .eq('college_id', collegeId)
          .neq('marked_by', currentUser.id);

        // Assignments Creator
        await supabase
          .from('assignments')
          .update({ created_by: null })
          .eq('college_id', collegeId)
          .neq('created_by', currentUser.id);

        // Marks Evaluated By
        await supabase
          .from('marks')
          .update({ evaluated_by: null })
          .eq('college_id', collegeId)
          .neq('evaluated_by', currentUser.id);

        // Timetable Uploads
        await supabase
          .from('timetable_uploads')
          .update({ uploaded_by: null })
          .eq('college_id', collegeId)
          .neq('uploaded_by', currentUser.id);

        // 2. We delete all profiles with the current collegeId that are NOT the currentUser
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('college_id', collegeId)
          .neq('id', currentUser.id);

        if (error) throw error;

        // Log activity
        await logActivity(
          collegeId,
          currentUser.id,
          'DELETE_ALL_USERS',
          'SYSTEM',
          null,
          'All Users',
          'Deleted all users in the college'
        );
      }

      // Update local state - keep only the current user if they were in the list
      const remainingUsers = users.filter(u => u.id === currentUser?.id);
      setUsers(remainingUsers);
      setFacultyList(remainingUsers.filter(u => u.role === UserRole.FACULTY));

      showToast('All users deleted successfully', 'success');
      showToast('Note: Profiles removed. Authentication records remain in Supabase. Run WIPE_AUTH_USERS.sql for a full reset.', 'info');
      await loadRecentActivities();
    } catch (err: any) {
      console.error('Failed to delete all users:', err);
      showToast(err.message || 'Failed to delete all users', 'error');
    }
  };

  const handleSubmitUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!formData.name || !formData.email) {
        throw new Error('Name and email are required');
      }

      if (!selectedUser && !formData.password) {
        throw new Error('Password is required for new users');
      }

      if (isSupabaseConfigured) {
        if (selectedUser) {
          // Update existing user
          const { error } = await supabase
            .from('profiles')
            .update({
              name: formData.name,
              email: formData.email,
              role: formData.role,
              department: formData.department || null,
              student_id: formData.student_id || null,
              faculty_id: formData.faculty_id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.id);

          if (error) throw error;

          setUsers(users.map(u =>
            u.id === selectedUser.id
              ? { ...u, ...formData }
              : u
          ));
          setSuccessMsg('User updated successfully!');
        } else {
          // Create new user via Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                name: formData.name,
                role: formData.role,
                college_id: collegeId
              }
            }
          });

          if (authError) throw authError;

          // Create profile
          if (authData.user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                college_id: collegeId,
                name: formData.name,
                email: formData.email,
                role: formData.role,
                department: formData.department || null,
                student_id: formData.student_id || null,
                faculty_id: formData.faculty_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) throw profileError;

            const newUser: User = {
              id: authData.user.id,
              college_id: collegeId,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              department: formData.department,
              student_id: formData.student_id,
              faculty_id: formData.faculty_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            setUsers([...users, newUser]);

            // Log activity for new user creation
            await logActivity(
              collegeId,
              currentUser?.id || null,
              'CREATE_USER',
              'USER',
              authData.user.id,
              formData.email,
              `Created new ${formData.role} user: ${formData.name}`
            );

            setSuccessMsg('User created successfully!');
            await loadRecentActivities();
          }
        }

        await loadAdminData();

        setTimeout(() => {
          setShowUserModal(false);
          setSelectedUser(null);
          setFormData({
            name: '',
            email: '',
            password: '',
            role: UserRole.STUDENT,
            department: '',
            student_id: '',
            faculty_id: ''
          });
        }, 2000);
      } else {
        showToast('Database not configured', 'error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Marks functions
  const loadMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('marks')
        .select(`
          *,
          profiles!marks_student_id_fkey(name, email),
          subjects!marks_subject_id_fkey(
            name,
            courses!subjects_course_id_fkey(name)
          )
        `)
        .eq('college_id', collegeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMarks = (data || []).map((mark: any) => ({
        id: mark.id,
        student_id: mark.student_id,
        student_name: mark.profiles?.name || 'Unknown',
        course_id: mark.subjects?.courses?.id || '',
        course_name: mark.subjects?.courses?.name || 'Unknown',
        subject_name: mark.subjects?.name || 'Unknown',
        semester: mark.subjects?.semester || '',
        marks: mark.score,
        total_marks: mark.max_score,
        grade: calculateGrade(mark.score, mark.max_score),
        academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        created_at: mark.created_at
      }));

      setMarks(formattedMarks);
    } catch (err) {
      console.error('Failed to load marks:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          courses(name)
        `)
        .eq('college_id', collegeId)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadAnnouncements = async () => {
    try {
      let { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles!announcements_created_by_fkey(name)
        `)
        .eq('college_id', collegeId)
        .order('created_at', { ascending: false });

      if (error && isMissingAnnouncementsCollegeIdError(error)) {
        const fallback = await supabase
          .from('announcements')
          .select(`
            *,
            profiles!announcements_created_by_fkey(name)
          `)
          .order('created_at', { ascending: false });

        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const handleSubmitMarksForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMarksSubmitting(true);
    setMarksErrorMsg('');
    setMarksSuccessMsg('');

    try {
      if (!marksFormData.student_id || !marksFormData.subject_id || !marksFormData.score) {
        throw new Error('All required fields must be filled');
      }

      const scoreValue = parseFloat(marksFormData.score);
      const maxScoreValue = parseInt(marksFormData.max_score);

      if (scoreValue > maxScoreValue) {
        throw new Error('Score cannot exceed maximum score');
      }

      if (selectedMark) {
        // Update existing mark
        const { error } = await supabase
          .from('marks')
          .update({
            subject_id: marksFormData.subject_id,
            score: scoreValue,
            max_score: maxScoreValue,
            type: marksFormData.type
          })
          .eq('id', selectedMark.id);

        if (error) throw error;
        setMarksSuccessMsg('Marks updated successfully!');
      } else {
        // Add new mark
        const { error } = await supabase
          .from('marks')
          .insert({
            student_id: marksFormData.student_id,
            subject_id: marksFormData.subject_id,
            score: scoreValue,
            max_score: maxScoreValue,
            type: marksFormData.type,
            college_id: collegeId
          });

        if (error) throw error;
        setMarksSuccessMsg('Marks added successfully!');
      }

      await loadMarks();
      setTimeout(() => {
        setShowMarksModal(false);
        setSelectedMark(null);
        setMarksFormData({
          student_id: '',
          subject_id: '',
          score: '',
          max_score: '100',
          type: 'FINAL'
        });
        setMarksSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setMarksErrorMsg(err.message || 'Failed to save marks');
    } finally {
      setIsMarksSubmitting(false);
    }
  };

  const handleEditMark = (mark: any) => {
    setSelectedMark(mark);
    setMarksFormData({
      student_id: mark.student_id,
      course_id: mark.course_id,
      subject_name: mark.subject_name,
      semester: mark.semester,
      marks: mark.marks.toString(),
      total_marks: mark.total_marks.toString(),
      grade: mark.grade,
      academic_year: mark.academic_year
    });
    setShowMarksModal(true);
  };

  const handleDeleteMark = async (markId: string) => {
    if (!confirm('Are you sure you want to delete this marks record?')) return;

    try {
      const { error } = await supabase
        .from('marks')
        .delete()
        .eq('id', markId);

      if (error) throw error;

      await loadMarks();
      showToast('Marks record deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete marks record', 'error');
    }
  };

  // Filtered marks based on current filters
  const filteredMarks = marks.filter(mark => {
    if (marksFilters.department && mark.course_id) {
      const course = courses.find(c => c.id === mark.course_id);
      if (!course || course.department_id !== marksFilters.department) return false;
    }
    if (marksFilters.course && mark.course_id !== marksFilters.course) return false;
    if (marksFilters.semester && mark.semester !== marksFilters.semester) return false;
    if (marksFilters.academicYear && mark.academic_year !== marksFilters.academicYear) return false;
    return true;
  });

  // Helper function to calculate grade from score
  const calculateGrade = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 30) return 'D';
    return 'F';
  };

  // Announcement functions
  const handleSubmitAnnouncementForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnnouncementSubmitting(true);
    setAnnouncementErrorMsg('');
    setAnnouncementSuccessMsg('');

    try {
      if (!announcementFormData.title || !announcementFormData.content) {
        throw new Error('Title and content are required');
      }

      if (selectedAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            title: announcementFormData.title,
            content: announcementFormData.content,
            priority: announcementFormData.priority,
            target_audience: announcementFormData.target_audience,
            is_active: announcementFormData.is_active,
            expires_at: announcementFormData.expires_at || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAnnouncement.id);

        if (error) throw error;
        setAnnouncementSuccessMsg('Announcement updated successfully!');
      } else {
        // Create new announcement
        const payload = {
          title: announcementFormData.title,
          content: announcementFormData.content,
          priority: announcementFormData.priority,
          target_audience: announcementFormData.target_audience,
          is_active: announcementFormData.is_active,
          expires_at: announcementFormData.expires_at || null,
          college_id: collegeId,
          created_by: currentUser?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let { error } = await supabase
          .from('announcements')
          .insert(payload);

        if (error && isMissingAnnouncementsCollegeIdError(error)) {
          const { college_id, ...fallbackPayload } = payload;
          const fallback = await supabase
            .from('announcements')
            .insert(fallbackPayload);
          error = fallback.error;
        }

        if (error) throw error;
        setAnnouncementSuccessMsg('Announcement created successfully!');
      }

      await loadAnnouncements();
      setTimeout(() => {
        setShowAnnouncementModal(false);
        setSelectedAnnouncement(null);
        setAnnouncementFormData({
          title: '',
          content: '',
          priority: 'NORMAL',
          target_audience: 'ALL',
          is_active: true,
          expires_at: ''
        });
        setAnnouncementSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setAnnouncementErrorMsg(err.message || 'Failed to save announcement');
    } finally {
      setIsAnnouncementSubmitting(false);
    }
  };

  const handleEditAnnouncement = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at || ''
    });
    setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      await loadAnnouncements();
      showToast('Announcement deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete announcement', 'error');
    }
  };

  // Broadcasting functions
  const handleSubmitBroadcastingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcastingSubmitting(true);
    setBroadcastingErrorMsg('');
    setBroadcastingSuccessMsg('');

    try {
      if (!broadcastingFormData.title || !broadcastingFormData.content) {
        throw new Error('Title and content are required');
      }

      if (broadcastingFormData.broadcast_channels.length === 0) {
        throw new Error('Please select at least one broadcast channel');
      }

      // Create the broadcast announcement
      const broadcastData = {
        title: broadcastingFormData.title,
        content: broadcastingFormData.content,
        priority: broadcastingFormData.priority,
        target_audience: 'ALL',
        is_active: true,
        expires_at: broadcastingFormData.is_immediate ? null : broadcastingFormData.scheduled_date,
        college_id: collegeId,
        created_by: currentUser?.id,
        broadcast_channels: broadcastingFormData.broadcast_channels,
        is_broadcast: true,
        broadcast_scheduled: broadcastingFormData.is_immediate ? null : broadcastingFormData.scheduled_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let { error } = await supabase
        .from('announcements')
        .insert(broadcastData);

      if (error && isMissingAnnouncementsCollegeIdError(error)) {
        const { college_id, ...fallbackBroadcastData } = broadcastData;
        const fallback = await supabase
          .from('announcements')
          .insert(fallbackBroadcastData);
        error = fallback.error;
      }

      if (error) throw error;

      setBroadcastingSuccessMsg('Institutional broadcast sent successfully!');

      // Simulate broadcasting to different channels
      for (const channel of broadcastingFormData.broadcast_channels) {
        console.log(`Broadcasting to ${channel}:`, broadcastData);
        // Here you would integrate with actual broadcasting services
        // like email, SMS, push notifications, etc.
      }

      setTimeout(() => {
        setShowBroadcastingModal(false);
        setBroadcastingFormData({
          title: '',
          content: '',
          priority: 'HIGH',
          broadcast_channels: [],
          scheduled_date: '',
          is_immediate: true
        });
        setBroadcastingSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setBroadcastingErrorMsg(err.message || 'Failed to send broadcast');
    } finally {
      setIsBroadcastingSubmitting(false);
    }
  };

  const handleAssignHOD = async () => {
    if (!selectedDepartment || !selectedHOD) {
      showToast('Please select a faculty member', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      showToast('Database not configured', 'error');
      return;
    }

    try {
      const selectedFaculty = users.find(u => u.id === selectedHOD);

      // Update department's head_faculty_id
      const { error: deptError } = await supabase
        .from('departments')
        .update({ head_faculty_id: selectedHOD })
        .eq('id', selectedDepartment.id);

      if (deptError) throw deptError;

      // Update faculty profile: role to HOD and department to assigned department
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'HOD',
          department: selectedDepartment.name
        })
        .eq('id', selectedHOD);

      if (profileError) throw profileError;

      // Log activity
      await logActivity(
        collegeId,
        currentUser?.id || null,
        'ASSIGN_HOD',
        'DEPARTMENT',
        selectedDepartment.id,
        selectedDepartment.name,
        `Assigned ${selectedFaculty?.name} as HOD for ${selectedDepartment.name}`
      );

      // Refresh departments and users data
      await loadAdminData();
      await loadRecentActivities();

      setShowHODModal(false);
      setSelectedDepartment(null);
      setSelectedHOD('');
      showToast('HOD assigned successfully! Role updated to HOD. Access limited to their department.', 'success');
    } catch (err: any) {
      showToast('Failed to assign HOD: ' + err.message, 'error');
    }
  };

  const handleSubmitDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeptSubmitting(true);
    setDeptErrorMsg('');
    setDeptSuccessMsg('');

    try {
      if (!departmentFormData.code || !departmentFormData.name) {
        throw new Error('Department code and name are required');
      }

      if (!isSupabaseConfigured) {
        throw new Error('Database not configured');
      }

      // Check if department code already exists
      const { data: existingDept } = await supabase
        .from('departments')
        .select('id')
        .eq('code', departmentFormData.code)
        .single();

      if (existingDept) {
        throw new Error('Department code already exists');
      }

      // Insert new department
      const { data, error } = await supabase
        .from('departments')
        .insert([
          {
            id: crypto.randomUUID(),
            college_id: collegeId,
            code: departmentFormData.code.toUpperCase(),
            name: departmentFormData.name,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      // Update local state
      if (data && data.length > 0) {
        setDepartments([...departments, data[0]]);

        // Log activity
        await logActivity(
          collegeId,
          currentUser?.id || null,
          'CREATE_DEPARTMENT',
          'DEPARTMENT',
          data[0].id,
          departmentFormData.name,
          `Created new department: ${departmentFormData.name} (${departmentFormData.code})`
        );
      }

      setDeptSuccessMsg('Department added successfully!');

      // Refresh data
      await loadAdminData();
      await loadRecentActivities();

      setTimeout(() => {
        setShowDepartmentModal(false);
        setDepartmentFormData({ code: '', name: '' });
        setDeptSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setDeptErrorMsg(err.message || 'Failed to add department');
    } finally {
      setIsDeptSubmitting(false);
    }
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCourseSubmitting(true);
    setCourseErrorMsg('');
    setCourseSuccessMsg('');

    try {
      if (!courseFormData.code || !courseFormData.name) {
        throw new Error('Course code and name are required');
      }

      if (!isSupabaseConfigured) {
        throw new Error('Database not configured');
      }

      if (selectedCourse) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update({
            code: courseFormData.code.toUpperCase(),
            name: courseFormData.name,
            duration_years: courseFormData.duration_years,
            credits_required: courseFormData.credits_required,
            department_id: courseFormData.department_id || null
          })
          .eq('id', selectedCourse.id);

        if (error) throw error;

        // Update local state
        setCourses(courses.map(c =>
          c.id === selectedCourse.id
            ? {
              ...c,
              ...courseFormData,
              code: courseFormData.code.toUpperCase()
            }
            : c
        ));

        // Log activity
        await logActivity(
          collegeId,
          currentUser?.id || null,
          'UPDATE_COURSE',
          'COURSE',
          selectedCourse.id,
          courseFormData.name,
          `Updated program: ${courseFormData.name} (${courseFormData.code})`
        );

        setCourseSuccessMsg('Program updated successfully!');
      } else {
        // Check if course code already exists in this college
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('college_id', collegeId)
          .eq('code', courseFormData.code)
          .single();

        if (existingCourse) {
          throw new Error('Course code already exists');
        }

        // Insert new course
        const { data, error } = await supabase
          .from('courses')
          .insert([
            {
              id: crypto.randomUUID(),
              college_id: collegeId,
              department_id: courseFormData.department_id || null,
              code: courseFormData.code.toUpperCase(),
              name: courseFormData.name,
              duration_years: courseFormData.duration_years,
              credits_required: courseFormData.credits_required,
              created_at: new Date().toISOString()
            }
          ])
          .select();

        if (error) throw error;

        // Update local state
        if (data && data.length > 0) {
          setCourses([...courses, data[0]]);

          // Log activity
          await logActivity(
            collegeId,
            currentUser?.id || null,
            'CREATE_COURSE',
            'COURSE',
            data[0].id,
            courseFormData.name,
            `Created new program: ${courseFormData.name} (${courseFormData.code})`
          );
        }

        setCourseSuccessMsg('Program added successfully!');
      }

      // Refresh data
      await loadAdminData();
      await loadRecentActivities();

      setTimeout(() => {
        setShowCourseModal(false);
        setSelectedCourse(null);
        setCourseFormData({
          code: '',
          name: '',
          duration_years: 4,
          credits_required: 120,
          department_id: ''
        });
        setCourseSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setCourseErrorMsg(err.message || 'Failed to save program');
    } finally {
      setIsCourseSubmitting(false);
    }
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseFormData({
      code: course.code,
      name: course.name,
      duration_years: course.duration_years || 4,
      credits_required: course.credits_required || 120,
      department_id: course.department_id || ''
    });
    setCourseErrorMsg('');
    setCourseSuccessMsg('');
    setOpenCourseMenuId(null);
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    const courseToDelete = courses.find(c => c.id === courseId);

    if (window.confirm(`Are you sure you want to delete program "${courseToDelete?.name}"?`)) {
      try {
        if (!isSupabaseConfigured) {
          throw new Error('Database not configured');
        }

        const { error } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);

        if (error) throw error;

        // Log activity
        await logActivity(
          collegeId,
          currentUser?.id || null,
          'DELETE_COURSE',
          'COURSE',
          courseId,
          courseToDelete?.name || 'Unknown',
          `Deleted program: ${courseToDelete?.name}`
        );

        // Update local state
        setCourses(courses.filter(c => c.id !== courseId));

        showToast('Program deleted successfully!', 'success');
        await loadRecentActivities();
      } catch (err: any) {
        showToast('Failed to delete program: ' + err.message, 'error');
      }
    }
    setOpenCourseMenuId(null);
  };

  // Handle bulk department import
  const handleBulkDepartmentImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setBulkImportErrors(['Please select a file']);
      return;
    }

    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const rawData = await parseExcelFile(file);
      const { valid, errors } = validateDepartmentData(rawData);

      if (errors.length > 0) {
        setBulkImportErrors(errors);
        return;
      }

      // Preview data before insert
      setBulkPreviewData(valid);
      setBulkImportType('departments');
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to parse file']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Confirm and insert bulk departments
  const confirmBulkDepartmentImport = async () => {
    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const departmentData = bulkPreviewData as DepartmentBulkData[];

      for (const dept of departmentData) {
        // Check if department code already exists
        const { data: existing } = await supabase
          .from('departments')
          .select('id')
          .eq('code', dept.code)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('departments')
            .insert([
              {
                id: crypto.randomUUID(),
                college_id: collegeId,
                code: dept.code.toUpperCase(),
                name: dept.name,
                created_at: new Date().toISOString()
              }
            ]);

          if (error) throw error;
        }
      }

      setBulkImportSuccess(`Successfully imported ${departmentData.length} departments!`);
      setBulkPreviewData([]);

      // Log activity for bulk import
      await logActivity(
        collegeId,
        currentUser?.id || null,
        'BULK_IMPORT_DEPARTMENTS',
        'DEPARTMENT',
        null,
        departmentData.length.toString(),
        `Bulk imported ${departmentData.length} departments`
      );

      await loadAdminData();
      await loadRecentActivities();

      setTimeout(() => {
        setShowBulkDeptModal(false);
        setBulkImportSuccess('');
      }, 2000);
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to import departments']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Handle bulk course import
  const handleBulkCourseImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setBulkImportErrors(['Please select a file']);
      return;
    }

    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const rawData = await parseExcelFile(file);
      const { valid, errors } = validateCourseData(rawData);

      if (errors.length > 0) {
        setBulkImportErrors(errors);
        return;
      }

      setBulkPreviewData(valid);
      setBulkImportType('courses');
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to parse file']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Confirm and insert bulk courses
  const confirmBulkCourseImport = async () => {
    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const courseData = bulkPreviewData as CourseBulkData[];

      for (const course of courseData) {
        // Find department_id if department_code is provided
        let departmentId = course.department_code ? null : null;

        if (course.department_code) {
          const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('college_id', collegeId)
            .eq('code', course.department_code)
            .single();

          if (dept) departmentId = dept.id;
        }

        const { error } = await supabase
          .from('courses')
          .insert([
            {
              id: crypto.randomUUID(),
              college_id: collegeId,
              department_id: departmentId,
              code: course.code.toUpperCase(),
              name: course.name,
              duration_years: course.duration_years || 4,
              credits_required: course.credits_required || 120,
              created_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;
      }

      setBulkImportSuccess(`Successfully imported ${courseData.length} programs!`);
      setBulkPreviewData([]);

      // Log activity for bulk import
      await logActivity(
        collegeId,
        currentUser?.id || null,
        'BULK_IMPORT_COURSES',
        'COURSE',
        null,
        courseData.length.toString(),
        `Bulk imported ${courseData.length} programs`
      );

      await loadAdminData();
      await loadRecentActivities();

      setTimeout(() => {
        setShowBulkCourseModal(false);
        setBulkImportSuccess('');
      }, 2000);
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to import courses']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Handle bulk user import
  const handleBulkUserImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setBulkImportErrors(['Please select a file']);
      return;
    }

    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const rawData = await parseExcelFile(file);
      const { valid, errors } = validateUserData(rawData);

      if (errors.length > 0) {
        setBulkImportErrors(errors);
        return;
      }

      setBulkPreviewData(valid);
      setBulkImportType('users');
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to parse file']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Confirm and insert bulk users
  const confirmBulkUserImport = async () => {
    try {
      setIsBulkImporting(true);
      setBulkImportErrors([]);
      const userData = bulkPreviewData as UserBulkData[];
      let successCount = 0;

      for (const user of userData) {
        try {
          // Add a small delay between each user to avoid Supabase Auth rate limits (429)
          await sleep(400);

          let authResult: { data: any, error: any } = { data: { user: null }, error: null };
          let retryCount = 0;
          const maxRetries = 2;

          while (retryCount <= maxRetries) {
            authResult = await supabase.auth.signUp({
              email: user.email,
              password: user.password || 'TempPass@123'
            });

            if (authResult.error?.status === 429) {
              // Hit rate limit, wait longer and retry
              await sleep(2000 * (retryCount + 1));
              retryCount++;
              continue;
            }
            break;
          }

          const { data: authData, error: authError } = authResult;
          let userId = authData.user?.id;

          if (authError) {
            if (authError.message.toLowerCase().includes('already registered') || authError.status === 422) {
              // User already in Auth, try to find existing profile to get their ID
              // Use standard query instead of .single() to avoid 406 error if no profile exists
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', user.email);
              
              if (profiles && profiles.length > 0) {
                userId = profiles[0].id;
              } else {
                console.warn(`User ${user.email} exists in Auth but has no profile record. Try manual linking or repair.`);
                // Track ghost users to inform the admin after import
                setBulkImportErrors(prev => [...prev, `User ${user.email} exists in Supabase Auth but has no profile. Please run WIPE_AUTH_USERS.sql to clear orphaned records.`]);
                continue;
              }
            } else {
              console.warn(`Auth error for ${user.email}:`, authError.message);
              continue;
            }
          }

          if (userId) {
            // Upsert profile
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                college_id: collegeId,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || null,
                student_id: user.student_id || null,
                faculty_id: user.faculty_id || null,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });

            if (!profileError) successCount++;
            else console.error(`Profile error for ${user.email}:`, profileError.message);
          }
        } catch (err: any) {
          console.warn(`Skipping user ${user.email}:`, err.message);
        }
      }

      setBulkImportSuccess(`Successfully imported ${successCount} users!`);
      setBulkPreviewData([]);

      // Log activity for bulk user import
      await logActivity(
        collegeId,
        currentUser?.id || null,
        'BULK_IMPORT_USERS',
        'USER',
        null,
        successCount.toString(),
        `Bulk imported ${successCount} users`
      );

      await loadAdminData();
      await loadRecentActivities();

      setTimeout(() => {
        setShowBulkUserModal(false);
        setBulkImportSuccess('');
      }, 2000);
    } catch (err: any) {
      setBulkImportErrors([err.message || 'Failed to import users']);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const normalizeDepartmentValue = (value?: string | null) =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const getDepartmentMatchKeys = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return new Set<string>();

    const simplified = raw.replace(/\b(department|dept|engineering|engg|of|and)\b/gi, ' ');
    const acronym = raw
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map(word => word[0])
      .join('');

    return new Set(
      [raw, simplified, acronym]
        .map(normalizeDepartmentValue)
        .filter(Boolean)
    );
  };

  const matchingDepartmentFaculty = selectedDepartment
    ? facultyList.filter((faculty) => {
      if (!faculty.department) return false;

      const facultyKeys = getDepartmentMatchKeys(faculty.department);
      const departmentKeys = new Set<string>([
        ...getDepartmentMatchKeys(selectedDepartment.name),
        ...getDepartmentMatchKeys(selectedDepartment.code),
      ]);

      return [...facultyKeys].some(key => departmentKeys.has(key));
    })
    : [];

  const availableHODFaculty =
    matchingDepartmentFaculty.length > 0 ? matchingDepartmentFaculty : facultyList;

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.student_id?.toLowerCase().includes(searchLower) ||
      user.faculty_id?.toLowerCase().includes(searchLower)
    );
  });

  const stats = [
    {
      label: 'Total Users',
      value: users.length.toString(),
      icon: Users,
      color: 'indigo',
      change: '+' + users.length,
    },
    {
      label: 'Programs',
      value: courses.length.toString(),
      icon: BookOpen,
      color: 'blue',
      change: '+' + courses.length,
    },
    {
      label: 'Active Students',
      value: users.filter(u => u.role === UserRole.STUDENT).length.toString(),
      icon: TrendingUp,
      color: 'green',
      change: '+' + users.filter(u => u.role === UserRole.STUDENT).length,
    },
    {
      label: 'Faculty Members',
      value: users.filter(u => u.role === UserRole.FACULTY).length.toString(),
      icon: Users,
      color: 'orange',
      change: '+' + users.filter(u => u.role === UserRole.FACULTY).length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 fade-in-up">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Manage users, courses, and college settings</p>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 sm:gap-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'departments', label: 'Departments', icon: Building2 },
              { id: 'courses', label: 'Programs', icon: BookOpen },
              { id: 'results', label: 'Results', icon: FileText },
              { id: 'marks', label: 'Database Marks Entry', icon: GraduationCap },
              { id: 'announcements', label: 'Announcements', icon: Megaphone },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-semibold text-sm sm:text-base transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 lg:py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-500 text-lg">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 lg:space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    const colorMap: Record<string, string> = {
                      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                      blue: 'bg-blue-50 text-blue-600 border-blue-200',
                      green: 'bg-green-50 text-green-600 border-green-200',
                      orange: 'bg-orange-50 text-orange-600 border-orange-200',
                    };

                    return (
                      <TiltCard
                        key={idx}
                        delay={idx * 100}
                        className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-600 text-xs sm:text-sm font-semibold truncate">{stat.label}</p>
                            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 sm:mt-2">{stat.value}</p>
                            <p className="text-green-600 text-xs font-semibold mt-1 sm:mt-2">{stat.change}</p>
                          </div>
                          <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${colorMap[stat.color]} ml-3`}>
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        </div>
                      </TiltCard>
                    );
                  })}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Recent Activity</h3>
                      <button
                        onClick={() => {
                          setActivityPageNumber(0);
                          setShowAllActivitiesModal(true);
                          const loadAllActivities = async () => {
                            const { activities, total } = await getAllActivities(collegeId, 20, 0);
                            setAllActivities(activities);
                            setTotalActivityCount(total);
                          };
                          loadAllActivities();
                        }}
                        className="text-indigo-600 text-sm font-semibold hover:bg-indigo-50 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 hover:shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">View All</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {recentActivities.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 text-slate-500">
                          <p className="text-sm sm:text-base">No recent activities yet</p>
                        </div>
                      ) : (
                        recentActivities.map((activity, idx) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 p-2 rounded-xl transition-colors fade-in-up"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                          >
                            <div className="p-2 bg-green-50 rounded-lg shrink-0">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                                {formatActivityMessage(activity)}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{getTimeAgo(activity.created_at)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {/* PDF Upload Section */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-200/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Results Management</h3>
                        <p className="text-slate-500 text-sm mt-1">Upload PDF files to extract and view tabular data</p>
                      </div>
                      {uploadedPdf && (
                        <button
                          onClick={clearPdfData}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Clear Data
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* Upload Area */}
                    <div className="mb-6">
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isProcessingPdf
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                          }`}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) {
                            handlePdfUpload(files[0]);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {isProcessingPdf ? (
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <div>
                              <p className="text-lg font-semibold text-slate-900">Processing PDF...</p>
                              <p className="text-slate-500 text-sm">Extracting tabular data from your file</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4">
                            <Upload className="w-12 h-12 text-slate-400" />
                            <div>
                              <p className="text-lg font-semibold text-slate-900">
                                {uploadedPdf ? 'PDF Uploaded Successfully' : 'Drop PDF file here or click to browse'}
                              </p>
                              <p className="text-slate-500 text-sm mt-1">
                                {uploadedPdf
                                  ? `File: ${uploadedPdf.name}`
                                  : 'Supports PDF files up to 10MB'
                                }
                              </p>
                            </div>
                            {!uploadedPdf && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePdfUpload(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <span className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold">
                                  Choose PDF File
                                </span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                      {pdfError && (
                        <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <p className="text-sm font-semibold text-rose-700">{pdfError}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extracted Data Table */}
                    {pdfData.length > 0 && (
                      <div className="overflow-x-auto">
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-900">Extracted Data</h4>
                            <p className="text-sm text-slate-500 mt-1">
                              {pdfData.length} rows extracted from PDF
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-slate-50">
                                <tr>
                                  {pdfHeaders.map((header, index) => (
                                    <th
                                      key={index}
                                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {pdfData.map((row, rowIndex) => (
                                  <tr key={rowIndex} className="hover:bg-slate-50 transition">
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={cellIndex}
                                        className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap"
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Table Footer with Export Option */}
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                              Showing {pdfData.length} rows
                            </p>
                            <button
                              onClick={() => {
                                // Export functionality can be added here
                                const csvContent = [
                                  pdfHeaders.join(','),
                                  ...pdfData.map(row => row.join(','))
                                ].join('\n');

                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'extracted_data.csv';
                                a.click();
                                window.URL.revokeObjectURL(url);
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center gap-2 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Export CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {!uploadedPdf && !isProcessingPdf && (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">No PDF Uploaded</h4>
                        <p className="text-slate-500">
                          Upload a PDF file to extract and view tabular data
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Database Marks Entry Tab */}
            {activeTab === 'marks' && (
              <div className="space-y-6">
                {/* Marks Entry Form */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-200/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Database Marks Entry</h3>
                        <p className="text-slate-500 text-sm mt-1">Enter and manage student marks and grades</p>
                      </div>
                      <button
                        onClick={() => setShowMarksModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Marks
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Department</label>
                        <select
                          value={marksFilters.department}
                          onChange={(e) => setMarksFilters({ ...marksFilters, department: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                        >
                          <option value="">All Departments</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Program</label>
                        <select
                          value={marksFilters.course}
                          onChange={(e) => setMarksFilters({ ...marksFilters, course: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                        >
                          <option value="">All Programs</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Semester</label>
                        <select
                          value={marksFilters.semester}
                          onChange={(e) => setMarksFilters({ ...marksFilters, semester: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                        >
                          <option value="">All Semesters</option>
                          <option value="1">Semester 1</option>
                          <option value="2">Semester 2</option>
                          <option value="3">Semester 3</option>
                          <option value="4">Semester 4</option>
                          <option value="5">Semester 5</option>
                          <option value="6">Semester 6</option>
                          <option value="7">Semester 7</option>
                          <option value="8">Semester 8</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Academic Year</label>
                        <select
                          value={marksFilters.academicYear}
                          onChange={(e) => setMarksFilters({ ...marksFilters, academicYear: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                        >
                          <option value="">All Years</option>
                          <option value="2024-2025">2024-2025</option>
                          <option value="2023-2024">2023-2024</option>
                          <option value="2022-2023">2022-2023</option>
                        </select>
                      </div>
                    </div>

                    {/* Marks Table */}
                    <div className="overflow-x-auto">
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <h4 className="font-semibold text-slate-900">Student Marks</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {filteredMarks.length} records found
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Student
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Program
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Subject
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Semester
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Marks
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Grade
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Academic Year
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {filteredMarks.map((mark) => (
                                <tr key={mark.id} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    <div>
                                      <p className="font-medium">{mark.student_name}</p>
                                      <p className="text-slate-500 text-xs">{mark.student_id}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    {mark.course_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    {mark.subject_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    {mark.semester}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                    {mark.marks}/{mark.total_marks}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${mark.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                                      mark.grade === 'A' ? 'bg-green-100 text-green-800' :
                                        mark.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                                          mark.grade === 'B' ? 'bg-indigo-100 text-indigo-800' :
                                            mark.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                                              mark.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                                                mark.grade === 'D' ? 'bg-red-100 text-red-800' :
                                                  'bg-gray-100 text-gray-800'
                                      }`}>
                                      {mark.grade}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    {mark.academic_year}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleEditMark(mark)}
                                        className="text-indigo-600 hover:text-indigo-900 transition"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMark(mark.id)}
                                        className="text-red-600 hover:text-red-900 transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {filteredMarks.length === 0 && (
                          <div className="text-center py-12">
                            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">No Marks Found</h4>
                            <p className="text-slate-500">
                              No marks records match the current filters
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">User Management</h3>
                      <p className="text-slate-500 text-sm mt-1">Manage students, faculty, and administrators</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => downloadUserSample()}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all duration-200 font-semibold text-sm border border-slate-300"
                        title="Download sample Excel file"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Sample</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBulkUserModal(true);
                          setBulkImportErrors([]);
                          setBulkPreviewData([]);
                          setBulkImportSuccess('');
                        }}
                        className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                        title="Bulk import from Excel"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Bulk Import</span>
                      </button>
                      <button
                        onClick={handleDeleteAllUsers}
                        className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                        title="Delete all users"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete All</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setFormData({
                            name: '',
                            email: '',
                            password: '',
                            role: UserRole.STUDENT,
                            department: '',
                            student_id: '',
                            faculty_id: ''
                          });
                          setErrorMsg('');
                          setSuccessMsg('');
                          setShowUserModal(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add User
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="p-4 sm:p-6 border-b border-slate-200/50">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by name, email, department, role, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                      />
                    </div>
                    <button className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200">
                      <Filter className="w-5 h-5 text-slate-600" />
                      <span className="hidden sm:inline text-sm font-medium">Filter</span>
                    </button>
                  </div>
                </div>

                {/* Users Grid */}
                <div className="p-4 sm:p-6">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 text-base sm:text-lg">
                        {searchTerm ? `No users found matching "${searchTerm}"` : 'No users available'}
                      </p>
                      <p className="text-slate-400 text-sm mt-2">Start by adding your first user</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {filteredUsers.map((user) => (
                        <div 
                          key={user.id} 
                          className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200/50 p-4 sm:p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setSelectedUser(user);
                            setFormData({
                              name: user.name,
                              email: user.email,
                              password: '',
                              role: user.role,
                              department: user.department || '',
                              student_id: user.student_id || '',
                              faculty_id: user.faculty_id || ''
                            });
                            setErrorMsg('');
                            setSuccessMsg('');
                            setShowUserModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg text-white shadow-sm ${user.role === UserRole.STUDENT ? 'bg-blue-600' :
                                user.role === UserRole.FACULTY ? 'bg-purple-600' :
                                  'bg-indigo-600'
                                }`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{user.name}</h3>
                                <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setFormData({
                                    name: user.name,
                                    email: user.email,
                                    password: '',
                                    role: user.role,
                                    department: user.department || '',
                                    student_id: user.student_id || '',
                                    faculty_id: user.faculty_id || ''
                                  });
                                  setErrorMsg('');
                                  setSuccessMsg('');
                                  setShowUserModal(true);
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-blue-600 hover:shadow-sm"
                                title="Edit user"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.id);
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 text-red-600 hover:shadow-sm"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Email:</span>
                              <span className="text-slate-700 truncate">{user.email}</span>
                            </div>
                            {user.department && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">Dept:</span>
                                <span className="text-slate-700 truncate">{user.department}</span>
                              </div>
                            )}
                            {(user.student_id || user.faculty_id) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">ID:</span>
                                <span className="text-slate-700 font-mono text-xs">
                                  {user.student_id || user.faculty_id}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Programs Tab */}
            {activeTab === 'courses' && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Programs Management</h3>
                      <p className="text-slate-500 text-sm mt-1">Manage academic programs and courses</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => downloadCourseSample()}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all duration-200 font-semibold text-sm border border-slate-300"
                        title="Download sample Excel file"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Sample</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBulkCourseModal(true);
                          setBulkImportErrors([]);
                          setBulkPreviewData([]);
                          setBulkImportSuccess('');
                        }}
                        className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                        title="Bulk import from Excel"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Bulk Import</span>
                      </button>
                      <button
                        onClick={() => {
                          setCourseFormData({
                            code: '',
                            name: '',
                            duration_years: 4,
                            credits_required: 120,
                            department_id: ''
                          });
                          setCourseErrorMsg('');
                          setCourseSuccessMsg('');
                          setShowCourseModal(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add Program
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {courses.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                      <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 text-base sm:text-lg">No programs available</p>
                      <p className="text-slate-400 text-sm mt-2">Start by adding your first academic program</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {courses.map((course) => (
                        <div key={course.id} className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200/50 p-4 sm:p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 hover:-translate-y-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{course.name}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">{course.code}</p>
                              </div>
                            </div>
                            <div className="relative ml-2">
                              <button
                                onClick={() => setOpenCourseMenuId(openCourseMenuId === course.id ? null : course.id)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-600" />
                              </button>
                              {openCourseMenuId === course.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
                                  <button
                                    onClick={() => {
                                      setSelectedCourse(course);
                                      setCourseFormData({
                                        code: course.code,
                                        name: course.name,
                                        duration_years: course.duration_years,
                                        credits_required: course.credits_required,
                                        department_id: course.department_id || ''
                                      });
                                      setCourseErrorMsg('');
                                      setCourseSuccessMsg('');
                                      setShowCourseModal(true);
                                      setOpenCourseMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Program
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteCourse(course.id);
                                      setOpenCourseMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Program
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                              <div>
                                <p className="text-slate-500 font-medium">Duration</p>
                                <p className="text-slate-900 font-semibold">{course.duration_years} years</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-medium">Credits</p>
                                <p className="text-slate-900 font-semibold">{course.credits_required}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Departments Management</h3>
                      <p className="text-slate-500 text-sm mt-1">Manage academic departments and assign HODs</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => downloadDepartmentSample()}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all duration-200 font-semibold text-sm border border-slate-300"
                        title="Download sample Excel file"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Sample</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBulkDeptModal(true);
                          setBulkImportErrors([]);
                          setBulkPreviewData([]);
                          setBulkImportSuccess('');
                        }}
                        className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                        title="Bulk import from Excel"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Bulk Import</span>
                      </button>
                      <button
                        onClick={() => {
                          setDepartmentFormData({ code: '', name: '' });
                          setDeptErrorMsg('');
                          setDeptSuccessMsg('');
                          setShowDepartmentModal(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add Department
                      </button>
                    </div>
                  </div>
                </div>

                {/* Departments Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/80">
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Code</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Head of Department</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">HOD Email</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departments.map((dept: any) => (
                        <tr
                          key={dept.id}
                          className="hover:bg-slate-50/80 transition-all duration-200 cursor-pointer group"
                          onClick={() => handleDepartmentClick(dept)}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors duration-200">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 text-sm sm:text-base">{dept.name}</span>
                                <div className="text-xs text-slate-500 sm:hidden mt-1">
                                  {dept.hod_profile?.name || 'No HOD assigned'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 font-mono">
                              {dept.code}
                            </span>
                          </td>
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <span className="text-slate-900 text-sm">
                              {dept.hod_profile?.name || (
                                <span className="text-slate-400 italic text-xs">Not assigned</span>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-4 hidden md:table-cell">
                            <span className="text-slate-600 text-sm">
                              {dept.hod_profile?.email || <span className="text-slate-400">-</span>}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDepartment(dept);
                                setShowHODModal(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all duration-200 font-semibold text-sm hover:shadow-sm"
                            >
                              <UserCog className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                {dept.head_faculty_id ? 'Change HOD' : 'Assign HOD'}
                              </span>
                              <span className="sm:hidden">
                                {dept.head_faculty_id ? 'Change' : 'Assign'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {departments.length === 0 && (
                  <div className="text-center py-12 sm:py-16">
                    <Building2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 text-base sm:text-lg">No departments available</p>
                    <p className="text-slate-400 text-sm mt-2">Start by adding your first department</p>
                  </div>
                )}
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                {/* Announcements Header */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50">
                  <div className="p-4 sm:p-6 border-b border-slate-200/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Announcements Management</h3>
                        <p className="text-slate-500 text-sm mt-1">Create and manage college announcements</p>
                      </div>
                      <div className="relative group broadcasting-dropdown w-full sm:w-auto">
                        <button
                          onClick={() => setShowBroadcastingOptions(!showBroadcastingOptions)}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          New Announcement
                          <ChevronDown className={`w-4 h-4 transition-transform ${showBroadcastingOptions ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Broadcasting Options Dropdown - Absolutely positioned */}
                        {showBroadcastingOptions && (
                          <div className="absolute left-0 sm:left-auto sm:right-0 top-12 w-full sm:w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                            <button
                              onClick={() => {
                                setShowAnnouncementModal(true);
                                setShowBroadcastingOptions(false);
                              }}
                              className="w-full text-left px-4 py-3 rounded-t-lg hover:bg-slate-50 transition flex items-center gap-3 border-b border-slate-100"
                            >
                              <Megaphone className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-900">Regular Announcement</p>
                                <p className="text-xs text-slate-500">Create a standard announcement</p>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setShowBroadcastingModal(true);
                                setShowBroadcastingOptions(false);
                              }}
                              className="w-full text-left px-4 py-3 rounded-b-lg hover:bg-emerald-50 transition flex items-center gap-3"
                            >
                              <Radio className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-900">Institutional Broadcasting</p>
                                <p className="text-xs text-slate-500">Broadcast to entire institution</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* Announcements List */}
                    <div className="space-y-4">
                      {announcements.length === 0 ? (
                        <div className="text-center py-12">
                          <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-slate-900 mb-2">No Announcements</h4>
                          <p className="text-slate-500">
                            Create your first announcement to communicate with students and faculty
                          </p>
                        </div>
                      ) : (
                        announcements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className={`border rounded-xl p-4 sm:p-6 transition-all hover:shadow-md ${announcement.priority === 'URGENT'
                              ? 'border-red-200 bg-red-50'
                              : announcement.priority === 'HIGH'
                                ? 'border-orange-200 bg-orange-50'
                                : announcement.priority === 'NORMAL'
                                  ? 'border-blue-200 bg-blue-50'
                                  : 'border-slate-200 bg-white'
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-slate-900 truncate">
                                    {announcement.title}
                                  </h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${announcement.priority === 'URGENT'
                                    ? 'bg-red-100 text-red-800'
                                    : announcement.priority === 'HIGH'
                                      ? 'bg-orange-100 text-orange-800'
                                      : announcement.priority === 'NORMAL'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}>
                                    {announcement.priority}
                                  </span>
                                  {!announcement.is_active && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      Inactive
                                    </span>
                                  )}
                                </div>

                                <p className="text-slate-600 mb-3 line-clamp-2">
                                  {announcement.content}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {announcement.target_audience}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <UserCog className="w-4 h-4" />
                                    {announcement.profiles?.name || 'Unknown'}
                                  </span>
                                  <span>
                                    {new Date(announcement.created_at).toLocaleDateString()}
                                  </span>
                                  {announcement.expires_at && (
                                    <span className="text-orange-600">
                                      Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditAnnouncement(announcement)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Edit announcement"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete announcement"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 lg:space-y-8">
                {/* Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* User Distribution */}
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-200/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900">User Distribution</h3>
                          <p className="text-slate-500 text-sm">Breakdown of user roles in the system</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="space-y-4 sm:space-y-6">
                        {[
                          { role: 'Students', count: users.filter(u => u.role === UserRole.STUDENT).length, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
                          { role: 'Faculty', count: users.filter(u => u.role === UserRole.FACULTY).length, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
                          { role: 'Admins', count: users.filter(u => u.role === UserRole.COLLEGE_ADMIN).length, color: 'bg-indigo-500', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
                        ].map((item) => (
                          <div key={item.role} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                <p className="font-semibold text-slate-900 text-sm sm:text-base">{item.role}</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full ${item.bgColor} ${item.textColor} text-sm font-bold`}>
                                {item.count}
                              </div>
                            </div>
                            <div className="relative">
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`${item.color} h-full transition-all duration-1000 ease-out rounded-full`}
                                  style={{ width: `${users.length > 0 ? (item.count / users.length) * 100 : 0}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 text-right">
                                {users.length > 0 ? Math.round((item.count / users.length) * 100) : 0}% of total
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-200/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900">System Health</h3>
                          <p className="text-slate-500 text-sm">Real-time system status and performance</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {[
                          { label: 'Database Status', status: 'Operational', color: 'green', icon: CheckCircle },
                          { label: 'API Response', status: '98ms', color: 'green', icon: CheckCircle },
                          { label: 'Storage Used', status: '42%', color: 'yellow', icon: AlertCircle },
                          { label: 'Backup Status', status: 'Latest', color: 'green', icon: CheckCircle },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${item.color === 'green' ? 'bg-emerald-100' : 'bg-yellow-100'
                                  }`}>
                                  <Icon className={`w-4 h-4 ${item.color === 'green' ? 'text-emerald-600' : 'text-yellow-600'
                                    }`} />
                                </div>
                                <p className="text-slate-700 text-sm font-medium">{item.label}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color === 'green' ? 'bg-emerald-500' : 'bg-yellow-500'
                                  } animate-pulse`} />
                                <p className="text-slate-600 text-sm font-semibold">{item.status}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Analytics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Department Overview */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-indigo-200/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Departments</p>
                        <p className="text-2xl font-bold text-indigo-600">{departments.length}</p>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-700">Active academic departments</p>
                  </div>

                  {/* Programs Overview */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-200/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">Programs</p>
                        <p className="text-2xl font-bold text-emerald-600">{courses.length}</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-700">Academic programs offered</p>
                  </div>

                  {/* System Uptime */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200/50 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">System Uptime</p>
                        <p className="text-2xl font-bold text-slate-600">99.9%</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700">Last 30 days availability</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Course/Program Add/Edit Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedCourse ? 'Edit Program' : 'Add New Program'}
              </h3>
              <button
                onClick={() => {
                  setShowCourseModal(false);
                  setSelectedCourse(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {courseSuccessMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">{courseSuccessMsg}</p>
              </div>
            )}

            {courseErrorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{courseErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitCourse} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Program Code * <span className="text-xs text-slate-500">(e.g., BSCS, BSME)</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseFormData.code}
                  onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition uppercase"
                  placeholder="BSCS"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Program Name *
                </label>
                <input
                  type="text"
                  required
                  value={courseFormData.name}
                  onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Bachelor of Science in Computer Science"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Department (Optional)
                </label>
                <select
                  value={courseFormData.department_id}
                  onChange={(e) => setCourseFormData({ ...courseFormData, department_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={courseFormData.duration_years}
                    onChange={(e) => setCourseFormData({ ...courseFormData, duration_years: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Credits Required
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={courseFormData.credits_required}
                    onChange={(e) => setCourseFormData({ ...courseFormData, credits_required: parseInt(e.target.value) || 120 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseModal(false);
                    setSelectedCourse(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCourseSubmitting || courseSuccessMsg !== ''}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCourseSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : selectedCourse ? (
                    'Update Program'
                  ) : (
                    'Add Program'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Add Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add New Department</h3>
              <button
                onClick={() => setShowDepartmentModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deptSuccessMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">{deptSuccessMsg}</p>
              </div>
            )}

            {deptErrorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{deptErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitDepartment} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Department Code * <span className="text-xs text-slate-500">(e.g., CS, ME, EE)</span>
                </label>
                <input
                  type="text"
                  required
                  value={departmentFormData.code}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition uppercase"
                  placeholder="CS"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={departmentFormData.name}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Computer Science"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> After creating the department, you can assign a Head of Department (HOD) from the departments list.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDepartmentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeptSubmitting || deptSuccessMsg !== ''}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeptSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Department'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitUserForm} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="john@university.edu"
                />
              </div>

              {!selectedUser && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                >
                  <option value={UserRole.STUDENT}>Student</option>
                  <option value={UserRole.FACULTY}>Faculty</option>
                  <option value={UserRole.COLLEGE_ADMIN}>College Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Computer Science"
                />
              </div>

              {formData.role === UserRole.STUDENT && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Student ID</label>
                  <input
                    type="text"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="CSE-2024-001"
                  />
                </div>
              )}

              {formData.role === UserRole.FACULTY && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Faculty ID</label>
                  <input
                    type="text"
                    value={formData.faculty_id}
                    onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="FAC-101"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || successMsg !== ''}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOD Assignment Modal */}
      {showHODModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Assign Head of Department
              </h3>
              <button
                onClick={() => {
                  setShowHODModal(false);
                  setSelectedDepartment(null);
                  setSelectedHOD('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Department</p>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-slate-900">{selectedDepartment.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Faculty as HOD <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedHOD || ''}
                  onChange={(e) => setSelectedHOD(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                >
                  <option value="">Select Faculty...</option>
                  {availableHODFaculty
                    .map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name} - {faculty.email}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {matchingDepartmentFaculty.length > 0
                    ? 'Showing faculty with matching department'
                    : 'No exact department match found. Showing all faculty so you can proceed.'}
                </p>
              </div>

              {selectedDepartment.head_faculty_id && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Current HOD:</strong> {selectedDepartment.profiles?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Assigning a new HOD will replace the current one
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowHODModal(false);
                  setSelectedDepartment(null);
                  setSelectedHOD('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignHOD}
                disabled={!selectedHOD}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign HOD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Department Import Modal */}
      {showBulkDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Bulk Import Departments</h2>
              <button onClick={() => setShowBulkDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!bulkPreviewData.length ? (
                <form onSubmit={handleBulkDepartmentImport} className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Download the sample file, fill in your department data, and upload it.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Excel File</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  {bulkImportErrors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      {bulkImportErrors.map((err, i) => (
                        <p key={i} className="text-sm text-red-800">{err}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowBulkDeptModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Preview Data
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {bulkImportSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 font-semibold">{bulkImportSuccess}</p>
                    </div>
                  )}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800"><strong>Preview:</strong> {bulkPreviewData.length} departments ready to import</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Code</th>
                          <th className="px-4 py-2 text-left font-semibold">Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkPreviewData.map((row: any, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{row.code}</td>
                            <td className="px-4 py-2">{row.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setBulkPreviewData([]); setBulkImportErrors([]); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Back
                    </button>
                    <button onClick={confirmBulkDepartmentImport} disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Course Import Modal */}
      {showBulkCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Bulk Import Programs</h2>
              <button onClick={() => setShowBulkCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!bulkPreviewData.length ? (
                <form onSubmit={handleBulkCourseImport} className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Download the sample file, fill in your program data, and upload it.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Excel File</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  {bulkImportErrors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      {bulkImportErrors.map((err, i) => (
                        <p key={i} className="text-sm text-red-800">{err}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowBulkCourseModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Preview Data
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {bulkImportSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 font-semibold">{bulkImportSuccess}</p>
                    </div>
                  )}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800"><strong>Preview:</strong> {bulkPreviewData.length} programs ready to import</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Code</th>
                          <th className="px-4 py-2 text-left font-semibold">Name</th>
                          <th className="px-4 py-2 text-left font-semibold">Department</th>
                          <th className="px-4 py-2 text-left font-semibold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkPreviewData.map((row: any, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{row.code}</td>
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2">{row.department_code || '-'}</td>
                            <td className="px-4 py-2">{row.duration_years} years</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setBulkPreviewData([]); setBulkImportErrors([]); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Back
                    </button>
                    <button onClick={confirmBulkCourseImport} disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk User Import Modal */}
      {showBulkUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Bulk Import Users</h2>
              <button onClick={() => setShowBulkUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!bulkPreviewData.length ? (
                <form onSubmit={handleBulkUserImport} className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Download the sample file, fill in your user data, and upload it.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Excel File</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  {bulkImportErrors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      {bulkImportErrors.map((err, i) => (
                        <p key={i} className="text-sm text-red-800">{err}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowBulkUserModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Preview Data
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {bulkImportSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 font-semibold">{bulkImportSuccess}</p>
                    </div>
                  )}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800"><strong>Preview:</strong> {bulkPreviewData.length} users ready to import</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Name</th>
                          <th className="px-4 py-2 text-left font-semibold">Email</th>
                          <th className="px-4 py-2 text-left font-semibold">Role</th>
                          <th className="px-4 py-2 text-left font-semibold">Department</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkPreviewData.map((row: any, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2">{row.email}</td>
                            <td className="px-4 py-2">{row.role}</td>
                            <td className="px-4 py-2">{row.department || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setBulkPreviewData([]); setBulkImportErrors([]); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold">
                      Back
                    </button>
                    <button onClick={confirmBulkUserImport} disabled={isBulkImporting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold disabled:opacity-50">
                      {isBulkImporting ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : ''}
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View All Activities Modal */}
      {showAllActivitiesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">All Activities</h2>
              <button
                onClick={() => setShowAllActivitiesModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {allActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">No activities recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(90vh-200px)] overflow-y-auto">
                  {allActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                      <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatActivityMessage(activity)}
                            </p>
                            {activity.user && (
                              <p className="text-xs text-slate-500 mt-1">
                                By {activity.user.name}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 whitespace-nowrap">
                            {getTimeAgo(activity.created_at)}
                          </p>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-slate-600 mt-2">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allActivities.length > 0 && totalActivityCount > allActivities.length && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={async () => {
                      const newPageNumber = activityPageNumber - 1;
                      if (newPageNumber >= 0) {
                        setActivityPageNumber(newPageNumber);
                        const { activities } = await getAllActivities(collegeId, 20, newPageNumber);
                        setAllActivities(activities);
                      }
                    }}
                    disabled={activityPageNumber === 0}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    Previous
                  </button>
                  <p className="text-xs text-slate-500">
                    Showing {(activityPageNumber * 20) + 1} - {Math.min((activityPageNumber + 1) * 20, totalActivityCount)} of {totalActivityCount}
                  </p>
                  <button
                    onClick={async () => {
                      const newPageNumber = activityPageNumber + 1;
                      if ((newPageNumber * 20) < totalActivityCount) {
                        setActivityPageNumber(newPageNumber);
                        const { activities } = await getAllActivities(collegeId, 20, newPageNumber);
                        setAllActivities(activities);
                      }
                    }}
                    disabled={(activityPageNumber + 1) * 20 >= totalActivityCount}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Detail Modal */}
      {showDepartmentDetailModal && selectedDepartmentDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
            {/* Header with Gradient */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Department Details</h3>
                    <p className="text-indigo-100 text-sm">Comprehensive overview and statistics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDepartmentDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="p-6 lg:p-8 space-y-8">
                {/* Department Info Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Information Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Department Information</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department Name</p>
                        <p className="text-lg font-bold text-slate-900">{selectedDepartmentDetail.name}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department Code</p>
                        <p className="text-lg font-bold text-slate-900 font-mono">{selectedDepartmentDetail.code}</p>
                      </div>
                    </div>
                  </div>

                  {/* Head of Department Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <UserCog className="w-5 h-5 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Head of Department</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Name</p>
                        <p className="text-lg font-bold text-slate-900">
                          {selectedDepartmentDetail.hod_profile?.name || (
                            <span className="text-slate-400 italic">Not assigned</span>
                          )}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                        <p className="text-lg font-bold text-slate-900">
                          {selectedDepartmentDetail.hod_profile?.email || (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics Section */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Department Statistics</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Students Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{departmentStats.students}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-blue-900">Total Students</p>
                      <p className="text-xs text-blue-600 mt-1">Enrolled in department</p>
                    </div>

                    {/* Faculty Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <UserCog className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">{departmentStats.faculty}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-purple-900">Faculty Members</p>
                      <p className="text-xs text-purple-600 mt-1">Teaching staff</p>
                    </div>

                    {/* Student-Faculty Ratio */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">
                            {departmentStats.faculty > 0 ? (departmentStats.students / departmentStats.faculty).toFixed(1) : '0'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-900">Student-Faculty Ratio</p>
                      <p className="text-xs text-emerald-600 mt-1">Students per faculty</p>
                    </div>

                    {/* Department Status */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          {selectedDepartmentDetail.head_faculty_id ? (
                            <CheckCircle className="w-5 h-5 text-amber-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-600">
                            {selectedDepartmentDetail.head_faculty_id ? 'Active' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-amber-900">Department Status</p>
                      <p className="text-xs text-amber-600 mt-1">
                        {selectedDepartmentDetail.head_faculty_id ? 'HOD assigned' : 'HOD needed'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        setSelectedDepartment(selectedDepartmentDetail);
                        setShowHODModal(true);
                        setShowDepartmentDetailModal(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <UserCog className="w-5 h-5" />
                      {selectedDepartmentDetail.head_faculty_id ? 'Change HOD' : 'Assign HOD'}
                    </button>
                    <button
                      onClick={() => setShowDepartmentDetailModal(false)}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold border border-slate-300 shadow-sm hover:shadow-md"
                    >
                      <X className="w-5 h-5" />
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {showMarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedMark ? 'Edit Marks' : 'Add Student Marks'}
              </h3>
              <button
                onClick={() => {
                  setShowMarksModal(false);
                  setSelectedMark(null);
                  setMarksFormData({
                    student_id: '',
                    subject_id: '',
                    score: '',
                    max_score: '100',
                    type: 'FINAL'
                  });
                  setMarksSuccessMsg('');
                  setMarksErrorMsg('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {marksSuccessMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">{marksSuccessMsg}</p>
              </div>
            )}

            {marksErrorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{marksErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitMarksForm} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Student *</label>
                  <select
                    required
                    value={marksFormData.student_id}
                    onChange={(e) => setMarksFormData({ ...marksFormData, student_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="">Select Student</option>
                    {users.filter(u => u.role === UserRole.STUDENT).map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.student_id || student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Subject *</label>
                  <select
                    required
                    value={marksFormData.subject_id}
                    onChange={(e) => setMarksFormData({ ...marksFormData, subject_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.courses?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Score Obtained *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={marksFormData.max_score}
                    step="0.01"
                    value={marksFormData.score}
                    onChange={(e) => setMarksFormData({ ...marksFormData, score: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="85.5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Maximum Score</label>
                  <input
                    type="number"
                    min="1"
                    value={marksFormData.max_score}
                    onChange={(e) => setMarksFormData({ ...marksFormData, max_score: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Assessment Type *</label>
                  <select
                    required
                    value={marksFormData.type}
                    onChange={(e) => setMarksFormData({ ...marksFormData, type: e.target.value as 'ASSIGNMENT' | 'MIDTERM' | 'FINAL' })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="FINAL">Final Exam</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Calculated Grade</label>
                  <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-medium">
                    {marksFormData.score && marksFormData.max_score
                      ? calculateGrade(parseFloat(marksFormData.score), parseInt(marksFormData.max_score))
                      : 'Enter score to calculate grade'
                    }
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarksModal(false);
                    setSelectedMark(null);
                    setMarksFormData({
                      student_id: '',
                      subject_id: '',
                      score: '',
                      max_score: '100',
                      type: 'FINAL'
                    });
                    setMarksSuccessMsg('');
                    setMarksErrorMsg('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarksSubmitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isMarksSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      {selectedMark ? 'Update Marks' : 'Add Marks'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setSelectedAnnouncement(null);
                  setAnnouncementFormData({
                    title: '',
                    content: '',
                    priority: 'NORMAL',
                    target_audience: 'ALL',
                    is_active: true,
                    expires_at: ''
                  });
                  setAnnouncementSuccessMsg('');
                  setAnnouncementErrorMsg('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {announcementSuccessMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">{announcementSuccessMsg}</p>
              </div>
            )}

            {announcementErrorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{announcementErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitAnnouncementForm} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  type="text"
                  required
                  value={announcementFormData.title}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Announcement title"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Content *</label>
                <textarea
                  required
                  rows={4}
                  value={announcementFormData.content}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, content: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Announcement content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Priority</label>
                  <select
                    value={announcementFormData.priority}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Target Audience</label>
                  <select
                    value={announcementFormData.target_audience}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, target_audience: e.target.value as 'ALL' | 'STUDENTS' | 'FACULTY' | 'HOD' | 'ADMIN' })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="ALL">All Users</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="FACULTY">Faculty Only</option>
                    <option value="HOD">HOD Only</option>
                    <option value="ADMIN">Admins Only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Expiration Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={announcementFormData.expires_at}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, expires_at: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Status</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcementFormData.is_active}
                        onChange={(e) => setAnnouncementFormData({ ...announcementFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setSelectedAnnouncement(null);
                    setAnnouncementFormData({
                      title: '',
                      content: '',
                      priority: 'NORMAL',
                      target_audience: 'ALL',
                      is_active: true,
                      expires_at: ''
                    });
                    setAnnouncementSuccessMsg('');
                    setAnnouncementErrorMsg('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAnnouncementSubmitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnnouncementSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4" />
                      {selectedAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcasting Modal */}
      {showBroadcastingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-600" />
                Institutional Broadcasting
              </h2>
              <button
                onClick={() => {
                  setShowBroadcastingModal(false);
                  setBroadcastingFormData({
                    title: '',
                    content: '',
                    priority: 'HIGH',
                    broadcast_channels: [],
                    scheduled_date: '',
                    is_immediate: true
                  });
                  setBroadcastingSuccessMsg('');
                  setBroadcastingErrorMsg('');
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {broadcastingSuccessMsg && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-700">{broadcastingSuccessMsg}</p>
              </div>
            )}

            {broadcastingErrorMsg && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm font-semibold text-rose-700">{broadcastingErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitBroadcastingForm} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Broadcast Title *</label>
                <input
                  type="text"
                  required
                  value={broadcastingFormData.title}
                  onChange={(e) => setBroadcastingFormData({ ...broadcastingFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Broadcast title"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Broadcast Content *</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastingFormData.content}
                  onChange={(e) => setBroadcastingFormData({ ...broadcastingFormData, content: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Broadcast content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Priority</label>
                  <select
                    value={broadcastingFormData.priority}
                    onChange={(e) => setBroadcastingFormData({ ...broadcastingFormData, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Broadcast Type</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="broadcast_type"
                        checked={broadcastingFormData.is_immediate}
                        onChange={() => setBroadcastingFormData({ ...broadcastingFormData, is_immediate: true })}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">Send Immediately</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="broadcast_type"
                        checked={!broadcastingFormData.is_immediate}
                        onChange={() => setBroadcastingFormData({ ...broadcastingFormData, is_immediate: false })}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">Schedule</span>
                    </label>
                  </div>
                </div>

                {!broadcastingFormData.is_immediate && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700">Scheduled Date & Time *</label>
                    <input
                      type="datetime-local"
                      required={!broadcastingFormData.is_immediate}
                      value={broadcastingFormData.scheduled_date}
                      onChange={(e) => setBroadcastingFormData({ ...broadcastingFormData, scheduled_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Broadcast Channels *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'email', label: 'Email', icon: '📧' },
                    { id: 'sms', label: 'SMS', icon: '📱' },
                    { id: 'push', label: 'Push Notification', icon: '🔔' },
                    { id: 'portal', label: 'College Portal', icon: '🏛️' },
                    { id: 'social', label: 'Social Media', icon: '📢' },
                    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' }
                  ].map((channel) => (
                    <label key={channel.id} className="flex items-center gap-2 p-3 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={broadcastingFormData.broadcast_channels.includes(channel.id)}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...broadcastingFormData.broadcast_channels, channel.id]
                            : broadcastingFormData.broadcast_channels.filter(c => c !== channel.id);
                          setBroadcastingFormData({ ...broadcastingFormData, broadcast_channels: channels });
                        }}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{channel.icon} {channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBroadcastingModal(false);
                    setBroadcastingFormData({
                      title: '',
                      content: '',
                      priority: 'HIGH',
                      broadcast_channels: [],
                      scheduled_date: '',
                      is_immediate: true
                    });
                    setBroadcastingSuccessMsg('');
                    setBroadcastingErrorMsg('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcastingSubmitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBroadcastingSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      {broadcastingFormData.is_immediate ? 'Send Broadcast' : 'Schedule Broadcast'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
