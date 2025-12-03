import React from 'react';
import { FaEye, FaLink, FaDownload, FaPen } from 'react-icons/fa';
import { DocumentFacultyRow } from './types';
import { getViewUrl, getDownloadUrl, getStatusOrder } from './utils';

interface DocumentTableProps {
  loading: boolean;
  documents: DocumentFacultyRow[];
  selectedDocumentStatus: string;
  selectedDocumentType: number | 'all';
  documentSearchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  statusUpdating: number | null;
  onViewDocument: (document: DocumentFacultyRow) => void;
  onStatusChange: (docId: number, currentStatus: string) => void;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
  loading,
  documents,
  selectedDocumentStatus,
  selectedDocumentType,
  documentSearchTerm,
  currentPage,
  itemsPerPage,
  statusUpdating,
  onViewDocument,
  onStatusChange
}) => {
  const filtered = documents
    .filter(doc => 
      (selectedDocumentStatus === 'all' || doc.SubmissionStatus === selectedDocumentStatus) &&
      (selectedDocumentType === 'all' || doc.DocumentTypeID === selectedDocumentType) &&
      (documentSearchTerm === '' || 
       doc.facultyName.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
       doc.documentTypeName.toLowerCase().includes(documentSearchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const orderA = getStatusOrder(a.SubmissionStatus);
      const orderB = getStatusOrder(b.SubmissionStatus);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocs = filtered.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <tbody>
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400">Loading documents...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <tbody>
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400">No documents found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
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
          {paginatedDocs.map((doc, idx) => (
            <tr
              key={doc.DocumentID}
              className="hover:bg-gray-100 transition-colors"
            >
              <td className="px-6 py-4 text-sm text-gray-700">{startIndex + idx + 1}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{doc.facultyName || 'Unknown Faculty'}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{doc.documentTypeName || 'Unknown Type'}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{new Date(doc.UploadDate).toLocaleString()}</td>
              <td className="px-6 py-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                  ${
                    doc.SubmissionStatus === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : doc.SubmissionStatus === 'Returned'
                      ? 'bg-red-100 text-red-800'
                      : doc.SubmissionStatus === 'Submitted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-900'
                  }
                `}>
                  {doc.SubmissionStatus}
                </span>
              </td>
              <td className="px-6 py-4 flex items-center space-x-2">
                {doc.FileUrl && (
                  <span className="flex items-center space-x-1">
                    <button
                      onClick={() => onViewDocument(doc)}
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
                      href={getDownloadUrl(doc.DownloadUrl || doc.FileUrl)}
                      download
                      className="text-gray-600 hover:text-gray-900"
                      title="Download Document"
                    >
                      <FaDownload className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => onStatusChange(doc.DocumentID, doc.SubmissionStatus)}
                      disabled={statusUpdating === doc.DocumentID}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      title="Edit Status"
                    >
                      <FaPen className="w-5 h-5" />
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentTable;

