import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Upload, X, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TimetableEntry {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  semester?: number;
  department?: string;
  facultyId?: string;
  year?: number;
  section?: string;
}

interface TimetableProps {
  user: User;
  setActiveTab?: (tab: string) => void;
}

const Timetable: React.FC<TimetableProps> = ({ user, setActiveTab }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const slots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM'];

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(user.year || 1);
  const [selectedSection, setSelectedSection] = useState<string>(user.section || 'A');
  const [sections, setSections] = useState<{ id: string; year: number; section: string }[]>([]);
  const [holidayMessage, setHolidayMessage] = useState<string | null>(null);
  const [assignmentCount, setAssignmentCount] = useState(0);

  const canUploadTimetable =
    user.role === UserRole.COLLEGE_ADMIN ||
    user.role === UserRole.SUPERADMIN ||
    user.role === UserRole.HOD;

  const normalizeDay = (value: string) => value.trim().toLowerCase();
  const normalizeText = (value?: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const normalizeSection = (value?: string) => String(value || '').trim().toUpperCase();

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

  const formatTime = (value: string) => {
    const normalized = normalizeTime(value);
    if (!normalized || normalized.length !== 5) return value;
    const [hourText, minuteText] = normalized.split(':');
    const hours = Number(hourText);
    const minutes = Number(minuteText);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = ((hours + 11) % 12) + 1;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTimeRange = (start: string, end: string) => {
    if (!start && !end) return '';
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const getStripDates = (date: Date) => {
    const center = new Date(date);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(center);
      d.setDate(center.getDate() - 3 + index);
      return d;
    });
  };

  const loadSections = useCallback(async () => {
    if (!isSupabaseConfigured || !user.department) {
      setSections([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('academic_sections')
        .select('id, year, section')
        .eq('college_id', user.college_id)
        .eq('department', user.department)
        .order('year', { ascending: true })
        .order('section', { ascending: true });
      if (error) throw error;
      setSections(data || []);
    } catch (err) {
      console.warn('Failed to load sections:', err);
      setSections([]);
    }
  }, [user.college_id, user.department]);

  const loadTimetable = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setTimetable([]);
      return;
    }

    try {
      setLoading(true);

      const baseSelect = `
        id,
        day_of_week,
        start_time,
        end_time,
        room_number,
        subject_id,
        subjects(id, code, name, semester, faculty_id, course_id)
      `;

      let supportsYearSection = true;
      let rows: any[] = [];

      let query = supabase
        .from('timetable')
        .select(`${baseSelect}, year, section`)
        .eq('college_id', user.college_id);

      // Apply Year/Section filters directly for faster loading and better accuracy
      const fetchYear = user.role === UserRole.STUDENT ? user.year : selectedYear;
      const fetchSection = user.role === UserRole.STUDENT ? user.section : selectedSection;

      if (fetchYear) query = query.eq('year', fetchYear);
      if (fetchSection) query = query.eq('section', normalizeSection(fetchSection));

      const { data: scopedRows, error: scopedError } = await query;

      if (scopedError) {
        const missingYearOrSection = /could not find the 'year' column|could not find the 'section' column/i.test(scopedError.message || '');
        if (!missingYearOrSection) throw scopedError;
        supportsYearSection = false;
        const { data: legacyRows, error: legacyError } = await supabase
          .from('timetable')
          .select(baseSelect)
          .eq('college_id', user.college_id);
        if (legacyError) throw legacyError;
        rows = legacyRows || [];
      } else {
        rows = scopedRows || [];
      }
      const courseIds = Array.from(
        new Set(
          rows
            .map((row: any) => row.subjects?.course_id)
            .filter((courseId: string | undefined): courseId is string => Boolean(courseId))
        )
      );

      let courseDeptMap = new Map<string, string>();
      if (courseIds.length > 0) {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, department_id')
          .in('id', courseIds);

        if (coursesError) throw coursesError;

        const departmentIds = Array.from(
          new Set(
            (coursesData || [])
              .map((course: any) => course.department_id)
              .filter((id: string | undefined): id is string => Boolean(id))
          )
        );

        const departmentsById = new Map<string, string>();
        if (departmentIds.length > 0) {
          const { data: departmentsData, error: departmentsError } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', departmentIds);
          if (departmentsError) throw departmentsError;
          (departmentsData || []).forEach((department: any) => {
            departmentsById.set(department.id, department.name || '');
          });
        }

        courseDeptMap = new Map(
          (coursesData || []).map((course: any) => [course.id, departmentsById.get(course.department_id) || ''])
        );
      }

      const mappedEntries: TimetableEntry[] = rows.map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        subjectCode: row.subjects?.code || '',
        subjectName: row.subjects?.name || '',
        dayOfWeek: row.day_of_week || '',
        startTime: row.start_time || '',
        endTime: row.end_time || '',
        roomNumber: row.room_number || '',
        semester: row.subjects?.semester || undefined,
        department: courseDeptMap.get(row.subjects?.course_id || '') || '',
        facultyId: row.subjects?.faculty_id || undefined,
        year: typeof row.year === 'number' ? row.year : undefined,
        section: row.section || undefined
      }));

      const userDepartment = normalizeText(user.department);
      const userSemester = typeof user.sem === 'number' ? user.sem : null;
      const userYear = typeof user.year === 'number' ? user.year : null;
      const userSection = normalizeSection(user.section);
      const isScopedByYearSection = supportsYearSection && rows.some((row: any) => row.year !== null || row.section !== null);

      const filtered = mappedEntries.filter((entry) => {
        if (user.role === UserRole.SUPERADMIN || user.role === UserRole.COLLEGE_ADMIN) return true;

        const entryDepartment = normalizeText(entry.department);
        // Robust matching: exact match or partial match (for "Computer Science" vs "CS")
        const departmentMatches = !userDepartment || !entryDepartment || 
                                 entryDepartment.includes(userDepartment) || 
                                 userDepartment.includes(entryDepartment);

        if (user.role === UserRole.HOD) {
          if (isScopedByYearSection) {
            const yearMatches = typeof entry.year === 'number' ? entry.year === selectedYear : true;
            const sectionMatches = !entry.section || normalizeSection(entry.section) === normalizeSection(selectedSection);
            return departmentMatches && yearMatches && sectionMatches;
          }
          return departmentMatches;
        }

        if (user.role === UserRole.FACULTY) {
          return entry.facultyId === user.id;
        }

        if (user.role === UserRole.STUDENT) {
          if (isScopedByYearSection) {
            const yearMatches = userYear ? entry.year === userYear : true;
            const sectionMatches = userSection ? normalizeSection(entry.section) === userSection : true;
            return departmentMatches && yearMatches && sectionMatches;
          }
          const semesterMatches = userSemester ? entry.semester === userSemester : true;
          const yearMatches = userYear
            ? !entry.semester || Math.max(1, Math.ceil(entry.semester / 2)) === userYear
            : true;
          return departmentMatches && semesterMatches && yearMatches;
        }

        return true;
      });

      setTimetable(filtered);
    } catch (err) {
      console.warn('Failed to load timetable:', err);
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedYear, user.college_id, user.department, user.id, user.role, user.section, user.sem, user.year]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel(`timetable-${user.college_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timetable',
          filter: `college_id=eq.${user.college_id}`
        },
        () => {
          loadTimetable();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadTimetable, user.college_id]);

  useEffect(() => {
    if (user.role === UserRole.HOD) {
      loadSections();
    }
  }, [user.role, loadSections]);

  useEffect(() => {
    const loadDayContext = async () => {
      setHolidayMessage(null);
      setAssignmentCount(0);

      if (!isSupabaseConfigured) return;

      const selectedDay = selectedDate.toISOString().split('T')[0];
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayText = nextDay.toISOString().split('T')[0];

      try {
        let announcements: any[] = [];
        let announcementQuery = supabase
          .from('announcements')
          .select('title, content, created_at, expires_at, is_active, target_audience')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(100);

        const { data: byCollegeData, error: byCollegeError } = await announcementQuery.eq('college_id', user.college_id);
        if (!byCollegeError) {
          announcements = byCollegeData || [];
        } else {
          const missingCollegeId = /could not find the 'college_id' column of 'announcements'/i.test(byCollegeError.message || '');
          if (!missingCollegeId) throw byCollegeError;
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('announcements')
            .select('title, content, created_at, expires_at, is_active, target_audience')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100);
          if (fallbackError) throw fallbackError;
          announcements = fallbackData || [];
        }

        const holidayRegex = /holiday|closed|off day|festival|vacation|no class/i;
        const audienceAllowed = new Set(['ALL', 'STUDENTS']);
        const holidayAnnouncement = announcements.find((item) => {
          const audience = String(item.target_audience || 'ALL').toUpperCase();
          if (!audienceAllowed.has(audience)) return false;
          const text = `${item.title || ''} ${item.content || ''}`;
          if (!holidayRegex.test(text)) return false;
          const createdDate = item.created_at ? String(item.created_at).slice(0, 10) : '';
          const expireDate = item.expires_at ? String(item.expires_at).slice(0, 10) : '';
          return createdDate === selectedDay || expireDate === selectedDay;
        });

        if (holidayAnnouncement) {
          setHolidayMessage(String(holidayAnnouncement.title || holidayAnnouncement.content || 'Today is a holiday'));
        }

        const { count: dueAssignments, error: assignmentError } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', user.college_id)
          .gte('due_date', selectedDay)
          .lt('due_date', nextDayText);
        if (!assignmentError) {
          setAssignmentCount(dueAssignments || 0);
        }
      } catch (err) {
        console.warn('Failed to load holiday/assignment context:', err);
      }
    };

    loadDayContext();
  }, [selectedDate, user.college_id]);

  const getScheduleForDay = (day: string) => {
    return timetable
      .filter((entry) => normalizeDay(entry.dayOfWeek) === normalizeDay(day))
      .sort((a, b) => normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime)))
      .map((entry, index) => {
        const isLab = /lab|practical|workshop/i.test(entry.subjectName || '');
        return {
          id: `${entry.id}-${index}`,
          title: entry.subjectName || 'Class Session',
          code: entry.subjectCode || 'GEN',
          timeRange: formatTimeRange(entry.startTime, entry.endTime),
          room: entry.roomNumber || 'Room TBA',
          label: isLab ? 'Lab' : 'Class'
        };
      });
  };

  const getSubjectForSlot = (day: string, slot: string) => {
    const normalizedSlot = normalizeTime(slot);
    return (
      timetable.find(
        (entry) => normalizeDay(entry.dayOfWeek) === normalizeDay(day) && normalizeTime(entry.startTime) === normalizedSlot
      ) || null
    );
  };

  const selectedDayLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const selectedMonthYear = selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const selectedDateValue = selectedDate.toISOString().split('T')[0];
  const selectedSchedule = getScheduleForDay(selectedDayLabel);
  const weekDates = useMemo(() => getStripDates(selectedDate), [selectedDate]);
  const sectionsForYear = sections.filter((section) => section.year === selectedYear).map((section) => section.section);
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const isHoliday = Boolean(holidayMessage) || isWeekend;
  const statusHeading = isHoliday
    ? 'Today is Holiday'
    : selectedSchedule.length === 0
    ? 'No Classes Today'
    : assignmentCount > 0
    ? 'Classes and Assignments'
    : 'Classes Scheduled';
  const statusText = isHoliday
    ? holidayMessage || 'Enjoy your day. No regular classes scheduled.'
    : selectedSchedule.length === 0
    ? assignmentCount > 0
      ? `${assignmentCount} assignment(s) due today.`
      : 'No timetable entries for today.'
    : assignmentCount > 0
    ? `${selectedSchedule.length} class(es) and ${assignmentCount} assignment(s) due today.`
    : `${selectedSchedule.length} class(es) scheduled today.`;

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

  const handleTimetableUpload = async () => {
    if (!uploadFile) {
      setUploadMessage('Please select a file');
      return;
    }

    if (!isSupabaseConfigured) {
      setUploadMessage('Supabase not configured');
      return;
    }

    try {
      setUploading(true);
      setUploadMessage('Processing upload...');

      const fileBuffer = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        setUploadMessage('File is empty');
        return;
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, code, name')
        .eq('college_id', user.college_id);
      if (subjectsError) throw subjectsError;

      const subjectByCode = new Map<string, string>();
      const subjectByName = new Map<string, string>();
      (subjectsData || []).forEach((subject: any) => {
        subjectByCode.set(String(subject.code || '').trim().toLowerCase(), subject.id);
        subjectByName.set(String(subject.name || '').trim().toLowerCase(), subject.id);
      });

      const timetableData = rows
        .map((row: any) => {
          const explicitSubjectId = String(row['Subject ID'] || row['subject_id'] || '').trim();
          const subjectCode = String(row['Subject Code'] || row['subject_code'] || '').trim().toLowerCase();
          const subjectName = String(row['Subject Name'] || row['subject_name'] || '').trim().toLowerCase();
          const subjectId = explicitSubjectId || subjectByCode.get(subjectCode) || subjectByName.get(subjectName) || '';
          const uploadYear = selectedYear || user.year || 1;
          const uploadSection = normalizeSection(selectedSection || user.section || 'A');

          return {
            college_id: user.college_id,
            day_of_week: parseDayForDb(String(row['Day'] || row['day_of_week'] || '')),
            start_time: normalizeTime(String(row['Start Time'] || row['start_time'] || '')),
            end_time: normalizeTime(String(row['End Time'] || row['end_time'] || '')),
            room_number: String(row['Room'] || row['room_number'] || row['Room Number'] || '').trim(),
            subject_id: subjectId,
            year: uploadYear,
            section: uploadSection
          };
        })
        .filter((item) => item.day_of_week && item.start_time && item.end_time && item.room_number && item.subject_id);

      if (timetableData.length === 0) {
        setUploadMessage('No valid rows found. Check Day, Time and Subject columns.');
        return;
      }

      let usedScopedDelete = true;
      const uploadYear = selectedYear || user.year || 1;
      const uploadSection = normalizeSection(selectedSection || user.section || 'A');
      const { error: scopedDeleteError } = await supabase
        .from('timetable')
        .delete()
        .eq('college_id', user.college_id)
        .eq('year', uploadYear)
        .eq('section', uploadSection);

      if (scopedDeleteError) {
        const missingYearOrSection = /could not find the 'year' column|could not find the 'section' column/i.test(scopedDeleteError.message || '');
        if (!missingYearOrSection) throw scopedDeleteError;
        usedScopedDelete = false;
      }

      let { error: insertError } = await supabase.from('timetable').insert(timetableData);
      if (insertError) {
        const missingYearOrSection = /could not find the 'year' column|could not find the 'section' column/i.test(insertError.message || '');
        if (!missingYearOrSection) throw insertError;
        usedScopedDelete = false;
        const legacyRows = timetableData.map(({ year, section, ...rest }) => rest);
        const result = await supabase.from('timetable').insert(legacyRows);
        insertError = result.error;
        if (insertError) throw insertError;
      }

      setUploadMessage(
        usedScopedDelete
          ? `Uploaded ${timetableData.length} timetable entries for Year ${uploadYear} Section ${uploadSection}.`
          : `Uploaded ${timetableData.length} timetable entries. Please add timetable year/section columns to avoid section mixing.`
      );
      setUploadFile(null);
      await loadTimetable();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadMessage('');
      }, 1200);
    } catch (err: any) {
      setUploadMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTimetableSampleExcel = () => {
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

  return (
    <div className="relative min-h-screen overflow-hidden -m-6 p-4 sm:p-6 bg-gradient-to-br from-sky-100 via-indigo-100 to-blue-100">
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-indigo-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-blue-300/35 blur-3xl" />

      <div className=" z-10 space-y-5">
      

      {user.role === UserRole.HOD && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Batch</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[1, 2, 3, 4].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                  selectedYear === year ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Year {year}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(sectionsForYear.length ? sectionsForYear : [selectedSection]).map((section) => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                  selectedSection === section ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Section {section}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[2rem] overflow-hidden border border-indigo-100 shadow-sm bg-gradient-to-b from-indigo-50 to-white">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white p-4 sm:p-6">
          <div className="mb-3">
            <h2 className="text-2xl font-bold">Schedule</h2>
            <p className="text-indigo-100 text-sm">Auto-refreshes when timetable is updated.</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200 font-semibold">Week View</p>
              <p className="text-lg font-bold">{selectedDayLabel}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDatePicker((prev) => !prev)}
                className="text-sm font-semibold flex items-center gap-2 opacity-90 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition"
              >
                <Calendar className="w-4 h-4" />
                {selectedMonthYear}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 z-20 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 min-w-[220px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choose Date</p>
                  <input
                    type="date"
                    value={selectedDateValue}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setSelectedDate(new Date(`${e.target.value}T00:00:00`));
                      setShowDatePicker(false);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 text-sm"
                  />
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setShowDatePicker(false);
                    }}
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                  >
                    Go to Today
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
              {weekDates.map((dayDate) => {
                const label = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dateNumber = dayDate.getDate();
                const isSelected = dayDate.toDateString() === selectedDate.toDateString();
                const weekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                return (
                  <button
                    key={dayDate.toISOString()}
                    onClick={() => setSelectedDate(dayDate)}
                    className={`min-w-[58px] rounded-2xl py-2.5 px-2 transition ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-lg shadow-indigo-900/20'
                        : weekend
                        ? 'bg-amber-100/20 text-amber-100 hover:bg-amber-100/30 border border-amber-100/20'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-tight">{label}</div>
                    <div className="text-2xl leading-none mt-1 font-bold">{dateNumber}</div>
                  </button>
                );
              })}
              </div>
            </div>

            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-100/70 p-4 sm:p-6 min-h-[220px] space-y-4">
          <div className={`rounded-3xl border p-4 sm:p-5 flex items-center justify-between gap-3 ${
            isHoliday ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
          }`}>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Today Status</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">{statusHeading}</h3>
              <p className="text-sm text-slate-600 mt-1">{statusText}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isHoliday ? 'bg-amber-100' : 'bg-indigo-100'
            }`}>
              {isHoliday ? (
                <Calendar className="w-6 h-6 text-amber-700" />
              ) : assignmentCount > 0 ? (
                <BookOpen className="w-6 h-6 text-indigo-700" />
              ) : (
                <Clock className="w-6 h-6 text-indigo-700" />
              )}
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm">Loading schedule...</p>
          ) : selectedSchedule.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 bg-white/70">
              No class cards for {selectedDayLabel}. Check assignments or announcements.
            </div>
          ) : (
            <div className="space-y-4">
              {selectedSchedule.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timeRange}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.room}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-black px-3 py-2 rounded-xl uppercase tracking-widest ${
                      item.label === 'Lab' ? 'bg-violet-500 text-white' : 'bg-sky-500 text-white'
                    }`}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden xl:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 border-b border-slate-100 w-24"></th>
                {days.map((day) => (
                  <th key={day} className="p-6 border-b border-slate-100 text-sm font-bold text-slate-500 text-center uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot}>
                  <td className="p-6 border-b border-r border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter text-right align-top">
                    {slot}
                  </td>
                  {days.map((day) => {
                    const subject = getSubjectForSlot(day, slot);
                    return (
                      <td key={`${day}-${slot}`} className="p-3 border-b border-r border-slate-50 align-top group min-h-[120px]">
                        {subject ? (
                          <div className="p-4 rounded-2xl h-full border transition-all cursor-pointer hover:shadow-lg bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                              {subject.subjectCode || 'UNKNOWN'}
                            </p>
                            <h4 className="text-xs font-bold text-slate-800 leading-tight">{subject.subjectName || 'No Subject'}</h4>
                            <div className="mt-4 flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-slate-400">
                                <MapPin className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{subject.roomNumber || 'Room TBA'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{formatTime(subject.startTime)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Break</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canUploadTimetable && (
        <div className="flex justify-end gap-2">
          <button
            onClick={downloadTimetableSampleExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-sm font-bold">Download Sample Excel</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-bold">Upload Timetable</span>
          </button>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Upload Timetable</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadMessage('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={downloadTimetableSampleExcel}
                className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition font-semibold flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Sample Excel
              </button>

              <div
                className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-300 transition cursor-pointer"
                onClick={() => document.getElementById('timetable-file-input')?.click()}
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700">Click to select Excel file</p>
                <p className="text-sm text-slate-500">Template supports multiple classes per day (slot-wise rows)</p>
                {uploadFile && <p className="text-sm text-green-600 mt-2 font-semibold">{uploadFile.name}</p>}
              </div>

              <input
                id="timetable-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              {uploadMessage && (
                <div
                  className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                    uploadMessage.startsWith('Uploaded')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : uploadMessage.toLowerCase().includes('failed')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {uploadMessage.startsWith('Uploaded') && <CheckCircle className="w-4 h-4" />}
                  {uploadMessage.toLowerCase().includes('failed') && <AlertCircle className="w-4 h-4" />}
                  {uploadMessage}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-2">Excel columns</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>One row = one class period</li>
                  <li>Use same Day on multiple rows for many classes</li>
                  <li>Required: Day, Start Time, End Time, Room</li>
                  <li>Provide any one: Subject ID or Subject Code or Subject Name</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTimetableUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Timetable;
