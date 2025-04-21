import React, { useState } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaFilter } from 'react-icons/fa';

type Faculty = {
  id: string;
  name: string;
  position: string;
  department: string;
  status: string;
  image: string;
};

const facultyData: Faculty[] = [
  {
    id: '2025-0001-SJSFI',
    name: 'Maria Reyes',
    position: 'Elementary Math Teacher',
    department: 'Math',
    status: 'Regular',
    image: '/avatar1.png',
  },
  {
    id: '2025-0002-SJSFI',
    name: 'John Dela Cruz',
    position: 'Secondary English Teacher',
    department: 'English',
    status: 'Regular',
    image: '/avatar2.png',
  },
  {
    id: '2025-0003-SJSFI',
    name: 'Angela Santos',
    position: 'Secondary Science Teacher',
    department: 'Science',
    status: 'Regular',
    image: '/avatar3.png',
  },
];

const FacultyContent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility

  const handleOpenModal = () => {
    setIsModalOpen(true); // Open the modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Faculty Management</h2>
        <div className="space-x-2">
          <button className="bg-red-700 text-white px-4 py-2 rounded">
            <FaFile className="inline mr-1" /> Documents
          </button>
          <button className="bg-red-700 text-white px-4 py-2 rounded">
            <FaDownload className="inline mr-1" /> Download
          </button>
          <button
            className="bg-red-700 text-white px-4 py-2 rounded"
            onClick={handleOpenModal} // Open the modal when clicked
          >
            <FaPlus className="inline mr-1" /> Add Faculty
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search..."
        className="w-full p-2 border border-red-400 rounded mb-4"
      />

      <table className="w-full text-left border border-red-200">
        <thead className="bg-gray-100">
          <tr>
            <th>#</th>
            <th>Faculty ID</th>
            <th>Image</th>
            <th>Name</th>
            <th>Position</th>
            <th>Department</th>
            <th>Employment Status</th>
            <th>
              <FaFilter />
            </th>
          </tr>
        </thead>
        <tbody>
          {facultyData.map((faculty, index) => (
            <tr key={faculty.id} className="border-b">
              <td>{index + 1}</td>
              <td>{faculty.id}</td>
              <td>
                <img src={faculty.image} className="w-8 h-8 rounded-full" alt="avatar" />
              </td>
              <td>{faculty.name}</td>
              <td>{faculty.position}</td>
              <td>{faculty.department}</td>
              <td>{faculty.status}</td>
              <td className="space-x-2">
                <button className="text-blue-600" title="Edit">
                  <FaPen />
                </button>
                <button className="text-red-600" title="Delete">
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Faculty Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-700">ADD FACULTY</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={handleCloseModal} // Close the modal
              >
                ✕
              </button>
            </div>
            <form>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter full name"
              />
            </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter email"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter position"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter department"
                />
              </div>
              <div className="mb-4">
                {/* <label className="block text-sm font-medium text-gray-700">Employment Status *</label> */}
                <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select id="employmentStatus" className="w-full p-2 border border-gray-300 rounded">
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>
              <div className="flex justify-between gap-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded"
                    title="Select start date"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input type="date" className="w-full p-2 border border-gray-300 rounded" title="Select end date" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Picture <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".jpg,.png"
                  className="w-full p-2 border border-gray-300 rounded"
                  title="Upload a picture (JPG or PNG)"
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked/>
                  Create a User Account
                </label>
              </div>
              <button
                type="submit"
                className="w-full bg-red-700 text-white font-semibold py-2 rounded hover:bg-red-800"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyContent;