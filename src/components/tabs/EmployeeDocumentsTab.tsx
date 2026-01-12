import React, { useState, useRef } from 'react';
import { Download, Eye, ExternalLink, X, Plus, Pen, Trash2, FileText, Search } from 'lucide-react';
import ManageDocumentTypes from '../ManageDocumentTypes';

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  DepartmentID: number;
  Department?: { DepartmentID: number; DepartmentName: string };
  Position?: string;
  EmploymentStatus?: string;
}

interface DocumentEmployeeRow {
  DocumentID: number;
  EmployeeID: string;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  employeeName: string;
  documentTypeName: string;
  Title?: string;
  FilePath?: string;
  FileUrl?: string;
  DownloadUrl?: string;
}

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
  AllowedFileTypes: string[] | null;
  Template: string | null;
}

interface Props {
  documents: DocumentEmployeeRow[];
  documentTypes: DocumentType[];
  employees: Employee[];
}

const EmployeeDocumentsTab: React.FC<Props> = ({ documents, documentTypes, employees }) => {
  // State for search and filtering
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | number>('all');
  const [selectedDocumentStatus, setSelectedDocumentStatus] = useState('all');

  // State for document management
  const [docLoading, setDocLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    docId: number;
    newStatus: string;
    documentType: string;
    employeeName: string;
  } | null>(null);

  // State for document viewer
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentEmployeeRow | null>(null);

  // State for document type management
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false);
  const [showDocTypeListModal, setShowDocTypeListModal] = useState(false);
  const [showDocTypeSuccessModal, setShowDocTypeSuccessModal] = useState(false);
  const [isDeleteDocTypeModalOpen, setIsDeleteDocTypeModalOpen] = useState(false);
  const [docTypeName, setDocTypeName] = useState('');
  const [docTypeError, setDocTypeError] = useState<string | null>(null);
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);
  const [addingDocType, setAddingDocType] = useState(false);
  const [docTypeToDelete, setDocTypeToDelete] = useState<DocumentType | null>(null);
  const [deleteDocTypeConfirmation, setDeleteDocTypeConfirmation] = useState('');
  const [isDeleteDocTypeConfirmed, setIsDeleteDocTypeConfirmed] = useState(false);
  const [isDeletingDocType, setIsDeletingDocType] = useState(false);
  const [isDocTypeReferenced, setIsDocTypeReferenced] = useState(false);
  const [docTypeSuccessMessage, setDocTypeSuccessMessage] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<number[]>([]);
  const [selectAllDocTypes, setSelectAllDocTypes] = useState(false);

  // State for import functionality
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Helper functions
  const getFileType = (url: string | undefined): 'image' | 'pdf' | 'other' => {
    if (!url) return 'other';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf') || lowerUrl.includes('pdf') || lowerUrl.includes('application/pdf')) return 'pdf';
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif') || lowerUrl.includes('image/')) return 'image';
    return 'other';
  };

  // Get URL for opening in new tab (original URL, not preview)
  const getViewUrl = (url: string | undefined): string => {
    if (!url) return '';
    // Return original URL for opening in new tab
    return url;
  };

  // Get download URL - use proxy endpoint for Supabase files to force download
  const getDownloadUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    // Handle Supabase Storage URLs - use proxy endpoint with download parameter
    if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
      const urlMatch = url.match(/\/documents\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const filePath = urlMatch[1];
        return `/api/documents/${encodeURIComponent(filePath)}?download=true`;
      }
    }
    
    // For Google Drive and other URLs, return as-is
    return url;
  };

  // Handle download with proper filename
  const handleDownload = async (url: string | undefined, fileName?: string) => {
    if (!url) return;
    
    try {
      const downloadUrl = getDownloadUrl(url);
      
      // Extract filename from URL if not provided
      const getFileNameFromUrl = (url: string): string => {
        try {
          // Try to get filename from Content-Disposition header or URL
          const urlPath = new URL(url).pathname;
          const urlFileName = urlPath.split('/').pop() || '';
          if (urlFileName && urlFileName.includes('.')) {
            return decodeURIComponent(urlFileName);
          }
        } catch {
          // If URL parsing fails, try to extract from path
          const match = url.match(/\/([^\/]+\.\w+)(?:\?|$)/);
          if (match && match[1]) {
            return decodeURIComponent(match[1]);
          }
        }
        return 'document';
      };
      
      const finalFileName = fileName || getFileNameFromUrl(url);
      
      // For Supabase files using our proxy endpoint, fetch as blob
      if (downloadUrl.includes('/api/documents/')) {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error('Failed to download file');
        }
        
        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let downloadFileName = finalFileName;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (fileNameMatch && fileNameMatch[1]) {
            downloadFileName = fileNameMatch[1].replace(/['"]/g, '');
          }
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // For other URLs (Google Drive, etc.), try to fetch as blob first
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = finalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          } else {
            // Fallback: open in new tab if fetch fails
            window.open(url, '_blank');
          }
        } catch (fetchError) {
          // If fetch fails (CORS, etc.), try direct download
          const link = document.createElement('a');
          link.href = url;
          link.download = finalFileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      // Final fallback: open in new tab
      window.open(url, '_blank');
    }
  };
  
  const getPreviewUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    // Handle Supabase Storage URLs - use proxy endpoint for PDFs
    if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
      const fileType = getFileType(url);
      if (fileType === 'pdf') {
        // Extract the file path from the Supabase URL
        const urlMatch = url.match(/\/documents\/(.+)$/);
        if (urlMatch && urlMatch[1]) {
          const filePath = urlMatch[1];
          return `/api/documents/${encodeURIComponent(filePath)}`;
        }
      }
      // For images, return the URL directly
      if (fileType === 'image') {
        return url;
      }
    }
    
    // Handle Google Drive URLs
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    // Handle export=download URLs
    const downloadMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (downloadMatch) {
      const fileId = downloadMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    return url;
  };

  const handleStatusChange = (docId: number, currentStatus: string) => {
    const doc = documents.find(d => d.DocumentID === docId);
    if (doc) {
      setPendingStatusUpdate({
        docId,
        newStatus: currentStatus, // Will be updated in modal
        documentType: doc.documentTypeName,
        employeeName: doc.employeeName
      });
      setIsStatusUpdateModalOpen(true);
    }
  };

  const handleStatusChangeInModal = (newStatus: string) => {
    if (pendingStatusUpdate) {
      setPendingStatusUpdate({
        ...pendingStatusUpdate,
        newStatus
      });
    }
  };

  const handleConfirmedStatusUpdate = async () => {
    if (!pendingStatusUpdate) return;
    
    setStatusUpdating(pendingStatusUpdate.docId);
    try {
      const response = await fetch(`/api/employee-documents/${pendingStatusUpdate.docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          SubmissionStatus: pendingStatusUpdate.newStatus
        }),
      });

      if (response.ok) {
        // Refresh documents or update local state
        window.location.reload();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setStatusUpdating(null);
      setIsStatusUpdateModalOpen(false);
      setPendingStatusUpdate(null);
    }
  };

  const handleViewDocument = (doc: DocumentEmployeeRow) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDocument(null);
  };

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

  const validateDocTypeName = (name: string): string | null => {
    if (name.length < 3) return 'Document type name must be at least 3 characters long';
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) return 'Document type name can only contain letters, numbers, and spaces';
    
    // Check for repeated characters
    for (let i = 0; i < name.length - 1; i++) {
      if (name[i] === name[i + 1]) return 'Document type name cannot have repeated characters';
    }
    
    // Check for uniqueness
    const existingNames = documentTypes.map(dt => dt.DocumentTypeName.toLowerCase());
    if (existingNames.includes(name.toLowerCase()) && (!editingDocType || editingDocType.DocumentTypeName.toLowerCase() !== name.toLowerCase())) {
      return 'Document type name must be unique';
    }
    
    return null;
  };

  const handleAddOrEditDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docTypeError) return;

    setAddingDocType(true);
    try {
      const url = editingDocType 
        ? `/api/document-types/${editingDocType.DocumentTypeID}`
        : '/api/document-types';
      
      const method = editingDocType ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          DocumentTypeName: docTypeName,
        }),
      });

      if (response.ok) {
        setDocTypeSuccessMessage(
          editingDocType 
            ? 'Document type updated successfully!' 
            : 'Document type added successfully!'
        );
        setShowDocTypeSuccessModal(true);
        setIsDocTypeModalOpen(false);
        setDocTypeName('');
        setDocTypeError(null);
        setEditingDocType(null);
        // Refresh the page to update the document types list
        window.location.reload();
      } else {
        const error = await response.text();
        setDocTypeError(error || 'Failed to save document type');
      }
    } catch (error) {
      setDocTypeError('An error occurred while saving the document type');
    } finally {
      setAddingDocType(false);
    }
  };

  const handleDeleteDocType = async (docType: DocumentType) => {
    try {
      const response = await fetch(`/api/document-types/${docType.DocumentTypeID}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocTypeSuccessMessage('Document type deleted successfully!');
        setShowDocTypeSuccessModal(true);
        // Refresh the page to update the document types list
        window.location.reload();
      } else {
        const error = await response.text();
        setDocTypeError(error || 'Failed to delete document type');
      }
    } catch (error) {
      setDocTypeError('An error occurred while deleting the document type');
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/employee_import_template.csv';
    link.download = 'employee_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (file: File) => {
    setImportLoading(true);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setImportError(null);
        setIsImportModalOpen(false);
        window.location.reload();
      } else {
        const error = await response.text();
        setImportError(error || 'Failed to import CSV file');
      }
    } catch (error) {
      setImportError('An error occurred while importing the CSV file');
    } finally {
      setImportLoading(false);
    }
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => 
    (selectedDocumentStatus === 'all' || doc.SubmissionStatus === selectedDocumentStatus) &&
    (selectedDocumentType === 'all' || doc.DocumentTypeID === selectedDocumentType) &&
    (documentSearchTerm === '' || 
     doc.employeeName.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
     doc.documentTypeName.toLowerCase().includes(documentSearchTerm.toLowerCase()))
  );
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [documentSearchTerm, selectedDocumentType, selectedDocumentStatus]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search documents..."
            value={documentSearchTerm}
            onChange={(e) => setDocumentSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] text-sm md:text-base"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 sm:w-48">
            <select
              id="documentTypeFilter"
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 text-sm"
              title="Filter by Document Type"
            >
              <option value="all">All Types</option>
              {documentTypes.map((type) => (
                <option key={type.DocumentTypeID} value={type.DocumentTypeID}>
                  {type.DocumentTypeName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 sm:w-48">
            <select
              id="documentStatusFilter"
              value={selectedDocumentStatus}
              onChange={(e) => setSelectedDocumentStatus(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 text-sm"
              title="Filter by Status"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
          <div className="shrink-0">
            <ManageDocumentTypes
              documentTypes={documentTypes}
              onUpdate={() => window.location.reload()}
            />
          </div>
        </div>
      </div>

      {/* Document Management Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">#</th>
                <th className="px-4 md:px-6 py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                <th className="px-4 md:px-6 py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Document</th>
                <th className="px-4 md:px-6 py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Upload Date</th>
                <th className="px-4 md:px-6 py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-4 md:px-6 py-3 text-right text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {docLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#800000] rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-500">Loading documents...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No documents matching your criteria.
                  </td>
                </tr>
              ) : (() => {
                const sorted = [...filteredDocuments].sort((a, b) => {
                  const getStatusOrder = (status: string) => {
                    switch (status) {
                      case 'Submitted': return 1;
                      case 'Returned': return 2;
                      case 'Approved': return 3;
                      default: return 4;
                    }
                  };
                  const orderA = getStatusOrder(a.SubmissionStatus);
                  const orderB = getStatusOrder(b.SubmissionStatus);
                  if (orderA !== orderB) return orderA - orderB;
                  return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
                });
                
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedDocuments = sorted.slice(startIndex, startIndex + itemsPerPage);
                
                return paginatedDocuments.map((doc, idx) => (
                  <tr key={doc.DocumentID} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 font-medium">{startIndex + idx + 1}</td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-bold text-gray-900">{doc.employeeName}</span>
                        <span className="text-[10px] md:text-xs text-gray-500">{doc.EmployeeID}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-medium text-gray-900 line-clamp-1">{doc.Title || doc.documentTypeName}</span>
                        <span className="text-[10px] md:text-xs text-gray-500 italic">{doc.documentTypeName}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-col text-[10px] md:text-xs text-gray-600">
                        <span>{new Date(doc.UploadDate).toLocaleDateString()}</span>
                        <span>{new Date(doc.UploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold
                        ${
                          doc.SubmissionStatus === 'Approved'
                            ? 'bg-green-100 text-green-700'
                            : doc.SubmissionStatus === 'Returned'
                            ? 'bg-red-100 text-red-700'
                            : doc.SubmissionStatus === 'Submitted'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {doc.SubmissionStatus}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        {doc.FileUrl && (
                          <>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="View Document"
                            >
                              <Eye size={18} />
                            </button>
                            <a
                              href={getViewUrl(doc.FileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Open in New Tab"
                            >
                              <ExternalLink size={18} />
                            </a>
                            <button
                              onClick={() => handleDownload(doc.DownloadUrl || doc.FileUrl, doc.Title || doc.documentTypeName)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(doc.DocumentID, doc.SubmissionStatus)}
                              disabled={statusUpdating === doc.DocumentID || doc.SubmissionStatus === 'Submitted'}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Update Status"
                            >
                              <Pen size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
        
      {/* Pagination Controls */}
      {(() => {
        if (docLoading || filteredDocuments.length === 0) return null;
        
        const totalItems = filteredDocuments.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        
        return (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs md:text-sm text-gray-600">
                Showing <span className="font-bold text-gray-900">{startIndex + 1}-{endIndex}</span> of <span className="font-bold text-gray-900">{totalItems}</span>
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-[#800000] focus:border-[#800000]"
              >
                {[10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val} per page</option>
                ))}
              </select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-xs text-gray-600">Page</span>
                  <span className="text-xs font-bold text-gray-900">{currentPage}</span>
                  <span className="text-xs text-gray-600">of</span>
                  <span className="text-xs font-bold text-gray-900">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}

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
              <p className="text-gray-600 mb-4">
                Update the status of <span className="font-semibold">{pendingStatusUpdate.documentType}</span> for <span className="font-semibold">{pendingStatusUpdate.employeeName}</span>?
              </p>
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Current Status: <span className="font-medium text-gray-800">
                    {documents.find(d => d.DocumentID === pendingStatusUpdate.docId)?.SubmissionStatus}
                  </span>
                </p>
                <label htmlFor="statusSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  New Status:
                </label>
                <select
                  id="statusSelect"
                  value={pendingStatusUpdate.newStatus}
                  onChange={(e) => handleStatusChangeInModal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Returned">Returned</option>
                </select>
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
      {isViewerOpen && selectedDocument && selectedDocument.FileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedDocument.documentTypeName}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedDocument.employeeName} - {new Date(selectedDocument.UploadDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href={getViewUrl(selectedDocument.FileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                  title="Open in New Tab"
                >
                  <ExternalLink size={20} />
                </a>
                <button
                  onClick={() => handleDownload(selectedDocument.DownloadUrl || selectedDocument.FileUrl, selectedDocument.Title || selectedDocument.documentTypeName)}
                  className="text-gray-600 hover:text-gray-900"
                  title="Download Document"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={handleCloseViewer}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const fileType = getFileType(selectedDocument.FileUrl);
                const previewUrl = getPreviewUrl(selectedDocument.FileUrl);
                
                if (fileType === 'image') {
                  return (
                    <img 
                      src={previewUrl} 
                      alt="Document preview" 
                      className="max-w-full max-h-full object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/file.svg';
                      }}
                    />
                  );
                } else if (fileType === 'pdf') {
                  return (
                    <iframe 
                      src={previewUrl}
                      className="w-full h-full border-0"
                      title="Document Preview"
                      style={{ minHeight: '600px' }}
                    />
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <img src="/file.svg" alt="File icon" className="w-16 h-16 mb-4" />
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                      <a 
                        href={selectedDocument.FileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#a83232]"
                      >
                        Download File
                      </a>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add New Document Type Modal */}
      {isDocTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden">
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
              {selectedDocTypes.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    {selectedDocTypes.length} document type{selectedDocTypes.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${selectedDocTypes.length} document type(s)?`)) {
                        setIsDeletingDocType(true);
                        try {
                          for (const docTypeId of selectedDocTypes) {
                            const docType = documentTypes.find(dt => dt.DocumentTypeID === docTypeId);
                            if (docType) {
                              await handleDeleteDocType(docType);
                            }
                          }
                          setSelectedDocTypes([]);
                          setSelectAllDocTypes(false);
                        } catch (error) {
                          console.error('Error deleting document types:', error);
                        } finally {
                          setIsDeletingDocType(false);
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                    disabled={isDeletingDocType}
                  >
                    <Trash2 size={14} /> Delete Selected
                  </button>
                </div>
              )}
              <ul className="divide-y divide-gray-200">
                {documentTypes.length === 0 ? (
                  <li className="py-4 text-gray-500 text-center">No document types found.</li>
                ) : (
                  <>
                    <li className="flex items-center py-2 border-b">
                      <input
                        type="checkbox"
                        checked={selectAllDocTypes}
                        onChange={(e) => {
                          setSelectAllDocTypes(e.target.checked);
                          if (e.target.checked) {
                            setSelectedDocTypes(documentTypes.map(dt => dt.DocumentTypeID));
                          } else {
                            setSelectedDocTypes([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#800000] focus:ring-[#800000] mr-3"
                      />
                      <span className="text-sm font-medium text-gray-700">Select All</span>
                    </li>
                    {documentTypes.map((type) => (
                      <li key={type.DocumentTypeID} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 flex-grow">
                          <input
                            type="checkbox"
                            checked={selectedDocTypes.includes(type.DocumentTypeID)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocTypes([...selectedDocTypes, type.DocumentTypeID]);
                              } else {
                                setSelectedDocTypes(selectedDocTypes.filter(id => id !== type.DocumentTypeID));
                                setSelectAllDocTypes(false);
                              }
                            }}
                            className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                          />
                          <span className="text-gray-800">{type.DocumentTypeName}</span>
                        </div>
                        <span className="flex items-center gap-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                            onClick={() => {
                              setShowDocTypeListModal(false);
                              openEditDocTypeModal(type);
                            }}
                          >
                            <Pen size={14} />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 ml-2"
                            title="Delete"
                            onClick={async () => {
                              setDocTypeToDelete(type);
                              setIsDeleteDocTypeModalOpen(true);
                              setDeleteDocTypeConfirmation('');
                              setIsDeleteDocTypeConfirmed(false);
                              setIsDeletingDocType(true);
                              try {
                                const res = await fetch(`/api/employee-documents?documentTypeId=${type.DocumentTypeID}`);
                                const data = await res.json();
                                setIsDocTypeReferenced(Array.isArray(data) && data.length > 0);
                              } catch (err) {
                                setIsDocTypeReferenced(false);
                              } finally {
                                setIsDeletingDocType(false);
                              }
                            }}
                            disabled={isDeletingDocType}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showDocTypeSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-700 mb-4">Success</h2>
            <p className="text-gray-800 mb-6 text-center">{docTypeSuccessMessage}</p>
            <button
              className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-red-800"
              onClick={() => {
                setShowDocTypeSuccessModal(false);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Document Type Modal */}
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

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Import Employee Data</h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
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
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Upload a CSV file containing employee information. The file should follow the template format.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-[#800000] hover:text-red-800 text-sm font-medium"
                >
                  Download Template
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportCSV(file);
                  }
                }}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center justify-center gap-2"
                disabled={importLoading}
              >
                <FileText size={16} />
                {importLoading ? 'Importing...' : 'Choose CSV File'}
              </button>
              <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>

              {importError && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {importError}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDocumentsTab; 