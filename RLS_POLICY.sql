-- ===========================
-- ROW LEVEL SECURITY POLICIES
-- EduPulse Multi-Tenant SaaS
-- ===========================

-- ===== COLLEGES TABLE =====
-- Only SUPERADMIN can view all colleges
CREATE POLICY "Superadmin can view all colleges" ON colleges
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'SUPERADMIN' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN'
  ));

-- Users can view their own college
CREATE POLICY "Users can view their college" ON colleges
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND profiles.college_id = colleges.id
  ));

-- Only SUPERADMIN can insert colleges
CREATE POLICY "Superadmin can create colleges" ON colleges
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN'
  ));

-- Only SUPERADMIN can update colleges
CREATE POLICY "Superadmin can update colleges" ON colleges
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN'
  ));

-- ===== PROFILES TABLE =====
-- Users can view profiles in their college
CREATE POLICY "Users can view college members" ON profiles
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND college_id = (SELECT p.college_id FROM profiles p WHERE p.id = auth.uid())
  );

-- College Admin can manage users in their college
CREATE POLICY "College admin can manage users" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'COLLEGE_ADMIN' 
      AND college_id = profiles.college_id
    )
  );

-- College Admin can create users in their college
CREATE POLICY "College admin can create users" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()
      AND (
        role = 'SUPERADMIN' OR
        (role = 'COLLEGE_ADMIN' AND college_id = profiles.college_id)
      )
    )
  );

-- ===== DEPARTMENTS TABLE =====
-- Users can view departments in their college
CREATE POLICY "Users can view departments" ON departments
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- College Admin can manage departments
CREATE POLICY "College admin can manage departments" ON departments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = departments.college_id
    )
  );

-- ===== COURSES TABLE =====
-- Users can view courses in their college
CREATE POLICY "Users can view courses" ON courses
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- College Admin can manage courses
CREATE POLICY "College admin can manage courses" ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = courses.college_id
    )
  );

-- ===== SUBJECTS TABLE =====
-- Users can view subjects in their college
CREATE POLICY "Users can view subjects" ON subjects
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- Faculty can view their assigned subjects
CREATE POLICY "Faculty can view assigned subjects" ON subjects
  FOR SELECT
  USING (
    faculty_id = auth.uid() OR
    college_id IN (SELECT college_id FROM profiles WHERE id = auth.uid())
  );

-- College Admin can manage subjects
CREATE POLICY "College admin can manage subjects" ON subjects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = subjects.college_id
    )
  );

-- ===== TIMETABLE TABLE =====
-- Users can view timetable in their college
CREATE POLICY "Users can view timetable" ON timetable
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- College Admin can manage timetable
CREATE POLICY "College admin can manage timetable" ON timetable
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = timetable.college_id
    )
  );

-- ===== ACADEMIC SECTIONS TABLE =====
-- Users can view sections in their college
CREATE POLICY "Users can view academic sections" ON academic_sections
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- HOD and Admin can manage sections in their college
CREATE POLICY "HOD can manage academic sections" ON academic_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('HOD', 'COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = academic_sections.college_id
    )
  );

-- ===== TIMETABLE UPLOADS TABLE =====
-- Users can view timetable uploads in their college
CREATE POLICY "Users can view timetable uploads" ON timetable_uploads
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- HOD and Admin can manage timetable uploads in their college
CREATE POLICY "HOD can manage timetable uploads" ON timetable_uploads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('HOD', 'COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = timetable_uploads.college_id
    )
  );

-- ===== ATTENDANCE TABLE =====
-- Students can view their own attendance
CREATE POLICY "Students can view own attendance" ON attendance
  FOR SELECT
  USING (
    student_id = auth.uid() OR
    (EXISTS (
      SELECT 1 FROM subjects 
      WHERE id = attendance.subject_id 
      AND faculty_id = auth.uid()
    ))
  );

-- Faculty can view/mark attendance for their subjects
CREATE POLICY "Faculty can manage attendance" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE id = attendance.subject_id 
      AND (faculty_id = auth.uid() OR college_id IN (
        SELECT college_id FROM profiles WHERE id = auth.uid() AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      ))
    )
  );

-- ===== ASSIGNMENTS TABLE =====
-- Users can view assignments in their college subjects
CREATE POLICY "Users can view assignments" ON assignments
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- Faculty can manage their own assignments
CREATE POLICY "Faculty can manage assignments" ON assignments
  FOR ALL
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE id = assignments.subject_id 
      AND faculty_id = auth.uid()
    )
  );

-- ===== MARKS TABLE =====
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
    ) OR
    evaluated_by = auth.uid()
  );

-- College Admin can view all marks
CREATE POLICY "College admin can view marks" ON marks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = marks.college_id
    )
  );

-- ===== FEES TABLE =====
-- Students can view their own fees
CREATE POLICY "Students can view own fees" ON fees
  FOR SELECT
  USING (student_id = auth.uid());

-- College Admin can manage fees
CREATE POLICY "College admin can manage fees" ON fees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = fees.college_id
    )
  );

-- ===== SUBSCRIPTIONS TABLE =====
-- College Admin can view their subscription
CREATE POLICY "College admin can view subscription" ON subscriptions
  FOR SELECT
  USING (
    college_id IN (
      SELECT college_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only SUPERADMIN can manage subscriptions
CREATE POLICY "Superadmin can manage subscriptions" ON subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'SUPERADMIN'
    )
  );

-- ===== NOTIFICATIONS TABLE =====
-- Users can view notifications for themselves
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND college_id IN (
      SELECT college_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- College Admin can create notifications
CREATE POLICY "College admin can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('COLLEGE_ADMIN', 'SUPERADMIN')
      AND college_id = notifications.college_id
    )
  );

-- Users can update their notification read status
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- ===== ACTIVITIES TABLE =====
-- Users can view activities from their college
CREATE POLICY "Users can view college activities" ON activities
  FOR SELECT
  USING (college_id IN (
    SELECT college_id FROM profiles WHERE id = auth.uid()
  ));

-- Only COLLEGE_ADMIN or SUPERADMIN can insert activities
CREATE POLICY "Admins can log activities" ON activities
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'COLLEGE_ADMIN' OR role = 'SUPERADMIN')
    AND college_id = activities.college_id
  ));
