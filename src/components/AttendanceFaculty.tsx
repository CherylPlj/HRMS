import React, { useEffect, useState } from 'react';
import { Schedule, AttendanceRecord } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { toast } from 'react-toastify';
import { useAttendance } from '../contexts/AttendanceContext';

const EMPLOYEE_ID = '123-4567-FA'; // This should come from auth context in a real app

const AttendanceFaculty: React.FC = () => {
  const { currentRecord, setCurrentRecord, currentTime, currentDate, setSummary } = useAttendance();
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (isProcessing) return;
    
    try {
      const confirmed = await confirmAction('time-in');
      if (!confirmed) return;
      
      setIsProcessing(true);
      console.log('Attempting to mark time in for employee:', EMPLOYEE_ID);
      const record = await attendanceService.markTimeIn(EMPLOYEE_ID);
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
        toast.error('You have already marked your time in for today');
      } else {
        toast.error('Failed to mark time in. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (isProcessing) return;
    
    try {
      const confirmed = await confirmAction('time-out');
      if (!confirmed) return;
      
      setIsProcessing(true);
      console.log('Attempting to mark time out for employee:', EMPLOYEE_ID);
      const record = await attendanceService.markTimeOut(EMPLOYEE_ID);
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
    try {
      console.log('Fetching attendance data for employee:', EMPLOYEE_ID);
      const [summaryData, scheduleData, todayRecord] = await Promise.all([
        attendanceService.getAttendanceSummary(EMPLOYEE_ID),
        attendanceService.getSchedule(EMPLOYEE_ID),
        attendanceService.getTodayRecord(EMPLOYEE_ID)
      ]);
      console.log('Fetched summary data:', summaryData);
      console.log('Fetched schedule data:', scheduleData);
      console.log('Fetched today\'s record:', todayRecord);

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

  useEffect(() => {
    fetchAttendanceData();
  }, []);

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

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <p className="text-sm text-gray-500">Track your daily attendance and schedule</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="text-sm font-medium text-gray-700">
                <div>Current Time: <span className="text-[#800000] font-semibold">{currentTime}</span></div>
                <div>Current Date: <span className="text-[#800000] font-semibold">{currentDate}</span></div>
              </div>
            </div>
          </div>

          {/* Time In/Out Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mark Attendance</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Time In Button */}
                <button
                  className={`flex-1 ${
                    (currentRecord?.timeIn &&
                      currentRecord.date &&
                      new Date(currentRecord.date).toDateString() === new Date().toDateString()) ||
                    isProcessing
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#800000] hover:bg-[#a00000] transform hover:scale-105'
                  } text-white rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200`}
                  onClick={handleTimeIn}
                  disabled={
                    Boolean(
                    (currentRecord?.timeIn &&
                      currentRecord.date &&
                      new Date(currentRecord.date).toDateString() === new Date().toDateString()) ||
                    isProcessing
                    ) || !validateTimeIn(currentRecord)
                  }
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Time In'
                  )}
                </button>
                {/* Time Out Button */}
                <button
                  className={`flex-1 ${
                    (!currentRecord?.timeIn ||
                      currentRecord?.timeOut ||
                      !currentRecord?.date ||
                      new Date(currentRecord.date).toDateString() !== new Date().toDateString() ||
                      isProcessing)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#800000] hover:bg-[#a00000] transform hover:scale-105'
                  } text-white rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200`}
                  onClick={handleTimeOut}
                  disabled={Boolean(
                  (
                    (currentRecord?.timeIn &&
                      currentRecord.date &&
                      new Date(currentRecord.date).toDateString() === new Date().toDateString()) ||
                    isProcessing
                  ) || !validateTimeIn(currentRecord)
                )}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Time Out'}
                </button>
              </div>
            </div>

            {/* Today's Record Card */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Record</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{currentRecord?.date || 'Not recorded'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-600">Time In</span>
                  <span className="font-medium">{currentRecord?.timeIn || 'Not recorded'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-600">Time Out</span>
                  <span className="font-medium">{currentRecord?.timeOut || 'Not recorded'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(currentRecord?.status)}`}>
                    {currentRecord?.status || 'NOT_RECORDED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
            <button 
              onClick={() => {/* Implement download */}}
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