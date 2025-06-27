import React, { useState, useEffect } from 'react';
import { MedicalInfo } from '../../types/employee';

interface MedicalTabProps {
  employeeId: string;
  initialData?: MedicalInfo;
  onUpdate: (data: MedicalInfo) => void;
}

const MedicalTab: React.FC<MedicalTabProps> = ({ employeeId, initialData, onUpdate }) => {
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>({
    hasDisability: false,
    ...initialData
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (field: keyof MedicalInfo, value: any) => {
    setMedicalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/medical`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicalInfo),
      });

      if (!response.ok) {
        throw new Error('Failed to update medical information');
      }

      onUpdate(medicalInfo);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating medical information:', error);
      // Handle error (show notification, etc.)
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Medical Information</h2>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Medical Information */}
        <div className="space-y-4">
          <h3 className="font-semibold">Basic Medical Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Medical Notes</label>
            <textarea
              value={medicalInfo.medicalNotes || ''}
              onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Checkup</label>
            <input
              type="date"
              value={medicalInfo.lastCheckup?.toString().split('T')[0] || ''}
              onChange={(e) => handleInputChange('lastCheckup', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Blood Pressure</label>
            <input
              type="text"
              value={medicalInfo.bloodPressure || ''}
              onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>

        {/* Disability Information */}
        <div className="space-y-4">
          <h3 className="font-semibold">Disability Information</h3>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={medicalInfo.hasDisability}
                onChange={(e) => handleInputChange('hasDisability', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-yellow-600 shadow-sm"
              />
              <span className="ml-2">Has Disability</span>
            </label>
          </div>
          {medicalInfo.hasDisability && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Disability Type</label>
                <input
                  type="text"
                  value={medicalInfo.disabilityType || ''}
                  onChange={(e) => handleInputChange('disabilityType', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PWD ID Number</label>
                <input
                  type="text"
                  value={medicalInfo.pwdIdNumber || ''}
                  onChange={(e) => handleInputChange('pwdIdNumber', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PWD ID Validity</label>
                <input
                  type="date"
                  value={medicalInfo.pwdIdValidity?.toString().split('T')[0] || ''}
                  onChange={(e) => handleInputChange('pwdIdValidity', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Additional Medical Details */}
        <div className="space-y-4">
          <h3 className="font-semibold">Additional Medical Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Physician</label>
            <input
              type="text"
              value={medicalInfo.primaryPhysician || ''}
              onChange={(e) => handleInputChange('primaryPhysician', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Health Insurance Provider</label>
            <input
              type="text"
              value={medicalInfo.healthInsuranceProvider || ''}
              onChange={(e) => handleInputChange('healthInsuranceProvider', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Health Insurance Number</label>
            <input
              type="text"
              value={medicalInfo.healthInsuranceNumber || ''}
              onChange={(e) => handleInputChange('healthInsuranceNumber', e.target.value)}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>

        {/* Workplace Accommodations */}
        {medicalInfo.hasDisability && (
          <div className="space-y-4">
            <h3 className="font-semibold">Workplace Accommodations</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Required Accommodations</label>
              <textarea
                value={medicalInfo.accommodationsNeeded || ''}
                onChange={(e) => handleInputChange('accommodationsNeeded', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assistive Technology</label>
              <input
                type="text"
                value={medicalInfo.assistiveTechnology || ''}
                onChange={(e) => handleInputChange('assistiveTechnology', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Protocol</label>
              <textarea
                value={medicalInfo.emergencyProtocol || ''}
                onChange={(e) => handleInputChange('emergencyProtocol', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalTab;