
import React, { useState } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Shield, Bell, Lock, Globe, Camera, Info, X, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SettingsProps {
  user: User;
  setActiveTab?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: Partial<User>) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, setActiveTab, onProfileUpdate }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    department: user.department || '',
    student_phone: user.student_phone || '',
    parent_phone: user.parent_phone || '',
    sem: user.sem?.toString() || '',
    blood_group: user.blood_group || '',
    batch: user.batch || '',
    program: user.program || '',
    date_of_birth: user.date_of_birth || '',
    year: user.year?.toString() || '',
    section: user.section || '',
    proctor_or_mentor: user.proctor_or_mentor || '',
    gender: user.gender || ''
  });

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    
    try {
      if (isSupabaseConfigured && user?.id) {
        const { error } = await supabase.from('profiles').update({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone || null,
          department: profileData.department,
          student_phone: profileData.student_phone || null,
          parent_phone: profileData.parent_phone || null,
          sem: profileData.sem ? Number(profileData.sem) : null,
          blood_group: profileData.blood_group || null,
          batch: profileData.batch || null,
          program: profileData.program || null,
          date_of_birth: profileData.date_of_birth || null,
          year: profileData.year ? Number(profileData.year) : null,
          section: profileData.section || null,
          proctor_or_mentor: profileData.proctor_or_mentor || null,
          gender: profileData.gender || null,
          updated_at: new Date().toISOString()
        }).eq('id', user.id);

        if (error) throw error;
      }

      // Sync updated data back to parent App state
      if (onProfileUpdate) {
        onProfileUpdate({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone || undefined,
          department: profileData.department || undefined,
          student_phone: profileData.student_phone || undefined,
          parent_phone: profileData.parent_phone || undefined,
          sem: profileData.sem ? Number(profileData.sem) : undefined,
          blood_group: profileData.blood_group || undefined,
          batch: profileData.batch || undefined,
          program: profileData.program || undefined,
          date_of_birth: profileData.date_of_birth || undefined,
          year: profileData.year ? Number(profileData.year) : undefined,
          section: profileData.section || undefined,
          proctor_or_mentor: profileData.proctor_or_mentor || undefined,
          gender: profileData.gender || undefined,
          updated_at: new Date().toISOString(),
        });
      }

      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSuccessMsg("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const newPassword = formData.get('newPassword') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setSuccessMsg("Passwords do not match");
        setIsUpdating(false);
        return;
      }

      // Validate password strength
      if (newPassword.length < 6) {
        setSuccessMsg("Password must be at least 6 characters");
        setIsUpdating(false);
        return;
      }

      if (isSupabaseConfigured && user?.id) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
      }

      setShowPasswordModal(false);
      setSuccessMsg("Password changed successfully!");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setSuccessMsg("Failed to change password");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-slate-500 text-sm">Manage your personal information and preferences.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        {successMsg && (
          <div className="fixed top-24 right-8 z-[60] bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-right-10 duration-300">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-700">{successMsg}</p>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-10 p-1 bg-white rounded-[2.5rem]">
            <div className="relative group">
              <img src={user.avatar || "https://picsum.photos/seed/user/200"} className="w-32 h-32 rounded-[2.2rem] object-cover" />
              <button className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-[2.2rem] opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-10 px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900">{user.name}</h3>
              <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">{user.role} • {user.student_id || user.faculty_id || '-'}</p>
            </div>
            <button 
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-black text-slate-800 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-500" /> Personal Details
          </h4>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{user.email}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <input 
                  placeholder="+1 (555) 000-0000" 
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  className="bg-transparent border-none outline-none text-sm font-bold w-full" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{user.department || 'N/A'}</span>
              </div>
            </div>

            {user.role === 'STUDENT' && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider">Student Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Student Phone" value={profileData.student_phone} onChange={(e) => setProfileData({ ...profileData, student_phone: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Parent Phone" value={profileData.parent_phone} onChange={(e) => setProfileData({ ...profileData, parent_phone: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Semester" type="number" value={profileData.sem} onChange={(e) => setProfileData({ ...profileData, sem: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Blood Group" value={profileData.blood_group} onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Batch" value={profileData.batch} onChange={(e) => setProfileData({ ...profileData, batch: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Program" value={profileData.program} onChange={(e) => setProfileData({ ...profileData, program: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Year" type="number" value={profileData.year} onChange={(e) => setProfileData({ ...profileData, year: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Section" value={profileData.section} onChange={(e) => setProfileData({ ...profileData, section: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Proctor / Mentor" value={profileData.proctor_or_mentor} onChange={(e) => setProfileData({ ...profileData, proctor_or_mentor: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Gender" value={profileData.gender} onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Date of Birth" type="date" value={profileData.date_of_birth} onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl md:col-span-2" />
                </div>
              </div>
            )}

            {(user.role === 'FACULTY' || user.role === 'HOD') && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider">Faculty Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Faculty Phone" value={profileData.student_phone} onChange={(e) => setProfileData({ ...profileData, student_phone: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Blood Group" value={profileData.blood_group} onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Batch" value={profileData.batch} onChange={(e) => setProfileData({ ...profileData, batch: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Program" value={profileData.program} onChange={(e) => setProfileData({ ...profileData, program: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Semester" type="number" value={profileData.sem} onChange={(e) => setProfileData({ ...profileData, sem: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Gender" value={profileData.gender} onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Mentor / Proctor" value={profileData.proctor_or_mentor} onChange={(e) => setProfileData({ ...profileData, proctor_or_mentor: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                  <input placeholder="Date of Birth" type="date" value={profileData.date_of_birth} onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" /> Security & Access
          </h4>
          <div className="space-y-3">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Change Password</p>
                  <p className="text-[10px] text-slate-500">Update your account password</p>
                </div>
              </div>
              <Info className="w-4 h-4 text-slate-300" />
            </button>
            <button onClick={() => { setSuccessMsg('Notification preferences coming soon!'); setTimeout(() => setSuccessMsg(''), 3000); }} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Notification Prefs</p>
                  <p className="text-[10px] text-slate-500">Manage email alerts</p>
                </div>
              </div>
              <Info className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <input type="password" name="currentPassword" required className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <input type="password" name="newPassword" required className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <input type="password" name="confirmPassword" required className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <button 
                type="submit" 
                disabled={isUpdating}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 mt-4 flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Account"}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;
