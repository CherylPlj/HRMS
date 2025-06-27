import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

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

  useEffect(() => {
    fetchEducationRecords();
  }, [employeeId]);

  const fetchEducationRecords = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/education`);
      if (response.ok) {
        const data = await response.json();
        setEducationRecords(data);
      }
    } catch (error) {
      console.error('Error fetching education records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    try {
      const url = `/api/employees/${employeeId}/education${currentRecord.id ? `/${currentRecord.id}` : ''}`;
      const method = currentRecord.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRecord),
      });

      if (response.ok) {
        await fetchEducationRecords();
        setShowForm(false);
        setCurrentRecord(null);
      }
    } catch (error) {
      console.error('Error saving education record:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/education/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEducationRecords();
      }
    } catch (error) {
      console.error('Error deleting education record:', error);
    }
  };

  return (
    <div className="space-y-6">
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
                    setShowForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-red-600 hover:text-red-800"
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
                  <label className="block text-sm font-medium text-gray-700">Level</label>
                  <select
                    value={currentRecord.level}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, level: e.target.value })
                    }
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
                  <label className="block text-sm font-medium text-gray-700">School Name</label>
                  <input
                    type="text"
                    value={currentRecord.schoolName}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, schoolName: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course</label>
                  <input
                    type="text"
                    value={currentRecord.course || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, course: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year Graduated</label>
                  <input
                    type="number"
                    value={currentRecord.yearGraduated || ''}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        yearGraduated: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
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
                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800"
                  >
                    Save
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