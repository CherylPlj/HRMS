import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LeaveTypeItem } from './types';

interface LeaveTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (leaveTypeName: string, numberOfDays: number | null) => Promise<void>;
    editingLeaveType: LeaveTypeItem | null;
    leaveTypes: LeaveTypeItem[];
    isSubmitting: boolean;
}

const LeaveTypeModal: React.FC<LeaveTypeModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingLeaveType,
    leaveTypes,
    isSubmitting
}) => {
    const [leaveTypeName, setLeaveTypeName] = useState('');
    const [numberOfDays, setNumberOfDays] = useState<number | ''>('');
    const [leaveTypeError, setLeaveTypeError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (editingLeaveType) {
                setLeaveTypeName(editingLeaveType.LeaveTypeName);
                setNumberOfDays(editingLeaveType.NumberOfDays ?? '');
            } else {
                setLeaveTypeName('');
                setNumberOfDays('');
            }
            setLeaveTypeError(null);
        }
    }, [isOpen, editingLeaveType]);

    const validateLeaveTypeName = (name: string): string | null => {
        if (!name || name.trim().length < 3) {
            return 'Leave type name must be at least 3 characters';
        }
        if (name.length > 50) {
            return 'Leave type name must be less than 50 characters';
        }
        if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
            return 'Leave type name can only contain letters, numbers, and spaces';
        }
        const existing = leaveTypes.find(
            lt => lt.LeaveTypeName.toLowerCase() === name.toLowerCase().trim() && 
            (!editingLeaveType || lt.LeaveTypeID !== editingLeaveType.LeaveTypeID)
        );
        if (existing) {
            return 'Leave type name already exists';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateLeaveTypeName(leaveTypeName);
        if (error) {
            setLeaveTypeError(error);
            return;
        }
        await onSubmit(leaveTypeName.trim(), numberOfDays === '' ? null : Number(numberOfDays));
    };

    const handleClose = () => {
        setLeaveTypeName('');
        setNumberOfDays('');
        setLeaveTypeError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {editingLeaveType ? 'Edit Leave Type' : 'Add New Leave Type'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-700 focus:outline-none"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
                    <div>
                        <label htmlFor="leaveType" className="block text-sm font-semibold text-gray-700 mb-1">
                            Leave Type <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="leaveType"
                            type="text"
                            value={leaveTypeName}
                            onChange={e => {
                                setLeaveTypeName(e.target.value);
                                setLeaveTypeError(validateLeaveTypeName(e.target.value));
                            }}
                            className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${leaveTypeError ? 'border-red-500' : 'border-gray-300'}`}
                            required
                            title="Type a leave type name"
                            placeholder="e.g. Sick, Vacation, Emergency"
                            autoComplete="off"
                            maxLength={50}
                        />
                        {leaveTypeError ? (
                            <div className="text-red-600 text-xs mt-1">{leaveTypeError}</div>
                        ) : (
                            <div className="text-gray-400 text-xs mt-1">Alphanumeric, min 3 chars, unique.</div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="numberOfDays" className="block text-sm font-semibold text-gray-700 mb-1">
                            Number of Days (Allowed Paid Leave)
                        </label>
                        <input
                            id="numberOfDays"
                            type="number"
                            min="0"
                            step="1"
                            value={numberOfDays}
                            onChange={e => {
                                const value = e.target.value;
                                setNumberOfDays(value === '' ? '' : Number(value));
                            }}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base"
                            title="Enter the number of allowed paid leave days for this leave type"
                            placeholder="e.g. 10 (leave empty for unlimited)"
                        />
                        <div className="text-gray-400 text-xs mt-1">
                            Enter the number of allowed paid leave days. Leave empty if unlimited.
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-[#800000] text-white px-4 py-2 rounded-lg hover:bg-red-800 flex items-center gap-2 transition-colors disabled:opacity-50"
                            disabled={!!leaveTypeError || isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            {editingLeaveType ? 'Save Changes' : 'Save Leave Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveTypeModal;

