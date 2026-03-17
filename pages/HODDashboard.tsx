
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Users, GraduationCap, BookOpen, TrendingUp, Filter, Search, Eye, Edit2, Trash2, Megaphone, Upload, ArrowLeft, FileSpreadsheet, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

type StudentPanelOption = 'INTERNSHIPS' | 'PLACEMENT_PREPARATION' | 'GOVERNMENT_EXAMS';

interface HODDashboardProps {
  currentUser: User;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setParentTab?: (tab: string) => void;
}

const HODDashboard: React.FC<HODDashboardProps> = ({ currentUser, showToast, setParentTab }) => {
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'FACULTY' | 'STUDENT'>('ALL');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showScheduleUploadModal, setShowScheduleUploadModal] = useState(false);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [scheduleUploading, setScheduleUploading] = useState(false);
  const [scheduleUploadMessage, setScheduleUploadMessage] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadType, setBulkUploadType] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadMessage, setBulkUploadMessage] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [sections, setSections] = useState<{ id: string; year: number; section: string }[]>([]);
  const [departmentSubjects, setDepartmentSubjects] = useState<Array<{
    id: string;
    code: string;
    name: string;
    faculty_id?: string | null;
    course_name?: string;
  }>>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedSection, setSelectedSection] = useState('A');
  const [newSectionName, setNewSectionName] = useState('');
  const [activeStudentPanel, setActiveStudentPanel] = useState<StudentPanelOption>('INTERNSHIPS');
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    message: '',
    scope: 'MY_DEPARTMENT', // MY_DEPARTMENT or ALL_DEPARTMENTS
  });
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    fetchDepartmentUsers();
  }, [currentUser.department]);

  useEffect(() => {
    if (!departmentName) return;
    loadSections();
    loadDepartmentSubjects();
    fetchDepartmentActivities();
  }, [departmentName]);

  useEffect(() => {
    // Refresh activity and online count every minute
    if (!departmentName) return;
    const interval = setInterval(() => {
      fetchDepartmentActivities();
      calculateOnlineUsers();
    }, 60000);
    return () => clearInterval(interval);
  }, [departmentName, departmentUsers]);

  const calculateOnlineUsers = async () => {
    if (!departmentName || !isSupabaseConfigured) return;
    try {
      const userIds = departmentUsers.map(u => u.id);
      if (userIds.length === 0) {
        setOnlineUsersCount(0);
        return;
      }

      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('activities')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', fifteenMinsAgo);

      if (error) throw error;
      
      const uniqueUserIds = new Set((data || []).map(a => a.user_id));
      setOnlineUsersCount(uniqueUserIds.size);
    } catch (err) {
      console.error('Error calculating online users:', err);
    }
  };

  const fetchDepartmentActivities = async () => {
    if (!departmentName || !isSupabaseConfigured) return;
    try {
      // Get IDs of all users in department
      const userIds = departmentUsers.map(u => u.id);
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          user:user_id (
            name,
            avatar_url
          )
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivities(data || []);
      calculateOnlineUsers();
    } catch (err) {
      console.error('Error fetching dept activities:', err);
    }
  };

  useEffect(() => {
    const currentYearSections = sections
      .filter(section => section.year === selectedYear)
      .map(section => section.section)
      .sort();
    if (currentYearSections.length > 0 && !currentYearSections.includes(selectedSection)) {
      setSelectedSection(currentYearSections[0]);
    }
  }, [selectedYear, sections, selectedSection]);

  const fetchDepartmentUsers = async () => {
    try {
      setLoading(true);

      // If user has HOD role, use their department directly
      const userDepartment = currentUser.role === UserRole.HOD
        ? currentUser.department
        : null;

      if (!userDepartment) {
        // For faculty with HOD status, find their assigned department
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, name, head_faculty_id')
          .eq('head_faculty_id', currentUser.id)
          .eq('college_id', currentUser.college_id)
          .single();

        if (deptError || !deptData) {
          console.warn('HOD not assigned to any department:', deptError?.message);
          showToast('You are not assigned as HOD for any department. Please contact admin.', 'error');
          setDepartmentUsers([]);
          return;
        }
      }

      const departmentName = userDepartment ||
        (await supabase
          .from('departments')
          .select('name')
          .eq('head_faculty_id', currentUser.id)
          .eq('college_id', currentUser.college_id)
          .single()).data?.name;

      if (!departmentName) {
        showToast('Department not found. Please contact admin.', 'error');
        setDepartmentUsers([]);
        return;
      }

      setDepartmentName(departmentName);

      // Fetch ONLY users from this department
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('college_id', currentUser.college_id)
        .eq('department', departmentName)
        .neq('id', currentUser.id) // Exclude self
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`Loaded ${data.length} users from ${departmentName} department`);

      setDepartmentUsers(data.map(p => ({
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
      })));
    } catch (err: any) {
      console.error('Error fetching department users:', err);
      showToast('Failed to fetch department users: ' + err.message, 'error');
      setDepartmentUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementData.title || !announcementData.message) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      showToast('Database not configured', 'error');
      return;
    }

    try {
      // Get target users based on scope
      let targetDepartment = announcementData.scope === 'MY_DEPARTMENT'
        ? currentUser.department
        : null;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          college_id: currentUser.college_id,
          title: announcementData.title,
          message: announcementData.message,
          type: 'INFO',
          user_id: null, // Broadcast to all in scope
          is_read: false,
          // Store department filter in metadata if needed
        }]);

      if (error) throw error;

      showToast(
        `Announcement sent to ${announcementData.scope === 'MY_DEPARTMENT' ? 'your department' : 'all departments'}!`,
        'success'
      );

      setAnnouncementData({ title: '', message: '', scope: 'MY_DEPARTMENT' });
      setShowAnnouncementModal(false);

    } catch (err: any) {
      showToast('Failed to send announcement: ' + err.message, 'error');
    }
  };

  const loadSections = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured. Real-time data cannot be fetched.');
    }

    try {
      const { data, error } = await supabase
        .from('academic_sections')
        .select('id, year, section')
        .eq('college_id', currentUser.college_id)
        .eq('department', departmentName)
        .order('year', { ascending: true })
        .order('section', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const seedSections = [1, 2, 3, 4].flatMap(year =>
          ['A', 'B', 'C', 'D'].map(section => ({
            college_id: currentUser.college_id,
            department: departmentName,
            year,
            section,
            created_by: currentUser.id,
          }))
        );

        const { error: seedError } = await supabase
          .from('academic_sections')
          .insert(seedSections);

        if (seedError) throw seedError;

        const { data: seeded, error: seededError } = await supabase
          .from('academic_sections')
          .select('id, year, section')
          .eq('college_id', currentUser.college_id)
          .eq('department', departmentName)
          .order('year', { ascending: true })
          .order('section', { ascending: true });

        if (seededError) throw seededError;
        setSections(seeded || []);
        if (seeded && seeded.length > 0) setSelectedSection(seeded[0].section);
        return;
      }

      setSections(data);
      const currentYearSections = data.filter(section => section.year === selectedYear);
      if (currentYearSections.length > 0) {
        setSelectedSection(currentYearSections[0].section);
      }
    } catch (err: any) {
      console.error('Error loading sections:', err);
      showToast('Failed to load sections: ' + err.message, 'error');
    }
  };

  const handleAddSection = async () => {
    const trimmed = newSectionName.trim().toUpperCase();
    if (!trimmed) {
      showToast('Please enter a section name', 'error');
      return;
    }

    if (!departmentName) {
      showToast('Department not found', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      showToast('Database is not configured', 'error');
      return;
    }

    try {
      let createdBy: string | null = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
      if (isUuid) {
        const { data: creator, error: creatorError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentUser.id)
          .single();
        if (!creatorError && creator?.id) {
          createdBy = creator.id;
        }
      }

      const { error } = await supabase
        .from('academic_sections')
        .insert({
          college_id: currentUser.college_id,
          department: departmentName,
          year: selectedYear,
          section: trimmed,
          created_by: createdBy,
        });

      if (error) throw error;

      showToast(`Section ${trimmed} added`, 'success');
      setNewSectionName('');
      setShowAddSectionModal(false);
      loadSections();
      setSelectedSection(trimmed);
    } catch (err: any) {
      showToast('Failed to add section: ' + err.message, 'error');
    }
  };

  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const formatYearLabel = (year: number) => {
    const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
    return `${year}${suffix} Year`;
  };

  const loadDepartmentSubjects = async () => {
    if (!isSupabaseConfigured || !departmentName) {
      setDepartmentSubjects([]);
      return;
    }

    try {
      setIsLoadingSubjects(true);

      const { data: departmentRow, error: departmentError } = await supabase
        .from('departments')
        .select('id')
        .eq('college_id', currentUser.college_id)
        .eq('name', departmentName)
        .single();
      if (departmentError || !departmentRow?.id) throw departmentError || new Error('Department not found');

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('college_id', currentUser.college_id)
        .eq('department_id', departmentRow.id);
      if (coursesError) throw coursesError;

      const courseIds = (coursesData || []).map((course: any) => course.id);
      const courseNameById = new Map((coursesData || []).map((course: any) => [course.id, course.name || 'Unknown Course']));

      if (courseIds.length === 0) {
        setDepartmentSubjects([]);
        return;
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, code, name, faculty_id, course_id')
        .eq('college_id', currentUser.college_id)
        .in('course_id', courseIds)
        .order('name', { ascending: true });
      if (subjectsError) throw subjectsError;

      setDepartmentSubjects(
        (subjectsData || []).map((subject: any) => ({
          id: subject.id,
          code: subject.code || '',
          name: subject.name || 'Unnamed Subject',
          faculty_id: subject.faculty_id || null,
          course_name: courseNameById.get(subject.course_id) || 'Unknown Course',
        }))
      );
    } catch (err: any) {
      console.error('Failed to load department subjects:', err);
      setDepartmentSubjects([]);
      showToast('Failed to load department subjects: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleAssignFacultyToSubject = async (subjectId: string, facultyId: string) => {
    if (!isSupabaseConfigured) {
      showToast('Database not configured', 'error');
      return;
    }

    try {
      setSavingSubjectId(subjectId);
      const value = facultyId.trim() || null;

      const { error } = await supabase
        .from('subjects')
        .update({ faculty_id: value })
        .eq('id', subjectId)
        .eq('college_id', currentUser.college_id);
      if (error) throw error;

      setDepartmentSubjects((prev) =>
        prev.map((subject) => (subject.id === subjectId ? { ...subject, faculty_id: value } : subject))
      );
      showToast('Faculty assignment updated', 'success');
    } catch (err: any) {
      showToast('Failed to assign faculty: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setSavingSubjectId(null);
    }
  };

  const downloadScheduleSampleExcel = () => {
    const slotPlan = [
      { slot: 1, start: '09:00 AM', end: '09:50 AM' },
      { slot: 2, start: '09:50 AM', end: '10:40 AM' },
      { slot: 3, start: '10:50 AM', end: '11:40 AM' },
      { slot: 4, start: '11:40 AM', end: '12:30 PM' },
      { slot: 5, start: '01:20 PM', end: '02:10 PM' },
      { slot: 6, start: '02:10 PM', end: '03:00 PM' },
      { slot: 7, start: '03:10 PM', end: '04:00 PM' }
    ];

    const sampleRows = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].flatMap((day, dayIndex) =>
      slotPlan.map((slotRow) => ({
        Day: day,
        'Period/Slot': slotRow.slot,
        'Start Time': slotRow.start,
        'End Time': slotRow.end,
        Room: `Room ${100 + dayIndex * 10 + slotRow.slot}`,
        'Subject Code': dayIndex === 0 && slotRow.slot === 1 ? 'CS101' : '',
        'Subject Name': dayIndex === 0 && slotRow.slot === 1 ? 'Introduction to Programming' : '',
        'Subject ID': '',
        Type: slotRow.slot % 3 === 0 ? 'Lab' : 'Class',
        Remarks: ''
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 30 },
      { wch: 38 },
      { wch: 10 },
      { wch: 22 }
    ];

    const instructionRows = [
      { Instruction: 'How to fill timetable template' },
      { Instruction: '1) One row = one class period. For many classes in one day, add many rows for same Day.' },
      { Instruction: '2) Required columns: Day, Start Time, End Time, Room, and any one of Subject ID / Subject Code / Subject Name.' },
      { Instruction: '3) Day values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.' },
      { Instruction: '4) Time format can be 09:00 AM or 14:00.' },
      { Instruction: '5) Keep Subject ID empty if you are using Subject Code/Subject Name.' }
    ];
    const instructionSheet = XLSX.utils.json_to_sheet(instructionRows);
    instructionSheet['!cols'] = [{ wch: 120 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');
    XLSX.writeFile(workbook, 'timetable-upload-sample.xlsx');
  };

  const normalizeTime = (value: string) => {
    if (!value) return '';
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return value.trim().toUpperCase();
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || '0', 10);
    const period = match[4]?.toUpperCase();
    if (period) {
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const parseDayForDb = (value: string) => {
    const cleaned = String(value || '').trim().toLowerCase();
    if (!cleaned) return '';
    const map: Record<string, string> = {
      mon: 'MONDAY',
      monday: 'MONDAY',
      tue: 'TUESDAY',
      tuesday: 'TUESDAY',
      wed: 'WEDNESDAY',
      wednesday: 'WEDNESDAY',
      thu: 'THURSDAY',
      thursday: 'THURSDAY',
      fri: 'FRIDAY',
      friday: 'FRIDAY',
      sat: 'SATURDAY',
      saturday: 'SATURDAY',
      sun: 'SUNDAY',
      sunday: 'SUNDAY'
    };
    return map[cleaned] || cleaned.toUpperCase();
  };

  const parsePdfTextToTable = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const headers: string[] = [];
    const data: any[][] = [];

    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const potentialHeaders = firstLine.split(/\s{2,}/).filter(h => h.trim());

      if (potentialHeaders.length > 1) {
        headers.push(...potentialHeaders);
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const rowData = line.split(/\s{2,}/).filter(d => d.trim());
            if (rowData.length >= headers.length - 1) {
              data.push(rowData);
            }
          }
        }
      } else {
        headers.push('Day', 'Time', 'Room', 'Subject');
        lines.forEach(line => {
          const rowData = line.split(/\s+/).filter(d => d.trim());
          if (rowData.length > 0) {
            data.push(rowData);
          }
        });
      }
    }
    return { headers, data };
  };

  const handleScheduleUpload = async () => {
    if (!scheduleFile) {
      setScheduleUploadMessage('Please select a file');
      return;
    }

    if (!selectedSection) {
      setScheduleUploadMessage('Please select a section');
      return;
    }

    if (!isSupabaseConfigured) {
      setScheduleUploadMessage('Supabase is not configured');
      return;
    }

    const fileExt = scheduleFile.name.split('.').pop()?.toLowerCase();
    const allowed = ['xlsx', 'xls', 'pdf'];
    if (!fileExt || !allowed.includes(fileExt)) {
      setScheduleUploadMessage('Only Excel or PDF files are allowed');
      return;
    }

    try {
      setScheduleUploading(true);
      setScheduleUploadMessage('Processing file and extracting data...');

      let rows: any[] = [];

      if (fileExt === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await scheduleFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          extractedText += pageText + '\n';
        }

        const { headers, data } = parsePdfTextToTable(extractedText);
        // Map PDF data to expected format if possible
        rows = data.map(row => {
          // Attempt to find Day in first/second column
          return {
            Day: row[0],
            'Start Time': row[1],
            'End Time': row[2],
            Room: row[3],
            'Subject Name': row[4] || row[headers.length -1]
          };
        });
      } else {
        // Excel parsing
        rows = await parseExcelRows(scheduleFile);
      }

      if (!rows || rows.length === 0) {
        setScheduleUploadMessage('No data found in file');
        return;
      }

      // Load ONLY department subjects for mapping (using existing state or fetching)
      let mappingSubjects = departmentSubjects;
      if (mappingSubjects.length === 0) {
        // Fallback fetch if state is empty
        const { data: deptRow } = await supabase
          .from('departments')
          .select('id')
          .eq('college_id', currentUser.college_id)
          .eq('name', departmentName)
          .single();
        
        if (deptRow?.id) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id')
            .eq('department_id', deptRow.id);
          
          if (coursesData && coursesData.length > 0) {
            const { data: subjs } = await supabase
              .from('subjects')
              .select('id, code, name')
              .in('course_id', coursesData.map(c => c.id));
            mappingSubjects = subjs || [];
          }
        }
      }

      const subjectByCode = new Map();
      const subjectByName = new Map();
      mappingSubjects.forEach(s => {
        subjectByCode.set(String(s.code || '').trim().toLowerCase(), s.id);
        subjectByName.set(String(s.name || '').trim().toLowerCase(), s.id);
      });

      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const timetableToInsert = rows.map((row: any) => {
        const day = parseDayForDb(row.Day || row.day || row.day_of_week);
        const startTime = normalizeTime(row['Start Time'] || row.start_time || row.time);
        const endTime = normalizeTime(row['End Time'] || row.end_time || '');
        const room = String(row.Room || row.room_number || '').trim();
        
        const subjCode = String(row['Subject Code'] || row.subject_code || '').trim().toLowerCase();
        const subjName = String(row['Subject Name'] || row.subject_name || row.subject || '').trim().toLowerCase();
        
        // Try to get ID from explicit columns, but only if they look like UUIDs
        let subjId = null;
        const rawId = String(row['Subject ID'] || row.subject_id || '').trim();
        if (rawId && isValidUUID(rawId)) {
          subjId = rawId;
        } else {
          // If no valid UUID, try mapping via code or name
          // Use the rawId itself as a code if it doesn't look like a UUID
          const potentialCode = rawId.toLowerCase() || subjCode;
          subjId = subjectByCode.get(potentialCode) || subjectByName.get(subjName);
        }

        if (!day || !startTime || !subjId) return null;

        return {
          college_id: currentUser.college_id,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime || startTime,
          room_number: room,
          subject_id: subjId,
          year: selectedYear,
          section: selectedSection
        };
      }).filter(Boolean);

      if (timetableToInsert.length === 0) {
        setScheduleUploadMessage('No valid schedule rows (check for Subject and Day columns)');
        return;
      }

      // Delete existing for this scope
      await supabase
        .from('timetable')
        .delete()
        .eq('college_id', currentUser.college_id)
        .eq('year', selectedYear)
        .eq('section', selectedSection);

      // Insert new
      const { error: insertError } = await supabase
        .from('timetable')
        .insert(timetableToInsert);

      if (insertError) throw insertError;

      setScheduleUploadMessage(`✓ Successfully imported ${timetableToInsert.length} periods`);
      showToast(`Imported ${timetableToInsert.length} periods for Year ${selectedYear} ${selectedSection}`, 'success');
      
      setTimeout(() => {
        setShowScheduleUploadModal(false);
        setScheduleFile(null);
        setScheduleUploadMessage('');
      }, 2000);

    } catch (err: any) {
      console.error('Extraction error:', err);
      setScheduleUploadMessage(`Error: ${err.message}`);
      showToast(`Failed to parse file: ${err.message}`, 'error');
    } finally {
      setScheduleUploading(false);
    }
  };

  const downloadBulkSampleExcel = (type: 'STUDENT' | 'FACULTY') => {
    const data = type === 'STUDENT'
      ? [
        {
          name: 'Student One',
          email: 'student1@college.edu',
          roll_no: 'CSE24-001',
          year: 2,
          section: 'A',
          student_phone: '9876543210',
          parent_phone: '9123456780',
          class_teacher: 'Dr. John Faculty',
          subject_teacher: 'Dr. Alice Faculty',
          department: currentUser.department || 'Computer Science',
          password: 'TempPass@123'
        },
        {
          name: 'Student Two',
          email: 'student2@college.edu',
          roll_no: 'CSE24-002',
          year: 2,
          section: 'A',
          student_phone: '9876543211',
          parent_phone: '9123456781',
          class_teacher: 'Dr. John Faculty',
          subject_teacher: 'Dr. Alice Faculty',
          department: currentUser.department || 'Computer Science',
          password: 'TempPass@123'
        }
      ]
      : [
        {
          name: 'Dr. John Faculty',
          email: 'john.faculty@college.edu',
          faculty_id: 'FAC-CSE-001',
          year: 2,
          section: 'A',
          class_teacher: 'YES',
          subject_teacher: 'Data Structures, DBMS',
          department: currentUser.department || 'Computer Science',
          password: 'TempPass@123'
        },
        {
          name: 'Dr. Alice Faculty',
          email: 'alice.faculty@college.edu',
          faculty_id: 'FAC-CSE-002',
          year: 2,
          section: 'A',
          class_teacher: 'NO',
          subject_teacher: 'Operating Systems',
          department: currentUser.department || 'Computer Science',
          password: 'TempPass@123'
        }
      ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 8 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'STUDENT' ? 'Students' : 'Faculty');
    XLSX.writeFile(workbook, type === 'STUDENT' ? 'students-bulk-sample.xlsx' : 'faculty-bulk-sample.xlsx');
  };

  const parseExcelRows = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet);
          resolve(rows as any[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleBulkUserUpload = async () => {
    if (!bulkUploadFile) {
      setBulkUploadMessage('Please select a file');
      return;
    }

    const ext = bulkUploadFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'pdf'].includes(ext)) {
      setBulkUploadMessage('Only Excel or PDF files are allowed');
      return;
    }

    if (!isSupabaseConfigured) {
      setBulkUploadMessage('Supabase is not configured');
      showToast('Supabase is not configured', 'error');
      return;
    }

    try {
      setBulkUploading(true);
      setBulkUploadMessage('Processing upload...');

      if (ext === 'pdf') {
        const safeName = sanitizeFileName(bulkUploadFile.name);
        const filePath = `${currentUser.college_id}/${departmentName || 'department'}/bulk-import/${bulkUploadType.toLowerCase()}-${Date.now()}-${safeName}`;

        const { error } = await supabase.storage
          .from('schedule-files')
          .upload(filePath, bulkUploadFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: bulkUploadFile.type || undefined
          });

        if (error) throw error;

        setBulkUploadMessage('PDF uploaded. For direct bulk creation, please use Excel template format.');
        showToast('PDF uploaded successfully. Use Excel for direct bulk creation.', 'info');
        return;
      }

      const rows = await parseExcelRows(bulkUploadFile);
      if (!rows || rows.length === 0) {
        setBulkUploadMessage('Excel file is empty');
        return;
      }

      let successCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index] as any;
        const rowNum = index + 2;

        // Add a small delay between each user to avoid Supabase Auth rate limits (429)
        await sleep(400);

        const name = String(row.name || '').trim();
        const email = String(row.email || '').trim().toLowerCase();

        if (!name || !email) {
          errors.push(`Row ${rowNum}: name and email are required`);
          continue;
        }

        const dept = String(row.department || departmentName || currentUser.department || '').trim();
        const year = Number(row.year || selectedYear || 1);
        const section = String(row.section || selectedSection || 'A').toUpperCase();
        const password = String(row.password || 'TempPass@123');

        let userId: string | null = null;
        let authResult: { data: any, error: any } = { data: { user: null }, error: null };
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          authResult = await supabase.auth.signUp({ email, password });
          if (authResult.error?.status === 429) {
            // Hit rate limit, wait longer and retry
            await sleep(2000 * (retryCount + 1));
            retryCount++;
            continue;
          }
          break;
        }

        const { data: authData, error: authError } = authResult;

        if (!authError && authData?.user?.id) {
          userId = authData.user.id;
        } else {
          // Use standard query instead of maybeSingle/single to avoid 406 error if no profile exists
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('college_id', currentUser.college_id)
            .eq('email', email);
          
          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
          }
        }

        if (!userId) {
          errors.push(`Row ${rowNum}: could not create/find auth user for ${email}`);
          continue;
        }

        const role = bulkUploadType === 'STUDENT' ? 'STUDENT' : 'FACULTY';
        const studentId = bulkUploadType === 'STUDENT'
          ? String(row.roll_no || row.student_id || '').trim() || undefined
          : undefined;
        const studentPhone = bulkUploadType === 'STUDENT'
          ? String(row.student_phone || row.student_number || row.phone || '').trim() || undefined
          : undefined;
        const parentPhone = bulkUploadType === 'STUDENT'
          ? String(row.parent_phone || row.parent_number || '').trim() || undefined
          : undefined;
        const facultyId = bulkUploadType === 'FACULTY'
          ? String(row.faculty_id || '').trim() || undefined
          : undefined;

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              college_id: currentUser.college_id,
              name,
              email,
              role,
              department: dept,
              student_id: studentId,
              faculty_id: facultyId,
              student_phone: studentPhone,
              parent_phone: parentPhone,
              year: bulkUploadType === 'STUDENT' ? year : null,
              section: bulkUploadType === 'STUDENT' ? section : null,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          errors.push(`Row ${rowNum}: ${profileError.message}`);
          continue;
        }

        await supabase
          .from('academic_sections')
          .upsert(
            {
              college_id: currentUser.college_id,
              department: dept,
              year,
              section,
              created_by: currentUser.id
            },
            { onConflict: 'college_id,department,year,section' }
          );

        successCount++;
      }

      if (errors.length > 0) {
        setBulkUploadMessage(`Imported ${successCount} records with ${errors.length} errors. First error: ${errors[0]}`);
      } else {
        setBulkUploadMessage(`Successfully imported ${successCount} ${bulkUploadType.toLowerCase()} records.`);
      }

      showToast(`Imported ${successCount} ${bulkUploadType.toLowerCase()} records`, 'success');
      fetchDepartmentUsers();
      loadSections();
    } catch (err: any) {
      setBulkUploadMessage(`Upload failed: ${err.message}`);
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const filteredUsers = departmentUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      (user.student_id && user.student_id.toLowerCase().includes(searchLower)) ||
      (user.faculty_id && user.faculty_id.toLowerCase().includes(searchLower))
    );
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const students = departmentUsers.filter(u => u.role === UserRole.STUDENT);
  const faculty = departmentUsers.filter(u => u.role === UserRole.FACULTY);
  const years = [1, 2, 3, 4];
  const sectionsForYear = sections
    .filter(section => section.year === selectedYear)
    .map(section => section.section)
    .sort();

  return (
    <div className="space-y-6 px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HOD Dashboard</h1>
          <p className="text-slate-500 text-sm">Department: {currentUser.department || 'Not Assigned'}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-indigo-900">Students Panel</h2>
              <p className="text-sm text-indigo-700">Choose a focus area for student development.</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200">
              Active: {activeStudentPanel === 'INTERNSHIPS' ? 'Internships' : activeStudentPanel === 'PLACEMENT_PREPARATION' ? 'Placement Preparation' : 'Government Exams'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveStudentPanel('INTERNSHIPS')}
              className={`p-4 rounded-xl border text-left transition ${activeStudentPanel === 'INTERNSHIPS'
                ? 'border-indigo-400 bg-white ring-2 ring-indigo-200'
                : 'border-indigo-200 bg-white/70 hover:border-indigo-300 hover:bg-white'
                }`}
            >
              <p className="font-semibold text-slate-900">Internships</p>
              <p className="text-xs text-slate-600 mt-1">Track internship opportunities and guidance.</p>
            </button>

            <button
              onClick={() => setActiveStudentPanel('PLACEMENT_PREPARATION')}
              className={`p-4 rounded-xl border text-left transition ${activeStudentPanel === 'PLACEMENT_PREPARATION'
                ? 'border-indigo-400 bg-white ring-2 ring-indigo-200'
                : 'border-indigo-200 bg-white/70 hover:border-indigo-300 hover:bg-white'
                }`}
            >
              <p className="font-semibold text-slate-900">Placement Preparation</p>
              <p className="text-xs text-slate-600 mt-1">Manage placement readiness activities.</p>
            </button>

            <button
              onClick={() => setActiveStudentPanel('GOVERNMENT_EXAMS')}
              className={`p-4 rounded-xl border text-left transition ${activeStudentPanel === 'GOVERNMENT_EXAMS'
                ? 'border-indigo-400 bg-white ring-2 ring-indigo-200'
                : 'border-indigo-200 bg-white/70 hover:border-indigo-300 hover:bg-white'
                }`}
            >
              <p className="font-semibold text-slate-900">Government Exams</p>
              <p className="text-xs text-slate-600 mt-1">Monitor plans for public sector exam prep.</p>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">{departmentUsers.length}</span>
            </div>
            <p className="text-sm text-slate-600">Total Users</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-slate-900">{students.length}</span>
            </div>
            <p className="text-sm text-slate-600">Students</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-slate-900">{onlineUsersCount}</span>
            </div>
            <p className="text-sm text-slate-600">Online Now</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="w-full flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 transition rounded-xl text-indigo-700 font-semibold"
              >
                <Megaphone className="w-5 h-5" />
                <span>Send Announcement</span>
              </button>
              <button
                onClick={() => setShowScheduleUploadModal(true)}
                className="w-full flex items-center gap-3 p-4 bg-sky-50 hover:bg-sky-100 transition rounded-xl text-sky-700 font-semibold"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Timetable</span>
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="w-full flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 transition rounded-xl text-emerald-700 font-semibold"
              >
                <Users className="w-5 h-5" />
                <span>Bulk Upload Users</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Recent Department Activity</h3>
              <button 
                onClick={fetchDepartmentActivities}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Activity"
              >
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent activity detected in this department.</p>
                </div>
              ) : (
                recentActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {activity.user?.name || 'Unknown User'}
                        <span className="font-normal text-slate-500 ml-2">
                          {activity.action.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {activity.description || `${activity.entity_type}: ${activity.entity_name}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Year & Section</h2>
              <p className="text-sm text-slate-500">Manage sections and upload timetables for each year.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadScheduleSampleExcel}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold"
              >
                Download Sample Excel
              </button>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-semibold"
              >
                Add Section
              </button>
              <button
                onClick={() => setShowScheduleUploadModal(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-semibold"
              >
                Upload Timetable
              </button>
            </div>
          </div>


          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Year</p>
              <div className="flex flex-wrap gap-2">
                {years.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${selectedYear === year
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                      }`}
                  >
                    {formatYearLabel(year)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Section</p>
                <button
                  onClick={() => setShowAddSectionModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Add Section
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionsForYear.length > 0 ? sectionsForYear.map(section => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${selectedSection === section
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-sky-200'
                      }`}
                  >
                    Section {section}
                  </button>
                )) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-400">No sections yet for this year.</p>
                    <button
                      onClick={() => setShowAddSectionModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      Add Section
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Subject Faculty Assignment</h2>
              <p className="text-sm text-slate-500">
                Assign faculty to department subjects. Faculty timetable and attendance access follows this mapping.
              </p>
            </div>
          </div>

          {isLoadingSubjects ? (
            <p className="text-sm text-slate-500">Loading subjects...</p>
          ) : departmentSubjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No subjects found in {departmentName || 'your department'}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSubjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{subject.name}</p>
                        <p className="text-xs text-slate-500">{subject.code || 'NO-CODE'}</p>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-700">{subject.course_name || '-'}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={subject.faculty_id || ''}
                            onChange={(e) => handleAssignFacultyToSubject(subject.id, e.target.value)}
                            disabled={savingSubjectId === subject.id}
                            className="min-w-[260px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                          >
                            <option value="">Unassigned</option>
                            {faculty.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.faculty_id || f.email})
                              </option>
                            ))}
                          </select>
                          {savingSubjectId === subject.id && (
                            <span className="text-xs font-medium text-indigo-600">Saving...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Department Users</h2>

            <div className="flex gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, role, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found in your department</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === UserRole.FACULTY ? 'bg-purple-100 text-purple-700' :
                          user.role === UserRole.STUDENT ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {user.student_id || user.faculty_id || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => showToast('View details coming soon', 'info')}
                            className="p-2 hover:bg-blue-100 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => showToast('Edit user coming soon', 'info')}
                            className="p-2 hover:bg-green-100 rounded-lg transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Announcement Modal */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowAnnouncementModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Send Announcement</h2>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <span className="text-2xl text-slate-400">×</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Announcement Scope <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="MY_DEPARTMENT"
                        checked={announcementData.scope === 'MY_DEPARTMENT'}
                        onChange={(e) => setAnnouncementData({ ...announcementData, scope: e.target.value })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700">My Department Only ({currentUser.department})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="ALL_DEPARTMENTS"
                        checked={announcementData.scope === 'ALL_DEPARTMENTS'}
                        onChange={(e) => setAnnouncementData({ ...announcementData, scope: e.target.value })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700">All Departments</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={announcementData.title}
                    onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                    placeholder="Enter announcement title"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={announcementData.message}
                    onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                    placeholder="Enter your message..."
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendAnnouncement}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Send Announcement
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddSectionModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowAddSectionModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Add Section</h2>
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <span className="text-2xl text-slate-400">×</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <button
                    onClick={downloadScheduleSampleExcel}
                    className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition font-semibold"
                  >
                    Download Sample Excel
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                  <div className="flex flex-wrap gap-2">
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${selectedYear === year
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                          }`}
                      >
                        {formatYearLabel(year)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Section Name</label>
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="E.g., A"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Add Section
                </button>
              </div>
            </div>
          </div>
        )}

        {showScheduleUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowScheduleUploadModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Upload Timetable</h2>
                <button
                  onClick={() => setShowScheduleUploadModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <span className="text-2xl text-slate-400">×</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                  <div className="flex flex-wrap gap-2">
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${selectedYear === year
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                          }`}
                      >
                        {formatYearLabel(year)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Section</label>
                  <div className="flex flex-wrap gap-2">
                    {sectionsForYear.length > 0 ? sectionsForYear.map(section => (
                      <button
                        key={section}
                        onClick={() => setSelectedSection(section)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${selectedSection === section
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-sky-200'
                          }`}
                      >
                        Section {section}
                      </button>
                    )) : (
                      <p className="text-sm text-slate-400">No sections yet for this year.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    File (Excel or PDF)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:font-semibold hover:file:bg-sky-700"
                  />
                </div>

                {scheduleFile && (
                  <div className="text-sm text-slate-600">Selected: {scheduleFile.name}</div>
                )}

                {scheduleUploadMessage && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${scheduleUploadMessage.includes('✓')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : scheduleUploadMessage.includes('failed') || scheduleUploadMessage.includes('Only')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                    {scheduleUploadMessage}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                  Files are saved to the "schedule-files" storage bucket under your college ID.
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowScheduleUploadModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleUpload}
                  disabled={!scheduleFile || scheduleUploading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scheduleUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowBulkUploadModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Bulk Upload Students / Faculty</h2>
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <span className="text-2xl text-slate-400">×</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Type</label>
                    <select
                      value={bulkUploadType}
                      onChange={(e) => setBulkUploadType(e.target.value as 'STUDENT' | 'FACULTY')}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="STUDENT">Students</option>
                      <option value="FACULTY">Faculty</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Year / Section</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {years.map(year => <option key={year} value={year}>{formatYearLabel(year)}</option>)}
                      </select>
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {sectionsForYear.length > 0 ? sectionsForYear.map(section => (
                          <option key={section} value={section}>Section {section}</option>
                        )) : <option value="A">Section A</option>}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadBulkSampleExcel(bulkUploadType)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition font-semibold"
                  >
                    Download Sample Excel ({bulkUploadType === 'STUDENT' ? 'Students' : 'Faculty'})
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Upload File (Excel or PDF)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-semibold hover:file:bg-emerald-700"
                  />
                </div>

                {bulkUploadFile && (
                  <div className="text-sm text-slate-600">Selected: {bulkUploadFile.name}</div>
                )}

                {bulkUploadMessage && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${bulkUploadMessage.toLowerCase().includes('success') || bulkUploadMessage.toLowerCase().includes('imported')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : bulkUploadMessage.toLowerCase().includes('failed') || bulkUploadMessage.toLowerCase().includes('only')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                    {bulkUploadMessage}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                  Excel upload directly creates/updates profiles in batch with year, roll no, section, class-teacher and subject-teacher columns from template.
                  PDF upload is accepted and stored for reference.
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUserUpload}
                  disabled={!bulkUploadFile || bulkUploading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkUploading ? 'Uploading...' : 'Start Bulk Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HODDashboard;
