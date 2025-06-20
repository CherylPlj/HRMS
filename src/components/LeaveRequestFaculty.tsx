import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faClock, faTimes } from '@fortawesome/free-solid-svg-icons';

// Define leave types as string literals
type LeaveType = 'Sick' | 'Vacation' | 'Emergency' | 'Undertime';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
type EmploymentType = 'Regular' | 'Under Probation';
type RequestType = 'Leave' | 'Undertime';

interface LeaveRequest {
    LeaveID: number;
    FacultyID: number;
    LeaveType: LeaveType | null;
    StartDate: Date;
    EndDate: Date;
    TimeIn?: string;
    TimeOut?: string;
    Reason: string;
    Status: LeaveStatus;
    EmploymentType: EmploymentType;
    CreatedAt: Date;
    requestType: RequestType;
    Faculty: {
        Name: string;
        Department: string;
    };
}

interface SupabaseLeave {
    LeaveID: number;
    FacultyID: number;
    LeaveType: string;
    StartDate: string;
    EndDate: string;
    Reason: string;
    Status: LeaveStatus;
    TimeIn?: string;
    TimeOut?: string;
    EmploymentType: string;
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

// Define icons outside the component to prevent re-rendering
const CalendarIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#800000" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

const ClockIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#800000" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

// Error Modal Component
const ErrorModal: React.FC<{ error: string | null; onClose: () => void }> = ({ error, onClose }) => {
    if (!error) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 relative transition-all duration-200 hover:border hover:border-red-200">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
                <div className="mt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600">{error}</p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-red-500 border border-red-200 rounded hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const LeaveRequestFaculty: React.FC = () => {
    const { user } = useUser();
    const [showModal, setShowModal] = useState(false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [leaveType, setLeaveType] = useState<LeaveType>('Sick');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [facultyId, setFacultyId] = useState<number | null>(null);
    const [employmentType, setEmploymentType] = useState<EmploymentType>('Regular');
    const [facultyData, setFacultyData] = useState<{
        name: string;
        department: string;
        employmentType: EmploymentType;
    } | null>(null);
    const startDateRef = useRef<any>(null);
    const startTimeRef = useRef<any>(null);
    const endDateRef = useRef<any>(null);
    const endTimeRef = useRef<any>(null);
    const [employeeSignature, setEmployeeSignature] = useState<File | null>(null);
    const [deptHeadSignature, setDeptHeadSignature] = useState<File | null>(null);
    const [requestType, setRequestType] = useState<RequestType>('Leave');
    const [undertimeIn, setUndertimeIn] = useState<Date | null>(null);
    const [undertimeOut, setUndertimeOut] = useState<Date | null>(null);
    const undertimeInRef = useRef<any>(null);
    const undertimeOutRef = useRef<any>(null);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png'];
    const [employeeSignaturePreview, setEmployeeSignaturePreview] = useState<string | null>(null);
    const [deptHeadSignaturePreview, setDeptHeadSignaturePreview] = useState<string | null>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Cache user data
    const userDataRef = useRef<{
        facultyId: number | null;
        name: string;
        department: string;
    } | null>(null);

    // Update error handling to show modal
    const handleError = (errorMessage: string) => {
        setError(errorMessage);
        setShowErrorModal(true);
    };

    // Clear error and close modal
    const handleCloseError = () => {
        setError(null);
        setShowErrorModal(false);
    };

    // Fetch user data only once on mount or when user changes
    useEffect(() => {
        let isMounted = true;

        const fetchUserAndFacultyId = async () => {
            if (!user?.emailAddresses?.[0]?.emailAddress) {
                handleError('Please log in to access this page');
                return;
            }

            // If we already have the data cached, use it
            if (userDataRef.current && isMounted) {
                setFacultyId(userDataRef.current.facultyId);
                setFacultyData({
                    name: userDataRef.current.name,
                    department: userDataRef.current.department,
                    employmentType
                });
                return;
            }

            try {
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('UserID, FirstName, LastName')
                    .eq('Email', user.emailAddresses[0].emailAddress)
                    .single();

                if (userError || !userData) throw userError || new Error('No user data found');

                    const { data: facultyData, error: facultyError } = await supabase
                        .from('Faculty')
                        .select(`
                            FacultyID,
                            EmploymentStatus,
                            Department (
                                DepartmentName
                            )
                        `)
                        .eq('UserID', userData.UserID)
                        .single();

                if (facultyError || !facultyData) throw facultyError || new Error('No faculty data found');

                if (isMounted) {
                    const newFacultyId = facultyData.FacultyID;
                    const newName = `${userData.FirstName} ${userData.LastName}`;
                    const newDepartment = facultyData.Department.DepartmentName;

                    // Cache the data
                    userDataRef.current = {
                        facultyId: newFacultyId,
                        name: newName,
                        department: newDepartment
                    };

                    setFacultyId(newFacultyId);
                        setFacultyData({
                        name: newName,
                        department: newDepartment,
                        employmentType
                    });

                    // Initial fetch of leave requests
                    await fetchLeaveRequests(newFacultyId);
                }
            } catch (error) {
                console.error('Error in fetchUserAndFacultyId:', error);
                handleError('An unexpected error occurred. Please try again later.');
            }
        };

        if (user) {
            fetchUserAndFacultyId();
        }

        return () => {
            isMounted = false;
        };
    }, [user]);

    // Separate effect for employment type changes
    useEffect(() => {
        if (facultyData) {
            setFacultyData(prevData => ({
                ...prevData!,
                employmentType
            }));
        }
    }, [employmentType]);

    // Memoize the fetchLeaveRequests function
    const fetchLeaveRequests = React.useCallback(async (fId: number) => {
        if (!fId) return;
        
        try {
            setIsLoading(true);
            setError(null);

            const { data: leaves, error: leavesError } = await supabase
                .from('Leave')
                .select(`
                    *,
                    Faculty (
                        User (
                            FirstName,
                            LastName
                        ),
                        Department (
                            DepartmentName
                        )
                    )
                `)
                .eq('FacultyID', fId)
                .order('CreatedAt', { ascending: false });

            if (leavesError) {
                handleError('Failed to fetch leave requests');
                return;
            }

            const transformedLeaves = leaves ? leaves.map((leave) => ({
                ...leave,
                Faculty: {
                    Name: leave.Faculty.User.FirstName + ' ' + leave.Faculty.User.LastName,
                    Department: leave.Faculty.Department.DepartmentName,
                    EmploymentType: leave.EmploymentType as EmploymentType
                },
                StartDate: new Date(leave.StartDate),
                EndDate: new Date(leave.EndDate),
                TimeIn: leave.TimeIn ? new Date(leave.TimeIn) : undefined,
                TimeOut: leave.TimeOut ? new Date(leave.TimeOut) : undefined,
                requestType: leave.TimeIn ? 'Undertime' : 'Leave'
            })) : [];

            setLeaveRequests(transformedLeaves);
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            handleError('Failed to fetch leave requests');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Memoize the leave requests table data
    const memoizedLeaveRequests = React.useMemo(() => leaveRequests, [leaveRequests]);

    // Memoize the table render function
    const renderLeaveRequestsTable = React.useCallback(() => {
        if (isLoading) {
            return <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>;
        }

        // Filter leave requests based on date range
        const filteredRequests = memoizedLeaveRequests.filter(request => {
            if (!dateRange[0]) return true;
            
            const createdAt = new Date(request.CreatedAt);
            const startDate = new Date(dateRange[0]);
            startDate.setHours(0, 0, 0, 0);
            
            // If no end date selected, use end of the start date
            const endDate = dateRange[1] ? new Date(dateRange[1]) : new Date(dateRange[0]);
            endDate.setHours(23, 59, 59, 999);
            
            return createdAt >= startDate && createdAt <= endDate;
        });

        if (filteredRequests.length === 0) {
            return <tr><td colSpan={7} className="text-center py-4">No leave requests found</td></tr>;
        }

        return filteredRequests.map((request) => (
            <tr key={request.LeaveID} className="border-b border-gray-300">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.requestType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.LeaveType || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.StartDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.EndDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.requestType === 'Leave' ? 
                        (() => {
                            const diffTime = new Date(request.EndDate).getTime() - new Date(request.StartDate).getTime();
                            const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                            return `${days} days, ${hours} hrs, ${minutes} mins`;
                        })() :
                        (() => {
                            const startTime = new Date(request.TimeIn);
                            const endTime = new Date(request.TimeOut);
                            const diffTime = endTime.getTime() - startTime.getTime();
                            const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                            return `${days} days, ${hours} hrs, ${minutes} mins`;
                        })()
                    }
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
        ));
    }, [memoizedLeaveRequests, isLoading, dateRange]);

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        setDateRange(dates);
    };

    const handleClearDateRange = () => {
        setDateRange([null, null]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const validateFile = (file: File) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Please upload only JPG or PNG files.');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size too large. Maximum size is 5MB.');
        }
        return true;
    };

    const handleEmployeeSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (validateFile(file)) {
                setEmployeeSignature(file);
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onloadend = () => {
                    setEmployeeSignaturePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleDeptHeadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (validateFile(file)) {
                setDeptHeadSignature(file);
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onloadend = () => {
                    setDeptHeadSignaturePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleAddLeaveRequest = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Validate based on request type
            if (requestType === 'Leave') {
                if (!startDate || !endDate || !startTime || !endTime || !reason || !leaveType || !employmentType || !employeeSignature || !deptHeadSignature) {
                    setError('Please fill in all required fields including both signatures');
                    return;
                }
            } else if (requestType === 'Undertime') {
                if (!startDate || !endDate || !undertimeIn || !undertimeOut || !reason || !employeeSignature || !deptHeadSignature) {
                    setError('Please fill in all required fields including both signatures');
                    return;
                }
            }

            // Validate dates
            if (startDate > endDate) {
                setError('Start date cannot be after end date');
                return;
            }

            // Convert signatures to base64
            let employeeSignatureBase64 = '';
            let deptHeadSignatureBase64 = '';

            try {
                // Convert employee signature to base64
                const employeeReader = new FileReader();
                employeeSignatureBase64 = await new Promise((resolve, reject) => {
                    employeeReader.onloadend = () => resolve(employeeReader.result as string);
                    employeeReader.onerror = reject;
                    employeeReader.readAsDataURL(employeeSignature);
                });

                // Convert department head signature to base64
                const deptHeadReader = new FileReader();
                deptHeadSignatureBase64 = await new Promise((resolve, reject) => {
                    deptHeadReader.onloadend = () => resolve(deptHeadReader.result as string);
                    deptHeadReader.onerror = reject;
                    deptHeadReader.readAsDataURL(deptHeadSignature);
                });
            } catch (error) {
                console.error('Error converting signatures to base64:', error);
                throw new Error('Failed to process signature files. Please try again.');
            }

            let requestData;
            if (requestType === 'Leave') {
                // Create start and end dates with time for leave request
                const fullStartDate = new Date(
                    startDate.getFullYear(),
                    startDate.getMonth(),
                    startDate.getDate(),
                    startTime.getHours(),
                    startTime.getMinutes()
                );

                const fullEndDate = new Date(
                    endDate.getFullYear(),
                    endDate.getMonth(),
                    endDate.getDate(),
                    endTime.getHours(),
                    endTime.getMinutes()
                );

                requestData = {
                    FacultyID: facultyId,
                    requestType: requestType,
                    LeaveType: leaveType,
                    StartDate: fullStartDate.toISOString(),
                    EndDate: fullEndDate.toISOString(),
                    Reason: reason,
                    EmploymentType: employmentType,
                    employeeSignature: employeeSignatureBase64,
                    departmentHeadSignature: deptHeadSignatureBase64
                };
            } else {
                // For undertime requests, combine the selected date with the time values
                const timeInDate = new Date(startDate);
                timeInDate.setHours(undertimeIn.getHours());
                timeInDate.setMinutes(undertimeIn.getMinutes());

                const timeOutDate = new Date(endDate);
                timeOutDate.setHours(undertimeOut.getHours());
                timeOutDate.setMinutes(undertimeOut.getMinutes());

                requestData = {
                    FacultyID: facultyId,
                    requestType: "Undertime",  // Explicitly set to "Undertime"
                    LeaveType: null,
                    TimeIn: timeInDate.toISOString(),
                    TimeOut: timeOutDate.toISOString(),
                    StartDate: startDate.toISOString(),
                    EndDate: endDate.toISOString(),
                    Reason: reason,
                    employeeSignature: employeeSignatureBase64,
                    departmentHeadSignature: deptHeadSignatureBase64
                };
            }

            // Create request using the API route
            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const responseText = await response.text();
                console.error('Raw error response:', responseText);
                let errorMessage = 'Failed to submit request';
                
                try {
                    const errorData = JSON.parse(responseText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    } else if (errorData.details) {
                        errorMessage = errorData.details;
                    } else if (typeof errorData === 'string') {
                        errorMessage = errorData;
                    }
                    console.error('Server error response:', errorData);
                } catch (e) {
                    console.error('Error parsing error response:', e);
                    errorMessage = responseText || 'Failed to submit request';
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Request successful:', result);

            // Reset form and refresh list
            setShowModal(false);
            setStartDate(null);
            setEndDate(null);
            setStartTime(null);
            setEndTime(null);
            setUndertimeIn(null);
            setUndertimeOut(null);
            setReason('');
            setEmployeeSignature(null);
            setDeptHeadSignature(null);
            setEmployeeSignaturePreview(null);
            setDeptHeadSignaturePreview(null);
            await fetchLeaveRequests(facultyId);

        } catch (err) {
            console.error('Error adding request:', err);
            let errorMessage = 'Failed to submit request';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message);
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Error Modal */}
            <ErrorModal 
                error={error} 
                onClose={handleCloseError}
            />

            {/* Add global styles for input fields */}
            <style jsx global>{`
                input:focus, 
                select:focus, 
                textarea:focus {
                    outline: none !important;
                    box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.2) !important;
                    border-color: rgba(156, 163, 175, 0.4) !important;
                }
                .react-datepicker__input-container input:focus {
                    outline: none !important;
                    box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.2) !important;
                    border-color: rgba(156, 163, 175, 0.4) !important;
                }
                input:hover,
                select:hover,
                textarea:hover,
                .react-datepicker__input-container input:hover {
                    border-color: rgba(239, 68, 68, 0.4) !important;
                    transition: border-color 0.2s ease;
                }
            `}</style>

            <div className="flex items-center justify-end mb-6 space-x-4">
                {/* Date Range Picker */}
                <div className="flex items-center space-x-2">
                    <DatePicker
                        selected={dateRange[0]}
                        onChange={handleDateChange}
                        startDate={dateRange[0]}
                        endDate={dateRange[1]}
                        selectsRange
                        dateFormat="yyyy-MM-dd"
                        customInput={
                            <button className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors duration-200 w-[250px] justify-center">
                                {dateRange[0]
                                    ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1]?.toLocaleDateString() || ''}`
                                    : "Select Date Range"}
                            </button>
                        }
                    />
                    {(dateRange[0] || dateRange[1]) && (
                        <button
                            onClick={handleClearDateRange}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors duration-200"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* New Leave Request Button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors duration-200"
                >
                    Request New Leave/Undertime
                </button>
            </div>

            {/* Leave Requests Table */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Request List</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-[#800000]">
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Request Type</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave Type</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Applied Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderLeaveRequestsTable()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for New Leave Request */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">New Leave Request/Undertime</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {/* Personal Information Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">Employee Name</label>
                                    <input
                                        type="text"
                                        value={facultyData?.name || ''}
                                        disabled
                                        className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">Department</label>
                                    <input
                                        type="text"
                                        value={facultyData?.department || ''}
                                        disabled
                                        className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Request Type */}
                            <div>
                                <label className="block mb-1 font-semibold text-sm text-gray-700">Request Type <span className="text-[#800000]">*</span></label>
                                <select
                                    value={requestType}
                                    onChange={(e) => setRequestType(e.target.value as RequestType)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    disabled={isLoading}
                                >
                                    <option value="Leave">Leave</option>
                                    <option value="Undertime">Undertime</option>
                                </select>
                            </div>

                            {/* Leave Type and Employment Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">
                                        {requestType === 'Leave' ? 'Leave Type' : 'Undertime'} <span className="text-[#800000]">*</span>
                                    </label>
                                    {requestType === 'Leave' ? (
                                        <select
                                            value={leaveType}
                                            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                            disabled={isLoading}
                                        >
                                            <option value="Sick">Sick Leave</option>
                                            <option value="Vacation">Vacation Leave</option>
                                            <option value="Emergency">Emergency Leave</option>
                                        </select>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <button 
                                                    type="button"
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 z-10 p-1"
                                                    onClick={() => undertimeInRef.current?.setOpen(true)}
                                                    tabIndex={-1}
                                                >
                                                    <ClockIcon />
                                                </button>
                                                <DatePicker
                                                    ref={undertimeInRef}
                                                    selected={undertimeIn}
                                                    onChange={(time: Date | null) => setUndertimeIn(time)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={1}
                                                    timeCaption="Time"
                                                    dateFormat="h:mm aa"
                                                    className="w-full border border-gray-300 rounded-md p-2 pl-11 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                                    disabled={isLoading}
                                                    placeholderText="Select Time In"
                                                />
                                            </div>
                                            <div className="relative">
                                                <button 
                                                    type="button"
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 z-10 p-1"
                                                    onClick={() => undertimeOutRef.current?.setOpen(true)}
                                                    tabIndex={-1}
                                                >
                                                    <ClockIcon />
                                                </button>
                                                <DatePicker
                                                    ref={undertimeOutRef}
                                                    selected={undertimeOut}
                                                    onChange={(time: Date | null) => setUndertimeOut(time)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={1}
                                                    timeCaption="Time"
                                                    dateFormat="h:mm aa"
                                                    className="w-full border border-gray-300 rounded-md p-2 pl-11 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                                    disabled={isLoading}
                                                    placeholderText="Select Time Out"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold text-sm text-gray-700">Employee Type <span className="text-[#800000]">*</span></label>
                                    <select
                                        value={employmentType}
                                        onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        disabled={isLoading}
                                    >
                                        <option value="Regular">Regular</option>
                                        <option value="Under Probation">Under Probation</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label htmlFor="Reason" className="block mb-1 font-semibold text-sm text-gray-700">Reason <span className="text-[#800000]">*</span></label>
                                <textarea
                                    id="Reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    rows={4}
                                    disabled={isLoading}
                                    placeholder="Please provide a detailed reason for your leave request"
                                ></textarea>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Date fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Date *
                                        </label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={startDate}
                                                onChange={(date) => setStartDate(date)}
                                            dateFormat="yyyy-MM-dd"
                                                placeholderText="Select Date"
                                            minDate={new Date()}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                        />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <CalendarIcon />
                                    </div>
                                </div>
                                    </div>
                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Date *
                                        </label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={endDate}
                                                onChange={(date) => setEndDate(date)}
                                            dateFormat="yyyy-MM-dd"
                                                placeholderText="Select Date"
                                            minDate={startDate || new Date()}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                        />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <CalendarIcon />
                                            </div>
                                    </div>
                                </div>
                            </div>

                                {/* Time fields - Only show for Leave requests */}
                            {requestType === 'Leave' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Time In *
                                            </label>
                                        <div className="relative">
                                            <DatePicker
                                                selected={startTime}
                                                    onChange={(time) => setStartTime(time)}
                                                showTimeSelect
                                                showTimeSelectOnly
                                                timeIntervals={1}
                                                timeCaption="Time"
                                                dateFormat="h:mm aa"
                                                    placeholderText="Select Time"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                            />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <ClockIcon />
                                        </div>
                                    </div>
                                        </div>
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Time Out *
                                            </label>
                                        <div className="relative">
                                            <DatePicker
                                                selected={endTime}
                                                    onChange={(time) => setEndTime(time)}
                                                showTimeSelect
                                                showTimeSelectOnly
                                                timeIntervals={1}
                                                timeCaption="Time"
                                                dateFormat="h:mm aa"
                                                    placeholderText="Select Time"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                            />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <ClockIcon />
                                                </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>

                            {/* Employee Signature Upload */}
                            <div className="mt-4">
                                <label className="block mb-1 font-semibold text-sm text-gray-700">
                                    Employee Signature <span className="text-[#800000]">*</span>
                                    <span className="text-xs text-gray-500 font-normal ml-1">(JPG or PNG only)</span>
                                </label>
                                <div className="w-full border border-gray-300 rounded-md p-2 focus-within:ring-2 focus-within:ring-[#800000] focus-within:border-[#800000]">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleEmployeeSignature}
                                            className="hidden"
                                            id="employeeSignature"
                                            disabled={isLoading}
                                            required
                                        />
                                        <label
                                            htmlFor="employeeSignature"
                                            className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-[#800000] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        >
                                            Choose File
                                        </label>
                                        {employeeSignature && (
                                            <span className="text-sm text-gray-500">{employeeSignature.name}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Department Head Signature Upload */}
                            <div className="mt-4">
                                <label className="block mb-1 font-semibold text-sm text-gray-700">
                                    Department Head Signature <span className="text-[#800000]">*</span>
                                    <span className="text-xs text-gray-500 font-normal ml-1">(JPG or PNG only)</span>
                                </label>
                                <div className="w-full border border-gray-300 rounded-md p-2 focus-within:ring-2 focus-within:ring-[#800000] focus-within:border-[#800000]">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleDeptHeadSignature}
                                            className="hidden"
                                            id="departmentHeadSignature"
                                            disabled={isLoading}
                                            required
                                        />
                                        <label
                                            htmlFor="departmentHeadSignature"
                                            className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-[#800000] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        >
                                            Choose File
                                        </label>
                                        {deptHeadSignature && (
                                            <span className="text-sm text-gray-500">{deptHeadSignature.name}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLeaveRequest}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50"
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