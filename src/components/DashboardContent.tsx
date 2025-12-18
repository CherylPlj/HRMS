import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Calendar, 
  Users, 
  UserCheck, 
  History,
  FileText,
  GraduationCap,
  Briefcase,
  UserPlus,
  Building,
  CalendarCheck,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AIDashboard } from "./ai/AIDashboard";

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

export default function DashboardContent() {
  const router = useRouter();
  const { user } = useUser();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const dateRange: [Date, Date] = [startDate, endDate];
  const clickCountRef = React.useRef<number>(0);
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
  const [departmentStats, setDepartmentStats] = useState<Record<string, number>>({});
  const [leaveRequests, setLeaveRequests] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [documentStats, setDocumentStats] = useState({ submitted: 0 });

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

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    
    // If both dates are provided, set both
    if (start && end) {
      setStartDate(start);
      setEndDate(end);
      clickCountRef.current = 0;
      return;
    }
    
    // If only start is provided
    if (start) {
      if (clickCountRef.current === 0) {
        // First click - set start date
        setStartDate(start);
        clickCountRef.current = 1;
      }
    }
  };
  
  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    
    // onSelect fires on every date click, use it to manually handle range selection
    if (clickCountRef.current === 0) {
      // First click - set start date
      setStartDate(date);
      clickCountRef.current = 1;
    } else if (clickCountRef.current === 1) {
      // Second click - set end date
      const currentStart = startDate;
      if (date.getTime() >= currentStart.getTime()) {
        setEndDate(date);
      } else {
        // End is before start - swap them
        setEndDate(currentStart);
        setStartDate(date);
      }
      clickCountRef.current = 0;
    }
  };

  const handleClearDateRange = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
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
          rejected: leaves?.filter((l) => l.Status === "Returned").length || 0,
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
          !['Hired', 'Returned', 'Withdrawn'].includes(c.Status)
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
  }, [startDate, endDate]);

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



  const leavePieData = {
    labels: ["Pending", "Approved", "Returned"],
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

  return (
    <div className="p-8 w-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* <div className="flex flex-col"> */}
            {/* <label className="text-sm font-medium text-gray-700 mb-2">Filter by Date Range</label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={handleDateRangeChange}
                onSelect={handleDateSelect}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                shouldCloseOnSelect={false}
                dateFormat="MMM d, yyyy"
                maxDate={new Date()}
                placeholderText="Select Date Range"
                customInput={
                  <div className="relative">
                    <button 
                      type="button"
                      className="flex items-center justify-between w-full min-w-[280px] bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:border-[#800000] hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    >
                      <div className="flex items-center">
                        <Calendar className="mr-2 text-[#800000]" />
                        <span className="text-sm">
                          {startDate && endDate
                            ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : "Select Date Range"}
                        </span>
                      </div>
                      {startDate && endDate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearDateRange();
                          }}
                          className="ml-2 text-gray-400 hover:text-[#800000] transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                          title="Clear date range"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </button>
                  </div>
                }
                className="w-full"
              />
            </div>
          </div>  */}
          <div className="flex items-end gap-2 pt-6">
            <button 
              onClick={() => {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDayOfMonth);
                setEndDate(today);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1"
            >
              This Month
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                setStartDate(firstDayOfYear);
                setEndDate(today);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1"
            >
              This Year
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 hidden md:block">
          Showing data from {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
          // onClick={() => handleCardClick('faculty')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Employees</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{facultyStats.total}</h3>
            </div>
            <Users className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
          // onClick={() => handleCardClick('recruitment')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Applicants</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{recruitmentStats.totalCandidates}</h3>
            </div>
            <UserPlus className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
          // onClick={() => handleCardClick('documents')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Documents Requiring Approval</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{documentStats.submitted}</h3>
            </div>
            <FileText className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
          // onClick={() => handleCardClick('leaves')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Leaves</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveRequests.pending}</h3>
            </div>
            <Clock className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
      </div>

      {/* Recruitment Overview Section */}
      <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UserPlus className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Recruitment Overview</h2>
          </div>
          {/* <button 
            // onClick={() => handleCardClick('recruitment')}
            className="text-[#800000] hover:text-[#600000] transition-colors duration-300 text-sm flex items-center"
          >
            View All
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button> */}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recruitment Funnel Chart */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recruitment Funnel</h3>
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: ['Total Candidates', 'Shortlisted', 'Interviewed', 'Hired'],
                  datasets: [
                    {
                      label: 'Candidates',
                      data: [
                        recruitmentStats.totalCandidates,
                        recruitmentStats.shortlisted,
                        recruitmentStats.interviewed,
                        recruitmentStats.hired
                      ],
                      backgroundColor: [
                        '#800000',
                        '#9C27B0',
                        '#2196F3',
                        '#43a047'
                      ],
                      borderRadius: 8,
                    }
                  ]
                }}
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
                        stepSize: 1,
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

          {/* Recruitment Progress Pie Chart */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Status Distribution</h3>
            <div className="h-[300px] flex items-center justify-center">
              <Pie
                data={{
                  labels: ['Active Vacancies', 'In Process', 'Shortlisted', 'Interviewed', 'Hired'],
                  datasets: [{
                    data: [
                      recruitmentStats.activeVacancies,
                      recruitmentStats.totalCandidates - (recruitmentStats.shortlisted + recruitmentStats.interviewed + recruitmentStats.hired),
                      recruitmentStats.shortlisted,
                      recruitmentStats.interviewed,
                      recruitmentStats.hired
                    ],
                    backgroundColor: [
                      '#800000',
                      '#9C27B0',
                      '#2196F3',
                      '#FF9800',
                      '#43a047'
                    ],
                    borderWidth: 0,
                  }]
                }}
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
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-5 gap-4 mt-8">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Building className="text-[#800000] text-xl mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#800000]">{recruitmentStats.activeVacancies}</p>
            <p className="text-sm text-gray-600">Active Vacancies</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Users className="text-[#800000] text-xl mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#800000]">{recruitmentStats.totalCandidates}</p>
            <p className="text-sm text-gray-600">Total Candidates</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <UserCheck className="text-[#800000] text-xl mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#800000]">{recruitmentStats.shortlisted}</p>
            <p className="text-sm text-gray-600">Shortlisted</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Clock className="text-[#800000] text-xl mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#800000]">{recruitmentStats.interviewed}</p>
            <p className="text-sm text-gray-600">Interviewed</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <UserCheck className="text-[#800000] text-xl mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#800000]">{recruitmentStats.hired}</p>
            <p className="text-sm text-gray-600">Hired</p>
          </div>
        </div>
      </div>

      {/* Upcoming Interviews Section */}
      <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CalendarCheck className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Upcoming Interviews</h2>
          </div>
          {/* <button 
            className="text-[#800000] hover:text-[#600000] transition-colors duration-300 text-sm flex items-center"
            // onClick={() => handleCardClick('recruitment')}
          >
            View All
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button> */}
        </div>

        {upcomingInterviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Interview Schedule
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Candidate Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Position
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingInterviews.map((interview) => (
                  <tr key={interview.CandidateID} className="hover:bg-gray-50">
                    <td className="py-4 text-sm text-gray-900">
                      {formatDateTime(interview.InterviewDate)}
                    </td>
                    <td className="py-4 text-sm text-gray-900">
                      {formatCandidateName(
                        interview.FirstName,
                        interview.LastName,
                        interview.MiddleName,
                        interview.ExtensionName
                      )}
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-900">{interview.Vacancy.VacancyName}</div>
                      <div className="text-sm text-gray-500">{interview.Vacancy.JobTitle}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-900">{interview.Email}</div>
                      <div className="text-sm text-gray-500">{interview.ContactNumber || 'No contact number'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No upcoming interviews scheduled
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Employee Overview Section */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <GraduationCap className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Employees Overview</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{facultyStats.regular}</p>
              <p className="text-gray-600 font-medium text-center">Regular</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{facultyStats.partTime}</p>
              <p className="text-gray-600 font-medium text-center">Part Time</p>
            </div>
            {/* <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-3xl font-bold text-[#800000] mb-2">{facultyStats.probationary}</p>
              <p className="text-gray-600 font-medium text-sm">Probationary</p>
            </div> */}
            {/* <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-3xl font-bold text-[#800000] mb-2">{facultyStats.hired}</p>
              <p className="text-gray-600 font-medium text-sm">Hired</p>
            </div> */}
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{facultyStats.resigned}</p>
              <p className="text-gray-600 font-medium text-center">Resigned</p>
            </div>
            {/* <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <p className="text-3xl font-bold text-[#800000] mb-2">{facultyStats.retired}</p>
              <p className="text-gray-600 font-medium text-sm">Retired</p>
            </div> */}
          </div>
          <div className="mt-6 h-[200px]">
            <Bar data={departmentData} options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    display: true
                  },
                  ticks: {
                    stepSize: 1,
                    precision: 0
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Leave Requests Section */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <Briefcase className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Leave Requests</h2>
          </div>
          <div className="flex flex-row justify-between items-stretch gap-4 mb-6 min-w-0">
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300 flex-1 min-w-0">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{leaveRequests.pending}</p>
              <p className="text-gray-600 font-medium text-center">Pending</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300 flex-1 min-w-0">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{leaveRequests.approved}</p>
              <p className="text-gray-600 font-medium text-center">Approved</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300 flex-1 min-w-0">
              <p className="text-4xl font-bold text-[#800000] mb-1 text-center">{leaveRequests.rejected}</p>
              <p className="text-gray-600 font-medium text-center">Returned</p>
            </div>
          </div>
          <div className="h-[200px] flex items-center justify-center">
            <Pie data={leavePieData} options={{ 
              responsive: true,
              maintainAspectRatio: true,
              plugins: { 
                legend: { 
                  display: true, 
                  position: 'bottom',
                  align: 'center',
                  labels: {
                    boxWidth: 20,
                    padding: 15,
                    usePointStyle: true
                  }
                } 
              } 
            }} />
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="text-[#800000]" />
            AI Insights & Recommendations
          </h2>
          <AIDashboard />
        </div>
      </div>
     
    </div>
  );
}