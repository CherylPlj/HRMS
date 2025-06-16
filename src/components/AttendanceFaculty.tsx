'use client';

import React, { useEffect, useState } from 'react';
import { Schedule, AttendanceRecord } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { toast } from 'react-toastify';
import { useAttendance } from '../contexts/AttendanceContext';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";

// import { useAuth } from '../contexts/AuthContext'; // or wherever your auth context is

interface AttendanceFacultyProps {
  onBack?: () => void;
}

const AttendanceFaculty: React.FC<AttendanceFacultyProps> = ({ onBack }) => {
  const { user } = useUser();
  const { currentRecord, setCurrentRecord, currentTime, currentDate, setSummary } = useAttendance();
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Supabase UserID and FacultyID when Clerk user is available
  useEffect(() => {
    const fetchUserAndFacultyId = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        console.log('No Clerk user email available');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching Supabase user for email:', user.emailAddresses[0].emailAddress);
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('UserID')
          .eq('Email', user.emailAddresses[0].emailAddress)
          .single();

        if (userError) {
          console.error('Error fetching Supabase user:', userError);
          return;
        }

        if (userData) {
          console.log('Found Supabase user:', userData);
          setSupabaseUserId(userData.UserID);

          // Fetch FacultyID using UserID
          const { data: facultyData, error: facultyError } = await supabase
            .from('Faculty')
            .select('FacultyID')
            .eq('UserID', userData.UserID)
            .single();

          if (facultyError) {
            console.error('Error fetching Faculty data:', facultyError);
            return;
          }

          if (facultyData) {
            console.log('Found Faculty ID:', facultyData);
            setFacultyId(facultyData.FacultyID);
          } else {
            console.log('No Faculty found for user:', userData.UserID);
          }
        } else {
          console.log('No Supabase user found for email:', user.emailAddresses[0].emailAddress);
        }
      } catch (error) {
        console.error('Error in fetchUserAndFacultyId:', error);
      }
    };

    fetchUserAndFacultyId();
  }, [user]);

  useEffect(() => {
    if (facultyId) {
      console.log('Faculty ID available, fetching attendance data');
      fetchAttendanceData();
    } else {
      console.log('No Faculty ID available yet');
    }
  }, [facultyId]);

  useEffect(() => {
  // pseudo-code: replace with your actual fetch logic
  async function fetchCurrentRecord() {
    if (facultyId !== null) {
      const record = await attendanceService.getTodayRecord(facultyId.toString(), user?.emailAddresses?.[0]?.emailAddress || '');
      console.log('Fetched current record:', record);
      setCurrentRecord(record);
    }
  }
  fetchCurrentRecord();
}, [facultyId]);

function isWithinTimeWindow(startHour: number, endHour: number) {
  const now = new Date();
  const hour = now.getHours();
  return hour >= startHour && hour < endHour;
}

// function getStatusForTimeIn(timeIn: string | null | undefined) {
//   if (!timeIn) return 'NOT_RECORDED';
//   const [h, m] = timeIn.split(':').map(Number);
//   if (h > 8 || (h === 8 && m >= 15)) return 'LATE';
//   return 'PRESENT';
// }

function formatTimeWithAmPm(timeStr: string | null | undefined) {
  if (!timeStr) return 'Not recorded';
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, seconds || 0, 0);
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
  const isTodayRecord = (record: AttendanceRecord | null) => {
    if (!record?.date) return false;
    const recDate = new Date(record.date);
    const now = new Date();
    // For debugging, log the record being checked:
    console.log('Checking record:', record);
    return (
      recDate.getFullYear() === now.getFullYear() &&
      recDate.getMonth() === now.getMonth() &&
      recDate.getDate() === now.getDate()
    );
  };

  const confirmAction = (action: 'time-in' | 'time-out'): Promise<boolean> => {
    return new Promise((resolve) => {
      const message = action === 'time-in' 
        ? 'Are you sure you want to mark your time in?' 
        : 'Are you sure you want to mark your time out?';
      
      if (window.confirm(message)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateTimeIn = (record: AttendanceRecord | null): boolean => {
    if (!record) return true;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordDate = new Date(record.date);
    
    // Check if there's already a time-in record for today
    if (recordDate.getTime() === today.getTime() && record.timeIn) {
      toast.error('You have already marked your time in for today');
      return false;
    }
    
    return true;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateTimeOut = (record: AttendanceRecord | null): boolean => {
    if (!record) {
      toast.error('Please mark your time in first');
      return false;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordDate = new Date(record.date);
    
    // Check if the record is for today
    if (recordDate.getTime() !== today.getTime()) {
      toast.error('Cannot mark time out for a different day');
      return false;
    }
    
    if (record.timeOut) {
      toast.error('You have already marked your time out for today');
      return false;
    }
    
    return true;
  };

  const handleTimeIn = async () => {
    if (isProcessing || !facultyId || !user?.emailAddresses?.[0]?.emailAddress) return;
    
    try {
      const confirmed = await confirmAction('time-in');
      if (!confirmed) return;
      
      setIsProcessing(true);
      console.log('Attempting to mark time in for faculty:', facultyId);
      // Pass both facultyId and email!
      const record = await attendanceService.markTimeIn(
        facultyId.toString(),
        user.emailAddresses[0].emailAddress
      );      console.log('Time in response:', record);
      
      setCurrentRecord({
        ...record,
        ipAddress: '---.---.---.-- (school-based)'
      });
      
      await fetchAttendanceData();
      toast.success('Time in marked successfully!');
    } catch (error) {
      console.error('Time in error:', error);
      if (error instanceof Error && error.message.includes('already recorded')) {
        toast.error('You have already marked your time in for today');
      } else {
        toast.error('Failed to mark time in. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (isProcessing || !facultyId || !user?.emailAddresses?.[0]?.emailAddress) return;
    
    try {
      const confirmed = await confirmAction('time-out');
      if (!confirmed) return;
      
      setIsProcessing(true);
      console.log('Attempting to mark time out for faculty:', facultyId);
      const record = await attendanceService.markTimeOut(facultyId.toString(), user.emailAddresses[0].emailAddress // <-- pass email here!
);
      console.log('Time out response:', record);
      
      setCurrentRecord({
        ...record,
        ipAddress: '---.---.---.-- (school-based)'
      });
      
      await fetchAttendanceData();
      toast.success('Time out marked successfully!');
    } catch (error) {
      console.error('Time out error:', error);
      if (error instanceof Error) {
        if (error.message.includes('already recorded')) {
          toast.error('You have already marked your time out for today');
        } else if (error.message.includes('No time-in record')) {
          toast.error('Please mark your time in first');
        } else {
          toast.error('Failed to mark time out. Please try again.');
        }
      } else {
        toast.error('Failed to mark time out. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!facultyId) {
      console.log('Cannot fetch attendance data: No Faculty ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching attendance data for faculty:', facultyId);
      const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
      const [summaryData, scheduleData, todayRecord] = await Promise.all([
        attendanceService.getAttendanceSummary(facultyId.toString(), email),
        attendanceService.getSchedule(facultyId.toString(), email),
        attendanceService.getTodayRecord(facultyId.toString(), email)
      ]);
      console.log('Fetched summary data:', summaryData);
      console.log('Fetched schedule data:', scheduleData);
      console.log('Fetched today\'s record:', todayRecord);

      if (!summaryData || !scheduleData) {
        console.error('Missing data in response:', { summaryData, scheduleData });
        toast.error('Failed to fetch complete attendance data');
        return;
      }

      setSummary(summaryData);
      setSchedule(scheduleData);
      setCurrentRecord(todayRecord);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]" />
      </div>
    );
  }

  const handleDownloadSchedule = async () => {
  try {
    const FacultyID = facultyId; 
    //const email = user?.emailAddresses?.[0]?.emailAddress ?? ''; 

    const response = await fetch(`/api/schedule/${FacultyID}`);
    const schedule = await response.json();

    if (!Array.isArray(schedule) || schedule.length === 0) {
      alert("No schedule data to download.");
      return;
    }

    // Convert to CSV
    const headers = ["Day", "Time In", "Time Out", "Status"];
    const rows = schedule.map(item => [
      item.day,
      item.timeIn,
      item.timeOut,
      item.subject,
      item.classSection,
      item.status
    ]);
    
//       const csvContent = [headers, ...rows].map(row =>
//       row.map(value => `"${value}"`).join(",")
//     ).join("\n");

//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "weekly_schedule.csv";
//     link.click();
//     URL.revokeObjectURL(url);
//   } catch (error) {
//     console.error("Error downloading schedule:", error);
//     alert("Failed to download schedule.");
//   }
// };
    const worksheet = XLSX.utils.json_to_sheet(schedule.map(s => ({
      Day: s.day,
      "Time In": s.timeIn,
      "Time Out": s.timeOut,
      Subject: s.subject,
      "Class Section": s.classSection,
      Status: s.status,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");

    XLSX.writeFile(workbook, "Weekly_Schedule.xlsx");
  } catch (error) {
    console.error("Excel download error:", error);
    alert("Failed to export schedule.");
  }
};


  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-[#800000] hover:text-[#600000] transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Dashboard
                </button>
              )}
              <p className="text-sm text-gray-500">Track your schedule</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="text-sm font-medium text-gray-700">
                <div>Current Time: <span className="text-[#800000] font-semibold">{currentTime}</span></div>
                <div>Current Date: <span className="text-[#800000] font-semibold">{currentDate}</span></div>
              </div>
            </div>
          </div>
  
        </div>

        {/* Schedule Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
            <button 
              onClick={() => {handleDownloadSchedule}}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#800000] hover:bg-[#a00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Schedule
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.timeIn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.timeOut}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusBadgeColor = (status: string | undefined) => {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-800';
    case 'ABSENT':
      return 'bg-red-100 text-red-800';
    case 'LATE':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default AttendanceFaculty;