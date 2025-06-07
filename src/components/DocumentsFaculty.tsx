import React, { useEffect, useState } from 'react';
import { FaPlus, FaTimes, FaDownload, FaEye } from 'react-icons/fa';
import { uploadFacultyDocument, fetchFacultyDocuments } from '../api/faculty-documents';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabaseClient';

// Example: Replace with fetch from your backend if needed
const DOCUMENT_TYPES = [
  { DocumentTypeID: 1, DocumentTypeName: 'Resume' },
  { DocumentTypeID: 2, DocumentTypeName: 'Transcript' },
  { DocumentTypeID: 3, DocumentTypeName: 'Certificate' },
  // ...add more as needed
];

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

const DocumentsFaculty: React.FC = () => {
  const { user } = useUser();
  const [documents, setDocuments] = useState<DocumentFacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{
    DocumentTypeID: string;
    file: File | null;
  }>({
    DocumentTypeID: '',
    file: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);

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

  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as unknown as HTMLInputElement & HTMLSelectElement;
    if (name === 'file' && files) {
      setForm(f => ({ ...f, file: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!facultyId || !form.DocumentTypeID || !form.file) {
      setError('Please fill all fields and select a file.');
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
      });
      await fetchDocs();
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
    const type = DOCUMENT_TYPES.find(dt => dt.DocumentTypeID === id);
    return type ? type.DocumentTypeName : id;
  };

  if (!user) {
    return <div>Please log in to view your documents.</div>;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      {/* Header Section */}
      <div className="flex justify-end items-center mb-4">
        <button
          className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#a83232]"
          onClick={() => setShowModal(true)}
        >
          <FaPlus /> Upload Document
        </button>
      </div>
      {/* Modal for Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-bold mb-4 text-black">Upload Document</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="document-type-select" className="block text-black mb-1 font-medium">Document Type</label>
                <select
                  id="document-type-select"
                  name="DocumentTypeID"
                  value={form.DocumentTypeID}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt.DocumentTypeID} value={dt.DocumentTypeID}>
                      {dt.DocumentTypeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-black mb-1 font-medium">File Upload</label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={handleFormChange}
                  className="w-full"
                  required
                  title="Upload your document file"
                  placeholder="Choose a file to upload"
                />
              </div>
              {error && <div className="text-red-600">{error}</div>}
              <button
                type="submit"
                className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-[#a83232]"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-black">Document ID</th>
              <th className="p-3 text-left text-black">Document Type</th>
              <th className="p-3 text-left text-black">Upload Date</th>
              <th className="p-3 text-left text-black">Status</th>
              <th className="p-3 text-left text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-3 text-center">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-center">No documents found</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.DocumentID} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-left text-black">{doc.DocumentID}</td>
                  <td className="p-3 text-left text-black">{doc.DocumentType?.DocumentTypeName || getDocumentTypeName(doc.DocumentTypeID)}</td>
                  <td className="p-3 text-left text-black">{new Date(doc.UploadDate).toLocaleDateString()}</td>
                  <td className="p-3 text-left text-black">
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
                  <td className="p-3 text-left text-black">
                    <div className="flex space-x-2">
                      {doc.FileUrl && (
                        <a
                          href={doc.FileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="View document"
                        >
                          <FaEye />
                        </a>
                      )}
                      {doc.DownloadUrl && (
                        <a
                          href={doc.DownloadUrl}
                          download
                          className="text-green-600 hover:text-green-800"
                          title="Download document"
                        >
                          <FaDownload />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentsFaculty;