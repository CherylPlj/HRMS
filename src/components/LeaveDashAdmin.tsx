import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
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
  FaFile,
  FaClock,
  FaGraduationCap,
  FaBriefcase,
  FaUserPlus,
  FaBuilding,
  FaCalendarCheck,
  FaComments,
  FaBed,
  FaUmbrellaBeach,
  FaExclamationTriangle,
  FaBaby,
  FaMale
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

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  ExtensionName?: string;
  EmploymentStatus?: string; // Keep for backward compatibility
  DepartmentID?: number;
  isDeleted?: boolean;
  UserID?: string;
  Department?: Department;
  employmentDetails?: {
    EmploymentStatus: string;
  }[];
}

interface PendingLeaveRequest {
  id: string;
  facultyName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  department: string;
  daysRequested: number;
}

interface ChatbotInteraction {
  date: string;
  interactions: number;
}

export default function LeaveDashAdmin() {
  const router = useRouter();
  const { user } = useUser();
  const [dateRange, setDateRange] = useState<[Date, Date]>([new Date(), new Date()]);
  const [facultyStats, setFacultyStats] = useState({
    total: 0,
    regular: 0,
    partTime: 0,
    resigned: 0,
    retired: 0,
    probationary: 0,
    hired: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  const [documentStats, setDocumentStats] = useState({ submitted: 0 });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

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

  // Add new state for recruitment stats
  const [recruitmentStats, setRecruitmentStats] = useState({
    activeVacancies: 0,
    totalCandidates: 0,
    shortlisted: 0,
    interviewed: 0,
    hired: 0,
  });

  // Fix the type error in upcomingInterviews state
  const [upcomingInterviews, setUpcomingInterviews] = useState<Array<{
    CandidateID: number;
    FirstName: string;
    LastName: string;
    MiddleName?: string;
    ExtensionName?: string;
    InterviewDate: string;
    Email: string;
    ContactNumber?: string;
    Vacancy: {
      VacancyName: string;
      JobTitle: string;
    };
  }>>([]);

  // Mock data for leave status distribution
  const leaveStatusData = {
    labels: ["Approved", "Rejected", "Pending"],
    datasets: [
      {
        data: [45, 15, 25],
        backgroundColor: ["#43a047", "#e53935", "#ffb300"],
        hoverOffset: 4,
        borderWidth: 0,
      },
    ],
  };

  // Mock data for leave type distribution
  const leaveTypeData = {
    labels: ["Sick Leave", "Vacation", "Emergency", "Maternity", "Paternity"],
    datasets: [
      {
        label: "Number of Requests",
        data: [30, 25, 10, 8, 5],
        backgroundColor: [
          "#800000",
          "#9C27B0", 
          "#2196F3",
          "#FF9800",
          "#43a047"
        ],
        borderRadius: 8,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  // Mock data for pending leave requests
  const [pendingRequests] = useState<PendingLeaveRequest[]>([
    {
      id: "1",
      facultyName: "Dr. Maria Santos",
      leaveType: "Sick Leave",
      startDate: "2024-01-15",
      endDate: "2024-01-17",
      reason: "Medical appointment and recovery",
      department: "Computer Science",
      daysRequested: 3
    },
    {
      id: "2", 
      facultyName: "Prof. Juan Dela Cruz",
      leaveType: "Vacation",
      startDate: "2024-02-01",
      endDate: "2024-02-05",
      reason: "Family vacation",
      department: "Mathematics",
      daysRequested: 5
    },
    {
      id: "3",
      facultyName: "Ms. Ana Rodriguez",
      leaveType: "Emergency",
      startDate: "2024-01-20",
      endDate: "2024-01-20",
      reason: "Family emergency",
      department: "English",
      daysRequested: 1
    },
    {
      id: "4",
      facultyName: "Dr. Carlos Mendoza",
      leaveType: "Maternity",
      startDate: "2024-03-01",
      endDate: "2024-05-01",
      reason: "Maternity leave",
      department: "Psychology",
      daysRequested: 60
    },
    {
      id: "5",
      facultyName: "Mr. Pedro Martinez",
      leaveType: "Paternity",
      startDate: "2024-02-15",
      endDate: "2024-02-22",
      reason: "Paternity leave",
      department: "Engineering",
      daysRequested: 7
    }
  ]);

  // Mock data for chatbot interactions
  const [chatbotData] = useState<ChatbotInteraction[]>([
    { date: "Jan 1", interactions: 12 },
    { date: "Jan 2", interactions: 18 },
    { date: "Jan 3", interactions: 15 },
    { date: "Jan 4", interactions: 22 },
    { date: "Jan 5", interactions: 19 },
    { date: "Jan 6", interactions: 25 },
    { date: "Jan 7", interactions: 30 },
    { date: "Jan 8", interactions: 28 },
    { date: "Jan 9", interactions: 35 },
    { date: "Jan 10", interactions: 32 },
    { date: "Jan 11", interactions: 40 },
    { date: "Jan 12", interactions: 38 },
    { date: "Jan 13", interactions: 45 },
    { date: "Jan 14", interactions: 42 }
  ]);

  const chatbotLineData = {
    labels: chatbotData.map(item => item.date),
    datasets: [
      {
        label: "Chatbot Interactions",
        data: chatbotData.map(item => item.interactions),
        borderColor: "#800000",
        backgroundColor: "rgba(128, 0, 0, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#800000",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange([start, end]);
    }
  };

  // Add navigation handlers
  // const handleCardClick = (module: string) => {
  //   router.push(`/dashboard/admin/${module}`);
  // };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Employee Stats
        const { data: employeesData, error: employeeError } = await supabase
          .from("Employee")
          .select(`
            *,
            Department:DepartmentID (
              DepartmentID,
              DepartmentName
            ),
            employmentDetails:EmploymentDetail (
              EmploymentStatus
            )
          `) as { data: Employee[] | null, error: any };

        if (employeeError) {
          console.error("Employee fetch error:", employeeError.message || employeeError);
          throw employeeError;
        }

        console.log('Raw employee data from dashboard:', employeesData); // Debug log
        setEmployees(employeesData || []);

        // Debug log to show employment details structure
        console.log('Employment details sample:', employeesData?.slice(0, 3).map(emp => ({
          employeeId: emp.EmployeeID,
          employmentDetails: emp.employmentDetails,
          oldEmploymentStatus: emp.EmploymentStatus
        })));

        // Debug: Check how many employees have employment details
        const employeesWithDetails = employeesData?.filter(emp => emp.employmentDetails && emp.employmentDetails.length > 0) || [];
        const employeesWithoutDetails = employeesData?.filter(emp => !emp.employmentDetails || emp.employmentDetails.length === 0) || [];
        console.log('Employees with employment details:', employeesWithDetails.length);
        console.log('Employees without employment details:', employeesWithoutDetails.length);
        console.log('Sample employees without details:', employeesWithoutDetails.slice(0, 3));

        // Filter out deleted employees
        const allNonDeletedEmployees = employeesData?.filter(e => !e.isDeleted) || [];
        console.log('All non-deleted employee data:', allNonDeletedEmployees); // Debug log

        // Calculate stats based on EmploymentStatus from EmploymentDetail with fallback
        const regularCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Regular";
        }).length;
        const partTimeCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Part_Time" || status === "Part Time";
        }).length;
        const resignedCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Resigned";
        }).length;
        const retiredCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Retired";
        }).length;
        const probationaryCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Probationary";
        }).length;
        const hiredCount = allNonDeletedEmployees.filter((e) => {
          const status = e.employmentDetails?.[0]?.EmploymentStatus || e.EmploymentStatus;
          return status === "Hired";
        }).length;
        
        const totalEmployees = allNonDeletedEmployees.length;

        console.log('Stats calculation from EmploymentStatus:', {
          total: totalEmployees,
          regular: regularCount,
          partTime: partTimeCount,
          resigned: resignedCount,
          retired: retiredCount,
          probationary: probationaryCount,
          hired: hiredCount,
        }); // Debug log

        // Debug: Show all unique employment statuses found
        const allStatuses = allNonDeletedEmployees.map(emp => {
          const status = emp.employmentDetails?.[0]?.EmploymentStatus || emp.EmploymentStatus;
          return status;
        }).filter(Boolean);
        const uniqueStatuses = [...new Set(allStatuses)];
        console.log('All unique employment statuses found:', uniqueStatuses);
        console.log('Status count breakdown:', uniqueStatuses.reduce((acc, status) => {
          acc[status as string] = allStatuses.filter(s => s === status).length;
          return acc;
        }, {} as Record<string, number>));

        setFacultyStats({
          total: totalEmployees,
          regular: regularCount,
          partTime: partTimeCount,
          resigned: resignedCount,
          retired: retiredCount,
          probationary: probationaryCount,
          hired: hiredCount,
        });

        // Fetch department names first
        const { data: departments } = await supabase
          .from("Department")
          .select('DepartmentID, DepartmentName');

        // Calculate Department Stats from Employees
        const deptStats: Record<string, number> = {};
        
        // Initialize all departments with 0
        departments?.forEach((dept) => {
          deptStats[dept.DepartmentName] = 0;
        });

        // Count employees per department (including all statuses)
        allNonDeletedEmployees.forEach((emp) => {
          if (!emp.isDeleted && emp.DepartmentID) {
            const dept = departments?.find(d => d.DepartmentID === emp.DepartmentID);
            if (dept) {
              deptStats[dept.DepartmentName] = (deptStats[dept.DepartmentName] || 0) + 1;
            }
          }
        });

        console.log('Department stats:', deptStats); // Debug log

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

        // Get active faculty users (not resigned, not inactive)
        const activeFacultyUsers = users?.filter(u => 
          u.Role?.some(r => (r.role as any).name === 'Faculty') && // is a faculty
          u.Status === 'Active' && // is active
          !u.isDeleted // not deleted
        ).length || 0;

        const adminUsers = users?.filter(u => 
          u.Role?.some(r => (r.role as any).name === 'Admin') &&
          u.Status === 'Active' &&
          !u.isDeleted
        ).length || 0;

        console.log("Active faculty count:", activeFacultyUsers); // Debug log
        console.log("Admin users count:", adminUsers); // Debug log

        setActiveUsers({
          faculty: activeFacultyUsers,
          admin: adminUsers,
          total: activeFacultyUsers + adminUsers
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

        setAttendanceRecords(attendance || []);
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

        // Fetch Documents Status
        const { data: documents, error: documentsError } = await supabase
          .from("Document")
          .select("*");
        if (documentsError) throw documentsError;
        const submittedCount = documents?.filter(doc => doc.SubmissionStatus === "Submitted").length || 0;
        setDocumentStats({ submitted: submittedCount });

        // Fetch Recruitment Stats
        const { data: vacancies, error: vacanciesError } = await supabase
          .from("Vacancy")
          .select("*")
          .eq("isDeleted", false);

        if (vacanciesError) throw vacanciesError;

        const { data: candidates, error: candidatesError } = await supabase
          .from("Candidate")
          .select("*")
          .eq("isDeleted", false);

        if (candidatesError) throw candidatesError;

        // Filter out inactive candidates (those who are hired, rejected, or withdrawn)
        const activeCandidates = candidates?.filter(c => 
          !c.isDeleted && 
          !['Hired', 'Rejected', 'Withdrawn'].includes(c.Status)
        ) || [];

        setRecruitmentStats({
          activeVacancies: vacancies?.filter(v => v.Status === 'Active').length || 0,
          totalCandidates: activeCandidates.length,
          shortlisted: activeCandidates.filter(c => c.Status === 'Shortlisted').length || 0,
          interviewed: activeCandidates.filter(c => ['InterviewScheduled', 'InterviewCompleted'].includes(c.Status)).length || 0,
          hired: candidates?.filter(c => c.Status === 'Hired').length || 0,
        });

        // Fetch Upcoming Interviews with proper typing
        const today = new Date();
        const { data: interviews, error: interviewsError } = await supabase
          .from("Candidate")
          .select(`
            CandidateID,
            FirstName,
            LastName,
            MiddleName,
            ExtensionName,
            InterviewDate,
            Email,
            ContactNumber,
            Vacancy:VacancyID (
              VacancyName,
              JobTitle
            )
          `)
          .eq("Status", "InterviewScheduled")
          .gte("InterviewDate", today.toISOString())
          .order("InterviewDate", { ascending: true })
          .limit(5);

        if (interviewsError) throw interviewsError;
        
                  // Transform the data to match our type
        const typedInterviews = (interviews || []).map(interview => {
          const vacancy = Array.isArray(interview.Vacancy) ? interview.Vacancy[0] : interview.Vacancy;
          return {
            CandidateID: interview.CandidateID,
            FirstName: interview.FirstName,
            LastName: interview.LastName,
            MiddleName: interview.MiddleName,
            ExtensionName: interview.ExtensionName,
            InterviewDate: interview.InterviewDate,
            Email: interview.Email,
            ContactNumber: interview.ContactNumber,
            Vacancy: {
              VacancyName: vacancy.VacancyName,
              JobTitle: vacancy.JobTitle
            }
          };
        });
        
        setUpcomingInterviews(typedInterviews);

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

  // Build per-day present/absent/late arrays for the graph
  const daysCount = Math.floor((dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const presentPerDay: number[] = Array(daysCount).fill(0);
  const absentPerDay: number[] = Array(daysCount).fill(0);
  const latePerDay: number[] = Array(daysCount).fill(0);
  
  // Get all active employees (Regular and Part Time only for attendance)
  const activeEmployees = employees.filter((emp: Employee) => {
    if (emp.isDeleted) return false;
    const status = emp.employmentDetails?.[0]?.EmploymentStatus || emp.EmploymentStatus;
    return status === "Regular" || status === "Part_Time" || status === "Part Time";
  });
  const totalActiveEmployees = activeEmployees.length;
  
  // Calculate attendance for each day
  for (let i = 0; i < daysCount; i++) {
    const day = new Date(dateRange[0]);
    day.setDate(day.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    
    // Get all attendance records for this day
    const dayAttendance = attendanceRecords.filter(rec => rec.date === dayStr);
    
    // Count present, absent, and late for this day
    presentPerDay[i] = dayAttendance.filter(rec => rec.status === 'PRESENT').length;
    latePerDay[i] = dayAttendance.filter(rec => rec.status === 'LATE').length;
    
    // Absent is total active employees minus present and late
    absentPerDay[i] = totalActiveEmployees - (presentPerDay[i] + latePerDay[i]);
  }

  console.log('Attendance calculation debug:', {
    totalActiveEmployees,
    sampleDay: {
      present: presentPerDay[0],
      absent: absentPerDay[0],
      late: latePerDay[0]
    },
    attendanceRecords: attendanceRecords.length,
    activeEmployees: activeEmployees.map(emp => ({
      id: emp.EmployeeID,
      status: emp.employmentDetails?.[0]?.EmploymentStatus || emp.EmploymentStatus
    }))
  });

  const attendanceOverviewData = {
    labels: Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(dateRange[0]);
      d.setDate(d.getDate() + i);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: "Present",
        data: presentPerDay,
        backgroundColor: "#43a047",
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        label: "Absent",
        data: absentPerDay,
        backgroundColor: "#e53935",
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        label: "Late",
        data: latePerDay,
        backgroundColor: "#ffb300",
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  const departmentColors = ["#800000", "#9C27B0", "#2196F3", "#FF9800", "#43a047", "#e53935", "#ffb300"];
  const departmentData = {
    labels: Object.keys(departmentStats),
    datasets: [
      {
        label: "Employees by Department",
        data: Object.values(departmentStats),
        backgroundColor: departmentColors.slice(0, Object.keys(departmentStats).length),
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

  const leavePieData = {
    labels: ["Pending", "Approved", "Rejected"],
    datasets: [
      {
        data: [leaveRequests.pending, leaveRequests.approved, leaveRequests.rejected],
        backgroundColor: ["#ffb300", "#43a047", "#e53935"],
        hoverOffset: 4,
      },
    ],
  };

  // Helper function to format candidate name
  const formatCandidateName = (firstName: string, lastName: string, middleName?: string, extensionName?: string) => {
    let fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
    if (extensionName) {
      fullName += ` ${extensionName}`;
    }
    return fullName;
  };

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get leave type icon
  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType) {
      case "Sick Leave":
        return <FaBed className="text-red-500" />;
      case "Vacation":
        return <FaUmbrellaBeach className="text-blue-500" />;
      case "Emergency":
        return <FaExclamationTriangle className="text-orange-500" />;
      case "Maternity":
        return <FaBaby className="text-pink-500" />;
      case "Paternity":
        return <FaMale className="text-blue-600" />;
      default:
        return <FaCalendarAlt className="text-gray-500" />;
    }
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
          Faculty Leave Management Dashboard
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Leave Requests</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">85</h3>
            </div>
            <FaFile className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Requests</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">25</h3>
            </div>
            <FaClock className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Approved Requests</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">45</h3>
            </div>
            <FaUserCheck className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Chatbot Interactions</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">425</h3>
            </div>
            <FaComments className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Leave Status Distribution */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaBriefcase className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Leave Status Distribution</h2>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <Pie 
              data={leaveStatusData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Leave Type Distribution */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaCalendarCheck className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Leave Type Distribution</h2>
          </div>
          <div className="h-[300px]">
            <Bar 
              data={leaveTypeData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      display: true,
                      color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                      stepSize: 5,
                      precision: 0
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Pending Leave Requests Table */}
      <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FaClock className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Pending Leave Requests</h2>
          </div>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingRequests.length} Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Faculty Name
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Leave Type
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Date Range
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Days
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Department
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="py-4 text-sm text-gray-900 font-medium">
                    {request.facultyName}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center">
                      {getLeaveTypeIcon(request.leaveType)}
                      <span className="ml-2 text-sm text-gray-900">{request.leaveType}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-gray-900">
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </td>
                  <td className="py-4 text-sm text-gray-900">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {request.daysRequested} days
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-900">
                    {request.department}
                  </td>
                                     <td className="py-4 text-sm text-gray-600 max-w-xs truncate">
                     {request.reason}
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chatbot Interactions Line Graph */}
      <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
        <div className="flex items-center mb-6">
          <FaComments className="text-[#800000] text-2xl mr-3" />
          <h2 className="text-2xl font-bold text-gray-800">Faculty Chatbot Interactions</h2>
        </div>
        <div className="h-[350px]">
          <Line 
            data={chatbotLineData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                  },
                  ticks: {
                    stepSize: 10,
                    precision: 0
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              },
              interaction: {
                intersect: false,
                mode: 'index'
              }
            }} 
          />
        </div>
      </div>
    </div>
  );
}