import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, Check, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { isAdmin } from '@/utils/roleUtils';

interface WorkExperience {
  id?: number;
  employeeId: string;
  schoolName: string;
  position: string;
  startDate: Date;
  endDate?: Date | null;
  reasonForLeaving?: string | null;
  salary?: number | null;
}

interface WorkExperienceTabProps {
  employeeId: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface FormErrors {
  schoolName?: string;
  position?: string;
  endDate?: string;
  dateRange?: string;
}

const WorkExperienceTab: React.FC<WorkExperienceTabProps> = ({ employeeId }) => {
  const { user } = useUser();
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkExperience | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsUserAdmin(isAdmin(user));
    }
  }, [user]);

  useEffect(() => {
    fetchWorkExperiences();
  }, [employeeId]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchWorkExperiences = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/work-experience`);
      if (response.ok) {
        const data = await response.json();
        setWorkExperiences(data);
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to fetch work experiences'
        });
      }
    } catch (error) {
      console.error('Error fetching work experiences:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch work experiences'
      });
    }
  };

  const validateRecord = (record: WorkExperience): boolean => {
    const errors: FormErrors = {};

    if (!record.schoolName || record.schoolName.trim().length === 0) {
      errors.schoolName = 'Company/Institution name is required';
    }
    if (!record.position || record.position.trim().length === 0) {
      errors.position = 'Position is required';
    }

    const start = record.startDate ? new Date(record.startDate) : null;
    const end = record.endDate ? new Date(record.endDate) : null;
    // When adding a new record (no id), require endDate
    if (!record.id && !record.endDate) {
      errors.endDate = 'End date is required when adding a work experience.';
    }
    if (start && end && end.getTime() < start.getTime()) {
      errors.dateRange = 'End date cannot be earlier than start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    // Validate before submit
    if (!validateRecord(currentRecord)) {
      setNotification({ type: 'error', message: 'Please fix the validation errors.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = `/api/employees/${employeeId}/work-experience${currentRecord.id ? `/${currentRecord.id}` : ''}`;
      const method = currentRecord.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRecord),
      });

      if (response.ok) {
        await fetchWorkExperiences();
        setShowForm(false);
        setCurrentRecord(null);
        setNotification({
          type: 'success',
          message: currentRecord.id ? 'Work experience updated successfully!' : 'Work experience added successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save work experience');
      }
    } catch (error) {
      console.error('Error saving work experience:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save work experience'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/work-experience/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWorkExperiences();
        setNotification({
          type: 'success',
          message: 'Work experience deleted successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete work experience');
      }
    } catch (error) {
      console.error('Error deleting work experience:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete work experience'
      });
    }
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
        <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
        {!isUserAdmin && (
          <button
            onClick={() => {
              setCurrentRecord({
                id: 0,
                employeeId,
                schoolName: '',
                position: '',
                startDate: new Date(),
                endDate: null,
                reasonForLeaving: null,
                salary: null
              });
              setShowForm(true);
            }}
            className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <Plus size={16} /> Add Work Experience
          </button>
        )}
      </div>

      {/* List of work experiences */}
      <div className="grid grid-cols-1 gap-4">
        {workExperiences.map((experience) => (
          <div key={experience.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{experience.position}</h4>
                <p className="text-sm text-gray-600">
                  Company/Institution: {experience.schoolName}
                </p>
                <p className="text-sm text-gray-600">
                  Start Date: {new Date(experience.startDate).toLocaleDateString()}
                </p>
                {experience.endDate && (
                  <p className="text-sm text-gray-600">
                    End Date: {new Date(experience.endDate).toLocaleDateString()}
                  </p>
                )}
                {experience.salary && (
                  <p className="text-sm text-gray-600">
                    Salary: ₱{experience.salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {experience.reasonForLeaving && (
                  <p className="text-sm text-gray-600">
                    Reason for Leaving: {experience.reasonForLeaving}
                  </p>
                )}
              </div>
              {!isUserAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentRecord(experience);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Pen size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(experience.id!)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
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
                {currentRecord.id ? 'Edit Work Experience' : 'Add Work Experience'}
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company/Institution Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.schoolName}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, schoolName: e.target.value }); if (formErrors.schoolName) setFormErrors({ ...formErrors, schoolName: undefined }); }
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                  {formErrors.schoolName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.schoolName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.position}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, position: e.target.value }); if (formErrors.position) setFormErrors({ ...formErrors, position: undefined }); }
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                  {formErrors.position && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.position}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={currentRecord.startDate ? new Date(currentRecord.startDate).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      { const updated = { ...currentRecord, startDate: e.target.value ? new Date(e.target.value) : new Date() } as WorkExperience; setCurrentRecord(updated); if (formErrors.dateRange) setFormErrors({ ...formErrors, dateRange: undefined }); }
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date {(!currentRecord || !currentRecord.id) ? <span className="text-red-500">*</span> : null}</label>
                  <input
                    type="date"
                    value={currentRecord.endDate ? new Date(currentRecord.endDate).toISOString().split('T')[0] : ''}
                    min={currentRecord.startDate ? new Date(currentRecord.startDate).toISOString().split('T')[0] : undefined}
                    onChange={(e) =>
                      { const updated = { ...currentRecord, endDate: e.target.value ? new Date(e.target.value) : null } as WorkExperience; setCurrentRecord(updated); if (formErrors.dateRange || formErrors.endDate) setFormErrors({ ...formErrors, dateRange: undefined, endDate: undefined }); }
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required={!currentRecord?.id}
                  />
                  {formErrors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
                  )}
                  {formErrors.dateRange && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.dateRange}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentRecord.salary || ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        salary: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Enter salary amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Leaving</label>
                  <textarea
                    value={currentRecord.reasonForLeaving || ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        reasonForLeaving: e.target.value
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentRecord(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default WorkExperienceTab;