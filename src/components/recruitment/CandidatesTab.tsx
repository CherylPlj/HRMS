import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { DateTime } from 'luxon';
import { Download, Upload, Plus, X } from 'lucide-react';
import { Candidate, Vacancy } from './types';
import { CandidatesTable } from './CandidatesTable';
import { Pagination } from './Pagination';
import { formatStatus, validateInterviewTime, validateAge, calculateAge, formatName, formatDate, formatDateTime } from './utils';
import { candidateStatuses } from './constants';
import { RequiredLabel } from './RequiredLabel';
import { AICandidateScreening } from '../ai/AICandidateScreening';

interface CandidatesTabProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateVacancyStatus: (vacancyId: number) => Promise<void>;
  onPreviewResume: (url: string, name: string) => void;
  isHiredTab?: boolean;
}

export const CandidatesTab: React.FC<CandidatesTabProps> = ({
  candidates,
  vacancies,
  isLoading,
  onRefresh,
  onUpdateVacancyStatus,
  onPreviewResume,
  isHiredTab = false
}) => {
  // Search and filter state
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('');
  const [candidateVacancyFilter, setCandidateVacancyFilter] = useState('');
  const [candidateInterviewDateFilter, setCandidateInterviewDateFilter] = useState('');

  // Form state
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showImportCandidates, setShowImportCandidates] = useState(false);
  const [editCandidateId, setEditCandidateId] = useState<number | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const [editCandidateData, setEditCandidateData] = useState<Candidate | null>(null);
  const [editCandidateResume, setEditCandidateResume] = useState<File | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [pendingEditSubmission, setPendingEditSubmission] = useState(false);
  const [deletedCandidateName, setDeletedCandidateName] = useState('');
  const [addedCandidateName, setAddedCandidateName] = useState('');
  
  // AI Screening state
  const [showAIScreening, setShowAIScreening] = useState(false);
  const [aiScreeningCandidateId, setAiScreeningCandidateId] = useState<number | null>(null);
  const [aiScreeningVacancyId, setAiScreeningVacancyId] = useState<number | null>(null);
  const [aiScreeningCandidateName, setAiScreeningCandidateName] = useState<string>('');

  // Candidate form state
  const [candidateLastName, setCandidateLastName] = useState('');
  const [candidateFirstName, setCandidateFirstName] = useState('');
  const [candidateMiddleName, setCandidateMiddleName] = useState('');
  const [candidateExtensionName, setCandidateExtensionName] = useState('');
  const [candidateVacancy, setCandidateVacancy] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateContactNumber, setCandidateContactNumber] = useState('');
  const [candidateSex, setCandidateSex] = useState('');
  const [candidateDateOfBirth, setCandidateDateOfBirth] = useState('');
  const [candidateStatus, setCandidateStatus] = useState('ApplicationInitiated');
  const [candidateResume, setCandidateResume] = useState<File | null>(null);
  const [candidateInterview, setCandidateInterview] = useState('');

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importVacancy, setImportVacancy] = useState('');
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  // Filter candidates
  const filteredCandidates = useMemo(() => candidates.filter((candidate) => {
    const searchLower = candidateSearch.toLowerCase();
    const matchesSearch = 
      candidate.FullName.toLowerCase().includes(searchLower) ||
      candidate.Email.toLowerCase().includes(searchLower) ||
      candidate.ContactNumber?.toLowerCase().includes(searchLower) ||
      candidate.Phone?.toLowerCase().includes(searchLower);

    const matchesStatus = !candidateStatusFilter || candidate.Status === candidateStatusFilter;
    const matchesVacancy = !candidateVacancyFilter || candidate.VacancyID.toString() === candidateVacancyFilter;
    const matchesInterviewDate = !candidateInterviewDateFilter || 
      (candidate.InterviewDate && candidate.InterviewDate.split('T')[0] === candidateInterviewDateFilter);

    return matchesSearch && matchesStatus && matchesVacancy && matchesInterviewDate;
  }), [candidates, candidateSearch, candidateStatusFilter, candidateVacancyFilter, candidateInterviewDateFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [candidateSearch, candidateStatusFilter, candidateVacancyFilter, candidateInterviewDateFilter]);

  const resetCandidateFilters = () => {
    setCandidateSearch('');
    setCandidateStatusFilter('');
    setCandidateVacancyFilter('');
    setCandidateInterviewDateFilter('');
  };

  const resetCandidateForm = () => {
    setCandidateLastName('');
    setCandidateFirstName('');
    setCandidateMiddleName('');
    setCandidateExtensionName('');
    setCandidateVacancy('');
    setCandidateEmail('');
    setCandidateContactNumber('');
    setCandidateSex('');
    setCandidateDateOfBirth('');
    setCandidateInterview('');
    setCandidateStatus('ApplicationInitiated');
    setCandidateResume(null);
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCandidateResume(e.target.files[0]);
    }
  };

  const handleEditResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditCandidateResume(e.target.files[0]);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const openEditCandidate = async (id: number) => {
    const candidate = candidates.find(c => c.CandidateID === id);
    if (!candidate) return;
    setEditCandidateId(id);
    setEditCandidateData(candidate);
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('LastName', candidateLastName);
      formData.append('FirstName', candidateFirstName);
      formData.append('MiddleName', candidateMiddleName);
      formData.append('ExtensionName', candidateExtensionName);
      formData.append('VacancyID', candidateVacancy);
      formData.append('Email', candidateEmail);
      formData.append('ContactNumber', candidateContactNumber);
      formData.append('Sex', candidateSex);
      formData.append('DateOfBirth', candidateDateOfBirth);
      formData.append('InterviewDate', candidateInterview);
      formData.append('Status', candidateStatus);

      if (candidateResume) {
        formData.append('resume', candidateResume);
      }

      const response = await fetch('/api/candidates', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to create candidate');
      
      const newCandidate = await response.json();
      
      const candidatesResponse = await fetch('/api/candidates');
      if (candidatesResponse.ok) {
        const updatedCandidates = await candidatesResponse.json();
        // Note: This would need to be passed up to parent or handled via callback
      }

      if (candidateStatus === 'Hired') {
        await onUpdateVacancyStatus(parseInt(candidateVacancy));
      }

      const fullName = `${candidateFirstName} ${candidateLastName}`.trim();
      setAddedCandidateName(fullName);
      
      setShowAddCandidate(false);
      resetCandidateForm();
      setShowAddSuccessModal(true);
      toast.success('Candidate added successfully');
      onRefresh();
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast.error('Failed to create candidate');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandidateData) return;

    if (!editCandidateData.Sex || !editCandidateData.DateOfBirth) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateAge(editCandidateData.DateOfBirth).valid) {
      toast.error('Age must be between 18 and 65 years old');
      return;
    }

    if (editCandidateData.InterviewDate && !validateInterviewTime(editCandidateData.InterviewDate)) {
      toast.error('Interview time must be between 7 AM and 7 PM');
      return;
    }

    setShowEditConfirmModal(true);
  };

  const handleEditConfirm = async () => {
    if (!editCandidateData) return;
    setPendingEditSubmission(true);
    setShowEditConfirmModal(false);

    try {
      const formData = new FormData();
      Object.entries(editCandidateData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (editCandidateResume) {
        formData.append('resume', editCandidateResume);
      }

      const response = await fetch(`/api/candidates/${editCandidateData.CandidateID}`, {
        method: 'PATCH',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update candidate');
      
      if (editCandidateData.Status === 'Hired') {
        await onUpdateVacancyStatus(editCandidateData.VacancyID);
      }

      setShowEditSuccessModal(true);
      onRefresh();
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate');
    } finally {
      setPendingEditSubmission(false);
    }
  };

  const handleDeleteCandidate = async () => {
    const candidate = candidates.find(c => c.CandidateID === deleteCandidateId);
    if (!candidate) return;

    if (deleteConfirmName.trim() !== candidate.FullName) {
      setDeleteError('The candidate name does not match. Please try again.');
      return;
    }

    try {
      const response = await fetch(`/api/candidates/${deleteCandidateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete candidate');
      
      setDeletedCandidateName(candidate.FullName);
      setDeleteCandidateId(null);
      setDeleteConfirmName('');
      setDeleteError('');
      setShowDeleteSuccessModal(true);
      onRefresh();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const handleImportCandidates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importVacancy) return;

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('vacancyId', importVacancy);

      const response = await fetch('/api/candidates/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to import candidates');
      
      const result = await response.json();
      setImportResults(result);
      
      if (result.success > 0) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error importing candidates:', error);
      toast.error('Failed to import candidates');
    }
  };

  // Export to CSV
  const handleExportCandidates = () => {
    try {
      // Define CSV headers
      const headers = [
        'Candidate ID',
        'Last Name',
        'First Name',
        'Middle Name',
        'Extension Name',
        'Full Name',
        'Email',
        'Contact Number',
        'Sex',
        'Date of Birth',
        'Vacancy',
        'Job Title',
        'Date Applied',
        'Interview Date',
        'Status',
        'Resume URL'
      ];

      // Convert candidates to CSV rows
      const rows = filteredCandidates.map(candidate => [
        candidate.CandidateID?.toString() || '',
        candidate.LastName || '',
        candidate.FirstName || '',
        candidate.MiddleName || '',
        candidate.ExtensionName || '',
        candidate.FullName || '',
        candidate.Email || '',
        candidate.ContactNumber || candidate.Phone || '',
        candidate.Sex || '',
        candidate.DateOfBirth ? formatDate(candidate.DateOfBirth) : '',
        candidate.Vacancy?.VacancyName || '',
        candidate.Vacancy?.JobTitle || '',
        formatDate(candidate.DateApplied),
        candidate.InterviewDate ? formatDateTime(candidate.InterviewDate) : '',
        formatStatus(candidate.Status),
        candidate.ResumeUrl || ''
      ]);

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Create CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = isHiredTab 
        ? `hired_candidates_export_${new Date().toISOString().split('T')[0]}.csv`
        : `active_candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${isHiredTab ? 'Hired' : 'Active'} candidates exported successfully`);
    } catch (error) {
      console.error('Error exporting candidates:', error);
      toast.error('Failed to export candidates');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{isHiredTab ? 'Hired Candidates' : 'Active Candidates'}</h2>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            onClick={handleExportCandidates}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {!isHiredTab && (
            <>
              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                onClick={() => setShowImportCandidates(true)}
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                className="flex items-center gap-2 bg-[#800000] hover:bg-[#600000] text-white px-4 py-2 rounded-lg transition-colors font-medium"
                onClick={() => setShowAddCandidate(true)}
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Search and Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className={`grid grid-cols-1 ${isHiredTab ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-4`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search candidates..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {!isHiredTab && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                title="candidate-status-filter"
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {candidateStatuses.map((status) => (
                  <option key={status} value={status}>{formatStatus(status)}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy</label>
            <select
              title="select candidate vacancy"
              value={candidateVacancyFilter}
              onChange={(e) => setCandidateVacancyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Vacancies</option>
              {vacancies.map((vacancy) => (
                <option key={vacancy.VacancyID} value={vacancy.VacancyID}>
                  {vacancy.VacancyName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isHiredTab ? 'Hire Date' : 'Interview Date'}
            </label>
            <input
              title={isHiredTab ? 'Hire Date' : 'Interview Date'}
              type="date"
              value={candidateInterviewDateFilter}
              onChange={(e) => setCandidateInterviewDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={resetCandidateFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      </div>

      <CandidatesTable
        candidates={paginatedCandidates}
        vacancies={vacancies}
        isHiredTab={isHiredTab}
        onEdit={openEditCandidate}
        onDelete={setDeleteCandidateId}
        onPreviewResume={onPreviewResume}
        onAIScreen={(candidateId, vacancyId) => {
          const candidate = candidates.find(c => c.CandidateID === candidateId);
          setAiScreeningCandidateId(candidateId);
          setAiScreeningVacancyId(vacancyId);
          setAiScreeningCandidateName(candidate?.FullName || '');
          setShowAIScreening(true);
        }}
      />

      {filteredCandidates.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCandidates.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Add Candidate Modal - Simplified, full implementation would go here */}
      {showAddCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add Candidate</h3>
            <form onSubmit={handleAddCandidate}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <RequiredLabel text="Last Name" />
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={candidateLastName} 
                    onChange={e => setCandidateLastName(e.target.value)} 
                    placeholder="Enter last name"
                    required 
                  />
                </div>
                <div>
                  <RequiredLabel text="First Name" />
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={candidateFirstName} 
                    onChange={e => setCandidateFirstName(e.target.value)} 
                    placeholder="Enter first name"
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">Middle Name</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={candidateMiddleName} 
                    onChange={e => setCandidateMiddleName(e.target.value)} 
                    placeholder="Enter middle name" 
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Extension Name</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={candidateExtensionName} 
                    onChange={e => setCandidateExtensionName(e.target.value)} 
                    placeholder="Jr., Sr., III, etc." 
                  />
                </div>
              </div>
              <div className="mb-4">
                <RequiredLabel text="Vacancy" />
                <select
                  title="candidate-vacancy"
                  className="w-full border rounded px-3 py-2" 
                  value={candidateVacancy} 
                  onChange={e => setCandidateVacancy(e.target.value)}
                  required
                >
                  <option value="">-- Select Vacancy --</option>
                  {vacancies
                    .filter(v => v.Status !== 'Filled')
                    .map((v) => (
                    <option key={v.VacancyID} value={v.VacancyID}>
                      {v.VacancyName} ({v.JobTitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <RequiredLabel text="Email" />
                <input 
                  type="email" 
                  className="w-full border rounded px-3 py-2" 
                  value={candidateEmail} 
                  onChange={e => setCandidateEmail(e.target.value)} 
                  placeholder="Enter email address"
                  required 
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">Contact Number</label>
                  <input 
                    type="tel" 
                    className="w-full border rounded px-3 py-2" 
                    value={candidateContactNumber} 
                    onChange={e => setCandidateContactNumber(e.target.value)} 
                    placeholder="Enter contact number" 
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Sex</label>
                  <select 
                    title="candidate-sex"
                    className="w-full border rounded px-3 py-2" 
                    value={candidateSex} 
                    onChange={e => setCandidateSex(e.target.value)}
                  >
                    <option value="">-- Select Sex --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Date of Birth</label>
                  <input
                    title="date"
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={candidateDateOfBirth}
                    onChange={e => setCandidateDateOfBirth(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Interview Schedule (7 AM - 7 PM only)</label>
                <p className="text-sm text-gray-600 mb-2">Setting an interview date will automatically update status to "Interview Scheduled"</p>
                <input
                  title="date-time"
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={candidateInterview}
                  onChange={e => {
                    const selectedDateTime = e.target.value;
                    if (selectedDateTime && !validateInterviewTime(selectedDateTime)) {
                      toast.error('Interview time must be between 7 AM and 7 PM');
                      return;
                    }
                    setCandidateInterview(selectedDateTime);
                    if (selectedDateTime) {
                      setCandidateStatus('InterviewScheduled');
                    }
                  }}
                />
              </div>
              <div className="mb-4">
                <RequiredLabel text="Status" />
                <select
                  title="status"
                  className="w-full border rounded px-3 py-2"
                  value={candidateStatus}
                  onChange={e => setCandidateStatus(e.target.value)}
                  required
                >
                  {candidateStatuses.map((status) => (
                    <option key={status} value={status}>{formatStatus(status)}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Resume</label>
                <input
                  title="file"
                  type="file"
                  accept=".doc,.docx,.odt,.pdf,.rtf,.txt"
                  onChange={handleResumeChange}
                />
                {candidateResume && <div className="mt-2 text-sm text-gray-600">Selected: {candidateResume.name}</div>}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => {
                    setShowAddCandidate(false);
                    resetCandidateForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {editCandidateId !== null && editCandidateData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Candidate</h3>
            <p className="text-sm text-gray-600 mb-4">Note: Only Status and Interview Schedule can be modified.</p>
            <form onSubmit={handleEditSubmit}>
              {/* Display-only fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-500">Last Name</label>
                  <input
                    title="Last Name"
                    type="text" 
                    className="w-full border rounded px-3 py-2 bg-gray-100" 
                    value={editCandidateData.LastName}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-gray-500">First Name</label>
                  <input
                    title="First Name"
                    type="text" 
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    value={editCandidateData.FirstName}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-500">Middle Name</label>
                  <input
                    title="Middle Name"
                    type="text" 
                    className="w-full border rounded px-3 py-2 bg-gray-100" 
                    value={editCandidateData.MiddleName || ''} 
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-gray-500">Extension Name</label>
                  <input
                    title="Extension Name"
                    type="text" 
                    className="w-full border rounded px-3 py-2 bg-gray-100" 
                    value={editCandidateData.ExtensionName || ''} 
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium text-gray-500">Email</label>
                <input title="email" type="email" className="w-full border rounded px-3 py-2 bg-gray-100" value={editCandidateData.Email} readOnly disabled />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-500">Contact Number</label>
                  <input
                    title="telephone"
                    type="tel"
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    value={editCandidateData.ContactNumber || ''} 
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-gray-500">Sex</label>
                  <input
                    title="sex"
                    type="text"
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    value={editCandidateData.Sex || ''} 
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium text-gray-500">Date of Birth</label>
                <input 
                  title="Date of Birth"
                  type="date" 
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  value={editCandidateData.DateOfBirth ? new Date(editCandidateData.DateOfBirth).toISOString().split('T')[0] : ''} 
                  readOnly
                  disabled
                />
                {editCandidateData.DateOfBirth && (
                  <div className="mt-1 text-sm text-gray-600">
                    Age: {calculateAge(editCandidateData.DateOfBirth)} years old
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">
                  {isHiredTab || editCandidateData.Status === 'Hired' ? 'Hire Date' : 'Interview Schedule (7 AM - 7 PM only)'}
                </label>
                {!isHiredTab && editCandidateData.Status !== 'Hired' && (
                  <p className="text-sm text-gray-600 mb-2">Setting an interview date will automatically update status to "Interview Scheduled"</p>
                )}
                <input 
                  title="date-time-local"
                  type="datetime-local" 
                  className={`w-full border rounded px-3 py-2 ${editCandidateData.InterviewDate && !validateInterviewTime(editCandidateData.InterviewDate) ? 'border-red-500' : ''}`}
                  value={editCandidateData.InterviewDate ? DateTime.fromISO(editCandidateData.InterviewDate).setZone('Asia/Manila').toFormat("yyyy-MM-dd'T'HH:mm") : ''} 
                  onChange={e => {
                    const selectedDateTime = e.target.value;
                    if (selectedDateTime && !validateInterviewTime(selectedDateTime)) {
                      toast.error('Interview time must be between 7 AM and 7 PM');
                      return;
                    }
                    
                    const manilaDateTime = selectedDateTime 
                      ? DateTime.fromISO(selectedDateTime).setZone('Asia/Manila').toISO() 
                      : '';
                    
                    setEditCandidateData(prev => {
                      if (!prev) return prev;
                      const isHired = isHiredTab || prev.Status === 'Hired';
                      return {
                        ...prev,
                        InterviewDate: manilaDateTime || undefined,
                        Status: selectedDateTime && !isHired ? 'InterviewScheduled' : prev.Status
                      };
                    });
                  }} 
                />
                {editCandidateData.InterviewDate && !validateInterviewTime(editCandidateData.InterviewDate) && (
                  <p className="text-red-500 text-sm mt-1">Interview time must be between 7 AM and 7 PM</p>
                )}
              </div>
              <div className="mb-4">
                <RequiredLabel text="Status" />
                <select 
                  title="Edit Status"
                  className="w-full border rounded px-3 py-2" 
                  value={editCandidateData.Status} 
                  onChange={e => setEditCandidateData({ ...editCandidateData, Status: e.target.value })}
                  required
                >
                  {isHiredTab || editCandidateData.Status === 'Hired' ? (
                    <>
                      <option value="Hired">{formatStatus('Hired')}</option>
                      <option value="Withdrawn">{formatStatus('Withdrawn')}</option>
                    </>
                  ) : (
                    candidateStatuses.map((status) => (
                      <option key={status} value={status}>{formatStatus(status)}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium text-gray-500">Resume</label>
                {editCandidateData.ResumeUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPreviewResume(editCandidateData.ResumeUrl || '', editCandidateData.FullName);
                    }}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                  >
                    <i className="fas fa-eye"></i>
                    Preview Resume
                  </button>
                ) : (
                  <span className="text-gray-500">No resume available</span>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-300 rounded" 
                  onClick={() => {
                    setEditCandidateId(null);
                    setEditCandidateData(null);
                    setEditCandidateResume(null);
                  }}
                  disabled={pendingEditSubmission}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400" 
                  disabled={pendingEditSubmission}
                >
                  {pendingEditSubmission ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Candidate Confirmation Modal */}
      {deleteCandidateId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow-lg w-[400px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-red-700">Delete Candidate</h3>
            <p className="mb-4">This action cannot be undone. To confirm deletion, please type:</p>
            <div className="bg-gray-100 p-3 rounded mb-4">
              <p className="font-medium text-gray-800">
                {candidates.find(c => c.CandidateID === deleteCandidateId)?.FullName}
              </p>
            </div>
            <input
              type="text"
              className={`w-full border rounded px-3 py-2 mb-2 ${
                deleteError ? 'border-red-500' : 
                deleteConfirmName === candidates.find(c => c.CandidateID === deleteCandidateId)?.FullName 
                ? 'border-green-500' 
                : 'border-gray-300'
              }`}
              value={deleteConfirmName}
              onChange={(e) => {
                setDeleteConfirmName(e.target.value);
                setDeleteError('');
              }}
              placeholder="Type the full name exactly as shown above"
            />
            {deleteError && (
              <p className="text-red-600 text-sm mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => {
                  setDeleteConfirmName('');
                  setDeleteError('');
                  setDeleteCandidateId(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-white rounded ${
                  deleteConfirmName === candidates.find(c => c.CandidateID === deleteCandidateId)?.FullName
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-400 cursor-not-allowed'
                }`}
                onClick={handleDeleteCandidate}
                disabled={deleteConfirmName !== candidates.find(c => c.CandidateID === deleteCandidateId)?.FullName}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Candidates Modal */}
      {showImportCandidates && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Import Candidates</h3>
            <form onSubmit={handleImportCandidates}>
              <div className="mb-4">
                <RequiredLabel text="Vacancy" />
                <select 
                  title="vacancy"
                  className="w-full border rounded px-3 py-2" 
                  value={importVacancy} 
                  onChange={e => setImportVacancy(e.target.value)}
                  required
                >
                  <option value="">-- Select Vacancy --</option>
                  {vacancies
                    .filter(v => v.Status !== 'Filled')
                    .map((v) => (
                      <option key={v.VacancyID} value={v.VacancyID}>
                        {v.VacancyName} ({v.JobTitle})
                      </option>
                    ))}
                </select>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <RequiredLabel text="Import File (Excel/CSV)" />
                  <a 
                    href="/templates/candidate_import_template.csv" 
                    download
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <i className="fas fa-download mr-1"></i>
                    Download Template
                  </a>
                </div>
                <input 
                  title="file import"
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportFileChange}
                  required 
                />
                {importFile && <div className="mt-2 text-sm text-gray-600">Selected: {importFile.name}</div>}
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-2">Required Columns:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  <li>Last Name</li>
                  <li>First Name</li>
                  <li>Email</li>
                  <li>Optional: Middle Name, Extension Name, Contact Number, Sex (Male/Female), Date of Birth (YYYY-MM-DD)</li>
                </ul>
              </div>
              {importResults && (
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Import Results:</h4>
                  <div className="text-sm">
                    <p className="text-green-600">Successfully imported: {importResults.success}</p>
                    {importResults.failed > 0 && (
                      <>
                        <p className="text-red-600 mt-1">Failed: {importResults.failed}</p>
                        <div className="mt-2">
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside text-red-600">
                            {importResults.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-300 rounded" 
                  onClick={() => {
                    setShowImportCandidates(false);
                    setImportFile(null);
                    setImportVacancy('');
                    setImportResults(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isLoading}>
                  {isLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {showEditConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[400px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Confirm Changes</h3>
            <p className="mb-4">Are you sure you want to save these changes?</p>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowEditConfirmModal(false)}
                disabled={pendingEditSubmission}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                onClick={handleEditConfirm}
                disabled={pendingEditSubmission}
              >
                {pendingEditSubmission ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Success Modal */}
      {showEditSuccessModal && (
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
                Changes Saved Successfully!
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The candidate information has been updated.
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  setShowEditSuccessModal(false);
                  setEditCandidateId(null);
                  setEditCandidateData(null);
                  setEditCandidateResume(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteSuccessModal && (
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
                Candidate Deleted Successfully
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {deletedCandidateName} has been removed from the system.
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  setShowDeleteSuccessModal(false);
                  setDeletedCandidateName('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Success Modal */}
      {showAddSuccessModal && (
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
                Candidate Added Successfully!
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {addedCandidateName} has been added to the system.
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  setShowAddSuccessModal(false);
                  setAddedCandidateName('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Screening Modal */}
      {showAIScreening && aiScreeningCandidateId && aiScreeningVacancyId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">AI Candidate Screening</h3>
                <button
                  onClick={() => {
                    setShowAIScreening(false);
                    setAiScreeningCandidateId(null);
                    setAiScreeningVacancyId(null);
                    setAiScreeningCandidateName('');
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <AICandidateScreening
                candidateId={aiScreeningCandidateId}
                vacancyId={aiScreeningVacancyId}
                candidateName={aiScreeningCandidateName}
                onComplete={() => {
                  onRefresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

