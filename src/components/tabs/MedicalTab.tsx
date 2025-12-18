import React, { useState, useEffect } from 'react';
import { Pen, Check, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import {
  maskHealthInsuranceNumber,
  maskPwdIdNumber,
  maskPhoneNumber,
  maskSensitiveText,
  maskBloodType,
  canViewUnmaskedMedicalData,
  getUserRole
} from '@/utils/medicalDataMasking';
import { isAdmin } from '@/utils/roleUtils';

interface MedicalInfo {
  id?: number;
  employeeId: string;
  medicalNotes?: string;
  lastCheckup?: Date;
  vaccination?: string;
  allergies?: string;
  bloodType?: string;
  
  // Disability Information
  hasDisability: boolean;
  disabilityType?: string;
  disabilityDetails?: string;
  accommodationsNeeded?: string;
  pwdIdNumber?: string;
  pwdIdValidity?: Date;
  disabilityCertification?: string;
  disabilityPercentage?: number;
  assistiveTechnology?: string;
  mobilityAids?: string;
  communicationNeeds?: string;
  workplaceModifications?: string;
  emergencyProtocol?: string;
  
  // Medical Information
  emergencyProcedures?: string;
  primaryPhysician?: string;
  physicianContact?: string;
  healthInsuranceProvider?: string;
  healthInsuranceNumber?: string;
  healthInsuranceExpiryDate?: Date;
}

interface MedicalTabProps {
  employeeId: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const MedicalTab: React.FC<MedicalTabProps> = ({ employeeId }) => {
  const { user } = useUser();
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<MedicalInfo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canViewUnmasked, setCanViewUnmasked] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showMaskedInfo, setShowMaskedInfo] = useState<{
    medicalNotes: boolean;
    bloodType: boolean;
    allergies: boolean;
    disabilityDetails: boolean;
    pwdIdNumber: boolean;
    physicianContact: boolean;
    healthInsuranceNumber: boolean;
    emergencyProcedures: boolean;
  }>({
    medicalNotes: false,
    bloodType: false,
    allergies: false,
    disabilityDetails: false,
    pwdIdNumber: false,
    physicianContact: false,
    healthInsuranceNumber: false,
    emergencyProcedures: false,
  });
  const [formErrors, setFormErrors] = useState<{
    medicalNotes?: string;
    allergies?: string;
    vaccination?: string;
    primaryPhysician?: string;
    physicianContact?: string;
    healthInsuranceProvider?: string;
    healthInsuranceNumber?: string;
    emergencyProcedures?: string;
  }>({});

  // Check user permissions for viewing unmasked medical data
  useEffect(() => {
    if (user) {
      const userRole = getUserRole(user);
      setCanViewUnmasked(canViewUnmaskedMedicalData(userRole));
      setIsUserAdmin(isAdmin(user));
    }
  }, [user]);

  useEffect(() => {
    fetchMedicalInfo();
  }, [employeeId]);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchMedicalInfo = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/medical`);
      if (response.ok) {
        const data = await response.json();
        // If no medical info exists, data will be an empty object
        setMedicalInfo(Object.keys(data).length === 0 ? null : data);
      } else {
        console.error('Error fetching medical information:', response.status, response.statusText);
        setNotification({
          type: 'error',
          message: 'Failed to fetch medical information'
        });
      }
    } catch (error) {
      console.error('Error fetching medical information:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch medical information'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;
    // Build a record copy
    const record: typeof currentRecord = {
      ...currentRecord,
      emergencyProcedures: currentRecord.emergencyProcedures ? currentRecord.emergencyProcedures.trim() : ''
    };

    // Validate fields
    const errors: typeof formErrors = {};

    // Medical notes: limit length to 2000 chars
    if (record.medicalNotes && record.medicalNotes.length > 2000) {
      errors.medicalNotes = 'Medical notes must be less than 2000 characters.';
    }

    // Medical notes: allow only letters, numbers and spaces
    if (record.medicalNotes && !/^[A-Za-z0-9\s]*$/.test(record.medicalNotes)) {
      errors.medicalNotes = 'Medical notes may only contain letters, numbers and spaces.';
    }

    // Allergies & vaccination: limit length
    if (record.allergies && record.allergies.length > 1000) {
      errors.allergies = 'Allergies text is too long.';
    }
    // Allergies: only letters and spaces
    if (currentRecord.allergies && !/^[A-Za-z\s]*$/.test(currentRecord.allergies)) {
      errors.allergies = 'Allergies may only contain letters and spaces.';
    }
    if (record.vaccination && record.vaccination.length > 1000) {
      errors.vaccination = 'Vaccination information is too long.';
    }
    // Vaccination: allow letters, numbers and spaces
    if (currentRecord.vaccination && !/^[A-Za-z0-9\s]*$/.test(currentRecord.vaccination)) {
      errors.vaccination = 'Vaccination may only contain letters, numbers and spaces.';
    }

    // Primary physician: require letters and common punctuation, max length
    if (record.primaryPhysician && record.primaryPhysician.length > 200) {
      errors.primaryPhysician = 'Primary physician name is too long.';
    }
    // Primary physician: allow only letters, spaces and periods
    if (record.primaryPhysician && !/^[A-Za-z.\s]*$/.test(record.primaryPhysician)) {
      errors.primaryPhysician = 'Primary physician may only contain letters, spaces and periods.';
    }

    // Physician contact: digits only, 7-15 digits
    if (record.physicianContact) {
      const digits = (record.physicianContact || '').replace(/\D/g, '');
      if (!/^\d{7,15}$/.test(digits)) {
        errors.physicianContact = 'Enter a valid physician contact number (7-15 digits).';
      }
    }

    // Health insurance provider and number: basic checks
    if (record.healthInsuranceProvider && record.healthInsuranceProvider.length > 200) {
      errors.healthInsuranceProvider = 'Provider name is too long.';
    }
    // Health insurance provider: only letters and spaces
    if (record.healthInsuranceProvider && !/^[A-Za-z\s]*$/.test(record.healthInsuranceProvider)) {
      errors.healthInsuranceProvider = 'Health insurance provider may only contain letters and spaces.';
    }
    if (record.healthInsuranceNumber) {
      const val = String(record.healthInsuranceNumber);
      if (val.length > 100) {
        errors.healthInsuranceNumber = 'Insurance number is too long.';
      } else if (!/^[A-Za-z0-9]+$/.test(val)) {
        errors.healthInsuranceNumber = 'Insurance number must contain only letters and numbers.';
      }
    }

    // Emergency procedures: limit length and allow printable characters only
    if (record.emergencyProcedures && record.emergencyProcedures.length > 2000) {
      errors.emergencyProcedures = 'Emergency procedures text is too long.';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotification({ type: 'error', message: 'Please fix the highlighted errors.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Medical information is stored as a single record per employee, so always use PUT
      const url = `/api/employees/${employeeId}/medical`;
      const method = 'PUT'; // Always use PUT since we're updating the single medical record

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      if (response.ok) {
        await fetchMedicalInfo();
        setShowForm(false);
        setCurrentRecord(null);
        setNotification({
          type: 'success',
          message: 'Medical information updated successfully!'
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setNotification({
          type: 'error',
          message: errorData.error || 'Failed to update medical information'
        });
      }
    } catch (error) {
      console.error('Error saving medical information:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while saving medical information'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Medical Information</h3>
        {!isUserAdmin && (
          <button
            onClick={() => {
              setCurrentRecord({
                id: medicalInfo?.id || 0,
                employeeId,
                hasDisability: medicalInfo?.hasDisability || false,
                medicalNotes: medicalInfo?.medicalNotes || '',
                lastCheckup: medicalInfo?.lastCheckup ? new Date(medicalInfo.lastCheckup) : undefined,
                bloodType: medicalInfo?.bloodType || '',
                disabilityType: medicalInfo?.disabilityType || '',
                disabilityDetails: medicalInfo?.disabilityDetails || '',
                pwdIdNumber: medicalInfo?.pwdIdNumber || '',
                pwdIdValidity: medicalInfo?.pwdIdValidity ? new Date(medicalInfo.pwdIdValidity) : undefined,
                disabilityCertification: medicalInfo?.disabilityCertification || '',
                disabilityPercentage: medicalInfo?.disabilityPercentage || undefined,
                assistiveTechnology: medicalInfo?.assistiveTechnology || '',
                mobilityAids: medicalInfo?.mobilityAids || '',
                communicationNeeds: medicalInfo?.communicationNeeds || '',
                workplaceModifications: medicalInfo?.workplaceModifications || '',
                emergencyProtocol: medicalInfo?.emergencyProtocol || '',
                accommodationsNeeded: medicalInfo?.accommodationsNeeded || '',
                primaryPhysician: medicalInfo?.primaryPhysician || '',
                physicianContact: medicalInfo?.physicianContact || '',
                healthInsuranceProvider: medicalInfo?.healthInsuranceProvider || '',
                healthInsuranceNumber: medicalInfo?.healthInsuranceNumber || '',
                healthInsuranceExpiryDate: medicalInfo?.healthInsuranceExpiryDate ? new Date(medicalInfo.healthInsuranceExpiryDate) : undefined,
                emergencyProcedures: medicalInfo?.emergencyProcedures || '',
                allergies: medicalInfo?.allergies || '',
                vaccination: medicalInfo?.vaccination || '',
              });
              setShowForm(true);
            }}
            className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <Pen size={16} /> Edit Medical Info
          </button>
        )}
      </div>

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

      {/* Display Medical Information */}
      {!showForm && medicalInfo && (
        <div className="space-y-8">
          {/* Basic Medical Information */}
          <div>
            <h4 className="font-medium mb-4 text-lg">Basic Medical Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Notes</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskSensitiveText(medicalInfo.medicalNotes, canViewUnmasked || showMaskedInfo.medicalNotes)}
                  </p>
                  {!canViewUnmasked && medicalInfo.medicalNotes && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, medicalNotes: !showMaskedInfo.medicalNotes })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.medicalNotes ? 'Hide medical notes' : 'Show medical notes'}
                      title={showMaskedInfo.medicalNotes ? 'Hide medical notes' : 'Show medical notes'}
                    >
                      {showMaskedInfo.medicalNotes ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Checkup</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.lastCheckup ? new Date(medicalInfo.lastCheckup).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskBloodType(medicalInfo.bloodType, canViewUnmasked || showMaskedInfo.bloodType)}
                  </p>
                  {!canViewUnmasked && medicalInfo.bloodType && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, bloodType: !showMaskedInfo.bloodType })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.bloodType ? 'Hide blood type' : 'Show blood type'}
                      title={showMaskedInfo.bloodType ? 'Hide blood type' : 'Show blood type'}
                    >
                      {showMaskedInfo.bloodType ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskSensitiveText(medicalInfo.allergies, canViewUnmasked || showMaskedInfo.allergies)}
                  </p>
                  {!canViewUnmasked && medicalInfo.allergies && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, allergies: !showMaskedInfo.allergies })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.allergies ? 'Hide allergies' : 'Show allergies'}
                      title={showMaskedInfo.allergies ? 'Hide allergies' : 'Show allergies'}
                    >
                      {showMaskedInfo.allergies ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vaccination</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.vaccination || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Disability Information */}
          <div>
            <h4 className="font-medium mb-4 text-lg">Disability Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Has Disability</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.hasDisability ? 'Yes' : 'No'}</p>
              </div>
              {medicalInfo.hasDisability && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disability Type</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.disabilityType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disability Details</label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm text-gray-900">
                        {maskSensitiveText(medicalInfo.disabilityDetails, canViewUnmasked || showMaskedInfo.disabilityDetails)}
                      </p>
                      {!canViewUnmasked && medicalInfo.disabilityDetails && (
                        <button
                          type="button"
                          onClick={() => setShowMaskedInfo({ ...showMaskedInfo, disabilityDetails: !showMaskedInfo.disabilityDetails })}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                          aria-label={showMaskedInfo.disabilityDetails ? 'Hide disability details' : 'Show disability details'}
                          title={showMaskedInfo.disabilityDetails ? 'Hide disability details' : 'Show disability details'}
                        >
                          {showMaskedInfo.disabilityDetails ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PWD ID Number</label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm text-gray-900">
                        {maskPwdIdNumber(medicalInfo.pwdIdNumber, canViewUnmasked || showMaskedInfo.pwdIdNumber)}
                      </p>
                      {!canViewUnmasked && medicalInfo.pwdIdNumber && (
                        <button
                          type="button"
                          onClick={() => setShowMaskedInfo({ ...showMaskedInfo, pwdIdNumber: !showMaskedInfo.pwdIdNumber })}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                          aria-label={showMaskedInfo.pwdIdNumber ? 'Hide PWD ID number' : 'Show PWD ID number'}
                          title={showMaskedInfo.pwdIdNumber ? 'Hide PWD ID number' : 'Show PWD ID number'}
                        >
                          {showMaskedInfo.pwdIdNumber ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PWD ID Validity</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {medicalInfo.pwdIdValidity ? new Date(medicalInfo.pwdIdValidity).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disability Certification</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.disabilityCertification || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disability Percentage</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.disabilityPercentage ? `${medicalInfo.disabilityPercentage}%` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assistive Technology</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.assistiveTechnology || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobility Aids</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.mobilityAids || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Communication Needs</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.communicationNeeds || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Workplace Modifications</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.workplaceModifications || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Protocol</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.emergencyProtocol || 'N/A'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Healthcare Information */}
          <div>
            <h4 className="font-medium mb-4 text-lg">Healthcare Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Physician</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.primaryPhysician || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Physician Contact</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskPhoneNumber(medicalInfo.physicianContact, canViewUnmasked || showMaskedInfo.physicianContact)}
                  </p>
                  {!canViewUnmasked && medicalInfo.physicianContact && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, physicianContact: !showMaskedInfo.physicianContact })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.physicianContact ? 'Hide physician contact' : 'Show physician contact'}
                      title={showMaskedInfo.physicianContact ? 'Hide physician contact' : 'Show physician contact'}
                    >
                      {showMaskedInfo.physicianContact ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Provider</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.healthInsuranceProvider || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Number</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskHealthInsuranceNumber(medicalInfo.healthInsuranceNumber, canViewUnmasked || showMaskedInfo.healthInsuranceNumber)}
                  </p>
                  {!canViewUnmasked && medicalInfo.healthInsuranceNumber && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, healthInsuranceNumber: !showMaskedInfo.healthInsuranceNumber })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.healthInsuranceNumber ? 'Hide health insurance number' : 'Show health insurance number'}
                      title={showMaskedInfo.healthInsuranceNumber ? 'Hide health insurance number' : 'Show health insurance number'}
                    >
                      {showMaskedInfo.healthInsuranceNumber ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Expiry Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {medicalInfo.healthInsuranceExpiryDate ? new Date(medicalInfo.healthInsuranceExpiryDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Procedures</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-900">
                    {maskSensitiveText(medicalInfo.emergencyProcedures, canViewUnmasked || showMaskedInfo.emergencyProcedures)}
                  </p>
                  {!canViewUnmasked && medicalInfo.emergencyProcedures && (
                    <button
                      type="button"
                      onClick={() => setShowMaskedInfo({ ...showMaskedInfo, emergencyProcedures: !showMaskedInfo.emergencyProcedures })}
                      className="text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded p-1 transition-colors"
                      aria-label={showMaskedInfo.emergencyProcedures ? 'Hide emergency procedures' : 'Show emergency procedures'}
                      title={showMaskedInfo.emergencyProcedures ? 'Hide emergency procedures' : 'Show emergency procedures'}
                    >
                      {showMaskedInfo.emergencyProcedures ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Edit Medical Information
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Medical Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Basic Medical Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Medical Notes</label>
                      <textarea
                        value={currentRecord.medicalNotes || ''}
                        placeholder="Add medical notes here..."
                        onChange={(e) => {
                            // Allow letters, numbers and spaces only
                            const cleaned = e.target.value.replace(/[^A-Za-z0-9\s]/g, '').slice(0, 2000);
                            setCurrentRecord({ ...currentRecord, medicalNotes: cleaned });
                            if (formErrors.medicalNotes) setFormErrors({ ...formErrors, medicalNotes: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
                        {formErrors.medicalNotes && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.medicalNotes}</p>
                        )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Checkup</label>
                      <input
                        type="date"
                        value={currentRecord.lastCheckup ? new Date(currentRecord.lastCheckup).toISOString().split('T')[0] : ''}
                        onChange={(e) =>
                          setCurrentRecord({
                            ...currentRecord,
                            lastCheckup: e.target.value ? new Date(e.target.value) : undefined
                          })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                      <select
                        value={currentRecord.bloodType || ''}
                        onChange={(e) => setCurrentRecord({ ...currentRecord, bloodType: e.target.value || undefined })}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      >
                        <option value="">Select blood type...</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Allergies</label>
                      <textarea
                        value={currentRecord.allergies || ''}
                        placeholder="N/A"
                        onChange={(e) => {
                          // Allow letters and spaces only
                          const cleaned = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 1000);
                          setCurrentRecord({ ...currentRecord, allergies: cleaned });
                          if (formErrors.allergies) setFormErrors({ ...formErrors, allergies: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
                      {formErrors.allergies && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.allergies}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vaccination</label>
                      <textarea
                        value={currentRecord.vaccination || ''}
                        placeholder="N/A"
                        onChange={(e) => {
                          // Allow letters, numbers and spaces only
                          const cleaned = e.target.value.replace(/[^A-Za-z0-9\s]/g, '').slice(0, 1000);
                          setCurrentRecord({ ...currentRecord, vaccination: cleaned });
                          if (formErrors.vaccination) setFormErrors({ ...formErrors, vaccination: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
                      {formErrors.vaccination && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.vaccination}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Disability Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Disability Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentRecord.hasDisability}
                          onChange={(e) =>
                            setCurrentRecord({ ...currentRecord, hasDisability: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2">Has Disability</span>
                      </label>
                    </div>
                    {currentRecord.hasDisability && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Disability Type</label>
                          <input
                            type="text"
                              value={currentRecord.disabilityType || ''}
                              placeholder="N/A"
                              onChange={(e) =>
                                setCurrentRecord({ ...currentRecord, disabilityType: e.target.value })
                              }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Disability Details</label>
                            <textarea
                              value={currentRecord.disabilityDetails || ''}
                              placeholder="N/A"
                              onChange={(e) =>
                                setCurrentRecord({ ...currentRecord, disabilityDetails: e.target.value })
                              }
                              className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                              rows={3}
                            />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">PWD ID Number</label>
                          <input
                            type="text"
                              value={currentRecord.pwdIdNumber || ''}
                              placeholder="N/A"
                              onChange={(e) =>
                                setCurrentRecord({ ...currentRecord, pwdIdNumber: e.target.value })
                              }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">PWD ID Validity</label>
                          <input
                            type="date"
                            value={currentRecord.pwdIdValidity ? new Date(currentRecord.pwdIdValidity).toISOString().split('T')[0] : ''}
                            onChange={(e) =>
                              setCurrentRecord({
                                ...currentRecord,
                                pwdIdValidity: e.target.value ? new Date(e.target.value) : undefined
                              })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Disability Certification</label>
                          <input
                            type="text"
                            value={currentRecord.disabilityCertification || ''}
                            placeholder="N/A"
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, disabilityCertification: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Disability Percentage</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentRecord.disabilityPercentage || ''}
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, disabilityPercentage: parseInt(e.target.value) || undefined })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assistive Technology</label>
                          <input
                            type="text"
                            value={currentRecord.assistiveTechnology || ''}
                            placeholder="N/A"
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, assistiveTechnology: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobility Aids</label>
                          <input
                            type="text"
                            value={currentRecord.mobilityAids || ''}
                            placeholder="N/A"
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, mobilityAids: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Communication Needs</label>
                          <input
                            type="text"
                            value={currentRecord.communicationNeeds || ''}
                            placeholder="N/A"
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, communicationNeeds: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Workplace Modifications</label>
                          <textarea
                            value={currentRecord.workplaceModifications || ''}
                            placeholder="N/A"
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, workplaceModifications: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Emergency Protocol</label>
                          <textarea
                            value={currentRecord.emergencyProtocol || ''}
                            placeholder=""
                            onChange={(e) =>
                              setCurrentRecord({ ...currentRecord, emergencyProtocol: e.target.value })
                            }
                            className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Healthcare Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Healthcare Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Physician</label>
                      <input
                        type="text"
                        value={currentRecord.primaryPhysician || ''}
                        onChange={(e) => {
                          // Allow letters, spaces and periods
                          const cleaned = e.target.value.replace(/[^A-Za-z.\s]/g, '').slice(0, 200);
                          setCurrentRecord({ ...currentRecord, primaryPhysician: cleaned });
                          if (formErrors.primaryPhysician) setFormErrors({ ...formErrors, primaryPhysician: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                      {formErrors.primaryPhysician && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.primaryPhysician}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Physician Contact</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="Add contact number"
                        value={currentRecord.physicianContact || ''}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
                          setCurrentRecord({ ...currentRecord, physicianContact: digitsOnly });
                          if (formErrors.physicianContact) setFormErrors({ ...formErrors, physicianContact: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                      {formErrors.physicianContact && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.physicianContact}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Provider</label>
                      <input
                        type="text"
                        value={currentRecord.healthInsuranceProvider || ''}
                        onChange={(e) => {
                          // Allow letters and spaces only
                          const cleaned = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 200);
                          setCurrentRecord({ ...currentRecord, healthInsuranceProvider: cleaned });
                          if (formErrors.healthInsuranceProvider) setFormErrors({ ...formErrors, healthInsuranceProvider: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                      {formErrors.healthInsuranceProvider && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.healthInsuranceProvider}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Number</label>
                      <input
                        type="text"
                        inputMode="text"
                        placeholder={currentRecord?.healthInsuranceNumber ? 'Add insurance number' : ''}
                        value={currentRecord?.healthInsuranceNumber || ''}
                        onChange={(e) => {
                          const alnum = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 100);
                          setCurrentRecord({ ...currentRecord, healthInsuranceNumber: alnum });
                          if (formErrors.healthInsuranceNumber) setFormErrors({ ...formErrors, healthInsuranceNumber: undefined });
                        }}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                      {formErrors.healthInsuranceNumber && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.healthInsuranceNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={currentRecord?.healthInsuranceExpiryDate ? new Date(currentRecord.healthInsuranceExpiryDate).toISOString().split('T')[0] : ''}
                        placeholder="N/A"
                        onChange={(e) =>
                          setCurrentRecord({
                            ...currentRecord,
                            healthInsuranceExpiryDate: e.target.value ? new Date(e.target.value) : undefined
                          })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Emergency Procedures</label>
                      <textarea
                        value={currentRecord?.emergencyProcedures || ''}
                        placeholder="Add emergency procedures here..."
                        onChange={(e) =>
                          {
                            // Allow printable characters only and trim to 2000 chars
                            const cleaned = e.target.value.replace(/[^\x20-\x7E\n\r\t]/g, '').slice(0, 2000);
                            setCurrentRecord({
                              ...currentRecord,
                              emergencyProcedures: cleaned,
                            });
                            if (formErrors.emergencyProcedures) setFormErrors({ ...formErrors, emergencyProcedures: undefined });
                          }
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentRecord(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalTab;