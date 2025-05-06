import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Initialize Supabase client
const supabase = createClient(
  "https://vuhouoajmawlcgxkrnid.supabase.co", // Replace with your Supabase URL
  "happythumbs02" // Replace with your Supabase anon key
);

const AttendanceFaculty: React.FC = () => {
  const [attendance, setAttendance] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Example attendance summary data
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch attendance data (latest record for a specific faculty)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("Attendance") // Replace with your attendance table name
          .select("*")
          .eq("faculty_id", "123-4567-FA") // Replace with dynamic faculty ID
          .order("date", { ascending: false })
          .limit(1);

        if (attendanceError) {
          console.error("Error fetching attendance:", attendanceError);
        } else {
          setAttendance(attendanceData?.[0]);
        }

        // Fetch attendance summary (e.g., present, absent, late counts)
        const { data: summaryData, error: summaryError } = await supabase
          .from("AttendanceSummary") // Replace with your summary table name
          .select("present, absent, late")
          .eq("faculty_id", "123-4567-FA"); // Replace with dynamic faculty ID

        if (summaryError) {
          console.error("Error fetching attendance summary:", summaryError);
        } else if (summaryData?.[0]) {
          setAttendanceSummary(summaryData[0]);
        }

        // Fetch schedule data
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("Schedule") // Replace with your schedule table name
          .select("*");

        if (scheduleError) {
          console.error("Error fetching schedule:", scheduleError);
        } else {
          setSchedule(scheduleData || []);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Pie chart data
  const pieData = {
    labels: ["Present", "Absent", "Late"],
    datasets: [
      {
        data: [
          attendanceSummary.present,
          attendanceSummary.absent,
          attendanceSummary.late,
        ],
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"],
        hoverBackgroundColor: ["#45A049", "#E53935", "#FFB300"],
      },
    ],
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-900">
      <main className="flex-1 flex flex-col bg-white mx-auto rounded-md shadow-md">
        <section className="border border-[#800000] rounded-md mx-6 my-4 p-4 flex flex-col md:flex-row md:space-x-6">
          {/* Time In/Out and details */}
          <div className="flex flex-col space-y-4 md:w-1/2">
            <div className="flex space-x-4">
              <button className="bg-[#800000] text-white rounded-md px-6 py-2 text-xs font-semibold select-none">
                Time In
              </button>
              <button className="border border-gray-300 rounded-md px-6 py-2 text-xs font-semibold select-none">
                Time Out
              </button>
            </div>
            <table className="text-xs w-full border-collapse">
              <tbody>
                <InfoRow label="Date" value={attendance?.date || "N/A"} />
                <InfoRow label="Time In" value={attendance?.time_in || "N/A"} />
                <InfoRow label="Time Out" value={attendance?.time_out || "N/A"} />
                <InfoRow
                  label="Total Hours"
                  value={attendance?.total_hours || "N/A"}
                />
                <InfoRow
                  label="Status"
                  value={attendance?.status || "N/A"}
                  status={attendance?.status === "Present"}
                />
              </tbody>
            </table>
            <div className="text-xs text-[#800000] font-semibold cursor-pointer select-none">
              View Attendance History
            </div>
          </div>

          {/* Pie chart */}
          <div className="md:w-1/2 flex flex-col items-center justify-center mt-6 md:mt-0">
            <div className="text-[8px] font-semibold text-[#800000] mb-1 select-none">
              Attendance Summary
            </div>
            <Pie data={pieData} />
          </div>
        </section>

        {/* Schedule Table */}
        <section className="mx-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[#800000] font-semibold text-sm select-none">
              Schedule
            </h2>
            <button className="bg-[#800000] text-white text-xs font-semibold rounded-md px-3 py-1 flex items-center space-x-1 select-none">
              <i className="fas fa-download text-xs" />
              <span>Download</span>
            </button>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold">
                {[
                  "ID",
                  "Name",
                  "Subject",
                  "Class & Section",
                  "Day",
                  "Time",
                ].map((header) => (
                  <th
                    key={header}
                    className="border border-gray-300 px-2 py-1 text-left"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr
                  key={i}
                  className="even:bg-white odd:bg-gray-50"
                >
                  <td className="border border-gray-300 px-2 py-1">
                    {row.id || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {row.name || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {row.subject || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {row.class_section || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {row.day || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {row.time || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; status?: boolean }> = ({
  label,
  value,
  status,
}) => (
  <tr>
    <td className="pr-4 font-semibold text-gray-700">{label}</td>
    <td className={status ? "text-green-600 font-semibold" : ""}>{value}</td>
  </tr>
);

export default AttendanceFaculty;