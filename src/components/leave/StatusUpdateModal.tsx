import React, { useState, useEffect } from 'react';
import { LeaveStatus } from '@prisma/client';
import type { TransformedLeave } from './types';
import { formatRequestType } from './utils';

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

export default StatusUpdateModal;

