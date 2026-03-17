-- ============================================================
-- Result Management Schema (Supabase PostgreSQL)
-- Student semester results from uploaded PDFs
-- ============================================================

-- 1. Result Uploads (tracks each admin PDF upload)
CREATE TABLE IF NOT EXISTS result_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL,          -- e.g. '2024-2025'
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  file_name TEXT NOT NULL,
  file_url TEXT,
  students_processed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Semester Results (one row per student per semester)
CREATE TABLE IF NOT EXISTS semester_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_roll TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  academic_year TEXT NOT NULL,
  sgpa NUMERIC(4,2) DEFAULT 0 CHECK (sgpa >= 0 AND sgpa <= 10),
  cgpa NUMERIC(4,2) DEFAULT 0 CHECK (cgpa >= 0 AND cgpa <= 10),
  total_subjects INTEGER DEFAULT 0,
  passed_subjects INTEGER DEFAULT 0,
  failed_subjects INTEGER DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'PASS' CHECK (overall_status IN ('PASS','FAIL')),
  pdf_url TEXT,
  upload_id UUID REFERENCES result_uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, student_roll, year, semester, academic_year)
);

-- 3. Result Subjects (one row per subject per result)
CREATE TABLE IF NOT EXISTS result_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES semester_results(id) ON DELETE CASCADE NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  grade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PASS' CHECK (status IN ('PASS','FAIL')),
  credits NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_result_uploads_college ON result_uploads(college_id);
CREATE INDEX IF NOT EXISTS idx_result_uploads_status ON result_uploads(status);

CREATE INDEX IF NOT EXISTS idx_semester_results_college ON semester_results(college_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_student ON semester_results(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_roll ON semester_results(student_roll);
CREATE INDEX IF NOT EXISTS idx_semester_results_year_sem ON semester_results(year, semester);

CREATE INDEX IF NOT EXISTS idx_result_subjects_result ON result_subjects(result_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE result_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_subjects ENABLE ROW LEVEL SECURITY;

-- Result uploads: only admins can manage
CREATE POLICY result_uploads_admin_all ON result_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPERADMIN','COLLEGE_ADMIN')
      AND (profiles.college_id = result_uploads.college_id OR profiles.role = 'SUPERADMIN')
    )
  );

-- Semester results: admins full access, students can read own results
CREATE POLICY semester_results_admin_all ON semester_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPERADMIN','COLLEGE_ADMIN')
      AND (profiles.college_id = semester_results.college_id OR profiles.role = 'SUPERADMIN')
    )
  );

CREATE POLICY semester_results_student_read ON semester_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'STUDENT'
      AND profiles.college_id = semester_results.college_id
      AND (profiles.student_id = semester_results.student_roll OR profiles.id = semester_results.student_id)
    )
  );

-- Result subjects: admins full access, students read via result ownership
CREATE POLICY result_subjects_admin_all ON result_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM semester_results sr
      JOIN profiles p ON p.id = auth.uid()
      WHERE sr.id = result_subjects.result_id
      AND p.role IN ('SUPERADMIN','COLLEGE_ADMIN')
      AND (p.college_id = sr.college_id OR p.role = 'SUPERADMIN')
    )
  );

CREATE POLICY result_subjects_student_read ON result_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM semester_results sr
      JOIN profiles p ON p.id = auth.uid()
      WHERE sr.id = result_subjects.result_id
      AND p.role = 'STUDENT'
      AND p.college_id = sr.college_id
      AND (p.student_id = sr.student_roll OR p.id = sr.student_id)
    )
  );
