import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Define leave types as string literals
type LeaveType = 'Sick' | 'Vacation' | 'Emergency';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface LeaveRequest {
    LeaveID: number;
    FacultyID: number;
    LeaveType: LeaveType;
    StartDate: Date;
    EndDate: Date;
    Reason: string;
    Status: LeaveStatus;
    DocumentUrl?: string;
    CreatedAt: Date;
    Faculty: {
        Name: string;
        Department: string;
    };
}

interface SupabaseLeave {
    LeaveID: number;
    FacultyID: number;
    LeaveType: LeaveType;
    StartDate: string;
    EndDate: string;
    Reason: string;
    Status: LeaveStatus;
    DocumentUrl?: string;
    CreatedAt: string;
    Faculty: {
        User: {
            FirstName: string;
            LastName: string;
        };
        Department: {
            DepartmentName: string;
        };
    };
}

const LeaveRequestFaculty: React.FC = () => {
    const { user } = useUser();
    const [showModal, setShowModal] = useState(false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [facultyId, setFacultyId] = useState<number | null>(null);

    useEffect(() => {
        const fetchUserAndFacultyId = async () => {
            if (!user?.emailAddresses?.[0]?.emailAddress) {
                console.log('No Clerk user email available');
                setError('Please log in to access this page');
                return;
            }

            try {
                console.log('Fetching Supabase user for email:', user.emailAddresses[0].emailAddress);
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('UserID')
                    .eq('Email', user.emailAddresses[0].emailAddress)
                    .single();

                if (userError) {
                    console.error('Error fetching Supabase user:', userError);
                    setError('Failed to fetch user data');
                    return;
                }

                if (userData) {
                    console.log('Found Supabase user:', userData);

                    // Fetch FacultyID using UserID
                    const { data: facultyData, error: facultyError } = await supabase
                        .from('Faculty')
                        .select('FacultyID')
                        .eq('UserID', userData.UserID)
                        .single();

                    if (facultyError) {
                        console.error('Error fetching Faculty data:', facultyError);
                        setError('Failed to fetch faculty data');
                        return;
                    }

                    if (facultyData) {
                        console.log('Found Faculty ID:', facultyData);
                        setFacultyId(facultyData.FacultyID);
                        fetchLeaveRequests(facultyData.FacultyID);
                    } else {
                        console.log('No Faculty found for user:', userData.UserID);
                        setError('Faculty record not found. Please contact the administrator.');
                    }
                } else {
                    console.log('No user found for email:', user.emailAddresses[0].emailAddress);
                    setError('User not found in database. Please contact the administrator.');
                }
            } catch (error) {
                console.error('Error in fetchUserAndFacultyId:', error);
                setError('An unexpected error occurred. Please try again later.');
            }
        };

        fetchUserAndFacultyId();
    }, [user]);

    const fetchLeaveRequests = async (facultyId: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // First try the API endpoint
            try {
                const response = await fetch(`/api/leaves/${facultyId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (!Array.isArray(data)) {
                        throw new Error('Invalid response format from API');
                    }

                    const formattedLeaves: LeaveRequest[] = data.map(leave => ({
                        ...leave,
                        StartDate: new Date(leave.StartDate),
                        EndDate: new Date(leave.EndDate),
                        CreatedAt: new Date(leave.CreatedAt),
                        Faculty: {
                            Name: leave.Faculty.Name,
                            Department: leave.Faculty.Department
                        }
                    }));

                    setLeaveRequests(formattedLeaves);
                    return;
                }
            } catch (apiError) {
                console.error('API error:', apiError);
                // Continue to Supabase fallback
            }

            // Fallback to Supabase query
            const { data: leaves, error: leavesError } = await supabase
                .from('Leave')
                .select(`
                    *,
                    Faculty:FacultyID (
                        User:UserID (
                            FirstName,
                            LastName
                        ),
                        Department:DepartmentID (
                            DepartmentName
                        )
                    )
                `)
                .eq('FacultyID', facultyId)
                .order('CreatedAt', { ascending: false });

            if (leavesError) {
                console.error('Supabase error:', leavesError);
                throw new Error('Failed to fetch leave requests');
            }

            if (!leaves) {
                setLeaveRequests([]);
                return;
            }

            // Transform the data
            const formattedLeaves: LeaveRequest[] = leaves.map(leave => ({
                LeaveID: leave.LeaveID,
                FacultyID: leave.FacultyID,
                LeaveType: leave.LeaveType as LeaveType,
                StartDate: new Date(leave.StartDate),
                EndDate: new Date(leave.EndDate),
                Reason: leave.Reason,
                Status: leave.Status as LeaveStatus,
                DocumentUrl: leave.DocumentUrl,
                CreatedAt: new Date(leave.CreatedAt),
                Faculty: {
                    Name: leave.Faculty?.User 
                        ? `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`
                        : 'Unknown',
                    Department: leave.Faculty?.Department?.DepartmentName || 'Unknown'
                }
            }));

            setLeaveRequests(formattedLeaves);
        } catch (err) {
            console.error('Error fetching leave requests:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leave requests');
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
        if (!facultyId) {
            setError('Faculty ID is required');
            return;
        }

        try {
            // Log all form values for debugging
            console.log('Form values:', {
                startDate: startDate?.toISOString() || null,
                endDate: endDate?.toISOString() || null,
                leaveType,
                reason,
                facultyId,
                file: file ? file.name : null
            });

            // Detailed validation with specific messages
            const validationErrors = [];
            if (!startDate) validationErrors.push('Start date is required');
            if (!endDate) validationErrors.push('End date is required');
            if (!leaveType) validationErrors.push('Leave type is required');
            if (!reason) validationErrors.push('Reason is required');

            if (validationErrors.length > 0) {
                setError(`Please fill in all required fields: ${validationErrors.join(', ')}`);
                return;
            }

            setIsLoading(true);
            let fileUrl = null;

            // Upload file if exists
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload file');
                }

                const uploadData = await uploadResponse.json();
                fileUrl = uploadData.url;
            }

            // Create leave request using the API route
            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    FacultyID: facultyId,
                    LeaveType: leaveType,
                    StartDate: startDate?.toISOString(),
                    EndDate: endDate?.toISOString(),
                    Reason: reason,
                    DocumentUrl: fileUrl
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to submit leave request';
                const responseText = await response.text();
                console.error('Raw error response:', responseText);
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorData.details || errorMessage;
                    console.error('Server error response:', errorData);
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }

            const leave = await response.json();
            console.log('Leave request successful:', leave);

            // Reset form and refresh list
            setShowModal(false);
            setLeaveType('');
            setStartDate(null);
            setEndDate(null);
            setReason('');
            setFile(null);
            await fetchLeaveRequests(facultyId);

        } catch (err) {
            console.error('Error adding leave request:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit leave request');
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
            <div className="mt-6 bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : leaveRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No leave requests found
                                    </td>
                                </tr>
                            ) : (
                                leaveRequests.map((request) => (
                                    <tr key={request.LeaveID} className="hover:bg-gray-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.LeaveType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.StartDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.EndDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {Math.ceil((new Date(request.EndDate).getTime() - new Date(request.StartDate).getTime()) / (1000 * 60 * 60 * 24))} days
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.CreatedAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                request.Status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                request.Status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {request.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for New Leave Request */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="LeaveType" className="block mb-1 font-semibold text-sm text-gray-700">Leave Type <span className="text-[#800000]">*</span></label>
                                    <select
                                        id="LeaveType"
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Leave Type</option>
                                        <option value="Sick">Sick</option>
                                        <option value="Vacation">Vacation</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">Start Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date: Date | null) => setStartDate(date)}
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        dateFormat="yyyy-MM-dd"
                                        minDate={new Date()}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">End Date <span className="text-[#800000]">*</span></label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date: Date | null) => setEndDate(date)}
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        dateFormat="yyyy-MM-dd"
                                        minDate={startDate || new Date()}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="File" className="block mb-1 font-semibold text-sm text-gray-700">Supporting Document</label>
                                <input
                                    id="File"
                                    type="file"
                                    onChange={handleFileChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="Reason" className="block mb-1 font-semibold text-sm text-gray-700">Reason <span className="text-[#800000]">*</span></label>
                                <textarea
                                    id="Reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    rows={4}
                                    disabled={isLoading}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLeaveRequest}
                                className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50"
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