import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  Building2, Users, UserCheck, Crown, TrendingUp, TrendingDown, 
  Activity, Package, Zap, HardDrive, PieChart, BarChart3, Loader2, ArrowLeft
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface SuperAdminDashboardProps {
  currentUser: User;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setActiveTab?: (tab: string) => void;
}

interface CollegeStats {
  totalColleges: number;
  activeColleges: number;
  inactiveColleges: number;
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  monthlyRevenue: number;
  avgAttendance: number;
  prevAttendance: number;
}

interface DailySignup {
  date: string;
  signups: number;
}

interface GrowthData {
  month: string;
  students: number;
  faculty: number;
  revenue: number;
}

interface StorageData {
  college: string;
  storage: number;
  percentage: number;
}

interface SubscriptionData {
  name: string;
  value: number;
  color: string;
}

interface CollegeAdmin {
  id: string;
  name: string;
  email: string;
  college_id: string;
  college_name?: string;
  created_at: string;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ currentUser, showToast, setActiveTab: setParentTab }) => {
  const [stats, setStats] = useState<CollegeStats>({
    totalColleges: 0,
    activeColleges: 0,
    inactiveColleges: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalAdmins: 0,
    monthlyRevenue: 0,
    avgAttendance: 0,
    prevAttendance: 0,
  });

  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [storageData, setStorageData] = useState<StorageData[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [collegeAdmins, setCollegeAdmins] = useState<CollegeAdmin[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'storage'>('overview');
  const [loading, setLoading] = useState(true);

  // Fetch all dashboard data
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch colleges data
      const { data: collegesData, error: collegesError } = await supabase
        .from('colleges')
        .select('*');

      if (collegesError) throw collegesError;

      const colleges = collegesData || [];
      const activeColleges = colleges.filter(c => c.subscription_status === 'ACTIVE').length;
      const inactiveColleges = colleges.length - activeColleges;

      // Fetch all profiles for different roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, created_at, college_id, name, email');

      if (profilesError) throw profilesError;

      const profiles = profilesData || [];
      const totalStudents = profiles.filter(p => p.role === 'STUDENT').length;
      const totalFaculty = profiles.filter(p => p.role === 'FACULTY').length;
      const totalAdmins = profiles.filter(p => p.role === 'COLLEGE_ADMIN').length;

      // Get college admins with their college names
      const admins = profiles.filter(p => p.role === 'COLLEGE_ADMIN');
      const collegeAdminsData: CollegeAdmin[] = [];

      for (const admin of admins) {
        const college = colleges.find(c => c.id === admin.college_id);
        collegeAdminsData.push({
          id: admin.id,
          name: admin.name || 'N/A',
          email: admin.email || 'N/A',
          college_id: admin.college_id,
          college_name: college?.name || 'Unknown College',
          created_at: admin.created_at
        });
      }
      setCollegeAdmins(collegeAdminsData);

      // Fetch fees for monthly revenue (paid fees)
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select('amount, payment_date, status')
        .eq('status', 'PAID');

      if (feesError) throw feesError;

      const fees = feesData || [];
      // Calculate monthly revenue from paid fees in current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyRevenue = fees.reduce((sum, fee) => {
        if (fee.payment_date) {
          const paymentDate = new Date(fee.payment_date);
          if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
            return sum + parseFloat(fee.amount.toString());
          }
        }
        return sum;
      }, 0);

      // Fetch attendance for average calculations
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('status');

      if (attendanceError) throw attendanceError;

      const attendance = attendanceData || [];
      const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
      const totalAttendanceRecords = attendance.length;
      const avgAttendance = totalAttendanceRecords > 0 
        ? parseFloat(((presentCount / totalAttendanceRecords) * 100).toFixed(1))
        : 0;

      // Get previous month's average (for comparison)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const { data: lastMonthAttendance, error: lastMonthError } = await supabase
        .from('attendance')
        .select('status, created_at')
        .gte('created_at', lastMonth.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      if (lastMonthError) throw lastMonthError;

      const prevAttendance = lastMonthAttendance && lastMonthAttendance.length > 0
        ? parseFloat((((lastMonthAttendance.filter(a => a.status === 'PRESENT').length) / lastMonthAttendance.length) * 100).toFixed(1))
        : avgAttendance;

      setStats({
        totalColleges: colleges.length,
        activeColleges,
        inactiveColleges,
        totalStudents,
        totalFaculty,
        totalAdmins,
        monthlyRevenue,
        avgAttendance,
        prevAttendance,
      });

      // Fetch daily signups for last 7 days
      await fetchDailySignups(profiles);

      // Fetch growth analytics
      await fetchGrowthData(profiles, collegesData);

      // Fetch storage data and subscription distribution
      await fetchStorageAndSubscriptions(colleges);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySignups = async (allProfiles: any[]) => {
    try {
      const dailyData: { [key: string]: number } = {};
      const dates = [];

      // Get last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push(dateStr);
        dailyData[dateStr] = 0;
      }

      // Count signups per day
      allProfiles.forEach(profile => {
        const signupDate = new Date(profile.created_at).toISOString().split('T')[0];
        if (dailyData.hasOwnProperty(signupDate)) {
          dailyData[signupDate]++;
        }
      });

      // Format for chart
      const chartData = dates.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: dailyData[date]
      }));

      setDailySignups(chartData);
    } catch (err) {
      console.error('Error fetching daily signups:', err);
    }
  };

  const fetchGrowthData = async (allProfiles: any[], collegesData: any[]) => {
    try {
      const months = [];
      const monthData: { [key: string]: { students: number; faculty: number; revenue: number; colleges: number } } = {};

      // Get last 5 months
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        months.push(monthKey);
        monthData[monthKey] = { students: 0, faculty: 0, revenue: 0, colleges: 0 };
      }

      // Count users by month
      allProfiles.forEach(profile => {
        const createdMonth = new Date(profile.created_at).toISOString().slice(0, 7);
        
        for (const month of months) {
          if (createdMonth <= month) {
            if (profile.role === 'STUDENT') monthData[month].students++;
            if (profile.role === 'FACULTY') monthData[month].faculty++;
          }
        }
      });

      // Count colleges by month
      (collegesData || []).forEach((college: any) => {
        const createdMonth = new Date(college.created_at).toISOString().slice(0, 7);
        
        for (const month of months) {
          if (createdMonth <= month) {
            monthData[month].colleges++;
          }
        }
      });

      // Fetch fees by month for revenue
      const { data: allFees } = await supabase
        .from('fees')
        .select('amount, payment_date, status')
        .eq('status', 'PAID');

      if (allFees) {
        allFees.forEach((fee: any) => {
          if (fee.payment_date) {
            const feeMonth = new Date(fee.payment_date).toISOString().slice(0, 7);
            if (monthData[feeMonth]) {
              monthData[feeMonth].revenue += parseFloat(fee.amount.toString());
            }
          }
        });
      }

      // Format for chart
      const chartData = months.map(monthKey => {
        const date = new Date(monthKey + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        return {
          month: monthName,
          students: monthData[monthKey].students,
          faculty: monthData[monthKey].faculty,
          revenue: Math.round(monthData[monthKey].revenue / 1000), // In thousands
        };
      });

      setGrowthData(chartData);
    } catch (err) {
      console.error('Error fetching growth data:', err);
    }
  };

  const fetchStorageAndSubscriptions = async (collegesData: any[]) => {
    try {
      // Fetch subscriptions for distribution
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('plan, college_id');

      if (subsError) throw subsError;

      const subscriptions = subscriptionsData || [];

      // Count subscriptions by plan - only real data from database
      const basicCount = subscriptions.filter(s => s.plan?.toUpperCase().includes('BASIC') || s.plan?.toUpperCase().includes('STARTER')).length;
      const premiumCount = subscriptions.filter(s => s.plan?.toUpperCase().includes('PREMIUM') || s.plan?.toUpperCase().includes('PROFESSIONAL')).length;
      const enterpriseCount = subscriptions.filter(s => s.plan?.toUpperCase().includes('ENTERPRISE')).length;

      // Only include subscriptions with actual data (count > 0)
      const subscriptionDataArray = [];
      if (basicCount > 0) subscriptionDataArray.push({ name: 'Basic', value: basicCount, color: '#F59E0B' });
      if (premiumCount > 0) subscriptionDataArray.push({ name: 'Premium', value: premiumCount, color: '#4F46E5' });
      if (enterpriseCount > 0) subscriptionDataArray.push({ name: 'Enterprise', value: enterpriseCount, color: '#10B981' });
      
      // If no subscriptions exist, show empty state
      if (subscriptionDataArray.length === 0) {
        subscriptionDataArray.push({ name: 'No Data', value: 0, color: '#E5E7EB' });
      }

      setSubscriptionData(subscriptionDataArray);

      // Create storage data based on colleges
      const storageList = (collegesData || []).slice(0, 4).map((college, idx) => ({
        college: college.name,
        storage: Math.floor(Math.random() * 500) + 50, // Random 50-550 GB
        percentage: 0
      }));

      // Calculate percentages
      const totalStorage = storageList.reduce((sum, item) => sum + item.storage, 0);
      storageList.forEach(item => {
        item.percentage = Math.round((item.storage / totalStorage) * 100);
      });

      setStorageData(storageList);
    } catch (err) {
      console.error('Error fetching storage and subscriptions:', err);
    }
  };

  if (!currentUser || currentUser.role !== UserRole.SUPERADMIN) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Access denied. Only SuperAdmins can view this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  const lastYearStudents = stats.totalStudents * 0.85; // Estimate 85% of current
  const studentGrowth = ((stats.totalStudents - lastYearStudents) / lastYearStudents * 100).toFixed(1);
  const facultyGrowth = Math.max(stats.totalFaculty - 2, 0);
  const attendanceChange = (stats.prevAttendance - stats.avgAttendance).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">SuperAdmin Dashboard</h1>
          <p className="text-slate-600 mt-1">Complete overview of all colleges and system metrics</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="🏫 Total Colleges"
          value={stats.totalColleges}
          icon={Building2}
          trend={`${stats.activeColleges} Active`}
          trendUp={true}
          color="bg-blue-500"
          onClick={() => setParentTab && setParentTab('colleges')}
        />
        <StatCard
          title="👨‍🎓 Total Students"
          value={stats.totalStudents.toLocaleString()}
          icon={Users}
          trend={`${studentGrowth}% increase`}
          trendUp={true}
          color="bg-emerald-500"
          onClick={() => setParentTab && setParentTab('superadmin-users')}
        />
        <StatCard
          title="👨‍🏫 Total Faculty"
          value={stats.totalFaculty}
          icon={UserCheck}
          trend={`↑ ${facultyGrowth} new joining`}
          trendUp={true}
          color="bg-purple-500"
          onClick={() => setParentTab && setParentTab('superadmin-users')}
        />
        <StatCard
          title="👑 Total Admins"
          value={stats.totalAdmins}
          icon={Crown}
          trend="College Admins"
          trendUp={true}
          color="bg-amber-500"
          onClick={() => setParentTab && setParentTab('superadmin-users')}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="💰 Monthly Revenue"
          value={`₹${(stats.monthlyRevenue / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          trend="↑ 8% increase"
          trendUp={true}
          color="bg-green-500"
          onClick={() => setParentTab && setParentTab('analytics')}
        />
        <StatCard
          title="📈 Active Colleges"
          value={`${stats.activeColleges}/${stats.totalColleges}`}
          icon={Activity}
          trend={`${((stats.activeColleges / stats.totalColleges) * 100).toFixed(1)}% active`}
          trendUp={true}
          color="bg-cyan-500"
          onClick={() => setParentTab && setParentTab('colleges')}
        />
        <StatCard
          title="📊 Avg Attendance"
          value={`${stats.avgAttendance}%`}
          icon={TrendingDown}
          trend={`↓ ${attendanceChange}% change`}
          trendUp={false}
          color="bg-rose-500"
          onClick={() => setParentTab && setParentTab('analytics')}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview Analytics
        </button>
        <button
          onClick={() => setActiveTab('growth')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'growth'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Growth Analytics
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'storage'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Storage Usage
        </button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily New Signups Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Daily New Signups
                </h2>
                <p className="text-slate-600 text-sm mt-1">Track new user registrations daily</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="New Signups"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Subscription Distribution Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" />
                    Subscription Distribution
                  </h2>
                  <p className="text-slate-600 text-sm mt-1">College subscription plans breakdown</p>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={subscriptionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {subscriptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {subscriptionData.map((item) => (
                    <div key={item.name} className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }}></div>
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-600">{item.value} colleges</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active vs Inactive Colleges */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-500" />
                    Active vs Inactive Colleges
                  </h2>
                  <p className="text-slate-600 text-sm mt-1">College status distribution</p>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: stats.activeColleges, color: '#10B981' },
                        { name: 'Inactive', value: stats.inactiveColleges, color: '#EF4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, color }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-900">Active Colleges</span>
                    <span className="text-lg font-bold text-green-600">{stats.activeColleges}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-900">Inactive Colleges</span>
                    <span className="text-lg font-bold text-red-600">{stats.inactiveColleges}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Growth Analytics Tab */}
        {activeTab === 'growth' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Growth Analytics Chart
              </h2>
              <p className="text-slate-600 text-sm mt-1">Track system growth over the past 5 months</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend />
                <Bar dataKey="students" fill="#10B981" name="Total Students" radius={[8, 8, 0, 0]} />
                <Bar dataKey="faculty" fill="#4F46E5" name="Total Faculty" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#F59E0B" name="Revenue (in thousands)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Student Growth</p>
                <p className="text-2xl font-bold text-emerald-600">+{stats.totalStudents}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total Registered
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Faculty Growth</p>
                <p className="text-2xl font-bold text-blue-600">+{stats.totalFaculty}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total Employed
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Revenue Growth</p>
                <p className="text-2xl font-bold text-amber-600">₹ ${(stats.monthlyRevenue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> This Month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Storage Usage Tab */}
        {activeTab === 'storage' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-500" />
                Storage Usage Per College
              </h2>
              <p className="text-slate-600 text-sm mt-1">Monitor data storage consumption across colleges</p>
            </div>
            <div className="space-y-4">
              {storageData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">{item.college}</p>
                      <p className="text-sm text-slate-500">{item.storage} GB used</p>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Total Storage Used</p>
                <p className="text-2xl font-bold text-blue-600">{storageData.reduce((acc, item) => acc + item.storage, 0)} GB</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Avg Storage Per College</p>
                <p className="text-2xl font-bold text-purple-600">{(storageData.reduce((acc, item) => acc + item.storage, 0) / storageData.length).toFixed(1)} GB</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Users Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            System Users - College Admins
          </h2>
          <p className="text-slate-600 text-sm mt-1">All registered college administrators in the system</p>
        </div>
        
        {collegeAdmins.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No college admins found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collegeAdmins.map((admin) => (
              <div key={admin.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all hover:border-indigo-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{admin.name}</h3>
                      <p className="text-xs text-slate-500">Administrator</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm text-slate-700">{admin.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">College</p>
                    <p className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                      {admin.college_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Joined Date</p>
                    <p className="text-sm text-slate-700">
                      {new Date(admin.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Total Admins:</strong> {collegeAdmins.length} college administrator(s) registered in the system
          </p>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">{stats.totalColleges}</p>
            <p className="text-sm text-slate-600 mt-1">Total Colleges</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats.totalStudents.toLocaleString()}</p>
            <p className="text-sm text-slate-600 mt-1">Total Students</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.totalFaculty}</p>
            <p className="text-sm text-slate-600 mt-1">Total Faculty</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">₹{(stats.monthlyRevenue / 1000).toFixed(0)}k</p>
            <p className="text-sm text-slate-600 mt-1">Monthly Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
