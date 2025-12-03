import React from 'react';
import { Faculty, Department } from './types';

interface EditFacultyModalProps {
  isOpen: boolean;
  selectedFaculty: Faculty | null;
  editFaculty: Partial<Faculty>;
  loading: boolean;
  departments: Department[];
  onClose: () => void;
  onEditChange: (updates: Partial<Faculty>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EditFacultyModal: React.FC<EditFacultyModalProps> = ({
  isOpen,
  selectedFaculty,
  editFaculty,
  loading,
  departments,
  onClose,
  onEditChange,
  onSubmit
}) => {
  if (!isOpen || !selectedFaculty) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Faculty</h2>
          <button
            title="Close"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-4 mb-6 pb-4 border-b">
          <div className="h-16 w-16 flex-shrink-0">
            <img
              className="h-16 w-16 rounded-full object-cover border-2 border-[#800000]"
              src={selectedFaculty.User?.Photo || '/default-avatar.png'}
              alt={`${selectedFaculty.User?.FirstName || ''} ${selectedFaculty.User?.LastName || ''}`}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedFaculty.User?.FirstName || 'Unknown'} {selectedFaculty.User?.LastName || 'User'}
            </h3>
            <p className="text-sm text-gray-500">{selectedFaculty.User?.Email || 'No email'}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="Position" className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                id="Position"
                type="text"
                value={editFaculty.Position || ''}
                onChange={(e) => onEditChange({ ...editFaculty, Position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="Department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                id="Department"
                value={editFaculty.DepartmentID || ''}
                onChange={(e) => onEditChange({ ...editFaculty, DepartmentID: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.DepartmentID} value={dept.DepartmentID}>
                    {dept.DepartmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="EmploymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status
              </label>
              <select
                id="EmploymentStatus"
                value={editFaculty.EmploymentStatus || ''}
                onChange={(e) => onEditChange({ ...editFaculty, EmploymentStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                required
              >
                <option value="Regular">Regular</option>
                <option value="Under Probation">Under Probation</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>

            {editFaculty.EmploymentStatus === 'Resigned' && (
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="ResignationDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Resignation Date
                </label>
                <input
                  id="ResignationDate"
                  type="date"
                  value={editFaculty.ResignationDate || ''}
                  onChange={(e) => onEditChange({ ...editFaculty, ResignationDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-[#800000] rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFacultyModal;

