import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

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

  useEffect(() => {
    fetchFamilyRecords();
  }, [employeeId]);

  const fetchFamilyRecords = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/family`);
      if (response.ok) {
        const data = await response.json();
        setFamilyRecords(data);
      }
    } catch (error) {
      console.error('Error fetching family records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    try {
      const url = `/api/employees/${employeeId}/family${currentRecord.id ? `/${currentRecord.id}` : ''}`;
      const method = currentRecord.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRecord),
      });

      if (response.ok) {
        await fetchFamilyRecords();
        setShowForm(false);
        setCurrentRecord(null);
      }
    } catch (error) {
      console.error('Error saving family record:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/family/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFamilyRecords();
      }
    } catch (error) {
      console.error('Error deleting family record:', error);
    }
  };

  return (
    <div className="space-y-6">
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
                {currentRecord.id ? 'Edit Family Member' : 'Add Family Member'}
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
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={currentRecord.name}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, name: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relationship</label>
                  <input
                    type="text"
                    value={currentRecord.relationship || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, relationship: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
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
                    value={currentRecord.contactNumber || ''}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, contactNumber: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
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

export default FamilyTab; 