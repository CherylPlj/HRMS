import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Download, Calendar, Check, X, Eye } from 'lucide-react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Leave, Faculty, User as PrismaUser, Department } from '@prisma/client';
import { LeaveType, LeaveStatus } from '@prisma/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LeaveWithRelations = Leave & {
    Faculty: (Faculty & {
        User: Pick<PrismaUser, 'FirstName' | 'LastName' | 'UserID'> | null;
        Department: Pick<Department, 'DepartmentName'> | null;
    }) | null;
};

type TransformedLeave = Omit<LeaveWithRelations, 'Faculty'> & {
    Faculty: {
        Name: string;
        Department: string;
        UserID: string | null;
    };
    DocumentUrl?: string | null;
    RequestType: 'Leave' | 'Undertime';
    LeaveType?: 'Sick' | 'Vacation' | 'Emergency' | null;
    employeeSignature?: string | null;
    departmentHeadSignature?: string | null;
    TimeIn?: string | null;
    TimeOut?: string | null;
};

// Helper function to format request type display
const formatRequestType = (requestType: string, leaveType: string | null | undefined): string => {
    if (requestType === 'Undertime') {
        return 'Undertime';
    }
    return `${leaveType} Leave`;
};

const fetchUserProfilePhoto = async (userId: string): Promise<string> => {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        return data.imageUrl || '/manprofileavatar.png';
    } catch (error) {
        console.error('Error fetching user profile photo:', error);
        return '/manprofileavatar.png';
    }
};

// Helper functions
const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Not set';
    try {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString();
    } catch {
        return 'Invalid date';
    }
};

const calculateDuration = (startDate: string | Date | null, endDate: string | Date | null): string => {
    if (!startDate || !endDate) return 'N/A';
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Calculate days without modifying the original time
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } catch {
        return 'Invalid date range';
    }
};

// Helper function to format time
const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Invalid time';
    }
};

// Add this new component before the LeaveContent component
interface StatusUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    status: LeaveStatus;
    facultyName: string;
    leaveType: string;
    requestType: 'Leave' | 'Undertime';
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    status, 
    facultyName,
    leaveType,
    requestType
}) => {
    const [confirmInput, setConfirmInput] = useState('');
    const [confirmError, setConfirmError] = useState('');

    const handleConfirm = () => {
        if (status === 'Rejected') {
            const expectedInput = requestType === 'Undertime' ? 'Undertime' : `${leaveType} Leave`;
            if (confirmInput.trim() !== expectedInput) {
                setConfirmError(`Please type "${expectedInput}" to confirm rejection`);
                return;
            }
        }
        onConfirm();
    };

    // Reset input and error when modal closes
    useEffect(() => {
        if (!isOpen) {
            setConfirmInput('');
            setConfirmError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
                <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Status Update</h2>
                <p className="mb-4 text-gray-700">
                    Are you sure you want to {status === 'Approved' ? 'approve' : 'reject'} the leave request for {facultyName}?
                </p>

                {status === 'Rejected' && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">
                            Please type{' '}
                            <span className="font-semibold">
                                {requestType === 'Undertime' ? 'Undertime' : `${leaveType} Leave`}
                            </span>{' '}
                            to confirm rejection.
                        </p>
                        <input
                            type="text"
                            value={confirmInput}
                            onChange={(e) => {
                                setConfirmInput(e.target.value);
                                setConfirmError('');
                            }}
                            placeholder="Type to confirm"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
                        />
                        {confirmError && (
                            <p className="mt-1 text-sm text-red-600">{confirmError}</p>
                        )}
                    </div>
                )}

                <div className="flex justify-center space-x-4">
                    <button
                        onClick={handleConfirm}
                        className={`${
                            status === 'Approved' 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-red-600 hover:bg-red-700'
                        } text-white px-4 py-2 rounded`}
                    >
                        Yes, {status}
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            setConfirmInput('');
                            setConfirmError('');
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// Add this new component for viewing leave details
interface ViewLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    leave: TransformedLeave | null;
}

const ViewLeaveModal: React.FC<ViewLeaveModalProps> = ({ isOpen, onClose, leave }) => {
    if (!isOpen || !leave) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#800000]">Leave Request Details</h2>
                    <button 
                        title="close"
                        onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold text-gray-600">Faculty Information</h3>
                            <p className="text-gray-800">{leave.Faculty.Name}</p>
                            <p className="text-gray-600">{leave.Faculty.Department}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-600">Request Type</h3>
                            <p className="text-gray-800">{formatRequestType(leave.RequestType, leave.LeaveType)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold text-gray-600">Start Date</h3>
                            <p className="text-gray-800">{formatDate(leave.StartDate)}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-600">End Date</h3>
                            <p className="text-gray-800">{formatDate(leave.EndDate)}</p>
                        </div>
                    </div>

                    {leave.RequestType === 'Undertime' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-600">Time In</h3>
                                <p className="text-gray-800">{formatTime(leave.TimeIn)}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-600">Time Out</h3>
                                <p className="text-gray-800">{formatTime(leave.TimeOut)}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-gray-600">Duration</h3>
                        <p className="text-gray-800">
                            {calculateDuration(leave.StartDate, leave.EndDate)}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-600">Reason</h3>
                        <p className="text-gray-800">{leave.Reason}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-600">Status</h3>
                        <span className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${
                            leave.Status === 'Approved' 
                                ? 'bg-green-100 text-green-800'
                                : leave.Status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {leave.Status}
                        </span>
                    </div>

                    {/* Signatures section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold text-gray-600">Employee Signature</h3>
                            {leave.employeeSignature ? (
                                <div className="mt-2">
                                    <img 
                                        src={leave.employeeSignature} 
                                        alt="Employee Signature" 
                                        className="max-h-20 border border-gray-200 rounded"
                                    />
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No signature provided</p>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-600">Department Head Signature</h3>
                            {leave.departmentHeadSignature ? (
                                <div className="mt-2">
                                    <img 
                                        src={leave.departmentHeadSignature} 
                                        alt="Department Head Signature" 
                                        className="max-h-20 border border-gray-200 rounded"
                                    />
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No signature provided</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-600">Request Information</h3>
                        <p className="text-gray-600">Submitted on: {new Date(leave.CreatedAt).toLocaleString()}</p>
                        {leave.UpdatedAt && (
                            <p className="text-gray-600">Last updated: {new Date(leave.UpdatedAt).toLocaleString()}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const LeaveContent: React.FC = () => {
    const { user, isLoaded: isUserLoaded } = useUser();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'management' | 'logs'>('management');
    const [leaves, setLeaves] = useState<TransformedLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
    const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
    const [statusUpdateModal, setStatusUpdateModal] = useState<{
        isOpen: boolean;
        leaveId: number | null;
        status: LeaveStatus | null;
        facultyName: string;
        leaveType: string;
        requestType: 'Leave' | 'Undertime';
    }>({
        isOpen: false,
        leaveId: null,
        status: null,
        facultyName: '',
        leaveType: '',
        requestType: 'Leave'
    });
    const [selectedLeave, setSelectedLeave] = useState<TransformedLeave | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [deleteConfirmError, setDeleteConfirmError] = useState('');

    useEffect(() => {
        if (!isUserLoaded) {
            return; // Wait for user to load
        }

        if (!user) {
            console.log('No user found, redirecting to sign in...');
            router.push('/sign-in');
            return;
        }

        fetchLeaves();
    }, [user, isUserLoaded, router]);

    const fetchLeaves = async () => {
        try {
            if (!user?.id) {
                console.error('No user ID found');
                return;
            }

            setLoading(true);
            setError(null);
            
            console.log('Fetching all leaves...');
            const response = await fetch('/api/leaves', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            
            // Log the full response for debugging
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Handle different response types
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);

            let data;
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                console.error('Response text:', responseText);
                throw new Error('Invalid server response format');
            }
            
            if (!response.ok) {
                console.error('Error response from API:', data);
                if (response.status === 401) {
                    router.push('/sign-in');
                    return;
                }
                throw new Error(data.error || data.details || `Server error: ${response.status}`);
            }
            
            if (!Array.isArray(data)) {
                console.error('Invalid response format:', data);
                throw new Error('Invalid response format from server');
            }
            
            console.log('Number of leaves received:', data.length);
            if (data.length > 0) {
                console.log('First leave record:', data[0]);
            }
            
            setLeaves(data);
            setError(null);

            // Fetch profile photos for all faculty members
            const photoPromises = data
                .filter((leave: TransformedLeave) => leave.Faculty?.UserID)
                .map(async (leave: TransformedLeave) => {
                    if (leave.Faculty?.UserID) {
                        try {
                            const photoUrl = await fetchUserProfilePhoto(leave.Faculty.UserID);
                            return [leave.Faculty.UserID, photoUrl];
                        } catch (error) {
                            console.error(`Failed to fetch photo for user ${leave.Faculty.UserID}:`, error);
                            return [leave.Faculty.UserID, '/manprofileavatar.png'];
                        }
                    }
                    return null;
                });

            const photoResults = await Promise.all(photoPromises);
            const photos = Object.fromEntries(
                photoResults.filter((result): result is [string, string] => result !== null)
            );
            setProfilePhotos(photos);
        } catch (err) {
            console.error('Error fetching leaves:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leaves');
            setLeaves([]); // Reset leaves on error
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const leaveToDelete = leaves.find(leave => leave.LeaveID === id);
            if (!leaveToDelete) {
                throw new Error('Leave request not found');
            }

            const expectedInput = leaveToDelete.RequestType === 'Undertime' 
                ? 'Undertime' 
                : `${leaveToDelete.LeaveType} Leave`;

            if (deleteConfirmInput.trim() !== expectedInput) {
                setDeleteConfirmError(`Please type "${expectedInput}" to confirm deletion`);
                return;
            }

            const response = await fetch(`/api/leaves/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete leave request');
            }

            setLeaves(leaves.filter(leave => leave.LeaveID !== id));
            setShowDeleteModal(false);
            setSelectedLeaveId(null);
            setDeleteConfirmInput('');
            setDeleteConfirmError('');
        } catch (err) {
            console.error('Error deleting leave:', err);
            alert('Failed to delete leave request');
        }
    };

    const handleStatusUpdate = async (id: number, status: LeaveStatus) => {
        try {
            const response = await fetch(`/api/leaves/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error(`Failed to ${status.toLowerCase()} leave request`);
            }

            setLeaves(leaves.map(leave => 
                leave.LeaveID === id 
                    ? { ...leave, Status: status }
                    : leave
            ));
            setStatusUpdateModal({ isOpen: false, leaveId: null, status: null, facultyName: '', leaveType: '', requestType: 'Leave' });
        } catch (err) {
            console.error('Error updating leave status:', err);
            alert(`Failed to ${status.toLowerCase()} leave request`);
        }
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        if (activeTab === 'management') {
            // Title
            doc.setFontSize(16);
            doc.text('Leave Management Report', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

            const tableData = leaves.map(item => [
                item.Faculty?.Name || '',
                item.Faculty?.Department || 'N/A',
                item.LeaveType,
                formatDate(item.StartDate),
                formatDate(item.EndDate),
                item.Status
            ]);

            autoTable(doc, {
                head: [['Faculty', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Status']],
                body: tableData,
                startY: 30,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [128, 0, 0] }
            });

            doc.save('leave-management.pdf');

        } else if (activeTab === 'logs') {
            // Title
            doc.setFontSize(16);
            doc.text('Leave Logs Report', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

            const tableData = leaves.map(log => [
                `${log.Faculty?.Name}`,
                log.LeaveType,
                formatDate(log.StartDate),
                formatDate(log.EndDate),
                calculateDuration(log.StartDate, log.EndDate),
                formatDate(log.CreatedAt),
                log.Status
            ]);

            autoTable(doc, {
                head: [['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Date Submitted', 'Status']],
                body: tableData,
                startY: 30,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [128, 0, 0] }
            });

            doc.save('leave-logs.pdf');
        }
    };

    if (!isUserLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
            </div>
        );
    }

    if (!user) {
        console.error('No user found');
        return;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg">
                <p className="font-semibold">Error Loading Leave Requests</p>
                <p className="mt-2">{error}</p>
                <button 
                    onClick={() => fetchLeaves()}
                    className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-red-800"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="text-black p-6 min-h-screen bg-gray-50">
            {/* Header with Toggle Switch */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`relative px-4 py-2 text-lg font-medium transition-all duration-200 ${
                            activeTab === 'management'
                                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Leave Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`relative px-4 py-2 text-lg font-medium transition-all duration-200 ${
                            activeTab === 'logs'
                                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Leave Logs
                    </button>
                </div>
                <button
                    onClick={() => {
                        if (activeTab === 'logs') {
                            console.log("Downloading Leave Logs...");
                        } else {
                            console.log("Downloading Leave Requests...");
                        }
                        handleDownloadPDF(); // download function
                    }}
                    className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <Download size={18} />
                    Download
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-[75vh] flex flex-col">
                <div className="flex-1 overflow-auto">
                    {activeTab === 'management' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Faculty
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Request Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Start Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                End Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {leaves.length > 0 ? (
                                            leaves.map((leave) => (
                                                <tr key={leave.LeaveID} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                {leave.Faculty?.UserID && profilePhotos[leave.Faculty.UserID] ? (
                                                                    <Image
                                                                        src={profilePhotos[leave.Faculty.UserID]}
                                                                        alt={leave.Faculty.Name}
                                                                        width={40}
                                                                        height={40}
                                                                        className="rounded-full"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.src = '/manprofileavatar.png';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                        <User className="h-6 w-6 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {leave.Faculty?.Name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {leave.Faculty?.Department}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatRequestType(leave.RequestType, leave.LeaveType)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(leave.StartDate)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(leave.EndDate)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            leave.Status === 'Approved' 
                                                                ? 'bg-green-100 text-green-800'
                                                                : leave.Status === 'Rejected'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {leave.Status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedLeave(leave);
                                                                    setViewModalOpen(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                                                title="View details"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                            </button>
                                                            {leave.Status === 'Pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setStatusUpdateModal({
                                                                            isOpen: true,
                                                                            leaveId: leave.LeaveID,
                                                                            status: 'Approved',
                                                                            facultyName: leave.Faculty?.Name || 'Unknown',
                                                                            leaveType: leave.LeaveType || '',
                                                                            requestType: leave.RequestType
                                                                        })}
                                                                        className="text-green-600 hover:text-green-900 transition-colors"
                                                                        title="Approve leave"
                                                                    >
                                                                        <Check className="h-5 w-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setStatusUpdateModal({
                                                                            isOpen: true,
                                                                            leaveId: leave.LeaveID,
                                                                            status: 'Rejected',
                                                                            facultyName: leave.Faculty?.Name || 'Unknown',
                                                                            leaveType: leave.LeaveType || '',
                                                                            requestType: leave.RequestType
                                                                        })}
                                                                        className="text-red-600 hover:text-red-900 transition-colors"
                                                                        title="Reject leave"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {leave.Status !== 'Pending' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedLeaveId(leave.LeaveID);
                                                                        setShowDeleteModal(true);
                                                                        setDeleteConfirmInput('');
                                                                        setDeleteConfirmError('');
                                                                    }}
                                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                                    title="Delete leave"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="text-center text-gray-400 py-12">
                                                    No leave requests found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Picture</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee Name</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Request Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Start Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">End Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Duration</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date Submitted</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaves.length > 0 ? (
                                    leaves.map((leave) => (
                                        <tr key={leave.LeaveID} className="hover:bg-gray-50 transition-colors duration-200">
                                            <td className="px-4 py-3">
                                                {leave.Faculty?.UserID && profilePhotos[leave.Faculty.UserID] ? (
                                                    <Image
                                                        src={profilePhotos[leave.Faculty.UserID]}
                                                        alt={leave.Faculty.Name}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = '/manprofileavatar.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{leave.Faculty?.Name}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                                                    {formatRequestType(leave.RequestType, leave.LeaveType)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(leave.StartDate)}</td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(leave.EndDate)}</td>
                                            <td className="px-4 py-3 text-gray-600">{calculateDuration(leave.StartDate, leave.EndDate)}</td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(leave.CreatedAt)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${
                                                    leave.Status === 'Approved' ? 'bg-green-50 text-green-700' :
                                                    leave.Status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                                    'bg-yellow-50 text-yellow-700'
                                                }`}>
                                                    {leave.Status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center text-gray-400 py-12">
                                            No Leave Logs Found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Delete Leave Request
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            This action cannot be undone. Please type{' '}
                            <span className="font-semibold">
                                {selectedLeaveId && leaves.find(l => l.LeaveID === selectedLeaveId)?.RequestType === 'Undertime'
                                    ? 'Undertime'
                                    : `${leaves.find(l => l.LeaveID === selectedLeaveId)?.LeaveType} Leave`}
                            </span>{' '}
                            to confirm deletion.
                        </p>
                        <div className="mb-4">
                            <input
                                type="text"
                                value={deleteConfirmInput}
                                onChange={(e) => {
                                    setDeleteConfirmInput(e.target.value);
                                    setDeleteConfirmError('');
                                }}
                                placeholder="Type to confirm"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
                            />
                            {deleteConfirmError && (
                                <p className="mt-1 text-sm text-red-600">{deleteConfirmError}</p>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedLeaveId(null);
                                    setDeleteConfirmInput('');
                                    setDeleteConfirmError('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => selectedLeaveId && handleDelete(selectedLeaveId)}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add the StatusUpdateModal */}
            <StatusUpdateModal
                isOpen={statusUpdateModal.isOpen}
                onClose={() => setStatusUpdateModal({ 
                    isOpen: false, 
                    leaveId: null, 
                    status: null, 
                    facultyName: '',
                    leaveType: '',
                    requestType: 'Leave'
                })}
                onConfirm={() => statusUpdateModal.leaveId && statusUpdateModal.status && 
                    handleStatusUpdate(statusUpdateModal.leaveId, statusUpdateModal.status)}
                status={statusUpdateModal.status || 'Approved'}
                facultyName={statusUpdateModal.facultyName}
                leaveType={statusUpdateModal.leaveType}
                requestType={statusUpdateModal.requestType}
            />

            {/* Add the ViewLeaveModal component */}
            <ViewLeaveModal
                isOpen={viewModalOpen}
                onClose={() => {
                    setViewModalOpen(false);
                    setSelectedLeave(null);
                }}
                leave={selectedLeave}
            />
        </div>
    );
};

export default LeaveContent;