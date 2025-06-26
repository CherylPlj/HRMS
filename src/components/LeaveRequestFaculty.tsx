"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FaRegCalendarAlt, FaClock, FaEye, FaPen, FaTrash } from 'react-icons/fa';

// Define leave types as string literals
type RequestType = 'Leave' | 'Undertime';
type LeaveType = 'Sick' | 'Vacation' | 'Emergency' | 'Maternity';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface ComponentWithBackButton {
    onBack: () => void;
}

interface FacultyDetails {
    fullName: string;
    department: string;
    employmentStatus: string;
}

interface LeaveRequest {
    LeaveID: number;
    FacultyID: number;
    RequestType: RequestType;
    LeaveType: LeaveType;
    StartDate: Date;
    EndDate: Date;
    TimeIn: string | null;
    TimeOut: string | null;
    Reason: string;
    Status: LeaveStatus;
    DocumentUrl?: string;
    CreatedAt: Date;
    employeeSignature?: string;
    departmentHeadSignature?: string;
    Faculty: {
        Name: string;
        Department: string;
    };
}

interface SupabaseLeave {
    LeaveID: number;
    FacultyID: number;
    RequestType: RequestType;
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

interface Department {
    DepartmentName: string;
}

interface FacultyResponse {
    FacultyID: number;
    EmploymentStatus: string;
    Department: {
        DepartmentName: string;
    };
}

// Add helper function to check date overlaps
const checkDateOverlap = (
    startDate: Date | null,
    endDate: Date | null,
    existingLeaves: LeaveRequest[]
): LeaveRequest | null => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return existingLeaves.find(leave => {
        if (leave.Status !== 'Pending') return false;

        const leaveStart = new Date(leave.StartDate);
        const leaveEnd = new Date(leave.EndDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(23, 59, 59, 999);

        return (
            (start <= leaveEnd && start >= leaveStart) ||
            (end <= leaveEnd && end >= leaveStart) ||
            (start <= leaveStart && end >= leaveEnd)
        );
    }) || null;
};

// Add helper function for calculating duration
const calculateDuration = (request: LeaveRequest) => {
    if (request.RequestType === 'Undertime' && request.TimeIn && request.TimeOut) {
        const timeIn = new Date(request.TimeIn);
        const timeOut = new Date(request.TimeOut);
        const diffMs = timeOut.getTime() - timeIn.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    } else {
        const days = Math.ceil((new Date(request.EndDate).getTime() - new Date(request.StartDate).getTime()) / (1000 * 60 * 60 * 24));
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
};

const LeaveRequestFaculty: React.FC<ComponentWithBackButton> = ({ onBack }) => {
    const { user } = useUser();
    const [showModal, setShowModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmType, setDeleteConfirmType] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [requestType, setRequestType] = useState<RequestType>('Leave');
    const [leaveType, setLeaveType] = useState<LeaveType>('Sick');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateError, setDateError] = useState<string | null>(null);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [employeeSignature, setEmployeeSignature] = useState<File | null>(null);
    const [deptHeadSignature, setDeptHeadSignature] = useState<File | null>(null);
    const [facultyId, setFacultyId] = useState<number | null>(null);
    const [facultyDetails, setFacultyDetails] = useState<FacultyDetails | null>(null);
    const [overlappingLeave, setOverlappingLeave] = useState<LeaveRequest | null>(null);

    // Handle modal open/close
    const handleModalOpen = () => {
        setShowModal(true);
        setError(null);
        setDateError(null);
        setTimeError(null);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setShowConfirmation(false);
        setShowSuccess(false);
        // Reset form state
        setRequestType('Leave');
        setLeaveType('Sick');
        setStartDate(null);
        setEndDate(null);
        setStartTime(null);
        setEndTime(null);
        setReason('');
        setEmployeeSignature(null);
        setDeptHeadSignature(null);
        setError(null);
        setDateError(null);
        setTimeError(null);
    };

    // Validate dates when either start or end date changes
    useEffect(() => {
        if (startDate && endDate) {
            if (startDate > endDate) {
                setDateError('Start date cannot be later than end date');
            } else {
                setDateError(null);
            }
        }
    }, [startDate, endDate]);

    useEffect(() => {
        const fetchUserAndFacultyDetails = async () => {
            if (!user?.emailAddresses?.[0]?.emailAddress) {
                console.log('No Clerk user email available');
                setError('Please log in to access this page');
                return;
            }

            try {
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('UserID, FirstName, LastName')
                    .eq('Email', user.emailAddresses[0].emailAddress)
                    .single();

                if (userError) {
                    console.error('Error fetching Supabase user:', userError);
                    setError('Failed to fetch user data');
                    return;
                }

                if (userData) {
                    // Fetch FacultyID and details using UserID
                    const { data: facultyData, error: facultyError } = await supabase
                        .from('Faculty')
                        .select(`
                            FacultyID,
                            EmploymentStatus,
                            Department:DepartmentID (
                                DepartmentName
                            )
                        `)
                        .eq('UserID', userData.UserID)
                        .single() as { data: FacultyResponse | null; error: any };

                    if (facultyError) {
                        console.error('Error fetching Faculty data:', facultyError);
                        setError('Failed to fetch faculty data');
                        return;
                    }

                    if (facultyData) {
                        setFacultyId(facultyData.FacultyID);
                        setFacultyDetails({
                            fullName: `${userData.FirstName} ${userData.LastName}`,
                            department: facultyData.Department?.DepartmentName || 'Unknown Department',
                            employmentStatus: facultyData.EmploymentStatus
                        });
                        fetchLeaveRequests(facultyData.FacultyID);
                    } else {
                        setError('Faculty record not found. Please contact the administrator.');
                    }
                } else {
                    setError('User not found in database. Please contact the administrator.');
                }
            } catch (error) {
                console.error('Error in fetchUserAndFacultyDetails:', error);
                setError('An unexpected error occurred. Please try again later.');
            }
        };

        fetchUserAndFacultyDetails();
    }, [user]);

    const fetchLeaveRequests = async (facultyId: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // First try the API endpoint
            try {
                const response = await fetch(`/api/leaves/faculty/${facultyId}`, {
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
                RequestType: leave.RequestType || 'Leave', // Use the correct field name
                LeaveType: leave.LeaveType as LeaveType,
                StartDate: new Date(leave.StartDate),
                EndDate: new Date(leave.EndDate),
                TimeIn: leave.TimeIn,
                TimeOut: leave.TimeOut,
                Reason: leave.Reason,
                Status: leave.Status as LeaveStatus,
                DocumentUrl: leave.DocumentUrl,
                CreatedAt: new Date(leave.CreatedAt),
                employeeSignature: leave.employeeSignature,
                departmentHeadSignature: leave.departmentHeadSignature,
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

        if (dates[0] && dates[1]) {
            const overlap = checkDateOverlap(dates[0], dates[1], leaveRequests);
            if (overlap) {
                setOverlappingLeave(overlap);
                setDateError(`You already have a pending ${overlap.RequestType.toLowerCase()} request from ${new Date(overlap.StartDate).toLocaleDateString()} to ${new Date(overlap.EndDate).toLocaleDateString()}. Please update the existing request instead.`);
            } else {
                setOverlappingLeave(null);
                setDateError(null);
            }
        }
    };

    const handleStartDateChange = (date: Date | null) => {
        setStartDate(date);
        if (date) {
            if (requestType === 'Undertime') {
                // For undertime, automatically set end date to same day
                setEndDate(date);
            } else if (endDate) {
                if (date > endDate) {
                    setDateError('Start date cannot be later than end date');
                } else {
                    const overlap = checkDateOverlap(date, endDate, leaveRequests);
                    if (overlap) {
                        setOverlappingLeave(overlap);
                        setDateError(`You already have a pending ${overlap.RequestType.toLowerCase()} request from ${new Date(overlap.StartDate).toLocaleDateString()} to ${new Date(overlap.EndDate).toLocaleDateString()}. Please update the existing request instead.`);
                    } else {
                        setOverlappingLeave(null);
                        setDateError(null);
                    }
                }
            }
        }
    };

    const handleEndDateChange = (date: Date | null) => {
        if (requestType === 'Undertime' && startDate && date) {
            // For undertime, ensure end date is same as start date
            if (date.toDateString() !== startDate.toDateString()) {
                setDateError('For undertime requests, end date must be the same as start date');
                return;
            }
        }
        
        setEndDate(date);
        if (startDate && date) {
            if (startDate > date) {
                setDateError('Start date cannot be later than end date');
            } else if (requestType === 'Undertime' && date.toDateString() !== startDate.toDateString()) {
                setDateError('For undertime requests, end date must be the same as start date');
            } else {
                const overlap = checkDateOverlap(startDate, date, leaveRequests);
                if (overlap) {
                    setOverlappingLeave(overlap);
                    setDateError(`You already have a pending ${overlap.RequestType.toLowerCase()} request from ${new Date(overlap.StartDate).toLocaleDateString()} to ${new Date(overlap.EndDate).toLocaleDateString()}. Please update the existing request instead.`);
                } else {
                    setOverlappingLeave(null);
                    setDateError(null);
                }
            }
        }
    };

    const handleEmployeeSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
                setError('Please upload only JPG or PNG files for signatures');
                return;
            }
            setEmployeeSignature(file);
            setError(null);
        }
    };

    const handleDeptHeadSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
                setError('Please upload only JPG or PNG files for signatures');
                return;
            }
            setDeptHeadSignature(file);
            setError(null);
        }
    };

    const handleRequestTypeChange = (type: RequestType) => {
        setRequestType(type);
        if (type === 'Undertime' && startDate) {
            // When switching to undertime, set end date to match start date
            setEndDate(startDate);
        }
        // Clear any existing date errors
        setDateError(null);
    };

    const handleConfirmation = () => {
        if (!startDate || !endDate || !startTime || !endTime || !reason || !employeeSignature || (requestType === 'Leave' && !leaveType)) {
            setError('Please fill in all required fields');
            return;
        }

        if (dateError) {
            return;
        }

        if (requestType === 'Undertime' && startDate.toDateString() !== endDate.toDateString()) {
            setDateError('For undertime requests, end date must be the same as start date');
            return;
        }

        const overlap = checkDateOverlap(startDate, endDate, leaveRequests);
        if (overlap) {
            setOverlappingLeave(overlap);
            setDateError(`You already have a pending ${overlap.RequestType.toLowerCase()} request from ${new Date(overlap.StartDate).toLocaleDateString()} to ${new Date(overlap.EndDate).toLocaleDateString()}. Please update the existing request instead.`);
            return;
        }

        setShowConfirmation(true);
    };

    const handleAddLeaveRequest = async () => {
        if (!facultyId || !startDate || !endDate) {
            setError('Required dates are missing');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Create request body
            const requestBody = {
                FacultyID: facultyId,
                RequestType: requestType,
                LeaveType: leaveType,
                StartDate: startDate.toISOString(),
                EndDate: endDate.toISOString(),
                TimeIn: startTime?.toISOString(),
                TimeOut: endTime?.toISOString(),
                Reason: reason,
                employeeSignature: employeeSignature ? await fileToBase64(employeeSignature) : null,
                departmentHeadSignature: deptHeadSignature ? await fileToBase64(deptHeadSignature) : null
            };

            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to submit request' }));
                throw new Error(errorData.error || 'Failed to submit request');
            }

            const result = await response.json();
            console.log('Request successful:', result);

            // Show success message
            setShowConfirmation(false);
            setShowSuccess(true);

            // Reset form and refresh list after 2 seconds
            setTimeout(() => {
                handleModalClose();
                if (facultyId) {
                    fetchLeaveRequests(facultyId);
                }
            }, 2000);

        } catch (err) {
            console.error('Error adding request:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to convert File to base64 string
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleView = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setShowViewModal(true);
    };

    const handleEdit = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setRequestType(leave.RequestType);
        setLeaveType(leave.LeaveType);
        setStartDate(new Date(leave.StartDate));
        setEndDate(new Date(leave.EndDate));
        setStartTime(leave.TimeIn ? new Date(leave.TimeIn) : null);
        setEndTime(leave.TimeOut ? new Date(leave.TimeOut) : null);
        setReason(leave.Reason);
        setShowEditModal(true);
    };

    const handleDelete = async () => {
        if (!selectedLeave) return;

        if (deleteConfirmType.toLowerCase() !== selectedLeave.LeaveType.toLowerCase()) {
            setDeleteError('Please type the correct leave type to confirm deletion');
            return;
        }

        try {
            setIsLoading(true);
            setDeleteError('');
            const response = await fetch(`/api/leaves/${selectedLeave.LeaveID}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete request');
            }

            setShowDeleteConfirm(false);
            setSelectedLeave(null);
            setDeleteConfirmType('');
            setShowDeleteSuccess(true);
            
            // Hide success message after 2 seconds and refresh the list
            setTimeout(() => {
                setShowDeleteSuccess(false);
                if (facultyId) {
                    fetchLeaveRequests(facultyId);
                }
            }, 2000);

        } catch (err) {
            console.error('Error deleting request:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete request');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedLeave || !startDate || !endDate) {
            setError('Required fields are missing');
            return;
        }

        if (dateError) {
            return;
        }

        if (startDate > endDate) {
            setDateError('Start date cannot be later than end date');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/leaves/${selectedLeave.LeaveID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    RequestType: requestType,
                    LeaveType: leaveType,
                    StartDate: startDate.toISOString(),
                    EndDate: endDate.toISOString(),
                    TimeIn: startTime?.toISOString(),
                    TimeOut: endTime?.toISOString(),
                    Reason: reason,
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to update request');
            }

            setShowEditModal(false);
            setSelectedLeave(null);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                if (facultyId) {
                    fetchLeaveRequests(facultyId);
                }
            }, 2000);
        } catch (err) {
            console.error('Error updating request:', err);
            setError(err instanceof Error ? err.message : 'Failed to update request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            {/* Leave Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-[#800000]">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Total Leaves</h3>
                    <p className="text-2xl font-bold text-[#800000]">10</p>
                    <p className="text-xs text-gray-600">Days Per Month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Remaining</h3>
                    <p className="text-2xl font-bold text-blue-500">
                        {10 - leaveRequests
                            .filter(request => {
                                const leaveDate = new Date(request.StartDate);
                                const currentDate = new Date();
                                return request.Status === 'Approved' && 
                                       request.RequestType === 'Leave' &&
                                       leaveDate.getMonth() === currentDate.getMonth() &&
                                       leaveDate.getFullYear() === currentDate.getFullYear();
                            })
                            .reduce((total, leave) => {
                                const start = new Date(leave.StartDate);
                                const end = new Date(leave.EndDate);
                                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                return total + days;
                            }, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Days Left This Month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-yellow-500">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Pending</h3>
                    <p className="text-2xl font-bold text-yellow-500">
                        {leaveRequests.filter(request => request.Status === 'Pending').length}
                    </p>
                    <p className="text-xs text-gray-600">Requests</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-green-500">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Approved</h3>
                    <p className="text-2xl font-bold text-green-500">
                        {leaveRequests.filter(request => request.Status === 'Approved').length}
                    </p>
                    <p className="text-xs text-gray-600">Requests</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-red-500">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Rejected</h3>
                    <p className="text-2xl font-bold text-red-500">
                        {leaveRequests.filter(request => request.Status === 'Rejected').length}
                    </p>
                    <p className="text-xs text-gray-600">Requests</p>
                </div>
            </div>

            <div className="mb-8 flex justify-end">
                <button
                    onClick={handleModalOpen}
                    className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-[#600000] transition-colors duration-200"
                >
                    New Leave Request
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
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : leaveRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No leave requests found
                                    </td>
                                </tr>
                            ) : (
                                leaveRequests.map((request) => (
                                    <tr key={request.LeaveID} className="hover:bg-gray-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {request.RequestType === 'Undertime' ? 'Undertime' : `${request.LeaveType} Leave`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.StartDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.EndDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {calculateDuration(request)}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3 flex items-center">
                                            <button
                                                onClick={() => handleView(request)}
                                                className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                                                title="View Details"
                                            >
                                                <FaEye className="h-5 w-5" />
                                            </button>
                                            {request.Status === 'Pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(request)}
                                                        className="text-[#800000] hover:text-[#600000] transition-colors duration-200"
                                                        title="Edit Request"
                                                    >
                                                        <FaPen className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLeave(request);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                                        title="Delete Request"
                                                    >
                                                        <FaTrash className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Leave Request Details</h2>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedLeave(null);
                                }}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold">Request Type:</p>
                                    <p>{selectedLeave.RequestType}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Leave Type:</p>
                                    <p>{selectedLeave.LeaveType}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Start Date:</p>
                                    <p>{new Date(selectedLeave.StartDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">End Date:</p>
                                    <p>{new Date(selectedLeave.EndDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Time In:</p>
                                    <p>{selectedLeave.TimeIn ? new Date(selectedLeave.TimeIn).toLocaleTimeString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Time Out:</p>
                                    <p>{selectedLeave.TimeOut ? new Date(selectedLeave.TimeOut).toLocaleTimeString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Status:</p>
                                    <p>{selectedLeave.Status}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Applied Date:</p>
                                    <p>{new Date(selectedLeave.CreatedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div>
                                <p className="font-semibold">Reason:</p>
                                <p className="whitespace-pre-wrap">{selectedLeave.Reason}</p>
                            </div>
                            {selectedLeave.employeeSignature && (
                                <div>
                                    <p className="font-semibold">Employee Signature:</p>
                                    <img src={selectedLeave.employeeSignature} alt="Employee Signature" className="max-h-20" />
                                </div>
                            )}
                            {selectedLeave.departmentHeadSignature && (
                                <div>
                                    <p className="font-semibold">Department Head Signature:</p>
                                    <img src={selectedLeave.departmentHeadSignature} alt="Department Head Signature" className="max-h-20" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Edit Leave Request</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedLeave(null);
                                }}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}
                            {dateError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {dateError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                                <select
                                    value={requestType}
                                    onChange={(e) => handleRequestTypeChange(e.target.value as RequestType)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
                                >
                                    <option value="Leave">Leave</option>
                                    <option value="Undertime">Undertime</option>
                                </select>
                            </div>

                            {requestType === 'Leave' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
                                    >
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Vacation">Vacation Leave</option>
                                        <option value="Emergency">Emergency Leave</option>
                                        <option value="Maternity">Maternity Leave</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={startDate}
                                            onChange={handleStartDateChange}
                                            dateFormat="yyyy-MM-dd"
                                            minDate={new Date()}
                                            className={`mt-1 block w-full pl-10 pr-3 py-2 bg-white border ${dateError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]`}
                                            placeholderText="Select start date"
                                        />
                                        <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                            <FaRegCalendarAlt className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                    {dateError && (
                                        <p className="mt-1 text-sm text-red-600">{dateError}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={endDate}
                                            onChange={handleEndDateChange}
                                            dateFormat="yyyy-MM-dd"
                                            minDate={startDate || new Date()}
                                            disabled={requestType === 'Undertime'}
                                            className={`mt-1 block w-full pl-10 pr-3 py-2 bg-white border ${dateError ? 'border-red-500' : 'border-gray-300'} ${requestType === 'Undertime' ? 'bg-gray-100 cursor-not-allowed' : ''} rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]`}
                                            placeholderText={requestType === 'Undertime' ? 'Same as start date' : 'Select end date'}
                                        />
                                        <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                            <FaRegCalendarAlt className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {requestType === 'Leave' ? 'Start Time' : 'Time In'}
                                    </label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={startTime}
                                            onChange={(time: Date | null) => setStartTime(time)}
                                            showTimeSelect
                                            showTimeSelectOnly
                                            timeIntervals={15}
                                            timeCaption="Time"
                                            dateFormat="h:mm aa"
                                            className="mt-1 block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
                                            placeholderText={`Select ${requestType === 'Leave' ? 'start time' : 'time in'}`}
                                            minTime={new Date(new Date().setHours(6, 0))}
                                            maxTime={new Date(new Date().setHours(17, 0))}
                                        />
                                        <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                            <FaClock className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {requestType === 'Leave' ? 'End Time' : 'Time Out'}
                                    </label>
                                    <div className="relative">
                                        <DatePicker
                                            selected={endTime}
                                            onChange={(time: Date | null) => setEndTime(time)}
                                            showTimeSelect
                                            showTimeSelectOnly
                                            timeIntervals={15}
                                            timeCaption="Time"
                                            dateFormat="h:mm aa"
                                            className="mt-1 block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
                                            placeholderText={`Select ${requestType === 'Leave' ? 'end time' : 'time out'}`}
                                            minTime={new Date(new Date().setHours(7, 0))}
                                            maxTime={new Date(new Date().setHours(19, 0))}
                                        />
                                        <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                            <FaClock className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000] resize-none"
                                    placeholder="Please provide the reason for your request"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleUpdate}
                                disabled={isLoading}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50"
                            >
                                {isLoading ? 'Updating...' : 'Update Request'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedLeave(null);
                                }}
                                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Leave Request</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            To confirm deletion, please type <span className="font-semibold">{selectedLeave.LeaveType}</span> below:
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmType}
                            onChange={(e) => setDeleteConfirmType(e.target.value)}
                            placeholder={`Type ${selectedLeave.LeaveType} to confirm`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000] mb-4"
                        />
                        {deleteError && (
                            <p className="text-sm text-red-600 mb-4">{deleteError}</p>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={isLoading || deleteConfirmType.toLowerCase() !== selectedLeave.LeaveType.toLowerCase()}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setSelectedLeave(null);
                                    setDeleteConfirmType('');
                                    setDeleteError('');
                                }}
                                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg w-full max-w-4xl mx-4 my-8 h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">New Leave Request</h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Error Message at top of modal if exists */}
                        {error && (
                            <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Modal Body - Single Scrollable Container */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {/* Leave Request Form */}
                        <div className="space-y-6">
                                {/* Employee Details Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={facultyDetails?.fullName || ''}
                                            disabled
                                            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <input
                                            type="text"
                                            value={facultyDetails?.department || ''}
                                            disabled
                                            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none text-gray-700"
                                        />
                                    </div>
                                </div>

                                {/* Employment Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                                    <input
                                        type="text"
                                        value={facultyDetails?.employmentStatus || ''}
                                        disabled
                                        className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none text-gray-700"
                                    />
                                </div>

                                {/* Request Type Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                                    <select
                                        value={requestType}
                                        onChange={(e) => handleRequestTypeChange(e.target.value as RequestType)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
                                    >
                                        <option value="Leave">Leave</option>
                                        <option value="Undertime">Undertime</option>
                                    </select>
                                </div>

                                {requestType === 'Leave' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                        <select
                                            value={leaveType}
                                            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
                                        >
                                            <option value="Sick">Sick Leave</option>
                                            <option value="Vacation">Vacation Leave</option>
                                            <option value="Emergency">Emergency Leave</option>
                                            <option value="Maternity">Maternity Leave</option>
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Start Date <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DatePicker
                                                    selected={startDate}
                                                    onChange={handleStartDateChange}
                                                    dateFormat="yyyy-MM-dd"
                                                    minDate={new Date()}
                                                    className={`mt-1 block w-full pl-10 pr-3 py-2 bg-white border ${dateError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]`}
                                                    placeholderText="Select start date"
                                                />
                                                <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                                    <FaRegCalendarAlt className="h-5 w-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {requestType === 'Leave' ? 'Start Time' : 'Time In'} <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DatePicker
                                                    selected={startTime}
                                                    onChange={(time: Date | null) => setStartTime(time)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={15}
                                                    timeCaption="Time"
                                                    dateFormat="h:mm aa"
                                                    className="mt-1 block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
                                                    placeholderText={`Select ${requestType === 'Leave' ? 'start time' : 'time in'}`}
                                                    minTime={new Date(new Date().setHours(6, 0))}
                                                    maxTime={new Date(new Date().setHours(17, 0))}
                                                />
                                                <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                                    <FaClock className="h-5 w-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                End Date <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DatePicker
                                                    selected={endDate}
                                                    onChange={handleEndDateChange}
                                                    dateFormat="yyyy-MM-dd"
                                                    minDate={startDate || new Date()}
                                                    className="mt-1 block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    placeholderText="Select end date"
                                                />
                                                <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                                    <FaRegCalendarAlt className="h-5 w-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {requestType === 'Leave' ? 'End Time' : 'Time Out'} <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DatePicker
                                                    selected={endTime}
                                                    onChange={(time: Date | null) => setEndTime(time)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={15}
                                                    timeCaption="Time"
                                                    dateFormat="h:mm aa"
                                                    className="mt-1 block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    placeholderText={`Select ${requestType === 'Leave' ? 'end time' : 'time out'}`}
                                                    minTime={new Date(new Date().setHours(7, 0))}
                                                    maxTime={new Date(new Date().setHours(19, 0))}
                                                />
                                                <div className="absolute inset-y-0 left-3 top-[9px] flex items-center pointer-events-none">
                                                    <FaClock className="h-5 w-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={4}
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder="Please provide the reason for your request"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Employee Signature <span className="text-red-500">*</span>
                                        </label>
                                        <div className="mt-1 relative">
                                <input
                                    type="file"
                                                onChange={handleEmployeeSignatureChange}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                accept=".jpg,.jpeg,.png"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Upload your signature (JPG or PNG only)
                                            </p>
                                        </div>
                            </div>
                            <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department Head Signature <span className="text-red-500">*</span>
                                        </label>
                                        <div className="mt-1 relative">
                                            <input
                                                type="file"
                                                onChange={handleDeptHeadSignatureChange}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                accept=".jpg,.jpeg,.png"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Upload department head signature (JPG or PNG only)
                                            </p>
                                        </div>
                            </div>
                        </div>

                                {/* Modal Footer */}
                                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-row-reverse gap-3">
                                    <button
                                        onClick={handleConfirmation}
                                        disabled={isLoading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Review Request
                                    </button>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
                        <h2 className="text-2xl font-bold mb-4">Confirm {requestType === 'Undertime' ? 'Undertime' : 'Leave'} Request</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold">Name:</p>
                                    <p>{facultyDetails?.fullName}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Department:</p>
                                    <p>{facultyDetails?.department}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Request Type:</p>
                                    <p>{requestType}</p>
                                </div>
                                {requestType === 'Leave' && (
                                    <div>
                                        <p className="font-semibold">Leave Type:</p>
                                        <p>{leaveType}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold">Start Date:</p>
                                    <p>{startDate?.toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">End Date:</p>
                                    <p>{endDate?.toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{requestType === 'Leave' ? 'Start Time' : 'Time In'}:</p>
                                    <p>{startTime?.toLocaleTimeString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{requestType === 'Leave' ? 'End Time' : 'Time Out'}:</p>
                                    <p>{endTime?.toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div>
                                <p className="font-semibold">Reason:</p>
                                <p className="whitespace-pre-wrap">{reason}</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleAddLeaveRequest}
                                disabled={isLoading}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50"
                            >
                                {isLoading ? 'Submitting...' : 'Confirm Submit'}
                            </button>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal for Delete */}
            {showDeleteSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Request Deleted Successfully!</h3>
                        <p className="text-sm text-gray-500">The leave request has been permanently deleted.</p>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Request Submitted Successfully!</h3>
                        <p className="text-sm text-gray-500">Your leave request has been submitted and is pending approval.</p>
                    </div>
                </div>
            )}

            {overlappingLeave && dateError && (
                <div className="mt-2 flex items-center space-x-2">
                    <div className="text-sm text-red-600">{dateError}</div>
                    <button
                        onClick={() => handleEdit(overlappingLeave)}
                        className="text-[#800000] hover:text-[#600000] text-sm font-medium underline"
                    >
                        Edit existing request
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeaveRequestFaculty;