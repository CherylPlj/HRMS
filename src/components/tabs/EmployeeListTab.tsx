import React, { useState, useEffect } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaEye, FaLink, FaTimes } from 'react-icons/fa';
import { Search } from 'lucide-react';

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

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

interface Props {
  employees: Employee[];
  documents: DocumentEmployeeRow[];
  documentTypes: DocumentType[];
  departments: Department[];
}

const EmployeeListTab: React.FC<Props> = ({ employees, documents, documentTypes, departments }) => {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  
  // State for selection and expanded rows
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...employees];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.FirstName?.toLowerCase().includes(searchLower) ||
        employee.LastName?.toLowerCase().includes(searchLower) ||
        employee.Email?.toLowerCase().includes(searchLower) ||
        employee.Position?.toLowerCase().includes(searchLower)
      );
    }

    // Apply department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(employee => 
        employee.DepartmentID === selectedDepartment
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(employee => 
        employee.EmploymentStatus === selectedStatus
      );
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, selectedDepartment, selectedStatus]);

  // Handle select all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedRows(filteredEmployees.map(employee => employee.EmployeeID));
    } else {
      setSelectedRows([]);
    }
  };

  // Handle row selection
  const handleRowSelect = (employeeId: string) => {
    setSelectedRows(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Handle download selected
  const handleDownloadSelected = () => {
    // Implementation for downloading selected employees
    console.log('Downloading selected employees:', selectedRows);
  };

  // Get status order for sorting
  const getStatusOrder = (status: string) => {
    switch (status) {
      case 'Submitted': return 1;
      case 'Returned': return 2;
      case 'Approved': return 3;
      default: return 4;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Employee List</h2>
      
      {/* Search and Filter Section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-center gap-4 flex-grow">
          <div className="w-64">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
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
            >
              <option value="all">All Employment Statuses</option>
              <option value="Active">Active</option>
              <option value="Regular">Regular</option>
              <option value="Under Probation">Under Probation</option>
              <option value="Resigned">Resigned</option>
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

      {/* Employee Table */}
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
                  title="Select all employees"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
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
            {filteredEmployees.map((employee) => {
              const documentsForEmployee = documents.filter(doc => doc.EmployeeID === employee.EmployeeID);
              const submittedCount = documentTypes.filter(dt =>
                documentsForEmployee.some(doc =>
                  doc.DocumentTypeID === dt.DocumentTypeID &&
                  (doc.SubmissionStatus === 'Submitted' || doc.SubmissionStatus === 'Approved')
                )
              ).length;
              const totalRequired = documentTypes.length;

              const sortedDocuments = [...documentsForEmployee].sort((a, b) => {
                const statusOrderA = getStatusOrder(a.SubmissionStatus);
                const statusOrderB = getStatusOrder(b.SubmissionStatus);
                
                if (statusOrderA !== statusOrderB) {
                  return statusOrderA - statusOrderB;
                }
                
                return new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime();
              });

              let employeeSubmissionStatus = 'N/A';
              if (totalRequired > 0) {
                if (submittedCount === totalRequired) {
                  employeeSubmissionStatus = 'Complete';
                } else if (submittedCount > 0 && submittedCount < totalRequired) {
                  employeeSubmissionStatus = 'Incomplete';
                } else {
                  employeeSubmissionStatus = 'Pending';
                }
              }

              return (
                <React.Fragment key={employee.EmployeeID}>
                  <tr className={`hover:bg-gray-50 ${selectedRows.includes(employee.EmployeeID) ? 'bg-gray-100' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(employee.EmployeeID)}
                        onChange={() => handleRowSelect(employee.EmployeeID)}
                        className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                        title={`Select ${employee.FirstName} ${employee.LastName}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={employee.Photo || '/default-avatar.png'}
                            alt={`${employee.FirstName || ''} ${employee.LastName || ''}`}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.FirstName || 'Unknown'} {employee.LastName || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">{employee.Email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.Position || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.Department?.DepartmentName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.EmploymentStatus || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>Submitted: {submittedCount}/{totalRequired}</span>
                        {totalRequired > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEmployeeId(expandedEmployeeId === employee.EmployeeID ? null : employee.EmployeeID);
                            }}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title={expandedEmployeeId === employee.EmployeeID ? 'Collapse documents' : 'Expand documents'}
                          >
                            {expandedEmployeeId === employee.EmployeeID ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employeeSubmissionStatus === 'Complete'
                          ? 'bg-emerald-100 text-emerald-800'
                          : employeeSubmissionStatus === 'Incomplete'
                          ? 'bg-amber-100 text-amber-800'
                          : employeeSubmissionStatus === 'Pending'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-gray-100 text-gray-700' // For N/A
                      }`}>
                        {employeeSubmissionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          title="View Details" 
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaEye />
                        </button>
                        <button 
                          title="Edit" 
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaPen />
                        </button>
                        <button 
                          title="Delete" 
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedEmployeeId === employee.EmployeeID && (
                    <tr>
                      <td colSpan={8} className="px-0 py-0 bg-gray-50">
                        <div className="m-4 rounded-xl shadow-lg bg-white border border-gray-200 p-6">
                          <h4 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-[#800000] rounded-full"></span>
                            Documents for {employee.FirstName} {employee.LastName}
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
                                    const doc = documentsForEmployee.find(d => d.DocumentTypeID === dt.DocumentTypeID);
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
                                                className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                title="View Document"
                                                type="button"
                                              >
                                                <FaEye />
                                              </button>
                                              {doc.FileUrl && (
                                                <a
                                                  href={doc.FileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                  title="Open in New Tab"
                                                >
                                                  <FaLink />
                                                </a>
                                              )}
                                              {doc.DownloadUrl && (
                                                <a
                                                  href={doc.DownloadUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-gray-500 hover:text-blue-700 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                  title="Download Document"
                                                >
                                                  <FaDownload />
                                                </a>
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
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  No employees found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeListTab; 