import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient"; // Ensure this path is correct!

export default function DashboardContent() {
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date("2025-02-01"),
    new Date("2025-03-20"),
  ]);
  const [facultyStats, setFacultyStats] = useState({
    total: 0,
    regular: 0,
    probationary: 0,
  });
  const [activeUsers, setActiveUsers] = useState({
    faculty: 0,
    admin: 0,
    total: 0,
  });
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
    late: 0,
  });

  interface Log {
    user_id: string;
    name: string;
    action: string;
    timestamp: string;
  }

  const [logs, setLogs] = useState<Log[]>([]);

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
        const regularCount =
          faculty?.filter((f) => f.status === "regular").length || 0;
        const probationaryCount =
          faculty?.filter((f) => f.status === "probationary").length || 0;

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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

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
        <DatePicker
          selected={dateRange[0]}
          onChange={handleDateChange}
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          selectsRange
          dateFormat="yyyy-MM-dd"
          customInput={
            <button className="flex items-center bg-[#800000] text-white px-4 py-2 rounded">
              <FaCalendarAlt className="mr-2" />
              {dateRange[0]
                ? `${dateRange[0].toLocaleDateString()} - ${
                    dateRange[1]?.toLocaleDateString() || ""
                  }`
                : "Select Date Range"}
            </button>
          }
          className="bg-[#800000] text-white outline-none cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Faculty Section */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-lg font-bold">Faculty</h2>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl text-[#800000]">{facultyStats.total}</p>
              <p>Total</p>
            </div>
            <div>
              <p className="text-3xl text-[#800000]">{facultyStats.regular}</p>
              <p>Regular</p>
            </div>
            <div>
              <p className="text-3xl text-[#800000]">{facultyStats.probationary}</p>
              <p>Probationary</p>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-lg font-bold">Attendance</h2>
          <div className="flex justify-center">
            {attendanceData.present || attendanceData.absent || attendanceData.late ? (
              <Pie data={pieData} />
            ) : (
              <p>Loading...</p>
            )}
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-lg font-bold">Activity Logs</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{log.user_id}</td>
                  <td>{log.name}</td>
                  <td>{log.action}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}