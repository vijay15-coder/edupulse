
import React from 'react';
import { UserRole, User, Course, Notification, AttendanceRecord, Grade, Subject, Assignment } from '../types';
import StatCard from '../components/StatCard';
import { 
  Users, BookOpen, Clock, Calendar, CheckSquare, BarChart3, 
  TrendingUp, Award, MapPin, ClipboardList, Bell, User as UserIcon,
  ChevronRight, Book, CreditCard, PieChart as PieIcon, ArrowLeft
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';

interface DashboardProps {
  user: User;
  courses: Course[];
  users: User[];
  subjects: Subject[];
  assignments: Assignment[];
  notifications: Notification[];
  attendance: AttendanceRecord[];
  grades: Grade[];
  setActiveTab?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  courses,
  users,
  subjects,
  assignments,
  notifications,
  attendance,
  grades,
  setActiveTab
}) => {
  const facultySubjects = subjects.filter(subject => subject.faculty_id === user.id);
  const facultySubjectIds = new Set(facultySubjects.map(subject => subject.id));
  const facultyCourseIds = new Set(facultySubjects.map(subject => subject.course_id));
  const facultyStudentIds = new Set(
    attendance
      .filter(record => facultySubjectIds.has(record.subject_id))
      .map(record => record.student_id)
  );
  const facultyStudentsCount = facultyStudentIds.size;
  const fallbackStudentsCount = users.filter(
    rosterUser => rosterUser.role === UserRole.STUDENT && rosterUser.college_id === user.college_id
  ).length;
  const pendingAssignmentsCount = assignments.filter(assignment => (
    facultySubjectIds.has(assignment.subject_id)
  )).length;

  const todayScheduleTimes = [
    '08:45 AM - 09:45 AM',
    '09:45 AM - 10:35 AM',
    '10:35 AM - 11:25 AM',
    '11:25 AM - 12:15 PM',
    '01:05 PM - 01:55 PM',
    '01:55 PM - 02:45 PM',
    '02:45 PM - 03:35 PM',
  ];

  const todayScheduleSource = facultySubjects.length > 0
    ? facultySubjects
    : subjects.length > 0
    ? subjects
    : courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.code,
      }));

  const todayScheduleItems = (todayScheduleSource.length > 0
    ? todayScheduleSource
    : [{ id: 'fallback', name: 'Class Session', code: 'GEN' }])
    .slice(0, todayScheduleTimes.length)
    .map((item: any, index: number) => ({
      id: item.id,
      title: item.name,
      code: item.code || 'GEN',
      timeRange: todayScheduleTimes[index],
      room: `Hall ${10 + index}`,
      label: 'Class',
    }));
  
  const renderAdminDashboard = () => {
    // 1. Calculate Real User Distribution
    const studentCount = users.filter(u => u.role === UserRole.STUDENT).length;
    const facultyCount = users.filter(u => u.role === UserRole.FACULTY).length;
    const staffCount = users.filter(u => [UserRole.COLLEGE_ADMIN, UserRole.SUPERADMIN, UserRole.HOD].includes(u.role)).length;
    
    const pieData = [
      { name: 'Students', value: studentCount, fill: '#6366f1' },
      { name: 'Faculty', value: facultyCount, fill: '#a78bfa' },
      { name: 'Staff', value: staffCount, fill: '#fbbf24' },
    ].filter(segment => segment.value > 0);

    // 2. Calculate Enrollments by Department
    const departmentCounts: Record<string, number> = {};
    users.forEach(u => {
      if (u.role === UserRole.STUDENT && u.department) {
        departmentCounts[u.department] = (departmentCounts[u.department] || 0) + 1;
      }
    });
    
    // Sort departments by enrollment and take top 5 for the chart
    let enrollmentData = Object.keys(departmentCounts).map(dept => ({
      name: dept,
      value: departmentCounts[dept]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // If no students yet exist, provide an empty state structure so the chart doesn't break
    if (enrollmentData.length === 0) {
      enrollmentData = [{ name: 'No Data', value: 0 }];
    }

    // 3. Overall Average Attendance
    const totalAttendanceRecords = attendance.filter(a => a.status !== 'LATE').length;
    const presentRecords = attendance.filter(a => a.status === 'PRESENT').length;
    const overallAttendanceAvg = totalAttendanceRecords > 0 ? ((presentRecords / totalAttendanceRecords) * 100).toFixed(1) : "0.0";

    // 4. Transform attendance into an Area Chart trend over time instead of mock Fee data
    // Group records by Date -> Calculate % per day
    const recordsByDate: Record<string, { total: number, present: number }> = {};
    attendance.forEach(a => {
      if (a.date && a.status !== 'LATE') {
        if (!recordsByDate[a.date]) {
          recordsByDate[a.date] = { total: 0, present: 0 };
        }
        recordsByDate[a.date].total++;
        if (a.status === 'PRESENT') {
          recordsByDate[a.date].present++;
        }
      }
    });

    const attendanceTrendData = Object.keys(recordsByDate)
      .sort() // chronological
      .slice(-7) // take last 7 distinct days
      .map(date => {
        const day = recordsByDate[date];
        const percentage = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
        // Keep date format short e.g "Mar 15"
        const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { 
          date: formattedDate, 
          attendance: percentage 
        };
      });

    const isAttendanceDataEmpty = attendanceTrendData.length === 0;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 px-6">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          <StatCard title="Total Students" value={studentCount.toLocaleString()} icon={Users} color="bg-indigo-600" />
          <StatCard title="Active Faculty" value={facultyCount.toLocaleString()} icon={UserIcon} color="bg-violet-600" />
          <StatCard title="Total Courses" value={courses.length.toLocaleString()} icon={BookOpen} color="bg-emerald-600" />
          <StatCard title="Avg Attendance" value={`${overallAttendanceAvg}%`} icon={CheckSquare} color="bg-amber-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Overall Attendance Trend</h3>
                <p className="text-sm text-slate-500">Daily average attendance across the college</p>
              </div>
            </div>
            <div className="h-48 sm:h-56 lg:h-72 min-h-[200px] w-full relative">
              {isAttendanceDataEmpty ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No recent attendance data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={attendanceTrendData}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} minTickGap={20} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                      formatter={(value: number) => [`${value}%`, 'Attendance']}
                    />
                    <Area type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-6">User Distribution</h3>
            <div className="h-48 sm:h-56 lg:h-64 min-h-[250px] relative w-full">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-800">{users.length.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Users</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Enrollment by Department</h3>
          </div>
          <div className="h-48 sm:h-56 lg:h-64 min-h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {enrollmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a78bfa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderFacultyDashboard = () => (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        <StatCard title="My Courses" value={facultyCourseIds.size} icon={BookOpen} color="bg-indigo-500" />
        <StatCard title="Total Students" value={facultyStudentsCount || fallbackStudentsCount} icon={Users} color="bg-emerald-500" />
        <StatCard title="Pending Assignments" value={pendingAssignmentsCount} icon={Clock} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm min-w-0">
          <h3 className="text-lg sm:text-xl font-bold mb-6 text-slate-800">Today's Schedule</h3>
          <div className="space-y-4">
            {todayScheduleItems.length > 0 ? todayScheduleItems.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="text-xs font-bold text-indigo-600 tracking-wide">{item.code}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[220px]">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-black text-slate-900">{item.timeRange}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 sm:justify-end">
                      <MapPin className="w-3 h-3" /> {item.room}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-700 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-sm italic">No classes today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudentDashboard = () => {
    const studentAttendance = attendance.filter(a => a.student_id === user.id);
    const attendancePercentage = Math.round((studentAttendance.filter(a => a.status === 'PRESENT').length / Math.max(1, studentAttendance.length)) * 100) || 0;
    const gpa = grades.length > 0 ? (grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length / 25).toFixed(2) : "0.00";

    return (
      <div className="space-y-8 animate-in fade-in duration-500 min-w-0">
        <div className="relative overflow-hidden bg-indigo-600 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-indigo-100">
          <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="relative shrink-0">
              <img src={user.avatar || "https://picsum.photos/seed/student/200"} alt="Profile" className="w-20 sm:w-24 h-20 sm:h-24 rounded-2xl sm:rounded-3xl border-4 border-white/20 object-cover shadow-lg" />
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight truncate">Welcome back, {user.name}!</h2>
              <p className="text-indigo-100 mt-1 font-medium flex items-center justify-center sm:justify-start gap-2 text-sm flex-wrap">
                <MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{user.department} | ID: {user.studentId}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Student Panel</h3>
              <p className="text-sm text-slate-500">Open your preparation module.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab?.('attendance')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Attendance</p>
              <p className="text-xs text-slate-500 mt-1">View subject-wise present/absent records.</p>
            </button>

            <button
              onClick={() => setActiveTab?.('student-internships')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Internships</p>
              <p className="text-xs text-slate-500 mt-1">Internship opportunities and applications.</p>
            </button>

            <button
              onClick={() => setActiveTab?.('student-placement-preparation')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Placement Preparation</p>
              <p className="text-xs text-slate-500 mt-1">Aptitude, coding, and interview readiness.</p>
            </button>

            <button
              onClick={() => setActiveTab?.('student-government-exams')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Government Exams</p>
              <p className="text-xs text-slate-500 mt-1">Track preparation for public sector exams.</p>
            </button>

            <button
              onClick={() => setActiveTab?.('student-target-attendance')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Target Attendance</p>
              <p className="text-xs text-slate-500 mt-1">Set and monitor your attendance goal for this semester.</p>
            </button>

            <button
              onClick={() => setActiveTab?.('student-target-cgpa')}
              className="p-4 rounded-xl border text-left transition border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">Target CGPA</p>
              <p className="text-xs text-slate-500 mt-1">Plan the SGPA needed to reach your desired CGPA.</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard title="Overall Attendance" value={`${attendancePercentage}%`} icon={CheckSquare} color="bg-indigo-500" trend="On track" trendUp={true} />
          <StatCard title="Current GPA" value={gpa} icon={Award} color="bg-emerald-500" trendUp={true} />
          <StatCard title="Completed Credits" value="12/18" icon={BarChart3} color="bg-violet-500" />
          <StatCard title="Courses Enrolled" value={courses.length} icon={BookOpen} color="bg-sky-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
               <div className="flex justify-between items-center mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">Academic Performance</h3>
               </div>
              <div className="h-60 min-h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={grades.length > 0 ? grades : [{type: 'N/A', score: 0}]}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{fontSize: 12, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                      />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 min-w-0">
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
               <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-6">Notifications</h3>
               <div className="space-y-4">
                  {notifications.slice(0, 3).map(n => (
                    <div key={n.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{n.message}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto min-w-0 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Hello, {user.name.split(' ')[0]} 👋</h2>
        <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Here's your college overview for today.</p>
      </div>

      {(user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.SUPERADMIN) && renderAdminDashboard()}
      {user.role === UserRole.FACULTY && renderFacultyDashboard()}
      {user.role === UserRole.STUDENT && renderStudentDashboard()}
    </div>
  );
};

export default Dashboard;
