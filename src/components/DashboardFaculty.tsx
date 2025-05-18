import React, { useState } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";
import Head from 'next/head';
import { useAttendance } from '../contexts/AttendanceContext';

export default function DashboardFaculty() {
  const { currentRecord, currentTime, currentDate, summary } = useAttendance();
  const [dateRange, setDateRange] = useState([new Date("2025-02-01"), new Date("2025-03-20")]);

  const handleDateChange = (dates: [any, any]) => {
    const [start, end] = dates;
    setDateRange([start, end]);
  };

  const pieData = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [
      {
        data: [summary.present, summary.absent, summary.late],
        backgroundColor: ['#4CAF50', '#f44336', '#FFC107'],
        borderColor: ['#43A047', '#E53935', '#FFB300'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="p-6 bg-gray-100 min-h-screen w-full flex flex-col">
        {/* Date Picker */}
        <div className="flex justify-end mb-6">
          <div className="flex items-center bg-[#800000] text-white px-4 py-2 rounded cursor-pointer">
            {/* <FaCalendarAlt className="mr-2" /> */}
            <i className="fas fa-calendar-alt mr-2"></i> {/* Replaced FaCalendarAlt */}
            <DatePicker
              selected={dateRange[0]}
              onChange={handleDateChange}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              selectsRange
              dateFormat="yyyy-MM-dd"
              customInput={
                <button className="flex items-center bg-[#800000] text-white px-4 py-2 rounded">
                  {dateRange[0]
                    ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1]?.toLocaleDateString() || ''}`
                    : "Select Date Range"}
                </button>
              }
              className="bg-[#800000] text-white outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Check-In and Check-Out Monitoring */}
          <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-center">
            <h2 className="text-xl text-black font-bold mb-4">Check-In and Check-Out Monitoring</h2>
            <div className="space-y-2">
              <p>
                <span className="font-bold text-black">Status:</span>{" "}
                <span className="text-[#800000] font-bold">
                  {currentRecord?.timeOut ? 'CHECKED OUT' : currentRecord?.timeIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                </span>
              </p>
              <p>
                <span className="font-bold text-black">Date:</span>{" "}
                <span className="text-[#800000]">{currentDate}</span>
              </p>
              <p>
                <span className="font-bold text-black">Time:</span>{" "}
                <span className="text-[#800000]">{currentTime}</span>
              </p>
              <p>
                <span className="font-bold text-black">IP Address:</span>{" "}
                <span className="text-[#800000]">{currentRecord?.ipAddress || '---.---.---.-- (not recorded)'}</span>
              </p>
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-white shadow-md p-6 rounded-lg w-100 h-90 flex flex-col justify-center">
            <h2 className="text-xl text-black font-bold mb-4">Attendance</h2>
            <div className="flex justify-center items-center">
              <div className="w-60 h-60">
                <Pie data={pieData} />
              </div>
            </div>
          </div>

          {/* Schedule of the Day */}
          <div className="bg-white shadow-md p-6 rounded-lg col-span-2">
            <h2 className="text-xl text-black font-bold mb-4">Schedule of the Day</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Section</th>
                    <th className="px-4 py-2 text-left">Room</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-4 py-2">Mathematics</td>
                    <td className="border px-4 py-2">8:00 AM - 9:00 AM</td>
                    <td className="border px-4 py-2">Grade 7 - Einstein</td>
                    <td className="border px-4 py-2">Room 101</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2">Science</td>
                    <td className="border px-4 py-2">9:15 AM - 10:15 AM</td>
                    <td className="border px-4 py-2">Grade 8 - Newton</td>
                    <td className="border px-4 py-2">Laboratory 1</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2">Mathematics</td>
                    <td className="border px-4 py-2">10:30 AM - 11:30 AM</td>
                    <td className="border px-4 py-2">Grade 9 - Pythagoras</td>
                    <td className="border px-4 py-2">Room 103</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}