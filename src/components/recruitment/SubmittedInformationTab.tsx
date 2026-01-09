import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Check, X, Eye, Download, RefreshCw } from 'lucide-react';
import { formatDate } from './utils';

interface SubmittedCandidate {
  CandidateID: number;
  LastName: string;
  FirstName: string;
  MiddleName?: string;
  ExtensionName?: string;
  FullName: string;
  Email: string;
  ContactNumber?: string;
  Sex?: string;
  DateOfBirth?: string;
  Status: string;
  DateApplied: string;
  EmployeeInfoSubmitted: boolean;
  EmployeeInfoSubmittedDate?: string;
  SubmittedEmployeeInfo?: any;
  Vacancy?: {
    VacancyID: number;
    VacancyName: string;
    JobTitle: string;
  };
}

interface SubmittedInformationTabProps {
  onRefresh: () => void;
  onNavigateToHired?: () => void;
}

export const SubmittedInformationTab: React.FC<SubmittedInformationTabProps> = ({ onRefresh, onNavigateToHired }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<SubmittedCandidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SubmittedCandidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showApproveSuccessModal, setShowApproveSuccessModal] = useState(false);
  const [hiredCandidateName, setHiredCandidateName] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchSubmittedCandidates();
  }, []);

  const fetchSubmittedCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/candidates/offered-info');
      
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (error) {
      console.error('Error fetching submitted candidates:', error);
      toast.error('Failed to fetch submitted information');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidates;
    
    const searchLower = searchTerm.toLowerCase();
    return candidates.filter(candidate =>
      candidate.FullName.toLowerCase().includes(searchLower) ||
      candidate.Email.toLowerCase().includes(searchLower) ||
      candidate.Vacancy?.VacancyName.toLowerCase().includes(searchLower)
    );
  }, [candidates, searchTerm]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  const handleViewDetails = (candidate: SubmittedCandidate) => {
    setSelectedCandidate(candidate);
    setShowDetailsModal(true);
  };

  const handleApprove = async () => {
    if (!selectedCandidate) return;

    try {
      setProcessing(true);
      
      const submittedInfo = selectedCandidate.SubmittedEmployeeInfo || {};
      
      // Prepare employee data with required fields
      // Format DateOfBirth properly
      let dateOfBirth = submittedInfo.DateOfBirth || selectedCandidate.DateOfBirth;
      if (dateOfBirth && typeof dateOfBirth === 'string') {
        // Ensure it's in ISO format
        dateOfBirth = new Date(dateOfBirth).toISOString();
      }
      
      // Check if this is a Faculty position
      const isFacultyPosition = selectedCandidate.Vacancy?.JobTitle === 'Faculty';
      
      const employeeData = {
        FirstName: selectedCandidate.FirstName,
        LastName: selectedCandidate.LastName,
        MiddleName: selectedCandidate.MiddleName || submittedInfo.MiddleName || null,
        ExtensionName: selectedCandidate.ExtensionName || submittedInfo.ExtensionName || null,
        Email: selectedCandidate.Email || submittedInfo.Email || null,
        DateOfBirth: dateOfBirth,
        Sex: selectedCandidate.Sex || submittedInfo.Sex || 'Male',
        HireDate: new Date().toISOString().split('T')[0],
        EmploymentStatus: 'Regular',
        PlaceOfBirth: submittedInfo.PlaceOfBirth || null,
        CivilStatus: submittedInfo.CivilStatus || null,
        Nationality: submittedInfo.Nationality || null,
        Religion: submittedInfo.Religion || null,
        BloodType: submittedInfo.BloodType || null,
        Phone: submittedInfo.Phone || selectedCandidate.ContactNumber || null,
        Address: submittedInfo.Address || null,
        PresentAddress: submittedInfo.PresentAddress || null,
        PermanentAddress: submittedInfo.PermanentAddress || null,
        SSSNumber: submittedInfo.SSSNumber || null,
        TINNumber: submittedInfo.TINNumber || null,
        PhilHealthNumber: submittedInfo.PhilHealthNumber || null,
        PagIbigNumber: submittedInfo.PagIbigNumber || null,
        GSISNumber: submittedInfo.GSISNumber || null,
        PRCLicenseNumber: submittedInfo.PRCLicenseNumber || null,
        PRCValidity: submittedInfo.PRCValidity || null,
        EmergencyContactName: submittedInfo.EmergencyContactName || null,
        EmergencyContactNumber: submittedInfo.EmergencyContactNumber || null,
        // Add faculty-specific fields if this is a faculty position
        ...(isFacultyPosition && {
          createFacultyRecord: true,
          DepartmentID: submittedInfo.DepartmentID || null,
          Position: submittedInfo.Position || 'Faculty'
        })
      };

      // Create employee
      const employeeResponse = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeData)
      });

      if (!employeeResponse.ok) {
        const errorData = await employeeResponse.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      // Update candidate status to "Hired" using FormData
      const formData = new FormData();
      formData.append('LastName', selectedCandidate.LastName);
      formData.append('FirstName', selectedCandidate.FirstName);
      formData.append('MiddleName', selectedCandidate.MiddleName || '');
      formData.append('ExtensionName', selectedCandidate.ExtensionName || '');
      formData.append('Email', selectedCandidate.Email);
      formData.append('Status', 'Hired');
      formData.append('VacancyID', selectedCandidate.Vacancy?.VacancyID?.toString() || '0');

      const candidateResponse = await fetch(`/api/candidates/${selectedCandidate.CandidateID}`, {
        method: 'PATCH',
        body: formData
      });

      if (!candidateResponse.ok) {
        throw new Error('Failed to update candidate status');
      }

      const candidateName = selectedCandidate.FullName;
      setHiredCandidateName(candidateName);
      setShowApproveModal(false);
      setSelectedCandidate(null);
      await fetchSubmittedCandidates();
      await onRefresh();
      
      // Show success modal and toast notification
      toast.success(`${candidateName} has been hired and added to employees`);
      setShowApproveSuccessModal(true);
      
      // Navigate to Hired Candidates tab after showing success modal
      if (onNavigateToHired) {
        setTimeout(() => {
          setShowApproveSuccessModal(false);
          onNavigateToHired();
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error approving candidate:', error);
      toast.error(error.message || 'Failed to approve candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedCandidate || !returnReason.trim()) {
      toast.error('Please provide a return reason');
      return;
    }

    try {
      setProcessing(true);
      
      // Call API to return the submitted info with reason
      const response = await fetch(`/api/candidates/return-submitted-info/${selectedCandidate.CandidateID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: returnReason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to return submission');
      }

      toast.success(`Submission returned for ${selectedCandidate.FullName}. Email sent to candidate.`);
      setShowReturnModal(false);
      setSelectedCandidate(null);
      setReturnReason('');
      await fetchSubmittedCandidates();
      onRefresh();
    } catch (error: any) {
      console.error('Error returning candidate:', error);
      toast.error(error.message || 'Failed to return submission');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Submitted Information</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubmittedCandidates}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No submitted information found
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => (
                <tr key={candidate.CandidateID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{candidate.FullName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{candidate.Email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{candidate.Vacancy?.VacancyName || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {candidate.EmployeeInfoSubmittedDate 
                        ? formatDate(candidate.EmployeeInfoSubmittedDate)
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(candidate)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Employee Information Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCandidate(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Candidate Info */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-800">Candidate Information</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <p className="font-medium">{selectedCandidate.FullName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email:</span>
                      <p className="font-medium">{selectedCandidate.Email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Position:</span>
                      <p className="font-medium">{selectedCandidate.Vacancy?.VacancyName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Date Submitted:</span>
                      <p className="font-medium">
                        {selectedCandidate.EmployeeInfoSubmittedDate 
                          ? formatDate(selectedCandidate.EmployeeInfoSubmittedDate)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submitted Employee Info */}
                {selectedCandidate.SubmittedEmployeeInfo && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-800">Submitted Employee Information</h4>
                    <div className="space-y-4">
                      {/* Personal Information */}
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3 text-gray-700">Personal Information</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedCandidate.SubmittedEmployeeInfo.DateOfBirth && (
                            <div>
                              <span className="text-sm text-gray-600">Date of Birth:</span>
                              <p className="font-medium">{formatDate(selectedCandidate.SubmittedEmployeeInfo.DateOfBirth)}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.PlaceOfBirth && (
                            <div>
                              <span className="text-sm text-gray-600">Place of Birth:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PlaceOfBirth}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.CivilStatus && (
                            <div>
                              <span className="text-sm text-gray-600">Civil Status:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.CivilStatus}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.Nationality && (
                            <div>
                              <span className="text-sm text-gray-600">Nationality:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.Nationality}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.Religion && (
                            <div>
                              <span className="text-sm text-gray-600">Religion:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.Religion}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.BloodType && (
                            <div>
                              <span className="text-sm text-gray-600">Blood Type:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.BloodType}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3 text-gray-700">Contact Information</h5>
                        <div className="space-y-2">
                          {selectedCandidate.SubmittedEmployeeInfo.Address && (
                            <div>
                              <span className="text-sm text-gray-600">Address:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.Address}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.PresentAddress && (
                            <div>
                              <span className="text-sm text-gray-600">Present Address:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PresentAddress}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.PermanentAddress && (
                            <div>
                              <span className="text-sm text-gray-600">Permanent Address:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PermanentAddress}</p>
                            </div>
                          )}
                          {selectedCandidate.SubmittedEmployeeInfo.Phone && (
                            <div>
                              <span className="text-sm text-gray-600">Phone:</span>
                              <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.Phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Government IDs */}
                      {(selectedCandidate.SubmittedEmployeeInfo.SSSNumber ||
                        selectedCandidate.SubmittedEmployeeInfo.TINNumber ||
                        selectedCandidate.SubmittedEmployeeInfo.PhilHealthNumber ||
                        selectedCandidate.SubmittedEmployeeInfo.PagIbigNumber ||
                        selectedCandidate.SubmittedEmployeeInfo.GSISNumber ||
                        selectedCandidate.SubmittedEmployeeInfo.PRCLicenseNumber) && (
                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium mb-3 text-gray-700">Government IDs</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedCandidate.SubmittedEmployeeInfo.SSSNumber && (
                              <div>
                                <span className="text-sm text-gray-600">SSS:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.SSSNumber}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.TINNumber && (
                              <div>
                                <span className="text-sm text-gray-600">TIN:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.TINNumber}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.PhilHealthNumber && (
                              <div>
                                <span className="text-sm text-gray-600">PhilHealth:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PhilHealthNumber}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.PagIbigNumber && (
                              <div>
                                <span className="text-sm text-gray-600">Pag-IBIG:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PagIbigNumber}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.GSISNumber && (
                              <div>
                                <span className="text-sm text-gray-600">GSIS:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.GSISNumber}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.PRCLicenseNumber && (
                              <div>
                                <span className="text-sm text-gray-600">PRC License:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.PRCLicenseNumber}</p>
                                {selectedCandidate.SubmittedEmployeeInfo.PRCValidity && (
                                  <p className="text-xs text-gray-500">
                                    Valid until: {formatDate(selectedCandidate.SubmittedEmployeeInfo.PRCValidity)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Emergency Contact */}
                      {(selectedCandidate.SubmittedEmployeeInfo.EmergencyContactName ||
                        selectedCandidate.SubmittedEmployeeInfo.EmergencyContactNumber) && (
                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium mb-3 text-gray-700">Emergency Contact</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedCandidate.SubmittedEmployeeInfo.EmergencyContactName && (
                              <div>
                                <span className="text-sm text-gray-600">Name:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.EmergencyContactName}</p>
                              </div>
                            )}
                            {selectedCandidate.SubmittedEmployeeInfo.EmergencyContactNumber && (
                              <div>
                                <span className="text-sm text-gray-600">Number:</span>
                                <p className="font-medium">{selectedCandidate.SubmittedEmployeeInfo.EmergencyContactNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-4 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowReturnModal(true);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Return
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApproveModal(true);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve & Hire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Approve and Hire Candidate</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to approve and hire <strong>{selectedCandidate.FullName}</strong>? 
                This will create an employee record and update their status to "Hired".
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedCandidate(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {processing ? 'Processing...' : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve & Hire
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Return Submission</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for returning the submission from <strong>{selectedCandidate.FullName}</strong>. 
                The candidate will receive an email with this reason and a link to edit and resubmit their information.
              </p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Enter return reason (required)..."
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 min-h-[100px]"
                required
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturn}
                  disabled={processing || !returnReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {processing ? 'Processing...' : (
                    <>
                      <X className="w-4 h-4" />
                      Return
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Success Modal */}
      {showApproveSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Candidate Hired Successfully!
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {hiredCandidateName} has been hired and added to employees. The candidate has been moved to the Hired Candidates tab.
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  setShowApproveSuccessModal(false);
                  setHiredCandidateName('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

