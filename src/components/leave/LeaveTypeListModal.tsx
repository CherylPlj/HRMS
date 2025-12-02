import React, { useState } from 'react';
import { X, Trash2, Pen } from 'lucide-react';
import type { LeaveTypeItem } from './types';

interface LeaveTypeListModalProps {
    isOpen: boolean;
    onClose: () => void;
    leaveTypes: LeaveTypeItem[];
    onEdit: (leaveType: LeaveTypeItem) => void;
    onDelete: (leaveType: LeaveTypeItem) => void;
    onDeleteSelected: (leaveTypeIds: number[]) => Promise<void>;
    isDeleting: boolean;
}

const LeaveTypeListModal: React.FC<LeaveTypeListModalProps> = ({
    isOpen,
    onClose,
    leaveTypes,
    onEdit,
    onDelete,
    onDeleteSelected,
    isDeleting
}) => {
    const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<number[]>([]);
    const [selectAllLeaveTypes, setSelectAllLeaveTypes] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        setSelectAllLeaveTypes(checked);
        if (checked) {
            setSelectedLeaveTypes(leaveTypes.map(lt => lt.LeaveTypeID));
        } else {
            setSelectedLeaveTypes([]);
        }
    };

    const handleToggleSelection = (leaveTypeId: number) => {
        if (selectedLeaveTypes.includes(leaveTypeId)) {
            setSelectedLeaveTypes(selectedLeaveTypes.filter(id => id !== leaveTypeId));
            setSelectAllLeaveTypes(false);
        } else {
            setSelectedLeaveTypes([...selectedLeaveTypes, leaveTypeId]);
        }
    };

    const handleDeleteSelected = async () => {
        if (confirm(`Are you sure you want to delete ${selectedLeaveTypes.length} leave type(s)?`)) {
            await onDeleteSelected(selectedLeaveTypes);
            setSelectedLeaveTypes([]);
            setSelectAllLeaveTypes(false);
        }
    };

    const handleClose = () => {
        setSelectedLeaveTypes([]);
        setSelectAllLeaveTypes(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Manage Leave Types</h2>
                    <button
                        onClick={handleClose}
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
                                onClick={handleDeleteSelected}
                                className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                                disabled={isDeleting}
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
                                        onChange={(e) => handleSelectAll(e.target.checked)}
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
                                                onChange={() => handleToggleSelection(type.LeaveTypeID)}
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
                                                    handleClose();
                                                    onEdit(type);
                                                }}
                                            >
                                                <Pen size={14} />
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900 ml-2"
                                                title="Delete"
                                                onClick={() => onDelete(type)}
                                                disabled={isDeleting}
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
    );
};

export default LeaveTypeListModal;

