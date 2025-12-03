import React from 'react';
import { DocumentFacultyRow } from './types';

interface StatusUpdateModalProps {
  isOpen: boolean;
  pendingStatusUpdate: {
    docId: number;
    newStatus: string;
    facultyName: string;
    documentType: string;
  } | null;
  newStatus: string;
  documents: DocumentFacultyRow[];
  statusUpdating: number | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onConfirm: () => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  pendingStatusUpdate,
  newStatus,
  documents,
  statusUpdating,
  onClose,
  onStatusChange,
  onConfirm
}) => {
  if (!isOpen || !pendingStatusUpdate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Confirm Status Update</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Update the status of <span className="font-semibold">{pendingStatusUpdate.documentType}</span> for <span className="font-semibold">{pendingStatusUpdate.facultyName}</span>?
          </p>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Current Status: <span className="font-medium text-gray-800">
                {documents.find(d => d.DocumentID === pendingStatusUpdate.docId)?.SubmissionStatus}
              </span>
            </p>
            <label htmlFor="statusSelect" className="block text-sm font-medium text-gray-700 mb-2">
              New Status:
            </label>
            <select
              id="statusSelect"
              value={newStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            >
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-[#800000] rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={statusUpdating === pendingStatusUpdate.docId}
          >
            {statusUpdating === pendingStatusUpdate.docId ? (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </span>
            ) : (
              'Confirm Update'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;

