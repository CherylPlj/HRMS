'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { fetchFacultyDocuments } from '../api/faculty-documents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUser } from '@clerk/nextjs';
import ManageDocumentTypes from './ManageDocumentTypes';

// Import types and utilities
import { 
  Faculty, 
  DocumentFacultyRow, 
  DocumentType, 
  Department, 
  Notification 
} from './faculty/types';
import { getStatusOrder } from './faculty/utils';

// Import components
import FacultyFilters from './faculty/FacultyFilters';
import DocumentFilters from './faculty/DocumentFilters';
import FacultyTable from './faculty/FacultyTable';
import DocumentTable from './faculty/DocumentTable';
import DocumentDashboard from './faculty/DocumentDashboard';
import Pagination from './faculty/Pagination';
import EditFacultyModal from './faculty/EditFacultyModal';
import ViewFacultyDetailsModal from './faculty/ViewFacultyDetailsModal';
import DocumentViewerModal from './faculty/DocumentViewerModal';
import StatusUpdateModal from './faculty/StatusUpdateModal';

const FacultyContent = () => {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial view from URL query parameter, default to 'documentDashboard'
  const urlView = searchParams.get('view');
  const validViews = ['facultyManagement', 'documentManagement', 'documentDashboard'];
  const initialView = urlView && validViews.includes(urlView) 
    ? urlView as 'facultyManagement' | 'documentManagement' | 'documentDashboard' 
    : 'documentDashboard';
  
  // View and loading state
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement' | 'documentDashboard'>(initialView);
  
  // Set initial URL if no view parameter exists
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (!currentView) {
      router.replace(`/dashboard/admin/documents?view=documentDashboard`, { scroll: false });
    }
  }, [router, searchParams]);
  
  // Sync activeView with URL parameter changes (e.g., back button)
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (currentView && validViews.includes(currentView)) {
      setActiveView(currentView as 'facultyManagement' | 'documentManagement' | 'documentDashboard');
    } else if (!currentView) {
      setActiveView('documentDashboard');
    }
  }, [searchParams]);
  
  // Handler to change view and update URL
  const handleViewChange = (viewId: 'facultyManagement' | 'documentManagement' | 'documentDashboard') => {
    setActiveView(viewId);
    router.push(`/dashboard/admin/documents?view=${viewId}`, { scroll: false });
  };
  const [loading, setLoading] = useState(true);

  // Faculty list and filters
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [filteredFacultyList, setFilteredFacultyList] = useState<Faculty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [departments, setDepartments] = useState<Department[]>([]);

  // Faculty modals and selection
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [editFaculty, setEditFaculty] = useState<Partial<Faculty>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedFacultyDetails, setSelectedFacultyDetails] = useState<Faculty | null>(null);
  const [expandedFacultyId, setExpandedFacultyId] = useState<number | null>(null);

  // Document management
  const [documents, setDocuments] = useState<DocumentFacultyRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFacultyRow | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<number | 'all'>('all');
  const [selectedDocumentStatus, setSelectedDocumentStatus] = useState<string>('all');

  // Document status management
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    docId: number;
    newStatus: string;
    facultyName: string;
    documentType: string;
  } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Pagination state
  const [facultyCurrentPage, setFacultyCurrentPage] = useState(1);
  const [facultyItemsPerPage, setFacultyItemsPerPage] = useState(10);
  const [docCurrentPage, setDocCurrentPage] = useState(1);
  const [docItemsPerPage, setDocItemsPerPage] = useState(10);

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
      
      const activeFaculty = data.filter((faculty: Faculty) => {
        return !faculty.User?.isDeleted;
      });
      
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
    fetchFacultyData();
    fetchDocumentTypes();
    fetchDocuments('all');
  }, []);

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

  // Reset document pagination when filters change
  useEffect(() => {
    setDocCurrentPage(1);
  }, [documentSearchTerm, selectedDocumentType, selectedDocumentStatus]);
  
  // Add filter and search functionality
  useEffect(() => {
    let filtered = [...facultyList];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(faculty => 
        faculty.User?.FirstName?.toLowerCase().includes(searchLower) ||
        faculty.User?.LastName?.toLowerCase().includes(searchLower) ||
        faculty.User?.Email?.toLowerCase().includes(searchLower) ||
        faculty.Position?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(faculty => 
        faculty.DepartmentID === selectedDepartment
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(faculty => 
        faculty.EmploymentStatus === selectedStatus
      );
    }

    setFilteredFacultyList(filtered);
    setFacultyCurrentPage(1);
  }, [facultyList, searchTerm, selectedDepartment, selectedStatus]);

  // Document management: fetch documents
  const fetchDocuments = async (facultyId: number | 'all' = 'all') => {
    setDocLoading(true);
    try {
      const data = await fetchFacultyDocuments(facultyId);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    }
    setDocLoading(false);
  };

  // Modify the status change handler
  const handleStatusChange = (docId: number, currentStatus: string) => {
    const doc = documents.find(d => d.DocumentID === docId);
    if (!doc) return;

    setPendingStatusUpdate({
      docId: docId,
      newStatus: currentStatus,
      facultyName: doc.facultyName || 'Unknown Faculty',
      documentType: doc.documentTypeName || 'Unknown Type'
    });
    setSelectedDocumentId(docId);
    setNewStatus(currentStatus);
    setIsStatusUpdateModalOpen(true);
  };

  const handleStatusChangeInModal = (newStatus: string) => {
    setNewStatus(newStatus);
    if (pendingStatusUpdate) {
      setPendingStatusUpdate({
        ...pendingStatusUpdate,
        newStatus
      });
    }
  };

  // Add new handler for confirmed status update
  const handleConfirmedStatusUpdate = async () => {
    if (!selectedDocumentId || !newStatus || !pendingStatusUpdate) return;

    setStatusUpdating(selectedDocumentId);
    try {
      const response = await fetch(`/api/faculty-documents/${selectedDocumentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ SubmissionStatus: newStatus }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update document status');
      }

      await fetchDocuments();
      setNotification({
        type: 'success',
        message: 'Document status updated successfully'
      });
    } catch (error) {
      console.error('Error updating document status:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update document status'
      });
    } finally {
      setStatusUpdating(null);
      setIsStatusUpdateModalOpen(false);
      setSelectedDocumentId(null);
      setNewStatus('');
      setPendingStatusUpdate(null);
    }
  };

  useEffect(() => {
    if (activeView === 'documentManagement' || activeView === 'documentDashboard') {
      fetchDocuments();
      fetchDocumentTypes();
    }
  }, [activeView]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    if (activeView === 'facultyManagement') {
      doc.setFontSize(16);
      doc.text('Faculty List', 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      doc.setFontSize(10);
      doc.text('Department: All Departments', 14, 29);

      const tableData = facultyList.map(faculty => [
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

      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(10);
      doc.text(`Total Faculty: ${facultyList.length}`, 14, finalY + 10);

      doc.save('faculty-list.pdf');
    } else if (activeView === 'documentManagement') {
      doc.setFontSize(16);
      doc.text('Documents List', 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      const tableData = documents.map(doc => [
        doc.facultyName,
        doc.documentTypeName,
        new Date(doc.UploadDate).toLocaleDateString(),
        doc.SubmissionStatus
      ]);

      autoTable(doc, {
        head: [['Faculty Name', 'Document Type', 'Upload Date', 'Status']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [128, 0, 0] }
      });

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
          Position: editFaculty.Position,
          DepartmentID: editFaculty.DepartmentID,
          EmploymentStatus: editFaculty.EmploymentStatus,
          HireDate: editFaculty.HireDate,
          DateOfBirth: editFaculty.DateOfBirth,
          Phone: editFaculty.Phone,
          Address: editFaculty.Address,
          ResignationDate: editFaculty.EmploymentStatus === 'Resigned' ? editFaculty.ResignationDate : null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update faculty member');
      }

      await fetchFacultyData();
      setIsEditModalOpen(false);
      setSelectedFaculty(null);
      setEditFaculty({});
      setNotification({
        type: 'success',
        message: 'Faculty member updated successfully'
      });
    } catch (error) {
      console.error('Error updating faculty:', error);
      setNotification({
        type: 'error',
        message: 'Failed to update faculty member'
      });
    } finally {
      setLoading(false);
    }
  };

  const openViewDetailsModal = async (faculty: Faculty) => {
    try {
      const response = await fetch(`/api/faculty/${faculty.FacultyID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch faculty details');
      }
      const details = await response.json();
      
      if (user && user.id === details.User.UserID) {
        details.User.Photo = user.imageUrl;
      }
      
      setSelectedFacultyDetails(details);
      setIsViewDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching faculty details:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load faculty details'
      });
    }
  };

  const getProfilePhoto = (facultyUserId: string) => {
    if (user && user.id === facultyUserId) {
      return user.imageUrl;
    }
    return '/default-avatar.png';
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const startIndex = (facultyCurrentPage - 1) * facultyItemsPerPage;
      const endIndex = startIndex + facultyItemsPerPage;
      const paginatedFaculty = filteredFacultyList.slice(startIndex, endIndex);
      setSelectedRows(paginatedFaculty.map(faculty => faculty.FacultyID));
    } else {
      const startIndex = (facultyCurrentPage - 1) * facultyItemsPerPage;
      const endIndex = startIndex + facultyItemsPerPage;
      const paginatedFaculty = filteredFacultyList.slice(startIndex, endIndex);
      setSelectedRows(prev => prev.filter(id => !paginatedFaculty.some(fac => fac.FacultyID === id)));
    }
  };

  const handleRowSelect = (facultyId: number) => {
    setSelectedRows(prev => {
      if (prev.includes(facultyId)) {
        return prev.filter(id => id !== facultyId);
      } else {
        return [...prev, facultyId];
      }
    });
  };

  const handleViewDocument = async (document: DocumentFacultyRow) => {
    setSelectedDocument(document);
    setIsViewerOpen(true);
    setDocLoading(true);

    try {
      setDocLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load document'
      });
      setDocLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDocument(null);
  };

  // Calculate filtered documents for pagination
  const getFilteredDocuments = () => {
    return documents
      .filter(doc => 
        (selectedDocumentStatus === 'all' || doc.SubmissionStatus === selectedDocumentStatus) &&
        (selectedDocumentType === 'all' || doc.DocumentTypeID === selectedDocumentType) &&
        (documentSearchTerm === '' || 
         doc.facultyName.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
         doc.documentTypeName.toLowerCase().includes(documentSearchTerm.toLowerCase()))
      );
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
            onClick={() => handleViewChange('documentDashboard')}
            className={`px-4 py-2 rounded ${
              activeView === 'documentDashboard'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleViewChange('documentManagement')}
            className={`px-4 py-2 rounded ${
              activeView === 'documentManagement'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Document Requirements
          </button>
          <button
            onClick={() => handleViewChange('facultyManagement')}
            className={`px-4 py-2 rounded ${
              activeView === 'facultyManagement'
                ? 'bg-[#800000] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Faculty List
          </button>
        </div>
        {activeView !== 'documentDashboard' && (
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
            >
              <Download size={16} /> Download {
                activeView === 'facultyManagement' ? 'Faculty List' : 'Documents List'
              }
            </button>
          </div>
        )}
      </div>

      {activeView === 'facultyManagement' && (
        <FacultyFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          departments={departments}
        />
      )}

      {activeView === 'documentManagement' && (
        <DocumentFilters
          documentSearchTerm={documentSearchTerm}
          onSearchChange={setDocumentSearchTerm}
          selectedDocumentType={selectedDocumentType}
          onDocumentTypeChange={setSelectedDocumentType}
          selectedDocumentStatus={selectedDocumentStatus}
          onDocumentStatusChange={setSelectedDocumentStatus}
          documentTypes={documentTypes}
          onDocumentTypesUpdate={() => {
            fetchDocumentTypes();
            fetchDocuments();
          }}
        />
      )}

      {activeView === 'facultyManagement' && (
        <>
          <FacultyTable
            loading={loading}
            facultyList={filteredFacultyList}
            documents={documents}
            documentTypes={documentTypes}
            selectedRows={selectedRows}
            expandedFacultyId={expandedFacultyId}
            currentPage={facultyCurrentPage}
            itemsPerPage={facultyItemsPerPage}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onExpandToggle={(facultyId) => setExpandedFacultyId(expandedFacultyId === facultyId ? null : facultyId)}
            onViewDetails={openViewDetailsModal}
            onViewDocument={handleViewDocument}
            getProfilePhoto={getProfilePhoto}
          />
          {filteredFacultyList.length > 0 && (
            <Pagination
              currentPage={facultyCurrentPage}
              totalPages={Math.ceil(filteredFacultyList.length / facultyItemsPerPage)}
              itemsPerPage={facultyItemsPerPage}
              totalItems={filteredFacultyList.length}
              startIndex={(facultyCurrentPage - 1) * facultyItemsPerPage}
              endIndex={Math.min((facultyCurrentPage - 1) * facultyItemsPerPage + facultyItemsPerPage, filteredFacultyList.length)}
              onPageChange={setFacultyCurrentPage}
              onItemsPerPageChange={setFacultyItemsPerPage}
            />
          )}
        </>
      )}

      {activeView === 'documentManagement' && (
        <>
          <DocumentTable
            loading={docLoading}
            documents={documents}
            selectedDocumentStatus={selectedDocumentStatus}
            selectedDocumentType={selectedDocumentType}
            documentSearchTerm={documentSearchTerm}
            currentPage={docCurrentPage}
            itemsPerPage={docItemsPerPage}
            statusUpdating={statusUpdating}
            onViewDocument={handleViewDocument}
            onStatusChange={handleStatusChange}
          />
          {(() => {
            const filtered = getFilteredDocuments();
            if (filtered.length === 0) return null;
            
            return (
              <Pagination
                currentPage={docCurrentPage}
                totalPages={Math.ceil(filtered.length / docItemsPerPage)}
                itemsPerPage={docItemsPerPage}
                totalItems={filtered.length}
                startIndex={(docCurrentPage - 1) * docItemsPerPage}
                endIndex={Math.min((docCurrentPage - 1) * docItemsPerPage + docItemsPerPage, filtered.length)}
                onPageChange={setDocCurrentPage}
                onItemsPerPageChange={setDocItemsPerPage}
              />
            );
          })()}
        </>
      )}

      {activeView === 'documentDashboard' && (
        <DocumentDashboard
          documents={documents}
          documentTypes={documentTypes}
          facultyList={facultyList}
        />
      )}

      <EditFacultyModal
        isOpen={isEditModalOpen}
        selectedFaculty={selectedFaculty}
        editFaculty={editFaculty}
        loading={loading}
        departments={departments}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedFaculty(null);
          setEditFaculty({});
        }}
        onEditChange={setEditFaculty}
        onSubmit={handleEditFaculty}
      />

      <ViewFacultyDetailsModal
        isOpen={isViewDetailsModalOpen}
        selectedFacultyDetails={selectedFacultyDetails}
        onClose={() => {
          setIsViewDetailsModalOpen(false);
          setSelectedFacultyDetails(null);
        }}
      />

      <DocumentViewerModal
        isOpen={isViewerOpen}
        selectedDocument={selectedDocument}
        onClose={handleCloseViewer}
      />

      <StatusUpdateModal
        isOpen={isStatusUpdateModalOpen}
        pendingStatusUpdate={pendingStatusUpdate}
        newStatus={newStatus}
        documents={documents}
        statusUpdating={statusUpdating}
        onClose={() => {
          setIsStatusUpdateModalOpen(false);
          setPendingStatusUpdate(null);
        }}
        onStatusChange={handleStatusChangeInModal}
        onConfirm={handleConfirmedStatusUpdate}
      />
    </div>
  );
};

export default FacultyContent;
