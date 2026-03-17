-- SQL Script to clear orphaned Auth users (Ghost Users)
-- This is necessary if you've deleted profiles but left the Auth records.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- WARNING: This will delete users from the AUTH table. 
-- It is recommended to back up your data if needed.

-- Option 1: Delete ALL Auth users EXCEPT the currently logged-in Admin
-- Replace 'angajalavijay8560@gmail.com' with your actual admin email to keep it safe.
DELETE FROM auth.users 
WHERE email NOT IN ('angajalavijay8560@gmail.com');

-- Option 2: Delete ONLY users with a specific domain
-- DELETE FROM auth.users WHERE email LIKE '%@college.edu';

-- Note: After running this, bulk import will work perfectly as new users.
