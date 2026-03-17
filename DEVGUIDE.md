# EduPulse College Management System - Developer Guide

## 📋 Overview

**EduPulse** is a comprehensive **Multi-Tenant SaaS (Software as a Service)** College Management System built with:
- **Frontend**: React 19 with Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Architecture**: Multi-tenant database (single database, multiple colleges)

## 🏗️ System Architecture

### Multi-Tenant Design

The system uses a **database-per-tenant model** where:
- **Single database** serves all colleges
- **college_id** is the partitioning key for all data
- **RLS policies** ensure data isolation and security
- **Subscription model** for SaaS billing

```
┌─────────────────────────────────────────────────────────┐
│                    EduPulse SaaS                        │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
    College A             College B             College C
  (college_id_1)        (college_id_2)         (college_id_3)
    Users                  Users                  Users
    Courses                Courses                Courses
    Attendance             Attendance             Attendance
    Marks                  Marks                  Marks
    Fees                   Fees                   Fees
```

### Role-Based Access Control

```
SUPERADMIN (Developers)
├── Manage all colleges
├── Manage subscriptions
├── View system analytics
└── System configuration

COLLEGE_ADMIN (College Staff)
├── Manage faculty & students
├── Manage courses & departments
├── View college analytics
├── Fee management
└── Create announcements

FACULTY (Teachers)
├── Mark attendance
├── Upload marks/grades
├── Manage assignments
└── View student performance

STUDENT (Learners)
├── View attendance
├── View marks/grades
├── View timetable
├── View assignments
└── Pay fees
```

## 📊 Database Schema

### Core Tables

#### 1. **colleges** (Root tenant table)
```sql
- id: UUID (Primary Key)
- name: TEXT
- code: TEXT (UNIQUE)
- email, phone, address, city, state, country: TEXT
- principal_name, website, logo_url: TEXT
- established_year: INTEGER
- subscription_status: ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED')
- created_at, updated_at: TIMESTAMPTZ
```

#### 2. **profiles** (Multi-tenant users)
```sql
- id: UUID (FK → auth.users)
- college_id: UUID (FK → colleges) [PARTITION KEY]
- name, email, role: TEXT
- role: ENUM ('SUPERADMIN', 'COLLEGE_ADMIN', 'FACULTY', 'STUDENT')
- student_id, faculty_id: TEXT (college-scoped UNIQUE)
- department, phone, address: TEXT
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(college_id, email)
- UNIQUE(college_id, student_id)
- UNIQUE(college_id, faculty_id)
```

#### 3. **departments** (Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- code: TEXT
- name: TEXT
- head_faculty_id: UUID (FK → profiles)
- created_at: TIMESTAMPTZ
- UNIQUE(college_id, code)
```

#### 4. **courses** (Programs - Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- department_id: UUID (FK → departments)
- code: TEXT
- name: TEXT
- duration_years, credits_required: INTEGER
- description: TEXT
- created_at: TIMESTAMPTZ
- UNIQUE(college_id, code)
```

#### 5. **subjects** (Courses - Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- course_id: UUID (FK → courses)
- faculty_id: UUID (FK → profiles)
- code, name: TEXT
- semester: INTEGER
- credits, max_students: INTEGER
- created_at: TIMESTAMPTZ
- UNIQUE(college_id, code)
```

#### 6. **attendance** (Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- student_id: UUID (FK → profiles)
- subject_id: UUID (FK → subjects)
- date: DATE
- status: ENUM ('PRESENT', 'ABSENT', 'LATE')
- marked_by: UUID (FK → profiles)
- remarks: TEXT
- created_at: TIMESTAMPTZ
- UNIQUE(college_id, student_id, subject_id, date)
```

#### 7. **marks** (Grades - Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- student_id: UUID (FK → profiles)
- subject_id: UUID (FK → subjects)
- score: NUMERIC(5,2)
- max_score: INTEGER
- type: ENUM ('ASSIGNMENT', 'MIDTERM', 'FINAL')
- evaluated_by: UUID (FK → profiles)
- evaluation_date: DATE
- created_at: TIMESTAMPTZ
- UNIQUE(college_id, student_id, subject_id, type)
```

#### 8. **fees** (Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- student_id: UUID (FK → profiles)
- amount: NUMERIC(10,2)
- due_date: DATE
- status: ENUM ('PAID', 'PENDING', 'OVERDUE')
- payment_date: TIMESTAMPTZ
- transaction_id: TEXT
- remarks: TEXT
- created_at: TIMESTAMPTZ
```

#### 9. **assignments** (Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- subject_id: UUID (FK → subjects)
- title, description: TEXT
- due_date: TIMESTAMPTZ
- max_score: INTEGER
- created_by: UUID (FK → profiles)
- created_at: TIMESTAMPTZ
```

#### 10. **subscriptions** (SaaS Billing)
```sql
- id: UUID
- college_id: UUID (FK → colleges, UNIQUE)
- plan: TEXT ('STARTER', 'PROFESSIONAL', 'ENTERPRISE')
- max_users: INTEGER
- features: TEXT[] (array of feature strings)
- status: ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED')
- started_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### 11. **notifications** (Multi-tenant)
```sql
- id: UUID
- college_id: UUID (FK → colleges)
- user_id: UUID (FK → profiles, nullable for broadcast)
- title, message: TEXT
- type: ENUM ('INFO', 'WARNING', 'SUCCESS')
- is_read: BOOLEAN
- created_at: TIMESTAMPTZ
```

## 🔐 Row Level Security (RLS) Policies

### Key RLS Rules

1. **Colleges Table**
   - SuperAdmin can view all colleges
   - Users can view their own college

2. **Profiles Table**
   - Users can view profiles within their college
   - Admin can manage users in their college
   - Users can update their own profile

3. **All Other Tables**
   - Data isolated by `college_id`
   - Faculty can access only their subject's data
   - Students can access only their own data
   - Admins can access all data in their college

### Example RLS Policy

```sql
-- Students can view their own marks
CREATE POLICY "Students can view own marks" ON marks
  FOR SELECT
  USING (student_id = auth.uid());

-- Faculty can manage marks for their subjects
CREATE POLICY "Faculty can manage marks" ON marks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE id = marks.subject_id 
      AND faculty_id = auth.uid()
    )
  );
```

## 🔑 TypeScript Types

```typescript
enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT'
}

interface User {
  id: string;
  college_id: string;  // CRITICAL: Multi-tenant key
  name: string;
  email: string;
  role: UserRole;
  student_id?: string;
  faculty_id?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: string;
  college_id: string;  // CRITICAL
  code: string;
  name: string;
  // ... other fields
  created_at: string;
}
```

## 🚀 API Usage Examples

### 1. Fetch User's College Data

```typescript
import { supabase } from './lib/supabase';
import { getCurrentUserProfile } from './lib/auth';

const user = await getCurrentUserProfile();
if (user) {
  // Get all users in the college
  const { data: collegeUsers } = await supabase
    .from('profiles')
    .select('*')
    .eq('college_id', user.college_id);
}
```

### 2. Create Student

```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert([
    {
      id: userId,
      college_id: collegeId,
      name: 'John Doe',
      email: 'john@college.edu',
      role: 'STUDENT',
      student_id: 'CSE-2024-001',
      department: 'Computer Science'
    }
  ])
  .select();
```

### 3. Mark Attendance

```typescript
const { data, error } = await supabase
  .from('attendance')
  .insert([
    {
      college_id: user.college_id,
      student_id: studentId,
      subject_id: subjectId,
      date: new Date().toISOString().split('T')[0],
      status: 'PRESENT',
      marked_by: user.id
    }
  ]);
```

### 4. Upload Marks

```typescript
const { data, error } = await supabase
  .from('marks')
  .upsert([
    {
      college_id: user.college_id,
      student_id: studentId,
      subject_id: subjectId,
      type: 'MIDTERM',
      score: 85,
      max_score: 100,
      evaluated_by: user.id
    }
  ]);
```

### 5. Get Student's Attendance

```typescript
const { data: attendance } = await supabase
  .from('attendance')
  .select('*, subject:subjects(name, code)')
  .eq('student_id', studentId)
  .eq('college_id', collegeId);
```

## 📁 Folder Structure

```
edupulse-college-management-system/
├── src/
│   ├── components/
│   │   ├── AIChatbot.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatCard.tsx
│   ├── pages/
│   │   ├── AdminDashboard.tsx      [NEW] College admin panel
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Attendance.tsx
│   │   ├── Marks.tsx
│   │   ├── Timetable.tsx
│   │   ├── CourseCatalog.tsx
│   │   ├── Courses.tsx
│   │   ├── Fees.tsx
│   │   ├── MyGrades.tsx
│   │   ├── Announcements.tsx
│   │   ├── Settings.tsx
│   │   └── Users.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── auth.ts                 [NEW] Role-based access control
│   ├── services/
│   │   └── mockData.ts
│   ├── App.tsx
│   ├── types.ts                    [UPDATED] Multi-tenant types
│   ├── index.tsx
│   └── index.html
├── schema.sql                      [UPDATED] Multi-tenant schema
├── RLS_POLICY.sql                 [UPDATED] Comprehensive RLS
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🛡️ Security Best Practices

### 1. RLS Enforcement
- **Always enable RLS** on all tables
- **Test RLS policies** thoroughly before production
- **Log RLS denials** for audit trails

### 2. college_id Validation
- **Always include college_id** in every query
- **Verify college_id matches** current user's college
- **Never trust client-side college_id** values

### 3. Authentication
- **Use Supabase Auth** with email/password or OAuth
- **Store JWT tokens** in secure httpOnly cookies
- **Refresh tokens** before expiration

### 4. API Keys
- **Use anon key** for client-side requests (RLS enforced)
- **Use service_role key** only on server-side with caution
- **Rotate keys** regularly
- **Never commit keys** in version control

### 5. Data Validation
- **Validate all inputs** on client and server
- **Use TypeScript** for type safety
- **Sanitize HTML** to prevent XSS attacks

## 📈 Scaling Considerations

### For 10,000+ Colleges

1. **Horizontal Scaling**
   - Use read replicas for analytics queries
   - Implement connection pooling (PgBouncer)
   - Use separate Supabase projects for large colleges

2. **Caching Strategy**
   - Cache college-level data in Redis
   - Implement query result caching
   - Use CDN for static assets

3. **Database Optimization**
   - Regular ANALYZE and VACUUM
   - Monitor slow queries using pg_stat_statements
   - Implement proper indexing strategy

4. **Sharding Strategy (if needed)
   - Shard by college_id at application level
   - Use separate projects/databases per college
   - Implement cross-project reconciliation

## 🧪 Testing

### Unit Tests Example

```typescript
describe('UserRole Hierarchy', () => {
  it('should allow college admin to manage students', () => {
    const admin = UserRole.COLLEGE_ADMIN;
    const student = UserRole.STUDENT;
    expect(canManageUser(admin, student)).toBe(true);
  });

  it('should prevent faculty from managing admin', () => {
    const faculty = UserRole.FACULTY;
    const admin = UserRole.COLLEGE_ADMIN;
    expect(canManageUser(faculty, admin)).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Multi-tenant Data Isolation', () => {
  it('should not return college B data to college A user', async () => {
    const collegeAUser = await loginAs('college-a-admin');
    const data = await collegeAUser.query('profiles');
    expect(data.every(u => u.college_id === 'college-a')).toBe(true);
  });
});
```

## 🚢 Deployment

### Environment Variables (.env.local)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE=eyJhbGc... (never expose to client)
```

### Deploy to Vercel/Netlify

```bash
npm run build
# Deploy dist/ folder
```

### Database Setup

1. Create new Supabase project
2. Run schema.sql in SQL editor
3. Run RLS_POLICY.sql in SQL editor
4. Verify RLS is enabled: `SELECT tablename FROM pg_tables WHERE schemaname='public'`

## 📞 Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## 📝 License

EduPulse is provided as-is for educational and commercial use.

## 🎯 Key Features Summary

✅ Multi-tenant architecture  
✅ Role-based access control  
✅ Row-level security  
✅ Real-time data sync  
✅ Responsive UI  
✅ AI chatbot support  
✅ Analytics dashboard  
✅ Fee management  
✅ Attendance tracking  
✅ Grade management  
✅ Announcement system  
✅ Subscription billing  

---

**Last Updated**: February 18, 2026  
**Version**: 1.0.0
