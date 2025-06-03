import React, { useEffect, useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { uploadFacultyDocument, fetchFacultyDocuments } from '../api/faculty-documents';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  file?: string;
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
      if (!user?.emailAddresses[0]?.emailAddress) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('Faculty(FacultyID)')
          .eq('Email', user.emailAddresses[0].emailAddress)
          .single();

        if (userError) throw userError;

        if (userData?.Faculty && 'FacultyID' in userData.Faculty && typeof userData.Faculty.FacultyID === 'number') {
          setFacultyId(userData.Faculty.FacultyID);
        }
      } catch (err) {
        console.error('Error fetching faculty ID:', err);
        setError('Failed to fetch faculty information');
      }
    };

    fetchFacultyId();
  }, [user]);

  // Fetch documents
  const fetchDocs = async () => {
    if (!facultyId) return;
    
    setLoading(true);
    try {
      const data = await fetchFacultyDocuments(facultyId);
      setDocuments(data);
    } catch (err) {
      setDocuments([]);
      setError('Failed to fetch documents');
    }
    setLoading(false);
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
    setUploading(true);
    const data = new FormData();
    data.append('FacultyID', facultyId.toString());
    data.append('DocumentTypeID', form.DocumentTypeID);
    data.append('file', form.file);

    try {
      await uploadFacultyDocument(data);
      setShowModal(false);
      setForm({
        DocumentTypeID: '',
        file: null,
      });
      fetchDocs();
    } catch (err) {
      setError('Failed to upload document.');
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-3 text-center">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-center">No documents found</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.DocumentID} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-left text-black">{doc.DocumentID}</td>
                  <td className="p-3 text-left text-black">{getDocumentTypeName(doc.DocumentTypeID)}</td>
                  <td className="p-3 text-left text-black">{doc.UploadDate}</td>
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