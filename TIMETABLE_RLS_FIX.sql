-- Fix RLS policies for Timetable table
-- Allows HODs to manage timetable entries for their college

-- Drop existing "College admin can manage timetable" policy to replace it with an inclusive one
-- (Or just add a new one specifically for HODs)

-- Grant HODs full access to timetable entries within their college
CREATE POLICY "HOD can manage timetable" ON timetable
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'HOD'
      AND college_id = timetable.college_id
    )
  );

-- Ensure Students can view the timetable (already exists but re-verifying)
-- CREATE POLICY "Users can view timetable" ON timetable
--   FOR SELECT
--   USING (college_id IN (
--     SELECT college_id FROM profiles WHERE id = auth.uid()
--   ));
