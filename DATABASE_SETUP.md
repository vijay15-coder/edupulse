# Database Setup Guide for EduPulse

## 📋 Prerequisites

- Supabase project created at https://supabase.com
- Access to Supabase SQL Editor
- Understanding of PostgreSQL basics

## 🚀 Setup Steps

### Step 1: Create Types/Enums

Run this in Supabase SQL Editor:

```sql
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'COLLEGE_ADMIN', 'FACULTY', 'STUDENT');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE');
CREATE TYPE grade_type AS ENUM ('ASSIGNMENT', 'MIDTERM', 'FINAL');
CREATE TYPE fee_status AS ENUM ('PAID', 'PENDING', 'OVERDUE');
CREATE TYPE notification_type AS ENUM ('INFO', 'WARNING', 'SUCCESS');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
```

### Step 2: Create Colleges & Profiles Tables

```sql
-- Colleges Table (Multi-Tenant Root)
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
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

-- Profiles Table (Extends Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  department TEXT,
  avatar_url TEXT,
  student_id TEXT,
  faculty_id TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, email),
  UNIQUE(college_id, student_id),
  UNIQUE(college_id, faculty_id)
);
```

### Step 3: Create Academic Tables

```sql
-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  head_faculty_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- Courses/Programs
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_years INTEGER DEFAULT 4,
  credits_required INTEGER DEFAULT 120,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID REFERENCES profiles(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  semester INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  max_students INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, code)
);

-- Timetable
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 4: Create Academic Records Tables

```sql
-- Attendance
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

-- Marks/Grades
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

-- Assignments
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
```

### Step 5: Create SaaS Tables

```sql
-- Fees
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

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID UNIQUE REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,
  max_users INTEGER NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  status subscription_status DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
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
```

### Step 6: Create Indexes

```sql
-- Performance Indexes
CREATE INDEX idx_profiles_college_id ON profiles(college_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_departments_college_id ON departments(college_id);
CREATE INDEX idx_courses_college_id ON courses(college_id);
CREATE INDEX idx_subjects_college_id ON subjects(college_id);
CREATE INDEX idx_subjects_course_id ON subjects(course_id);
CREATE INDEX idx_subjects_faculty_id ON subjects(faculty_id);
CREATE INDEX idx_timetable_college_id ON timetable(college_id);
CREATE INDEX idx_timetable_subject_id ON timetable(subject_id);
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
```

### Step 7: Enable RLS

```sql
-- Enable Row Level Security
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
```

### Step 8: Create RLS Policies

See **RLS_POLICY.sql** for comprehensive policies

## ✅ Verification Checklist

After setup, verify:

```sql
-- Check all tables are created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check RLS is enabled
SELECT tablename, rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;

-- Check enums
SELECT typname FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;
```

## 🌱 Insert Initial Data

### Create a Test College

```sql
INSERT INTO colleges (name, code, email, city, country, principal_name)
VALUES (
  'Demo University',
  'DEMO-001',
  'admin@demouniversity.edu',
  'San Francisco',
  'United States',
  'Dr. Jane Smith'
)
RETURNING id;
```

### Create Test Users

```sql
-- Note: Replace 'college-id' with the actual ID from above

INSERT INTO profiles (id, college_id, name, email, role, department)
VALUES (
  gen_random_uuid(),
  'college-id',
  'Admin User',
  'admin@demo.edu',
  'COLLEGE_ADMIN',
  'Administration'
);

INSERT INTO profiles (id, college_id, name, email, role, department, faculty_id)
VALUES (
  gen_random_uuid(),
  'college-id',
  'Dr. John Teacher',
  'john@demo.edu',
  'FACULTY',
  'Computer Science',
  'FAC-001'
);

INSERT INTO profiles (id, college_id, name, email, role, department, student_id)
VALUES (
  gen_random_uuid(),
  'college-id',
  'Alice Student',
  'alice@demo.edu',
  'STUDENT',
  'Computer Science',
  'CSE-2024-001'
);
```

## 🔒 RLS Policy Activation

Copy all policies from **RLS_POLICY.sql** and run in SQL editor:

```sql
-- Complete RLS policies (see RLS_POLICY.sql)
```

## 📞 Troubleshooting

### Issue: "permission denied for schema public"
**Solution**: Check if RLS is correctly set up. Grant proper roles:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

### Issue: "No rows found" with RLS enabled
**Solution**: Verify RLS policies are created. Check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue: Foreign key constraint violated
**Solution**: Ensure parent records exist. Insert data in order:
1. colleges
2. profiles
3. departments
4. courses
5. subjects
6. Other tables

## 🎯 Next Steps

1. ✅ Run schema.sql in SQL editor
2. ✅ Run RLS_POLICY.sql in SQL editor
3. ✅ Create test data
4. ✅ Test RLS policies
5. ✅ Update .env.local with Supabase keys
6. ✅ Run `npm install`
7. ✅ Run `npm run dev`
8. ✅ Test login and features

## 📊 Database Maintenance

### Weekly Tasks
```sql
-- Analyze query performance
ANALYZE;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monthly Tasks
- Review and optimize slow queries
- Vacuum unused space: `VACUUM ANALYZE;`
- Backup database (automatic with Supabase)

---

**Last Updated**: February 18, 2026  
**Version**: 1.0.0
