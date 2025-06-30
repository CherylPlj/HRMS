import React, { useState, useRef } from 'react';
import { FaEye, FaDownload, FaLink, FaTimes, FaPlus, FaPen, FaTrash, FaFile } from 'react-icons/fa';

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  DepartmentID: number;
  Department?: { DepartmentID: number; DepartmentName: string };
  Position?: string;
  EmploymentStatus?: string;
  Photo?: string;
}

interface DocumentEmployeeRow {
  DocumentID: number;
  EmployeeID: string;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  employeeName: string;
  documentTypeName: string;
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

  // State for import functionality
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions
  const getViewUrl = (url: string) => url;
  const getPreviewUrl = (url: string) => url;

  const handleStatusChange = (docId: number, newStatus: string) => {
    const doc = documents.find(d => d.DocumentID === docId);
    if (doc) {
      setPendingStatusUpdate({
        docId,
        newStatus,
        documentType: doc.documentTypeName,
        employeeName: doc.employeeName
      });
      setIsStatusUpdateModalOpen(true);
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

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search documents..."
              value={documentSearchTerm}
              onChange={(e) => setDocumentSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          </div>

        {/* Filter Options for Documents */}
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

      {/* Document Management Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
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
            ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">No documents found.</td>
                </tr>
              ) : (
              filteredDocuments
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
                        <td className="px-6 py-4 text-sm text-gray-700">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{doc.employeeName || 'Unknown Employee'}</td>
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
                                href={getViewUrl(doc.FileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-900"
                                title="Open in New Tab"
                              >
                                <FaLink className="w-5 h-5" />
                              </a>
                              <a
                                href={doc.DownloadUrl || doc.FileUrl}
                                download
                                className="text-gray-600 hover:text-gray-900"
                                title="Download Document"
                              >
                                <FaDownload className="w-5 h-5" />
                              </a>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

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
                Are you sure you want to update the status of <span className="font-semibold">{pendingStatusUpdate.documentType}</span> for <span className="font-semibold">{pendingStatusUpdate.employeeName}</span>?
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
                  href={getPreviewUrl(selectedDocument.FileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                  title="Open in New Tab"
                >
                  <FaLink className="w-5 h-5" />
                </a>
                {selectedDocument.DownloadUrl && (
                  <a
                    href={selectedDocument.DownloadUrl}
                    download
                    className="text-gray-600 hover:text-gray-900"
                    title="Download Document"
                  >
                    <FaDownload className="w-5 h-5" />
                  </a>
                )}
                <button
                  onClick={handleCloseViewer}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe 
                src={getPreviewUrl(selectedDocument.FileUrl)}
                className="w-full h-full border-0"
                title="Document Preview"
              />
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
                <FaFile />
                {importLoading ? 'Importing...' : 'Choose CSV File'}
              </button>

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