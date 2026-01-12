import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

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
    <div className="space-y-4 md:space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-3 md:p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center text-sm md:text-base">
            {notification.type === 'success' ? (
              <Check className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            ) : (
              <X className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            )}
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Contact Information</h3>
      </div>

      {/* Contact Information Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
          {isEditing ? (
            <input
              type="email"
              value={contactInfo?.Email || ''}
              onChange={(e) => {
                const value = e.target.value;
                onInputChange('Email', value);
              }}
              className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                (contactInfo?.Email && !validateEmail(contactInfo.Email)) || validationErrors.Email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g. juan.delacruz@example.com"
            />
          ) : (
            <p className="mt-1 text-sm md:text-base text-gray-900 font-medium">{contactInfo?.Email || 'Not Provided'}</p>
          )}
          {(contactInfo?.Email && !validateEmail(contactInfo.Email)) && (
            <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">Invalid email format</p>
          )}
          {validationErrors.Email && (
            <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.Email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number</label>
          {isEditing ? (
            <input
              type="tel"
              value={contactInfo?.Phone || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onInputChange('Phone', value);
              }}
              className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                (contactInfo?.Phone && !validatePhoneNumber(contactInfo.Phone)) || validationErrors.Phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="09XXXXXXXXX"
              maxLength={11}
            />
          ) : (
            <p className="mt-1 text-sm md:text-base text-gray-900 font-medium">{contactInfo?.Phone || 'Not Provided'}</p>
          )}
          {(contactInfo?.Phone && !validatePhoneNumber(contactInfo.Phone)) && (
            <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">Starts with 09, 11 digits</p>
          )}
          {validationErrors.Phone && (
            <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.Phone}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Present Address</label>
              {isEditing ? (
                <textarea
                  value={contactInfo?.PresentAddress || ''}
                  onChange={(e) => onInputChange('PresentAddress', e.target.value)}
                  className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                    (contactInfo?.PresentAddress && !validateAddress(contactInfo.PresentAddress)) || validationErrors.PresentAddress ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Street, Barangay, City, Province"
                  rows={3}
                />
              ) : (
                <p className="mt-1 text-sm md:text-base text-gray-900 font-medium leading-relaxed">{contactInfo?.PresentAddress || 'Not Provided'}</p>
              )}
              {contactInfo?.PresentAddress && !validateAddress(contactInfo.PresentAddress) && (
                <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">Invalid characters in address</p>
              )}
              {validationErrors.PresentAddress && (
                <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.PresentAddress}</p>
              )}
              
              {isEditing && onSameAsPresentAddressChange && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="sameAsPresent"
                    checked={sameAsPresentAddress}
                    onChange={(e) => onSameAsPresentAddressChange(e.target.checked)}
                    className="w-4 h-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                  />
                  <label htmlFor="sameAsPresent" className="text-xs md:text-sm font-medium text-gray-700 cursor-pointer">
                    Permanent address is same as present
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Permanent Address</label>
              {isEditing ? (
                <textarea
                  value={contactInfo?.PermanentAddress || ''}
                  onChange={(e) => onInputChange('PermanentAddress', e.target.value)}
                  disabled={sameAsPresentAddress}
                  className={`w-full p-2 md:p-2.5 rounded-lg border transition-all text-sm md:text-base ${
                    sameAsPresentAddress 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                      : `bg-gray-50 text-gray-900 border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${
                          (contactInfo?.PermanentAddress && !validateAddress(contactInfo.PermanentAddress)) || validationErrors.PermanentAddress ? 'border-red-500' : ''
                        }`
                  }`}
                  placeholder="Street, Barangay, City, Province"
                  rows={3}
                />
              ) : (
                <p className="mt-1 text-sm md:text-base text-gray-900 font-medium leading-relaxed">{contactInfo?.PermanentAddress || 'Not Provided'}</p>
              )}
              {!sameAsPresentAddress && contactInfo?.PermanentAddress && !validateAddress(contactInfo.PermanentAddress) && (
                <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">Invalid characters in address</p>
              )}
              {!sameAsPresentAddress && validationErrors.PermanentAddress && (
                <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.PermanentAddress}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="border-t pt-6">
        <h4 className="text-sm md:text-base font-bold text-gray-900 uppercase tracking-wide mb-4">Emergency Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5 bg-red-50/30 rounded-xl border border-red-100">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Contact Name</label>
            {isEditing ? (
              <input
                type="text"
                value={contactInfo?.EmergencyContactName || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z ]/g, '');
                  onInputChange('EmergencyContactName', value);
                }}
                className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                  (contactInfo?.EmergencyContactName && !validateContactName(contactInfo.EmergencyContactName)) || validationErrors.EmergencyContactName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Name of contact person"
              />
            ) : (
              <p className="mt-1 text-sm md:text-base text-gray-900 font-bold">{contactInfo?.EmergencyContactName || 'Not Provided'}</p>
            )}
            {contactInfo?.EmergencyContactName && !validateContactName(contactInfo.EmergencyContactName) && (
              <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">At least 3 letters required</p>
            )}
            {validationErrors.EmergencyContactName && (
              <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.EmergencyContactName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Contact Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={contactInfo?.EmergencyContactNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onInputChange('EmergencyContactNumber', value);
                }}
                className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                  (contactInfo?.EmergencyContactNumber && !validatePhoneNumber(contactInfo.EmergencyContactNumber)) || validationErrors.EmergencyContactNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="09XXXXXXXXX"
                maxLength={11}
              />
            ) : (
              <p className="mt-1 text-sm md:text-base text-gray-900 font-bold">{contactInfo?.EmergencyContactNumber || 'Not Provided'}</p>
            )}
            {contactInfo?.EmergencyContactNumber && !validatePhoneNumber(contactInfo.EmergencyContactNumber) && (
              <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">Starts with 09, 11 digits</p>
            )}
            {validationErrors.EmergencyContactNumber && (
              <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{validationErrors.EmergencyContactNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Guidelines Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Contact Information Guidelines</h3>
            <ul className="mt-2 text-xs md:text-sm text-blue-700 space-y-1.5 list-disc list-inside">
              <li>Keep your contact details current for official communications.</li>
              <li>Emergency contacts are vital for your safety and well-being.</li>
              <li>Ensure addresses are complete and accurate for records.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoTab; 