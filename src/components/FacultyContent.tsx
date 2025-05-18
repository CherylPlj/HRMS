'use client';

import React, { useState, useEffect } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaFilter } from 'react-icons/fa';
import { Search, Filter } from 'lucide-react';

interface Faculty {
  faculty_id: number;
  user_id: string;
  date_of_birth: string;
  phone: string | null;
  address: string | null;
  employment_status: string;
  hire_date: string;
  resignation_date: string | null;
  position: string;
  department_id: number;
  contract_id: number | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    photo: string;
  };
  department: {
    name: string;
  };
}

interface NewFaculty {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_id: number;
  employment_status: string;
  hire_date: string;
  date_of_birth: string;
  phone: string | null;
  address: string | null;
  photo: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const FacultyContent: React.FC = () => {
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement'>('facultyManagement');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newFaculty, setNewFaculty] = useState<NewFaculty>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department_id: 1,
    employment_status: 'Regular',
    hire_date: new Date().toISOString().split('T')[0],
    date_of_birth: new Date().toISOString().split('T')[0],
    phone: null,
    address: null,
    photo: ''
  });

  // Fetch faculty data from the API endpoint
  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/faculty');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load faculty data');
      }

      const data = await response.json();
      setFacultyList(data);
      setNotification(null);
    } catch (error: any) {
      console.error('Error fetching faculty:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to load faculty data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load faculty data on component mount
  useEffect(() => {
    fetchFacultyData();
  }, []);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Create user and faculty through the API
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newFaculty.first_name,
          lastName: newFaculty.last_name,
          email: newFaculty.email,
          role: 'Faculty',
          // Additional faculty-specific fields
          facultyData: {
            position: newFaculty.position,
            department_id: newFaculty.department_id,
            employment_status: newFaculty.employment_status,
            hire_date: newFaculty.hire_date,
            date_of_birth: newFaculty.date_of_birth,
            phone: newFaculty.phone,
            address: newFaculty.address
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create faculty member');
      }

      // Reset form and close modal
      setNewFaculty({
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        department_id: 1,
        employment_status: 'Regular',
        hire_date: new Date().toISOString().split('T')[0],
        date_of_birth: new Date().toISOString().split('T')[0],
        phone: null,
        address: null,
        photo: ''
      });
      setIsFacultyModalOpen(false);

      // Refresh faculty list
      await fetchFacultyData();

      setNotification({
        type: 'success',
        message: 'Faculty invitation sent successfully! The faculty member will receive an email to complete their registration.'
      });
    } catch (error: any) {
      console.error('Error creating faculty:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create faculty member'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFacultyModal = () => {
    setIsFacultyModalOpen(true); // Open the Add Faculty modal
  };

  const handleCloseFacultyModal = () => {
    setIsFacultyModalOpen(false); // Close the Add Faculty modal
  };

  const handleOpenDocumentModal = () => {
    setIsDocumentModalOpen(true); // Open the Add Document modal
  };

  const handleCloseDocumentModal = () => {
    setIsDocumentModalOpen(false); // Close the Add Document modal
  };

  return (
    <div className="p-6">
      {notification && (
        <div className={`mb-4 p-4 rounded ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveView('facultyManagement')}
            className={`px-4 py-2 rounded ${
              activeView === 'facultyManagement'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Faculty Management
          </button>
          <button
            onClick={() => setActiveView('documentManagement')}
            className={`px-4 py-2 rounded ${
              activeView === 'documentManagement'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Document Management
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleOpenFacultyModal}
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
          >
            <FaPlus /> Add Faculty
          </button>
          <button
            onClick={handleOpenDocumentModal}
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
          >
            <FaFile /> Add Document
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search faculty..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button className="p-2 border rounded-lg">
            <Filter className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Faculty Table */}
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {facultyList.map((faculty) => (
                <tr key={faculty.faculty_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={faculty.user.photo || '/default-avatar.png'}
                          alt={`${faculty.user.first_name} ${faculty.user.last_name}`}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {faculty.user.first_name} {faculty.user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{faculty.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {faculty.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {faculty.department.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      faculty.employment_status === 'Regular'
                        ? 'bg-green-100 text-green-800'
                        : faculty.employment_status === 'Probationary'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {faculty.employment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <FaPen />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <FaTrash />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <FaDownload />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Faculty Modal */}
      {isFacultyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Faculty</h2>
            <form onSubmit={handleAddFaculty}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={newFaculty.first_name}
                    onChange={(e) => setNewFaculty({...newFaculty, first_name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={newFaculty.last_name}
                    onChange={(e) => setNewFaculty({...newFaculty, last_name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newFaculty.email}
                    onChange={(e) => setNewFaculty({...newFaculty, email: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    value={newFaculty.position}
                    onChange={(e) => setNewFaculty({...newFaculty, position: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    value={newFaculty.department_id}
                    onChange={(e) => setNewFaculty({...newFaculty, department_id: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="1">Department 1</option>
                    <option value="2">Department 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employment Status</label>
                  <select
                    value={newFaculty.employment_status}
                    onChange={(e) => setNewFaculty({...newFaculty, employment_status: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="Regular">Regular</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                  <input
                    type="date"
                    value={newFaculty.hire_date}
                    onChange={(e) => setNewFaculty({...newFaculty, hire_date: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFacultyModalOpen(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Document</h2>
            {/* Document form fields will go here */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800">
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyContent;