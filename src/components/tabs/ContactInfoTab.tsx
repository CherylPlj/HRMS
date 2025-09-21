import React, { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface ContactInfo {
  Email?: string | null;
  Phone?: string | null;
  PresentAddress?: string | null;
  PermanentAddress?: string | null;
  EmergencyContactName?: string | null;
  EmergencyContactNumber?: string | null;
}

interface ContactInfoTabProps {
  employeeId: string;
  contactInfo: ContactInfo | null;
  isEditing: boolean;
  onInputChange: (field: keyof ContactInfo, value: string) => void;
  validationErrors?: {
    Phone?: string;
    PresentAddress?: string;
    PermanentAddress?: string;
    EmergencyContactName?: string;
    EmergencyContactNumber?: string;
    Email?: string;
  };
  sameAsPresentAddress?: boolean;
  onSameAsPresentAddressChange?: (checked: boolean) => void;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const ContactInfoTab: React.FC<ContactInfoTabProps> = ({ 
  employeeId, 
  contactInfo, 
  isEditing, 
  onInputChange,
  validationErrors = {},
  sameAsPresentAddress = false,
  onSameAsPresentAddressChange
}) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  // Validation functions
  const validateEmail = (email: string) => {
    return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const validatePhoneNumber = (number: string) => {
    return /^09\d{9}$/.test(number);
  };

  const validateAddress = (address: string) => {
    // Trim input and allow . , - # / anywhere
    return /^[a-zA-Z0-9 .,#\-/]+$/.test(address.trim());
  };

  const validateContactName = (name: string) => {
    // Only letters and spaces, at least 3 characters
    return /^[a-zA-Z ]{3,}$/.test(name.trim());
  };

  // Hide error message when input becomes valid
  useEffect(() => {
    if (isEditing) {
      if (contactInfo?.Email && validateEmail(contactInfo.Email)) {
        if (validationErrors.Email) validationErrors.Email = undefined;
      }
      if (contactInfo?.Phone && validatePhoneNumber(contactInfo.Phone)) {
        if (validationErrors.Phone) validationErrors.Phone = undefined;
      }
      if (contactInfo?.PresentAddress && validateAddress(contactInfo.PresentAddress)) {
        if (validationErrors.PresentAddress) validationErrors.PresentAddress = undefined;
      }
      if (contactInfo?.PermanentAddress && validateAddress(contactInfo.PermanentAddress)) {
        if (validationErrors.PermanentAddress) validationErrors.PermanentAddress = undefined;
      }
      if (contactInfo?.EmergencyContactName && validateContactName(contactInfo.EmergencyContactName)) {
        if (validationErrors.EmergencyContactName) validationErrors.EmergencyContactName = undefined;
      }
      if (contactInfo?.EmergencyContactNumber && validatePhoneNumber(contactInfo.EmergencyContactNumber)) {
        if (validationErrors.EmergencyContactNumber) validationErrors.EmergencyContactNumber = undefined;
      }
    }
  }, [contactInfo, isEditing, validationErrors]);

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
        <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
      </div>

      {/* Contact Information Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          {isEditing ? (
            <input
              type="email"
              value={contactInfo?.Email || ''}
              onChange={(e) => {
                const value = e.target.value;
                onInputChange('Email', value);
              }}
              className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.Email && !validateEmail(contactInfo.Email) ? 'border-red-500' : ''}`}
              placeholder="Enter email address"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{contactInfo?.Email || 'N/A'}</p>
          )}
          {contactInfo?.Email && !validateEmail(contactInfo.Email) && (
            <p className="mt-1 text-sm text-red-600">Invalid email format</p>
          )}
          {validationErrors.Email && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.Email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          {isEditing ? (
            <input
              type="tel"
              value={contactInfo?.Phone || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
                onInputChange('Phone', value);
              }}
              className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.Phone && !validatePhoneNumber(contactInfo.Phone) ? 'border-red-500' : ''}`}
              placeholder="09XXXXXXXXX"
              maxLength={11}
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{contactInfo?.Phone || 'N/A'}</p>
          )}
          {contactInfo?.Phone && !validatePhoneNumber(contactInfo.Phone) && (
            <p className="mt-1 text-sm text-red-600">Phone number must be 11 digits, start with 09</p>
          )}
          {validationErrors.Phone && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.Phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Present Address</label>
          {isEditing ? (
            <textarea
              value={contactInfo?.PresentAddress || ''}
              onChange={(e) => {
                const value = e.target.value;
                onInputChange('PresentAddress', value);
              }}
              className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.PresentAddress && !validateAddress(contactInfo.PresentAddress) ? 'border-red-500' : ''}`}
              placeholder="Enter present address"
              rows={3}
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{contactInfo?.PresentAddress || 'N/A'}</p>
          )}
          {contactInfo?.PresentAddress && !validateAddress(contactInfo.PresentAddress) && (
            <p className="mt-1 text-sm text-red-600">Address can only contain letters, numbers, spaces, and . , - # /</p>
          )}
          {validationErrors.PresentAddress && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.PresentAddress}</p>
          )}
          {/* Same as Present Address Checkbox */}
          {isEditing && onSameAsPresentAddressChange && (
            <div className="mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={sameAsPresentAddress}
                  onChange={(e) => onSameAsPresentAddressChange(e.target.checked)}
                  className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                />
                <span className="text-sm text-gray-700">Same as Present Address</span>
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
          {isEditing ? (
            <textarea
              value={contactInfo?.PermanentAddress || ''}
              onChange={(e) => {
                const value = e.target.value;
                onInputChange('PermanentAddress', value);
              }}
              className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.PermanentAddress && !validateAddress(contactInfo.PermanentAddress) ? 'border-red-500' : ''}`}
              placeholder="Enter permanent address"
              rows={3}
              disabled={sameAsPresentAddress}
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">{contactInfo?.PermanentAddress || 'N/A'}</p>
          )}
          {contactInfo?.PermanentAddress && !validateAddress(contactInfo.PermanentAddress) && (
            <p className="mt-1 text-sm text-red-600">Address can only contain letters, numbers, spaces, and . , - # /</p>
          )}
          {validationErrors.PermanentAddress && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.PermanentAddress}</p>
          )}
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Name</label>
            {isEditing ? (
              <input
                type="text"
                value={contactInfo?.EmergencyContactName || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z ]/g, ''); // Only letters and spaces
                  onInputChange('EmergencyContactName', value);
                }}
                className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.EmergencyContactName && !validateContactName(contactInfo.EmergencyContactName) ? 'border-red-500' : ''}`}
                placeholder="Enter emergency contact name"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{contactInfo?.EmergencyContactName || 'N/A'}</p>
            )}
            {contactInfo?.EmergencyContactName && !validateContactName(contactInfo.EmergencyContactName) && (
              <p className="mt-1 text-sm text-red-600">Name must be at least 3 letters and can only contain letters and spaces</p>
            )}
            {validationErrors.EmergencyContactName && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.EmergencyContactName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={contactInfo?.EmergencyContactNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
                  onInputChange('EmergencyContactNumber', value);
                }}
                className={`mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300 ${contactInfo?.EmergencyContactNumber && !validatePhoneNumber(contactInfo.EmergencyContactNumber) ? 'border-red-500' : ''}`}
                placeholder="09XXXXXXXXX"
                maxLength={11}
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{contactInfo?.EmergencyContactNumber || 'N/A'}</p>
            )}
            {contactInfo?.EmergencyContactNumber && !validatePhoneNumber(contactInfo.EmergencyContactNumber) && (
              <p className="mt-1 text-sm text-red-600">Contact number must be 11 digits, start with 09</p>
            )}
            {validationErrors.EmergencyContactNumber && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.EmergencyContactNumber}</p>
            )}
          </div>
        </div>
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
              Contact Information Guidelines
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Please provide accurate and up-to-date contact information</li>
                <li>Emergency contact should be someone who can be reached in case of emergency</li>
                <li>Phone numbers should include country code if applicable</li>
                <li>Addresses should be complete and current</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoTab; 