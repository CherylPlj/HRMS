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
        // Fetch Faculty Stats
        const { data: faculty, error: facultyError } = await supabase
          .from("Faculty")
          .select(`
            *,
            Contract (
              ContractType
            ),
            User:UserID (
              UserID,
              isDeleted,
              Status
            )
          `) as { data: Faculty[] | null, error: any };

        if (facultyError) {
          console.error("Faculty fetch error:", facultyError.message || facultyError);
          throw facultyError;
        }

        console.log('Raw faculty data from dashboard:', faculty); // Debug log

        // Filter out deleted faculty first
        const activeFaculty = faculty?.filter(f => !f.User?.isDeleted) || [];
        console.log('Active faculty after filtering:', activeFaculty); // Debug log

        // Calculate stats only for active faculty
        const regularCount = activeFaculty.filter((f) => f.Contract?.ContractType === "Full_Time").length;
        const probationaryCount = activeFaculty.filter((f) => f.Contract?.ContractType === "Probationary").length;

        console.log('Stats calculation:', {
          total: activeFaculty.length,
          regular: regularCount,
          probationary: probationaryCount
        }); // Debug log

        setFacultyStats({
          total: activeFaculty.length,
          regular: regularCount,
          probationary: probationaryCount,
        });

        // Fetch Department Stats
        const { data: departments, error: deptError } = await supabase
          .from("Department")
          .select(`
            DepartmentName,
            Faculty (
              FacultyID,
              User:UserID (
                UserID,
                isDeleted,
                Status
              )
            )
          `) as { data: Department[] | null, error: any };

        if (deptError) {
          console.error("Department fetch error:", deptError.message || deptError);
          throw deptError;
        }

        console.log('Raw department data:', departments); // Debug log

        const deptStats: Record<string, number> = {};
        departments?.forEach((dept) => {
          // Only count faculty who are not deleted
          const activeFacultyInDept = dept.Faculty?.filter(f => !f.User?.isDeleted) || [];
          console.log(`Department ${dept.DepartmentName} active faculty:`, activeFacultyInDept.length); // Debug log
          deptStats[dept.DepartmentName] = activeFacultyInDept.length;
        });

        setDepartmentStats(deptStats);

        // Fetch Active Users
        const { data: users, error: usersError } = await supabase
          .from("User")
          .select(`
            UserID,
            Status,
            LastLogin,
            isDeleted,
            Role:UserRole (
              role:Role (
                name
              )
            )
          `)
          .eq("Status", "Active")
          .eq("isDeleted", 'FALSE') as { data: User[] | null, error: any };

        console.log('Raw users data:', users); // Debug log

        if (usersError) {
          console.error("Users fetch error:", usersError.message || usersError);
          throw usersError;
        }

        console.log("All users from database:", users); // Debug log to see all users

        // First get total active users
        const totalActiveUsers = users?.length || 0;
        
        // Then count users with specific roles
        const facultyUsers = users?.filter((u) => u.Role?.some(r => (r.role as any).name === "Faculty")).length || 0;
        const adminUsers = users?.filter((u) => u.Role?.some(r => (r.role as any).name === "Admin")).length || 0;

        console.log("Total active users:", totalActiveUsers); // Debug log
        console.log("Faculty users count:", facultyUsers); // Debug log
        console.log("Admin users count:", adminUsers); // Debug log

        setActiveUsers({
          faculty: facultyUsers,
          admin: adminUsers,
          total: totalActiveUsers, // Use total active users instead of sum of roles
        });

        // Fetch Attendance Data
        const { data: attendance, error: attendanceError } = await supabase
          .from("Attendance")
          .select("*")
          .gte("date", dateRange[0].toISOString())
          .lte("date", dateRange[1].toISOString());

        if (attendanceError) {
          console.error("Attendance fetch error:", attendanceError.message || attendanceError);
          throw attendanceError;
        }

        setAttendanceData({
          present: attendance?.filter((a) => a.status === "PRESENT").length || 0,
          absent: attendance?.filter((a) => a.status === "ABSENT").length || 0,
          late: attendance?.filter((a) => a.status === "LATE").length || 0,
        });

        // Fetch Monthly Attendance Data
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date;
        }).reverse();

        const monthlyData = await Promise.all(
          last6Months.map(async (month) => {
            const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
            const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

            const { data: monthAttendance, error: monthError } = await supabase
              .from("Attendance")
              .select("*")
              .gte("date", startDate.toISOString())
              .lte("date", endDate.toISOString());

            if (monthError) {
              console.error("Monthly attendance fetch error:", monthError.message || monthError);
              throw monthError;
            }

            const totalDays = monthAttendance?.length || 0;
            const presentDays = monthAttendance?.filter((a) => a.status === "PRESENT").length || 0;
            return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
          })
        );

        setMonthlyAttendance(monthlyData);

        // Fetch Leave Requests
        const { data: leaves, error: leavesError } = await supabase
          .from("Leave")
          .select("*");
          // .gte("CreatedAt", dateRange[0].toISOString())
          // .lte("CreatedAt", dateRange[1].toISOString())
          // .eq("Status", "Pending");
            console.log(leaves);
        if (leavesError) {
          console.error("Leave requests fetch error:", leavesError.message || leavesError);
          throw leavesError;
        }

        setLeaveRequests({
          pending: leaves?.filter((l) => l.Status === "Pending").length || 0,
          approved: leaves?.filter((l) => l.Status === "Approved").length || 0,
          rejected: leaves?.filter((l) => l.Status === "Rejected").length || 0,
        });
        console.log("Statuses:", leaves.map((l) => l.Status));

      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching dashboard data:", error.message);
        } else {
          console.error("Error fetching dashboard data:", error);
        }
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data: activityLogs, error: logsError } = await supabase
          .from("ActivityLog")
          .select(`
            *,
            User (
              FirstName,
              LastName
            )
          `)
          .eq('UserID', user?.id)
          .order("Timestamp", { ascending: false })
          .limit(5);

        if (logsError) {
          console.error("Logs fetch error:", logsError.message || logsError);
          throw logsError;
        }

        setLogs(activityLogs || []);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching dashboard data:", error.message);
        } else {
          console.error("Error fetching dashboard data:", error);
        }
      }
    };

    if (user?.id) {
      fetchLogs();
    }
  }, [user?.id]);

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
            <h2 className="text-2xl font-bold text-gray-800">Leave Requests</h2>
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