import React, { useState } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";
import Head from 'next/head';

export default function DashboardContent() {
  const [dateRange, setDateRange] = useState([new Date("2025-02-01"), new Date("2025-03-20")]);

  const handleDateChange = (dates: [any, any]) => {
    const [start, end] = dates;
    setDateRange([start, end]);
  };

  const pieData = {
    labels: ["Present", "Absent", "Late"],
    datasets: [
      {
        data: [70, 20, 10],
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"],
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
                <span className="text-[#800000] font-bold">CHECK-IN</span>
              </p>
              <p>
                <span className="font-bold text-black">Date:</span>{" "}
                <span className="text-[#800000]">03/24/2025</span>
              </p>
              <p>
                <span className="font-bold text-black">Time:</span>{" "}
                <span className="text-[#800000]">8:05 AM</span>
              </p>
              <p>
                <span className="font-bold text-black">IP Address:</span>{" "}
                <span className="text-[#800000]">---.---.---.-- (school-based)</span>
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
          <div className="bg-white shadow-md p-6 rounded-lg w-300 h-60 flex flex-col justify-center">
            <h2 className="text-xl text-black font-bold mb-4">Schedule of the Day</h2>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-b p-2 text-gray-600">Subject</th>
                  <th className="border-b p-2 text-gray-600">Day</th>
                  <th className="border-b p-2 text-gray-600">Section</th>
                  <th className="border-b p-2 text-gray-600">Start Time</th>
                  <th className="border-b p-2 text-gray-600">End Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 text-black">Art Appreciation</td>
                  <td className="p-2 text-black">Thursday</td>
                  <td className="p-2 text-black">ARTES 12A</td>
                  <td className="p-2 text-black">9:00 AM</td>
                  <td className="p-2 text-black">11:30 AM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}