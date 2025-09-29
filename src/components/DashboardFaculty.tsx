import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'; // For Next.js 13+
// import AttendanceFaculty from '@/components/AttendanceFaculty';
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Head from 'next/head';
import { useAttendance } from '../contexts/AttendanceContext';
import { attendanceService } from '../services/attendanceService';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';

// Add interfaces for component props
interface ComponentWithBackButton {
  onBack: () => void;
}

interface Schedule {
  id: number;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  subject: {
    name: string;
  };
  classSection: {
    name: string;
  };
}

interface RawSchedule {
  id: number;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  subject: {
    name: string;
  };
  classSection: {
    name: string;
  };
}

interface Department {
  DepartmentName: string;
}

interface FacultyData {
  FacultyID: number;
  Position: string;
  EmploymentStatus: string;
  HireDate: string;
  Department: Department;
}

export default function DashboardFaculty() {
  const { user } = useUser();
  const router = useRouter();
  const { currentRecord, setCurrentRecord, currentTime, currentDate, summary } = useAttendance();
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()),
    new Date()
  ]);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'personal' | 'documents' | 'leave'>('dashboard');
  const [scheduleForWeek, setScheduleForWeek] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type AttendanceRecord = {
    id?: string;
    facultyId?: number;
    date: string;
    timeIn?: string;
    timeOut?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);

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
            .select('FacultyID')
            .eq('UserID', userData.UserID)
            .single();

          if (facultyError) {
            setError('Failed to fetch faculty data');
            return;
          }

          if (facultyData) {
            setFacultyId(facultyData.FacultyID);
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

  // Fetch schedule data when faculty ID is available
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!facultyId) return;

      try {
        interface SupabaseSchedule {
          id: number;
          facultyId: number;
          subjectId: number;
          classSectionId: number;
          day: string;
          time: string;
          duration: number;
          subject: {
            name: string;
          };
          classSection: {
            name: string;
          };
        }

        const { data, error } = await supabase
          .from('Schedules')
          .select(`
            id,
            facultyId,
            subjectId,
            classSectionId,
            day,
            time,
            duration,
            subject:Subject!inner (
              name
            ),
            classSection:ClassSection!inner (
              name
            )
          `)
          .eq('facultyId', facultyId)
          .returns<SupabaseSchedule[]>();

        if (error) {
          console.error('Error fetching schedules:', error);
          return;
        }

        // The data is already correctly typed, so we can use it directly
        setScheduleForWeek(data || []);
      } catch (error) {
        console.error('Error in schedule fetch:', error);
      }
    };

    const safeFetchAttendanceData = async () => {
      try {
        await fetchAttendanceData();
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      }
    };

    const safeFetchOtherData = async () => {
      try {
        await fetchOtherData();
      } catch (error) {
        console.error('Error fetching other dashboard data:', error);
      }
    };

    if (facultyId) {
      fetchSchedule();
      safeFetchAttendanceData();
      safeFetchOtherData();
    }
  }, [facultyId]);

  // Fetch attendance data when faculty ID is available
  useEffect(() => {
    if (facultyId) {
      fetchAttendanceData();
      fetchOtherData();
    }
  }, [dateRange, facultyId]);

  const fetchAttendanceData = async () => {
    if (!facultyId || !user?.emailAddresses?.[0]?.emailAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await attendanceService.getAttendanceHistory(
        facultyId.toString(),
        dateRange[0].toISOString(),
        dateRange[1].toISOString(),
        user.emailAddresses[0].emailAddress
      );

      if (!data || !Array.isArray(data)) {
        setAttendanceData([]);
        return;
      }

      const mappedData = data.map((record: any) => ({
        id: record.id,
        facultyId: record.facultyId,
        date: record.date || new Date().toISOString().split('T')[0],
        timeIn: record.timeIn || undefined,
        timeOut: record.timeOut || undefined,
        status: record.status || 'NOT_RECORDED',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

      setAttendanceData(mappedData);

      const today = new Date();
      const todayRecord = mappedData.find((rec) => {
        const recDate = new Date(rec.date);
        return (
          recDate.getFullYear() === today.getFullYear() &&
          recDate.getMonth() === today.getMonth() &&
          recDate.getDate() === today.getDate()
        );
      });

      if (todayRecord) {
        setCurrentRecord(todayRecord);
      } else {
        setCurrentRecord(null);
      }
    } catch (error) {
      setAttendanceData([]);
      setCurrentRecord(null);
      setError('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

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
        const rejected = documents?.filter(doc => doc.SubmissionStatus === 'Rejected').length || 0;

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
        const rejectedLeaves = leaves?.filter(leave => leave.Status === 'Rejected').length || 0;

        setLeaveData({
          available: availableLeaves - approvedLeaves,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves
        });
      }
    } catch (error) {
      console.error('Error fetching other dashboard data:', error);
    }
  };

  const handleRefresh = () => {
    setError(null);
    fetchAttendanceData();
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

  // Data for Attendance Record Bar Chart (Present/Absent)
  // Compute present and absent counts per weekday from attendanceData
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const presentCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  const absentCounts: number[] = [0, 0, 0, 0, 0, 0, 0];

  attendanceData.forEach(record => {
    const date = new Date(record.date);
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (record.status === 'PRESENT') {
      presentCounts[day]++;
    } else if (record.status === 'ABSENT') {
      absentCounts[day]++;
    }
  });

  const barData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Present',
        data: [presentCounts[1], presentCounts[2], presentCounts[3], presentCounts[4], presentCounts[5]],
        backgroundColor: '#4CAF50',
      },
      {
        label: 'Absent',
        data: [absentCounts[1], absentCounts[2], absentCounts[3], absentCounts[4], absentCounts[5]],
        backgroundColor: '#f44336',
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Add component view conditionals
  // if (currentView === 'attendance') {
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  //         <button
  //           onClick={() => setCurrentView('dashboard')}
  //           className="mb-6 flex items-center text-[#800000] hover:text-[#600000] transition-colors"
  //         >
  //           <i className="fas fa-arrow-left mr-2"></i>
  //           Back to Dashboard
  //         </button>
  //         <AttendanceFaculty onBack={() => setCurrentView('dashboard')} />
  //       </div>
  //     </div>
  //   );
  // }

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
        <title>Faculty Dashboard</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Row: Personal Data, Employment Status, Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Personal Data */}
            <div 
              onClick={() => setCurrentView('personal')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-user-circle mr-2 text-[#800000]"></i>
                  Personal Data
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <p><span className="font-medium"><i className="fas fa-briefcase mr-2 text-gray-500"></i>Position:</span> {personalData.Position}</p>
              <p><span className="font-medium"><i className="fas fa-building mr-2 text-gray-500"></i>Department:</span> {personalData.DepartmentName}</p>
            </div>

            {/* Employment Status */}
            <div 
              onClick={() => setCurrentView('personal')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-id-badge mr-2 text-[#800000]"></i>
                  Employment Status
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-check-circle text-green-500"></i>
                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">{personalData.EmploymentStatus}</span>
              </div>
              <p><span className="font-medium"><i className="fas fa-calendar-alt mr-2 text-gray-500"></i>Hire Date:</span> {personalData.HireDate}</p>
            </div>

            {/* Date & Time */}
            <div 
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-clock mr-2 text-[#800000]"></i>
                  Date & Time
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <p className="text-gray-700"><i className="fas fa-calendar mr-2"></i>{currentDate}</p>
              <p className="text-gray-700"><i className="fas fa-clock mr-2"></i>{currentTime}</p>
            </div>
          </div>

          {/* Second Row: Document Requirements, Leave */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Document Requirements Card */}
            <div 
              onClick={() => setCurrentView('documents')}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-file-alt mr-2 text-[#800000]"></i>
                  Total Document Requirements
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-yellow-100 rounded-lg p-4">
                  <i className="fas fa-hourglass-half text-yellow-700 mb-2"></i>
                  <p className="text-2xl font-bold">{documentRequirements.pending}</p>
                  <p className="text-sm text-yellow-700">Pending</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-4">
                  <i className="fas fa-paper-plane text-blue-700 mb-2"></i>
                  <p className="text-2xl font-bold">{documentRequirements.submitted}</p>
                  <p className="text-sm text-blue-700">Submitted</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <i className="fas fa-check-circle text-green-700 mb-2"></i>
                  <p className="text-2xl font-bold">{documentRequirements.approved}</p>
                  <p className="text-sm text-green-700">Approved</p>
                </div>
                <div className="bg-red-100 rounded-lg p-4">
                  <i className="fas fa-times-circle text-red-700 mb-2"></i>
                  <p className="text-2xl font-bold">{documentRequirements.rejected}</p>
                  <p className="text-sm text-red-700">Rejected</p>
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
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-calendar-minus mr-2 text-[#800000]"></i>
                  Total Leave
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <p className="mb-2">
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
                <div className="bg-yellow-100 rounded-lg p-4">
                  <i className="fas fa-hourglass-half text-yellow-700 mb-2"></i>
                  <p className="text-xl font-bold">{leaveData.pending}</p>
                  <p className="text-sm text-yellow-700">Pending</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <i className="fas fa-check-circle text-green-700 mb-2"></i>
                  <p className="text-xl font-bold">{leaveData.approved}</p>
                  <p className="text-sm text-green-700">Approved</p>
                </div>
                <div className="bg-red-100 rounded-lg p-4">
                  <i className="fas fa-times-circle text-red-700 mb-2"></i>
                  <p className="text-xl font-bold">{leaveData.rejected}</p>
                  <p className="text-sm text-red-700">Rejected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: Attendance Record Bar Chart and Schedule */}
          {/* <div className="mb-6"> */}
            {/* Attendance Record Bar Chart */}
            {/* <div 
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
          >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-chart-bar mr-2 text-[#800000]"></i>
                  Attendance Record
                </h3>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
              <div className="h-64">
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <i className="fas fa-info-circle mr-2"></i>
                Present and Absent counts per day
              </div>
            </div>
          </div> */}

          {/* Fourth Row: Recent Attendance Records */}
          {/* <div 
            onClick={() => setCurrentView('attendance')}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                <i className="fas fa-history mr-2 text-[#800000]"></i>
                Recent Attendance Records
              </h3>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <i className="fas fa-calendar-day mr-2"></i>Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <i className="fas fa-sign-in-alt mr-2"></i>Time In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <i className="fas fa-sign-out-alt mr-2"></i>Time Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <i className="fas fa-info-circle mr-2"></i>Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.slice(0, 5).map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {record.timeIn ? formatTimeWithAmPm(record.timeIn) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {record.timeOut ? formatTimeWithAmPm(record.timeOut) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                          record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
}
