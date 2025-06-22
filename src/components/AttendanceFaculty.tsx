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
import ExcelJS from 'exceljs';
import { format, isAfter, startOfToday } from 'date-fns';

// import { useAuth } from '../contexts/AuthContext'; // or wherever your auth context is

interface AttendanceFacultyProps {
  onBack: () => void;
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
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [attendancePeriod, setAttendancePeriod] = useState<'month' | 'week'>('month');
  const [downloadingDTR, setDownloadingDTR] = useState(false);
  const [timeInValue, setTimeInValue] = useState('');
  const [timeOutValue, setTimeOutValue] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Set initial date to today if it's a weekday, or previous Friday if it's a weekend
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0) { // Sunday
      today.setDate(today.getDate() - 2); // Set to Friday
    } else if (day === 6) { // Saturday
      today.setDate(today.getDate() - 1); // Set to Friday
    }
    setSelectedDate(format(today, 'yyyy-MM-dd'));
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

useEffect(() => {
  if (facultyId && user?.emailAddresses?.[0]?.emailAddress) {
    // Fetch attendance history for the selected period
    const now = new Date();
    let startDate: string, endDate: string;
    if (attendancePeriod === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Saturday
      startDate = format(start, 'yyyy-MM-dd');
      endDate = format(end, 'yyyy-MM-dd');
    } else {
      startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    }
    setHistoryLoading(true);
    attendanceService
      .getAttendanceHistory(facultyId.toString(), startDate, endDate, user.emailAddresses[0].emailAddress)
      .then((records) => setAttendanceHistory(records || []))
      .finally(() => setHistoryLoading(false));
  }
}, [facultyId, user, attendancePeriod]);

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

  const validateDate = (date: string): boolean => {
    const selectedDay = new Date(date);
    const today = startOfToday();

    // Check if date is in the future
    if (isAfter(selectedDay, today)) {
      toast.error('Cannot select future dates');
      return false;
    }

    // Check if it's a weekend
    const dayOfWeek = selectedDay.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      toast.error('Please select a date from Monday to Friday');
      return false;
    }

    return true;
  };

  const handleTimeIn = async () => {
    if (isProcessing || !facultyId || !user?.emailAddresses?.[0]?.emailAddress || !timeInValue || !selectedDate) return;
    
    if (!validateDate(selectedDate)) return;
    
    try {
      const confirmed = await confirmAction('time-in');
      if (!confirmed) return;
      
      // Validate time format
      const [hours, minutes] = timeInValue.split(':').map(Number);
      if (hours < 6) {
        toast.error('Time in cannot be earlier than 06:00');
        return;
      }
      if (hours > 18) {
        toast.error('Time in cannot be later than 18:00');
        return;
      }
      
      setIsProcessing(true);
      console.log('Attempting to mark time in for faculty:', facultyId);
      const record = await attendanceService.markTimeIn(
        facultyId.toString(),
        user.emailAddresses[0].emailAddress,
        timeInValue,
        selectedDate
      );
      console.log('Time in response:', record);
      
      setCurrentRecord({
        ...record,
        ipAddress: '---.---.---.-- (school-based)'
      });
      
      await fetchAttendanceData();
      toast.success('Time in marked successfully!');
    } catch (error) {
      console.error('Time in error:', error);
      if (error instanceof Error && error.message.includes('already recorded')) {
        toast.error('You have already marked your time in for this date');
      } else {
        toast.error('Failed to mark time in. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (isProcessing || !facultyId || !user?.emailAddresses?.[0]?.emailAddress || !timeOutValue || !selectedDate) return;
    
    if (!validateDate(selectedDate)) return;
    
    try {
      const confirmed = await confirmAction('time-out');
      if (!confirmed) return;
      
      // Validate time format
      const [hours, minutes] = timeOutValue.split(':').map(Number);
      if (hours < 6) {
        toast.error('Time out cannot be earlier than 06:00');
        return;
      }
      if (hours > 18) {
        toast.error('Time out cannot be later than 18:00');
        return;
      }
      
      setIsProcessing(true);
      console.log('Attempting to mark time out for faculty:', facultyId);
      const record = await attendanceService.markTimeOut(
        facultyId.toString(),
        user.emailAddresses[0].emailAddress,
        timeOutValue,
        selectedDate
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
          toast.error('You have already marked your time out for this date');
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

      // Only require scheduleData to be present
      if (!scheduleData) {
        console.error('Missing schedule data in response');
        toast.error('Failed to fetch schedule data');
        return;
      }

      // Set summary data if available, otherwise use default values
      if (summaryData) {
        setSummary(summaryData);
      } else {
        console.log('Summary data not available, using default values');
        setSummary({ present: 0, absent: 0, late: 0, total: 0 });
      }

      setSchedule(scheduleData);
      console.log('Set schedule state with:', scheduleData);
      setCurrentRecord(todayRecord);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDTR = async () => {
    if (!facultyId || !user?.emailAddresses?.[0]?.emailAddress) return;
    setDownloadingDTR(true);
    const now = new Date();
    let startDate: string, endDate: string;
    if (attendancePeriod === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Saturday
      startDate = format(start, 'yyyy-MM-dd');
      endDate = format(end, 'yyyy-MM-dd');
    } else {
      startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    }
    try {
      const url = `/api/dtr/download?facultyId=${facultyId}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download DTR');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `DTR_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Failed to download DTR.');
    } finally {
      setDownloadingDTR(false);
    }
  };

  // Add pagination calculation
  const paginatedHistory = attendanceHistory.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const totalPages = Math.ceil(attendanceHistory.length / recordsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
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
  
      const response = await fetch(`/api/schedule/${FacultyID}`);
      const schedule = await response.json();
  
      if (!Array.isArray(schedule) || schedule.length === 0) {
        alert("No schedule data to download.");
        return;
      }
  
      // Create a new Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Schedule");
  
      // Define worksheet headers
      worksheet.columns = [
        { header: "Day", key: "day" },
        { header: "Start", key: "timeIn" },
        { header: "End", key: "timeOut" },
        { header: "Duration (min)", key: "duration" },
        { header: "Subject", key: "subject" },
        { header: "Class Section", key: "classSection" },
        { header: "Status", key: "status" },
      ];
  
      // Add data rows
      schedule.forEach((s) => {
        worksheet.addRow({
          day: s.day,
          timeIn: s.timeIn,
          timeOut: s.timeOut,
          duration: s.duration,
          subject: s.subject,
          classSection: s.classSection,
          status: s.status,
        });
      });
  
      // Generate Excel file in-memory and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
  
      const blob = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
  
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Weekly_Schedule.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel download error:", error);
      alert("Failed to export schedule.");
    }
  };
    
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


  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              {/* {onBack && (
                <button
                  onClick={onBack}
                  className="text-[#800000] hover:text-[#600000] transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Dashboard
                </button>
              )} */}
              <p className="text-sm text-gray-500">Track your attendance records</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="text-sm font-medium text-gray-700">
                <div>Current Time: <span className="text-[#800000] font-semibold">{currentTime}</span></div>
                <div>Current Date: <span className="text-[#800000] font-semibold">{currentDate}</span></div>
              </div>
            </div>
          </div>

          {/* Time In/Out Section */}
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-700">Select Date (Monday-Friday only)</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (validateDate(newDate)) {
                    setSelectedDate(newDate);
                  }
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="timeIn" className="text-sm font-medium text-gray-700">Time In</label>
                <div className="flex space-x-2">
                  <input
                    type="time"
                    id="timeIn"
                    value={timeInValue}
                    onChange={(e) => setTimeInValue(e.target.value)}
                    min="06:00"
                    max="18:00"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  />
                  <button
                    onClick={handleTimeIn}
                    disabled={isProcessing || !timeInValue || !selectedDate}
                    className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Time In'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <label htmlFor="timeOut" className="text-sm font-medium text-gray-700">Time Out</label>
                <div className="flex space-x-2">
                  <input
                    type="time"
                    id="timeOut"
                    value={timeOutValue}
                    onChange={(e) => setTimeOutValue(e.target.value)}
                    min="06:00"
                    max="18:00"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  />
                  <button
                    onClick={handleTimeOut}
                    disabled={isProcessing || !timeOutValue || !selectedDate}
                    className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Time Out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

     

        {/* Attendance History Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Attendance History</h2>
            <div className="flex gap-2 items-center">
              <select
                value={attendancePeriod}
                onChange={e => setAttendancePeriod(e.target.value as 'week' | 'month')}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                title="Attendance Period"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]" />
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No attendance records found for this period.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(record.date), 'yyyy-MM-dd')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeWithAmPm(record.timeIn)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeWithAmPm(record.timeOut)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, attendanceHistory.length)} of {attendanceHistory.length} records
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

           {/* Schedule Section */}
           <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
            <button 
              onClick={handleDownloadSchedule}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Section</th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      No schedule data available
                    </td>
                  </tr>
                ) : (
                  schedule.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.timeIn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.timeOut}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.duration}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.classSection}</td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td> */}
                    </tr>
                  ))
                )}
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

export default AttendanceFaculty;                                                         `                                         `