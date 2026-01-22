import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'; // For Next.js 13+
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import "chart.js/auto";
// import "react-datepicker/dist/react-datepicker.css";
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';
import { formatTimeRangeShort } from '@/lib/timeUtils';

// Add interfaces for component props
interface ComponentWithBackButton {
  onBack: () => void;
}

interface Department {
  DepartmentName: string;
}

interface FacultyData {
  FacultyID: number;
  Position: string;
  EmploymentStatus: string;
  HireDate: string;
  EmployeeID?: string;
  Department: Department;
}

export default function DashboardFaculty() {
  const { user } = useUser();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()),
    new Date()
  ]);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'personal' | 'documents' | 'leave'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Function to update date and time
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentDate(date);
      setCurrentTime(time);
    };

    updateDateTime(); // Call immediately
    const interval = setInterval(updateDateTime, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  // Placeholder data for new sections
  const [personalData, setPersonalData] = useState({
    Position: "",
    DepartmentName: "",
    EmploymentStatus: "",
    HireDate: ""
  });

  const [documentRequirements, setDocumentRequirements] = useState({
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  const [leaveData, setLeaveData] = useState({
    available: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [disciplinaryData, setDisciplinaryData] = useState({
    ongoing: 0,
    forReview: 0,
    resolved: 0,
    closed: 0,
    total: 0
  });

  const [performanceData, setPerformanceData] = useState({
    averageScore: 0,
    completedReviews: 0,
    pendingReviews: 0,
    totalMetrics: 0
  });

  const [scheduleData, setScheduleData] = useState({
    totalClasses: 0,
    totalHoursPerWeek: 0,
    totalSubjects: 0,
    totalSections: 0
  });

  const [todaySchedule, setTodaySchedule] = useState<Array<{
    id: number;
    day: string;
    time: string;
    duration: number;
    subject: {
      name: string;
    };
    classSection: {
      name: string;
    };
  }>>([]);

  // Fetch Supabase UserID and FacultyID when Clerk user is available
  useEffect(() => {
    const fetchUserAndFacultyId = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        setLoading(false);
        setError('No user email available');
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('UserID')
          .eq('Email', user.emailAddresses[0].emailAddress)
          .single();

        if (userError) {
          setError('Failed to fetch user data');
          return;
        }

        if (userData) {
          setSupabaseUserId(userData.UserID);

          const { data: facultyData, error: facultyError } = await supabase
            .from('Faculty')
            .select('FacultyID, EmployeeID')
            .eq('UserID', userData.UserID)
            .single();

          if (facultyError) {
            setError('Failed to fetch faculty data');
            return;
          }

          if (facultyData) {
            setFacultyId(facultyData.FacultyID);
            if (facultyData.EmployeeID) {
              setEmployeeId(facultyData.EmployeeID);
            }
            setError(null);
          } else {
            setError('Faculty record not found');
          }
        } else {
          setError('User not found in database');
        }
      } catch (error) {
        setError('An unexpected error occurred');
      }
    };

    fetchUserAndFacultyId();
  }, [user]);

  // Fetch data when faculty ID is available
  useEffect(() => {
      const safeFetchOtherData = async () => {
      try {
        await fetchOtherData();
      } catch (error) {
        console.error('Error fetching other dashboard data:', error);
      }
    };

    if (facultyId) {
      safeFetchOtherData();
    }
  }, [facultyId]);

  // Fetch other data for dashboard sections
  const fetchOtherData = async () => {
    try {
      if (!user?.emailAddresses?.[0]?.emailAddress) return;

      // Fetch user data
      const { data: userData } = await supabase
        .from('User')
        .select('UserID')
        .eq('Email', user.emailAddresses[0].emailAddress)
        .single();

      if (!userData) return;

      // Fetch faculty data
      const { data: facultyData } = await supabase
        .from('Faculty')
        .select(`
          FacultyID,
          Position,
          EmploymentStatus,
          HireDate,
          EmployeeID,
          Department:Department (
            DepartmentName
          )
        `)
        .eq('UserID', userData.UserID)
        .single() as { data: FacultyData | null };

      if (facultyData) {
        setPersonalData({
          Position: facultyData.Position,
          DepartmentName: facultyData.Department?.DepartmentName || '',
          EmploymentStatus: facultyData.EmploymentStatus,
          HireDate: new Date(facultyData.HireDate).toLocaleDateString()
        });

        // Fetch document types and documents
        const { data: documentTypes } = await supabase
          .from('DocumentType')
          .select('DocumentTypeID');

        const totalRequired = documentTypes?.length || 0;

        const { data: documents } = await supabase
          .from('Document')
          .select('DocumentID, DocumentTypeID, SubmissionStatus')
          .eq('FacultyID', facultyData.FacultyID);

        // Count submitted, approved, and rejected documents
        const submitted = documents?.filter(doc => doc.SubmissionStatus === 'Submitted').length || 0;
        const approved = documents?.filter(doc => doc.SubmissionStatus === 'Approved').length || 0;
        const rejected = documents?.filter(doc => doc.SubmissionStatus === 'Returned').length || 0;

        // Calculate pending as total required minus documents that exist
        const existingDocumentTypes = new Set(documents?.map(doc => doc.DocumentTypeID) || []);
        const pending = (documentTypes?.filter(dt => !existingDocumentTypes.has(dt.DocumentTypeID)).length || 0) +
                        (documents?.filter(doc => doc.SubmissionStatus === 'Pending').length || 0);

        setDocumentRequirements({
          pending,
          submitted,
          approved,
          rejected,
          total: totalRequired
        });

        // Fetch leave data
        const { data: leaves } = await supabase
          .from('Leave')
          .select('LeaveID, Status')
          .eq('FacultyID', facultyData.FacultyID);

        const availableLeaves = 10; // This should be fetched from a configuration or calculated based on policy
        const pendingLeaves = leaves?.filter(leave => leave.Status === 'Pending').length || 0;
        const approvedLeaves = leaves?.filter(leave => leave.Status === 'Approved').length || 0;
        const rejectedLeaves = leaves?.filter(leave => leave.Status === 'Returned').length || 0;

        setLeaveData({
          available: availableLeaves - approvedLeaves,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves
        });

        // Fetch disciplinary data if EmployeeID is available
        if (facultyData.EmployeeID) {
          await fetchDisciplinaryData(facultyData.EmployeeID);
          await fetchPerformanceData(facultyData.EmployeeID);
        }

        // Fetch schedule data
        await fetchScheduleData(facultyData.FacultyID);
      }
    } catch (error) {
      console.error('Error fetching other dashboard data:', error);
    }
  };

  // Fetch disciplinary data
  const fetchDisciplinaryData = async (empId: string) => {
    try {
      const response = await fetch(`/api/disciplinary?employeeId=${empId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const records = data.records || [];
        
        const ongoing = records.filter((r: any) => r.status === 'Ongoing').length;
        const forReview = records.filter((r: any) => r.status === 'For_Review' || r.status === 'For Review').length;
        const resolved = records.filter((r: any) => r.status === 'Resolved').length;
        const closed = records.filter((r: any) => r.status === 'Closed').length;

        setDisciplinaryData({
          ongoing,
          forReview,
          resolved,
          closed,
          total: records.length
        });
      }
    } catch (error) {
      console.error('Error fetching disciplinary data:', error);
    }
  };

  // Fetch schedule data
  const fetchScheduleData = async (facultyId: number) => {
    try {
      const response = await fetch(`/api/schedules/faculty/${facultyId}`);
      if (response.ok) {
        const data = await response.json();
        const schedules = data.schedules || [];
        const uniqueSubjects = new Set(schedules.map((s: any) => s.subject?.name || s.subject?.id)).size;
        const uniqueSections = new Set(schedules.map((s: any) => s.classSection?.name || s.classSection?.id)).size;
        const totalHours = schedules.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

        setScheduleData({
          totalClasses: schedules.length,
          totalHoursPerWeek: totalHours,
          totalSubjects: uniqueSubjects,
          totalSections: uniqueSections
        });

        // Get today's day of the week
        const today = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDayName = dayNames[today.getDay()];
        
        // Filter schedules for today
        const todaySchedules = schedules.filter((s: any) => 
          s.day && s.day.toLowerCase() === todayDayName.toLowerCase()
        );
        
        // Sort by time
        todaySchedules.sort((a: any, b: any) => {
          const timeA = a.time?.split('-')[0] || '';
          const timeB = b.time?.split('-')[0] || '';
          return timeA.localeCompare(timeB);
        });
        
        setTodaySchedule(todaySchedules);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    }
  };

  // Fetch performance data
  const fetchPerformanceData = async (empId: string) => {
    try {
      // Fetch performance reviews
      const reviewsResponse = await fetch(`/api/performance/reviews?employeeId=${empId}`);
      let completedReviews = 0;
      let pendingReviews = 0;
      let totalScore = 0;
      let reviewCount = 0;

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        const reviews = reviewsData.reviews || [];
        
        completedReviews = reviews.filter((r: any) => r.status === 'completed' || r.status === 'approved').length;
        pendingReviews = reviews.filter((r: any) => r.status === 'pending' || r.status === 'draft').length;
        
        // Calculate average score from completed reviews
        const completed = reviews.filter((r: any) => 
          (r.status === 'completed' || r.status === 'approved') && r.overallScore !== null
        );
        if (completed.length > 0) {
          totalScore = completed.reduce((sum: number, r: any) => sum + (r.overallScore || 0), 0);
          reviewCount = completed.length;
        }
      } else {
        // Silently handle errors - don't show technical errors to user
        const errorData = await reviewsResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || '';
        const isTechnicalError = 
          errorMessage.includes('prepared statement') ||
          errorMessage.includes('ConnectorError') ||
          errorMessage.includes('QueryError') ||
          errorMessage.includes('PostgresError') ||
          errorMessage.includes('Prisma');
        
        if (!isTechnicalError) {
          console.error('Error fetching performance reviews:', errorMessage);
        }
      }

      // Performance metrics API call disabled - module is hidden
      // const metricsResponse = await fetch(`/api/performance/metrics?employeeId=${empId}`);
      let totalMetrics = 0;
      
      // Metrics fetching disabled - set to 0
      // if (metricsResponse.ok) {
      //   const metricsData = await metricsResponse.json();
      //   totalMetrics = metricsData.total || (metricsData.metrics?.length || 0);
      // } else {
      //   // Silently handle errors - don't show technical errors to user
      //   const errorData = await metricsResponse.json().catch(() => ({}));
      //   const errorMessage = errorData.error || '';
      //   const isTechnicalError = 
      //     errorMessage.includes('prepared statement') ||
      //     errorMessage.includes('ConnectorError') ||
      //     errorMessage.includes('QueryError') ||
      //     errorMessage.includes('PostgresError') ||
      //     errorMessage.includes('Prisma');
      //   
      //   if (!isTechnicalError) {
      //     console.error('Error fetching performance metrics:', errorMessage);
      //   }
      // }

      setPerformanceData({
        averageScore: reviewCount > 0 ? Math.round((totalScore / reviewCount) * 100) / 100 : 0,
        completedReviews,
        pendingReviews,
        totalMetrics
      });
    } catch (error) {
      // Silently handle errors - don't show technical database errors to user
      const errorMessage = error instanceof Error ? error.message : '';
      const isTechnicalError = 
        errorMessage.includes('prepared statement') ||
        errorMessage.includes('ConnectorError') ||
        errorMessage.includes('QueryError') ||
        errorMessage.includes('PostgresError') ||
        errorMessage.includes('Prisma');
      
      if (!isTechnicalError) {
        console.error('Error fetching performance data:', error);
      }
    }
  };

  const handleRefresh = () => {
    setError(null);
    fetchOtherData();
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    if (dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  function parseTimeString(timeStr: string | undefined) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  }

  function formatTimeWithAmPm(timeStr: string | null | undefined) {
    if (!timeStr) return '-';
    return DateTime.fromFormat(timeStr, 'HH:mm:ss', { zone: 'Asia/Manila' })
      .toFormat('hh:mm a');
  }

  if (currentView === 'personal') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mb-6 flex items-center text-[#800000] hover:text-[#600000] transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </button>
          <PersonalData onBack={() => setCurrentView('dashboard')} />
        </div>
      </div>
    );
  }

  if (currentView === 'documents') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mb-6 flex items-center text-[#800000] hover:text-[#600000] transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </button>
          <DocumentsFaculty onBack={() => setCurrentView('dashboard')} />
        </div>
      </div>
    );
  }

  if (currentView === 'leave') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mb-6 flex items-center text-[#800000] hover:text-[#600000] transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </button>
          <LeaveRequestFaculty onBack={() => setCurrentView('dashboard')} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Dashboard</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          {/* Top Row: Personal Data, Employment Status, Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Personal Data */}
            <div 
              onClick={() => setCurrentView('personal')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-user-circle mr-2 text-[#800000]"></i>
                  Personal Data
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <p className="text-sm"><span className="font-medium"><i className="fas fa-briefcase mr-2 text-gray-500"></i>Position:</span> {personalData.Position}</p>
              <p className="text-sm"><span className="font-medium"><i className="fas fa-building mr-2 text-gray-500"></i>Department:</span> {personalData.DepartmentName}</p>
            </div>

            {/* Employment Status */}
            <div 
              // onClick={() => setCurrentView('personal')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-id-badge mr-2 text-[#800000]"></i>
                  Employment Status
                </h3>
                {/* <i className="fas fa-chevron-right text-gray-400"></i> */}
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-check-circle text-green-500"></i>
                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">{personalData.EmploymentStatus}</span>
              </div>
              <p className="text-sm"><span className="font-medium"><i className="fas fa-calendar-alt mr-2 text-gray-500"></i>Hire Date:</span> {personalData.HireDate}</p>
            </div>

            {/* Date & Time */}
            <div 
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-clock mr-2 text-[#800000]"></i>
                  Date & Time
                </h3>
              </div>
              <p className="text-gray-700 text-sm"><i className="fas fa-calendar mr-2"></i>{currentDate}</p>
              <p className="text-gray-700 text-sm"><i className="fas fa-clock mr-2"></i>{currentTime}</p>
            </div>
          </div>

          {/* Second Row: Document Requirements, Leave, Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Document Requirements Card */}
            <div 
              onClick={() => setCurrentView('documents')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-file-alt mr-2 text-[#800000]"></i>
                  Total Document Requirements
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-yellow-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-hourglass-half text-yellow-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{documentRequirements.pending}</p>
                  <p className="text-xs text-yellow-700">Pending</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-paper-plane text-blue-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{documentRequirements.submitted}</p>
                  <p className="text-xs text-blue-700">Submitted</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-check-circle text-green-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{documentRequirements.approved}</p>
                  <p className="text-xs text-green-700">Approved</p>
                </div>
                <div className="bg-red-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-times-circle text-red-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{documentRequirements.rejected}</p>
                  <p className="text-xs text-red-700">Returned</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                <i className="fas fa-file-alt mr-2"></i>
                Total Required: {documentRequirements.total}
              </div>
            </div>

            {/* Total Leave */}
            <div 
              onClick={() => setCurrentView('leave')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-calendar-minus mr-2 text-[#800000]"></i>
                  Total Leave
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <p className="mb-2 text-sm">
                <i className="fas fa-calendar-check mr-2"></i>
                Available Leave: {leaveData.available} days
              </p>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${(leaveData.approved / leaveData.available) * 100}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-yellow-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-hourglass-half text-yellow-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{leaveData.pending}</p>
                  <p className="text-xs text-yellow-700">Pending</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-check-circle text-green-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{leaveData.approved}</p>
                  <p className="text-xs text-green-700">Approved</p>
                </div>
                <div className="bg-red-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-times-circle text-red-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{leaveData.rejected}</p>
                  <p className="text-xs text-red-700">Returned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: My Schedule and Today's Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Schedule Card */}
            <div 
              onClick={() => router.push('/dashboard/faculty/my-schedule')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-calendar-alt mr-2 text-[#800000]"></i>
                  My Schedule
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-book text-blue-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{scheduleData.totalClasses}</p>
                  <p className="text-xs text-blue-700">Total Classes</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-clock text-green-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{scheduleData.totalHoursPerWeek}</p>
                  <p className="text-xs text-green-700">Hours/Week</p>
                </div>
                <div className="bg-purple-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-book-open text-purple-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{scheduleData.totalSubjects}</p>
                  <p className="text-xs text-purple-700">Subjects</p>
                </div>
                <div className="bg-orange-100 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                  <i className="fas fa-users text-orange-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{scheduleData.totalSections}</p>
                  <p className="text-xs text-orange-700">Sections</p>
                </div>
              </div>
            </div>

            {/* Today's Schedule Card */}
            <div 
              onClick={() => router.push('/dashboard/faculty/my-schedule')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-calendar-day mr-2 text-[#800000]"></i>
                  Today's Schedule
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {todaySchedule.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{schedule.subject.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{schedule.classSection.name}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs font-medium text-gray-900">{formatTimeRangeShort(schedule.time)}</p>
                          <p className="text-xs text-gray-500">{schedule.duration}h</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-calendar-times text-gray-300 text-4xl mb-3"></i>
                  <p className="text-sm text-gray-500">No classes scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Third Row: Disciplinary Action, Performance - Hidden for now */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"> */}
            {/* Disciplinary Action Card */}
            {/* <div 
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-exclamation-triangle mr-2 text-[#800000]"></i>
                  Disciplinary Action
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-orange-100 rounded-lg p-4">
                  <i className="fas fa-clock text-orange-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{disciplinaryData.ongoing}</p>
                  <p className="text-xs text-orange-700">Ongoing</p>
                </div>
                <div className="bg-yellow-100 rounded-lg p-4">
                  <i className="fas fa-search text-yellow-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{disciplinaryData.forReview}</p>
                  <p className="text-xs text-yellow-700">For Review</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-4">
                  <i className="fas fa-check-double text-blue-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{disciplinaryData.resolved}</p>
                  <p className="text-xs text-blue-700">Resolved</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <i className="fas fa-lock text-gray-700 mb-2 text-lg"></i>
                  <p className="text-2xl font-bold">{disciplinaryData.closed}</p>
                  <p className="text-xs text-gray-700">Closed</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                <i className="fas fa-clipboard-list mr-2"></i>
                Total Cases: {disciplinaryData.total}
              </div>
            </div> */}

            {/* Performance Card */}
            {/* <div 
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  <i className="fas fa-chart-line mr-2 text-[#800000]"></i>
                  Performance
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              
              {performanceData.averageScore > 0 && (
                <div className="mb-4">
                  <p className="text-sm mb-2">
                    <i className="fas fa-star mr-2"></i>
                    Average Score: <span className="font-bold text-[#800000]">{performanceData.averageScore}</span>
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full"
                      style={{ width: `${Math.min((performanceData.averageScore / 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 rounded-lg p-4">
                  <i className="fas fa-check-circle text-green-700 mb-2 text-lg"></i>
                  <p className="text-xl font-bold">{performanceData.completedReviews}</p>
                  <p className="text-xs text-green-700">Completed</p>
                </div>
                <div className="bg-yellow-100 rounded-lg p-4">
                  <i className="fas fa-hourglass-half text-yellow-700 mb-2 text-lg"></i>
                  <p className="text-xl font-bold">{performanceData.pendingReviews}</p>
                  <p className="text-xs text-yellow-700">Pending</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-4">
                  <i className="fas fa-chart-bar text-blue-700 mb-2 text-lg"></i>
                  <p className="text-xl font-bold">{performanceData.totalMetrics}</p>
                  <p className="text-xs text-blue-700">Metrics</p>
                </div>
              </div>
            </div> */}
          {/* </div> */}
        </div>
      </div>
    </>
  );
}
