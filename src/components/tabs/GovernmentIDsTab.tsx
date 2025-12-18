import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { maskGovtId } from '@/lib/formValidation';
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
  // Helper to allow only numbers and dashes, and enforce specific formats
  const formatPatterns: Record<keyof GovernmentIDs, RegExp> = {
    SSSNumber: /^\d{2}-\d{7}-\d{1}$/,
    TINNumber: /^\d{3}-\d{3}-\d{3}$/,
    PhilHealthNumber: /^\d{2}-\d{9}-\d{1}$/,
    PagIbigNumber: /^\d{4}-\d{4}-\d{4}$/,
    GSISNumber: /^\d{11}$/,
    PRCLicenseNumber: /^\d{7}$/,
    PRCValidity: /.*/,
  };

  const placeholders: Record<keyof GovernmentIDs, string> = {
    SSSNumber: 'XX-XXXXXXX-X',
    TINNumber: 'XXX-XXX-XXX',
    PhilHealthNumber: 'XX-XXXXXXXXX-X',
    PagIbigNumber: 'XXXX-XXXX-XXXX',
    GSISNumber: 'XXXXXXXXXXX',
    PRCLicenseNumber: 'XXXXXXX',
    PRCValidity: '',
  };

  const formatIDWithDashes = (field: keyof GovernmentIDs, value: string) => {
    // Remove all non-numeric characters
    let digits = value.replace(/\D/g, '');
    switch (field) {
      case 'SSSNumber':
        // Format: 12-3456789-0
        if (digits.length <= 2) return digits;
        if (digits.length <= 9) return digits.slice(0,2) + '-' + digits.slice(2);
        if (digits.length <= 11) return digits.slice(0,2) + '-' + digits.slice(2,9) + '-' + digits.slice(9);
        return digits.slice(0,2) + '-' + digits.slice(2,9) + '-' + digits.slice(9,10);
      case 'TINNumber':
        // Format: 123-456-789
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return digits.slice(0,3) + '-' + digits.slice(3);
        return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6,9);
      case 'PhilHealthNumber':
        // Format: 12-345678901-2
        if (digits.length <= 2) return digits;
        if (digits.length <= 11) return digits.slice(0,2) + '-' + digits.slice(2);
        if (digits.length <= 12) return digits.slice(0,2) + '-' + digits.slice(2,11) + '-' + digits.slice(11);
        return digits.slice(0,2) + '-' + digits.slice(2,11) + '-' + digits.slice(11,12);
      case 'PagIbigNumber':
        // Format: 1234-5678-9012
        if (digits.length <= 4) return digits;
        if (digits.length <= 8) return digits.slice(0,4) + '-' + digits.slice(4);
        if (digits.length <= 12) return digits.slice(0,4) + '-' + digits.slice(4,8) + '-' + digits.slice(8,12);
        return digits.slice(0,4) + '-' + digits.slice(4,8) + '-' + digits.slice(8,12);
      case 'GSISNumber':
        // Format: 12345678901 (no dashes)
        return digits.slice(0,11);
      case 'PRCLicenseNumber':
        // Format: 1234567 (no dashes)
        return digits.slice(0,7);
      default:
        return value;
    }
  };

  const handleIDInput = (field: keyof GovernmentIDs, value: string) => {
    const formatted = formatIDWithDashes(field, value);
    onInputChange(field, formatted);
  };
  const [notification, setNotification] = useState<Notification | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<keyof GovernmentIDs>>(new Set());
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [revealedIdsVersion, setRevealedIdsVersion] = useState(0);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-hide revealed IDs after 5 seconds
  useEffect(() => {
    // Clear any existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (revealedIds.size > 0) {
      hideTimerRef.current = setTimeout(() => {
        setRevealedIds(new Set());
        setRevealedIdsVersion(prev => prev + 1);
        hideTimerRef.current = null;
      }, 5000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [revealedIds.size, revealedIdsVersion]);

  const toggleReveal = (field: keyof GovernmentIDs) => {
    // Clear existing timer when toggling
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setRevealedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
    // Increment version to trigger useEffect after state update
    setRevealedIdsVersion(v => v + 1);
  };

  const renderLabelWithEye = (field: keyof GovernmentIDs, labelText: string, value: string | null | undefined) => {
    if (!value) {
      return (
        <label className="block text-sm font-medium text-gray-700">
          {labelText}
        </label>
      );
    }

    const isRevealed = revealedIds.has(field);
    
    return (
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <span>{labelText}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleReveal(field);
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          title={isRevealed ? 'Hide ID' : 'Show ID'}
          aria-label={isRevealed ? 'Hide ID' : 'Show ID'}
        >
          {isRevealed ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </label>
    );
  };

  const renderMaskedID = (field: keyof GovernmentIDs, value: string | null | undefined) => {
    if (!value) {
      return (
        <p className="mt-1 text-sm text-gray-900">
          No ID number has been entered yet.
        </p>
      );
    }
    
    const isRevealed = revealedIds.has(field);
    const displayValue = isRevealed ? value : maskGovtId(value);
    
    return (
      <p className="mt-1 text-sm text-gray-900">
        {displayValue}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <X className="w-5 h-5 mr-2" />
            )}
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
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
          {renderLabelWithEye('SSSNumber', 'SSS Number', governmentIDs?.SSSNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.SSSNumber || ''}
              onChange={(e) => handleIDInput('SSSNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.SSSNumber}
              inputMode="numeric"
              pattern="\d{2}-\d{7}-\d{1}"
              maxLength={12}
            />
          ) : (
            renderMaskedID('SSSNumber', governmentIDs?.SSSNumber)
          )}
        </div>

        <div>
          {renderLabelWithEye('TINNumber', 'TIN Number', governmentIDs?.TINNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.TINNumber || ''}
              onChange={(e) => handleIDInput('TINNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.TINNumber}
              inputMode="numeric"
              pattern="\d{3}-\d{3}-\d{3}"
              maxLength={11}
            />
          ) : (
            renderMaskedID('TINNumber', governmentIDs?.TINNumber)
          )}
        </div>

        <div>
          {renderLabelWithEye('PhilHealthNumber', 'PhilHealth Number', governmentIDs?.PhilHealthNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PhilHealthNumber || ''}
              onChange={(e) => handleIDInput('PhilHealthNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.PhilHealthNumber}
              inputMode="numeric"
              pattern="\d{2}-\d{9}-\d{1}"
              maxLength={13}
            />
          ) : (
            renderMaskedID('PhilHealthNumber', governmentIDs?.PhilHealthNumber)
          )}
        </div>

        <div>
          {renderLabelWithEye('PagIbigNumber', 'Pag-IBIG Number', governmentIDs?.PagIbigNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PagIbigNumber || ''}
              onChange={(e) => handleIDInput('PagIbigNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.PagIbigNumber}
              inputMode="numeric"
              pattern="\d{4}-\d{4}-\d{4}"
              maxLength={14}
            />
          ) : (
            renderMaskedID('PagIbigNumber', governmentIDs?.PagIbigNumber)
          )}
        </div>

        <div>
          {renderLabelWithEye('GSISNumber', 'GSIS Number', governmentIDs?.GSISNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.GSISNumber || ''}
              onChange={(e) => handleIDInput('GSISNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.GSISNumber}
              inputMode="numeric"
              pattern="\d{11}"
              maxLength={11}
            />
          ) : (
            renderMaskedID('GSISNumber', governmentIDs?.GSISNumber)
          )}
        </div>

        <div>
          {renderLabelWithEye('PRCLicenseNumber', 'PRC License Number', governmentIDs?.PRCLicenseNumber)}
          {isEditing ? (
            <input
              type="text"
              value={governmentIDs?.PRCLicenseNumber || ''}
              onChange={(e) => handleIDInput('PRCLicenseNumber', e.target.value)}
              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
              placeholder={placeholders.PRCLicenseNumber}
              inputMode="numeric"
              pattern="\d{7}"
              maxLength={7}
            />
          ) : (
            renderMaskedID('PRCLicenseNumber', governmentIDs?.PRCLicenseNumber)
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
            <p className="mt-1 text-sm text-gray-900">{governmentIDs?.PRCValidity || 'No ID number has been entered yet.'}</p>
          )}
        </div>
      </div>

   
    </div>
  );
};

export default GovernmentIDsTab; 