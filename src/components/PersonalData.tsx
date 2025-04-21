import React from 'react';
import { FaDownload, FaEdit, FaTrash } from 'react-icons/fa';

const PersonalData: React.FC = () => {
  return (
    <div className="p-6 bg-white border border-red-700 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Personal Data</h1>
        <div className="flex space-x-2">
          <button className="bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800">
            <FaDownload /> Download
          </button>
          <button className="bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800">
            <FaEdit /> Edit
          </button>
          <button className="bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800">
            <FaTrash /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-red-700 p-4 rounded-lg">
        {/* Left Column */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <div className="bg-gray-100 p-2 rounded">Jane Smith</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className="bg-gray-100 p-2 rounded">October 1, 2000</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Contact Information</label>
            <div className="bg-gray-100 p-2 rounded">09912345678</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <div className="bg-gray-100 p-2 rounded">
              Don Fabian, Commonwealth, Quezon City
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <div className="bg-gray-100 p-2 rounded">
              Marilyn C. Smith - 099912345678
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Faculty ID</label>
            <div className="bg-gray-100 p-2 rounded">2025-0001-SJSFI</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <div className="bg-gray-100 p-2 rounded">IT</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Employment Status</label>
            <div className="bg-gray-100 p-2 rounded">Regular</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <div className="bg-gray-100 p-2 rounded">March 26, 2025</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <div className="bg-gray-100 p-2 rounded">March 26, 2030</div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Years of Service</label>
            <div className="bg-gray-100 p-2 rounded">5 years</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalData;