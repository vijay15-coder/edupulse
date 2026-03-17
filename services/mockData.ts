
import { User, UserRole, Course, Notification, AttendanceRecord, Grade, Subject, FeeRecord, Assignment } from '../types';

// Mock College ID
const MOCK_COLLEGE_ID = 'college-demo-001';

export const MOCK_USERS: User[] = [
  {
    id: 'u-admin-1',
    college_id: MOCK_COLLEGE_ID,
    name: 'Vijay Kumar',
    email: 'angajalavijay8560@gmail.com',
    role: UserRole.COLLEGE_ADMIN,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'u-faculty-1',
    college_id: MOCK_COLLEGE_ID,
    name: 'Dr. Sarah Wilson',
    email: 'sarah.wilson@college.edu',
    role: UserRole.FACULTY,
    department: 'Computer Science',
    faculty_id: 'FAC001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'u-student-1',
    college_id: MOCK_COLLEGE_ID,
    name: 'John Doe',
    email: 'john.doe@student.edu',
    role: UserRole.STUDENT,
    department: 'Computer Science & Engineering',
    student_id: 'CSE-2024-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c-1',
    college_id: MOCK_COLLEGE_ID,
    code: 'BSCSE',
    name: 'BS Computer Science & Engineering',
    credits_required: 120,
    created_at: new Date().toISOString(),
  }
];

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: 's-1',
    college_id: MOCK_COLLEGE_ID,
    course_id: 'c-1',
    faculty_id: 'u-faculty-1',
    code: 'CS101',
    name: 'Introduction to Web Technologies',
    semester: 1,
    credits: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 's-2',
    college_id: MOCK_COLLEGE_ID,
    course_id: 'c-1',
    faculty_id: 'u-faculty-1',
    code: 'CS202',
    name: 'Data Structures & Algorithms',
    semester: 2,
    credits: 4,
    created_at: new Date().toISOString(),
  }
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { 
    id: 'a-1', 
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1', 
    subject_id: 's-1', 
    date: '2024-03-20', 
    status: 'PRESENT',
    created_at: new Date().toISOString(),
  },
  { 
    id: 'a-2', 
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1', 
    subject_id: 's-2', 
    date: '2024-03-21', 
    status: 'LATE',
    created_at: new Date().toISOString(),
  }
];

export const MOCK_GRADES: Grade[] = [
  { 
    id: 'g-1', 
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1', 
    subject_id: 's-1', 
    score: 88, 
    type: 'ASSIGNMENT', 
    evaluation_date: '2024-03-15',
    created_at: new Date().toISOString(),
  },
  { 
    id: 'g-2', 
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1', 
    subject_id: 's-2', 
    score: 92, 
    type: 'MIDTERM', 
    evaluation_date: '2024-03-25',
    created_at: new Date().toISOString(),
  }
];

export const MOCK_FEES: FeeRecord[] = [
  {
    id: 'f-1',
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1',
    amount: 5000.00,
    status: 'PAID',
    due_date: '2024-01-15',
    payment_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-2',
    college_id: MOCK_COLLEGE_ID,
    student_id: 'u-student-1',
    amount: 5000.00,
    status: 'PENDING',
    due_date: '2024-06-15',
    created_at: new Date().toISOString(),
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'as-1',
    college_id: MOCK_COLLEGE_ID,
    subject_id: 's-1',
    title: 'React Hooks Deep Dive',
    description: 'Build a small application using useMemo and useCallback.',
    due_date: '2024-04-10T23:59:59Z',
    max_score: 100,
    created_at: new Date().toISOString(),
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    college_id: MOCK_COLLEGE_ID,
    user_id: 'u-student-1',
    title: 'New Grade Published',
    message: 'Your grade for "Introduction to Web Technologies" has been uploaded.',
    type: 'SUCCESS',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'n2',
    college_id: MOCK_COLLEGE_ID,
    title: 'Campus Maintenance',
    message: 'Global: The main library will be closed this Sunday for scheduled maintenance.',
    type: 'WARNING',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];
