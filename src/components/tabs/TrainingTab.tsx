import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface Training {
  id: number;
  employeeId: string;
  title: string;
  hours: number;
  conductedBy: string;
  date: Date;
}

interface TrainingTabProps {
  employeeId: string;
}

const TrainingTab: React.FC<TrainingTabProps> = ({ employeeId }) => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Training | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTrainings();
  }, [employeeId]);

  const fetchTrainings = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/training`);
      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
      }
    } catch (error) {
      console.error('Error fetching trainings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    try {
      const url = `/api/employees/${employeeId}/training${currentRecord.id ? `/${currentRecord.id}` : ''}`;
      const method = currentRecord.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRecord),
      });

      if (response.ok) {
        await fetchTrainings();
        setShowForm(false);
        setCurrentRecord(null);
      }
    } catch (error) {
      console.error('Error saving training:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/training/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTrainings();
      }
    } catch (error) {
      console.error('Error deleting training:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Training Programs</h3>
        <button
          onClick={() => {
            setCurrentRecord({
              id: 0,
              employeeId,
              title: '',
              hours: 0,
              conductedBy: '',
              date: new Date(),
            });
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Training
        </button>
      </div>

      {/* List of trainings */}
      <div className="grid grid-cols-1 gap-4">
        {trainings.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{record.title}</h4>
                  <span className="text-sm text-gray-500">({record.hours} hours)</span>
                </div>
                <p className="text-sm text-gray-600">
                  Conducted by: {record.conductedBy}
                </p>
                <p className="text-sm text-gray-600">
                  Date: {new Date(record.date).toLocaleDateString()}
                </p>
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
              {currentRecord.id ? 'Edit Training' : 'Add Training'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={currentRecord.title}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, title: e.target.value })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hours</label>
                <input
                  type="number"
                  value={currentRecord.hours}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      hours: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Conducted By</label>
                <input
                  type="text"
                  value={currentRecord.conductedBy}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      conductedBy: e.target.value,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={new Date(currentRecord.date).toISOString().split('T')[0]}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      date: new Date(e.target.value),
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
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

export default TrainingTab; 