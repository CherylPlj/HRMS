import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ExternalLink, Trash2, Download, Calendar, Check, X, Eye, Plus, Pen } from 'lucide-react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Leave, Faculty, User as PrismaUser, Department } from '@prisma/client';
import { LeaveType, LeaveStatus } from '@prisma/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LeaveTypeItem {
    LeaveTypeID: number;
    LeaveTypeName: string;
    NumberOfDays?: number | null;
    IsActive?: boolean;
}

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

// Cache for profile photos to avoid repeated API calls
const profilePhotoCache = new Map<string, string>();

const fetchUserProfilePhoto = async (userId: string): Promise<string> => {
    // Check cache first
    if (profilePhotoCache.has(userId)) {
        return profilePhotoCache.get(userId)!;
    }

    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        const imageUrl = data.imageUrl || '/manprofileavatar.png';
        // Cache the result
        profilePhotoCache.set(userId, imageUrl);
        return imageUrl;
    } catch (error) {
        // Cache the default to avoid retrying failed requests
        profilePhotoCache.set(userId, '/manprofileavatar.png');
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
        if (status === LeaveStatus.Returned) {
            const expectedInput = requestType === 'Undertime' ? 'Undertime' : `${leaveType} Leave`;
            if (confirmInput.trim() !== expectedInput) {
                setConfirmError(`Please type "${expectedInput}" to confirm return`);
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
                    Are you sure you want to {status === LeaveStatus.Approved ? 'approve' : 'return'} the leave request for {facultyName}?
                </p>

                {status === LeaveStatus.Returned && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">
                            Please type{' '}
                            <span className="font-semibold">
                                {requestType === 'Undertime' ? 'Undertime' : `${leaveType} Leave`}
                            </span>{' '}
                            to confirm return.
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
                            status === LeaveStatus.Approved 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-red-600 hover:bg-red-700'
                        } text-white px-4 py-2 rounded`}
                    >
                        Yes, {status === LeaveStatus.Approved ? 'Approve' : 'Return'}
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
                            <h3 className="font-semibold text-gray-600">Employee Information</h3>
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
                            leave.Status === LeaveStatus.Approved 
                                ? 'bg-green-100 text-green-800'
                                : leave.Status === LeaveStatus.Returned
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

// Success Modal Component
interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: LeaveStatus;
    facultyName: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, status, facultyName }) => {
    if (!isOpen) return null;

    const isApproved = status === LeaveStatus.Approved;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
                    isApproved ? 'bg-green-100' : 'bg-red-100'
                }`}>
                    {isApproved ? (
                        <Check className="h-8 w-8 text-green-600" />
                    ) : (
                        <X className="h-8 w-8 text-red-600" />
                    )}
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[#800000]">
                    Leave Request {isApproved ? 'Approved' : 'Returned'}
                </h2>
                <p className="mb-4 text-gray-700">
                    The leave request for <span className="font-semibold">{facultyName}</span> has been {isApproved ? 'approved' : 'returned'} successfully.
                </p>
                <p className="mb-6 text-sm text-gray-500">
                    An email notification has been sent to the employee.
                </p>
                <button
                    onClick={onClose}
                    className={`w-full px-4 py-2 rounded text-white font-semibold ${
                        isApproved 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                    } transition-colors`}
                >
                    OK
                </button>
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
    const [photosLoading, setPhotosLoading] = useState(false);
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        status: LeaveStatus | null;
        facultyName: string;
    }>({
        isOpen: false,
        status: null,
        facultyName: ''
    });
    const fetchLeavesRef = useRef(false); // Prevent duplicate calls
    
    // Leave Type Management State
    const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
    const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
    const [showLeaveTypeListModal, setShowLeaveTypeListModal] = useState(false);
    const [showLeaveTypeSuccessModal, setShowLeaveTypeSuccessModal] = useState(false);
    const [isDeleteLeaveTypeModalOpen, setIsDeleteLeaveTypeModalOpen] = useState(false);
    const [leaveTypeName, setLeaveTypeName] = useState('');
    const [numberOfDays, setNumberOfDays] = useState<number | ''>('');
    const [leaveTypeError, setLeaveTypeError] = useState<string | null>(null);
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveTypeItem | null>(null);
    const [addingLeaveType, setAddingLeaveType] = useState(false);
    const [leaveTypeToDelete, setLeaveTypeToDelete] = useState<LeaveTypeItem | null>(null);
    const [deleteLeaveTypeConfirmation, setDeleteLeaveTypeConfirmation] = useState('');
    const [isDeleteLeaveTypeConfirmed, setIsDeleteLeaveTypeConfirmed] = useState(false);
    const [isDeletingLeaveType, setIsDeletingLeaveType] = useState(false);
    const [isLeaveTypeReferenced, setIsLeaveTypeReferenced] = useState(false);
    const [leaveTypeSuccessMessage, setLeaveTypeSuccessMessage] = useState('');
    const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<number[]>([]);
    const [selectAllLeaveTypes, setSelectAllLeaveTypes] = useState(false);

    // Memoize fetchLeaves to prevent unnecessary re-creations
    const fetchLeaves = useCallback(async () => {
        // Prevent duplicate concurrent calls
        if (fetchLeavesRef.current) {
            return;
        }

        try {
            if (!user?.id) {
                return;
            }

            fetchLeavesRef.current = true;
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/leaves', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/sign-in');
                    return;
                }
                
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format from server');
            }
            
            setLeaves(data);
            setError(null);

            // Deduplicate UserIDs to avoid fetching same photo multiple times
            const uniqueUserIds = new Set<string>();
            data.forEach((leave: TransformedLeave) => {
                if (leave.Faculty?.UserID) {
                    uniqueUserIds.add(leave.Faculty.UserID);
                }
            });

            // Fetch photos for users we don't already have (check both state and cache)
            setProfilePhotos(prevPhotos => {
                const userIdsToFetch = Array.from(uniqueUserIds).filter(
                    userId => !prevPhotos[userId] && !profilePhotoCache.has(userId)
                );

                if (userIdsToFetch.length > 0) {
                    setPhotosLoading(true);
                    // Fetch profile photos in parallel for new users
                    Promise.all(
                        userIdsToFetch.map(async (userId) => {
                            try {
                                const photoUrl = await fetchUserProfilePhoto(userId);
                                return [userId, photoUrl] as [string, string];
                            } catch (error) {
                                return [userId, '/manprofileavatar.png'] as [string, string];
                            }
                        })
                    ).then((photoResults) => {
                        const newPhotos = Object.fromEntries(photoResults);
                        setProfilePhotos(prev => ({ ...prev, ...newPhotos }));
                        setPhotosLoading(false);
                    }).catch(() => {
                        setPhotosLoading(false);
                    });
                }

                return prevPhotos; // Return unchanged, async update will happen
            });
        } catch (err) {
            console.error('Error fetching leaves:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leaves');
            setLeaves([]);
        } finally {
            setLoading(false);
            fetchLeavesRef.current = false;
        }
    }, [user?.id, router]);

    useEffect(() => {
        if (!isUserLoaded) {
            return;
        }

        if (!user) {
            router.push('/sign-in');
            return;
        }

        fetchLeaves();
        fetchLeaveTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, isUserLoaded]);

    // Fetch leave types
    const fetchLeaveTypes = useCallback(async () => {
        try {
            const response = await fetch('/api/leave-types', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setLeaveTypes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching leave types:', err);
        }
    }, []);

    // Validate leave type name
    const validateLeaveTypeName = (name: string): string | null => {
        if (!name || name.trim().length < 3) {
            return 'Leave type name must be at least 3 characters';
        }
        if (name.length > 50) {
            return 'Leave type name must be less than 50 characters';
        }
        if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
            return 'Leave type name can only contain letters, numbers, and spaces';
        }
        const existing = leaveTypes.find(
            lt => lt.LeaveTypeName.toLowerCase() === name.toLowerCase().trim() && 
            (!editingLeaveType || lt.LeaveTypeID !== editingLeaveType.LeaveTypeID)
        );
        if (existing) {
            return 'Leave type name already exists';
        }
        return null;
    };

    // Open add leave type modal
    const openAddLeaveTypeModal = () => {
        setEditingLeaveType(null);
        setLeaveTypeName('');
        setNumberOfDays('');
        setLeaveTypeError(null);
        setIsLeaveTypeModalOpen(true);
    };

    // Open edit leave type modal
    const openEditLeaveTypeModal = (leaveType: LeaveTypeItem) => {
        setEditingLeaveType(leaveType);
        setLeaveTypeName(leaveType.LeaveTypeName);
        setNumberOfDays(leaveType.NumberOfDays ?? '');
        setLeaveTypeError(null);
        setIsLeaveTypeModalOpen(true);
    };

    // Handle add or edit leave type
    const handleAddOrEditLeaveType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (leaveTypeError) return;

        setAddingLeaveType(true);
        try {
            const url = editingLeaveType 
                ? `/api/leave-types/${editingLeaveType.LeaveTypeID}`
                : '/api/leave-types';
            
            const method = editingLeaveType ? 'PATCH' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    LeaveTypeName: leaveTypeName.trim(),
                    NumberOfDays: numberOfDays === '' ? null : Number(numberOfDays),
                }),
            });

            if (response.ok) {
                setLeaveTypeSuccessMessage(
                    editingLeaveType 
                        ? 'Leave type updated successfully!' 
                        : 'Leave type added successfully!'
                );
                setShowLeaveTypeSuccessModal(true);
                setIsLeaveTypeModalOpen(false);
                setLeaveTypeName('');
                setNumberOfDays('');
                setLeaveTypeError(null);
                setEditingLeaveType(null);
                await fetchLeaveTypes();
            } else {
                const error = await response.text();
                setLeaveTypeError(error || 'Failed to save leave type');
            }
        } catch (error) {
            setLeaveTypeError('An error occurred while saving the leave type');
        } finally {
            setAddingLeaveType(false);
        }
    };

    // Handle delete leave type
    const handleDeleteLeaveType = async (leaveType: LeaveTypeItem) => {
        try {
            const response = await fetch(`/api/leave-types/${leaveType.LeaveTypeID}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setLeaveTypeSuccessMessage('Leave type deleted successfully!');
                setShowLeaveTypeSuccessModal(true);
                setIsDeleteLeaveTypeModalOpen(false);
                setLeaveTypeToDelete(null);
                setDeleteLeaveTypeConfirmation('');
                setIsDeleteLeaveTypeConfirmed(false);
                await fetchLeaveTypes();
            } else {
                const error = await response.text();
                setLeaveTypeError(error || 'Failed to delete leave type');
            }
        } catch (error) {
            setLeaveTypeError('An error occurred while deleting the leave type');
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

            const statusVerb = status === LeaveStatus.Approved ? 'approve' : 'return';
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || errorData.details || `Failed to ${statusVerb} leave request`);
            }

            setLeaves(leaves.map(leave => 
                leave.LeaveID === id 
                    ? { ...leave, Status: status }
                    : leave
            ));
            
            // Close the confirmation modal
            const facultyName = statusUpdateModal.facultyName;
            setStatusUpdateModal({ isOpen: false, leaveId: null, status: null, facultyName: '', leaveType: '', requestType: 'Leave' });
            
            // Show success modal
            setSuccessModal({
                isOpen: true,
                status: status,
                facultyName: facultyName
            });
        } catch (err) {
            console.error('Error updating leave status:', err);
            const statusVerb = status === LeaveStatus.Approved ? 'approve' : 'return';
            const errorMessage = err instanceof Error ? err.message : `Failed to ${statusVerb} leave request`;
            alert(errorMessage);
        }
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        if (activeTab === 'management') {
            // Title
            doc.setFontSize(16);
            doc.text('Leave Requests Report (Pending)', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

            // Filter to only pending leaves
            const pendingLeaves = leaves.filter(leave => leave.Status === LeaveStatus.Pending);
            const tableData = pendingLeaves.map(item => [
                item.Faculty?.Name || '',
                item.Faculty?.Department || 'N/A',
                item.LeaveType || formatRequestType(item.RequestType, item.LeaveType),
                formatDate(item.StartDate),
                formatDate(item.EndDate),
                item.Status
            ]);

            autoTable(doc, {
                head: [['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Status']],
                body: tableData,
                startY: 30,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [128, 0, 0] }
            });

            doc.save('leave-requests-pending.pdf');

        } else if (activeTab === 'logs') {
            // Title
            doc.setFontSize(16);
            doc.text('Leave Logs Report (Approved & Returned)', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

            // Filter to only approved and returned leaves
            const approvedRejectedLeaves = leaves.filter(
                leave => leave.Status === LeaveStatus.Approved || leave.Status === LeaveStatus.Returned
            );
            const tableData = approvedRejectedLeaves.map(log => [
                `${log.Faculty?.Name}`,
                log.LeaveType || formatRequestType(log.RequestType, log.LeaveType),
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

            doc.save('leave-logs-approved-returned.pdf');
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
        return null;
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

    // Filter leaves based on active tab
    const pendingLeaves = activeTab === 'management' 
        ? leaves.filter(leave => leave.Status === LeaveStatus.Pending)
        : [];
    
    const approvedRejectedLeaves = activeTab === 'logs'
        ? leaves.filter(leave => leave.Status === LeaveStatus.Approved || leave.Status === LeaveStatus.Returned)
        : [];

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
                <div className="flex items-center gap-3">
                    <button
                        onClick={openAddLeaveTypeModal}
                        className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Add New Leave Type"
                    >
                        <Plus size={18} />
                        Add Leave Type
                    </button>
                    <button
                        onClick={() => setShowLeaveTypeListModal(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 border border-gray-300"
                        title="Manage Leave Types"
                    >
                        <Pen size={16} /> / <Trash2 size={16} />
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        <Download size={18} />
                        Download
                    </button>
                </div>
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
                                        {pendingLeaves.length > 0 ? (
                                            pendingLeaves.map((leave) => (
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
                                                            leave.Status === LeaveStatus.Approved 
                                                                ? 'bg-green-100 text-green-800'
                                                                : leave.Status === LeaveStatus.Returned
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {leave.Status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedLeave(leave);
                                                                    setViewModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                                                title="View details"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                            </button>
                                                            {leave.Status === LeaveStatus.Pending && (
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
                                                                        className="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
                                                                        title="Approve leave"
                                                                    >
                                                                        <Check className="h-5 w-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setStatusUpdateModal({
                                                                            isOpen: true,
                                                                            leaveId: leave.LeaveID,
                                                                            status: 'Returned',
                                                                            facultyName: leave.Faculty?.Name || 'Unknown',
                                                                            leaveType: leave.LeaveType || '',
                                                                            requestType: leave.RequestType
                                                                        })}
                                                                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                                                                        title="Return leave"
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
                                                                    className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Employee
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
                                                Duration
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date Submitted
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
                                        {approvedRejectedLeaves.length > 0 ? (
                                            approvedRejectedLeaves.map((leave) => (
                                                    <tr key={leave.LeaveID} className="hover:bg-gray-50 transition-colors duration-200">
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {calculateDuration(leave.StartDate, leave.EndDate)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatDate(leave.CreatedAt)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                leave.Status === LeaveStatus.Approved 
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {leave.Status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedLeave(leave);
                                                                    setViewModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                                                title="View details"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                            </button>
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
                            </div>
                        </div>
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

            {/* Success Modal */}
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ isOpen: false, status: null, facultyName: '' })}
                status={successModal.status || 'Approved'}
                facultyName={successModal.facultyName}
            />

            {/* Add/Edit Leave Type Modal */}
            {isLeaveTypeModalOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">{editingLeaveType ? 'Edit Leave Type' : 'Add New Leave Type'}</h2>
                            <button
                                onClick={() => {
                                    setIsLeaveTypeModalOpen(false);
                                    setLeaveTypeName('');
                                    setNumberOfDays('');
                                    setLeaveTypeError(null);
                                    setEditingLeaveType(null);
                                }}
                                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddOrEditLeaveType} className="px-6 py-6 space-y-6">
                            <div>
                                <label htmlFor="leaveType" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Leave Type <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="leaveType"
                                    type="text"
                                    value={leaveTypeName}
                                    onChange={e => {
                                        setLeaveTypeName(e.target.value);
                                        setLeaveTypeError(validateLeaveTypeName(e.target.value));
                                    }}
                                    className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${leaveTypeError ? 'border-red-500' : 'border-gray-300'}`}
                                    required
                                    title="Type a leave type name"
                                    placeholder="e.g. Sick, Vacation, Emergency"
                                    autoComplete="off"
                                    maxLength={50}
                                />
                                {leaveTypeError ? (
                                    <div className="text-red-600 text-xs mt-1">{leaveTypeError}</div>
                                ) : (
                                    <div className="text-gray-400 text-xs mt-1">Alphanumeric, min 3 chars, unique.</div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="numberOfDays" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Number of Days (Allowed Paid Leave)
                                </label>
                                <input
                                    id="numberOfDays"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={numberOfDays}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setNumberOfDays(value === '' ? '' : Number(value));
                                    }}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base"
                                    title="Enter the number of allowed paid leave days for this leave type"
                                    placeholder="e.g. 10 (leave empty for unlimited)"
                                />
                                <div className="text-gray-400 text-xs mt-1">
                                    Enter the number of allowed paid leave days. Leave empty if unlimited.
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLeaveTypeModalOpen(false);
                                        setLeaveTypeName('');
                                        setNumberOfDays('');
                                        setLeaveTypeError(null);
                                        setEditingLeaveType(null);
                                    }}
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#800000] text-white px-4 py-2 rounded-lg hover:bg-red-800 flex items-center gap-2 transition-colors disabled:opacity-50"
                                    disabled={!!leaveTypeError || addingLeaveType}
                                >
                                    {addingLeaveType ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : null}
                                    {editingLeaveType ? 'Save Changes' : 'Save Leave Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leave Type List Modal */}
            {showLeaveTypeListModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">Manage Leave Types</h2>
                            <button
                                onClick={() => {
                                    setShowLeaveTypeListModal(false);
                                    setSelectedLeaveTypes([]);
                                    setSelectAllLeaveTypes(false);
                                }}
                                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 py-6">
                            {selectedLeaveTypes.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                                    <span className="text-sm text-blue-800">
                                        {selectedLeaveTypes.length} leave type{selectedLeaveTypes.length > 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${selectedLeaveTypes.length} leave type(s)?`)) {
                                                setIsDeletingLeaveType(true);
                                                try {
                                                    for (const leaveTypeId of selectedLeaveTypes) {
                                                        const leaveType = leaveTypes.find(lt => lt.LeaveTypeID === leaveTypeId);
                                                        if (leaveType) {
                                                            await handleDeleteLeaveType(leaveType);
                                                        }
                                                    }
                                                    setSelectedLeaveTypes([]);
                                                    setSelectAllLeaveTypes(false);
                                                } catch (error) {
                                                    console.error('Error deleting leave types:', error);
                                                } finally {
                                                    setIsDeletingLeaveType(false);
                                                }
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                                        disabled={isDeletingLeaveType}
                                    >
                                        <Trash2 size={14} /> Delete Selected
                                    </button>
                                </div>
                            )}
                            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                {leaveTypes.length === 0 ? (
                                    <li className="py-4 text-gray-500 text-center">No leave types found.</li>
                                ) : (
                                    <>
                                        <li className="flex items-center py-2 border-b">
                                            <input
                                                type="checkbox"
                                                checked={selectAllLeaveTypes}
                                                onChange={(e) => {
                                                    setSelectAllLeaveTypes(e.target.checked);
                                                    if (e.target.checked) {
                                                        setSelectedLeaveTypes(leaveTypes.map(lt => lt.LeaveTypeID));
                                                    } else {
                                                        setSelectedLeaveTypes([]);
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-[#800000] focus:ring-[#800000] mr-3"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Select All</span>
                                        </li>
                                        {leaveTypes.map((type) => (
                                            <li key={type.LeaveTypeID} className="flex items-center justify-between py-3">
                                                <div className="flex items-center gap-3 flex-grow">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeaveTypes.includes(type.LeaveTypeID)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedLeaveTypes([...selectedLeaveTypes, type.LeaveTypeID]);
                                                            } else {
                                                                setSelectedLeaveTypes(selectedLeaveTypes.filter(id => id !== type.LeaveTypeID));
                                                                setSelectAllLeaveTypes(false);
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-800">{type.LeaveTypeName}</span>
                                                        {type.NumberOfDays !== null && type.NumberOfDays !== undefined && (
                                                            <span className="text-xs text-gray-500">
                                                                {type.NumberOfDays} day{type.NumberOfDays !== 1 ? 's' : ''} allowed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="flex items-center gap-2">
                                                    <button
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setShowLeaveTypeListModal(false);
                                                            openEditLeaveTypeModal(type);
                                                        }}
                                                    >
                                                        <Pen size={14} />
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900 ml-2"
                                                        title="Delete"
                                                        onClick={async () => {
                                                            setLeaveTypeToDelete(type);
                                                            setIsDeleteLeaveTypeModalOpen(true);
                                                            setDeleteLeaveTypeConfirmation('');
                                                            setIsDeleteLeaveTypeConfirmed(false);
                                                            setIsDeletingLeaveType(true);
                                                            try {
                                                                const res = await fetch(`/api/leaves?leaveTypeId=${type.LeaveTypeID}`);
                                                                const data = await res.json();
                                                                setIsLeaveTypeReferenced(Array.isArray(data) && data.length > 0);
                                                            } catch (err) {
                                                                setIsLeaveTypeReferenced(false);
                                                            } finally {
                                                                setIsDeletingLeaveType(false);
                                                            }
                                                        }}
                                                        disabled={isDeletingLeaveType}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </span>
                                            </li>
                                        ))}
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Type Success Modal */}
            {showLeaveTypeSuccessModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-green-700 mb-4">Success</h2>
                        <p className="text-gray-800 mb-6 text-center">{leaveTypeSuccessMessage}</p>
                        <button
                            className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-red-800"
                            onClick={() => {
                                setShowLeaveTypeSuccessModal(false);
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Leave Type Modal */}
            {isDeleteLeaveTypeModalOpen && leaveTypeToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Delete Leave Type</h2>
                            <button
                                onClick={() => {
                                    setIsDeleteLeaveTypeModalOpen(false);
                                    setLeaveTypeToDelete(null);
                                    setDeleteLeaveTypeConfirmation('');
                                    setIsDeleteLeaveTypeConfirmed(false);
                                    setIsLeaveTypeReferenced(false);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                title="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                {isLeaveTypeReferenced ? (
                                    <p className="text-red-800 font-semibold">This leave type cannot be deleted.</p>
                                ) : (
                                    <>
                                        <p className="text-red-800 mb-2">
                                            This action cannot be undone. This will permanently delete the leave type <span className="font-semibold">{leaveTypeToDelete.LeaveTypeName}</span>.
                                        </p>
                                        <p className="text-sm text-red-700">
                                            Please type <span className="font-semibold">{leaveTypeToDelete.LeaveTypeName}</span> to confirm.
                                        </p>
                                    </>
                                )}
                            </div>
                            <input
                                type="text"
                                value={deleteLeaveTypeConfirmation}
                                onChange={e => {
                                    setDeleteLeaveTypeConfirmation(e.target.value);
                                    setIsDeleteLeaveTypeConfirmed(e.target.value === leaveTypeToDelete.LeaveTypeName);
                                }}
                                placeholder="Type the leave type name"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                disabled={isLeaveTypeReferenced}
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setIsDeleteLeaveTypeModalOpen(false);
                                    setLeaveTypeToDelete(null);
                                    setDeleteLeaveTypeConfirmation('');
                                    setIsDeleteLeaveTypeConfirmed(false);
                                    setIsLeaveTypeReferenced(false);
                                }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeletingLeaveType(true);
                                    await handleDeleteLeaveType(leaveTypeToDelete);
                                    setIsDeletingLeaveType(false);
                                }}
                                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!isDeleteLeaveTypeConfirmed || isDeletingLeaveType || isLeaveTypeReferenced}
                            >
                                {isDeletingLeaveType ? (
                                    <span className="flex items-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Deleting...
                                    </span>
                                ) : (
                                    'Delete Leave Type'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveContent;