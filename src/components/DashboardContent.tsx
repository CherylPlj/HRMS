import React, { useState } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";

export default function DashboardContent() {
  const [dateRange, setDateRange] = useState([new Date("2025-02-01"), new Date("2025-03-20")]);

  const handleDateChange = (dates) => {
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
    <div className="p-6 bg-gray-100 min-h-screen w-full flex flex-col">
      {/* Date Picker */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center bg-red-700 text-white px-4 py-2 rounded cursor-pointer">
          <FaCalendarAlt className="mr-2" />
          <DatePicker
            selected={dateRange[0]}
            onChange={handleDateChange}
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            selectsRange
            dateFormat="yyyy-MM-dd"
            customInput={
              <button className="flex items-center bg-red-700 text-white px-4 py-2 rounded">
                {dateRange[0]
                  ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1]?.toLocaleDateString() || ''}`
                  : "Select Date Range"}
              </button>
            }
            className="bg-red-700 text-white outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Faculty Section */}
        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-center">
          <h2 className="text-lg text-black font-bold mb-4">Faculty</h2>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-red-700">28</p>
              <p className="text-gray-600">Total</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">25</p>
              <p className="text-gray-600">Regular</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">3</p>
              <p className="text-gray-600">Probationary</p>
            </div>
          </div>
        </div>

        {/* Active Users Section */}
        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-center">
          <h2 className="text-lg text-black font-bold mb-4">Active Users</h2>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-red-700">25</p>
              <p className="text-gray-600">Faculty</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">1</p>
              <p className="text-gray-600">Admin</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">26</p>
              <p className="text-gray-600">Total</p>
            </div>
          </div>
        </div>

        {/* Attendance Pie Chart */}
        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-center">
          <h2 className="text-lg text-black font-bold mb-4">Attendance</h2>
          <div className="flex justify-center items-center">
            <div className="w-60 h-60">
              <Pie data={pieData} />
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-center">
          <h2 className="text-lg text-black font-bold mb-4">Recent Activity Logs</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b p-2 text-gray-600">#</th>
                <th className="border-b p-2 text-gray-600">User ID</th>
                <th className="border-b p-2 text-gray-600">Name</th>
                <th className="border-b p-2 text-gray-600">Action Performed</th>
                <th className="border-b p-2 text-gray-600">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 text-black">1</td>
                <td className="p-2 text-black">2025-0001-SJSFI</td>
                <td className="p-2 text-black">Maria Reyes</td>
                <td className="p-2 text-black">Login</td>
                <td className="p-2 text-black">3/10/25 10:00:01 AM</td>
              </tr>
              <tr>
                <td className="p-2 text-black">2</td>
                <td className="p-2 text-black">Admin1</td>
                <td className="p-2 text-black">John Dela Cruz</td>
                <td className="p-2 text-black">Add User</td>
                <td className="p-2 text-black">3/10/25 10:10:30 AM</td>
              </tr>
              <tr>
                <td className="p-2 text-black">3</td>
                <td className="p-2 text-black">2025-0003-SJSFI</td>
                <td className="p-2 text-black">Angela Santos</td>
                <td className="p-2 text-black">Logout</td>
                <td className="p-2 text-black">3/10/25 10:11:21 AM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}