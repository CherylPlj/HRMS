import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, X } from 'lucide-react';
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
    const type = currentRecord.type?.trim() || '';
    // Block submission if name or type is empty
    if (!type) {
      errors.type = 'Type is required.';
    }
    // Allow letters with common name punctuation and spaces; no digits or other specials
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ .-]+$/;
    if (!name) {
      errors.name = 'Name is required.';
    } else if (!nameRegex.test(name)) {
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
    <div className="space-y-4 md:space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-3 md:p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center text-sm md:text-base">
            <p>{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-current hover:opacity-70 p-1"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Family Background</h3>
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
          className="w-full sm:w-auto bg-[#800000] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-800 transition-colors text-sm md:text-base"
        >
          <Plus size={16} /> Add Family Member
        </button>
      </div>

      {/* List of family records */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {familyRecords.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No family records found.</p>
          </div>
        ) : (
          familyRecords.map((record) => (
            <div key={record.id} className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{record.name}</h4>
                    <span className="text-[10px] md:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {record.type}
                    </span>
                    {record.isDependent && (
                      <span className="text-[10px] md:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Dependent
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {record.relationship && (
                      <p className="text-xs md:text-sm text-gray-700 font-medium">{record.relationship}</p>
                    )}
                    {record.occupation && (
                      <p className="text-xs md:text-sm text-gray-500 italic">{record.occupation}</p>
                    )}
                    {record.dateOfBirth && (
                      <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                        Born: {new Date(record.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                    {record.contactNumber && (
                      <p className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {record.contactNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setCurrentRecord(record);
                      setFormErrors({});
                      setNotification(null);
                      setShowForm(true);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Pen size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    disabled={loading}
                    className={`p-1.5 transition-colors rounded-md ${loading ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {currentRecord.id ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentRecord(null);
                  setFormErrors({});
                  setNotification(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Type <span className="text-red-500">*</span></label>
                    <select
                      value={currentRecord.type}
                      onChange={(e) => {
                        setCurrentRecord({ ...currentRecord, type: e.target.value });
                        if (formErrors.type) setFormErrors({ ...formErrors, type: undefined });
                      }}
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
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
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.type}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={currentRecord.name}
                      onChange={(e) => {
                        setCurrentRecord({ ...currentRecord, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                      }}
                      placeholder="e.g. Juan A. Dela Cruz"
                      className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={currentRecord.dateOfBirth ? new Date(currentRecord.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) =>
                        setCurrentRecord({
                          ...currentRecord,
                          dateOfBirth: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Contact Number</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="09[0-9]{9}"
                      maxLength={11}
                      placeholder="09XXXXXXXXX"
                      value={currentRecord.contactNumber || ''}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCurrentRecord({ ...currentRecord, contactNumber: digitsOnly });
                        if (formErrors.contactNumber) setFormErrors({ ...formErrors, contactNumber: undefined });
                      }}
                      className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                        formErrors.contactNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.contactNumber && (
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.contactNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Occupation</label>
                    <input
                      type="text"
                      value={currentRecord.occupation || ''}
                      onChange={(e) => setCurrentRecord({ ...currentRecord, occupation: e.target.value })}
                      placeholder="e.g. Teacher"
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Relationship (Specific)</label>
                    <input
                      type="text"
                      value={currentRecord.relationship || ''}
                      onChange={(e) => setCurrentRecord({ ...currentRecord, relationship: e.target.value })}
                      placeholder="e.g. Eldest Son"
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Address</label>
                  <input
                    type="text"
                    value={currentRecord.address || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, address: e.target.value })}
                    placeholder="Complete Address"
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="isDependent"
                    checked={currentRecord.isDependent}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, isDependent: e.target.checked })}
                    className="w-4 h-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                  />
                  <label htmlFor="isDependent" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Is Dependent
                  </label>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentRecord(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-wide"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !currentRecord.name?.trim() || !currentRecord.type?.trim()}
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all uppercase tracking-wide ${
                      loading || !currentRecord.name?.trim() || !currentRecord.type?.trim()
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800 hover:shadow-md'
                    }`}
                  >
                    {loading ? 'Saving...' : (currentRecord.id ? 'Update Member' : 'Add Member')}
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