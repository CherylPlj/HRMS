'use client';

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  recordInfo?: {
    caseNo?: string;
    employee?: string;
  };
  changes?: Array<{
    field: string;
    oldValue: string | null | undefined;
    newValue: string | null | undefined;
  }>;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Success!',
  message = 'The record has been updated successfully.',
  recordInfo,
  changes = [],
}) => {
  if (!isOpen) return null;

  const formatValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    // Handle special cases
    const fieldMap: Record<string, string> = {
      'caseNo': 'Case Number',
      'employeeId': 'Employee ID',
      'supervisorId': 'Supervisor',
      'dateTime': 'Date & Time',
      'resolutionDate': 'Resolution Date',
      'interviewNotes': 'Interview Notes',
      'hrRemarks': 'HR Remarks',
      'recommendedPenalty': 'Recommended Penalty',
      'offenseCount': 'Offense Count',
    };

    if (fieldMap[field]) {
      return fieldMap[field];
    }

    // Default formatting
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-base text-gray-700 mb-4">{message}</p>
            
            {/* Record Information */}
            {recordInfo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg text-left">
                {recordInfo.caseNo && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Case Number:</p>
                    <p className="text-base font-semibold text-[#800000]">{recordInfo.caseNo}</p>
                  </div>
                )}
                {recordInfo.employee && (
                  <div>
                    <p className="text-sm text-gray-600">Employee:</p>
                    <p className="text-base font-medium text-gray-900">{recordInfo.employee}</p>
                  </div>
                )}
              </div>
            )}

            {/* Changes Section */}
            {changes.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Changes Made:</h4>
                <div className="space-y-2">
                  {changes.map((change, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-gray-700">{formatFieldName(change.field)}:</p>
                      <div className="ml-4 mt-1">
                        <p className="text-gray-600">
                          <span className="text-red-600 line-through mr-2">{formatValue(change.oldValue)}</span>
                          <span className="text-gray-400 mr-2">→</span>
                          <span className="text-green-600 font-medium">{formatValue(change.newValue)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

