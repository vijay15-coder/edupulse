-- Role-based visibility hardening for timetable + attendance
-- Safe to run multiple times where possible.

-- 1) Ensure timetable can be scoped to year/section.
ALTER TABLE public.timetable
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS section TEXT;

CREATE INDEX IF NOT EXISTS idx_timetable_year_section ON public.timetable(year, section);

-- 2) Replace broad timetable policies with strict role-aware policies.
DROP POLICY IF EXISTS "Users can view timetable" ON public.timetable;
DROP POLICY IF EXISTS "College admin can manage timetable" ON public.timetable;
DROP POLICY IF EXISTS "Faculty can view own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Students can view own section timetable" ON public.timetable;
DROP POLICY IF EXISTS "HOD can manage department timetable" ON public.timetable;
DROP POLICY IF EXISTS "Admin can manage timetable" ON public.timetable;

CREATE POLICY "Faculty can view own timetable" ON public.timetable
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = timetable.subject_id
        AND s.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own section timetable" ON public.timetable
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'STUDENT'
        AND p.college_id = timetable.college_id
        AND (timetable.year IS NULL OR timetable.year = p.year)
        AND (timetable.section IS NULL OR UPPER(timetable.section) = UPPER(COALESCE(p.section, '')))
    )
  );

CREATE POLICY "HOD can manage department timetable" ON public.timetable
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.subjects s ON s.id = timetable.subject_id
      JOIN public.courses c ON c.id = s.course_id
      JOIN public.departments d ON d.id = c.department_id
      WHERE p.id = auth.uid()
        AND p.college_id = timetable.college_id
        AND p.role = 'HOD'
        AND UPPER(COALESCE(p.department, '')) = UPPER(COALESCE(d.name, ''))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.subjects s ON s.id = timetable.subject_id
      JOIN public.courses c ON c.id = s.course_id
      JOIN public.departments d ON d.id = c.department_id
      WHERE p.id = auth.uid()
        AND p.college_id = timetable.college_id
        AND p.role = 'HOD'
        AND UPPER(COALESCE(p.department, '')) = UPPER(COALESCE(d.name, ''))
    )
  );

CREATE POLICY "Admin can manage timetable" ON public.timetable
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.college_id = timetable.college_id
        AND p.role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.college_id = timetable.college_id
        AND p.role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
    )
  );

-- 3) Tighten attendance write access for faculty to only assigned subject + allocated section.
DROP POLICY IF EXISTS "Faculty can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Faculty can view and mark assigned attendance only" ON public.attendance;
DROP POLICY IF EXISTS "Students can only view own attendance rows" ON public.attendance;
DROP POLICY IF EXISTS "Admin can manage attendance" ON public.attendance;

CREATE POLICY "Students can only view own attendance rows" ON public.attendance
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Faculty can view and mark assigned attendance only" ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.subjects s
      JOIN public.profiles st ON st.id = attendance.student_id
      JOIN public.timetable t ON t.subject_id = attendance.subject_id
      WHERE s.id = attendance.subject_id
        AND s.faculty_id = auth.uid()
        AND (t.year IS NULL OR t.year = st.year)
        AND (t.section IS NULL OR UPPER(t.section) = UPPER(COALESCE(st.section, '')))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.subjects s
      JOIN public.profiles st ON st.id = attendance.student_id
      JOIN public.timetable t ON t.subject_id = attendance.subject_id
      WHERE s.id = attendance.subject_id
        AND s.faculty_id = auth.uid()
        AND (t.year IS NULL OR t.year = st.year)
        AND (t.section IS NULL OR UPPER(t.section) = UPPER(COALESCE(st.section, '')))
    )
  );

CREATE POLICY "Admin can manage attendance" ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.college_id = attendance.college_id
        AND p.role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.college_id = attendance.college_id
        AND p.role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
    )
  );
