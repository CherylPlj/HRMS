import React from 'react';
import { Eye, Link, Download } from 'lucide-react';
import { Faculty, DocumentFacultyRow, DocumentType } from './types';
import { getViewUrl, getDownloadUrl, getStatusOrder } from './utils';
import { useUser } from '@clerk/nextjs';

interface FacultyTableProps {
  loading: boolean;
  facultyList: Faculty[];
  documents: DocumentFacultyRow[];
  documentTypes: DocumentType[];
  selectedRows: number[];
  expandedFacultyId: number | null;
  currentPage: number;
  itemsPerPage: number;
  onRowSelect: (facultyId: number) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExpandToggle: (facultyId: number) => void;
  onViewDetails: (faculty: Faculty) => void;
  onViewDocument: (document: DocumentFacultyRow) => void;
}

const FacultyTable: React.FC<FacultyTableProps> = ({
  loading,
  facultyList,
  documents,
  documentTypes,
  selectedRows,
  expandedFacultyId,
  currentPage,
  itemsPerPage,
  onRowSelect,
  onSelectAll,
  onExpandToggle,
  onViewDetails,
  onViewDocument
}) => {
  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFaculty = facultyList.slice(startIndex, endIndex);
  const allSelected = paginatedFaculty.length > 0 && paginatedFaculty.every(fac => selectedRows.includes(fac.FacultyID));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                title="Select all faculty members on this page"
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
              Employment Status
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
          {paginatedFaculty.map((faculty) => {
            const documentsForFaculty = documents.filter(doc => doc.FacultyID === faculty.FacultyID);
            const submittedCount = documentTypes.filter(dt =>
              documentsForFaculty.some(doc =>
                doc.DocumentTypeID === dt.DocumentTypeID &&
                (doc.SubmissionStatus === 'Submitted' || doc.SubmissionStatus === 'Approved')
              )
            ).length;
            const totalRequired = documentTypes.length;

            const sortedDocuments = [...documentsForFaculty].sort((a, b) => {
              const statusOrderA = getStatusOrder(a.SubmissionStatus);
              const statusOrderB = getStatusOrder(b.SubmissionStatus);
              
              if (statusOrderA !== statusOrderB) {
                return statusOrderA - statusOrderB;
              }
              
              return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
            });

            let facultySubmissionStatus = 'N/A';
            if (totalRequired > 0) {
              if (submittedCount === totalRequired) {
                facultySubmissionStatus = 'Complete';
              } else if (submittedCount > 0 && submittedCount < totalRequired) {
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
                      onChange={() => onRowSelect(faculty.FacultyID)}
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                      title={`Select ${faculty.User?.FirstName} ${faculty.User?.LastName}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
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
                    {faculty.EmploymentStatus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>Submitted: {submittedCount}/{totalRequired}</span>
                      {totalRequired > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpandToggle(faculty.FacultyID);
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
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {facultySubmissionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onViewDetails(faculty)}
                        title="View Details" 
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedFacultyId === faculty.FacultyID && (
                  <tr>
                    <td colSpan={8} className="px-0 py-0 bg-gray-50">
                      <div className="m-4 rounded-xl shadow-lg bg-white border border-gray-200 p-6">
                        <h4 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-[#800000] rounded-full"></span>
                          Documents for {faculty.User?.FirstName} {faculty.User?.LastName}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-700">
                                <th className="p-3 text-left font-semibold">Document Type</th>
                                <th className="p-3 text-left font-semibold">Status</th>
                                <th className="p-3 text-left font-semibold">Date</th>
                                <th className="p-3 text-left font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentTypes.length > 0 ? (
                                documentTypes.map((dt) => {
                                  const doc = documentsForFaculty.find(d => d.DocumentTypeID === dt.DocumentTypeID);
                                  return (
                                    <tr key={dt.DocumentTypeID} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                      <td className="p-3 font-medium text-gray-900">{dt.DocumentTypeName}</td>
                                      <td className="p-3">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                                          ${doc
                                            ? doc.SubmissionStatus === 'Approved'
                                              ? 'bg-green-100 text-green-700'
                                              : doc.SubmissionStatus === 'Submitted'
                                              ? 'bg-blue-100 text-blue-700'
                                              : doc.SubmissionStatus === 'Returned'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-gray-100 text-gray-700'
                                            : 'bg-gray-100 text-gray-700'
                                          }`}>
                                          {doc ? doc.SubmissionStatus : 'Pending'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-gray-500">
                                        {doc ? new Date(doc.UploadDate).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="p-3">
                                        {doc ? (
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => onViewDocument(doc)}
                                              className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                              title="View Document"
                                              type="button"
                                            >
                                              <Eye size={16} />
                                            </button>
                                            {doc.FileUrl && (
                                              <>
                                                <a
                                                  href={getViewUrl(doc.FileUrl)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                  title="Open in New Tab"
                                                >
                                                  <Link size={16} />
                                                </a>
                                                <a
                                                  href={getDownloadUrl(doc.DownloadUrl || doc.FileUrl)}
                                                  download
                                                  className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                  title="Download Document"
                                                >
                                                  <Download size={16} />
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 italic">No file</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={4} className="p-3 text-center text-gray-400">No document types defined.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {facultyList.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                No faculty members found matching your search criteria
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FacultyTable;

