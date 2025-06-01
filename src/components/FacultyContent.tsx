'use client';

import React, { useState, useEffect } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile } from 'react-icons/fa';
import { Search, Filter } from 'lucide-react';
import { fetchFacultyDocuments } from '../api/faculty-documents';

interface Faculty {
  FacultyId: number;
  UserId: string;
  DateOfBirth: string;
  Phone: string | null;
  Address: string | null;
  EmploymentStatus: string;
  HireDate: string;
  Resignation_Date: string | null;
  Position: string;
  DepartmentId: number;
  ContractId: number | null;
  User: {
    FirstName: string;
    LastName: string;
    Email: string;
    Photo: string;
  };
  Department: {
    DepartmentName: string;
  };
}

interface NewFaculty {
  FirstName: string;
  LastName: string;
  Email: string;
  Position: string;
  DepartmentId: number;
  EmploymentStatus: string;
  HireDate: string;
  DateOfBirth: string;
  Phone: string | null;
  Address: string | null;
  Photo: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface DocumentFacultyRow {
  DocumentID: number;
  FacultyID: number;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  file?: string;
}

const FacultyContent: React.FC = () => {
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement'>('facultyManagement');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newFaculty, setNewFaculty] = useState<NewFaculty>({
    FirstName: '',
    LastName: '',
    Email: '',
    Position: '',
    DepartmentId: 1,
    EmploymentStatus: 'Regular',
    HireDate: new Date().toISOString().split('T')[0],
    DateOfBirth: new Date().toISOString().split('T')[0],
    Phone: null,
    Address: null,
    Photo: ''
  });

  // Document management state
  const [documents, setDocuments] = useState<DocumentFacultyRow[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

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
    } catch (error: unknown) {
      console.error('Error fetching faculty:', error);
      setNotification({
        type: 'error',
        message: (error && typeof error === 'object' && 'message' in error)
          ? (error as { message?: string }).message || 'Failed to load faculty data'
          : 'Failed to load faculty data'
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
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newFaculty.FirstName,
          lastName: newFaculty.LastName,
          Email: newFaculty.Email,
          role: 'Faculty',
          facultyData: {
            Position: newFaculty.Position,
            DepartmentId: newFaculty.DepartmentId,
            EmploymentStatus: newFaculty.EmploymentStatus,
            HireDate: newFaculty.HireDate,
            DateOfBirth: newFaculty.DateOfBirth,
            Phone: newFaculty.Phone,
            Address: newFaculty.Address
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create faculty member');
      }

      setNewFaculty({
        FirstName: '',
        LastName: '',
        Email: '',
        Position: '',
        DepartmentId: 1,
        EmploymentStatus: 'Regular',
        HireDate: new Date().toISOString().split('T')[0],
        DateOfBirth: new Date().toISOString().split('T')[0],
        Phone: null,
        Address: null,
        Photo: ''
      });
      setIsFacultyModalOpen(false);

      await fetchFacultyData();

      setNotification({
        type: 'success',
        message: 'Faculty invitation sent successfully! The faculty member will receive an Email to complete their registration.'
      });
    } catch (error: unknown) {
      console.error('Error creating faculty:', error);
      setNotification({
        type: 'error',
        message: (error && typeof error === 'object' && 'message' in error)
          ? (error as { message?: string }).message || 'Failed to create faculty member'
          : 'Failed to create faculty member'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFacultyModal = () => {
    setIsFacultyModalOpen(true);
  };

  const handleOpenDocumentModal = () => {
    setIsDocumentModalOpen(true);
  };

  // Document management: fetch documents
  const fetchDocuments = async () => {
    setDocLoading(true);
    try {
      const data = await fetchFacultyDocuments();
      setDocuments(data);
    } catch (err) {
      setDocuments([]);
    }
    setDocLoading(false);
  };

  // Document management: update status
  const handleStatusChange = async (docId: number, newStatus: string) => {
    setStatusUpdating(docId);
    try {
      const res = await fetch(`/api/faculty-documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SubmissionStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchDocuments();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  useEffect(() => {
    if (activeView === 'documentManagement') {
      fetchDocuments();
    }
  }, [activeView]);

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
          <button className="p-2 border rounded-lg" title="Filter">
            <Filter className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Faculty Table */}
      {activeView === 'facultyManagement' && (
        loading ? (
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
                {facultyList.map((Faculty) => (
                  <tr key={Faculty.FacultyId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={Faculty.User.Photo || '/default-avatar.png'}
                            alt={`${Faculty.User.FirstName} ${Faculty.User.LastName}`}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {Faculty.User.FirstName} {Faculty.User.LastName}
                          </div>
                          <div className="text-sm text-gray-500">{Faculty.User.Email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Faculty.Position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Faculty.Department.DepartmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        Faculty.EmploymentStatus === 'Regular'
                          ? 'bg-green-100 text-green-800'
                          : Faculty.EmploymentStatus === 'Probationary'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {Faculty.EmploymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button title="Edit"className="text-indigo-600 hover:text-indigo-900">
                          <FaPen />
                        </button>
                        <button title="Delete" className="text-red-600 hover:text-red-900">
                          <FaTrash />
                        </button>
                        <button title="Download" className="text-green-600 hover:text-green-900">
                          <FaDownload />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeView === 'documentManagement' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {docLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">Loading documents...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">No documents found.</td>
                </tr>
              ) : (
                documents.map((doc, idx) => (
                  <tr
                    key={doc.DocumentID}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{doc.FacultyID}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{doc.DocumentTypeID}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(doc.UploadDate).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                        ${
                          doc.SubmissionStatus === 'Approved'
                            ? 'bg-green-100 text-green-700'
                            : doc.SubmissionStatus === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : doc.SubmissionStatus === 'Submitted'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      `}>
                        {doc.SubmissionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={doc.SubmissionStatus}
                        onChange={e => handleStatusChange(doc.DocumentID, e.target.value)}
                        disabled={statusUpdating === doc.DocumentID}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
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
                  <label htmlFor="FirstName"className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    id='FirstName'
                    title="First Name"
                    type="text"
                    value={newFaculty.FirstName}
                    onChange={(e) => setNewFaculty({...newFaculty, FirstName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="LastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    title='Last Name'
                    id='LastName'
                    type="text"
                    value={newFaculty.LastName}
                    onChange={(e) => setNewFaculty({...newFaculty, LastName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="Email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="Email"
                    type="email"
                    value={newFaculty.Email}
                    onChange={(e) => setNewFaculty({...newFaculty, Email: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor='Position' className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    id='Position'
                    title='Position'
                    type="text"
                    value={newFaculty.Position}
                    onChange={(e) => setNewFaculty({...newFaculty, Position: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor='Department' className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    id='Department'
                    title='Department'
                    value={newFaculty.DepartmentId}
                    onChange={(e) => setNewFaculty({...newFaculty, DepartmentId: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="1">Department 1</option>
                    <option value="2">Department 2</option>
                  </select>
                </div>
                <div>
                  <label htmlFor='EmploymentStatus' className="block text-sm font-medium text-gray-700">Employment Status</label>
                  <select
                    id='EmploymentStatus'
                    title='Employment Status'
                    value={newFaculty.EmploymentStatus}
                    onChange={(e) => setNewFaculty({...newFaculty, EmploymentStatus: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="Regular">Regular</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label htmlFor='HireDate' className="block text-sm font-medium text-gray-700">Hire Date</label>
                  <input
                    id='HireDate'
                    title='Hire Date'
                    type="date"
                    value={newFaculty.HireDate}
                    onChange={(e) => setNewFaculty({...newFaculty, HireDate: e.target.value})}
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