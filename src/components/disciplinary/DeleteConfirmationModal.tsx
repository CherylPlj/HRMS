'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DisciplinaryRecord } from '@/types/disciplinary';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: DisciplinaryRecord | null;
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  isDeleting = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const employeeName = record.employee;
  const isConfirmed = confirmationInput.trim() === employeeName;

  const handleConfirm = () => {
    if (!isConfirmed) {
      setError(`Please type "${employeeName}" to confirm deletion`);
      return;
    }
    onConfirm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationInput(e.target.value);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Delete Disciplinary Record</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ Warning: This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              You are about to permanently delete the disciplinary record for{' '}
              <span className="font-semibold">{employeeName}</span>. This will remove all associated data including evidence files.
            </p>
          </div>

          {/* Case Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Case Number:</p>
            <p className="text-base font-semibold text-[#800000]">{record.caseNo}</p>
            <p className="text-sm text-gray-600 mt-3 mb-1">Employee:</p>
            <p className="text-base font-medium text-gray-900">{employeeName}</p>
            <p className="text-sm text-gray-600 mt-3 mb-1">Violation:</p>
            <p className="text-base text-gray-900">{record.violation}</p>
          </div>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To confirm deletion, type the employee name:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={handleInputChange}
              placeholder={`Type "${employeeName}"`}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              } ${isDeleting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              disabled={isDeleting}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            )}
            {!error && confirmationInput && !isConfirmed && (
              <p className="mt-2 text-sm text-gray-500">
                The name must match exactly: <span className="font-mono font-semibold">{employeeName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className={`px-6 py-2 text-white rounded-lg transition-colors ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </span>
            ) : (
              'Delete Record'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;

