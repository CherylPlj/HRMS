'use client';

import React, { useState, useEffect } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaEye } from 'react-icons/fa';
import { Search } from 'lucide-react';
import { fetchFacultyDocuments } from '../api/faculty-documents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Faculty {
  FacultyID: number;
  UserID: number;
  Position: string;
  DepartmentID: number;
  EmploymentStatus: string;
  Resignation_Date: string | null;
  Phone: string | null;
  Address: string | null;
  User: {
    UserID: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Status: string;
    Photo: string;
    isDeleted: string;
  };
  Department: {
    DepartmentID: number;
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
  facultyName: string;
  documentTypeName: string;
  FilePath?: string;
  FileUrl?: string;
  DownloadUrl?: string;
  Faculty: {
    User: {
      FirstName: string;
      LastName: string;
      Email: string;
    };
  };
  DocumentType: {
    DocumentTypeID: number;
    DocumentTypeName: string;
  };
}

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
  AllowedFileTypes: string[] | null;
  Template: string | null;
}

interface NewDocument {
  DocumentTypeID: number;
  file: File | null;
  acceptedFileTypes: string[];
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

const FacultyContent: React.FC = () => {
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement'>('facultyManagement');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [filteredFacultyList, setFilteredFacultyList] = useState<Faculty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
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
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [newDocument, setNewDocument] = useState<NewDocument>({
    DocumentTypeID: 0,
    file: null,
    acceptedFileTypes: []
  });

  // New document management filter states
  const [selectedDocumentStatus, setSelectedDocumentStatus] = useState<string | 'all'>('all');
  const [selectedDocumentType, setSelectedDocumentType] = useState<number | 'all'>('all');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');

  // Edit and delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [editFaculty, setEditFaculty] = useState<Partial<Faculty>>({});

  // Fetch departments
  const [departments, setDepartments] = useState<Department[]>([]);

  // Add this line
  const [expandedFacultyId, setExpandedFacultyId] = useState<number | null>(null);

  // Fetch faculty data from the API endpoint
  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      console.log('Fetching faculty data...'); // Debug log
      const response = await fetch('/api/faculty');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load faculty data');
      }
      const data = await response.json();
      console.log('Raw faculty data from API:', data); // Debug log
      
      // Filter out faculty with deleted users
      const activeFaculty = data.filter((faculty: Faculty) => {
        console.log('Checking faculty:', {
          id: faculty.FacultyID,
          isDeleted: faculty.User?.isDeleted,
          status: faculty.User?.Status
        }); // Debug log for each faculty member
        return !faculty.User?.isDeleted;
      });
      
      console.log('Active faculty after filtering:', activeFaculty); // Debug log
      setFacultyList(activeFaculty);
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
    console.log('FacultyContent mounted, fetching data...'); // Debug log
    fetchFacultyData();
    fetchDocuments('all'); // Fetch all documents on initial mount for both views
  }, []);

  // Add debug logging for facultyList changes
  useEffect(() => {
    console.log('facultyList updated:', facultyList); // Debug log
  }, [facultyList]);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load departments'
      });
    }
  };

  // Load departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Add filter and search functionality
  useEffect(() => {
    let filtered = [...facultyList];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(faculty => 
        faculty.User?.FirstName?.toLowerCase().includes(searchLower) ||
        faculty.User?.LastName?.toLowerCase().includes(searchLower) ||
        faculty.User?.Email?.toLowerCase().includes(searchLower) ||
        faculty.Position?.toLowerCase().includes(searchLower)
      );
    }

    // Apply department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(faculty => 
        faculty.DepartmentID === selectedDepartment
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(faculty => 
        faculty.EmploymentStatus === selectedStatus
      );
    }

    setFilteredFacultyList(filtered);
  }, [facultyList, searchTerm, selectedDepartment, selectedStatus]);

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
  const fetchDocuments = async (facultyId: number | 'all' = 'all') => {
    setDocLoading(true);
    try {
      const data = await fetchFacultyDocuments(facultyId);
      console.log('Received documents data:', data);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  useEffect(() => {
    if (activeView === 'documentManagement') {
      fetchDocuments();
      fetchDocumentTypes(); // Fetch document types when document management is active
    }
  }, [activeView]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    if (activeView === 'facultyManagement') {
      // Add title for faculty list
      doc.setFontSize(16);
      doc.text('Faculty List', 14, 15);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      // Add department filter info
      doc.setFontSize(10);
      doc.text('Department: All Departments', 14, 29);

      // Prepare faculty table data with more details
      const tableData = facultyList.map(faculty => [
        `${faculty.User?.FirstName || 'Unknown'} ${faculty.User?.LastName || 'User'}`,
        faculty.User?.Email || 'No email',
        faculty.Position,
        faculty.Department.DepartmentName,
        faculty.EmploymentStatus,
        faculty.Phone || 'N/A',
        faculty.Address || 'N/A'
      ]);

      // Add faculty table with more columns
      autoTable(doc, {
        head: [['Name', 'Email', 'Position', 'Department', 'Status', 'Phone', 'Address']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [128, 0, 0] }, // Maroon color
        columnStyles: {
          0: { cellWidth: 30 }, // Name
          1: { cellWidth: 35 }, // Email
          2: { cellWidth: 25 }, // Position
          3: { cellWidth: 25 }, // Department
          4: { cellWidth: 20 }, // Status
          5: { cellWidth: 25 }, // Phone
          6: { cellWidth: 35 }  // Address
        }
      });

      // Add footer with total count
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(10);
      doc.text(`Total Faculty: ${facultyList.length}`, 14, finalY + 10);

      // Save the PDF
      doc.save('faculty-list.pdf');
    } else {
      // Add title for documents list
      doc.setFontSize(16);
      doc.text('Documents List', 14, 15);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      // Prepare documents table data
      const tableData = documents.map(doc => [
        doc.facultyName,
        doc.documentTypeName,
        new Date(doc.UploadDate).toLocaleDateString(),
        doc.SubmissionStatus
      ]);

      // Add documents table
      autoTable(doc, {
        head: [['Faculty Name', 'Document Type', 'Upload Date', 'Status']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [128, 0, 0] } // Maroon color
      });

      // Save the PDF
      doc.save('documents-list.pdf');
    }
  };

  // Fetch document types
  const fetchDocumentTypes = async () => {
    try {
      const response = await fetch('/api/document-types');
      if (!response.ok) throw new Error('Failed to fetch document types');
      const data = await response.json();
      setDocumentTypes(data);
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  useEffect(() => {
    if (isDocumentModalOpen) {
      fetchDocumentTypes();
    }
  }, [isDocumentModalOpen]);

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('DocumentTypeID', newDocument.DocumentTypeID.toString());
      if (newDocument.file) {
        formData.append('file', newDocument.file);
      }
      formData.append('acceptedFileTypes', JSON.stringify(newDocument.acceptedFileTypes));

      const response = await fetch('/api/faculty-documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');

      setNotification({
        type: 'success',
        message: 'Document uploaded successfully!'
      });
      setIsDocumentModalOpen(false);
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error uploading document:', error);
      setNotification({
        type: 'error',
        message: 'Failed to upload document'
      });
    }
  };

  const handleEditFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/faculty/${selectedFaculty.FacultyID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFaculty,
          UserID: selectedFaculty.UserID,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update faculty');
      }

      await fetchFacultyData();
      setIsEditModalOpen(false);
      setSelectedFaculty(null);
      setEditFaculty({});

      setNotification({
        type: 'success',
        message: 'Faculty updated successfully!'
      });
    } catch (error: unknown) {
      console.error('Error updating faculty:', error);
      setNotification({
        type: 'error',
        message: (error && typeof error === 'object' && 'message' in error)
          ? (error as { message?: string }).message || 'Failed to update faculty'
          : 'Failed to update faculty'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = async () => {
    if (!selectedFaculty) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/faculty/${selectedFaculty.FacultyID}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete faculty');
      }

      await fetchFacultyData();
      setIsDeleteModalOpen(false);
      setSelectedFaculty(null);

      setNotification({
        type: 'success',
        message: 'Faculty deleted successfully!'
      });
    } catch (error: unknown) {
      console.error('Error deleting faculty:', error);
      setNotification({
        type: 'error',
        message: (error && typeof error === 'object' && 'message' in error)
          ? (error as { message?: string }).message || 'Failed to delete faculty'
          : 'Failed to delete faculty'
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setEditFaculty({
      Position: faculty.Position,
      DepartmentID: faculty.DepartmentID,
      EmploymentStatus: faculty.EmploymentStatus,
      Resignation_Date: faculty.Resignation_Date,
      Phone: faculty.Phone,
      Address: faculty.Address,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsDeleteModalOpen(true);
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
          {activeView === 'documentManagement' && (
            <button
              onClick={handleOpenDocumentModal}
              className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
            >
              <FaFile /> Add Document
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
          >
            <FaDownload /> Download {activeView === 'facultyManagement' ? 'Faculty List' : 'Documents List'}
          </button>
        </div>
      </div>

      {/* Faculty Management: Search and Filter Section */}
      {activeView === 'facultyManagement' && (
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Filter Options for Faculty (always visible) */}
          <div className="bg-white p-4 rounded-lg shadow-md border flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000]"
                  title="Select Department"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.DepartmentID} value={dept.DepartmentID}>
                      {dept.DepartmentName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000]"
                  title="Select Employment Status"
                >
                  <option value="all">All Status</option>
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Management: Search and Filter Section */}
      {activeView === 'documentManagement' && (
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search documents..."
              value={documentSearchTerm}
              onChange={(e) => setDocumentSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Filter Options for Documents (always visible), reordered */}
          <div className="bg-white p-4 rounded-lg shadow-md border flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type Filter (moved before Status) */}
              <div>
                <label htmlFor="documentTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  id="documentTypeFilter"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000]"
                  title="Filter by Document Type"
                >
                  <option value="all">All Document Types</option>
                  {documentTypes.map((type) => (
                    <option key={type.DocumentTypeID} value={type.DocumentTypeID}>
                      {type.DocumentTypeName}
                    </option>
                  ))}
                </select>
              </div>
              {/* Status Filter */}
              <div>
                <label htmlFor="documentStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="documentStatusFilter"
                  value={selectedDocumentStatus}
                  onChange={(e) => setSelectedDocumentStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000]"
                  title="Filter by Submission Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    List of Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submission Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFacultyList.map((faculty) => {
                  const documentsForFaculty = documents.filter(doc => doc.FacultyID === faculty.FacultyID);
                  const submittedDocs = documentsForFaculty.filter(doc => doc.SubmissionStatus === 'Submitted');
                  const submittedCount = submittedDocs.length;
                  const totalCount = documentsForFaculty.length;

                  let facultySubmissionStatus = 'N/A';
                  if (totalCount > 0) {
                    if (submittedCount === totalCount) {
                      facultySubmissionStatus = 'Complete';
                    } else if (submittedCount > 0 && submittedCount < totalCount) {
                      facultySubmissionStatus = 'Incomplete';
                    } else {
                      facultySubmissionStatus = 'Pending';
                    }
                  }

                  return (
                    <React.Fragment key={faculty.FacultyID}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full"
                                src={faculty.User?.Photo || '/default-avatar.png'}
                                alt={`${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {faculty.User?.FirstName || 'Unknown'} {faculty.User?.LastName || 'User'}
                              </div>
                              <div className="text-sm text-gray-500">{faculty.User?.Email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {faculty.Position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {faculty.Department.DepartmentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>Submitted: {submittedCount}/{totalCount}</span>
                            {totalCount > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedFacultyId(expandedFacultyId === faculty.FacultyID ? null : faculty.FacultyID);
                                }}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                title={expandedFacultyId === faculty.FacultyID ? 'Collapse documents' : 'Expand documents'}
                              >
                                {expandedFacultyId === faculty.FacultyID ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            facultySubmissionStatus === 'Complete'
                              ? 'bg-green-100 text-green-800'
                              : facultySubmissionStatus === 'Incomplete'
                              ? 'bg-yellow-100 text-yellow-800'
                              : facultySubmissionStatus === 'Pending'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700' // For N/A
                          }`}>
                            {facultySubmissionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openEditModal(faculty)}
                              title="Edit" 
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <FaPen />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(faculty)}
                              title="Delete" 
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedFacultyId === faculty.FacultyID && ( /* Expanded row */
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="p-2 border rounded-md">
                              <h4 className="font-semibold text-gray-800 mb-2">Documents for {faculty.User?.FirstName} {faculty.User?.LastName}:</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {documentsForFaculty.length > 0 ? (
                                  documentsForFaculty.map((doc) => (
                                    <li key={doc.DocumentID} className="mb-1 flex justify-between items-center">
                                      <span>
                                        {doc.documentTypeName}: <span className={`font-medium ${
                                          doc.SubmissionStatus === 'Submitted' ? 'text-green-600' : 'text-red-600'
                                        }`}>{doc.SubmissionStatus}</span>
                                      </span>
                                      {doc.DownloadUrl && (
                                        <a
                                          href={doc.DownloadUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:underline flex items-center text-xs ml-auto"
                                          title="Download Document"
                                        >
                                          <FaDownload className="mr-1" /> Download
                                        </a>
                                      )}
                                    </li>
                                  ))
                                ) : (
                                  <li>No documents found for this faculty.</li>
                                )}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredFacultyList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No faculty members found matching your search criteria
                    </td>
                  </tr>
                )}
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
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty Name</th>
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
                documents
                  .filter(doc => 
                    (selectedDocumentStatus === 'all' || doc.SubmissionStatus === selectedDocumentStatus) &&
                    (selectedDocumentType === 'all' || doc.DocumentTypeID === selectedDocumentType) &&
                    (documentSearchTerm === '' || 
                     doc.facultyName.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
                     doc.documentTypeName.toLowerCase().includes(documentSearchTerm.toLowerCase()))
                  )
                  .map((doc, idx) => {
                    console.log('Rendering document:', doc);
                    return (
                      <tr
                        key={doc.DocumentID}
                        className="hover:bg-gray-100 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.facultyName || 'Unknown Faculty'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.documentTypeName || 'Unknown Type'}</td>
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
                        <td className="px-6 py-4 flex items-center space-x-2">
                          <select
                            title="Change Submission Status"
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
                          {doc.FileUrl && (
                            <a
                              href={doc.FileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900"
                              title="View Document"
                            >
                              <FaEye className="w-5 h-5" />
                            </a>
                          )}
                          {doc.DownloadUrl && (
                            <a
                              href={doc.DownloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900"
                              title="Download Document"
                            >
                              <FaDownload className="w-5 h-5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
            <form onSubmit={handleDocumentSubmit}>
              <div className="space-y-4">
                {/* Document Type Selection */}
                <div>
                  <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type
                  </label>
                  <select
                    id="documentType"
                    value={newDocument.DocumentTypeID}
                    onChange={(e) => setNewDocument({
                      ...newDocument,
                      DocumentTypeID: parseInt(e.target.value)
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    title="Select document type"
                  >
                    <option value="">Select Document Type</option>
                    {documentTypes.map((type) => (
                      <option key={type.DocumentTypeID} value={type.DocumentTypeID}>
                        {type.DocumentTypeName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Allowed File Types */}
                {newDocument.DocumentTypeID > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed File Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const selectedType = documentTypes.find(t => t.DocumentTypeID === newDocument.DocumentTypeID);
                        if (!selectedType) {
                          return (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              Document type not found
                            </span>
                          );
                        }
                        const fileTypes = selectedType.AllowedFileTypes || [];
                        return fileTypes.length > 0 ? (
                          fileTypes.map((type) => (
                            <span key={type} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                            No file types specified
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div>
                  <label htmlFor="documentFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Template
                  </label>
                  <input
                    id="documentFile"
                    type="file"
                    onChange={(e) => setNewDocument({
                      ...newDocument,
                      file: e.target.files?.[0] || null
                    })}
                    className="w-full"
                    required
                    title="Upload document template"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDocumentModalOpen(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {isEditModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Faculty</h2>
              <button
                title="Close"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedFaculty(null);
                  setEditFaculty({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditFaculty} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="Position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    id="Position"
                    type="text"
                    value={editFaculty.Position || ''}
                    onChange={(e) => setEditFaculty({...editFaculty, Position: e.target.value})}
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
                    onChange={(e) => setEditFaculty({...editFaculty, DepartmentID: parseInt(e.target.value)})}
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
                    onChange={(e) => setEditFaculty({...editFaculty, EmploymentStatus: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                    required
                  >
                    <option value="Hired">Hired</option>
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
                      value={editFaculty.Resignation_Date || ''}
                      onChange={(e) => setEditFaculty({...editFaculty, Resignation_Date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="Phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="Phone"
                    type="tel"
                    value={editFaculty.Phone || ''}
                    onChange={(e) => setEditFaculty({...editFaculty, Phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="Address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    id="Address"
                    type="text"
                    value={editFaculty.Address || ''}
                    onChange={(e) => setEditFaculty({...editFaculty, Address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedFaculty(null);
                    setEditFaculty({});
                  }}
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
      )}

      {/* Delete Faculty Modal */}
      {isDeleteModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Faculty</h2>
            <p className="mb-4">
              Are you sure you want to delete {selectedFaculty.User?.FirstName || 'Unknown'} {selectedFaculty.User?.LastName || 'User'}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedFaculty(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFaculty}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyContent;