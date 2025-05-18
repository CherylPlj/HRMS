import React, { useEffect, useState } from 'react';
import { AttendanceRecord, AttendanceSummary, Schedule } from '../types/attendance';
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

  const handleTimeIn = async () => {
    if (isProcessing) return;
    
    try {
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
      toast.error(error instanceof Error ? error.message : 'Failed to mark time in. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (isProcessing) return;
    
    try {
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
      toast.error(error instanceof Error ? error.message : 'Failed to mark time out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      console.log('Fetching attendance data for employee:', EMPLOYEE_ID);
      const [summaryData, scheduleData] = await Promise.all([
        attendanceService.getAttendanceSummary(EMPLOYEE_ID),
        attendanceService.getSchedule(EMPLOYEE_ID)
      ]);
      console.log('Fetched summary data:', summaryData);
      console.log('Fetched schedule data:', scheduleData);

      setSummary(summaryData);
      setSchedule(scheduleData);
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
    <div className="min-h-screen flex font-sans text-gray-900">
      <main className="flex-1 flex flex-col bg-white mx-auto rounded-md shadow-md">
        <section className="border border-[#800000] rounded-md mx-6 my-4 p-4">
          {/* Time In/Out and details */}
          <div className="flex flex-col space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">
                <div>Current Time: <span className="text-[#800000]">{currentTime}</span></div>
                <div>Current Date: <span className="text-[#800000]">{currentDate}</span></div>
              </div>
              <div className="flex space-x-4">
                <button
                  className={`${
                    currentRecord?.timeIn || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#800000] hover:bg-[#a00000]'
                  } text-white rounded-md px-6 py-3 text-sm font-bold shadow-md transition-all`}
                  onClick={handleTimeIn}
                  disabled={!!currentRecord?.timeIn || isProcessing}
                >
                  {isProcessing ? 'Processing...' : ' Time In'}
                </button>
                <button
                  className={`${
                    !currentRecord?.timeIn || currentRecord?.timeOut || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#800000] hover:bg-[#a00000]'
                  } text-white rounded-md px-6 py-3 text-sm font-bold shadow-md transition-all`}
                  onClick={handleTimeOut}
                  disabled={!currentRecord?.timeIn || !!currentRecord?.timeOut || isProcessing}
                >
                  {isProcessing ? 'Processing...' : ' Time Out'}
                </button>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-semibold text-[#800000] mb-2">Today's Attendance Record</h3>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{currentRecord?.date || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time In:</span>
                    <span className="font-medium">{currentRecord?.timeIn || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Out:</span>
                    <span className="font-medium">{currentRecord?.timeOut || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${getStatusColor(currentRecord?.status)}`}>
                      {currentRecord?.status || 'NOT_RECORDED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {/* Implement history view */}}
              className="text-xs text-[#800000] font-semibold hover:underline text-left"
            >
              View Attendance History
            </button>
          </div>
        </section>

        {/* Schedule Table */}
        <section className="mx-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[#800000] font-semibold text-sm">
              Schedule
            </h2>
            <button 
              onClick={() => {/* Implement download */}}
              className="bg-[#800000] text-white text-xs font-semibold rounded-md px-3 py-1 flex items-center space-x-1"
            >
              <i className="fas fa-download text-xs" />
              <span>Download</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-semibold">
                  <th className="p-2 border">Day</th>
                  <th className="p-2 border">Time In</th>
                  <th className="p-2 border">Time Out</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border">{item.day}</td>
                    <td className="p-2 border">{item.timeIn}</td>
                    <td className="p-2 border">{item.timeOut}</td>
                    <td className="p-2 border">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'PRESENT':
      return 'text-green-600';
    case 'ABSENT':
      return 'text-red-600';
    case 'LATE':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
};

export default AttendanceFaculty; 