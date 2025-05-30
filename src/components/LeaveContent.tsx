import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Download } from 'lucide-react';

type Leave = {
    leaveId: number;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    documentUrl?: string;
    createdAt: string;
    updatedAt: string;
    photo?: string;
};

const LeaveContent: React.FC = () => {
    const [isViewingLogs, setIsViewingLogs] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/leaves');
            if (!response.ok) {
                throw new Error('Failed to fetch leaves');
            }
            const data = await response.json();
            console.log('Fetched leaves:', data); // Debug log
            setLeaves(data);
        } catch (err) {
            console.error('Error fetching leaves:', err); // Debug log
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (leave: Leave) => {
        setSelectedLeave(leave);
        setIsModalOpen(true);
    };

    const closeDeleteModal = () => setIsModalOpen(false);

    const deleteLeave = async () => {
        if (!selectedLeave) return;
        
        try {
            const response = await fetch(`/api/leaves/${selectedLeave.leaveId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete leave');
            }
            
            // Refresh the leaves list
            await fetchLeaves();
            setIsModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete leave');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const calculateDuration = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    };

    if (loading) {
        return <div className="text-center p-4">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    return (
        <div className="text-black p-6 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-4">
                    <span
                        onClick={() => setIsViewingLogs(false)}
                        className={`cursor-pointer text-xl font-semibold transition-colors duration-200 ${!isViewingLogs ? 'text-[#800000]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Leave Management
                    </span>
                    <span className="text-gray-400 text-xl">/</span>
                    <span
                        onClick={() => setIsViewingLogs(true)}
                        className={`cursor-pointer text-xl font-semibold transition-colors duration-200 ${isViewingLogs ? 'text-[#800000]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Leave Logs
                    </span>
                </div>
                <button
                    onClick={() => {
                        if (isViewingLogs) {
                            console.log("Downloading Leave Logs...");
                        } else {
                            console.log("Downloading Leave Requests...");
                        }
                    }}
                    className="bg-[#800000] text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-all duration-200 flex items-center shadow-sm hover:shadow-md"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                </button>
            </div>

            {/* Full-screen White Box */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-[75vh] overflow-auto">
                <div>
                    <div className="flex-1 overflow-auto">
                        {isViewingLogs ? (
                            <table className="table-auto w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Picture</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Employee Name</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Leave Type</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Start Date</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">End Date</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Duration</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Date Submitted</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves && leaves.length > 0 ? (
                                        leaves.map((leave) => (
                                            <tr key={leave.leaveId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                                                <td className="p-4">
                                                    <img
                                                        src={leave.photo || "/manprofileavatar.png"}
                                                        alt="Employee"
                                                        className="rounded-full w-10 h-10 object-cover border-2 border-gray-100"
                                                    />
                                                </td>
                                                <td className="p-4 font-medium">{leave.employeeName}</td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                                                        {leave.leaveType}
                                                    </span>
                                                </td>
                                                <td className="p-4">{formatDate(leave.startDate)}</td>
                                                <td className="p-4">{formatDate(leave.endDate)}</td>
                                                <td className="p-4">{calculateDuration(leave.startDate, leave.endDate)}</td>
                                                <td className="p-4">{formatDate(leave.createdAt)}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm ${
                                                        leave.status === 'Approved' ? 'bg-green-50 text-green-700' :
                                                        leave.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                                        'bg-yellow-50 text-yellow-700'
                                                    }`}>
                                                        {leave.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                No Leave Logs Found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="table-auto w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Picture</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Employee Name</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Leave Type</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Start Date</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">End Date</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Duration</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Date Submitted</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves && leaves.length > 0 ? (
                                        leaves.map((leave) => (
                                            <tr key={leave.leaveId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                                                <td className="p-4">
                                                    <img
                                                        src={leave.photo || "/manprofileavatar.png"}
                                                        alt="Employee"
                                                        className="rounded-full w-10 h-10 object-cover border-2 border-gray-100"
                                                    />
                                                </td>
                                                <td className="p-4 font-medium">{leave.employeeName}</td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                                                        {leave.leaveType}
                                                    </span>
                                                </td>
                                                <td className="p-4">{formatDate(leave.startDate)}</td>
                                                <td className="p-4">{formatDate(leave.endDate)}</td>
                                                <td className="p-4">{calculateDuration(leave.startDate, leave.endDate)}</td>
                                                <td className="p-4">{formatDate(leave.createdAt)}</td>
                                                <td className="p-4 space-x-2">
                                                    {leave.status === 'Pending' && (
                                                        <>
                                                            <button className="bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 text-sm transition-colors duration-200 shadow-sm hover:shadow">
                                                                Approve
                                                            </button>
                                                            <button className="bg-[#800000] text-white px-3 py-1.5 rounded-lg hover:bg-red-600 text-sm transition-colors duration-200 shadow-sm hover:shadow">
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {leave.status !== 'Pending' && (
                                                        <span className={`px-3 py-1 rounded-full text-sm ${
                                                            leave.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                        }`}>
                                                            {leave.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 space-x-3">
                                                    <button 
                                                        title="View Fullscreen"
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                                    >
                                                        <ExternalLink className="w-5 h-5 text-gray-600 hover:text-black" />
                                                    </button>
                                                    <button
                                                        title="Delete"
                                                        onClick={() => openDeleteModal(leave)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-200"
                                                    >
                                                        <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-gray-500">
                                                No Leave Requests Found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-600 bg-opacity-50 z-10 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-80 transform transition-all">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Delete Confirmation</h2>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete the leave request for {selectedLeave?.employeeName}?</p>
                        <div className="mt-4 flex justify-between space-x-4">
                            <button
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm hover:shadow flex-1"
                                onClick={deleteLeave}
                            >
                                Confirm
                            </button>
                            <button
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-sm hover:shadow flex-1"
                                onClick={closeDeleteModal}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveContent;