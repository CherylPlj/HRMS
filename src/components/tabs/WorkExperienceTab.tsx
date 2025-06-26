import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface WorkExperience {
  id: number;
  employeeId: string;
  schoolName: string;
  position: string;
  startDate: Date;
  endDate?: Date | null;
  reasonForLeaving?: string | null;
}

interface WorkExperienceTabProps {
  employeeId: string;
}

const WorkExperienceTab: React.FC<WorkExperienceTabProps> = ({ employeeId }) => {
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkExperience | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchWorkExperiences();
  }, [employeeId]);

  const fetchWorkExperiences = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/work-experience`);
      if (response.ok) {
        const data = await response.json();
        setWorkExperiences(data);
      }
    } catch (error) {
      console.error('Error fetching work experiences:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

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
      }
    } catch (error) {
      console.error('Error saving work experience:', error);
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
      }
    } catch (error) {
      console.error('Error deleting work experience:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
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
            });
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Work Experience
        </button>
      </div>

      {/* List of work experiences */}
      <div className="grid grid-cols-1 gap-4">
        {workExperiences.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{record.schoolName}</h4>
                  <span className="text-sm text-gray-500">({record.position})</span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(record.startDate).toLocaleDateString()} - {record.endDate ? new Date(record.endDate).toLocaleDateString() : 'Present'}
                </p>
                {record.reasonForLeaving && (
                  <p className="text-sm text-gray-600">
                    Reason for Leaving: {record.reasonForLeaving}
                  </p>
                )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {currentRecord.id ? 'Edit Work Experience' : 'Add Work Experience'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">School/Institution Name</label>
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
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  value={currentRecord.position}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, position: e.target.value })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={new Date(currentRecord.startDate).toISOString().split('T')[0]}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      startDate: new Date(e.target.value),
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={currentRecord.endDate ? new Date(currentRecord.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      endDate: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason for Leaving</label>
                <textarea
                  value={currentRecord.reasonForLeaving || ''}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      reasonForLeaving: e.target.value,
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
      )}
    </div>
  );
};

export default WorkExperienceTab;