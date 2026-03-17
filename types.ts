
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  HOD = 'HOD',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT'
}

// Multi-Tenant College
export interface College {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  established_year?: number;
  principal_name?: string;
  logo_url?: string;
  website?: string;
  subscription_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

// User Profile (Multi-Tenant)
export interface User {
  id: string;
  college_id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  student_id?: string;
  faculty_id?: string;
  student_phone?: string;
  parent_phone?: string;
  sem?: number;
  blood_group?: string;
  batch?: string;
  program?: string;
  date_of_birth?: string;
  year?: number;
  section?: string;
  proctor_or_mentor?: string;
  gender?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Department
export interface Department {
  id: string;
  college_id: string;
  code: string;
  name: string;
  head_faculty_id?: string;
  created_at: string;
}

// Course/Program
export interface Course {
  id: string;
  college_id: string;
  department_id?: string;
  code: string;
  name: string;
  duration_years?: number;
  credits_required?: number;
  description?: string;
  created_at: string;
}

// Subject
export interface Subject {
  id: string;
  college_id: string;
  course_id: string;
  faculty_id?: string;
  code: string;
  name: string;
  semester: number;
  credits?: number;
  max_students?: number;
  created_at: string;
}

// Timetable Entry
export interface TimetableEntry {
  id: string;
  college_id: string;
  subject_id: string;
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_time: string;
  end_time: string;
  room_number: string;
  created_at: string;
}

// Attendance Record
export interface AttendanceRecord {
  id: string;
  college_id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  marked_by?: string;
  remarks?: string;
  created_at: string;
}

// Assignment
export interface Assignment {
  id: string;
  college_id: string;
  subject_id: string;
  title: string;
  description?: string;
  due_date: string;
  max_score?: number;
  created_by?: string;
  created_at: string;
}

// Grade/Mark
export interface Grade {
  id: string;
  college_id: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score?: number;
  type: 'ASSIGNMENT' | 'MIDTERM' | 'FINAL';
  evaluated_by?: string;
  evaluation_date: string;
  created_at: string;
}

// Fee Record
export interface FeeRecord {
  id: string;
  college_id: string;
  student_id: string;
  amount: number;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  payment_date?: string;
  transaction_id?: string;
  remarks?: string;
  created_at: string;
}

// Subscription (for SaaS)
export interface Subscription {
  id: string;
  college_id: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  max_users: number;
  features?: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  started_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Notification
export interface Notification {
  id: string;
  college_id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  is_read: boolean;
  created_at: string;
}

// Semester Result (one row per student per semester)
export interface SemesterResult {
  id: string;
  college_id: string;
  student_id?: string;
  student_roll: string;
  year: number;
  semester: number;
  academic_year: string;
  sgpa: number;
  cgpa: number;
  total_subjects: number;
  passed_subjects: number;
  failed_subjects: number;
  overall_status: 'PASS' | 'FAIL';
  pdf_url?: string;
  upload_id?: string;
  created_at: string;
}

// Result Subject (one row per subject per result)
export interface ResultSubject {
  id: string;
  result_id: string;
  subject_name: string;
  subject_code?: string;
  grade: string;
  status: 'PASS' | 'FAIL';
  credits?: number;
  created_at: string;
}

// Result Upload (tracking admin PDF uploads)
export interface ResultUpload {
  id: string;
  college_id: string;
  uploaded_by: string;
  academic_year: string;
  year: number;
  semester: number;
  file_name: string;
  file_url?: string;
  students_processed: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

