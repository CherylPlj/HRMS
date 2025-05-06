import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AttendanceHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logs = location.state?.logs || [];

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900">
      <header className="bg-[#800000] text-white py-4 px-6">
        <h1 className="text-lg font-semibold">Attendance History</h1>
        <button
          className="mt-2 text-sm underline"
          onClick={() => navigate("/")}
        >
          Back to Attendance
        </button>
      </header>
      <main className="flex-1 p-6">
        {logs.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Date</th>
                <th className="border border-gray-300 px-4 py-2">Time In</th>
                <th className="border border-gray-300 px-4 py-2">Time Out</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{log.date}</td>
                  <td className="border border-gray-300 px-4 py-2">{log.timeIn || "Not Checked In"}</td>
                  <td className="border border-gray-300 px-4 py-2">{log.timeOut || "Not Checked Out"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-700">No attendance logs available.</p>
        )}
      </main>
    </div>
  );
};

export default AttendanceHistory;