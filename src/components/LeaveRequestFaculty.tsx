import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../lib/supabaseClient";

interface LeaveRequest {
    id: string;
    faculty_id: string;
    leave_type: string;
    start_date: Date;
    end_date: Date;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    document_url?: string;
    created_at: Date;
}

const LeaveRequestFaculty: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [leaveType, setLeaveType] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setLeaveRequests(data || []);
        } catch (err) {
            console.error('Error fetching leave requests:', err);
            setError('Failed to fetch leave requests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        setDateRange(dates);
        setStartDate(dates[0]);
        setEndDate(dates[1]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAddLeaveRequest = async () => {
        try {
            if (!startDate || !endDate || !leaveType || !reason) {
                setError('Please fill in all required fields');
                return;
            }

            setIsLoading(true);
            let fileUrl = null;

            // Upload file if exists
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('leave-documents')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                if (uploadData) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('leave-documents')
                        .getPublicUrl(fileName);
                    fileUrl = publicUrl;
                }
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Create leave request
            const { data, error } = await supabase
                .from('leave_requests')
                .insert([
                    {
                        faculty_id: user.id,
                        leave_type: leaveType,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        reason,
                        status: 'Pending',
                        document_url: fileUrl,
                    }
                ])
                .select();

            if (error) throw error;

            // Reset form and refresh list
            setShowModal(false);
            setLeaveType('');
            setStartDate(null);
            setEndDate(null);
            setReason('');
            setFile(null);
            await fetchLeaveRequests();

        } catch (err) {
            console.error('Error adding leave request:', err);
            setError('Failed to submit leave request');
        } finally {
            setIsLoading(false);
        }
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
                    disabled={isLoading}
                >
                    + New Leave Request
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

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
                        {leaveRequests.map((request) => (
                            <tr key={request.id}>
                                <td className="px-4 py-2 border-b">{request.leave_type}</td>
                                <td className="px-4 py-2 border-b">{new Date(request.start_date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 border-b">{new Date(request.end_date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 border-b">
                                    {Math.ceil((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                </td>
                                <td className="px-4 py-2 border-b">{new Date(request.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-2 border-b">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                        request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {request.status}
                                    </span>
                                </td>
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
                                    <label htmlFor="LeaveType" className="block mb-1 font-semibold">Leave Type <span className="text-[#800000]">*</span></label>
                                    <select
                                        id="LeaveType"
                                        title="LeaveType"
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2"
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Leave Type</option>
                                        <option value="Sick">Sick</option>
                                        <option value="Vacation">Vacation</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold">Start Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date: Date | null) => setStartDate(date)}
                                        className="border p-2 rounded w-full"
                                        dateFormat="yyyy-MM-dd"
                                        minDate={new Date()}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="flex-1 pb-6">
                                    <label className="block mb-1 font-semibold">End Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date: Date | null) => setEndDate(date)}
                                        className="border p-2 rounded w-full"
                                        dateFormat="yyyy-MM-dd"
                                        minDate={startDate || new Date()}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="File" className="block mb-1 font-semibold">Supporting Document</label>
                                <input
                                    id="File"
                                    title="File"
                                    type="file"
                                    onChange={handleFileChange}
                                    className="border p-2 rounded w-full"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="Reason" className="block mb-1 font-semibold">Reason <span className="text-[#800000]">*</span></label>
                                <textarea
                                    id="Reason"
                                    title="Reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="border p-2 rounded w-full"
                                    rows={4}
                                    disabled={isLoading}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button
                                title="Cancel"
                                onClick={handleAddLeaveRequest}
                                className="bg-[#800000] hover:bg-red-800 text-white px-6 py-2 rounded"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveRequestFaculty;