
-- SQL Schema for EduPulse College Management System (Multi-Tenant SaaS)
-- To be executed in the Supabase SQL Editor

-- 1. Custom Types/Enums
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'COLLEGE_ADMIN', 'HOD', 'FACULTY', 'STUDENT');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE');
CREATE TYPE grade_type AS ENUM ('ASSIGNMENT', 'MIDTERM', 'FINAL');
CREATE TYPE fee_status AS ENUM ('PAID', 'PENDING', 'OVERDUE');
CREATE TYPE notification_type AS ENUM ('INFO', 'WARNING', 'SUCCESS');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- 0. Colleges Table (Multi-Tenant Root)
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g., CLGE001
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  established_year INTEGER,
  principal_name TEXT,
  logo_url TEXT,
  website TEXT,
  subscription_status subscription_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles Table (Extends Supabase Auth) - Multi-Tenant
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  department TEXT,
  avatar_url TEXT,
  student_id TEXT, -- e.g., CSE-2024-001
  faculty_id TEXT, -- e.g., FAC-101
  student_phone TEXT,
  parent_phone TEXT,
  sem INTEGER,
  blood_group TEXT,
  batch TEXT,
  program TEXT,
  date_of_birth DATE,
  year INTEGER,
  section TEXT,
  proctor_or_mentor TEXT,
  gender TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, email),
  UNIQUE(college_id, faculty_id)
);

-- 3. Departments Table (Multi-Tenant)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  head_faculty_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- 4. Courses/Programs Table (Multi-Tenant)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- e.g., BSCSE
  name TEXT NOT NULL, -- e.g., Bachelor of Science in Computer Science
  duration_years INTEGER DEFAULT 4,
  credits_required INTEGER DEFAULT 120,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- 5. Subjects Table (Multi-Tenant)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID REFERENCES profiles(id),
  code TEXT NOT NULL, -- e.g., CS101
  name TEXT NOT NULL, -- e.g., Introduction to Programming
  semester INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  max_students INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- 6. Timetable (Multi-Tenant)
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL, -- MONDAY, TUESDAY, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6A. Academic Sections (Multi-Tenant)
CREATE TABLE academic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  section TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, department, year, section)
);

-- 6B. Timetable Uploads (Multi-Tenant)
CREATE TABLE timetable_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  section TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Attendance (Multi-Tenant)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'PRESENT',
  marked_by UUID REFERENCES profiles(id),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, student_id, subject_id, date)
);

-- 8. Assignments (Multi-Tenant)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score INTEGER DEFAULT 100,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Marks/Grades (Multi-Tenant)
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  max_score INTEGER DEFAULT 100,
  type grade_type NOT NULL,
  evaluated_by UUID REFERENCES profiles(id),
  evaluation_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, student_id, subject_id, type)
);

-- 10. Fees (Multi-Tenant)
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status fee_status DEFAULT 'PENDING',
  payment_date TIMESTAMPTZ,
  transaction_id TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Subscriptions (Multi-Tenant - for SaaS billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID UNIQUE REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL, -- STARTER, PROFESSIONAL, ENTERPRISE
  max_users INTEGER NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  status subscription_status DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notifications (Multi-Tenant)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Activity Logs (Multi-Tenant - for tracking all user actions)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'CREATE_DEPARTMENT', 'CREATE_COURSE', 'ASSIGN_HOD', 'BULK_IMPORT_USERS', etc.
  entity_type TEXT NOT NULL, -- 'USER', 'DEPARTMENT', 'COURSE', 'HOD_ASSIGNMENT', etc.
  entity_id UUID, -- ID of the created/updated entity
  entity_name TEXT, -- Human readable name (user email, department name, etc.)
  description TEXT, -- Detailed description of the action
  metadata JSONB, -- Additional data as needed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- INDEXES (Performance)
-- ===========================
CREATE INDEX idx_profiles_college_id ON profiles(college_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_departments_college_id ON departments(college_id);
CREATE INDEX idx_courses_college_id ON courses(college_id);
CREATE INDEX idx_subjects_college_id ON subjects(college_id);
CREATE INDEX idx_subjects_course_id ON subjects(course_id);
CREATE INDEX idx_subjects_faculty_id ON subjects(faculty_id);
CREATE INDEX idx_timetable_college_id ON timetable(college_id);
CREATE INDEX idx_timetable_subject_id ON timetable(subject_id);
CREATE INDEX idx_sections_college_id ON academic_sections(college_id);
CREATE INDEX idx_sections_department ON academic_sections(department);
CREATE INDEX idx_sections_year_section ON academic_sections(year, section);
CREATE INDEX idx_timetable_uploads_college_id ON timetable_uploads(college_id);
CREATE INDEX idx_timetable_uploads_department ON timetable_uploads(department);
CREATE INDEX idx_timetable_uploads_year_section ON timetable_uploads(year, section);
CREATE INDEX idx_attendance_college_id ON attendance(college_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_subject_id ON attendance(subject_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_assignments_college_id ON assignments(college_id);
CREATE INDEX idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX idx_marks_college_id ON marks(college_id);
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_marks_subject_id ON marks(subject_id);
CREATE INDEX idx_fees_college_id ON fees(college_id);
CREATE INDEX idx_fees_student_id ON fees(student_id);
CREATE INDEX idx_notifications_college_id ON notifications(college_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_activities_college_id ON activities(college_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_activities_entity_type ON activities(entity_type);

-- ===========================
-- ROW LEVEL SECURITY (RLS)
-- ===========================
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
