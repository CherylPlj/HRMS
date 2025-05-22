import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// import { FaCalendarAlt } from "react-icons/fa";
import Head from 'next/head';
import { useAttendance } from '../contexts/AttendanceContext';
import { attendanceService } from '../services/attendanceService';

const EMPLOYEE_ID = '123-4567-FA'; // This should come from auth context in a real app

export default function DashboardFaculty() {
  const { currentRecord, currentTime, currentDate, summary } = useAttendance();
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setDate(new Date().getDate() - 30)),
    new Date()
  ]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceData();
  }, [dateRange]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceHistory(
        EMPLOYEE_ID,
        dateRange[0].toISOString(),
        dateRange[1].toISOString()
      );
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    if (dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const lineData = {
    labels: attendanceData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Time In',
        data: attendanceData.map(d => {
          if (!d.timeIn) return null;
          const time = new Date(d.timeIn);
          return time.getHours() + (time.getMinutes() / 60);
        }),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Time Out',
        data: attendanceData.map(d => {
          if (!d.timeOut) return null;
          const time = new Date(d.timeOut);
          return time.getHours() + (time.getMinutes() / 60);
        }),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.1,
        fill: true
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Attendance Timeline'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            if (value === null) return 'Not recorded';
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return `${context.dataset.label}: ${hours}:${minutes.toString().padStart(2, '0')}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Hour of Day'
        },
        min: 6,
        max: 20,
        ticks: {
          callback: function(value: any) {
            return `${value}:00`;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  return (
    <>
      <Head>
        <title>Faculty Dashboard</title>
        {/* <script src="https://cdn.tailwindcss.com"></script> */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Bar with Date Picker */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">{currentDate}</div>
            </div>
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
              <i className="fas fa-calendar-alt text-gray-400 mr-2"></i>
              <DatePicker
                selected={dateRange[0]}
                onChange={handleDateChange}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                selectsRange
                dateFormat="yyyy-MM-dd"
                maxDate={new Date()}
                className="border-none focus:ring-0 text-sm"
                customInput={
                  <input
                    className="border-none focus:ring-0 text-sm w-48"
                    value={`${dateRange[0].toLocaleDateString()} - ${dateRange[1]?.toLocaleDateString() || ''}`}
                    readOnly
                  />
                }
              />
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Status</p>
                  <p className={`text-2xl font-bold mt-2 ${
                    currentRecord?.timeOut ? 'text-green-600' : 
                    currentRecord?.timeIn ? 'text-blue-600' : 
                    'text-red-600'
                  }`}>
                    {currentRecord?.timeOut ? 'CHECKED OUT' : currentRecord?.timeIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-50">
                  <i className={`fas ${
                    currentRecord?.timeOut ? 'fa-sign-out-alt text-green-600' : 
                    currentRecord?.timeIn ? 'fa-sign-in-alt text-blue-600' : 
                    'fa-clock text-red-600'
                  } text-xl`}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Date</p>
                  <p className="text-2xl font-bold mt-2 text-gray-900">{currentDate}</p>
                </div>
                <div className="p-3 rounded-full bg-gray-50">
                  <i className="fas fa-calendar-day text-[#800000] text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Time</p>
                  <p className="text-2xl font-bold mt-2 text-gray-900">{currentTime}</p>
                </div>
                <div className="p-3 rounded-full bg-gray-50">
                  <i className="fas fa-clock text-[#800000] text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Timeline */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Timeline</h2>
                <button 
                  onClick={fetchAttendanceData}
                  className="text-sm text-[#800000] hover:text-[#600000] transition-colors"
                >
                  <i className="fas fa-sync-alt mr-1"></i>
                  Refresh
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
                </div>
              ) : (
                <div className="h-96">
                  <Line data={lineData} options={lineOptions} />
                </div>
              )}
            </div>

            {/* Recent Attendance Records */}
            <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Records</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.slice(0, 5).map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : '-'}
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}