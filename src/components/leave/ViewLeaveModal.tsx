import React from 'react';
import { X } from 'lucide-react';
import { LeaveStatus } from '@prisma/client';
import type { TransformedLeave } from './types';
import { formatDate, formatTime, calculateDuration, formatRequestType } from './utils';

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

export default ViewLeaveModal;

