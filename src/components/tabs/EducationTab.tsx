import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
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
  const [formErrors, setFormErrors] = useState<{ schoolName?: string; yearGraduated?: string }>(
    {}
  );

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
    const errors: { schoolName?: string; yearGraduated?: string } = {};
    const school = (currentRecord.schoolName || '').trim();
    if (/\d/.test(school)) {
      errors.schoolName = 'School name must not contain numbers';
    }
    if (currentRecord.yearGraduated) {
      const minYear = 1950;
      const maxYear = new Date().getFullYear();
      const year = currentRecord.yearGraduated;
      if (year < minYear || year > maxYear) {
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
        <h3 className="text-lg font-medium text-gray-900">Education Records</h3>
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
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Education
        </button>
      </div>

      {/* List of education records */}
      <div className="grid grid-cols-1 gap-4">
        {educationRecords.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{record.level}</h4>
                <p className="text-sm text-gray-600">{record.schoolName}</p>
                {record.course && <p className="text-sm text-gray-600">{record.course}</p>}
                {record.yearGraduated && (
                  <p className="text-sm text-gray-600">Graduated: {record.yearGraduated}</p>
                )}
                {record.honors && <p className="text-sm text-gray-600">Honors: {record.honors}</p>}
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
                {currentRecord.id ? 'Edit Education Record' : 'Add Education Record'}
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
                  <label className="block text-sm font-medium text-gray-700">Level <span className="text-red-500">*</span></label>
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
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
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
                  <label className="block text-sm font-medium text-gray-700">School Name <span className="text-red-500">*</span></label>
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
                  <label className="block text-sm font-medium text-gray-700">Course</label>
                  <input
                    type="text"
                    list="courseSuggestions"
                    placeholder={courseLevels.includes(currentRecord.level) ? 'Start typing to see suggestions...' : 'Not Applicable'}
                    value={courseLevels.includes(currentRecord.level) ? (currentRecord.course || '') : 'Not Applicable'}
                    onChange={(e) => {
                      if (courseLevels.includes(currentRecord.level)) {
                        setCurrentRecord({ ...currentRecord, course: e.target.value });
                      }
                    }}
                    className={`mt-1 w-full p-2 rounded border border-gray-300 ${courseLevels.includes(currentRecord.level) ? 'bg-gray-50 text-black' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                    disabled={!courseLevels.includes(currentRecord.level)}
                    readOnly={!courseLevels.includes(currentRecord.level)}
                  />
                  <datalist id="courseSuggestions">
                    {courseSuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year Graduated</label>
                  <input
                    type="number"
                    min={1950}
                    max={new Date().getFullYear()}
                    value={currentRecord.yearGraduated || ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        yearGraduated: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {formErrors.yearGraduated && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.yearGraduated}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Honors</label>
                  <input
                    type="text"
                    value={currentRecord.honors || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, honors: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
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

export default EducationTab; 