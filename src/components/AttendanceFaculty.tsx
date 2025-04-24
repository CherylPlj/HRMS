import React from "react";

const AttendanceFaculty: React.FC = () => {
  return (
    <div className="min-h-screen flex font-sans text-gray-900">
      {/* Main content */}
<main className="flex-1 flex flex-col bg-white mx-auto rounded-md shadow-md">        <section className="border border-[#800000] rounded-md mx-6 my-4 p-4 flex flex-col md:flex-row md:space-x-6">
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
                <InfoRow label="Date" value="2025-03-20" />
                <InfoRow label="Time In" value="08:05 AM" />
                <InfoRow label="Time Out" value="04:00 PM" />
                <InfoRow label="Total Hours" value="7h 55m" />
                <InfoRow label="Status" value="Present" status />
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
            <img
              src=""
              alt="Attendance Summary Chart"
              className="w-[120px] h-[120px]"
            />
          </div>
        </section>

        {/* Schedule Table */}
        <section className="mx-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[#800000] font-semibold text-sm select-none">Schedule</h2>
            <button className="bg-[#800000] text-white text-xs font-semibold rounded-md px-3 py-1 flex items-center space-x-1 select-none">
              <i className="fas fa-download text-xs" />
              <span>Download</span>
            </button>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold">
                {['ID', 'Name', 'Subject', 'Class & Section', 'Day', 'Time'].map(header => (
                  <th key={header} className="border border-gray-300 px-2 py-1 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sample rows */}
              {[1, 2, 3].map((_, i) => (
                <tr key={i} className="even:bg-white odd:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1">123-4567-FA</td>
                  <td className="border border-gray-300 px-2 py-1">Maria Reyes</td>
                  <td className="border border-gray-300 px-2 py-1">Math {i % 2 === 0 ? '1' : '2'}</td>
                  <td className="border border-gray-300 px-2 py-1">{i === 2 ? '10 - C' : i === 1 ? '9 - B' : '10 - A'}</td>
                  <td className="border border-gray-300 px-2 py-1">{i === 2 ? 'Friday Saturday' : i === 1 ? 'Monday' : 'Monday Wednesday'}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {i === 2 ? (
                      <>
                        2:00 AM - 5:00 PM<br />9:00 AM - 11:00 AM
                      </>
                    ) : i === 1 ? (
                      '1:00 AM - 3:00 PM'
                    ) : (
                      <>
                        8:00 AM - 12:00 PM<br />1:00 PM - 3:00 PM
                      </>
                    )}
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

const SidebarButton: React.FC<{ icon: string; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <button
    aria-label={label}
    className={`flex flex-col items-center space-y-1 hover:text-[#800000] focus:outline-none ${
      active ? 'text-[#800000] font-bold' : ''
    }`}
  >
    <i className={`${icon} text-lg`} />
    <span className="text-[10px]">{label}</span>
  </button>
);

const HeaderIcon: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <button aria-label={label} className="text-gray-700 hover:text-gray-900">
    <i className={`${icon} text-lg`} />
  </button>
);

const InfoRow: React.FC<{ label: string; value: string; status?: boolean }> = ({ label, value, status }) => (
  <tr>
    <td className="pr-4 font-semibold text-gray-700">{label}</td>
    <td className={status ? 'text-green-600 font-semibold' : ''}>{value}</td>
  </tr>
);

export default AttendanceFaculty;