import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { getFamilyData, addFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/employeeService';

interface Family {
  id: number;
  type: string;
  name: string;
  dateOfBirth?: Date | null;
  occupation?: string | null;
  isDependent: boolean;
  relationship?: string | null;
  contactNumber?: string | null;
  address?: string | null;
}

interface FamilyTabProps {
  employeeId: string;
}

const FamilyTab: React.FC<FamilyTabProps> = ({ employeeId }) => {
  const [familyRecords, setFamilyRecords] = useState<Family[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Family | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; contactNumber?: string; type?: string }>({});

  useEffect(() => {
    fetchFamilyRecords();
  }, [employeeId]);

  const fetchFamilyRecords = async () => {
    try {
      setLoading(true);
      const result = await getFamilyData(employeeId);
      if (result.success) {
        setFamilyRecords(result.data || []);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to fetch family records'
        });
      }
    } catch (error) {
      console.error('Error fetching family records:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch family records'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    // Validate inputs
    const errors: { name?: string; contactNumber?: string; type?: string } = {};
    const name = currentRecord.name?.trim() || '';
    // Allow letters with common name punctuation and spaces; no digits or other specials
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ .-]+$/;
    if (!name || !nameRegex.test(name)) {
      errors.name = 'Name must contain letters only (no numbers or special characters)';
    }

    {
      const digits = (currentRecord.contactNumber || '').replace(/\D/g, '');
      if (digits.length > 0 && !/^09\d{9}$/.test(digits)) {
        errors.contactNumber = 'Enter a valid PH mobile number (11 digits, starts with 09)';
      }
    }

    // Business rules: only one Spouse; only up to two Parents
    if (currentRecord.type === 'Spouse') {
      const spouseCount = familyRecords.filter(r => r.type === 'Spouse' && r.id !== currentRecord.id).length;
      if (spouseCount >= 1) {
        errors.type = 'Spouse can only be added once.';
      }
    }
    if (currentRecord.type === 'Parent') {
      const parentCount = familyRecords.filter(r => r.type === 'Parent' && r.id !== currentRecord.id).length;
      if (parentCount >= 2) {
        errors.type = 'Only two parents can be added.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotification({ type: 'error', message: 'Please fix the highlighted errors.' });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      if (currentRecord.id) {
        // Update existing record
        const result = await updateFamilyMember(employeeId, currentRecord.id, currentRecord);
        
        if (result.success) {
          await fetchFamilyRecords();
          setShowForm(false);
          setCurrentRecord(null);
          setNotification({
            type: 'success',
            message: 'Family member updated successfully!'
          });
          // Auto-hide success notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } else {
          setNotification({
            type: 'error',
            message: result.error || 'Failed to update family member'
          });
        }
      } else {
        // Add new record
        const result = await addFamilyMember(employeeId, currentRecord);
        
        if (result.success) {
          await fetchFamilyRecords();
          setShowForm(false);
          setCurrentRecord(null);
          setNotification({
            type: 'success',
            message: 'Family member added successfully!'
          });
          // Auto-hide success notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } else {
          setNotification({
            type: 'error',
            message: result.error || 'Failed to add family member'
          });
        }
      }
    } catch (error) {
      console.error('Error saving family record:', error);
      setNotification({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    setLoading(true);
    setNotification(null);

    try {
      const result = await deleteFamilyMember(employeeId, id);

      if (result.success) {
        await fetchFamilyRecords();
        setNotification({
          type: 'success',
          message: 'Family member deleted successfully!'
        });
        // Auto-hide success notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to delete family member'
        });
      }
    } catch (error) {
      console.error('Error deleting family record:', error);
      setNotification({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex justify-between items-center">
            <p>{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-current hover:opacity-70"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
        <button
          onClick={() => {
            setCurrentRecord({
              id: 0,
              type: '',
              name: '',
              dateOfBirth: null,
              occupation: null,
              isDependent: false,
              relationship: null,
              contactNumber: null,
              address: null,
            });
            setFormErrors({});
            setNotification(null);
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Family Member
        </button>
      </div>

      {/* List of family records */}
      <div className="grid grid-cols-1 gap-4">
        {familyRecords.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{record.name}</h4>
                  <span className="text-sm text-gray-500">({record.type})</span>
                </div>
                {record.relationship && (
                  <p className="text-sm text-gray-600">Relationship: {record.relationship}</p>
                )}
                {record.dateOfBirth && (
                  <p className="text-sm text-gray-600">
                    Date of Birth: {new Date(record.dateOfBirth).toLocaleDateString()}
                  </p>
                )}
                {record.occupation && (
                  <p className="text-sm text-gray-600">Occupation: {record.occupation}</p>
                )}
                {record.contactNumber && (
                  <p className="text-sm text-gray-600">Contact: {record.contactNumber}</p>
                )}
                {record.address && (
                  <p className="text-sm text-gray-600">Address: {record.address}</p>
                )}
                <p className="text-sm text-gray-600">
                  Dependent: {record.isDependent ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentRecord(record);
                    setFormErrors({});
                    setNotification(null);
                    setShowForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  disabled={loading}
                  className={`${loading ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {currentRecord.id ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentRecord(null);
                  setFormErrors({});
                  setNotification(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type <span className="text-red-500">*</span></label>
                  <select
                    value={currentRecord.type}
                    onChange={(e) => {
                      setCurrentRecord({ ...currentRecord, type: e.target.value });
                      if (formErrors.type) setFormErrors({ ...formErrors, type: undefined });
                    }}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.type && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.name}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: undefined }); }
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={currentRecord.dateOfBirth ? new Date(currentRecord.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        dateOfBirth: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Occupation</label>
                  <input
                    type="text"
                    value={currentRecord.occupation || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, occupation: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="09[0-9]{9}"
                    title="Enter an 11-digit PH mobile number starting with 09"
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                    value={currentRecord.contactNumber || ''}
                    onChange={(e) => {
                      // accept digits only and limit to 11
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setCurrentRecord({ ...currentRecord, contactNumber: digitsOnly });
                      if (formErrors.contactNumber) setFormErrors({ ...formErrors, contactNumber: undefined });
                    }}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    
                  />
                  {formErrors.contactNumber && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.contactNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={currentRecord.address || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, address: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentRecord.isDependent}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, isDependent: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-700">Is Dependent</label>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentRecord(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800'
                    }`}
                  >
                    {loading ? 'Saving...' : (currentRecord.id ? 'Update' : 'Add')}
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

export default FamilyTab; 