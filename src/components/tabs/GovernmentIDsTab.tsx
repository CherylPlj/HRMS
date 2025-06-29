import React, { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface GovernmentIDs {
  SSSNumber?: string | null;
  TINNumber?: string | null;
  PhilHealthNumber?: string | null;
  PagIbigNumber?: string | null;
  GSISNumber?: string | null;
  PRCLicenseNumber?: string | null;
  PRCValidity?: string | null;
}

interface GovernmentIDsTabProps {
  employeeId: string;
  governmentIDs: GovernmentIDs | null;
  isEditing: boolean;
  onInputChange: (field: keyof GovernmentIDs, value: string) => void;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const GovernmentIDsTab: React.FC<GovernmentIDsTabProps> = ({ 
  employeeId, 
  governmentIDs, 
  isEditing, 
  onInputChange 
}) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <FaCheck className="w-5 h-5 mr-2" />
            ) : (
              <FaTimes className="w-5 h-5 mr-2" />
            )}
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Government IDs</h3>
      </div>

   {/* Information Note */}
   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Government ID Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Please ensure all government identification numbers are accurate and up-to-date. 
                These are required for employment records and benefits processing.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Government IDs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">SSS Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.SSSNumber || ''}
              onChange={(e) => onInputChange('SSSNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter SSS Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.SSSNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">TIN Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.TINNumber || ''}
              onChange={(e) => onInputChange('TINNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter TIN Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.TINNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">PhilHealth Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PhilHealthNumber || ''}
              onChange={(e) => onInputChange('PhilHealthNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter PhilHealth Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.PhilHealthNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Pag-IBIG Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PagIbigNumber || ''}
              onChange={(e) => onInputChange('PagIbigNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter Pag-IBIG Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.PagIbigNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">GSIS Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.GSISNumber || ''}
              onChange={(e) => onInputChange('GSISNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter GSIS Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.GSISNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">PRC License Number</label>
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PRCLicenseNumber || ''}
              onChange={(e) => onInputChange('PRCLicenseNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder="Enter PRC License Number"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.PRCLicenseNumber || 'N/A'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">PRC Validity</label>
          {isEditing ? (
            <input
              type="date"
              value={governmentIDs?.PRCValidity || ''}
              onChange={(e) => onInputChange('PRCValidity', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.PRCValidity || 'N/A'}</p>
          )}
        </div>
      </div>

   
    </div>
  );
};

export default GovernmentIDsTab; 