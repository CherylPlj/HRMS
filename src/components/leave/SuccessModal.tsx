import React from 'react';
import { Check, X } from 'lucide-react';
import { LeaveStatus } from '@prisma/client';

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

export default SuccessModal;

