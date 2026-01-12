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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Work Experience</h3>
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
            className="w-full sm:w-auto bg-[#800000] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-800 transition-colors text-sm md:text-base"
          >
            <Plus size={16} /> Add Work Experience
          </button>
        )}
      </div>

      {/* List of work experiences */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {workExperiences.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No work experience records found.</p>
          </div>
        ) : (
          workExperiences.map((experience) => (
            <div key={experience.id} className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{experience.position}</h4>
                    <span className="text-[10px] md:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {new Date(experience.startDate).toLocaleDateString()} - {experience.endDate ? new Date(experience.endDate).toLocaleDateString() : 'Present'}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-700 mt-1 font-medium">{experience.schoolName}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {experience.salary && (
                      <p className="text-[10px] md:text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md w-fit">
                        ₱{experience.salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month
                      </p>
                    )}
                  </div>
                  {experience.reasonForLeaving && (
                    <p className="text-xs md:text-sm text-gray-500 mt-2 line-clamp-2 italic">
                      <span className="font-semibold text-gray-700 not-italic">Reason for leaving:</span> {experience.reasonForLeaving}
                    </p>
                  )}
                </div>
                {!isUserAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setCurrentRecord(experience);
                        setShowForm(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Pen size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(experience.id!)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
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
                {currentRecord.id ? 'Edit Work Experience' : 'Add Work Experience'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Company/Institution Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.schoolName}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, schoolName: e.target.value }); if (formErrors.schoolName) setFormErrors({ ...formErrors, schoolName: undefined }); }
                    }
                    placeholder="e.g. Acme Corporation"
                    className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                      formErrors.schoolName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formErrors.schoolName && (
                    <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.schoolName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Position <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.position}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, position: e.target.value }); if (formErrors.position) setFormErrors({ ...formErrors, position: undefined }); }
                    }
                    placeholder="e.g. Senior Developer"
                    className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                      formErrors.position ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formErrors.position && (
                    <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.position}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={currentRecord.startDate ? new Date(currentRecord.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) =>
                        { const updated = { ...currentRecord, startDate: e.target.value ? new Date(e.target.value) : new Date() } as WorkExperience; setCurrentRecord(updated); if (formErrors.dateRange) setFormErrors({ ...formErrors, dateRange: undefined }); }
                      }
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">End Date {(!currentRecord || !currentRecord.id) ? <span className="text-red-500">*</span> : null}</label>
                    <input
                      type="date"
                      value={currentRecord.endDate ? new Date(currentRecord.endDate).toISOString().split('T')[0] : ''}
                      min={currentRecord.startDate ? new Date(currentRecord.startDate).toISOString().split('T')[0] : undefined}
                      onChange={(e) =>
                        { const updated = { ...currentRecord, endDate: e.target.value ? new Date(e.target.value) : null } as WorkExperience; setCurrentRecord(updated); if (formErrors.dateRange || formErrors.endDate) setFormErrors({ ...formErrors, dateRange: undefined, endDate: undefined }); }
                      }
                      className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                        (formErrors.endDate || formErrors.dateRange) ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required={!currentRecord?.id}
                    />
                    {formErrors.endDate && (
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.endDate}</p>
                    )}
                    {formErrors.dateRange && (
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.dateRange}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Salary Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
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
                      placeholder="0.00"
                      className="w-full bg-gray-50 text-gray-900 pl-8 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Reason for Leaving</label>
                  <textarea
                    value={currentRecord.reasonForLeaving || ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        reasonForLeaving: e.target.value
                      })
                    }
                    placeholder="Briefly state why you left this position..."
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    rows={4}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentRecord(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-wide"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all uppercase tracking-wide ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800 hover:shadow-md'
                    }`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Experience'}
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