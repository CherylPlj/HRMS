import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Download, Calendar, Check, X } from 'lucide-react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Leave, Faculty, User as PrismaUser, Department } from '@/generated/prisma';
import { LeaveType, LeaveStatus } from '@/generated/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabaseClient';

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
};

// Add notification types
type NotificationType = 'success' | 'error';

interface NotificationProps {
    type: NotificationType;
    message: string;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2 ${
            type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
            {type === 'success' ? (
                <Check className="h-5 w-5" />
            ) : (
                <X className="h-5 w-5" />
            )}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
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

// Add this new component before the LeaveContent component
interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  status: LeaveStatus;
  facultyName: string;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ isOpen, onClose, onConfirm, status, facultyName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
        <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Status Update</h2>
        <p className="mb-6 text-gray-700">
          Are you sure you want to {status.toLowerCase()} the leave request for {facultyName}?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className={`${
              status === 'Approved' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white px-4 py-2 rounded`}
          >
            Yes, {status}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
          >
            Cancel
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
    }>({
        isOpen: false,
        leaveId: null,
        status: null,
        facultyName: '',
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [cachedLeaves, setCachedLeaves] = useState<{ [key: string]: TransformedLeave[] }>({});
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

    // Add a function to show notifications
    const showNotification = (type: NotificationType, message: string) => {
        setNotification({ type, message });
    };

    const fetchLeaves = async () => {
        try {
            setError(null);

            // Check cache first
            const cacheKey = `leaves_${page}_${pageSize}`;
            const now = Date.now();
            if (
                cachedLeaves[cacheKey] &&
                now - lastFetchTime < CACHE_DURATION
            ) {
                setLeaves(cachedLeaves[cacheKey]);
                return;
            }

            const { data: { count } } = await supabase
                .from('Leave')
                .select('*', { count: 'exact' });

            setTotalItems(count || 0);

            const { data: leaves, error: leavesError } = await supabase
                .from('Leave')
                .select(`
                    *,
                    Faculty (
                        User (
                            FirstName,
                            LastName,
                            Photo
                        ),
                        Department (
                            DepartmentName
                        )
                    )
                `)
                .order('CreatedAt', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (leavesError) throw new Error(leavesError.message);

            const transformedLeaves = leaves.map(leave => ({
                ...leave,
                Faculty: {
                    Name: `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`,
                    Department: leave.Faculty.Department.DepartmentName,
                    Photo: leave.Faculty.User.Photo
                }
            }));

            setLeaves(transformedLeaves);
            setCachedLeaves({
                ...cachedLeaves,
                [cacheKey]: transformedLeaves
            });
            setLastFetchTime(now);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch leaves');
            showNotification('error', 'Failed to fetch leave requests');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/leaves/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete leave request');
            }

            // Clear cache to force a fresh fetch
            setCachedLeaves({});
            setLastFetchTime(0);
            
            // Fetch fresh data
            await fetchLeaves();
            
            setShowDeleteModal(false);
            setSelectedLeaveId(null);
            showNotification('success', 'Leave request deleted successfully');
        } catch (err) {
            console.error('Error deleting leave:', err);
            showNotification('error', err instanceof Error ? err.message : 'Failed to delete leave request');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, status: LeaveStatus) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/leaves/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to ${status.toLowerCase()} leave request`);
            }

            // Clear cache to force a fresh fetch
            setCachedLeaves({});
            setLastFetchTime(0);
            
            // Fetch fresh data
            await fetchLeaves();
            
            setStatusUpdateModal({ isOpen: false, leaveId: null, status: null, facultyName: '' });
            showNotification('success', `Leave request ${status.toLowerCase()} successfully`);
        } catch (err) {
            console.error('Error updating leave status:', err);
            showNotification('error', err instanceof Error ? err.message : `Failed to ${status.toLowerCase()} leave request`);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString();
    };

    const calculateDuration = (startDate: string | Date, endDate: string | Date) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
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
        new Date(item.StartDate).toLocaleDateString(),
        new Date(item.EndDate).toLocaleDateString(),
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
        new Date(log.StartDate).toLocaleDateString(),
        new Date(log.EndDate).toLocaleDateString(),
        `${calculateDuration(log.StartDate, log.EndDate)}`,
        new Date(log.CreatedAt).toLocaleDateString(),
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

    // Add pagination controls
    const Pagination = () => (
        <div className="flex justify-between items-center mt-4 p-4">
            <div className="flex items-center gap-2">
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border rounded p-1"
                >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                </select>
                <span className="text-sm text-gray-600">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} entries
                </span>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= totalItems}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );

    useEffect(() => {
        if (isUserLoaded && user) {
            fetchLeaves();
        }
    }, [user, isUserLoaded, page, pageSize]);

    if (!isUserLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
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
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
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
                        Leave/Undertime Requests
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
                                                Leave Type
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
                                                        {leave.TimeIn ? 'Undertime' : 'Leave'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {leave.TimeIn ? 'N/A' : leave.LeaveType}
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
                                                            {leave.Status === 'Pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setStatusUpdateModal({
                                                                            isOpen: true,
                                                                            leaveId: leave.LeaveID,
                                                                            status: 'Approved',
                                                                            facultyName: leave.Faculty?.Name || 'Unknown'
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
                                                                            facultyName: leave.Faculty?.Name || 'Unknown'
                                                                        })}
                                                                        className="text-red-600 hover:text-red-900 transition-colors"
                                                                        title="Reject leave"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            { (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedLeaveId(leave.LeaveID);
                                                                        setShowDeleteModal(true);
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
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Leave Type</th>
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
                                                    {leave.TimeIn ? 'Undertime' : 'Leave'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                                                    {leave.TimeIn ? 'N/A' : leave.LeaveType}
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
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete this leave request? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedLeaveId(null);
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
                onClose={() => setStatusUpdateModal({ isOpen: false, leaveId: null, status: null, facultyName: '' })}
                onConfirm={() => statusUpdateModal.leaveId && statusUpdateModal.status && 
                    handleStatusUpdate(statusUpdateModal.leaveId, statusUpdateModal.status)}
                status={statusUpdateModal.status || 'Approved'}
                facultyName={statusUpdateModal.facultyName}
            />

            <Pagination />
        </div>
    );
};

export default LeaveContent;