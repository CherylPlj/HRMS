import React, { useState, useEffect } from "react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaUserTie, 
  FaUserClock, 
  FaHistory,
  FaUserCheck,
  FaClock,
  FaGraduationCap,
  FaBriefcase
} from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface User {
  UserID: string;
  Status: string;
  LastLogin: string;
  isDeleted: string;
  Role?: {
    role: {
      name: string;
    };
  }[];
}

interface Faculty {
  FacultyID: number;
  Contract?: {
    ContractType: string;
  };
  User?: User;
}

interface Department {
  DepartmentName: string;
  Faculty?: Faculty[];
}

export default function DashboardContent() {
  const { user } = useUser();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setDate(1)), // First day of current month
    new Date(), // Today
  ]);
  const [facultyStats, setFacultyStats] = useState({
    total: 0,
    regular: 0,
    probationary: 0,
  });
  const [activeUsers, setActiveUsers] = useState({
    faculty: 0,
    admin: 0,
    total: 0,
  });
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
    late: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<Record<string, number>>({});
  const [monthlyAttendance, setMonthlyAttendance] = useState<number[]>([]);
  const [leaveRequests, setLeaveRequests] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  interface Log {
    LogID: number;
    UserID: string;
    ActionType: string;
    EntityAffected: string;
    ActionDetails: string;
    Timestamp: string;
    User: {
      FirstName: string;
      LastName: string;
    };
  }

  const [logs, setLogs] = useState<Log[]>([]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange([start, end]);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all data in parallel
        const [facultyResponse, departmentResponse, usersResponse, attendanceResponse, leaveResponse] = await Promise.all([
          // Faculty Stats - Optimized query
          supabase
            .from("Faculty")
            .select(`
              FacultyID,
              Contract (ContractType),
              User:UserID (UserID, isDeleted, Status)
            `)
            .eq('User.isDeleted', false),

          // Department Stats - Optimized query
          supabase
            .from("Department")
            .select(`
              DepartmentName,
              Faculty!inner (
                FacultyID,
                User:UserID!inner (
                  UserID,
                  isDeleted
                )
              )
            `)
            .eq('Faculty.User.isDeleted', false),

          // Active Users - Optimized query
          supabase
            .from("User")
            .select(`
              UserID,
              Status,
              LastLogin,
              UserRole!inner (
                role:Role (name)
              )
            `)
            .eq("Status", "Active")
            .eq("isDeleted", false),

          // Attendance Data - Optimized query with date range
          supabase
            .from("Attendance")
            .select('Status')
            .gte('Date', dateRange[0].toISOString().split('T')[0])
            .lte('Date', dateRange[1].toISOString().split('T')[0]),

          // Leave Requests - Optimized query
          supabase
            .from("Leave")
            .select('Status')
            .gte('StartDate', dateRange[0].toISOString().split('T')[0])
            .lte('EndDate', dateRange[1].toISOString().split('T')[0])
        ]);

        // Process faculty stats
        const faculty = facultyResponse.data || [];
        const regularCount = faculty.filter((f) => f.Contract?.ContractType === "Full_Time").length;
        const probationaryCount = faculty.filter((f) => f.Contract?.ContractType === "Probationary").length;

        setFacultyStats({
          total: faculty.length,
          regular: regularCount,
          probationary: probationaryCount,
        });

        // Process department stats
        const departments = departmentResponse.data || [];
        const deptStats: Record<string, number> = {};
        departments.forEach((dept) => {
          deptStats[dept.DepartmentName] = dept.Faculty?.length || 0;
        });
        setDepartmentStats(deptStats);

        // Process active users
        const users = usersResponse.data || [];
        const facultyUsers = users.filter(u => u.UserRole?.some(r => r.role.name === "faculty")).length;
        const adminUsers = users.filter(u => u.UserRole?.some(r => r.role.name === "admin")).length;
        
        setActiveUsers({
          faculty: facultyUsers,
          admin: adminUsers,
          total: users.length,
        });

        // Process attendance data
        const attendance = attendanceResponse.data || [];
        setAttendanceData({
          present: attendance.filter(a => a.Status === "Present").length,
          absent: attendance.filter(a => a.Status === "Absent").length,
          late: attendance.filter(a => a.Status === "Late").length,
        });

        // Process leave requests
        const leaves = leaveResponse.data || [];
        setLeaveRequests({
          pending: leaves.filter(l => l.Status === "Pending").length,
          approved: leaves.filter(l => l.Status === "Approved").length,
          rejected: leaves.filter(l => l.Status === "Rejected").length,
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  // Separate effect for logs which don't need to update as frequently
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data: logs } = await supabase
          .from("ActivityLog")
          .select(`
            LogID,
            UserID,
            ActionType,
            EntityAffected,
            ActionDetails,
            Timestamp,
            User (FirstName, LastName)
          `)
          .order('Timestamp', { ascending: false })
          .limit(10);

        setLogs(logs || []);
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs();
  }, []);

  const departmentData = {
    labels: Object.keys(departmentStats),
    datasets: [
      {
        label: "Faculty by Department",
        data: Object.values(departmentStats),
        backgroundColor: ["#800000", "#9C27B0", "#2196F3", "#FF9800"],
      },
    ],
  };

  const monthlyAttendanceData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Monthly Attendance Rate (%)",
        data: monthlyAttendance,
        borderColor: "#800000",
        tension: 0.4,
        fill: false,
      },
    ],
  };

  return (
    <div className="p-8 w-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Filter by Date Range</label>
            <DatePicker
              selected={dateRange[0]}
              onChange={handleDateChange}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              selectsRange
              dateFormat="yyyy-MM-dd"
              customInput={
                <button className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-300">
                  <FaCalendarAlt className="mr-2 text-[#800000]" />
                  {dateRange[0]
                    ? `${dateRange[0].toLocaleDateString()} - ${
                        dateRange[1]?.toLocaleDateString() || ""
                      }`
                    : "Select Date Range"}
                </button>
              }
              className="w-full"
              maxDate={new Date()}
              placeholderText="Select date range"
            />
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange([firstDayOfMonth, today]);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-[#800000] transition-colors duration-300"
            >
              This Month
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                setDateRange([firstDayOfYear, today]);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-[#800000] transition-colors duration-300"
            >
              This Year
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Showing data from {dateRange[0].toLocaleDateString()} to {dateRange[1].toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Faculty</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{facultyStats.total}</h3>
            </div>
            <FaUsers className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
        {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Present Today</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{attendanceData.present}</h3>
            </div>
            <FaUserCheck className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div> */}
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Leaves</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveRequests.pending}</h3>
            </div>
            <FaClock className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Users</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{activeUsers.total}</h3>
            </div>
            <FaUserTie className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaGraduationCap className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Faculty Overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{facultyStats.regular}</p>
              <p className="text-gray-600 font-medium">Regular Faculty</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{facultyStats.probationary}</p>
              <p className="text-gray-600 font-medium">Probationary</p>
            </div>
          </div>
          <div className="mt-6">
            <Bar data={departmentData} options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              }
            }} />
          </div>
        </div>
{/*  Attendance Overview
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaUserClock className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Attendance Overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{attendanceData.absent}</p>
              <p className="text-gray-600 font-medium">Absent</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{attendanceData.late}</p>
              <p className="text-gray-600 font-medium">Late</p>
            </div>
          </div>
          <div className="h-[200px]">
            <Line data={monthlyAttendanceData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              }
            }} />
          </div>
        </div> */}

        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaBriefcase className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Leave/Undertime Requests</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{leaveRequests.pending}</p>
              <p className="text-gray-600 font-medium">Pending</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{leaveRequests.approved}</p>
              <p className="text-gray-600 font-medium">Approved</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-2">{leaveRequests.rejected}</p>
              <p className="text-gray-600 font-medium">Rejected</p>
            </div>
          </div>
        </div>
{/* ACtivity Logs
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaHistory className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Recent Activity Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.User.FirstName} {log.User.LastName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.ActionType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(log.Timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>  */}
      </div>
    </div>
  );
}