import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LeaveRequestFaculty: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [leaveType, setLeaveType] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');

    const leaveRequests = [
        { leaveType: 'Sick', startDate: '2025-02-01', endDate: '2025-02-03', duration: '3 days', appliedDate: '2025-01-25', status: 'Pending' },
    ];

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        setDateRange(dates);
        setStartDate(dates[0]);
        setEndDate(dates[1]);
    };

    const handleAddLeaveRequest = () => {
        // UI only — doesn't save or update state
        setShowModal(false); // Close modal if desired
    };

    return (
        <div className="text-black p-4">
           <div className="flex items-center justify-end mb-6 space-x-4">
            {/* Date Range Picker */}
            <div className="flex items-center">
                <DatePicker
                selected={dateRange[0]}
                onChange={handleDateChange}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                selectsRange
                dateFormat="yyyy-MM-dd"
                customInput={
                    <button className="flex items-center bg-[#800000] text-white px-4 py-2 rounded border-5 w-[250px] justify-center">
                    {dateRange[0]
                        ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1]?.toLocaleDateString() || ''}`
                        : "Select Date Range"}
                    </button>
                }
                />
            </div>

            {/* New Leave Request Button */}
            <button
                onClick={() => setShowModal(true)}
                className="bg-[#800000] text-white py-2 px-4 rounded-md"
            >
                + New Leave Request
            </button>
            </div>

            {/* Leave Request Table */}
            <div className="mt-6 bg-white shadow-lg p-4 rounded-lg">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-2 border-b">Leave Type</th>
                            <th className="px-4 py-2 border-b">Start Date</th>
                            <th className="px-4 py-2 border-b">End Date</th>
                            <th className="px-4 py-2 border-b">Duration</th>
                            <th className="px-4 py-2 border-b">Applied Date</th>
                            <th className="px-4 py-2 border-b">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaveRequests.map((request, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 border-b">{request.leaveType}</td>
                                <td className="px-4 py-2 border-b">{request.startDate}</td>
                                <td className="px-4 py-2 border-b">{request.endDate}</td>
                                <td className="px-4 py-2 border-b">{request.duration}</td>
                                <td className="px-4 py-2 border-b">{request.appliedDate}</td>
                                <td className="px-4 py-2 border-b">{request.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal for New Leave Request */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[#800000]">New Leave Request</h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex space-x-4">
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold">Leave Type <span className="text-[#800000]">*</span></label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2"
                                    >
                                        <option value="">Select Leave Type</option>
                                        <option value="Sick">Sick</option>
                                        <option value="Vacation">Vacation</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold ">Start Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date: Date | null) => setStartDate(date)}
                                        className="border p-2 rounded w-full"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold ">End Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date: Date | null) => setEndDate(date)}
                                        className="border p-2 rounded w-full"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold ">Upload File</label>
                                    <input type="file" className="border p-2 rounded w-full" />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block mb-1 font-semibold ">Reason <span className="text-[#800000]">*</span></label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="border p-2 rounded w-full"
                                    rows={4}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button
                                onClick={handleAddLeaveRequest}
                                className="bg-[#800000] hover:bg-red-800 text-white px-6 py-2 rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveRequestFaculty;