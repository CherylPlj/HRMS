import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, X } from 'lucide-react';
import { getEducationData, addEducationRecord, updateEducationRecord, deleteEducationRecord } from '@/lib/employeeService';

interface Education {
  id: number;
  level: string;
  schoolName: string;
  course?: string | null;
  yearGraduated?: number | null;
  honors?: string | null;
}

interface EducationTabProps {
  employeeId: string;
}

const EducationTab: React.FC<EducationTabProps> = ({ employeeId }) => {
  const [educationRecords, setEducationRecords] = useState<Education[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Education | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<{ schoolName?: string; yearGraduated?: string; course?: string }>(
    {}
  );
// added fix by Aub
  const courseSuggestions: string[] = [
    'Bachelor of Arts in Communication',  
    'Bachelor of Arts in English',  
    'Bachelor of Arts in Political Science',  
    'Bachelor of Science in Accountancy',  
    'Bachelor of Science in Business Administration',  
    'Bachelor of Science in Information Technology',  
    'Bachelor of Science in Computer Science',  
    'Bachelor of Science in Engineering (various disciplines)',  
    'Bachelor of Science in Nursing',  
    'Bachelor of Science in Hospitality Management',  
    'Bachelor of Science in Tourism Management',  
    'Bachelor of Science in Education (various specializations)',  
    'Bachelor of Fine Arts',  
    'Bachelor of Science in Architecture',  
    'Bachelor of Science in Agriculture',  
    'Bachelor of Science in Pharmacy',  
    'Bachelor of Science in Biology',  
    'Bachelor of Science in Chemistry',  
    'Bachelor of Science in Mathematics',  
    'Bachelor of Science in Psychology',  
    'Bachelor of Science in Criminology',  
    'Bachelor of Science in Environmental Science',  
    'Bachelor of Science in Marine Biology',  
    'Master in Business Administration',  
    'Master of Arts in Education',  
    'Master of Arts in Psychology',  
    'Master of Science in Information Technology',  
    'Doctor of Philosophy in Education',  
    'Doctor of Philosophy in Psychology',  
    'Doctor of Medicine',  
    'Juris Doctor',  
    'Certificate in Teaching',  
    'Diploma in Professional Education',  
    'Bachelor of Science in Civil Engineering',  
    'Bachelor of Science in Electrical Engineering',  
    'Bachelor of Science in Mechanical Engineering',  
    'Bachelor of Science in Electronics Engineering',  
    'Bachelor of Science in Chemical Engineering',  
    'Bachelor of Science in Geology',  
    'Bachelor of Science in Environmental Engineering',  
    'Bachelor of Science in Information Systems',  
    'Bachelor of Science in Data Science',  
    'Bachelor of Arts in Sociology',  
    'Bachelor of Arts in History',  
    'Bachelor of Arts in Philosophy',  
    'Bachelor of Arts in Psychology',  
    'Bachelor of Arts in Fine Arts',  
    'Bachelor of Arts in Music',  
    'Bachelor of Arts in Dance',  
    'Bachelor of Arts in Theater Arts',  
    'Bachelor of Science in Agricultural Engineering',  
    'Bachelor of Science in Fisheries',  
    'Bachelor of Science in Forestry',  
    'Bachelor of Science in Food Technology',  
    'Bachelor of Science in Nutrition and Dietetics',  
    'Bachelor of Science in Sports Science',  
    'Master of Arts in Sociology',  
    'Master of Arts in History',  
    'Master of Arts in Political Science',  
    'Master of Arts in Communication',  
    'Master of Science in Nursing',  
    'Master of Science in Engineering',  
    'Master of Science in Data Science',  
    'Doctor of Philosophy in Business Administration',  
    'Doctor of Philosophy in Environmental Science',  
    'Doctor of Philosophy in Engineering',  
    'Doctor of Education',  
    'Doctor of Public Administration',  
    'Master of Public Administration',  
    'Master of Public Health',  
    'Master of Science in Occupational Therapy',  
    'Master of Science in Physical Therapy',  
    'Bachelor of Science in Occupational Therapy',  
    'Bachelor of Science in Physical Therapy',  
    'Certificate in Business Administration',  
    'Diploma in Business Management',  
    'Diploma in Hotel and Restaurant Management',  
    'Diploma in Culinary Arts',  
    'Diploma in Graphic Design',  
    'Diploma in Web Development',  
    'Diploma in Digital Marketing',  
    'Diploma in Event Management',  
    'Diploma in Fashion Design',  
    'Diploma in Interior Design',  
    'Diploma in Animation',  
    'Diploma in Photography',  
    'Diploma in Social Work',  
    'Bachelor of Science in Social Work',  
    'Master of Social Work',  
    'Bachelor of Arts in Early Childhood Education',  
    'Bachelor of Arts in Special Education',  
    'Certificate in Early Childhood Education',  
    'Certificate in Special Education',  
    'Associate Degree in Information Technology',  
    'Associate Degree in Business Administration',  
    'Associate Degree in Hospitality Management',  
    'Associate Degree in Culinary Arts',  
    'Bachelor of Science in Automotive Engineering',  
    'Bachelor of Science in Marine Engineering',  
    'Bachelor of Science in Aeronautical Engineering',  
    'Bachelor of Science in Mining Engineering',  
    'Bachelor of Science in Petroleum Engineering',  
    'Bachelor of Science in Industrial Engineering',  
    'Master of Arts in Educational Leadership',  
    'Master of Arts in Curriculum and Instruction',  
    'Master of Science in Health Administration',  
    'Doctor of Philosophy in Health Science',  
    'Master of Arts in Creative Writing',  
    'Master of Arts in Literature',  
    'Bachelor of Arts in Journalism',  
    'Master of Arts in Journalism',  
    'Bachelor of Science in Statistics',  
    'Bachelor of Science in Actuarial Science',  
    'Bachelor of Science in Information Management',  
    'Bachelor of Science in Library and Information Science',  
    'Bachelor of Science in Public Administration',  
    'Master of Arts in Public Administration',  
    'Master of Science in Public Health',  
    'Doctor of Public Health',  
    'Certificate in Project Management',  
    'Diploma in Project Management',  
    'Diploma in Supply Chain Management',  
    'Bachelor of Science in Supply Chain Management',  
    'Master of Science in Supply Chain Management',  
    'Bachelor of Arts in Media Studies',  
    'Master of Arts in Media Studies',  
    'Bachelor of Arts in Visual Arts',  
    'Master of Arts in Visual Arts',  
    'Bachelor of Science in Fashion Merchandising',  
    'Bachelor of Science in Retail Management',
  ];

  const courseLevels = ['College', 'Graduate', 'Post Graduate'];

  useEffect(() => {
    fetchEducationRecords();
  }, [employeeId]);

  const fetchEducationRecords = async () => {
    try {
      setLoading(true);
      const result = await getEducationData(employeeId);
      if (result.success) {
        setEducationRecords(result.data || []);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to fetch education records'
        });
      }
    } catch (error) {
      console.error('Error fetching education records:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch education records'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    // Validate fields
    const errors: { schoolName?: string; yearGraduated?: string; course?: string } = {};
    const school = (currentRecord.schoolName || '').trim();
    if (/\d/.test(school)) {
      errors.schoolName = 'School name must not contain numbers';
    }
    const requiresCourse = courseLevels.includes(currentRecord.level);
    if (requiresCourse) {
      const courseVal = (currentRecord.course || '').toString().trim();
      if (!courseVal) {
        errors.course = 'Course is required for the selected level.';
      }
    }
    if (currentRecord.yearGraduated !== null && currentRecord.yearGraduated !== undefined) {
      const yearStr = String(currentRecord.yearGraduated);
      const minYear = 1940;
      const maxYear = new Date().getFullYear();
      // Only accept 4-digit year, numbers only
      if (!/^\d{4}$/.test(yearStr)) {
        errors.yearGraduated = 'Year must be a 4-digit number (e.g. 2020)';
      } else if (parseInt(yearStr) < minYear || parseInt(yearStr) > maxYear) {
        errors.yearGraduated = `Year must be between ${minYear} and ${maxYear}`;
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
        const result = await updateEducationRecord(employeeId, currentRecord.id, currentRecord);
        
        if (result.success) {
          await fetchEducationRecords();
          setShowForm(false);
          setCurrentRecord(null);
          setNotification({
            type: 'success',
            message: 'Education record updated successfully!'
          });
          // Auto-hide success notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } else {
          setNotification({
            type: 'error',
            message: result.error || 'Failed to update education record'
          });
        }
      } else {
        // Add new record
        const result = await addEducationRecord(employeeId, currentRecord);
        
        if (result.success) {
          await fetchEducationRecords();
          setShowForm(false);
          setCurrentRecord(null);
          setNotification({
            type: 'success',
            message: 'Education record added successfully!'
          });
          // Auto-hide success notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } else {
          setNotification({
            type: 'error',
            message: result.error || 'Failed to add education record'
          });
        }
      }
    } catch (error) {
      console.error('Error saving education record:', error);
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
      const result = await deleteEducationRecord(employeeId, id);

      if (result.success) {
        await fetchEducationRecords();
        setNotification({
          type: 'success',
          message: 'Education record deleted successfully!'
        });
        // Auto-hide success notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to delete education record'
        });
      }
    } catch (error) {
      console.error('Error deleting education record:', error);
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
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Education Records</h3>
        <button
          onClick={() => {
            setCurrentRecord({
              id: 0,
              level: '',
              schoolName: '',
              course: null,
              yearGraduated: null,
              honors: null,
            });
            setFormErrors({});
            setNotification(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto bg-[#800000] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-800 transition-colors text-sm md:text-base"
        >
          <Plus size={16} /> Add Education
        </button>
      </div>

      {/* List of education records */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {educationRecords.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No education records found.</p>
          </div>
        ) : (
          educationRecords.map((record) => (
            <div key={record.id} className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{record.level}</h4>
                    {record.yearGraduated && (
                      <span className="text-[10px] md:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        Class of {record.yearGraduated}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-gray-700 mt-1 font-medium">{record.schoolName}</p>
                  {record.course && (
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5 line-clamp-1 italic">{record.course}</p>
                  )}
                  {record.honors && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] md:text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {record.honors}
                    </div>
                  )}
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
                {currentRecord.id ? 'Edit Education' : 'Add Education'}
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
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Level <span className="text-red-500">*</span></label>
                  <select
                    value={currentRecord.level}
                    onChange={(e) => {
                      const newLevel = e.target.value;
                      const shouldHaveCourse = courseLevels.includes(newLevel);
                      setCurrentRecord({
                        ...currentRecord,
                        level: newLevel,
                        course: shouldHaveCourse ? currentRecord.course : null,
                      });
                    }}
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    required
                  >
                    <option value="">Select Level</option>
                    <option value="Elementary">Elementary</option>
                    <option value="High School">High School</option>
                    <option value="College">College</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">School Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentRecord.schoolName}
                    onChange={(e) =>
                      { setCurrentRecord({ ...currentRecord, schoolName: e.target.value }); if (formErrors.schoolName) setFormErrors({ ...formErrors, schoolName: undefined }); }
                    }
                    placeholder="Enter full name of institution"
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
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Course {courseLevels.includes(currentRecord.level) ? <span className="text-red-500">*</span> : null}</label>
                  <input
                    type="text"
                    list="courseSuggestions"
                    placeholder={courseLevels.includes(currentRecord.level) ? 'Start typing to see suggestions...' : 'Not Applicable'}
                    value={courseLevels.includes(currentRecord.level) ? (currentRecord.course || '') : 'Not Applicable'}
                    onChange={(e) => {
                      if (courseLevels.includes(currentRecord.level)) {
                        setCurrentRecord({ ...currentRecord, course: e.target.value });
                        if (formErrors.course) setFormErrors({ ...formErrors, course: undefined });
                      }
                    }}
                    className={`w-full p-2 md:p-2.5 rounded-lg border transition-all text-sm md:text-base ${
                      courseLevels.includes(currentRecord.level) 
                        ? 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    } ${formErrors.course ? 'border-red-500' : ''}`}
                    disabled={!courseLevels.includes(currentRecord.level)}
                    readOnly={!courseLevels.includes(currentRecord.level)}
                    required={courseLevels.includes(currentRecord.level)}
                  />
                  <datalist id="courseSuggestions">
                    {courseSuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {formErrors.course && (
                    <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.course}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Year Graduated</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      value={currentRecord.yearGraduated !== null && currentRecord.yearGraduated !== undefined ? String(currentRecord.yearGraduated) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d{0,4}$/.test(val)) {
                          setCurrentRecord({
                            ...currentRecord,
                            yearGraduated: val ? parseInt(val) : null,
                          });
                          if (formErrors.yearGraduated) setFormErrors({ ...formErrors, yearGraduated: undefined });
                        }
                      }}
                      className={`w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base ${
                        formErrors.yearGraduated ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="YYYY (e.g. 2020)"
                    />
                    {formErrors.yearGraduated && (
                      <p className="mt-1 text-[10px] md:text-xs text-red-600 font-medium">{formErrors.yearGraduated}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Honors</label>
                    <input
                      type="text"
                      value={currentRecord.honors || ''}
                      onChange={(e) =>
                        setCurrentRecord({ ...currentRecord, honors: e.target.value })
                      }
                      placeholder="e.g. Cum Laude"
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
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
                    disabled={loading}
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all uppercase tracking-wide ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800 hover:shadow-md'
                    }`}
                  >
                    {loading ? 'Saving...' : (currentRecord.id ? 'Update Record' : 'Add Record')}
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

export default EducationTab; 