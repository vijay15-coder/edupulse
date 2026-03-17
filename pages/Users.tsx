import React, { useEffect, useRef, useState } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Download, Loader2, X, CheckCircle, ArrowLeft, Upload } from 'lucide-react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { downloadUserSample, parseExcelFile, validateUserData } from '../lib/excelUtils';

interface UsersPageProps {
  users: User[];
  collegeId: string;
  currentUserRole: UserRole;
  isHODManager?: boolean;
  onAdd?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  setActiveTab?: (tab: string) => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  studentPhone?: string;
  parentPhone?: string;
  sem?: string;
  bloodGroup?: string;
  batch?: string;
  program?: string;
  dateOfBirth?: string;
  year?: string;
  section?: string;
  proctorOrMentor?: string;
  gender?: string;
  studentId?: string;
  facultyId?: string;
}

const UsersPage: React.FC<UsersPageProps> = ({ users, collegeId, currentUserRole, isHODManager = false, onAdd, onEdit, onDelete, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | UserRole>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [databaseUsers, setDatabaseUsers] = useState<User[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isHodScopedManager = isHODManager || currentUserRole === UserRole.HOD;
  const isAllowedHodRole = (role: UserRole) => role === UserRole.STUDENT || role === UserRole.FACULTY;
  const canManageUser = (user: User) => !isHodScopedManager || isAllowedHodRole(user.role);
  const allowedRoleOptions = isHodScopedManager
    ? [UserRole.STUDENT, UserRole.FACULTY]
    : [UserRole.STUDENT, UserRole.FACULTY, UserRole.HOD, UserRole.COLLEGE_ADMIN];
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: UserRole.STUDENT,
    department: '',
    studentPhone: '',
    parentPhone: '',
    sem: '',
    bloodGroup: '',
    batch: '',
    program: '',
    dateOfBirth: '',
    year: '',
    section: '',
    proctorOrMentor: '',
    gender: '',
    studentId: '',
    facultyId: ''
  });

  // Use fetched database users if available, otherwise fallback to the provided props
  const displayedUsers = databaseUsers.length > 0 ? databaseUsers : users;

  const filteredUsers = displayedUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      (user.student_id || '').toLowerCase().includes(searchLower) ||
      (user.faculty_id || '').toLowerCase().includes(searchLower)
    );
    const normalizedUserRole = (user.role || '').toString().toUpperCase().trim()
      .replace('FACULLTY', 'FACULTY')
      .replace('FACULITY', 'FACULTY');
    
    const matchesRole = filterRole === 'ALL' || normalizedUserRole === filterRole;
    return matchesSearch && matchesRole;
  });

  const studentCount = displayedUsers.filter(u => u.role === UserRole.STUDENT).length;
  const facultyCount = displayedUsers.filter(u => u.role === UserRole.FACULTY).length;
  const hodCount = displayedUsers.filter(u => u.role === UserRole.HOD).length;
  const adminCount = displayedUsers.filter(u => u.role === UserRole.COLLEGE_ADMIN).length;

  const loadUsersFromDatabase = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured.');
    }

    try {
      setIsLoadingUsers(true);
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (currentUserRole !== UserRole.SUPERADMIN) {
        query = query.eq('college_id', collegeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedUsers: User[] = (data || []).map((p: any) => ({
        id: p.id,
        college_id: p.college_id,
        name: p.name,
        email: p.email,
        role: p.role as UserRole,
        department: p.department,
        avatar: p.avatar_url,
        student_id: p.student_id,
        faculty_id: p.faculty_id,
        student_phone: p.student_phone,
        parent_phone: p.parent_phone,
        sem: p.sem,
        blood_group: p.blood_group,
        batch: p.batch,
        program: p.program,
        date_of_birth: p.date_of_birth,
        year: p.year,
        section: p.section,
        proctor_or_mentor: p.proctor_or_mentor,
        gender: p.gender,
        phone: p.phone,
        address: p.address,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setDatabaseUsers(mappedUsers);
    } catch (err: any) {
      console.warn('Failed to load users from database:', err);
      setErrorMsg(err?.message || 'Failed to load users from database');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsersFromDatabase();
  }, [collegeId, currentUserRole]);

  const handleOpenAddForm = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: UserRole.STUDENT,
      department: '',
      studentPhone: '',
      parentPhone: '',
      sem: '',
      bloodGroup: '',
      batch: '',
      program: '',
      dateOfBirth: '',
      year: '',
      section: '',
      proctorOrMentor: '',
      gender: '',
      studentId: '',
      facultyId: ''
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsAddingUser(true);
  };

  const handleOpenEditForm = (user: User) => {
    if (!canManageUser(user)) {
      setErrorMsg('HOD can manage only Faculty and Students.');
      return;
    }

    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      studentPhone: user.student_phone || '',
      parentPhone: user.parent_phone || '',
      sem: user.sem?.toString() || '',
      bloodGroup: user.blood_group || '',
      batch: user.batch || '',
      program: user.program || '',
      dateOfBirth: user.date_of_birth || '',
      year: user.year?.toString() || '',
      section: user.section || '',
      proctorOrMentor: user.proctor_or_mentor || '',
      gender: user.gender || '',
      studentId: user.student_id || '',
      facultyId: user.faculty_id || ''
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsAddingUser(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Validate form
      if (!formData.name || !formData.email) {
        throw new Error('Name and email are required');
      }

      if (!selectedUser && !formData.password) {
        throw new Error('Password is required for new users');
      }

      if (isHodScopedManager && !isAllowedHodRole(formData.role)) {
        throw new Error('HOD can add or update only Faculty and Students');
      }

      if (isSupabaseConfigured) {
        let userId = selectedUser?.id;

        if (!selectedUser) {
          // Create user in auth.users first using Supabase service role
          // Since we're using anon key, we'll just create the profile without auth
          // For production, use a backend service with service role key
          userId = crypto.randomUUID();
        }

        // Save or update user profile in database
        const userData = {
          id: userId,
          college_id: collegeId,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          student_phone: formData.studentPhone || null,
          parent_phone: formData.parentPhone || null,
          sem: formData.sem ? Number(formData.sem) : null,
          blood_group: formData.bloodGroup || null,
          batch: formData.batch || null,
          program: formData.program || null,
          date_of_birth: formData.dateOfBirth || null,
          year: formData.year ? Number(formData.year) : null,
          section: formData.section || null,
          proctor_or_mentor: formData.proctorOrMentor || null,
          gender: formData.gender || null,
          avatar_url: `https://picsum.photos/seed/${formData.email}/200`,
          student_id: formData.studentId || null,
          faculty_id: formData.facultyId || null,
          updated_at: new Date().toISOString()
        };

        // Check if user exists first
        if (selectedUser) {
          // Update existing profile
          const { data, error } = await supabase
            .from('profiles')
            .update(userData)
            .eq('id', userId);

          if (error) throw error;
        } else {
          // Insert new profile without auth user constraint
          // We'll disable the foreign key check for this operation
          const { data, error } = await supabase
            .from('profiles')
            .insert([
              {
                ...userData,
                created_at: new Date().toISOString()
              }
            ]);

          if (error) {
            // If foreign key error, it means the id doesn't exist in auth.users
            // For development/demo purposes, we'll suggest using Option A from RLS_POLICY.sql
            if (error.message.includes('foreign key')) {
              throw new Error(
                'Database constraint error. To add users without auth setup, your admin should:\n' +
                '1. Go to Supabase SQL Editor\n' +
                '2. Run: ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;\n' +
                '3. Try again.\n\n' +
                'For production, create users via Auth first.'
              );
            }
            throw error;
          }
        }

        const newUser: User = {
          id: userId,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          student_phone: formData.studentPhone,
          parent_phone: formData.parentPhone,
          sem: formData.sem ? Number(formData.sem) : undefined,
          blood_group: formData.bloodGroup,
          batch: formData.batch,
          program: formData.program,
          date_of_birth: formData.dateOfBirth,
          year: formData.year ? Number(formData.year) : undefined,
          section: formData.section,
          proctor_or_mentor: formData.proctorOrMentor,
          gender: formData.gender,
          student_id: formData.studentId,
          faculty_id: formData.facultyId,
          avatar: userData.avatar_url,
          college_id: collegeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        onAdd?.(newUser);
        onEdit?.(newUser);
        await loadUsersFromDatabase();
        setSuccessMsg(selectedUser ? 'User updated successfully!' : 'User added successfully!');


        setTimeout(() => {
          setIsAddingUser(false);
          setFormData({
            name: '',
            email: '',
            password: '',
            role: UserRole.STUDENT,
            department: '',
            studentPhone: '',
            parentPhone: '',
            sem: '',
            bloodGroup: '',
            batch: '',
            program: '',
            dateOfBirth: '',
            year: '',
            section: '',
            proctorOrMentor: '',
            gender: '',
            studentId: '',
            facultyId: ''
          });
          setSelectedUser(null);
        }, 2000);
      } else {
        throw new Error('Database is not configured.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUploadUsers = async (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsBulkUploading(true);

    try {
      const rawRows = await parseExcelFile(file, 'Users');
      const { valid, errors } = validateUserData(rawRows);

      const scopedRows = valid.filter((row) => {
        const role = row.role as UserRole;
        return !isHodScopedManager || isAllowedHodRole(role);
      });

      const droppedCount = valid.length - scopedRows.length;
      if (isHodScopedManager && droppedCount > 0) {
        errors.push(`${droppedCount} row(s) skipped: HOD can upload only STUDENT/FACULTY`);
      }

      if (scopedRows.length === 0) {
        throw new Error(errors[0] || 'No valid rows found in uploaded file');
      }

      const timestamp = new Date().toISOString();
      const rowsToInsert = scopedRows.map((row) => ({
        id: crypto.randomUUID(),
        college_id: collegeId,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department || null,
        student_phone: row.student_phone || null,
        parent_phone: row.parent_phone || null,
        sem: row.sem ?? null,
        blood_group: row.blood_group || null,
        batch: row.batch || null,
        program: row.program || null,
        date_of_birth: row.date_of_birth || null,
        year: row.year ?? null,
        section: row.section || null,
        proctor_or_mentor: row.proctor_or_mentor || null,
        gender: row.gender || null,
        student_id: row.student_id || null,
        faculty_id: row.faculty_id || null,
        avatar_url: `https://picsum.photos/seed/${row.email}/200`,
        created_at: timestamp,
        updated_at: timestamp
      }));

      if (isSupabaseConfigured) {
        // Use upsert to handle existing profiles and prevent duplicate errors
        const { error } = await supabase.from('profiles').upsert(rowsToInsert, { onConflict: 'id' });
        if (error) {
          throw error;
        }
      }

      rowsToInsert.forEach((row) => {
        onAdd?.({
          id: row.id,
          college_id: row.college_id,
          name: row.name,
          email: row.email,
          role: row.role as UserRole,
          department: row.department || undefined,
          student_phone: row.student_phone || undefined,
          parent_phone: row.parent_phone || undefined,
          sem: row.sem || undefined,
          blood_group: row.blood_group || undefined,
          batch: row.batch || undefined,
          program: row.program || undefined,
          date_of_birth: row.date_of_birth || undefined,
          year: row.year || undefined,
          section: row.section || undefined,
          proctor_or_mentor: row.proctor_or_mentor || undefined,
          gender: row.gender || undefined,
          student_id: row.student_id || undefined,
          faculty_id: row.faculty_id || undefined,
          avatar: row.avatar_url,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      });

      await loadUsersFromDatabase();

      const base = `${rowsToInsert.length} user(s) uploaded successfully`;
      const warning = errors.length ? ` (${errors[0]})` : '';
      setSuccessMsg(base + warning);
    } catch (err: any) {
      setErrorMsg(err.message || 'Bulk upload failed');
    } finally {
      setIsBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!canManageUser(user)) return;

    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) throw error;
        await loadUsersFromDatabase();
      }

      onDelete?.(user.id);
      setSuccessMsg('User deleted successfully!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6 px-0 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Faculty & Students</h1>
          <p className="text-slate-500 text-sm">Manage all users in the system</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div></div>
          <div className="w-full flex flex-wrap justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={downloadUserSample}
              className="min-w-[180px] bg-white text-slate-700 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-5 h-5" /> Sample File
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBulkUploading}
              className="min-w-[180px] bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-300/40 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              {isBulkUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Bulk Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBulkUploadUsers(file);
              }}
            />
            <button
              onClick={handleOpenAddForm}
              className="min-w-[180px] bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" /> Add User
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{studentCount}</h3>
            </div>
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Faculty</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{facultyCount}</h3>
            </div>
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">HODs</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{hodCount}</h3>
            </div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Admins</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{adminCount}</h3>
            </div>
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 bg-white rounded-none sm:rounded-[2rem] border-y border-x-0 sm:border sm:border-slate-100 shadow-sm overflow-hidden">
        {isLoadingUsers && (
          <div className="px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading users from database...
          </div>
        )}
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-4 py-3 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.STUDENT}>Students</option>
            <option value={UserRole.FACULTY}>Faculty</option>
            {!isHodScopedManager && <option value={UserRole.HOD}>HODs</option>}
            {!isHodScopedManager && <option value={UserRole.COLLEGE_ADMIN}>Admins</option>}
            {!isHodScopedManager && <option value={UserRole.SUPERADMIN}>Super Admin</option>}
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-6 sm:px-8 py-16 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p className="font-bold">No users found</p>
          </div>
        ) : (
          <div className="p-0 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredUsers.map((user) => {
              const roleBadgeClass = user.role === UserRole.COLLEGE_ADMIN
                ? 'bg-orange-100 text-orange-700'
                : user.role === UserRole.HOD
                  ? 'bg-emerald-100 text-emerald-700'
                  : user.role === UserRole.FACULTY
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700';

              return (
                <div key={user.id} className="w-full h-[360px] rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={user.avatar || `https://picsum.photos/seed/${user.id}/80`} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-base truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass}`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto pr-1 space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-700">Department:</span> {user.department || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Student ID:</span> {user.student_id || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Faculty ID:</span> {user.faculty_id || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Year/Sem:</span> {user.year || '-'} / {user.sem || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Section:</span> {user.section || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Program:</span> {user.program || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Batch:</span> {user.batch || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Gender:</span> {user.gender || '-'}</p>
                    <p><span className="font-semibold text-slate-700">DOB:</span> {user.date_of_birth || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Student Phone:</span> {user.student_phone || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Parent Phone:</span> {user.parent_phone || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Blood Group:</span> {user.blood_group || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Mentor:</span> {user.proctor_or_mentor || '-'}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      disabled={!canManageUser(user)}
                      onClick={() => handleOpenEditForm(user)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      disabled={!canManageUser(user)}
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] flex justify-between items-center p-6 sm:p-8 border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-900">{selectedUser ? 'Edit User' : 'Add New User'}</h3>
              <button
                onClick={() => setIsAddingUser(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {successMsg && (
              <div className="m-6 sm:m-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="m-6 sm:m-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <p className="text-sm font-bold text-rose-700">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="john@university.edu"
                />
              </div>

              {!selectedUser && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Password *</label>
                  <input
                    type="password"
                    required={!selectedUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all bg-white"
                >
                  {allowedRoleOptions.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption === UserRole.HOD
                        ? 'HOD (Head of Department)'
                        : roleOption === UserRole.COLLEGE_ADMIN
                          ? 'College Admin'
                          : roleOption.charAt(0) + roleOption.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  placeholder="Computer Science"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Student Phone</label>
                  <input
                    type="text"
                    value={formData.studentPhone}
                    onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="+91-9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Parent Phone</label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="+91-9123456780"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Semester (Sem)</label>
                  <input
                    type="number"
                    value={formData.sem}
                    onChange={(e) => setFormData({ ...formData, sem: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Blood Group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="O+"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Batch</label>
                  <input
                    type="text"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="2023-2027"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Program</label>
                  <input
                    type="text"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="B.Tech CSE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Gender</label>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="Male/Female/Other"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Proctor / Mentor</label>
                  <input
                    type="text"
                    value={formData.proctorOrMentor}
                    onChange={(e) => setFormData({ ...formData, proctorOrMentor: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              </div>

              {formData.role === UserRole.STUDENT && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Student ID</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="CSE-2024-001"
                  />
                </div>
              )}

              {formData.role === UserRole.FACULTY && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Faculty ID</label>
                  <input
                    type="text"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                    placeholder="FAC-101"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || successMsg !== ''}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
