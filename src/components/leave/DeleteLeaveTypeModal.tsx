import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LeaveTypeItem } from './types';

interface DeleteLeaveTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    leaveType: LeaveTypeItem | null;
    isReferenced: boolean;
    isDeleting: boolean;
}

const DeleteLeaveTypeModal: React.FC<DeleteLeaveTypeModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    leaveType,
    isReferenced,
    isDeleting
}) => {
    const [deleteLeaveTypeConfirmation, setDeleteLeaveTypeConfirmation] = useState('');
    const [isDeleteLeaveTypeConfirmed, setIsDeleteLeaveTypeConfirmed] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setDeleteLeaveTypeConfirmation('');
            setIsDeleteLeaveTypeConfirmed(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (leaveType) {
            setIsDeleteLeaveTypeConfirmed(deleteLeaveTypeConfirmation === leaveType.LeaveTypeName);
        }
    }, [deleteLeaveTypeConfirmation, leaveType]);

    if (!isOpen || !leaveType) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Delete Leave Type</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        title="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                        {isReferenced ? (
                            <p className="text-red-800 font-semibold">This leave type cannot be deleted.</p>
                        ) : (
                            <>
                                <p className="text-red-800 mb-2">
                                    This action cannot be undone. This will permanently delete the leave type <span className="font-semibold">{leaveType.LeaveTypeName}</span>.
                                </p>
                                <p className="text-sm text-red-700">
                                    Please type <span className="font-semibold">{leaveType.LeaveTypeName}</span> to confirm.
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        type="text"
                        value={deleteLeaveTypeConfirmation}
                        onChange={e => setDeleteLeaveTypeConfirmation(e.target.value)}
                        placeholder="Type the leave type name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        disabled={isReferenced}
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            await onConfirm();
                        }}
                        className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isDeleteLeaveTypeConfirmed || isDeleting || isReferenced}
                    >
                        {isDeleting ? (
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
    );
};

export default DeleteLeaveTypeModal;

