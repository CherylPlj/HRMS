'use client';

import React, { useState, useEffect } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaEye, FaLink } from 'react-icons/fa';
import { Search } from 'lucide-react';
import { fetchFacultyDocuments } from '../api/faculty-documents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import dynamic from 'next/dynamic';

// Dynamically import PDFViewer component
const PDFViewer = dynamic(() => import('./PDFViewer'), { ssr: false });

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

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

// Add this helper function near the top, after other helpers
const getDirectImageUrl = (url: string) => {
  // Google Drive share link pattern
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view.*/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  // Already a direct link or not a Drive link
  return url;
};

// Add this helper to detect doc/docx files
const isDocFile = (url: string) => {
  return /\.(docx?|DOCX?)$/i.test(url) || url.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || url.includes('application/msword');
};

// Add this helper to get a direct download link for Google Drive docs
const getDirectDocUrl = (url: string) => {
  // Google Drive share link pattern
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view.*/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
};

// Add this helper to convert Google Docs edit links to export links
const getGoogleDocsExportUrl = (url: string, format: 'pdf' | 'docx') => {
  // Match Google Docs edit link
  const match = url.match(/https?:\/\/docs\.google\.com\/document\/d\/([\w-]+)\//);
  if (match && match[1]) {
    return `https://docs.google.com/document/d/${match[1]}/export?format=${format}`;
  }
  return url;
};

const getDirectDriveUrl = (url: string) => {
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

// Add helper to detect Google Docs edit links
const isGoogleDoc = (url: string) => {
  return /https?:\/\/docs\.google\.com\/document\/d\//.test(url);
};

// Add helper to get Google Docs export link
const getGoogleDocExportUrl = (url: string, format: 'pdf' | 'docx') => {
  const match = url.match(/https?:\/\/docs\.google\.com\/document\/d\/([\w-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/document/d/${match[1]}/export?format=${format}`;
  }
  return url;
};

const FacultyContent: React.FC = () => {
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement'>('facultyManagement');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
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

  // Add new state for selected rows
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Add new state for status update confirmation
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    docId: number;
    newStatus: string;
    facultyName: string;
    documentType: string;
  } | null>(null);

  // Add new state for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);

  // Add new state for document viewer
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFacultyRow | null>(null);

  // Add new state for PDF navigation
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [viewerError, setViewerError] = useState(false);

  // Add New Document Type Modal state
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);
  const [docTypeName, setDocTypeName] = useState('');
  const [docTypeError, setDocTypeError] = useState<string | null>(null);
  const [addingDocType, setAddingDocType] = useState(false);

  // Add at the top with other useState hooks
  const [showDocTypeListModal, setShowDocTypeListModal] = useState(false);
  const [isDeletingDocType, setIsDeletingDocType] = useState(false);

  // Add state at the top
  const [showDocTypeSuccessModal, setShowDocTypeSuccessModal] = useState(false);
  const [docTypeSuccessMessage, setDocTypeSuccessMessage] = useState('');

  // Add new state for delete confirmation
  const [isDeleteDocTypeModalOpen, setIsDeleteDocTypeModalOpen] = useState(false);
  const [docTypeToDelete, setDocTypeToDelete] = useState<DocumentType | null>(null);
  const [deleteDocTypeConfirmation, setDeleteDocTypeConfirmation] = useState('');
  const [isDeleteDocTypeConfirmed, setIsDeleteDocTypeConfirmed] = useState(false);

  // Add new state for checking if doc type is referenced
  const [isDocTypeReferenced, setIsDocTypeReferenced] = useState(false);

  // Document type validation function
  const validateDocumentType = (value: string) => {
    // Only allow alphanumeric and spaces, min 3 chars, no repeated letters/symbols (4+), must be unique
    if (!/^[a-zA-Z0-9 ]+$/.test(value)) {
      return 'Only alphanumeric characters and spaces are allowed.';
    }
    if (value.length < 3) {
      return 'Document Type must be at least 3 characters.';
    }
    // Prevent 4 or more repeated letters or symbols (e.g., "aaaa", "!!!!", "aaaaa")
    if (/(.)\1{3,}/.test(value.replace(/ /g, ''))) {
      return 'No more than three repeated characters or symbols in a row.';
    }
    // Must be unique (case-insensitive)
    if (documentTypes.some(dt => dt.DocumentTypeName.toLowerCase() === value.trim().toLowerCase())) {
      return 'This document type already exists.';
    }
    return null;
  };

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

  // Modify the status change handler
  const handleStatusChange = (docId: number, newStatus: string) => {
    const doc = documents.find(d => d.DocumentID === docId);
    if (!doc) return;

    setPendingStatusUpdate({
      docId,
      newStatus,
      facultyName: doc.facultyName,
      documentType: doc.documentTypeName
    });
    setIsStatusUpdateModalOpen(true);
  };

  // Add new handler for confirmed status update
  const handleConfirmedStatusUpdate = async () => {
    if (!pendingStatusUpdate) return;

    setStatusUpdating(pendingStatusUpdate.docId);
    try {
      const res = await fetch(`/api/faculty-documents/${pendingStatusUpdate.docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SubmissionStatus: pendingStatusUpdate.newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchDocuments();
      setNotification({
        type: 'success',
        message: 'Document status updated successfully'
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setNotification({
        type: 'error',
        message: 'Failed to update document status'
      });
    } finally {
      setStatusUpdating(null);
      setIsStatusUpdateModalOpen(false);
      setPendingStatusUpdate(null);
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
    if (isFacultyModalOpen) {
      fetchDocumentTypes();
    }
  }, [isFacultyModalOpen]);

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

  // Add effect to check if confirmation matches
  useEffect(() => {
    if (selectedFaculty) {
      const fullName = `${selectedFaculty.User?.FirstName} ${selectedFaculty.User?.LastName}`;
      setIsDeleteConfirmed(deleteConfirmation === fullName);
    }
  }, [deleteConfirmation, selectedFaculty]);

  // Modify delete handler to reset confirmation
  const handleDeleteFaculty = async () => {
    if (!selectedFaculty || !isDeleteConfirmed) return;

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
      setDeleteConfirmation('');
      setIsDeleteConfirmed(false);

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

  // Add handler for row selection
  const handleRowSelect = (facultyId: number) => {
    setSelectedRows(prev => {
      if (prev.includes(facultyId)) {
        return prev.filter(id => id !== facultyId);
      } else {
        return [...prev, facultyId];
      }
    });
  };

  // Add handler for select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredFacultyList.map(faculty => faculty.FacultyID));
    }
    setSelectAll(!selectAll);
  };

  // Add handler for downloading selected rows
  const handleDownloadSelected = () => {
    if (selectedRows.length === 0) {
      setNotification({
        type: 'error',
        message: 'Please select at least one faculty member to download'
      });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Selected Faculty List', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const selectedFaculty = filteredFacultyList.filter(faculty => 
      selectedRows.includes(faculty.FacultyID)
    );

    const tableData = selectedFaculty.map(faculty => [
      `${faculty.User?.FirstName || 'Unknown'} ${faculty.User?.LastName || 'User'}`,
      faculty.User?.Email || 'No email',
      faculty.Position,
      faculty.Department.DepartmentName,
      faculty.EmploymentStatus,
      faculty.Phone || 'N/A',
      faculty.Address || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Name', 'Email', 'Position', 'Department', 'Status', 'Phone', 'Address']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [128, 0, 0] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 35 }
      }
    });

    doc.save('selected-faculty-list.pdf');
  };


  // Add new handler for viewing documents
  const handleViewDocument = (doc: DocumentFacultyRow) => {
    setSelectedDocument(doc);
    setIsViewerModalOpen(true);
  };

  // Add handler for closing viewer
  const handleCloseViewer = () => {
    setIsViewerModalOpen(false);
    setSelectedDocument(null);
  };

  // Add handlers for PDF navigation
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages || 1);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  // Add function to check if file is PDF
  const isPdfFile = (url: string) => {
    return url.toLowerCase().endsWith('.pdf');
  };

  const isImageFile = (url: string) => {
    return /\.(png|jpe?g|gif|bmp|webp)$/i.test(url);
  };

  // Validation function for document type name
  const validateDocTypeName = (value: string) => {
    if (!/^[a-zA-Z0-9 ]+$/.test(value)) {
      return 'Only alphanumeric characters and spaces are allowed.';
    }
    if (value.length < 3) {
      return 'Document Type must be at least 3 characters.';
    }
    if (/(.)\1{3,}/.test(value.replace(/ /g, ''))) {
      return 'No more than three repeated characters or symbols in a row.';
    }
    if (documentTypes.some(dt => dt.DocumentTypeName.toLowerCase() === value.trim().toLowerCase())) {
      return 'This document type already exists.';
    }
    return null;
  };

  // Replace open modal logic
  const openAddDocTypeModal = () => {
    setEditingDocType(null);
    setDocTypeName('');
    setDocTypeError(null);
    setIsDocTypeModalOpen(true);
  };
  const openEditDocTypeModal = (docType: DocumentType) => {
    setEditingDocType(docType);
    setDocTypeName(docType.DocumentTypeName);
    setDocTypeError(null);
    setIsDocTypeModalOpen(true);
  };

  // Replace the Add Document Type Modal with the following:
  const handleAddOrEditDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingDocType(true);
    setDocTypeError(null);
    const error = validateDocTypeName(docTypeName.trim());
    if (error) {
      setDocTypeError(error);
      setAddingDocType(false);
      return;
    }
    try {
      let res, data;
      if (editingDocType) {
        res = await fetch(`/api/document-types/${editingDocType.DocumentTypeID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DocumentTypeName: docTypeName.trim() })
        });
      } else {
        res = await fetch('/api/document-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DocumentTypeName: docTypeName.trim(), AllowedFileTypes: [], Template: null })
        });
      }
      if (!res.ok) {
        const err = await res.json();
        setDocTypeError(err.error || 'Failed to save document type.');
        setAddingDocType(false);
        return;
      }
      data = await res.json();
      if (editingDocType) {
        setDocumentTypes(prev => prev.map(dt => dt.DocumentTypeID === data.DocumentTypeID ? data : dt));
        setDocTypeSuccessMessage('Document type updated successfully!');
        setShowDocTypeSuccessModal(true);
      } else {
        setDocumentTypes(prev => [...prev, data]);
        setDocTypeSuccessMessage('Document type added successfully!');
        setShowDocTypeSuccessModal(true);
      }
      setIsDocTypeModalOpen(false);
      setDocTypeName('');
      setEditingDocType(null);
    } catch (err) {
      setDocTypeError('Failed to save document type.');
    } finally {
      setAddingDocType(false);
    }
  };

  // Handler for deleting document type
  const handleDeleteDocType = async (docType: DocumentType) => {
    setIsDeletingDocType(true);
    try {
      const res = await fetch(`/api/document-types/${docType.DocumentTypeID}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Failed to delete document type.' });
        setIsDeleteDocTypeModalOpen(false);
        setDocTypeToDelete(null);
        setDeleteDocTypeConfirmation('');
        setIsDeleteDocTypeConfirmed(false);
        setIsDocTypeReferenced(false);
        return;
      }
      setDocumentTypes(prev => prev.filter(dt => dt.DocumentTypeID !== docType.DocumentTypeID));
      setNotification({ type: 'success', message: 'Document type deleted successfully!' });
      setIsDeleteDocTypeModalOpen(false);
      setDocTypeToDelete(null);
      setDeleteDocTypeConfirmation('');
      setIsDeleteDocTypeConfirmed(false);
      setIsDocTypeReferenced(false);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to delete document type.' });
      setIsDeleteDocTypeModalOpen(false);
      setDocTypeToDelete(null);
      setDeleteDocTypeConfirmation('');
      setIsDeleteDocTypeConfirmed(false);
      setIsDocTypeReferenced(false);
    } finally {
      setIsDeletingDocType(false);
    }
  };

  return (
    <div className="p-6">
      {notification && (
        <div className={`mb-4 p-4 rounded flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 text-xl font-bold focus:outline-none hover:text-black"
            title="Close notification"
            aria-label="Close notification"
            type="button"
          >
            ×
          </button>
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
            Faculty Information
          </button>
          <button
            onClick={() => setActiveView('documentManagement')}
            className={`px-4 py-2 rounded ${
              activeView === 'documentManagement'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Document Requirements
          </button>
        </div>
        <div className="flex space-x-2">
          
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
        <div className="mb-6 flex items-center gap-4">
          <div className="relative w-80">
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
          <div className="flex items-center gap-4 flex-grow">
            <div className="w-64">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
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
            <div className="w-64">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
                  title="Select Employment Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            <button
              onClick={handleDownloadSelected}
              className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800 ml-auto"
              disabled={selectedRows.length === 0}
            >
              <FaDownload /> Download Selected ({selectedRows.length})
            </button>
          </div>
        </div>
      )}

      {/* Document Management: Search and Filter Section */}
      {activeView === 'documentManagement' && (
        <div className="mb-6 flex items-center gap-4">
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search documents..."
              value={documentSearchTerm}
              onChange={(e) => setDocumentSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Filter Options for Documents (always visible) */}
          <div className="flex items-center gap-4 flex-grow">
            <div className="w-64">
                <select
                  id="documentTypeFilter"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
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
            <div className="w-64">
                <select
                  id="documentStatusFilter"
                  value={selectedDocumentStatus}
                  onChange={(e) => setSelectedDocumentStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
                  title="Filter by Submission Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            <button
              className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
              onClick={openAddDocTypeModal}
            >
              <FaPlus /> Add New Document Type
            </button>
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-300 border border-gray-300"
              onClick={() => setShowDocTypeListModal(true)}
              title="Manage Document Types"
              type="button"
            >
              <FaPen /> / <FaTrash/>
            </button>
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
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                      title="Select all faculty members"
                    />
                  </th>
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
                  const submittedDocs = documentsForFaculty.filter(doc => 
                    doc.SubmissionStatus === 'Submitted' || doc.SubmissionStatus === 'Approved'
                  );
                  const submittedCount = submittedDocs.length;
                  const totalCount = documentsForFaculty.length;

                  // Add sorting function for documents
                  const getStatusOrder = (status: string) => {
                    switch (status) {
                      case 'Submitted': return 1;
                      case 'Rejected': return 2;
                      case 'Approved': return 3;
                      default: return 4;
                    }
                  };

                  const sortedDocuments = [...documentsForFaculty].sort((a, b) => {
                    const statusOrderA = getStatusOrder(a.SubmissionStatus);
                    const statusOrderB = getStatusOrder(b.SubmissionStatus);
                    
                    if (statusOrderA !== statusOrderB) {
                      return statusOrderA - statusOrderB;
                    }
                    
                    // If status is the same, sort by date (newest first)
                    return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
                  });

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
                      <tr className={`hover:bg-gray-50 ${selectedRows.includes(faculty.FacultyID) ? 'bg-gray-100' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(faculty.FacultyID)}
                            onChange={() => handleRowSelect(faculty.FacultyID)}
                            className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                            title={`Select ${faculty.User?.FirstName} ${faculty.User?.LastName}`}
                          />
                        </td>
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
                              ? 'bg-emerald-100 text-emerald-800'
                              : facultySubmissionStatus === 'Incomplete'
                              ? 'bg-amber-100 text-amber-800'
                              : facultySubmissionStatus === 'Pending'
                              ? 'bg-slate-100 text-slate-800'
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
                                {sortedDocuments.length > 0 ? (
                                  sortedDocuments.map((doc) => (
                                    <li key={doc.DocumentID} className="mb-1 flex justify-between items-center">
                                      <span>
                                        {doc.documentTypeName}: <span className={`font-medium ${
                                          doc.SubmissionStatus === 'Approved' 
                                            ? 'text-emerald-600'
                                            : doc.SubmissionStatus === 'Submitted'
                                            ? 'text-blue-600'
                                            : doc.SubmissionStatus === 'Rejected'
                                            ? 'text-red-600'
                                            : 'text-slate-600'
                                        }`}>{doc.SubmissionStatus}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          ({new Date(doc.UploadDate).toLocaleDateString()})
                                        </span>
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

      {/* Document Management Table */}
      {activeView === 'documentManagement' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {/* Removed select all checkbox for documents */}
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
                  .sort((a, b) => {
                    // Custom order: Submitted (1), Pending (2), Rejected (3), Approved (4)
                    const getStatusOrder = (status: string) => {
                      switch (status) {
                        case 'Submitted': return 1;
                        case 'Rejected': return 2;
                        case 'Approved': return 3;
                        default: return 4;
                      }
                    };
                    const orderA = getStatusOrder(a.SubmissionStatus);
                    const orderB = getStatusOrder(b.SubmissionStatus);
                    if (orderA !== orderB) {
                      return orderA - orderB;
                    }
                    // If same status, sort by date (newest first)
                    return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
                  })
                  .map((doc, idx) => {
                    return (
                      <tr
                        key={doc.DocumentID}
                        className="hover:bg-gray-100 transition-colors"
                      >
                        {/* Removed document selection checkbox */}
                        <td className="px-6 py-4 text-sm text-gray-700">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.facultyName || 'Unknown Faculty'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.documentTypeName || 'Unknown Type'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{new Date(doc.UploadDate).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                            ${
                              doc.SubmissionStatus === 'Approved'
                                ? 'bg-green-100 text-green-800'
                                : doc.SubmissionStatus === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : doc.SubmissionStatus === 'Submitted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-900' // For Pending
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
                            <option value="Submitted">Submitted</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                          {doc.FileUrl && (
                            <span className="flex items-center space-x-1">
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="text-gray-600 hover:text-gray-900"
                                title="View Document"
                              >
                                <FaEye className="w-5 h-5" />
                              </button>
                              <a
                                href={doc.FileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-900"
                                title="Open in New Tab"
                              >
                                <FaLink className="w-5 h-5" />
                              </a>
                            </span>
                          )}
                          {doc.DownloadUrl && (
                            <a
                              href={doc.DownloadUrl}
                              download
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

            {/* Faculty Info Header */}
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Faculty</h2>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedFaculty(null);
                  setDeleteConfirmation('');
                  setIsDeleteConfirmed(false);
                }}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 flex-shrink-0">
                  <img
                    className="h-12 w-12 rounded-full object-cover border-2 border-red-500"
                    src={selectedFaculty.User?.Photo || '/default-avatar.png'}
                    alt={`${selectedFaculty.User?.FirstName || ''} ${selectedFaculty.User?.LastName || ''}`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedFaculty.User?.FirstName} {selectedFaculty.User?.LastName}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedFaculty.User?.Email}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800 mb-2">
                  This action cannot be undone. This will permanently delete the faculty member's account and remove their data from our servers.
                </p>
                <p className="text-sm text-red-700">
                  Please type <span className="font-semibold">{selectedFaculty.User?.FirstName} {selectedFaculty.User?.LastName}</span> to confirm.
                </p>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type the faculty member's full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedFaculty(null);
                  setDeleteConfirmation('');
                  setIsDeleteConfirmed(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFaculty}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isDeleteConfirmed || loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Faculty'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Confirmation Modal */}
      {isStatusUpdateModalOpen && pendingStatusUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Confirm Status Update</h2>
              <button
                onClick={() => {
                  setIsStatusUpdateModalOpen(false);
                  setPendingStatusUpdate(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to update the status of <span className="font-semibold">{pendingStatusUpdate.documentType}</span> for <span className="font-semibold">{pendingStatusUpdate.facultyName}</span>?
              </p>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  Current Status: <span className="font-medium text-gray-800">
                    {documents.find(d => d.DocumentID === pendingStatusUpdate.docId)?.SubmissionStatus}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  New Status: <span className="font-medium text-gray-800">{pendingStatusUpdate.newStatus}</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsStatusUpdateModalOpen(false);
                  setPendingStatusUpdate(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedStatusUpdate}
                className="px-4 py-2 text-white bg-[#800000] rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={statusUpdating === pendingStatusUpdate.docId}
              >
                {statusUpdating === pendingStatusUpdate.docId ? (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Confirm Update'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewerModalOpen && selectedDocument && selectedDocument.FileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedDocument.documentTypeName}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedDocument.facultyName} - {new Date(selectedDocument.UploadDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href={selectedDocument.FileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                  title="Open in New Tab"
                >
                  <FaLink className="w-5 h-5" />
                </a>
                <a
                  href={selectedDocument.DownloadUrl}
                  download
                  className="text-gray-600 hover:text-gray-900"
                  title="Download Document"
                >
                  <FaDownload className="w-5 h-5" />
                </a>
                <button
                  onClick={handleCloseViewer}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 p-4 overflow-auto">
              {(() => {
                const fileUrl = selectedDocument.FileUrl;
                if (!fileUrl) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-600 mb-2">No file URL provided.</p>
                    </div>
                  );
                }
                if (isGoogleDoc(fileUrl)) {
                  const exportUrl = getGoogleDocExportUrl(fileUrl, 'pdf');
                  if (!viewerError) {
                    return (
                      <PDFViewer
                        file={exportUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onError={() => setViewerError(true)}
                      />
                    );
                  } else {
                    return (
                      <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(exportUrl)}&embedded=true`}
                        style={{ width: '100%', height: '70vh', border: 'none' }}
                        title="PDF Viewer"
                        onError={() => setViewerError(true)}
                      />
                    );
                  }
                } else if (isPdfFile(fileUrl)) {
                  const pdfUrl = getDirectDriveUrl(fileUrl);
                  if (!viewerError) {
                    return (
                      <PDFViewer
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onError={() => setViewerError(true)}
                      />
                    );
                  } else {
                    return (
                      <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                        style={{ width: '100%', height: '70vh', border: 'none' }}
                        title="PDF Viewer"
                        onError={() => setViewerError(true)}
                      />
                    );
                  }
                } else if (isDocFile(fileUrl)) {
                  return (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(getDirectDriveUrl(fileUrl))}&embedded=true`}
                      style={{ width: '100%', height: '70vh', border: 'none' }}
                      title="Word Document Viewer"
                      onError={() => setViewerError(true)}
                    />
                  );
                } else if (isImageFile(fileUrl)) {
                  return (
                    <img
                      src={getDirectDriveUrl(fileUrl)}
                      alt="Document"
                      style={{ width: '100%', height: '70vh', objectFit: 'contain' }}
                      onError={() => setViewerError(true)}
                    />
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-600 mb-2">
                        This file type cannot be displayed directly in the viewer.
                      </p>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-red-800 transition-colors"
                      >
                        <FaLink className="mr-2" />
                        Open File in New Tab
                      </a>
                    </div>
                  );
                }
              })()}
              {/* Show fallback message only if all else fails */}
              {viewerError && selectedDocument.FileUrl && !isPdfFile(selectedDocument.FileUrl ?? '') && !isGoogleDoc(selectedDocument.FileUrl ?? '') && (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 mb-2">
                    This file type cannot be displayed directly in the viewer.
                  </p>
                  <a
                    href={selectedDocument.FileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-red-800 transition-colors"
                  >
                    <FaLink className="mr-2" />
                    Open File in New Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Document Type Modal */}
      {isDocTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">{editingDocType ? 'Edit Document Type' : 'Add New Document Type'}</h2>
              <button
                onClick={() => {
                  setIsDocTypeModalOpen(false);
                  setDocTypeName('');
                  setDocTypeError(null);
                  setEditingDocType(null);
                }}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddOrEditDocType} className="px-6 py-6 space-y-6">
              <div>
                <label htmlFor="documentType" className="block text-sm font-semibold text-gray-700 mb-1">
                  Document Type <span className="text-red-600">*</span>
                </label>
                <input
                  id="documentType"
                  type="text"
                  value={docTypeName}
                  onChange={e => {
                    setDocTypeName(e.target.value);
                    setDocTypeError(validateDocTypeName(e.target.value));
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${docTypeError ? 'border-red-500' : 'border-gray-300'}`}
                  required
                  title="Type a document type name"
                  list="documentTypeList"
                  placeholder="e.g. Contract, Resume, NBI Clearance"
                  autoComplete="off"
                  maxLength={50}
                />
                <datalist id="documentTypeList">
                  {documentTypes.map((type) => (
                    <option key={type.DocumentTypeID} value={type.DocumentTypeName} />
                  ))}
                </datalist>
                {/* Always show requirements, and show error if not unique */}
                {docTypeError ? (
                  <>
                    <div className="text-red-600 text-xs mt-1">{docTypeError}</div>
                    <div className="text-gray-400 text-xs mt-1">Alphanumeric, min 3 chars, unique, no repeated symbols/letters.</div>
                  </>
                ) : (
                  <div className="text-gray-400 text-xs mt-1">Alphanumeric, min 3 chars, unique, no repeated symbols/letters.</div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDocTypeModalOpen(false);
                    setDocTypeName('');
                    setDocTypeError(null);
                    setEditingDocType(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#800000] text-white px-4 py-2 rounded-lg hover:bg-red-800 flex items-center gap-2 transition-colors disabled:opacity-50"
                  disabled={!!docTypeError || addingDocType}
                >
                  {addingDocType ? (
                    <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {editingDocType ? 'Save Changes' : 'Save Document Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Type List Modal */}
      {showDocTypeListModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Manage Document Types</h2>
              <button
                onClick={() => setShowDocTypeListModal(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">
              <ul className="divide-y divide-gray-200">
                {documentTypes.length === 0 ? (
                  <li className="py-4 text-gray-500 text-center">No document types found.</li>
                ) : (
                  documentTypes.map((type) => (
                    <li key={type.DocumentTypeID} className="flex items-center justify-between py-3">
                      <span className="text-gray-800">{type.DocumentTypeName}</span>
                      <span className="flex items-center gap-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                          onClick={() => {
                            setShowDocTypeListModal(false);
                            openEditDocTypeModal(type);
                          }}
                        >
                          <FaPen />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 ml-2"
                          title="Delete"
                          onClick={async () => {
                            setDocTypeToDelete(type);
                            setIsDeleteDocTypeModalOpen(true);
                            setDeleteDocTypeConfirmation('');
                            setIsDeleteDocTypeConfirmed(false);
                            // Check if this document type is referenced by any document
                            setIsDeletingDocType(true);
                            try {
                              const res = await fetch(`/api/faculty-documents?documentTypeId=${type.DocumentTypeID}`);
                              const data = await res.json();
                              setIsDocTypeReferenced(Array.isArray(data) && data.length > 0);
                            } catch (err) {
                              setIsDocTypeReferenced(false); // fallback: allow delete if check fails
                            } finally {
                              setIsDeletingDocType(false);
                            }
                          }}
                          disabled={isDeletingDocType}
                        >
                          <FaTrash />
                        </button>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
      {showDocTypeSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-700 mb-4">Success</h2>
            <p className="text-gray-800 mb-6 text-center">{docTypeSuccessMessage}</p>
            <button
              className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-red-800"
              onClick={() => {
                setShowDocTypeSuccessModal(false);
                setNotification({ type: 'success', message: docTypeSuccessMessage });
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {isDeleteDocTypeModalOpen && docTypeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Document Type</h2>
              <button
                onClick={() => {
                  setIsDeleteDocTypeModalOpen(false);
                  setDocTypeToDelete(null);
                  setDeleteDocTypeConfirmation('');
                  setIsDeleteDocTypeConfirmed(false);
                  setIsDocTypeReferenced(false);
                }}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                {isDocTypeReferenced ? (
                  <p className="text-red-800 font-semibold">This document type cannot be deleted.</p>
                ) : (
                  <>
                    <p className="text-red-800 mb-2">
                      This action cannot be undone. This will permanently delete the document type <span className="font-semibold">{docTypeToDelete.DocumentTypeName}</span>.
                    </p>
                    <p className="text-sm text-red-700">
                      Please type <span className="font-semibold">{docTypeToDelete.DocumentTypeName}</span> to confirm.
                    </p>
                  </>
                )}
              </div>
              <input
                type="text"
                value={deleteDocTypeConfirmation}
                onChange={e => {
                  setDeleteDocTypeConfirmation(e.target.value);
                  setIsDeleteDocTypeConfirmed(e.target.value === docTypeToDelete.DocumentTypeName);
                }}
                placeholder="Type the document type name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isDocTypeReferenced}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteDocTypeModalOpen(false);
                  setDocTypeToDelete(null);
                  setDeleteDocTypeConfirmation('');
                  setIsDeleteDocTypeConfirmed(false);
                  setIsDocTypeReferenced(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingDocType(true);
                  await handleDeleteDocType(docTypeToDelete);
                  setIsDeletingDocType(false);
                  setIsDeleteDocTypeModalOpen(false);
                  setDocTypeToDelete(null);
                  setDeleteDocTypeConfirmation('');
                  setIsDeleteDocTypeConfirmed(false);
                  setIsDocTypeReferenced(false);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isDeleteDocTypeConfirmed || isDeletingDocType || isDocTypeReferenced}
              >
                {isDeletingDocType ? (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Document Type'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyContent;