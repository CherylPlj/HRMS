import React, { useEffect, useState } from 'react';
import { FaPlus, FaTimes, FaEye, FaPaperclip, FaFilter, FaTrash, FaUpload, FaCheck, FaDownload } from 'react-icons/fa';
import { uploadFacultyDocument, fetchFacultyDocuments } from '../api/faculty-documents';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabaseClient';

interface ComponentWithBackButton {
  onBack: () => void;
}

interface DocumentFacultyRow {
  DocumentID: number;
  FacultyID: number;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  FilePath?: string;
  FileUrl?: string;
  DownloadUrl?: string;
  DocumentType?: {
    DocumentTypeID: number;
    DocumentTypeName: string;
  };
}

const DocumentsFaculty: React.FC<ComponentWithBackButton> = ({ onBack }) => {
  const { user } = useUser();
  const [documents, setDocuments] = useState<DocumentFacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{
    DocumentTypeID: string;
    file: File | null;
    fileName: string;
  }>({
    DocumentTypeID: '',
    file: null,
    fileName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [uploadingStates, setUploadingStates] = useState<{ [key: number]: boolean }>({});
  const [uploadSuccessStates, setUploadSuccessStates] = useState<{ [key: number]: boolean }>({});

  // Add status count calculations - Fixed pending calculation
  const statusCounts = {
    // pending: documentTypes.length - documents.length + documents.filter(doc => doc.SubmissionStatus === 'Pending').length,
    pending: documentTypes.length - documents.filter(doc => doc.SubmissionStatus !== 'Pending').length,
    submitted: documents.filter(doc => doc.SubmissionStatus === 'Submitted').length,
    approved: documents.filter(doc => doc.SubmissionStatus === 'Approved').length,
    rejected: documents.filter(doc => doc.SubmissionStatus === 'Rejected').length
  };

  // Fetch faculty ID for the current user
  useEffect(() => {
    const fetchFacultyId = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        console.log('No Clerk user email available');
        setError('Please log in to access this page');
        setLoading(false);
        return;
      }

      try {
        console.log('Current user:', {
          id: user.id,
          email: user.emailAddresses[0].emailAddress
        });

        console.log('Fetching Supabase user for email:', user.emailAddresses[0].emailAddress);
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('UserID')
          .eq('Email', user.emailAddresses[0].emailAddress)
          .single();

        if (userError) {
          console.error('Error fetching Supabase user:', userError);
          setError('Failed to fetch user data');
          setLoading(false);
          return;
        }

        if (userData) {
          console.log('Found Supabase user:', userData);

          // Fetch FacultyID using UserID
          const { data: facultyData, error: facultyError } = await supabase
            .from('Faculty')
            .select('FacultyID, UserID')
            .eq('UserID', userData.UserID)
            .single();

          if (facultyError) {
            console.error('Error fetching Faculty data:', facultyError);
            setError('Failed to fetch faculty data');
            setLoading(false);
            return;
          }

          if (facultyData) {
            console.log('Found Faculty:', facultyData);
            setFacultyId(facultyData.FacultyID);
          } else {
            console.log('No Faculty found for user:', userData.UserID);
            setError('Faculty record not found');
            setLoading(false);
          }
        } else {
          console.log('No Supabase user found for email:', user.emailAddresses[0].emailAddress);
          setError('User not found in database');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in fetchFacultyId:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchFacultyId();
  }, [user]);

  // Fetch documents
  const fetchDocs = async () => {
    if (!facultyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching documents for faculty:', facultyId);
      const data = await fetchFacultyDocuments(facultyId);
      console.log('Received documents:', data);

      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        setError('Invalid response from server');
        setDocuments([]);
        return;
      }

      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
      if (err instanceof Error) {
        setError(`Failed to fetch documents: ${err.message}`);
      } else {
        setError('Failed to fetch documents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (facultyId) {
      fetchDocs();
    }
  }, [facultyId]);

  // Fetch document types from backend
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        console.log('Fetching document types...');
        const res = await fetch('/api/document-types');
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Error fetching document types:', errorData);
          throw new Error(errorData.error || 'Failed to fetch document types');
        }
        const data = await res.json();
        console.log('Received document types:', data);
        setDocumentTypes(data);
      } catch (err) {
        console.error('Error in fetchDocumentTypes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch document types');
      }
    };
    fetchDocumentTypes();
  }, []);

  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as unknown as HTMLInputElement & HTMLSelectElement;
    if (name === 'file' && files) {
      setForm(f => ({
        ...f,
        file: files[0],
        fileName: files[0].name
      }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!facultyId || !form.DocumentTypeID || !form.file) {
      setError('Please select a document type and file.');
      return;
    }

    console.log('Starting document upload:', {
      facultyId,
      documentTypeId: form.DocumentTypeID,
      fileName: form.file.name,
      fileType: form.file.type,
      fileSize: form.file.size
    });

    setUploading(true);
    const data = new FormData();
    data.append('FacultyID', facultyId.toString());
    data.append('DocumentTypeID', form.DocumentTypeID);
    data.append('file', form.file);

    try {
      console.log('Sending upload request...');
      const response = await uploadFacultyDocument(data);
      console.log('Upload successful:', response);

      setShowModal(false);
      setForm({
        DocumentTypeID: '',
        file: null,
        fileName: ''
      });
      await fetchDocs();
      setSuccessMessage('File uploaded successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof Error) {
        setError(`Failed to upload document: ${err.message}`);
      } else {
        setError('Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Helper to get DocumentTypeName from ID
  const getDocumentTypeName = (id: number) => {
    const type = documentTypes.find(dt => dt.DocumentTypeID === id);
    return type ? type.DocumentTypeName : String(id);
  };

  // Helper to generate document number
  const generateDocumentNumber = (doc: DocumentFacultyRow) => {
    const year = doc.UploadDate ? new Date(doc.UploadDate).getFullYear() : new Date().getFullYear();
    const paddedId = doc.DocumentID.toString().padStart(4, '0');
    return `DOC-${year}-${paddedId}`;
  };

  // Handle select/deselect for delete
  const handleSelectDoc = (docId: number) => {
    setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };
  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(doc => doc.DocumentID));
    }
  };
  const handleDelete = async () => {
    if (!isDeleteConfirmed) return;

    try {
      setLoading(true);
      let allSuccess = true;
      let errorDocs: number[] = [];
      // Update each selected document
      for (const docId of selectedDocs) {
        const response = await fetch(`/api/faculty-documents/${docId}/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('DELETE response for doc', docId, response.status, response.statusText);
        if (!response.ok) {
          allSuccess = false;
          errorDocs.push(docId);
        }
      }
      // Refresh the documents list
      await fetchDocs();
      setShowDeleteModal(false);
      setSelectedDocs([]);
      setDeleteConfirmation('');
      setIsDeleteConfirmed(false);
      if (allSuccess) {
        setSuccessMessage('Files removed successfully. You can upload new files when ready.');
        setTimeout(() => setSuccessMessage(null), 5000); // Show for 5 seconds
      } else {
        setError(`Failed to update some documents: ${errorDocs.join(', ')}`);
      }
    } catch (error) {
      console.error('Error updating documents:', error);
      setError('Failed to update documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // For edit modal, only show selected and editable (not Approved) documents
  const editableSelectedDocs = documents.filter(doc => selectedDocs.includes(doc.DocumentID) && doc.SubmissionStatus !== 'Approved');

  // Helper to get a better file name from URL
  const getFileName = (url: string | undefined) => {
    if (!url) return 'Unknown file';
    try {
      // Try to extract file name from query param (e.g., ?filename=...)
      const match = url.match(/[?&]filename=([^&#]+)/);
      if (match) return decodeURIComponent(match[1]);
      // Try to extract from Google Drive 'id' param
      const driveId = url.match(/\/d\/([\w-]+)/);
      if (driveId) return `GoogleDriveFile_${driveId[1]}`;
      // Try to extract from last path segment if it looks like a file
      const last = url.split('/').pop() || '';
      if (last && last.indexOf('.') > 0 && last.length < 100) return last;
      // Fallback
      return 'Unknown file';
    } catch {
      return 'Unknown file';
    }
  };
  const truncateFileName = (name: string) => name.length > 30 ? name.slice(0, 27) + '...' : name;

  // Only Pending documents for upload modal
  const pendingDocs = documentTypes.filter(dt =>
    !documents.some(doc => doc.DocumentTypeID === dt.DocumentTypeID && doc.SubmissionStatus === 'Approved')
  );

  // Calculate summary for submitted/complete
  const submittedStatuses = ['Submitted', 'Approved'];
  const submittedCount = documents.filter(doc => submittedStatuses.includes(doc.SubmissionStatus)).length;
  const totalRequired = documentTypes.length;
  const isComplete = totalRequired > 0 && submittedCount === totalRequired;
  const allApproved = totalRequired > 0 && documents.length === totalRequired && documents.every(doc => doc.SubmissionStatus === 'Approved');
  const allSubmittedOrApproved = totalRequired > 0 && documents.length === totalRequired && documents.every(doc => submittedStatuses.includes(doc.SubmissionStatus));
  const anySubmitted = documents.some(doc => doc.SubmissionStatus === 'Submitted');
  // Add effect to check if confirmation matches
  useEffect(() => {
    if (user?.fullName) {
      setIsDeleteConfirmed(deleteConfirmation === user.fullName);
    }
  }, [deleteConfirmation, user?.fullName]);

  // Update the upload form submission
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>, dt: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('DocumentTypeID', dt.DocumentTypeID.toString());
    formData.append('FacultyID', facultyId!.toString());

    try {
      setUploadingStates(prev => ({ ...prev, [dt.DocumentTypeID]: true }));
      setUploadSuccessStates(prev => ({ ...prev, [dt.DocumentTypeID]: false }));
      setError(null);

      console.log('Uploading document:', {
        documentType: dt.DocumentTypeName,
        documentTypeId: dt.DocumentTypeID,
        facultyId: facultyId
      });

      await uploadFacultyDocument(formData);
      await fetchDocs();
      setUploadSuccessStates(prev => ({ ...prev, [dt.DocumentTypeID]: true }));
      setSuccessMessage(`Successfully uploaded ${dt.DocumentTypeName}`);
      setTimeout(() => {
        setUploadSuccessStates(prev => ({ ...prev, [dt.DocumentTypeID]: false }));
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : `Failed to upload ${dt.DocumentTypeName}`);
    } finally {
      setUploadingStates(prev => ({ ...prev, [dt.DocumentTypeID]: false }));
    }
  };

  // Add helper function to detect file type - Enhanced
  const getFileType = (url: string | undefined, mimeType?: string): 'image' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'other' => {
    if (!url) return 'other';

    // Check MIME type first if available
    if (mimeType) {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    }

    // Fallback to URL extension check
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension || '')) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(extension || '')) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(extension || '')) return 'presentation';
    return 'other';
  };

  // Helper to get file type icon
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'pdf': return '📄';
      case 'document': return '📝';
      case 'spreadsheet': return '📊';
      case 'presentation': return '📈';
      default: return '📁';
    }
  };

  const getPreviewUrl = (url: string | undefined) => {
    if (!url) return '';

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

    // Handle Supabase Storage URLs
    if (url.includes('storage.googleapis.com') || url.includes('supabase')) {
      // For images, return the URL directly
      if (getFileType(url) === 'image') {
        return url;
      }
      // For PDFs, return the URL directly as modern browsers can preview them
      if (getFileType(url) === 'pdf') {
        return url;
      }
    }

    return url;
  };

  // Add preview component to handle different file types - Enhanced
  const FilePreview: React.FC<{ url: string; documentType?: string }> = ({ url, documentType }) => {
    const fileType = getFileType(url);
    const fileIcon = getFileTypeIcon(fileType);

    return (
      <div className="w-full flex flex-col">
        {/* Preview Header */}
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{fileIcon}</span>
            <h3 className="text-lg font-semibold text-[#800000]">{documentType || 'Document Preview'}</h3>
            <span className="text-sm text-gray-500 capitalize">({fileType} file)</span>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex justify-center">
          {fileType === 'image' && (
            <img
              src={url}
              alt="Document preview"
              className="max-w-full max-h-[calc(70vh-4rem)] object-contain rounded shadow-lg"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/file.svg'; // Fallback to generic file icon
              }}
            />
          )}
          {(fileType === 'pdf' || fileType === 'document') && (
            <iframe
              src={url}
              title="Document Preview"
              className="w-full h-[calc(70vh-4rem)] border-0 rounded shadow-lg"
            />
          )}
          {(fileType === 'spreadsheet' || fileType === 'presentation' || fileType === 'other') && (
            <div className="flex flex-col items-center justify-center h-[calc(70vh-4rem)] bg-gray-50 rounded-lg p-8">
              <span className="text-6xl mb-4">{fileIcon}</span>
              <p className="text-lg text-gray-600 mb-2">Preview not available for {fileType} files</p>
              <p className="text-sm text-gray-500 mb-4">Click the download button to view this file</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#a83232] transition-colors flex items-center gap-2"
              >
                <FaDownload />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return <div>Please log in to view your documents.</div>;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      {/* Add Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <h3 className="text-2xl font-bold text-gray-700">{statusCounts.pending}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <FaUpload className="text-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-500">Submitted</p>
              <h3 className="text-2xl font-bold text-blue-700">{statusCounts.submitted}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
              <FaPaperclip className="text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-500">Approved</p>
              <h3 className="text-2xl font-bold text-green-700">{statusCounts.approved}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
              <FaCheck className="text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-500">Rejected</p>
              <h3 className="text-2xl font-bold text-red-700">{statusCounts.rejected}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
              <FaTimes className="text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}
      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-800 px-4 py-2 rounded shadow-lg animate-fade-in">
          {error}
        </div>
      )}
      {/* Reminder Message */}
      {allSubmittedOrApproved && anySubmitted && !allApproved && (
        <div className="flex items-center gap-2 mb-4 p-3 border-l-4 rounded bg-blue-100 border-blue-500 text-blue-800">
          <span role="img" aria-label="Status">⏳</span>
          <span>
            {`Thank you for submitting your requirements. Wait for Admin approval for any changes. (${submittedCount}/${totalRequired})`}
          </span>
        </div>
      )}
      {(totalRequired > 0 && submittedCount < totalRequired) && (
        <div className="flex items-center gap-2 mb-4 p-3 border-l-4 rounded bg-yellow-100 border-yellow-500 text-yellow-800">
          <span role="img" aria-label="Status">⚠️</span>
          <span>
            {`Reminder: Please comply your document requirements as soon as possible. (${submittedCount}/${totalRequired} submitted)`}
          </span>
        </div>
      )}
      {allApproved && (
        <div className="flex items-center gap-2 mb-4 p-3 border-l-4 rounded bg-green-100 border-green-500 text-green-800">
          <span role="img" aria-label="Status">✅</span>
          <span>
            {`Well done! All of your submitted requirements were approved. (${submittedCount}/${totalRequired})`}
          </span>
        </div>
      )}
      {/* Search and Upload Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search documents..."
            title="Search documents"
            className="border rounded px-2 py-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search documents"
          />
          {/* <button className="p-2" title="Filter documents" aria-label="Filter documents"><FaFilter /></button> */}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#a83232] disabled:opacity-50"
            onClick={() => {
              if (pendingDocs.length === 0 && documents.length > 0) {
                setShowUploadInfo(true);
              } else {
                setShowModal(true);
              }
            }}
            title="Upload Files"
            aria-label="Upload Files"
            disabled={pendingDocs.length === 0 && documents.length > 0}
          >
            <FaPlus /> Upload Files
          </button>
          <button
            className="bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-900 disabled:opacity-50"
            onClick={() => setShowDeleteModal(true)}
            title="Delete Selected"
            aria-label="Delete Selected"
            disabled={selectedDocs.length === 0 || documents.some(doc =>
              selectedDocs.includes(doc.DocumentID) && doc.SubmissionStatus === 'Approved'
            )}
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
      {/* Checklist Table */}
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left"><input type="checkbox" checked={selectedDocs.length === documents.length && documents.length > 0} onChange={handleSelectAll} aria-label="Select all documents" title="Select all documents" /></th>
            <th className="p-3 text-left">Document</th>
            <th className="p-3 text-left">Document Number</th>
            <th className="p-3 text-left">File Uploaded</th>
            <th className="p-3 text-left">Submission Status</th>
            <th className="p-3 text-left">Last Modified</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="p-3 text-center">Loading...</td>
            </tr>
          ) : documentTypes.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-3 text-center">No document types found</td>
            </tr>
          ) : (
            documentTypes
              .filter(dt => String(dt.DocumentTypeName).toLowerCase().includes(search.toLowerCase()))
              .map((dt, idx) => {
                const doc = documents.find(d => d.DocumentTypeID === dt.DocumentTypeID);
                const fileType = doc ? getFileType(doc.FileUrl) : 'other';
                const fileIcon = getFileTypeIcon(fileType);
                return (
                  <tr key={dt.DocumentTypeID} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={doc ? selectedDocs.includes(doc.DocumentID) : false}
                        onChange={() => doc && handleSelectDoc(doc.DocumentID)}
                        aria-label={`Select document ${dt.DocumentTypeName}`}
                        title={`Select document ${dt.DocumentTypeName}`}
                        disabled={!doc || doc.SubmissionStatus === 'Approved'}
                      />
                    </td>
                    <td className="p-3 font-medium">{dt.DocumentTypeName}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {doc ? generateDocumentNumber(doc) : '-'}
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      {doc && doc.FileUrl ? (
                        <React.Fragment>
                          <span className="text-lg" title={`${fileType} file`}>{fileIcon}</span>
                          <a
                            href={getPreviewUrl(doc.FileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#800000] hover:underline flex items-center gap-1"
                            title={getFileName(doc.FileUrl)}
                          >
                            {truncateFileName(getFileName(doc.FileUrl))}
                          </a>
                          <button
                            onClick={() => setPreviewFileUrl(getPreviewUrl(doc.FileUrl))}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title="View file"
                            aria-label="View file"
                          >
                            <FaEye />
                          </button>
                          <a
                            href={doc.DownloadUrl || doc.FileUrl}
                            download
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            title="Download file"
                            aria-label="Download file"
                          >
                            <FaDownload />
                          </a>
                        </React.Fragment>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                          <span className="text-lg">📁</span>
                          No file
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                        ${doc && doc.SubmissionStatus === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : doc && doc.SubmissionStatus === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : doc && doc.FileUrl
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'}
                      `}>
                        {doc && doc.SubmissionStatus === 'Approved' ? 'Approved' :
                          doc && doc.SubmissionStatus === 'Rejected' ? 'Rejected' :
                            // doc && doc.FileUrl ? 'Submitted' :
                            //   'Pending'}
                          doc && doc.SubmissionStatus === 'Submitted' ? 'Submitted' :
                              doc && doc.FileUrl ? 'Submitted' :
                                'Pending'}
                      </span>
                    </td>
                    <td className="p-3">{doc ? new Date(doc.UploadDate).toLocaleDateString() : '-'}</td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
      {/* Summary Row */}
      <div className="flex justify-between items-center mt-2">
        <span className={isComplete ? "text-green-700 font-semibold" : "text-yellow-700 font-semibold"}>{isComplete ? "Complete" : "Incomplete"}</span>
        <span>Submitted: {submittedCount}/{documentTypes.length}</span>
      </div>

      {/* Upload Files Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col relative">
            {/* Header - Fixed */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#800000] rounded flex items-center justify-center text-white font-bold">⬤</div>
                <span className="font-bold text-lg text-[#800000]">UPLOAD FILES</span>
              </div>
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                onClick={() => setShowModal(false)}
                title="Close modal"
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
              <div className="mt-2 text-sm text-gray-600">
                Upload your required documents. Files will be reviewed by the administration.
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">Document Type</th>
                      <th className="p-3 text-left">Document Number</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Current File</th>
                      <th className="p-3 text-left">Upload New File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentTypes.map((dt) => {
                      const existingDoc = documents.find(d => d.DocumentTypeID === dt.DocumentTypeID);
                      const isApproved = existingDoc?.SubmissionStatus === 'Approved';
                      const fileType = existingDoc ? getFileType(existingDoc.FileUrl) : 'other';
                      const fileIcon = getFileTypeIcon(fileType);

                      return (
                        <tr key={dt.DocumentTypeID} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">{dt.DocumentTypeName}</div>
                            <div className="text-xs text-gray-500">
                              Accepted formats: {dt.AcceptedFileTypes || '.pdf, .doc, .docx, .jpg, .png'}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {existingDoc ? generateDocumentNumber(existingDoc) : '-'}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                              ${isApproved ? 'bg-green-100 text-green-700' :
                                existingDoc?.SubmissionStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                  existingDoc?.FileUrl ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'}`}
                            >
                              {isApproved ? 'Approved' :
                                existingDoc?.SubmissionStatus === 'Rejected' ? 'Rejected' :
                                  existingDoc?.SubmissionStatus === 'Submitted' ? 'Submitted' :
                                    existingDoc?.FileUrl ? 'Submitted' :
                                      'Pending'}
                            </span>
                          </td>
                          <td className="p-3">
                            {existingDoc?.FileUrl ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg" title={`${fileType} file`}>{fileIcon}</span>
                                <a
                                  href={existingDoc.FileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#800000] hover:underline"
                                >
                                  {truncateFileName(getFileName(existingDoc.FileUrl))}
                                </a>
                                <button
                                  onClick={() => setPreviewFileUrl(existingDoc.FileUrl!)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                  title="View file"
                                >
                                  <FaEye />
                                </button>
                                <a
                                  href={existingDoc.DownloadUrl || existingDoc.FileUrl}
                                  download
                                  className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                                  title="Download file"
                                >
                                  <FaDownload />
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 flex items-center gap-1">
                                <span className="text-lg">📁</span>
                                No file uploaded
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {!isApproved && (
                              <form
                                onSubmit={(e) => handleUpload(e, dt)}
                                className="flex items-center gap-2"
                              >
                                <label className={`cursor-pointer px-3 py-2 rounded border flex items-center gap-2 transition-colors
                                  ${uploadingStates[dt.DocumentTypeID]
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : uploadSuccessStates[dt.DocumentTypeID]
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-gray-50 hover:bg-gray-100'}`}
                                >
                                  {uploadingStates[dt.DocumentTypeID] ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Uploading...</span>
                                    </>
                                  ) : uploadSuccessStates[dt.DocumentTypeID] ? (
                                    <>
                                      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      <span>Uploaded</span>
                                    </>
                                  ) : (
                                    <>
                                      <FaUpload className="text-gray-500" />
                                      <span>Choose File</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    name="file"
                                    className="hidden"
                                    accept={dt.AcceptedFileTypes?.replace(/ /g, '')}
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        e.target.form?.requestSubmit();
                                      }
                                    }}
                                    disabled={uploadingStates[dt.DocumentTypeID]}
                                  />
                                </label>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end">
                <button
                  className="border px-4 py-2 rounded hover:bg-gray-50"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
                setIsDeleteConfirmed(false);
              }}
              title="Close delete confirmation"
              aria-label="Close delete confirmation"
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-bold mb-4 text-black">Confirm Remove Files</h2>

            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-yellow-800 mb-2">
                  This will remove the uploaded files and set their status to Pending. You can upload new files later.
                </p>
                <p className="text-sm text-yellow-700">
                  Please type your full name <span className="font-semibold">{user?.fullName}</span> to confirm.
                </p>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Files to be removed:</p>
                <ul className="list-disc pl-6 text-sm text-gray-700">
                  {documents.filter(doc => selectedDocs.includes(doc.DocumentID)).map(doc => (
                    <li key={doc.DocumentID}>
                      {getDocumentTypeName(doc.DocumentTypeID)}
                      {doc.FileUrl ? ` (${doc.FileUrl.split('/').pop()})` : ' (No file)'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="border px-4 py-2 rounded hover:bg-gray-50"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setIsDeleteConfirmed(false);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDelete}
                disabled={!isDeleteConfirmed || loading}
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
                  'Remove Files'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* File Preview Modal */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
              onClick={() => setPreviewFileUrl(null)}
              title="Close preview"
              aria-label="Close preview"
            >
              <FaTimes />
            </button>
            <FilePreview
              url={previewFileUrl}
              documentType={documents.find(doc => doc.FileUrl === previewFileUrl)?.DocumentType?.DocumentTypeName}
            />
          </div>
        </div>
      )}
      {/* Info Modal for Upload Button when no pending */}
      {showUploadInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowUploadInfo(false)} title="Close info" aria-label="Close info"><FaTimes /></button>
            <div className="flex flex-col items-center gap-4">
              <span className="text-lg text-center">You already submitted the required documents. Select a Document to Edit if you need to make changes.</span>
              <button className="bg-[#800000] text-white px-4 py-2 rounded" onClick={() => setShowUploadInfo(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsFaculty;