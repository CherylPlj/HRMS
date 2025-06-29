import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

interface MedicalInfo {
  id?: number;
  employeeId: string;
  medicalNotes?: string;
  lastCheckup?: Date;
  vaccination?: string;
  allergies?: string;
  
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
  bloodPressure?: string;
  height?: number;
  weight?: number;
  emergencyProcedures?: string;
  primaryPhysician?: string;
  physicianContact?: string;
  healthInsuranceProvider?: string;
  healthInsuranceNumber?: string;
  healthInsuranceExpiryDate?: Date;
}

interface MedicalTabProps {
  employeeId: string;
  bloodType?: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const MedicalTab: React.FC<MedicalTabProps> = ({ employeeId, bloodType }) => {
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<MedicalInfo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        body: JSON.stringify(currentRecord),
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
        <button
          onClick={() => {
            setCurrentRecord({
              id: medicalInfo?.id || 0,
              employeeId,
              hasDisability: medicalInfo?.hasDisability || false,
              medicalNotes: medicalInfo?.medicalNotes || '',
              lastCheckup: medicalInfo?.lastCheckup ? new Date(medicalInfo.lastCheckup) : undefined,
              bloodPressure: medicalInfo?.bloodPressure || '',
              disabilityType: medicalInfo?.disabilityType || '',
              pwdIdNumber: medicalInfo?.pwdIdNumber || '',
              pwdIdValidity: medicalInfo?.pwdIdValidity ? new Date(medicalInfo.pwdIdValidity) : undefined,
              primaryPhysician: medicalInfo?.primaryPhysician || '',
              healthInsuranceProvider: medicalInfo?.healthInsuranceProvider || '',
              healthInsuranceNumber: medicalInfo?.healthInsuranceNumber || '',
              accommodationsNeeded: medicalInfo?.accommodationsNeeded || '',
              assistiveTechnology: medicalInfo?.assistiveTechnology || '',
              emergencyProtocol: medicalInfo?.emergencyProtocol || '',
              allergies: medicalInfo?.allergies || '',
              vaccination: medicalInfo?.vaccination || '',
            });
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaEdit /> Edit Medical Info
        </button>
      </div>

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

      {/* Display Medical Information */}
      {!showForm && medicalInfo && (
        <div className="space-y-8">
          {/* Basic Medical Information */}
          <div>
            <h4 className="font-medium mb-4 text-lg">Basic Medical Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Notes</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.medicalNotes || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Checkup</label>
                <p className="mt-1 text-sm text-gray-900">
                  {medicalInfo.lastCheckup ? new Date(medicalInfo.lastCheckup).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Pressure</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.bloodPressure || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Height</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.height ? `${medicalInfo.height} cm` : 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Weight</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.weight ? `${medicalInfo.weight} kg` : 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.allergies || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vaccination</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.vaccination || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                <p className="mt-1 text-sm text-gray-900">{bloodType || 'N/A'}</p>
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
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.disabilityDetails || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PWD ID Number</label>
                    <p className="mt-1 text-sm text-gray-900">{medicalInfo.pwdIdNumber || 'N/A'}</p>
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
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.physicianContact || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Provider</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.healthInsuranceProvider || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Number</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.healthInsuranceNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Health Insurance Expiry Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {medicalInfo.healthInsuranceExpiryDate ? new Date(medicalInfo.healthInsuranceExpiryDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Procedures</label>
                <p className="mt-1 text-sm text-gray-900">{medicalInfo.emergencyProcedures || 'N/A'}</p>
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
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, medicalNotes: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
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
                      <label className="block text-sm font-medium text-gray-700">Blood Pressure</label>
                      <input
                        type="text"
                        value={currentRecord.bloodPressure || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentRecord.height || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, height: parseFloat(e.target.value) || undefined })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentRecord.weight || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, weight: parseFloat(e.target.value) || undefined })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Allergies</label>
                      <textarea
                        value={currentRecord.allergies || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, allergies: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vaccination</label>
                      <textarea
                        value={currentRecord.vaccination || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, vaccination: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        rows={3}
                      />
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
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, primaryPhysician: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Physician Contact</label>
                      <input
                        type="text"
                        value={currentRecord.physicianContact || ''}
                        onChange={(e) =>
                          setCurrentRecord({ ...currentRecord, physicianContact: e.target.value })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Provider</label>
                      <input
                        type="text"
                        value={currentRecord.healthInsuranceProvider || ''}
                        onChange={(e) =>
                          setCurrentRecord({
                            ...currentRecord,
                            healthInsuranceProvider: e.target.value,
                          })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Number</label>
                      <input
                        type="text"
                        value={currentRecord.healthInsuranceNumber || ''}
                        onChange={(e) =>
                          setCurrentRecord({
                            ...currentRecord,
                            healthInsuranceNumber: e.target.value,
                          })
                        }
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={currentRecord.healthInsuranceExpiryDate ? new Date(currentRecord.healthInsuranceExpiryDate).toISOString().split('T')[0] : ''}
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
                        value={currentRecord.emergencyProcedures || ''}
                        onChange={(e) =>
                          setCurrentRecord({
                            ...currentRecord,
                            emergencyProcedures: e.target.value,
                          })
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