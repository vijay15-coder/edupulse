
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, Notification, AttendanceRecord, Grade, Subject, FeeRecord, College, Assignment } from './types';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import HODDashboard from './pages/HODDashboard';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import StudentAttendance from './pages/StudentAttendance';
import Marks from './pages/Marks';
import Timetable from './pages/Timetable';
import CourseCatalog from './pages/CourseCatalog';
import Settings from './pages/Settings';
import Announcements from './pages/Announcements';
import MyGrades from './pages/MyGrades';
import Users from './pages/Users';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses.tsx';
import StudentCareerTrack from './pages/StudentCareerTrack';
import AdminResults from './pages/AdminResults';
import StudentResults from './pages/StudentResults';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import SuperAdminSettings from './pages/SuperAdmin/Settings';
import AIChatbot from './components/AIChatbot';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  Plus, Search, Filter, Edit2, Trash2,
  Download, BookOpen, X, Loader2, CheckCircle, AlertCircle, AlertTriangle, CreditCard
} from 'lucide-react';

const generateUUID = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isHOD, setIsHOD] = useState(false);
  const [newCollegeData, setNewCollegeData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    established_year: '',
    principal_name: '',
    logo_url: '',
    website: '',
    cgpa_format: '10_POINT',
    attendance_format: 'PERCENTAGE',
    semester_system: 'SEMESTER',
    min_attendance_percentage: '75',
    fee_reminder_days_before_due: '7',
    parent_notifications_enabled: true,
    default_admin_access_modules: 'users, courses, attendance, marks, fees, timetable',
    onboarding_required_documents: 'College Registration Certificate, Accreditation Proof',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  // Auto-navigate HOD to HOD Dashboard after login
  useEffect(() => {
    if ((currentUser?.role === UserRole.HOD || isHOD) && currentUser?.role !== UserRole.STUDENT) {
      // Only navigate if not already on hod-dashboard
      if (activeTab !== 'hod-dashboard') {
        setActiveTab('hod-dashboard');
      }
    }
  }, [currentUser?.role, isHOD, currentUser?.id]); // Trigger on role or HOD status change

  // Auto-navigate SuperAdmin to SuperAdmin Dashboard after login
  useEffect(() => {
    if (currentUser?.role === UserRole.SUPERADMIN) {
      // Only navigate if not already on superadmin-dashboard
      if (activeTab !== 'superadmin-dashboard') {
        setActiveTab('superadmin-dashboard');
      }
    }
  }, [currentUser?.role, currentUser?.id]); // Trigger on role change

  useEffect(() => {
    const initApp = async () => {
      try {
        // Migrate old college_id format from localStorage
        let userDataToLoad = localStorage.getItem('user');
        if (userDataToLoad) {
          const user = JSON.parse(userDataToLoad);
          // Check if college_id is in old format (not a valid UUID)
          if (user.college_id && !user.college_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Remove the old user to force re-login with new UUID
            localStorage.removeItem('user');
            localStorage.removeItem('enrolledSubjects');
            localStorage.removeItem('token');
            localStorage.removeItem('session');
            userDataToLoad = null;
          }
        }

        if (isSupabaseConfigured) {
          const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
          if (profiles && !pError) {
            setAllUsers(profiles.map(p => ({
              id: p.id,
              college_id: p.college_id,
              name: p.name,
              email: p.email,
              role: p.role as UserRole,
              department: p.department,
              avatar: p.avatar_url,
              student_id: p.student_id,
              faculty_id: p.faculty_id,
              student_phone: p.student_phone,
              parent_phone: p.parent_phone,
              sem: p.sem,
              blood_group: p.blood_group,
              batch: p.batch,
              program: p.program,
              date_of_birth: p.date_of_birth,
              year: p.year,
              section: p.section,
              proctor_or_mentor: p.proctor_or_mentor,
              gender: p.gender,
              phone: p.phone,
              address: p.address,
              created_at: p.created_at,
              updated_at: p.updated_at,
            })));
          }

          const { data: dbNotifs, error: nError } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

          if (dbNotifs && !nError) {
            setNotifications(dbNotifs.map(n => ({
              id: n.id,
              college_id: n.college_id,
              user_id: n.user_id,
              title: n.title,
              message: n.message,
              type: n.type as any,
              is_read: n.is_read,
              created_at: n.created_at,
            })));
          }

          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('*');

          if (coursesData && !coursesError) {
            setAllCourses(coursesData as Course[]);
          }

          const { data: subjectsData, error: subjectsError } = await supabase
            .from('subjects')
            .select('*');

          if (subjectsData && !subjectsError) {
            setSubjects(subjectsData as Subject[]);
          }

          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('assignments')
            .select('*');

          if (assignmentsData && !assignmentsError) {
            setAssignments(assignmentsData as Assignment[]);
          }

          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('*');

          if (attendanceData && !attendanceError) {
            setAttendance(attendanceData as AttendanceRecord[]);
          }

          const { data: marksData, error: marksError } = await supabase
            .from('marks')
            .select('*');

          if (marksData && !marksError) {
            setGrades(marksData as Grade[]);
          }

          // Fetch colleges for SuperAdmin
          let { data: dbColleges, error: cError } = await supabase
            .from('colleges')
            .select('*')
            .order('created_at', { ascending: false });

          // If no colleges exist, create a default one
          if ((!dbColleges || dbColleges.length === 0) && !cError) {
            const { data: newCollege, error: createError } = await supabase
              .from('colleges')
              .insert([{
                name: 'Demo College',
                code: 'DEMO',
                subscription_status: 'ACTIVE',
              }])
              .select()
              .single();

            if (newCollege && !createError) {
              dbColleges = [newCollege];
            }
          }

          if (dbColleges && !cError) {
            setColleges(dbColleges);
          }

          // Fetch subscriptions for SuperAdmin
          const { data: dbSubscriptions, error: sError } = await supabase
            .from('subscriptions')
            .select('*, colleges(name, code)')
            .order('created_at', { ascending: false });

          if (dbSubscriptions && !sError) {
            setSubscriptions(dbSubscriptions);
          }
        }

        // Resolve user session from Supabase when configured; do not trust local role data.
        if (isSupabaseConfigured) {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUserId = sessionData?.session?.user?.id;

          if (sessionUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUserId)
              .maybeSingle();

            if (profile) {
              const mappedUser: User = {
                id: profile.id,
                college_id: profile.college_id,
                name: profile.name,
                email: profile.email,
                role: profile.role as UserRole,
                department: profile.department,
                avatar: profile.avatar_url,
                student_id: profile.student_id,
                faculty_id: profile.faculty_id,
                student_phone: profile.student_phone,
                parent_phone: profile.parent_phone,
                sem: profile.sem,
                blood_group: profile.blood_group,
                batch: profile.batch,
                program: profile.program,
                date_of_birth: profile.date_of_birth,
                year: profile.year,
                section: profile.section,
                proctor_or_mentor: profile.proctor_or_mentor,
                gender: profile.gender,
                phone: profile.phone,
                address: profile.address,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              };

              setCurrentUser(mappedUser);
              localStorage.setItem('user', JSON.stringify(mappedUser));

              if (mappedUser.role === UserRole.HOD) {
                setIsHOD(true);
              } else if (mappedUser.role === UserRole.FACULTY) {
                const { data: deptData } = await supabase
                  .from('departments')
                  .select('id')
                  .eq('head_faculty_id', mappedUser.id)
                  .eq('college_id', mappedUser.college_id)
                  .maybeSingle();
                setIsHOD(!!deptData);
              } else {
                setIsHOD(false);
              }
            } else {
              localStorage.removeItem('user');
            }
          } else {
            localStorage.removeItem('user');
          }
        } else {
          // Demo/offline mode: restore local user only when Supabase is not configured.
          const userToLoad = localStorage.getItem('user');
          if (userToLoad) {
            const user = JSON.parse(userToLoad);
            setCurrentUser(user);
          }
        }
      } catch (err) {
        console.warn('Silent init failure (likely config):', err);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;

    const loadScopedAttendance = async () => {
      try {
        let query = supabase.from('attendance').select('*');

        if (currentUser.role === UserRole.STUDENT) {
          query = query.eq('student_id', currentUser.id);
        } else if (currentUser.role === UserRole.FACULTY) {
          const { data: facultySubjects, error: facultySubjectsError } = await supabase
            .from('subjects')
            .select('id')
            .eq('college_id', currentUser.college_id)
            .eq('faculty_id', currentUser.id);
          if (facultySubjectsError) throw facultySubjectsError;

          const subjectIds = (facultySubjects || []).map((s: any) => s.id).filter(Boolean);
          if (subjectIds.length === 0) {
            setAttendance([]);
            return;
          }
          query = query.in('subject_id', subjectIds);
        } else if (currentUser.role !== UserRole.SUPERADMIN) {
          query = query.eq('college_id', currentUser.college_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAttendance((data || []) as AttendanceRecord[]);
      } catch (err) {
        console.warn('Failed to load scoped attendance:', err);
      }
    };

    const realtimeConfig: { event: '*'; schema: 'public'; table: 'attendance'; filter?: string } = {
      event: '*',
      schema: 'public',
      table: 'attendance',
    };

    if (currentUser.role === UserRole.STUDENT) {
      realtimeConfig.filter = `student_id=eq.${currentUser.id}`;
    } else if (currentUser.role === UserRole.FACULTY) {
      realtimeConfig.filter = `college_id=eq.${currentUser.college_id}`;
    } else if (currentUser.role !== UserRole.SUPERADMIN) {
      realtimeConfig.filter = `college_id=eq.${currentUser.college_id}`;
    }

    loadScopedAttendance();

    const channel = supabase
      .channel(`attendance-live-${currentUser.id}`)
      .on('postgres_changes', realtimeConfig, () => {
        void loadScopedAttendance();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.college_id]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleLocalGradesSave = (newGrades: Grade[]) => {
    if (newGrades.length === 0) return;
    setGrades(prev => [...newGrades, ...prev]);
  };

  const handleViewCollege = (college: College) => {
    setSelectedCollege(college);
    setShowCollegeModal(true);
  };

  const handleToggleCollegeSuspension = async (college: College) => {
    if (!isSupabaseConfigured) {
      showToast("Database not configured. Cannot update college status.", "error");
      return;
    }

    const newStatus = college.subscription_status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    try {
      const { error } = await supabase
        .from('colleges')
        .update({ subscription_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', college.id);

      if (error) throw error;

      // Update local state
      setColleges(colleges.map(c =>
        c.id === college.id
          ? { ...c, subscription_status: newStatus, updated_at: new Date().toISOString() }
          : c
      ));

      showToast(
        `College ${newStatus === 'SUSPENDED' ? 'suspended' : 'activated'} successfully!`,
        'success'
      );
    } catch (err: any) {
      showToast("Failed to update college status: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleAddCollege = async () => {
    if (!isSupabaseConfigured) {
      showToast("Database not configured. Cannot add college.", "error");
      return;
    }

    // Validate required fields
    if (!newCollegeData.name || !newCollegeData.code || !newCollegeData.admin_name || !newCollegeData.admin_email || !newCollegeData.admin_password) {
      showToast("Please fill in all required fields (College Name, Code, Admin Name, Email, and Password)", "error");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCollegeData.admin_email)) {
      showToast("Please enter a valid admin email address", "error");
      return;
    }

    // Validate college code length
    if (newCollegeData.code.length < 3) {
      showToast("College code must be at least 3 characters", "error");
      return;
    }

    // Validate password length
    if (newCollegeData.admin_password.length < 6) {
      showToast("Admin password must be at least 6 characters", "error");
      return;
    }

    try {
      // 1. Create the college
      const { data: collegeData, error: collegeError } = await supabase
        .from('colleges')
        .insert([{
          name: newCollegeData.name,
          code: newCollegeData.code.toUpperCase(),
          email: newCollegeData.email || null,
          phone: newCollegeData.phone || null,
          address: newCollegeData.address || null,
          city: newCollegeData.city || null,
          state: newCollegeData.state || null,
          country: newCollegeData.country || null,
          established_year: newCollegeData.established_year ? parseInt(newCollegeData.established_year) : null,
          principal_name: newCollegeData.principal_name || null,
          logo_url: newCollegeData.logo_url || null,
          website: newCollegeData.website || null,
          subscription_status: 'ACTIVE',
        }])
        .select()
        .single();

      if (collegeError) throw collegeError;

      let settingsMessage = '';
      try {
        const parsedModules = newCollegeData.default_admin_access_modules
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean);

        const parsedDocuments = newCollegeData.onboarding_required_documents
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);

        const semesterDurationMonths =
          newCollegeData.semester_system === 'TRIMESTER'
            ? 4
            : newCollegeData.semester_system === 'ANNUAL'
              ? 12
              : 6;

        await supabase.from('academic_settings').insert([{
          college_id: collegeData.id,
          default_grading_system: newCollegeData.cgpa_format,
          attendance_min_percentage: Number(newCollegeData.min_attendance_percentage || 75),
          academic_year_start_month: 6,
          academic_year_end_month: 5,
          semester_duration_months: semesterDurationMonths,
          attendance_lock_after_days: 7
        }]);

        await supabase.from('notification_settings').insert([{
          college_id: collegeData.id,
          email_notifications_enabled: true,
          sms_notifications_enabled: false,
          push_notifications_enabled: true,
          maintenance_announcement: '',
          global_broadcast_config: {
            enabled: false,
            channels: ['email'],
            message: ''
          }
        }]);

        await supabase.from('system_settings').insert([{
          college_id: collegeData.id,
          max_upload_size_mb: 25,
          allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'csv'],
          storage_limit_per_plan: { STARTER: 20, PROFESSIONAL: 100, ENTERPRISE: 500 },
          backup_frequency: 'daily',
          audit_logs_enabled: true,
          log_retention_days: 180,
          failed_login_alert_threshold: 5,
          suspicious_activity_alert: true,
          performance_monitoring_enabled: true,
          maintenance_mode: false,
          maintenance_message: `Attendance format: ${newCollegeData.attendance_format}; Semester system: ${newCollegeData.semester_system}; Required docs: ${parsedDocuments.join(', ') || 'None'}; Fee reminder days: ${newCollegeData.fee_reminder_days_before_due}`
        }]);

        if (parsedModules.length > 0) {
          const permissionRows = parsedModules.map((moduleName) => ({
            college_id: collegeData.id,
            role_name: 'COLLEGE_ADMIN',
            module_name: moduleName,
            can_create: true,
            can_read: true,
            can_update: true,
            can_delete: true,
            permissions: {
              source: 'college_onboarding',
              attendance_format: newCollegeData.attendance_format,
              cgpa_format: newCollegeData.cgpa_format,
              parent_notifications_enabled: newCollegeData.parent_notifications_enabled
            }
          }));

          await supabase.from('role_permissions').upsert(permissionRows, {
            onConflict: 'college_id,role_name,module_name'
          });
        }
      } catch (settingsErr) {
        console.warn('College defaults setup skipped:', settingsErr);
        settingsMessage = ' (College created, but some default settings could not be auto-applied.)';
      }

      let adminCreated = false;
      let adminMessage = '';

      // 2. Try to create the college admin user using Supabase Auth
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newCollegeData.admin_email,
          password: newCollegeData.admin_password,
        });

        if (authError) {
          // Check if it's a rate limit error
          if (authError.message.includes('rate limit') || authError.message.includes('email')) {
            adminMessage = ' (Admin account creation skipped due to rate limit. Please create admin manually or try again later.)';
          } else {
            throw authError;
          }
        } else if (authData.user) {
          // 3. Create the admin profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              college_id: collegeData.id,
              name: newCollegeData.admin_name,
              email: newCollegeData.admin_email,
              role: 'COLLEGE_ADMIN',
              department: 'Administration',
            }]);

          if (profileError) {
            adminMessage = ' (College created but admin profile failed. Please create admin manually.)';
          } else {
            adminCreated = true;
          }
        }
      } catch (authErr: any) {
        // Log but don't fail the college creation
        console.warn('Admin creation failed:', authErr);
        adminMessage = ' (College created but admin account creation failed. Please create admin manually.)';
      }

      // Update local state
      setColleges([collegeData, ...colleges]);

      // Reset form and close modal
      setNewCollegeData({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        established_year: '',
        principal_name: '',
        logo_url: '',
        website: '',
        cgpa_format: '10_POINT',
        attendance_format: 'PERCENTAGE',
        semester_system: 'SEMESTER',
        min_attendance_percentage: '75',
        fee_reminder_days_before_due: '7',
        parent_notifications_enabled: true,
        default_admin_access_modules: 'users, courses, attendance, marks, fees, timetable',
        onboarding_required_documents: 'College Registration Certificate, Accreditation Proof',
        admin_name: '',
        admin_email: '',
        admin_password: '',
      });
      setShowAddCollegeModal(false);

      if (adminCreated) {
        showToast("College and admin account created successfully!" + settingsMessage, "success");
      } else {
        showToast("College created successfully!" + adminMessage + settingsMessage, "info");
      }
    } catch (err: any) {
      showToast("Failed to create college: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleSendAnnouncement = async (newNotification: Notification) => {
    if (!isSupabaseConfigured) {
      const localNotification: Notification = {
        ...newNotification,
        college_id: currentUser?.college_id || newNotification.college_id,
        user_id: null,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [localNotification, ...prev]);
      showToast("Announcement saved locally.", "info");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          college_id: currentUser?.college_id,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          user_id: null,
          is_read: false
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        const saved: Notification = {
          id: data[0].id,
          college_id: data[0].college_id,
          title: data[0].title,
          message: data[0].message,
          type: data[0].type,
          is_read: data[0].is_read,
          created_at: data[0].created_at,
        };
        setNotifications(prev => [saved, ...prev]);
        showToast("Announcement broadcasted successfully!");
      }
    } catch (err: any) {
      showToast("Cloud sync error: " + (err.message || "Invalid Key"), "error");
    }
  };

  // Fix: Implemented handleDeleteAnnouncement to allow deletion of announcements from both local state and database
  const handleDeleteAnnouncement = async (id: string) => {
    if (!isSupabaseConfigured) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast("Announcement deleted locally.", "info");
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast("Announcement deleted successfully!");
    } catch (err: any) {
      showToast("Cloud sync error: " + (err.message || "Invalid Key"), "error");
    }
  };

  const handleAuth = async (email: string, password: string, role: UserRole, isSignUp: boolean, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      throw new Error('Email and password are required.');
    }

    if (isSupabaseConfigured) {
      if (isSignUp) {
        throw new Error('Self signup is disabled. Contact your college admin to create your account.');
      }

      const signInResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInResult.error) {
        throw new Error('Invalid email or password.');
      }

      const authUserId = signInResult.data?.user?.id;
      if (!authUserId) {
        throw new Error('Authentication succeeded but no user was returned.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (!profile) {
        throw new Error('Account is not provisioned. Contact your college admin.');
      }

      const virtualUser: User = {
        id: profile.id,
        college_id: profile.college_id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        department: profile.department,
        avatar: profile.avatar_url,
        student_id: profile.student_id,
        faculty_id: profile.faculty_id,
        student_phone: profile.student_phone,
        parent_phone: profile.parent_phone,
        sem: profile.sem,
        blood_group: profile.blood_group,
        batch: profile.batch,
        program: profile.program,
        date_of_birth: profile.date_of_birth,
        year: profile.year,
        section: profile.section,
        proctor_or_mentor: profile.proctor_or_mentor,
        gender: profile.gender,
        phone: profile.phone,
        address: profile.address,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };

      setCurrentUser(virtualUser);
      localStorage.setItem('user', JSON.stringify(virtualUser));

      if (virtualUser.role === UserRole.HOD) {
        setIsHOD(true);
      } else if (virtualUser.role === UserRole.FACULTY) {
        try {
          const { data: deptData } = await supabase
            .from('departments')
            .select('id')
            .eq('head_faculty_id', virtualUser.id)
            .eq('college_id', virtualUser.college_id)
            .maybeSingle();

          setIsHOD(!!deptData);
        } catch {
          setIsHOD(false);
        }
      } else {
        setIsHOD(false);
      }

      return;
    }

    const virtualUser: User = {
      id: generateUUID(),
      college_id: '00000000-0000-0000-0000-000000000001',
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role,
      avatar: `https://picsum.photos/seed/${normalizedEmail}/200`,
      student_id: role === UserRole.STUDENT ? `STU-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      department: 'Computer Science',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCurrentUser(virtualUser);
    localStorage.setItem('user', JSON.stringify(virtualUser));
    setIsHOD(virtualUser.role === UserRole.HOD);
  };

  const handleLogout = async () => {
    try {
      // Clear all localStorage data
      localStorage.removeItem('user');
      localStorage.removeItem('enrolledSubjects');
      localStorage.removeItem('token');
      localStorage.removeItem('session');
      localStorage.clear(); // Clear all localStorage

      // If connected to Supabase, sign out from auth
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }

      // Reset all app state
      setCurrentUser(null);
      setAllUsers([]);
      setAllCourses([]);
      setNotifications([]);
      setAttendance([]);
      setGrades([]);
      setActiveTab('dashboard');
      setToast(null);
      setIsHOD(false);
    } catch (err) {
      console.error('Logout error:', err);
      // Still allow logout even if there's an error
      setCurrentUser(null);
      setIsHOD(false);
      localStorage.clear();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-4">
        <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
        <h1 className="text-2xl font-bold tracking-tight">EduPulse</h1>
      </div>
    );
  }

  if (!currentUser) {
    if (showLogin) {
      return (
        <div className="relative">
          <button
            onClick={() => setShowLogin(false)}
            className="fixed top-8 left-8 z-[60] p-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-2 group"
          >

            <span className="font-bold">Back to Home</span>
          </button>
          <Login onAuth={handleAuth} />
        </div>
      );
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  return (
    <div className="min-h-screen bg-mesh flex">
      {toast && (
        <div className={`fixed top-28 right-8 z-[60] glass-panel shadow-glass border border-white/60 rounded-[2rem] p-5 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500`}>
          <div className={`p-3 rounded-2xl shadow-sm ${toast.type === 'error' ? 'bg-rose-100 text-rose-600' : toast.type === 'info' ? 'bg-brand-100 text-brand-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {toast.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 tracking-tight">{toast.type === 'error' ? 'Sync Error' : 'Success'}</p>
            <p className="text-xs text-slate-500 font-semibold max-w-xs">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-2 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* College Details Modal */}
      {showCollegeModal && selectedCollege && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowCollegeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">College Details</h2>
              <button
                onClick={() => setShowCollegeModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">College Name</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">College Code</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.code}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">City</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">State</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.state || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Country</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.country || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Established Year</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.established_year || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Principal Name</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.principal_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Website</label>
                  <p className="text-slate-900 mt-1">
                    {selectedCollege.website ? (
                      <a href={selectedCollege.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedCollege.website}
                      </a>
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Subscription Status</label>
                  <p className="mt-1">
                    <span className={`text-xs px-3 py-1 rounded font-semibold inline-block ${selectedCollege.subscription_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      selectedCollege.subscription_status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {selectedCollege.subscription_status}
                    </span>
                  </p>
                </div>
              </div>
              {selectedCollege.address && (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <p className="text-slate-900 mt-1">{selectedCollege.address}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Created At</label>
                  <p className="text-slate-900 mt-1">{new Date(selectedCollege.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Updated At</label>
                  <p className="text-slate-900 mt-1">{new Date(selectedCollege.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowCollegeModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleToggleCollegeSuspension(selectedCollege);
                  setShowCollegeModal(false);
                }}
                className={`px-4 py-2 rounded-lg hover:opacity-80 transition font-medium ${selectedCollege.subscription_status === 'SUSPENDED'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
                  }`}
              >
                {selectedCollege.subscription_status === 'SUSPENDED' ? 'Activate College' : 'Suspend College'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add College Modal */}
      {showAddCollegeModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowAddCollegeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Add New College</h2>
              <button
                onClick={() => setShowAddCollegeModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* College Information Section */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">College Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      College Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.name}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, name: e.target.value })}
                      placeholder="Enter college name"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      College Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.code}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., CLGE001"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCollegeData.email}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, email: e.target.value })}
                      placeholder="college@example.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newCollegeData.phone}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.address}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, address: e.target.value })}
                      placeholder="Street address"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.city}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.state}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.country}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, country: e.target.value })}
                      placeholder="Country"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Established Year
                    </label>
                    <input
                      type="number"
                      value={newCollegeData.established_year}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, established_year: e.target.value })}
                      placeholder="e.g., 1990"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Principal Name
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.principal_name}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, principal_name: e.target.value })}
                      placeholder="Principal's name"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      College Logo URL
                    </label>
                    <input
                      type="url"
                      value={newCollegeData.logo_url}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={newCollegeData.website}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, website: e.target.value })}
                      placeholder="https://www.example.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding, Access & Academic Defaults</h3>
                <p className="text-sm text-slate-600 mb-4">Set important defaults that will be auto-applied when this college is created.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">CGPA Format</label>
                    <select
                      value={newCollegeData.cgpa_format}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, cgpa_format: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="10_POINT">10 Point CGPA</option>
                      <option value="4_POINT">4 Point CGPA</option>
                      <option value="PERCENTAGE">Percentage Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Attendance Format</label>
                    <select
                      value={newCollegeData.attendance_format}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, attendance_format: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="CREDIT_BASED">Credit Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Semester System</label>
                    <select
                      value={newCollegeData.semester_system}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, semester_system: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SEMESTER">Semester</option>
                      <option value="TRIMESTER">Trimester</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Minimum Attendance (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newCollegeData.min_attendance_percentage}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, min_attendance_percentage: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Fee Reminder Days (before due date)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCollegeData.fee_reminder_days_before_due}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, fee_reminder_days_before_due: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={newCollegeData.parent_notifications_enabled}
                        onChange={(e) => setNewCollegeData({ ...newCollegeData, parent_notifications_enabled: e.target.checked })}
                      />
                      Enable parent notifications by default
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">College Admin Access Modules (comma separated)</label>
                    <input
                      type="text"
                      value={newCollegeData.default_admin_access_modules}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, default_admin_access_modules: e.target.value })}
                      placeholder="users, courses, attendance, marks, fees"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Required Onboarding Documents (comma separated)</label>
                    <input
                      type="text"
                      value={newCollegeData.onboarding_required_documents}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, onboarding_required_documents: e.target.value })}
                      placeholder="College Registration Certificate, Accreditation Proof"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Account Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Admin Account Details</h3>
                <p className="text-sm text-slate-600 mb-4">Create an admin account for this college with full access</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Admin Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCollegeData.admin_name}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, admin_name: e.target.value })}
                      placeholder="Admin's full name"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Admin Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCollegeData.admin_email}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, admin_email: e.target.value })}
                      placeholder="admin@example.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newCollegeData.admin_password}
                      onChange={(e) => setNewCollegeData({ ...newCollegeData, admin_password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">The admin will be able to log in with this email and password</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddCollegeModal(false);
                  setNewCollegeData({
                    name: '',
                    code: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    state: '',
                    country: '',
                    established_year: '',
                    principal_name: '',
                    logo_url: '',
                    website: '',
                    cgpa_format: '10_POINT',
                    attendance_format: 'PERCENTAGE',
                    semester_system: 'SEMESTER',
                    min_attendance_percentage: '75',
                    fee_reminder_days_before_due: '7',
                    parent_notifications_enabled: true,
                    default_admin_access_modules: 'users, courses, attendance, marks, fees, timetable',
                    onboarding_required_documents: 'College Registration Certificate, Accreditation Proof',
                    admin_name: '',
                    admin_email: '',
                    admin_password: '',
                  });
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCollege}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Create College & Admin
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        role={currentUser.role}
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isHOD={isHOD}
      />

      <main className="flex-1 w-full min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8">
        <DashboardHeader
          user={currentUser}
          notificationsCount={notifications.filter(n => n.college_id === currentUser.college_id && !n.is_read && (n.user_id === currentUser.id || !n.user_id)).length}
          onMenuToggle={() => setIsSidebarOpen(true)}
          onNotificationsClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
        />

        {/* Notifications Panel */}
        {showNotificationsPanel && (
          <div className="fixed top-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <button
                onClick={() => setShowNotificationsPanel(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.filter(n => n.college_id === currentUser.college_id && (n.user_id === currentUser?.id || !n.user_id)).length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.filter(n => n.college_id === currentUser.college_id && (n.user_id === currentUser?.id || !n.user_id)).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition cursor-pointer ${!notification.is_read ? 'bg-indigo-50' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notification.type === 'SUCCESS' ? 'bg-green-500' :
                          notification.type === 'WARNING' ? 'bg-yellow-500' :
                            notification.type === 'INFO' ? 'bg-blue-500' :
                              'bg-slate-400'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 break-words">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {showNotificationsPanel && (
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setShowNotificationsPanel(false)}
          />
        )}

        <div className="mt-8 w-full max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (currentUser?.role === UserRole.HOD || (currentUser?.role === UserRole.FACULTY && isHOD)) && (
            <HODDashboard currentUser={currentUser} showToast={showToast} setParentTab={setActiveTab} />
          )}
          {activeTab === 'dashboard' && currentUser?.role !== UserRole.HOD && !isHOD && (
            <Dashboard
              user={currentUser}
              courses={allCourses}
              users={allUsers}
              subjects={subjects}
              assignments={assignments}
              notifications={notifications}
              attendance={attendance}
              grades={grades}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'admin-dashboard' && (currentUser?.role === UserRole.COLLEGE_ADMIN || currentUser?.role === UserRole.SUPERADMIN) && (
            <AdminDashboard currentUser={currentUser} showToast={showToast} collegeId={currentUser.college_id} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'hod-dashboard' && (currentUser?.role === UserRole.HOD || (currentUser?.role === UserRole.FACULTY && isHOD)) && (
            <HODDashboard currentUser={currentUser} showToast={showToast} setParentTab={setActiveTab} />
          )}
          {activeTab === 'superadmin-dashboard' && currentUser?.role === UserRole.SUPERADMIN && (
            <SuperAdminDashboard currentUser={currentUser} showToast={showToast} setActiveTab={setActiveTab} />
          )}
          {/* SuperAdmin Tabs */}
          {activeTab === 'colleges' && currentUser?.role === UserRole.SUPERADMIN && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Colleges Management</h1>
                  <p className="text-slate-600 mt-1">Manage all colleges in the system</p>
                </div>
                <button
                  onClick={() => setShowAddCollegeModal(true)}
                  className="flex items-center gap-0 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add College
                </button>
              </div>
              {colleges.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No colleges found. Add colleges to your database to manage them here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colleges.map((college) => (
                    <div key={college.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900 flex-1">{college.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${college.subscription_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          college.subscription_status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {college.subscription_status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">Code: {college.code}</p>
                      {college.city && college.state && (
                        <p className="text-sm text-slate-600 mb-1">{college.city}, {college.state}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleViewCollege(college)}
                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleCollegeSuspension(college)}
                          className={`text-xs px-3 py-1 rounded hover:opacity-80 transition ${college.subscription_status === 'SUSPENDED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {college.subscription_status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'superadmin-users' && currentUser?.role === UserRole.SUPERADMIN && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 min-h-[400px]">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">System Users</h1>
              <p className="text-slate-600 mb-6">Manage superadmins and system-wide users</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">No users found in the database.</td>
                      </tr>
                    ) : (
                      allUsers.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{u.name}</td>
                          <td className="py-3 px-4 text-slate-600">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              u.role === UserRole.SUPERADMIN ? 'bg-purple-100 text-purple-700' :
                              u.role === UserRole.COLLEGE_ADMIN ? 'bg-blue-100 text-blue-700' :
                              u.role === UserRole.HOD ? 'bg-indigo-100 text-indigo-700' :
                              u.role === UserRole.FACULTY ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>{u.role}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{u.department || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'subscriptions' && currentUser?.role === UserRole.SUPERADMIN && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
                  <p className="text-slate-600 mt-1">Monitor and manage college subscriptions</p>
                </div>
              </div>

              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No subscriptions yet. Subscriptions will appear here once colleges are set up.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-slate-900 text-lg">
                              {sub.colleges?.name || 'Unknown College'}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                              sub.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {sub.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="font-semibold">{sub.plan}</span> Plan •
                            Max {sub.max_users} Users •
                            Code: {sub.colleges?.code || 'N/A'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sub.features && sub.features.length > 0 ? (
                              sub.features.map((feature: string, idx: number) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                                  {feature}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No features listed</span>
                            )}
                          </div>
                          {sub.expires_at && (
                            <p className="text-xs text-slate-500 mt-2">
                              Expires: {new Date(sub.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => showToast('Subscription management coming soon!', 'info')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-slate-900">{subscriptions.length}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-700 mb-1">Active</p>
                  <p className="text-2xl font-bold text-green-900">
                    {subscriptions.filter(s => s.status === 'ACTIVE').length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-700 mb-1">Inactive/Suspended</p>
                  <p className="text-2xl font-bold text-red-900">
                    {subscriptions.filter(s => s.status !== 'ACTIVE').length}
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && currentUser?.role === UserRole.SUPERADMIN && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Platform Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Total Colleges</span>
                    <span className="font-bold text-slate-900">{colleges.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Total Users</span>
                    <span className="font-bold text-slate-900">{allUsers.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Active Subscriptions</span>
                    <span className="font-bold text-slate-900">{subscriptions.filter((s: any) => s.status === 'ACTIVE').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Students</span>
                    <span className="font-bold text-green-600">{allUsers.filter(u => u.role === UserRole.STUDENT).length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Faculty</span>
                    <span className="font-bold text-blue-600">{allUsers.filter(u => u.role === UserRole.FACULTY || u.role === UserRole.HOD).length.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Database Status</span>
                    <span className={`px-3 py-1 rounded text-xs font-semibold ${isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{isSupabaseConfigured ? 'Connected' : 'Local Mode'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Active Colleges</span>
                    <span className="font-bold text-slate-900">{colleges.filter(c => c.subscription_status === 'ACTIVE').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Suspended Colleges</span>
                    <span className="font-bold text-red-600">{colleges.filter(c => c.subscription_status === 'SUSPENDED').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Admin Users</span>
                    <span className="font-bold text-slate-900">{allUsers.filter(u => u.role === UserRole.COLLEGE_ADMIN || u.role === UserRole.SUPERADMIN).length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'superadmin-settings' && currentUser?.role === UserRole.SUPERADMIN && (
            <SuperAdminSettings currentUser={currentUser} showToast={showToast} />
          )}
          {activeTab === 'announcements' && (
            <Announcements
              onSend={handleSendAnnouncement}
              onDelete={handleDeleteAnnouncement}
              history={notifications.filter(n => n.college_id === currentUser.college_id && !n.user_id)}
              currentUserRole={currentUser.role}
            />
          )}
          {activeTab === 'users' && (
            <Users
              users={currentUser?.role === UserRole.SUPERADMIN ? allUsers : allUsers.filter(u => u.college_id === currentUser?.college_id)}
              collegeId={currentUser.college_id}
              currentUserRole={currentUser.role}
              isHODManager={isHOD}
              onAdd={(user) => {
                // Add or update user
                setAllUsers((prev) => {
                  const existingIndex = prev.findIndex(u => u.id === user.id);
                  if (existingIndex >= 0) {
                    const updatedUsers = [...prev];
                    updatedUsers[existingIndex] = user;
                    return updatedUsers;
                  }
                  return [...prev, user];
                });
                showToast("User saved successfully");
              }}
              onDelete={(userId) => {
                setAllUsers((prev) => prev.filter(u => u.id !== userId));
                showToast("User removed successfully");
              }}
            />
          )}
          {activeTab === 'courses' && (
            <Courses
              courses={allCourses}
              role={currentUser.role}
              user={currentUser}
              onAdd={(course) => {
                // Add or update course
                const existingIndex = allCourses.findIndex(c => c.id === course.id);
                if (existingIndex >= 0) {
                  const updatedCourses = [...allCourses];
                  updatedCourses[existingIndex] = course;
                  setAllCourses(updatedCourses);
                  showToast("Course updated successfully");
                } else {
                  setAllCourses([...allCourses, course]);
                  showToast("Course added successfully");
                }
              }}
              onDelete={(courseId) => {
                setAllCourses(allCourses.filter(c => c.id !== courseId));
                showToast("Course removed successfully");
              }}
            />
          )}
          {activeTab === 'my-courses' && currentUser?.role === UserRole.FACULTY && (
            <MyCourses user={currentUser} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'attendance' && currentUser.role === UserRole.STUDENT && (
            <StudentAttendance user={currentUser} />
          )}
          {activeTab === 'attendance' && currentUser.role !== UserRole.STUDENT && (
            <Attendance user={currentUser} onAction={() => showToast("Attendance updated.")} />
          )}
          {activeTab === 'marks' && <Marks user={currentUser} onAction={() => showToast("Marks recorded.")} onSave={handleLocalGradesSave} setActiveTab={setActiveTab} />}
          {activeTab === 'results' && (currentUser.role === UserRole.STUDENT ? (
            <StudentResults user={currentUser} setActiveTab={setActiveTab} />
          ) : (currentUser.role === UserRole.COLLEGE_ADMIN || currentUser.role === UserRole.SUPERADMIN) ? (
            <AdminResults user={currentUser} showToast={showToast} setActiveTab={setActiveTab} />
          ) : null)}
          {activeTab === 'grades' && (currentUser.role === UserRole.STUDENT ? <StudentResults user={currentUser} setActiveTab={setActiveTab} /> : null)}
          {activeTab === 'timetable' && <Timetable user={currentUser} setActiveTab={setActiveTab} />}
          {activeTab === 'fees' && <Fees user={currentUser} setActiveTab={setActiveTab} />}
          {activeTab === 'student-internships' && currentUser?.role === UserRole.STUDENT && (
            <StudentCareerTrack user={currentUser} track="student-internships" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'student-placement-preparation' && currentUser?.role === UserRole.STUDENT && (
            <StudentCareerTrack user={currentUser} track="student-placement-preparation" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'student-government-exams' && currentUser?.role === UserRole.STUDENT && (
            <StudentCareerTrack user={currentUser} track="student-government-exams" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'student-target-attendance' && currentUser?.role === UserRole.STUDENT && (
            <StudentCareerTrack user={currentUser} track="student-target-attendance" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'student-target-cgpa' && currentUser?.role === UserRole.STUDENT && (
            <StudentCareerTrack user={currentUser} track="student-target-cgpa" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'settings' && currentUser?.role !== UserRole.SUPERADMIN && (
            <Settings
              user={currentUser}
              setActiveTab={setActiveTab}
              onProfileUpdate={(updatedFields) => {
                // Sync profile changes back to currentUser state
                const updated = { ...currentUser, ...updatedFields };
                setCurrentUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
                showToast('Profile synced successfully');
              }}
            />
          )}
        </div>
      </main>

      {!isSupabaseConfigured && (
        <div className="fixed bottom-24 left-8 z-40 hidden md:block">
          <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Running in Local Mode (Check Console for config help)
          </div>
        </div>
      )}

      <AIChatbot user={currentUser} />
    </div>
  );
};

export default App;
