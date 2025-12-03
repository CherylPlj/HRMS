import React from 'react';
import { Faculty } from './types';

interface ViewFacultyDetailsModalProps {
  isOpen: boolean;
  selectedFacultyDetails: Faculty | null;
  onClose: () => void;
}

const ViewFacultyDetailsModal: React.FC<ViewFacultyDetailsModalProps> = ({
  isOpen,
  selectedFacultyDetails,
  onClose
}) => {
  if (!isOpen || !selectedFacultyDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Faculty Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <img
                  src={selectedFacultyDetails.User?.Photo || '/default-avatar.png'}
                  alt={`${selectedFacultyDetails.User?.FirstName} ${selectedFacultyDetails.User?.LastName}`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#800000]"
                />
                <div className="ml-4">
                  <h4 className="text-xl font-semibold">
                    {selectedFacultyDetails.User?.FirstName} {selectedFacultyDetails.User?.LastName}
                  </h4>
                  <p className="text-gray-600">{selectedFacultyDetails.User?.Email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium">{selectedFacultyDetails.DateOfBirth || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium">{selectedFacultyDetails.Gender || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marital Status</p>
                  <p className="font-medium">{selectedFacultyDetails.MaritalStatus || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nationality</p>
                  <p className="font-medium">{selectedFacultyDetails.Nationality || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{selectedFacultyDetails.Phone || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium">{selectedFacultyDetails.Address || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency Contact</p>
                <p className="font-medium">{selectedFacultyDetails.EmergencyContact || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Employment Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-medium">{selectedFacultyDetails.Position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium">{selectedFacultyDetails.Department?.DepartmentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employment Status</p>
                <p className="font-medium">{selectedFacultyDetails.EmploymentStatus}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hire Date</p>
                <p className="font-medium">{selectedFacultyDetails.HireDate || 'Not specified'}</p>
              </div>
              {selectedFacultyDetails.EmploymentStatus === 'Resigned' && (
                <div>
                  <p className="text-sm text-gray-600">Resignation Date</p>
                  <p className="font-medium">{selectedFacultyDetails.ResignationDate || 'Not specified'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Years of Service</p>
                <p className="font-medium">
                  {selectedFacultyDetails.HireDate
                    ? `${Math.floor(
                        (new Date().getTime() - new Date(selectedFacultyDetails.HireDate).getTime()) /
                          (1000 * 60 * 60 * 24 * 365)
                      )} years`
                    : 'Not available'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewFacultyDetailsModal;

