import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient"; // Make sure this path is correct!

export default function DashboardContent() {
  const [dateRange, setDateRange] = useState([new Date("2025-02-01"), new Date("2025-03-20")]);
  const [facultyStats, setFacultyStats] = useState({ total: 0, regular: 0, probationary: 0 });
  const [activeUsers, setActiveUsers] = useState({ faculty: 0, admin: 0, total: 0 });
  const [attendanceData, setAttendanceData] = useState({ present: 0, absent: 0, late: 0 });
  const [logs, setLogs] = useState([]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange([start, end]);
    }
  };
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Faculty Stats
        const { data: faculty } = await supabase.from("faculty").select("*");
        const regularCount = faculty?.filter((f) => f.status === "regular").length || 0;
        const probationaryCount = faculty?.filter((f) => f.status === "probationary").length || 0;

        setFacultyStats({
          total: faculty?.length || 0,
          regular: regularCount,
          probationary: probationaryCount,
        });

        // Fetch Active Users
        const { data: users } = await supabase.from("users").select("*");
        const facultyUsers = users?.filter((u) => u.role === "faculty").length || 0;
        const adminUsers = users?.filter((u) => u.role === "admin").length || 0;

        setActiveUsers({
          faculty: facultyUsers,
          admin: adminUsers,
          total: facultyUsers + adminUsers,
        });

        // Fetch Attendance Data
        const { data: attendance } = await supabase
          .from("attendance")
          .select("*")
          .gte("date", dateRange[0].toISOString())
          .lte("date", dateRange[1].toISOString());

        setAttendanceData({
          present: attendance?.filter((a) => a.status === "Present").length || 0,
          absent: attendance?.filter((a) => a.status === "Absent").length || 0,
          late: attendance?.filter((a) => a.status === "Late").length || 0,
        });

        // Fetch Activity Logs
        interface Log {
          user_id: string;
          name: string;
          action: string;
          timestamp: string;
        }
        
        const [logs, setLogs] = useState<Log[]>([]);
        
        useEffect(() => {
          const fetchLogs = async () => {
            try {
              const { data: activityLogs } = await supabase
                .from("activity_logs")
                .select("*")
                .order("timestamp", { ascending: false })
                .limit(5);
        
              setLogs(activityLogs || []);
            } catch (error) {
              console.error("Error fetching logs:", error);
            }
          };
        
          fetchLogs();
        }, []);
        
  const pieData = {
    labels: ["Present", "Absent", "Late"],
    datasets: [
      {
        data: [attendanceData.present, attendanceData.absent, attendanceData.late],
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"],
      },
    ],
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen w-full flex flex-col">
      <div className="flex justify-end mb-6">
        <div className="flex items-center bg-[#800000] text-white px-4 py-2 rounded cursor-pointer">
          <FaCalendarAlt className="mr-2" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white shadow-md p-6 rounded-lg w-full h-38 flex flex-col justify-start">
          <h2 className="text-lg text-black font-bold mb-4">Faculty</h2>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-[#800000]">{facultyStats.total}</p>
              <p className="text-gray-600">Total</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#800000]">{facultyStats.regular}</p>
              <p className="text-gray-600">Regular</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#800000]">{facultyStats.probationary}</p>
              <p className="text-gray-600">Probationary</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md p-6 rounded-lg w-full h-40 flex flex-col justify-start">
          <h2 className="text-lg text-black font-bold mb-4">Active Users</h2>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-[#800000]">{activeUsers.faculty}</p>
              <p className="text-gray-600">Faculty</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#800000]">{activeUsers.admin}</p>
              <p className="text-gray-600">Admin</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#800000]">{activeUsers.total}</p>
              <p className="text-gray-600">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-start">
          <h2 className="text-lg text-black font-bold mb-4">Attendance</h2>
          <div className="flex justify-center items-center">
            <div className="w-60 h-60">
              {attendanceData.present || attendanceData.absent || attendanceData.late ? (
                <Pie data={pieData} />
              ) : (
                <p>Loading...</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md p-6 rounded-lg w-full h-90 flex flex-col justify-start">
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
              {logs.map((log, index) => (
                <tr key={index}>
                  <td className="p-2 text-black">{index + 1}</td>
                  <td className="p-2 text-black">{log.user_id}</td>
                  <td className="p-2 text-black">{log.name}</td>
                  <td className="p-2 text-black">{log.action}</td>
                  <td className="p-2 text-black">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
