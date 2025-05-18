import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { AttendanceRecord, AttendanceSummary, Schedule } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { toast } from 'react-toastify';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const EMPLOYEE_ID = '123-4567-FA'; // This should come from auth context in a real app

const AttendanceFaculty: React.FC = () => {
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AttendanceSummary>({
    present: 0,
    absent: 0,
    late: 0,
    total: 0
  });

  const getCurrentDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return { time, date };
  };

  const handleTimeIn = async () => {
    try {
      const record = await attendanceService.markTimeIn(EMPLOYEE_ID);
      setCurrentRecord(record);
      toast.success('Time in marked successfully!');
    } catch (error) {
      toast.error('Failed to mark time in. Please try again.');
      console.error('Time in error:', error);
    }
  };

  const handleTimeOut = async () => {
    try {
      const record = await attendanceService.markTimeOut(EMPLOYEE_ID);
      setCurrentRecord(record);
      toast.success('Time out marked successfully!');
    } catch (error) {
      toast.error('Failed to mark time out. Please try again.');
      console.error('Time out error:', error);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const [summaryData, scheduleData] = await Promise.all([
        attendanceService.getAttendanceSummary(EMPLOYEE_ID),
        attendanceService.getSchedule(EMPLOYEE_ID)
      ]);

      setSummary(summaryData);
      setSchedule(scheduleData);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]" />
      </div>
    );
  }

  const pieData = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [
      {
        data: [summary.present, summary.absent, summary.late],
        backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
        hoverBackgroundColor: ['#45A049', '#E53935', '#FFB300'],
      },
    ],
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-900">
      <main className="flex-1 flex flex-col bg-white mx-auto rounded-md shadow-md">
        <section className="border border-[#800000] rounded-md mx-6 my-4 p-4 flex flex-col md:flex-row md:space-x-6">
          {/* Time In/Out and details */}
          <div className="flex flex-col space-y-4 md:w-1/2">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">
                <div>Current Time: <span className="text-[#800000]">{getCurrentDateTime().time}</span></div>
                <div>Current Date: <span className="text-[#800000]">{getCurrentDateTime().date}</span></div>
              </div>
              <div className="flex space-x-4">
                <button
                  className={`${
                    currentRecord?.timeIn 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#800000] hover:bg-[#a00000]'
                  } text-white rounded-md px-6 py-3 text-sm font-bold shadow-md transition-all`}
                  onClick={handleTimeIn}
                  disabled={!!currentRecord?.timeIn}
                >
                  ⏱️ Time In
                </button>
                <button
                  className={`${
                    !currentRecord?.timeIn || currentRecord?.timeOut
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#800000] hover:bg-[#a00000]'
                  } text-white rounded-md px-6 py-3 text-sm font-bold shadow-md transition-all`}
                  onClick={handleTimeOut}
                  disabled={!currentRecord?.timeIn || !!currentRecord?.timeOut}
                >
                  🕓 Time Out
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

          {/* Pie chart */}
          <div className="md:w-1/2 flex flex-col items-center justify-center mt-6 md:mt-0">
            <h3 className="text-sm font-semibold text-[#800000] mb-4">
              Attendance Summary
            </h3>
            <div className="w-64 h-64">
              <Pie data={pieData} />
            </div>
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
                  <th className="border border-gray-300 px-2 py-1 text-left">ID</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Subject</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Class & Section</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Day</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.id} className="even:bg-white odd:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1">{row.id}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.name}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.subject}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.classSection}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.day}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.time}</td>
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