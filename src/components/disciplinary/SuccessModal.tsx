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
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Success!',
  message = 'The record has been updated successfully.',
  recordInfo,
}) => {
  if (!isOpen) return null;

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
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-base text-gray-700 mb-4">{message}</p>
            
            {/* Record Information */}
            {recordInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
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

