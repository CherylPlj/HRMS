import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface Eligibility {
  id: number;
  type: string;
  rating?: number | null;
  licenseNumber?: string | null;
  examDate?: Date | null;
  validUntil?: Date | null;
}

interface EligibilityTabProps {
  employeeId: string;
}

const EligibilityTab: React.FC<EligibilityTabProps> = ({ employeeId }) => {
  const [eligibilityRecords, setEligibilityRecords] = useState<Eligibility[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Eligibility | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEligibilityRecords();
  }, [employeeId]);

  const fetchEligibilityRecords = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/eligibility`);
      if (response.ok) {
        const data = await response.json();
        setEligibilityRecords(data);
      }
    } catch (error) {
      console.error('Error fetching eligibility records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    try {
      const url = `/api/employees/${employeeId}/eligibility${currentRecord.id ? `/${currentRecord.id}` : ''}`;
      const method = currentRecord.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRecord),
      });

      if (response.ok) {
        await fetchEligibilityRecords();
        setShowForm(false);
        setCurrentRecord(null);
      }
    } catch (error) {
      console.error('Error saving eligibility record:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/eligibility/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEligibilityRecords();
      }
    } catch (error) {
      console.error('Error deleting eligibility record:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Civil Service Eligibility</h3>
        <button
          onClick={() => {
            setCurrentRecord({
              id: 0,
              type: '',
              rating: null,
              licenseNumber: null,
              examDate: null,
              validUntil: null,
            });
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Eligibility
        </button>
      </div>

      {/* List of eligibility records */}
      <div className="grid grid-cols-1 gap-4">
        {eligibilityRecords.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{record.type}</h4>
                {record.rating && <p className="text-sm text-gray-600">Rating: {record.rating}</p>}
                {record.licenseNumber && (
                  <p className="text-sm text-gray-600">License: {record.licenseNumber}</p>
                )}
                {record.examDate && (
                  <p className="text-sm text-gray-600">
                    Exam Date: {new Date(record.examDate).toLocaleDateString()}
                  </p>
                )}
                {record.validUntil && (
                  <p className="text-sm text-gray-600">
                    Valid Until: {new Date(record.validUntil).toLocaleDateString()}
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
              {currentRecord.id ? 'Edit Eligibility Record' : 'Add Eligibility Record'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={currentRecord.type}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, type: e.target.value })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Civil Service">Civil Service</option>
                  <option value="LET">LET</option>
                  <option value="Board Exam">Board Exam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentRecord.rating || ''}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      rating: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">License Number</label>
                <input
                  type="text"
                  value={currentRecord.licenseNumber || ''}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, licenseNumber: e.target.value })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Date</label>
                <input
                  type="date"
                  value={currentRecord.examDate ? new Date(currentRecord.examDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      examDate: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                <input
                  type="date"
                  value={currentRecord.validUntil ? new Date(currentRecord.validUntil).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      validUntil: e.target.value ? new Date(e.target.value) : null,
                    })
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
      )}
    </div>
  );
};

export default EligibilityTab; 