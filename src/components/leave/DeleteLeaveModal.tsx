import React, { useState, useEffect } from 'react';
import type { TransformedLeave } from './types';

interface DeleteLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    leave: TransformedLeave | null;
}

const DeleteLeaveModal: React.FC<DeleteLeaveModalProps> = ({ isOpen, onClose, onConfirm, leave }) => {
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [deleteConfirmError, setDeleteConfirmError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setDeleteConfirmInput('');
            setDeleteConfirmError('');
        }
    }, [isOpen]);

    if (!isOpen || !leave) return null;

    const expectedInput = leave.RequestType === 'Undertime' 
        ? 'Undertime' 
        : `${leave.LeaveType} Leave`;

    const handleConfirm = () => {
        if (deleteConfirmInput.trim() !== expectedInput) {
            setDeleteConfirmError(`Please type "${expectedInput}" to confirm deletion`);
            return;
        }
        onConfirm();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Delete Leave Request
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    This action cannot be undone. Please type{' '}
                    <span className="font-semibold">
                        {expectedInput}
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
                            onClose();
                            setDeleteConfirmInput('');
                            setDeleteConfirmError('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteLeaveModal;

