import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  FaCalendarAlt, 
  FaFile,
  FaClock,
  FaUserCheck,
  FaTimes,
  FaBed,
  FaUmbrellaBeach,
  FaExclamationTriangle,
  FaBaby,
  FaMale,
  FaUser
} from "react-icons/fa";
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';

interface FacultyLeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  daysRequested: number;
  status: string;
  submittedDate: string;
}

export default function LeaveDashFac() {
  const { user } = useUser();
  const [dateRange, setDateRange] = useState<[Date, Date]>([new Date(), new Date()]);

  // Mock data for faculty leave statistics
  const [leaveStats] = useState({
    totalRequests: 12,
    pendingRequests: 3,
    approvedRequests: 7,
    rejectedRequests: 2,
    availableLeaves: 15,
    usedLeaves: 8
  });

  // Mock data for leave status distribution
  const leaveStatusData = {
    labels: ["Approved", "Rejected", "Pending"],
    datasets: [
      {
        data: [leaveStats.approvedRequests, leaveStats.rejectedRequests, leaveStats.pendingRequests],
        backgroundColor: ["#43a047", "#e53935", "#ffb300"],
        hoverOffset: 4,
        borderWidth: 0,
      },
    ],
  };

  // Mock data for faculty's own pending leave requests
  const [pendingRequests] = useState<FacultyLeaveRequest[]>([
    {
      id: "1",
      leaveType: "Sick Leave",
      startDate: "2024-01-15",
      endDate: "2024-01-17",
      reason: "Medical appointment and recovery",
      daysRequested: 3,
      status: "Pending",
      submittedDate: "2024-01-10"
    },
    {
      id: "2", 
      leaveType: "Vacation",
      startDate: "2024-02-01",
      endDate: "2024-02-05",
      reason: "Family vacation",
      daysRequested: 5,
      status: "Pending",
      submittedDate: "2024-01-15"
    },
    {
      id: "3",
      leaveType: "Emergency",
      startDate: "2024-01-20",
      endDate: "2024-01-20",
      reason: "Family emergency",
      daysRequested: 1,
      status: "Pending",
      submittedDate: "2024-01-18"
    }
  ]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange([start, end]);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get leave type icon
  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType) {
      case "Sick Leave":
        return <FaBed className="text-red-500" />;
      case "Vacation":
        return <FaUmbrellaBeach className="text-blue-500" />;
      case "Emergency":
        return <FaExclamationTriangle className="text-orange-500" />;
      case "Maternity":
        return <FaBaby className="text-pink-500" />;
      case "Paternity":
        return <FaMale className="text-blue-600" />;
      default:
        return <FaCalendarAlt className="text-gray-500" />;
    }
  };

  // Helper function to get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

    return (
    <div className="p-8 w-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Filter by Date Range</label>
            <DatePicker
              selected={dateRange[0]}
              onChange={handleDateChange}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              selectsRange
              dateFormat="yyyy-MM-dd"
              customInput={
                <button className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-300">
                  <FaCalendarAlt className="mr-2 text-[#800000]" />
                  {dateRange[0]
                    ? `${dateRange[0].toLocaleDateString()} - ${
                        dateRange[1]?.toLocaleDateString() || ""
                      }`
                    : "Select Date Range"}
                </button>
              }
              className="w-full"
              maxDate={new Date()}
              placeholderText="Select date range"
            />
          </div>
          <div className="flex space-x-2">
          <button
              onClick={() => {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange([firstDayOfMonth, today]);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-[#800000] transition-colors duration-300"
            >
              This Month
          </button>
          <button
              onClick={() => {
                const today = new Date();
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                setDateRange([firstDayOfYear, today]);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-[#800000] transition-colors duration-300"
            >
              This Year
          </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Faculty Leave Dashboard
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Requests</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveStats.totalRequests}</h3>
        </div>
            <FaFile className="text-4xl text-[#800000] opacity-50" />
      </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Requests</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveStats.pendingRequests}</h3>
            </div>
            <FaClock className="text-4xl text-[#800000] opacity-50" />
              </div>
              </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Available Leaves</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveStats.availableLeaves}</h3>
            </div>
            <FaUser className="text-4xl text-[#800000] opacity-50" />
          </div>
              </div>

        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Used Leaves</p>
              <h3 className="text-3xl font-bold text-[#800000] mt-2">{leaveStats.usedLeaves}</h3>
            </div>
            <FaUserCheck className="text-4xl text-[#800000] opacity-50" />
          </div>
        </div>
              </div>

      {/* Charts and Table Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Leave Status Distribution */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaFile className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">My Leave Status Distribution</h2>
                </div>
          <div className="h-[300px] flex items-center justify-center">
            <Pie 
              data={leaveStatusData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                }
              }} 
            />
                </div>
                </div>

        {/* Leave Balance Overview */}
        <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <FaUser className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Leave Balance Overview</h2>
                </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Available Leaves</span>
                <span className="text-sm font-medium text-gray-700">{leaveStats.availableLeaves} days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(leaveStats.availableLeaves / (leaveStats.availableLeaves + leaveStats.usedLeaves)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Used Leaves</span>
                <span className="text-sm font-medium text-gray-700">{leaveStats.usedLeaves} days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(leaveStats.usedLeaves / (leaveStats.availableLeaves + leaveStats.usedLeaves)) * 100}%` }}
                ></div>
            </div>
          </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{leaveStats.approvedRequests}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{leaveStats.pendingRequests}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{leaveStats.rejectedRequests}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
              </div>
            </div>
          </div>

      {/* My Pending Leave Requests Table */}
      <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-8 rounded-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FaClock className="text-[#800000] text-2xl mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">My Pending Leave Requests</h2>
          </div>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingRequests.length} Pending
          </span>
            </div>

        {pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Leave Type
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Date Range
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Days
                    </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Status
                    </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Submitted Date
                    </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">
                    Reason
                    </th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="py-4">
                      <div className="flex items-center">
                        {getLeaveTypeIcon(request.leaveType)}
                        <span className="ml-2 text-sm text-gray-900">{request.leaveType}</span>
                      </div>
                      </td>
                    <td className="py-4 text-sm text-gray-900">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </td>
                    <td className="py-4 text-sm text-gray-900">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {request.daysRequested} days
                      </span>
                      </td>
                    <td className="py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status}
                        </span>
                      </td>
                    <td className="py-4 text-sm text-gray-900">
                      {formatDate(request.submittedDate)}
                    </td>
                    <td className="py-4 text-sm text-gray-600 max-w-xs truncate">
                      {request.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FaClock className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-lg">No pending leave requests</p>
            <p className="text-sm">All your leave requests have been processed</p>
          </div>
        )}
      </div>
    </div>
  );
}
