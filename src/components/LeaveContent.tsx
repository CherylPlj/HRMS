import React, { useState } from 'react';
import { ExternalLink, Trash2, Download } from 'lucide-react';

const LeaveContent: React.FC = () => {
    const [isViewingLogs, setIsViewingLogs] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<any>(null);

    const toggleView = () => setIsViewingLogs(!isViewingLogs);
    const openDeleteModal = (leave: any) => {
        setSelectedLeave(leave);
        setIsModalOpen(true);
    };
    const closeDeleteModal = () => setIsModalOpen(false);
    const deleteLeave = () => {
        console.log(`Deleting leave for ${selectedLeave?.employeeName}`);
        setIsModalOpen(false);
    };

    return (
        <div className="text-black p-4 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                    <span
                    onClick={() => setIsViewingLogs(false)}
                    className={`cursor-pointer text-xl font-semibold ${!isViewingLogs ? 'text-[#800000]' : 'text-gray-500'}`}
                    >
                    Leave Management
                    </span>
                    <span className="text-gray-400 text-xl">/</span>
                    <span
                    onClick={() => setIsViewingLogs(true)}
                    className={`cursor-pointer text-xl font-semibold ${isViewingLogs ? 'text-[#800000]' : 'text-gray-500'}`}
                    >
                    Leave Logs
                    </span>
                </div>
                {/* Download button (always visible) */}
                    <button
                        onClick={() => {
                        if (isViewingLogs) {
                            console.log("Downloading Leave Logs...");
                            // trigger leave logs download
                        } else {
                            console.log("Downloading Leave Requests...");
                            // trigger leave management data download
                        }
                        }}
                        className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800 transition flex items-center"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </button>
                </div>


            {/* Full-screen Red Box */}
            <div className="bg-white border-2 border-[#800000] p-4 rounded-lg h-[75vh]  overflow-auto">
                <div>
                    {/* Placeholder Table or Content */}
                    <div className="flex-1 overflow-auto">
                        {isViewingLogs ? (
                            <table className="table-auto w-full text-left">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 text-left">Picture</th>
                                        <th className="p-2">Employee Name</th>
                                        <th className="p-2">Leave Type</th>
                                        <th className="p-2">Start Date</th>
                                        <th className="p-2">End Date</th>
                                        <th className="p-2">Duration</th>
                                        <th className="p-2">Date Submitted</th>
                                        <th className="p-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2 text-center">
                                            <img
                                                src="/manprofileavatar.png"
                                                alt="Employee"
                                                className="rounded-full w-10 h-10"
                                            />
                                        </td>
                                        <td className="p-2">John Doe</td>
                                        <td className="p-2">Sick Leave</td>
                                        <td className="p-2">2025-04-20</td>
                                        <td className="p-2">2025-04-22</td>
                                        <td className="p-2">3 days</td>
                                        <td className="p-2">2025-04-18</td>
                                        <td className="p-2">Approved</td>
                                    </tr>
                                    {/* Add more rows as needed */}
                                </tbody>
                            </table>
                        ) : (
                            <table className="table-auto w-full text-left">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 text-left">Picture</th>
                                        <th className="p-2">Employee Name</th>
                                        <th className="p-2">Leave Type</th>
                                        <th className="p-2">Start Date</th>
                                        <th className="p-2">End Date</th>
                                        <th className="p-2">Duration</th>
                                        <th className="p-2">Date Submitted</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2">
                                            <img
                                                src="/manprofileavatar.png"
                                                alt="Employee"
                                                className="rounded-full w-10 h-10"
                                            />
                                        </td>
                                        <td className="p-2">John Doe</td>
                                        <td className="p-2">Sick Leave</td>
                                        <td className="p-2">2025-04-20</td>
                                        <td className="p-2">2025-04-22</td>
                                        <td className="p-2">3 days</td>
                                        <td className="p-2">2025-04-18</td>
                                        <td className="p-2 space-x-2">
                                            <button className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-sm">Approve</button>
                                            <button className="bg-[#800000] text-white px-2 py-1 rounded hover:bg-red-600 text-sm">Reject</button>
                                        </td>
                                        <td className="p-2 space-x-2">
                                            <button title="View Fullscreen">
                                                <ExternalLink className="w-5 h-5 text-gray-600 hover:text-black" />
                                            </button>
                                            <button
                                                title="Delete"
                                                onClick={() => openDeleteModal({ employeeName: 'John Doe' })}
                                            >
                                                <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800" />
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Add more rows as needed */}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-600 bg-opacity-50 z-10">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-80">
                        <h2 className="text-xl font-semibold mb-4">Delete Confirmation</h2>
                        <p>Are you sure you want to delete the leave request for {selectedLeave?.employeeName}?</p>
                        <div className="mt-4 flex justify-between">
                            <button
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                onClick={deleteLeave}
                            >
                                Confirm
                            </button>
                            <button
                                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
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