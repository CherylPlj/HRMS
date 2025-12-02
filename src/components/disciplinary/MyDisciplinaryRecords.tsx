'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, FileText, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { DisciplinaryRecord } from '@/types/disciplinary';
import SeverityTag from './SeverityTag';
import StatusTag from './StatusTag';
import FileThumbnail from './FileThumbnail';
import EvidencePreviewModal from './EvidencePreviewModal';
import Pagination from './Pagination';
import { EvidenceFile } from '@/types/disciplinary';
import { mockDisciplinaryRecords } from './mockData';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MyDisciplinaryRecordsProps {
  userRole?: 'employee' | 'faculty';
}

const MyDisciplinaryRecords: React.FC<MyDisciplinaryRecordsProps> = ({ userRole = 'employee' }) => {
  const { user } = useUser();
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    files: EvidenceFile[];
    currentIndex: number;
  } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DisciplinaryRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch user's Employee ID
  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        setLoading(false);
        return;
      }

      try {
        // Get User from Supabase by email
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('UserID, EmployeeID')
          .eq('Email', user.emailAddresses[0].emailAddress.toLowerCase().trim())
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          setLoading(false);
          return;
        }

        if (userData?.EmployeeID) {
          setEmployeeId(userData.EmployeeID);
        } else if (userRole === 'faculty') {
          // For faculty, try to get EmployeeID through Faculty table
          const { data: facultyData, error: facultyError } = await supabase
            .from('Faculty')
            .select('EmployeeID')
            .eq('UserID', userData.UserID)
            .single();

          if (!facultyError && facultyData?.EmployeeID) {
            setEmployeeId(facultyData.EmployeeID);
          }
        }
      } catch (error) {
        console.error('Error in fetchEmployeeId:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeId();
  }, [user, userRole]);

  // Fetch disciplinary records for this employee
  useEffect(() => {
    if (!employeeId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, filter mock data by employeeId
    // In real implementation, the employeeId from User table should match the employeeId in disciplinary records
    const filteredRecords = mockDisciplinaryRecords.filter(
      (record) => record.employeeId === employeeId
    );
    setRecords(filteredRecords);
    setLoading(false);
    setCurrentPage(1); // Reset to first page when records change

    // Future implementation:
    // const response = await fetch(`/api/disciplinary/my-records?employeeId=${employeeId}`);
    // const data = await response.json();
    // setRecords(data);
  }, [employeeId]);

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePreviewEvidence = (file: EvidenceFile, allFiles: EvidenceFile[]) => {
    const index = allFiles.findIndex((f) => f.id === file.id);
    setPreviewFile({ files: allFiles, currentIndex: index >= 0 ? index : 0 });
  };

  const handleViewDetails = (record: DisciplinaryRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: records.length,
      ongoing: records.filter((r) => r.status === 'Ongoing').length,
      forReview: records.filter((r) => r.status === 'For_Review').length,
      resolved: records.filter((r) => r.status === 'Resolved').length,
      closed: records.filter((r) => r.status === 'Closed').length,
    };
  }, [records]);

  // Calculate pagination
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return records.slice(startIndex, endIndex);
  }, [records, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
        <span className="ml-3 text-gray-600">Loading disciplinary records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        {/* <div>
          <h2 className="text-2xl font-bold text-gray-900">My Disciplinary Records</h2>
          <p className="text-sm text-gray-600 mt-1">
            View your disciplinary action history and case details
          </p>
        </div> */}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Cases</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Ongoing</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{stats.ongoing}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">For Review</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.forReview}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Closed</div>
            <div className="text-2xl font-bold text-gray-600 mt-1">{stats.closed}</div>
          </div>
        </div>

        {/* Records Table */}
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Disciplinary Records</p>
            <p className="text-sm text-gray-500">
              You don't have any disciplinary records at this time.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Violation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(record.dateTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#800000]">
                        {record.caseNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.violation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SeverityTag severity={record.severity} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {record.evidence.slice(0, 3).map((file) => (
                            <FileThumbnail
                              key={file.id}
                              file={file}
                              onPreview={(file) => handlePreviewEvidence(file, record.evidence)}
                            />
                          ))}
                          {record.evidence.length > 3 && (
                            <div className="w-16 h-16 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                              +{record.evidence.length - 3}
                            </div>
                          )}
                          {record.evidence.length === 0 && (
                            <span className="text-sm text-gray-400">No evidence</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusTag status={record.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.resolution || (
                          <span className="text-gray-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {records.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={records.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      {/* Evidence Preview Modal */}
      {previewFile && (
        <EvidencePreviewModal
          files={previewFile.files}
          currentIndex={previewFile.currentIndex}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Details View Modal */}
      {selectedRecord && isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Case Details - {selectedRecord.caseNo}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Case Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <p className="text-sm text-gray-900 font-medium">{selectedRecord.caseNo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedRecord.dateTime)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm text-gray-900">{selectedRecord.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
                  <p className="text-sm text-gray-900">{selectedRecord.violation}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <SeverityTag severity={selectedRecord.severity} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <StatusTag status={selectedRecord.status} />
                </div>
              </div>

              {/* Description */}
              {selectedRecord.remarks && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description of Incident
                  </label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRecord.remarks}</p>
                </div>
              )}

              {/* Interview Notes */}
              {selectedRecord.interviewNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedRecord.interviewNotes}
                  </p>
                </div>
              )}

              {/* HR Remarks */}
              {selectedRecord.hrRemarks && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HR Remarks</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRecord.hrRemarks}</p>
                </div>
              )}

              {/* Resolution */}
              {selectedRecord.resolution && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedRecord.resolution}
                  </p>
                  {selectedRecord.resolutionDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Resolved on: {formatDate(selectedRecord.resolutionDate)}
                    </p>
                  )}
                </div>
              )}

              {/* Evidence */}
              {selectedRecord.evidence && selectedRecord.evidence.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evidence</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedRecord.evidence.map((file) => (
                      <FileThumbnail
                        key={file.id}
                        file={file}
                        onPreview={(file) =>
                          handlePreviewEvidence(file, selectedRecord.evidence)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Acknowledgment */}
              {selectedRecord.digitalAcknowledgment && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">
                    ✓ Digitally acknowledged on{' '}
                    {selectedRecord.acknowledgedAt
                      ? formatDateTime(selectedRecord.acknowledgedAt)
                      : 'Date not available'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyDisciplinaryRecords;

