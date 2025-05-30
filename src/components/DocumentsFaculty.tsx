import React, { useEffect, useState } from 'react';
import { FaPlus, FaPaperclip, FaFilter, FaPen } from 'react-icons/fa';

// Interface for document row, matching your backend API response
interface DocumentFacultyRow {
  id: number;
  name: string;
  file: string;
  status: string;
  date: string;
}

const DocumentsFaculty: React.FC<{ facultyId?: number }> = ({ facultyId }) => {
  const [documents, setDocuments] = useState<DocumentFacultyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/faculty-documents${facultyId ? `?facultyId=${facultyId}` : ''}`)
      .then(res => res.json())
      .then(data => setDocuments(data))
      .finally(() => setLoading(false));
  }, [facultyId]);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl text-black font-bold">Documents Checklist</h1>
        <button className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800">
          <FaPlus /> Upload Files
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Documents Table */}
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-black">#</th>
              <th className="p-3 text-left text-black">Document</th>
              <th className="p-3 text-left text-black">File Uploaded</th>
              <th className="p-3 text-left text-black">Submission Status</th>
              <th className="p-3 text-left text-black">Date Submitted</th>
              <th className="p-3 text-left text-black">Action</th>
              <th className="p-3 text-left text-black">
                <FaFilter />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-3 text-center">Loading...</td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={doc.id} className="border-t hover:bg-gray-50">
                  {/* Sequential Number */}
                  <td className="p-3 text-left text-black">{index + 1}</td>

                  {/* Document Name with Checkbox */}
                  <td className="p-3 gap-2 text-black">
                    <input
                      id={`checkbox-${doc.id}`}
                      type="checkbox"
                      checked
                      readOnly
                      className="h-4 w-4"
                      aria-label={`Select ${doc.name}`}
                    />
                    <label htmlFor={`checkbox-${doc.id}`} className="ml-2 cursor-pointer">
                      {doc.name}
                    </label>
                  </td>

                  {/* File Uploaded */}
                  <td className="p-3 text-[#800000] flex items-center text-left gap-2">
                    <FaPaperclip className="w-4 h-4" />
                    <span>{doc.file}</span>
                  </td>

                  {/* Submission Status */}
                  <td className="p-3 text-green-600 text-black">{doc.status}</td>

                  {/* Date Submitted */}
                  <td className="p-3 text-left text-black">{doc.date}</td>

                  {/* Action */}
                  <td className="p-3 flex items-center gap-2">
                    <FaPen className="text-gray-500 cursor-pointer w-4 h-4" />
                  </td>
                  {/* Filter column (empty for now) */}
                  <td></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}      
      {/* Submission Summary */}
      <div className="mt-4 text-right text-sm text-black">
        <span className="text-green-600 font-bold">Complete</span> Submitted: {documents.length}/5
      </div>
    </div>
  );
};

export default DocumentsFaculty;