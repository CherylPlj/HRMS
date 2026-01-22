import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Download, Plus, Pen } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeaveStatus } from '@prisma/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Pagination,
    StatusUpdateModal,
    ViewLeaveModal,
    SuccessModal,
    DeleteLeaveModal,
    LeaveManagementTable,
    LeaveLogsTable,
    LeaveTypeModal,
    LeaveTypeListModal,
    DeleteLeaveTypeModal,
    LeaveTypeSuccessModal,
    LeaveDashboard,
    type TransformedLeave,
    type LeaveTypeItem,
    formatRequestType,
    formatDate,
    calculateDuration
} from './leave';
import ManageLeaveTypes from './ManageLeaveTypes';

const LeaveContent: React.FC = () => {
    const { user, isLoaded: isUserLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get initial tab from URL query parameter, default to 'dashboard'
    const urlTab = searchParams.get('view');
    const validTabs = ['dashboard', 'management', 'logs'];
    const initialTab = urlTab && validTabs.includes(urlTab) ? urlTab as 'dashboard' | 'management' | 'logs' : 'dashboard';
    const [activeTab, setActiveTab] = useState<'dashboard' | 'management' | 'logs'>(initialTab);
    
    // Set initial URL if no view parameter exists
    useEffect(() => {
        const currentView = searchParams.get('view');
        if (!currentView) {
            router.replace(`/dashboard/admin/leave?view=dashboard`, { scroll: false });
        }
    }, [router, searchParams]);
    
    // Sync activeTab with URL parameter changes (e.g., back button)
    useEffect(() => {
        const currentView = searchParams.get('view');
        if (currentView && validTabs.includes(currentView)) {
            setActiveTab(currentView as 'dashboard' | 'management' | 'logs');
        } else if (!currentView) {
            setActiveTab('dashboard');
        }
    }, [searchParams]);
    
    // Handler to change tab and update URL
    const handleTabChange = (tabId: 'dashboard' | 'management' | 'logs') => {
        setActiveTab(tabId);
        router.push(`/dashboard/admin/leave?view=${tabId}`, { scroll: false });
    };
    const [leaves, setLeaves] = useState<TransformedLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLeave, setSelectedLeave] = useState<TransformedLeave | null>(null);
    const fetchLeavesRef = useRef(false);
    
    // Modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
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
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        status: LeaveStatus | null;
        facultyName: string;
    }>({
        isOpen: false,
        status: null,
        facultyName: ''
    });
    
    // Leave Type Management State
    const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
    const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
    const [showLeaveTypeListModal, setShowLeaveTypeListModal] = useState(false);
    const [showLeaveTypeSuccessModal, setShowLeaveTypeSuccessModal] = useState(false);
    const [isDeleteLeaveTypeModalOpen, setIsDeleteLeaveTypeModalOpen] = useState(false);
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveTypeItem | null>(null);
    const [addingLeaveType, setAddingLeaveType] = useState(false);
    const [leaveTypeToDelete, setLeaveTypeToDelete] = useState<LeaveTypeItem | null>(null);
    const [isDeletingLeaveType, setIsDeletingLeaveType] = useState(false);
    const [isLeaveTypeReferenced, setIsLeaveTypeReferenced] = useState(false);
    const [leaveTypeSuccessMessage, setLeaveTypeSuccessMessage] = useState('');
    
    // Pagination state
    const [managementPage, setManagementPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch leaves - non-blocking, loads in background
    const fetchLeaves = useCallback(async () => {
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
            
            // Fetch leaves with limit - get most recent 500 records (configurable)
            const response = await fetch('/api/leaves?limit=500&offset=0', {
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
            
            const responseData = await response.json();
            
            // Handle new paginated response format
            const leavesData = Array.isArray(responseData) ? responseData : responseData.leaves;
            
            if (!Array.isArray(leavesData)) {
                throw new Error('Invalid response format from server');
            }
            
            // Update leaves immediately - UI is already visible
            setLeaves(leavesData);
            setError(null);

        } catch (err) {
            console.error('Error fetching leaves:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leaves');
            // Don't clear leaves on error - keep previous data visible
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

    // Reset page when switching tabs
    useEffect(() => {
        if (activeTab === 'management') {
            setManagementPage(1);
        } else if (activeTab === 'logs') {
            setLogsPage(1);
        }
    }, [activeTab]);

    // Open add leave type modal
    const openAddLeaveTypeModal = () => {
        setEditingLeaveType(null);
        setIsLeaveTypeModalOpen(true);
    };

    // Open edit leave type modal
    const openEditLeaveTypeModal = (leaveType: LeaveTypeItem) => {
        setEditingLeaveType(leaveType);
        setIsLeaveTypeModalOpen(true);
    };

    // Handle add or edit leave type
    const handleAddOrEditLeaveType = async (leaveTypeName: string, numberOfDays: number | null) => {
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
                    LeaveTypeName: leaveTypeName,
                    NumberOfDays: numberOfDays,
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
                setEditingLeaveType(null);
                await fetchLeaveTypes();
            } else {
                const error = await response.text();
                throw new Error(error || 'Failed to save leave type');
            }
        } catch (error) {
            console.error('Error saving leave type:', error);
            alert('An error occurred while saving the leave type');
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
                setIsLeaveTypeReferenced(false);
                await fetchLeaveTypes();
            } else {
                const error = await response.text();
                throw new Error(error || 'Failed to delete leave type');
            }
        } catch (error) {
            console.error('Error deleting leave type:', error);
            alert('An error occurred while deleting the leave type');
        }
    };

    // Handle delete selected leave types
    const handleDeleteSelectedLeaveTypes = async (leaveTypeIds: number[]) => {
        setIsDeletingLeaveType(true);
        try {
            for (const leaveTypeId of leaveTypeIds) {
                const leaveType = leaveTypes.find(lt => lt.LeaveTypeID === leaveTypeId);
                if (leaveType) {
                    await handleDeleteLeaveType(leaveType);
                }
            }
        } catch (error) {
            console.error('Error deleting leave types:', error);
        } finally {
            setIsDeletingLeaveType(false);
        }
    };

    // Check if leave type is referenced
    const checkLeaveTypeReference = async (leaveType: LeaveTypeItem) => {
        setIsDeletingLeaveType(true);
        try {
            const res = await fetch(`/api/leaves?leaveTypeId=${leaveType.LeaveTypeID}`);
            const data = await res.json();
            setIsLeaveTypeReferenced(Array.isArray(data) && data.length > 0);
        } catch (err) {
            setIsLeaveTypeReferenced(false);
        } finally {
            setIsDeletingLeaveType(false);
        }
    };

    const handleDelete = async (leave: TransformedLeave) => {
        try {
            const response = await fetch(`/api/leaves/${leave.LeaveID}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete leave request');
            }

            setLeaves(leaves.filter(l => l.LeaveID !== leave.LeaveID));
            setShowDeleteModal(false);
            setSelectedLeave(null);
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
            
            const facultyName = statusUpdateModal.facultyName;
            setStatusUpdateModal({ isOpen: false, leaveId: null, status: null, facultyName: '', leaveType: '', requestType: 'Leave' });
            
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
            doc.setFontSize(16);
            doc.text('Leave Requests Report (Pending)', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

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
            doc.setFontSize(16);
            doc.text('Leave Logs Report (Approved & Returned)', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

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

    // Show minimal loading only for user authentication, not for data
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

    // Filter leaves based on active tab
    const pendingLeaves = activeTab === 'management' 
        ? leaves.filter(leave => leave.Status === LeaveStatus.Pending)
        : [];
    
    const approvedRejectedLeaves = activeTab === 'logs'
        ? leaves.filter(leave => leave.Status === LeaveStatus.Approved || leave.Status === LeaveStatus.Returned)
        : [];

    // Pagination calculations
    const managementTotalPages = Math.ceil(pendingLeaves.length / itemsPerPage);
    const logsTotalPages = Math.ceil(approvedRejectedLeaves.length / itemsPerPage);
    
    const managementStartIndex = (managementPage - 1) * itemsPerPage;
    const managementEndIndex = managementStartIndex + itemsPerPage;
    const paginatedPendingLeaves = pendingLeaves.slice(managementStartIndex, managementEndIndex);
    
    const logsStartIndex = (logsPage - 1) * itemsPerPage;
    const logsEndIndex = logsStartIndex + itemsPerPage;
    const paginatedApprovedRejectedLeaves = approvedRejectedLeaves.slice(logsStartIndex, logsEndIndex);

    return (
        <div className="text-black p-4 sm:p-6 min-h-screen bg-gray-50">
            {/* Header with Toggle Switch */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="flex space-x-2 sm:space-x-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    <button
                        onClick={() => handleTabChange('dashboard')}
                        className={`relative px-3 sm:px-4 py-2 text-sm sm:text-lg font-medium transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'dashboard'
                                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => handleTabChange('management')}
                        className={`relative px-3 sm:px-4 py-2 text-sm sm:text-lg font-medium transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'management'
                                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Leave Requests
                    </button>
                    <button
                        onClick={() => handleTabChange('logs')}
                        className={`relative px-3 sm:px-4 py-2 text-sm sm:text-lg font-medium transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'logs'
                                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Leave Logs
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                    {activeTab === 'management' && (
                        <div className="flex-1 sm:flex-none">
                            <ManageLeaveTypes
                                leaveTypes={leaveTypes}
                                onUpdate={fetchLeaveTypes}
                            />
                        </div>
                    )}
                    {activeTab !== 'dashboard' && (
                        <button
                            onClick={handleDownloadPDF}
                            className="bg-[#800000] hover:bg-red-800 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base flex-1 sm:flex-none whitespace-nowrap"
                        >
                            <Download size={18} />
                            <span>Download</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner - Non-blocking */}
            {error && (
                <div className="mb-4 text-center p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    <p className="font-semibold">Error Loading Leave Requests</p>
                    <p className="mt-2 text-sm">{error}</p>
                    <button 
                        onClick={() => fetchLeaves()}
                        className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-red-800 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                {activeTab === 'dashboard' ? (
                    <LeaveDashboard leaves={leaves} isLoading={loading} />
                ) : activeTab === 'management' ? (
                    <>
                        <LeaveManagementTable
                            leaves={paginatedPendingLeaves}
                            isLoading={loading}
                            onView={(leave) => {
                                setSelectedLeave(leave);
                                setViewModalOpen(true);
                            }}
                            onApprove={(leave) => setStatusUpdateModal({
                                isOpen: true,
                                leaveId: leave.LeaveID,
                                status: LeaveStatus.Approved,
                                facultyName: leave.Faculty?.Name || 'Unknown',
                                leaveType: leave.LeaveType || '',
                                requestType: leave.RequestType
                            })}
                            onReturn={(leave) => setStatusUpdateModal({
                                isOpen: true,
                                leaveId: leave.LeaveID,
                                status: LeaveStatus.Returned,
                                facultyName: leave.Faculty?.Name || 'Unknown',
                                leaveType: leave.LeaveType || '',
                                requestType: leave.RequestType
                            })}
                            onDelete={(leave) => {
                                setSelectedLeave(leave);
                                setShowDeleteModal(true);
                            }}
                        />
                        {/* Pagination */}
                        {!loading && pendingLeaves.length > itemsPerPage && (
                            <Pagination
                                currentPage={managementPage}
                                totalPages={managementTotalPages}
                                totalItems={pendingLeaves.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setManagementPage}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <LeaveLogsTable
                            leaves={paginatedApprovedRejectedLeaves}
                            isLoading={loading}
                            onView={(leave) => {
                                setSelectedLeave(leave);
                                setViewModalOpen(true);
                            }}
                        />
                        {/* Pagination */}
                        {!loading && approvedRejectedLeaves.length > itemsPerPage && (
                            <Pagination
                                currentPage={logsPage}
                                totalPages={logsTotalPages}
                                totalItems={approvedRejectedLeaves.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setLogsPage}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Delete Leave Modal */}
            <DeleteLeaveModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedLeave(null);
                }}
                onConfirm={() => selectedLeave && handleDelete(selectedLeave)}
                leave={selectedLeave}
            />

            {/* Status Update Modal */}
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
                status={statusUpdateModal.status || LeaveStatus.Approved}
                facultyName={statusUpdateModal.facultyName}
                leaveType={statusUpdateModal.leaveType}
                requestType={statusUpdateModal.requestType}
            />

            {/* View Leave Modal */}
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
                status={successModal.status || LeaveStatus.Approved}
                facultyName={successModal.facultyName}
            />

            {/* Leave Type Modal */}
            <LeaveTypeModal
                isOpen={isLeaveTypeModalOpen}
                onClose={() => {
                    setIsLeaveTypeModalOpen(false);
                    setEditingLeaveType(null);
                }}
                onSubmit={handleAddOrEditLeaveType}
                editingLeaveType={editingLeaveType}
                leaveTypes={leaveTypes}
                isSubmitting={addingLeaveType}
            />

            {/* Leave Type List Modal */}
            <LeaveTypeListModal
                isOpen={showLeaveTypeListModal}
                onClose={() => setShowLeaveTypeListModal(false)}
                leaveTypes={leaveTypes}
                onEdit={(leaveType) => {
                    setShowLeaveTypeListModal(false);
                    openEditLeaveTypeModal(leaveType);
                }}
                onDelete={async (leaveType) => {
                    setLeaveTypeToDelete(leaveType);
                    setIsDeleteLeaveTypeModalOpen(true);
                    await checkLeaveTypeReference(leaveType);
                }}
                onDeleteSelected={handleDeleteSelectedLeaveTypes}
                isDeleting={isDeletingLeaveType}
            />

            {/* Delete Leave Type Modal */}
            <DeleteLeaveTypeModal
                isOpen={isDeleteLeaveTypeModalOpen}
                onClose={() => {
                    setIsDeleteLeaveTypeModalOpen(false);
                    setLeaveTypeToDelete(null);
                    setIsLeaveTypeReferenced(false);
                }}
                onConfirm={async () => {
                    if (leaveTypeToDelete) {
                        await handleDeleteLeaveType(leaveTypeToDelete);
                    }
                }}
                leaveType={leaveTypeToDelete}
                isReferenced={isLeaveTypeReferenced}
                isDeleting={isDeletingLeaveType}
            />

            {/* Leave Type Success Modal */}
            <LeaveTypeSuccessModal
                isOpen={showLeaveTypeSuccessModal}
                onClose={() => setShowLeaveTypeSuccessModal(false)}
                message={leaveTypeSuccessMessage}
            />
        </div>
    );
};

export default LeaveContent;
