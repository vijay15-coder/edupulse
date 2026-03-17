-- Add extended student/faculty profile fields
alter table public.profiles add column if not exists student_phone text;
alter table public.profiles add column if not exists parent_phone text;
alter table public.profiles add column if not exists sem integer;
alter table public.profiles add column if not exists blood_group text;
alter table public.profiles add column if not exists batch text;
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists year integer;
alter table public.profiles add column if not exists section text;
alter table public.profiles add column if not exists proctor_or_mentor text;
alter table public.profiles add column if not exists gender text;

alter table public.profiles drop constraint if exists chk_profiles_sem;
alter table public.profiles add constraint chk_profiles_sem check (sem is null or sem between 1 and 12);

alter table public.profiles drop constraint if exists chk_profiles_year;
alter table public.profiles add constraint chk_profiles_year check (year is null or year between 1 and 8);

select pg_notify('pgrst', 'reload schema');
