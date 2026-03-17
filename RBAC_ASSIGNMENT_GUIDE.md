# RBAC And Assignment Rules

This project now enforces role-scoped visibility for HOD, Faculty, and Students across timetable and attendance modules.

## Data Relationships

- `Department -> Courses -> Subjects`
- `Department + Year + Section -> Academic Sections`
- `Timetable -> Subject + Year + Section`
- `Subject -> Faculty` (assigned by HOD)
- `Student -> Department + Year + Section`
- `Attendance -> Student + Subject + Date` (marked by assigned faculty only)

## HOD Capabilities

- HOD is department-scoped.
- HOD can assign faculty to subjects from `HOD Dashboard -> Subject Faculty Assignment`.
- HOD can create/manage sections.
- HOD can upload timetable for selected `Year + Section`.
- Uploaded timetable becomes visible to:
  - Students in that same year/section.
  - Faculty assigned to those subjects.

## Faculty Capabilities

- Faculty sees only subjects where `subjects.faculty_id = faculty_user_id`.
- Faculty timetable view is restricted to their own subjects only.
- Faculty attendance module student list is restricted by:
  - Selected subject.
  - Timetable allocation (`year + section`) for that subject.
- Faculty cannot mark attendance for other sections.

## Student Capabilities

- Student timetable is filtered by own `department/year/section`.
- Student attendance view fetches only own attendance rows.
- No cross-section access.

## Security

- Apply SQL in `ROLE_BASED_ACCESS_HOTFIX.sql` to enforce DB-level visibility using RLS.
- Frontend filtering is implemented, but RLS remains the primary security boundary.

## Operational Note

- If your `timetable` table is from an old schema, run the hotfix SQL to add `year` and `section` columns before relying on strict section-level isolation.
