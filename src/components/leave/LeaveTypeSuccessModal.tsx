import React from 'react';

interface LeaveTypeSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

const LeaveTypeSuccessModal: React.FC<LeaveTypeSuccessModalProps> = ({
    isOpen,
    onClose,
    message
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 flex flex-col items-center">
                <h2 className="text-2xl font-bold text-green-700 mb-4">Success</h2>
                <p className="text-gray-800 mb-6 text-center">{message}</p>
                <button
                    className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-red-800"
                    onClick={onClose}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default LeaveTypeSuccessModal;

