import React, { useState, ChangeEvent, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Vacancy {
  VacancyID: number;
  JobTitle: 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other';
  VacancyName: string;
  HiringManager: string;
  Status: 'Active' | 'Inactive' | 'Filled' | 'Cancelled';
  DateCreated: string;
  _count?: {
    Candidates: number;
  }
}

interface Candidate {
  CandidateID: number;
  VacancyID: number;
  FullName: string;
  Email: string;
  Phone?: string;
  DateApplied: string;
  InterviewDate?: string;
  Status: string;
  Resume?: string;
  ResumeUrl?: string;
  Vacancy?: Vacancy;
}

const jobTitles = [
  'HR_Manager',
  'Faculty',
  'Registrar',
  'Cashier',
  'Other',
];

const iconBtn = 'inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 transition';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateTimeStr: string) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatStatus(status: string) {
  // Add spaces before capital letters and handle special cases
  return status
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^ /, '') // Remove leading space
    .trim();
}

const candidateStatuses = [
  'ApplicationInitiated',
  'UnderReview',
  'Shortlisted',
  'InterviewScheduled',
  'InterviewCompleted',
  'Offered',
  'Hired',
  'Rejected',
  'Withdrawn'
];

const RequiredLabel = ({ text }: { text: string }) => (
  <label className="block mb-1 font-medium">
    {text} <span className="text-red-600">*</span>
  </label>
);

const validateInterviewTime = (dateTimeStr: string): boolean => {
  if (!dateTimeStr) return true;
  const date = new Date(dateTimeStr);
  const hours = date.getHours();
  return hours >= 7 && hours < 19; // 7 AM to 7 PM
};

const RecruitmentContent = () => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'vacancies'>('candidates');
  const [showAddVacancy, setShowAddVacancy] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Search and filter state
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('');
  const [candidateVacancyFilter, setCandidateVacancyFilter] = useState('');
  const [candidateInterviewDateFilter, setCandidateInterviewDateFilter] = useState('');
  const [vacancySearch, setVacancySearch] = useState('');
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState('');
  const [vacancyJobTitleFilter, setVacancyJobTitleFilter] = useState('');

  // Vacancy form state
  const [vacancyJobTitle, setVacancyJobTitle] = useState<'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other'>('HR_Manager');
  const [vacancyName, setVacancyName] = useState('');
  const [vacancyHiringManager, setVacancyHiringManager] = useState('');
  const [vacancyStatus, setVacancyStatus] = useState<'Active' | 'Inactive' | 'Filled' | 'Cancelled'>('Active');

  // Candidate form state
  const [candidateName, setCandidateName] = useState('');
  const [candidateVacancy, setCandidateVacancy] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateHiringManager, setCandidateHiringManager] = useState('');
  const [candidateDate, setCandidateDate] = useState('');
  const [candidateStatus, setCandidateStatus] = useState('ApplicationInitiated');
  const [candidateResume, setCandidateResume] = useState<File | null>(null);
  const [candidateInterview, setCandidateInterview] = useState('');

  // Edit/Delete modal state
  const [editCandidateId, setEditCandidateId] = useState<number | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const [editVacancyId, setEditVacancyId] = useState<number | null>(null);
  const [deleteVacancyId, setDeleteVacancyId] = useState<number | null>(null);

  // Edit candidate state
  const [editCandidateData, setEditCandidateData] = useState<Candidate | null>(null);
  const [editCandidateResume, setEditCandidateResume] = useState<File | null>(null);

  // Edit vacancy state
  const [editVacancyData, setEditVacancyData] = useState<Vacancy | null>(null);

  // Delete confirmation state
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Fetch data
  const fetchVacancies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vacancies');
      if (!response.ok) throw new Error('Failed to fetch vacancies');
      const data = await response.json();
      setVacancies(data);
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      toast.error('Failed to fetch vacancies');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/candidates');
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to fetch candidates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
    fetchCandidates();
  }, []);

  // Vacancy CRUD operations
  const handleAddVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const response = await fetch('/api/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          JobTitle: vacancyJobTitle,
          VacancyName: vacancyName,
          HiringManager: vacancyHiringManager,
          Status: vacancyStatus
        })
      });

      if (!response.ok) throw new Error('Failed to create vacancy');
      
      await fetchVacancies();
      setShowAddVacancy(false);
      resetVacancyForm();
      toast.success('Vacancy created successfully');
    } catch (error) {
      console.error('Error creating vacancy:', error);
      toast.error('Failed to create vacancy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVacancyData) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/vacancies/${editVacancyData.VacancyID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          JobTitle: editVacancyData.JobTitle,
          VacancyName: editVacancyData.VacancyName,
          HiringManager: editVacancyData.HiringManager,
          Status: editVacancyData.Status
        })
      });

      if (!response.ok) throw new Error('Failed to update vacancy');
      
      await fetchVacancies();
      setEditVacancyId(null);
      setEditVacancyData(null);
      toast.success('Vacancy updated successfully');
    } catch (error) {
      console.error('Error updating vacancy:', error);
      toast.error('Failed to update vacancy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVacancy = async () => {
    if (!deleteVacancyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/vacancies/${deleteVacancyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete vacancy');
      
      await fetchVacancies();
      setDeleteVacancyId(null);
      toast.success('Vacancy deleted successfully');
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      toast.error('Failed to delete vacancy');
    } finally {
      setIsLoading(false);
    }
  };

  // Candidate CRUD operations
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate interview time if provided
    if (candidateInterview && !validateInterviewTime(candidateInterview)) {
      toast.error('Interview time must be between 7 AM and 7 PM');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('VacancyID', candidateVacancy);
      formData.append('FullName', candidateName);
      formData.append('Email', candidateEmail);
      formData.append('Phone', candidatePhone);
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
      
      await fetchCandidates();
      setShowAddCandidate(false);
      resetCandidateForm();
      toast.success('Candidate created successfully');
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast.error('Failed to create candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandidateData) return;

    // Validate interview time if provided
    if (editCandidateData.InterviewDate && !validateInterviewTime(editCandidateData.InterviewDate)) {
      toast.error('Interview time must be between 7 AM and 7 PM');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('FullName', editCandidateData.FullName);
      formData.append('Email', editCandidateData.Email);
      formData.append('Phone', editCandidateData.Phone || '');
      formData.append('InterviewDate', editCandidateData.InterviewDate || '');
      formData.append('Status', editCandidateData.Status);
      if (editCandidateResume) {
        formData.append('resume', editCandidateResume);
      }

      const response = await fetch(`/api/candidates/${editCandidateData.CandidateID}`, {
        method: 'PATCH',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update candidate');
      
      await fetchCandidates();
      setEditCandidateId(null);
      setEditCandidateData(null);
      setEditCandidateResume(null);
      toast.success('Candidate updated successfully');
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    const candidate = candidates.find(c => c.CandidateID === deleteCandidateId);
    if (!candidate) return;

    if (deleteConfirmName.trim() !== candidate.FullName) {
      setDeleteError('The name does not match. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/candidates/${deleteCandidateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete candidate');
      
      await fetchCandidates();
      setDeleteCandidateId(null);
      setDeleteConfirmName('');
      setDeleteError('');
      toast.success('Candidate deleted successfully');
    } catch (error) {
      console.error('Error deleting candidate:', error);
      toast.error('Failed to delete candidate');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const resetVacancyForm = () => {
    setVacancyJobTitle('HR_Manager');
    setVacancyName('');
    setVacancyHiringManager('');
    setVacancyStatus('Active');
  };

  const resetCandidateForm = () => {
    setCandidateName('');
    setCandidateVacancy('');
    setCandidateEmail('');
    setCandidatePhone('');
    setCandidateHiringManager('');
    setCandidateDate('');
    setCandidateStatus('ApplicationInitiated');
    setCandidateResume(null);
    setCandidateInterview('');
  };

  const handleResumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCandidateResume(e.target.files[0]);
    }
  };

  const handleEditResumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEditCandidateResume(e.target.files[0]);
    }
  };

  // Open edit modals with data
  const openEditCandidate = (id: number) => {
    const candidate = candidates.find(c => c.CandidateID === id);
    if (candidate) {
      // Convert InterviewDate to the format expected by datetime-local input
      const formattedInterviewDate = candidate.InterviewDate 
        ? new Date(candidate.InterviewDate).toISOString().slice(0, 16)
        : '';
      
      setEditCandidateData({
        ...candidate,
        InterviewDate: formattedInterviewDate
      });
      setEditCandidateResume(null);
      setEditCandidateId(id);
    }
  };

  const openEditVacancy = (id: number) => {
    const vacancy = vacancies.find(v => v.VacancyID === id);
    if (vacancy) {
      setEditVacancyData(vacancy);
      setEditVacancyId(id);
    }
  };

  // Filter functions
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidateSearch === '' || 
      candidate.FullName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      candidate.Email.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      candidate.Phone?.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      candidate.Vacancy?.VacancyName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      candidate.Vacancy?.HiringManager.toLowerCase().includes(candidateSearch.toLowerCase());
    
    const matchesStatus = candidateStatusFilter === '' || candidate.Status === candidateStatusFilter;
    const matchesVacancy = candidateVacancyFilter === '' || candidate.VacancyID.toString() === candidateVacancyFilter;
    
    // Interview date filter
    const matchesInterviewDate = candidateInterviewDateFilter === '' || 
      (candidate.InterviewDate && 
       new Date(candidate.InterviewDate).toDateString() === new Date(candidateInterviewDateFilter).toDateString());
    
    return matchesSearch && matchesStatus && matchesVacancy && matchesInterviewDate;
  });

  const filteredVacancies = vacancies.filter(vacancy => {
    const matchesSearch = vacancySearch === '' || 
      vacancy.VacancyName.toLowerCase().includes(vacancySearch.toLowerCase()) ||
      vacancy.HiringManager.toLowerCase().includes(vacancySearch.toLowerCase()) ||
      vacancy.JobTitle.toLowerCase().includes(vacancySearch.toLowerCase());
    
    const matchesStatus = vacancyStatusFilter === '' || vacancy.Status === vacancyStatusFilter;
    const matchesJobTitle = vacancyJobTitleFilter === '' || vacancy.JobTitle === vacancyJobTitleFilter;
    
    return matchesSearch && matchesStatus && matchesJobTitle;
  });

  // Reset filter functions
  const resetCandidateFilters = () => {
    setCandidateSearch('');
    setCandidateStatusFilter('');
    setCandidateVacancyFilter('');
    setCandidateInterviewDateFilter('');
  };

  const resetVacancyFilters = () => {
    setVacancySearch('');
    setVacancyStatusFilter('');
    setVacancyJobTitleFilter('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 min-h-[600px]">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'candidates' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'vacancies' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('vacancies')}
        >
          Vacancies
        </button>
      </div>

      {activeTab === 'candidates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Candidates</h2>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => setShowAddCandidate(true)}>+ Add</button>
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
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
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
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
              
              {/* Vacancy Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy</label>
                <select
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
              
              {/* Interview Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                <input
                  type="date"
                  value={candidateInterviewDateFilter}
                  onChange={(e) => setCandidateInterviewDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={resetCandidateFilters}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredCandidates.length} of {candidates.length} candidates
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Vacancy</th>
                  <th className="px-4 py-2">Candidate</th>
                  <th className="px-4 py-2">Hiring Manager</th>
                  <th className="px-4 py-2">Date of Application</th>
                  <th className="px-4 py-2">Interview Schedule</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Resume</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr key={c.CandidateID} className="border-t">
                    <td className="px-4 py-2">{c.Vacancy?.VacancyName}</td>
                    <td className="px-4 py-2">{c.FullName}</td>
                    <td className="px-4 py-2">{c.Vacancy?.HiringManager}</td>
                    <td className="px-4 py-2">{formatDate(c.DateApplied)}</td>
                    <td className="px-4 py-2">{c.InterviewDate ? formatDateTime(c.InterviewDate) : '-'}</td>
                    <td className="px-4 py-2">{formatStatus(c.Status)}</td>
                    <td className="px-4 py-2">
                      {c.ResumeUrl ? (
                        <a 
                          href={c.ResumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={iconBtn}
                          title="View Resume"
                        >
                          <i className="fas fa-file-alt text-blue-600"></i>
                        </a>
                      ) : c.Resume ? (
                        <span className="text-gray-500" title={c.Resume}>
                          <i className="fas fa-file-alt"></i>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 space-x-1">
                      <button className={iconBtn} title="Edit" onClick={() => openEditCandidate(c.CandidateID)}>
                        <i className="fas fa-edit text-blue-600"></i>
                      </button>
                      <button className={iconBtn} title="Delete" onClick={() => setDeleteCandidateId(c.CandidateID)}>
                        <i className="fas fa-trash text-red-600"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Add Candidate Modal */}
          {showAddCandidate && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Add Candidate</h3>
                <form onSubmit={handleAddCandidate}>
                  <div className="mb-4">
                    <RequiredLabel text="Full Name" />
                    <input 
                      type="text" 
                      className="w-full border rounded px-3 py-2" 
                      value={candidateName} 
                      onChange={e => setCandidateName(e.target.value)} 
                      placeholder="Enter full name"
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Vacancy" />
                    <select 
                      className="w-full border rounded px-3 py-2" 
                      value={candidateVacancy} 
                      onChange={e => setCandidateVacancy(e.target.value)}
                      required
                    >
                      <option value="">-- Select Vacancy --</option>
                      {vacancies.map((v) => (
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
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Phone</label>
                    <input 
                      type="tel" 
                      className="w-full border rounded px-3 py-2" 
                      value={candidatePhone} 
                      onChange={e => setCandidatePhone(e.target.value)} 
                      placeholder="Enter phone number" 
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Interview Schedule (7 AM - 7 PM only)</label>
                    <p className="text-sm text-gray-600 mb-2">Setting an interview date will automatically update status to "Interview Scheduled"</p>
                    <input 
                      type="datetime-local" 
                      className="w-full border rounded px-3 py-2" 
                      value={candidateInterview} 
                      onChange={e => setCandidateInterview(e.target.value)} 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Status" />
                    <select 
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
                <form onSubmit={handleEditCandidate}>
                  <div className="mb-4">
                    <RequiredLabel text="Full Name" />
                    <input type="text" className="w-full border rounded px-3 py-2" value={editCandidateData.FullName} onChange={e => setEditCandidateData({ ...editCandidateData, FullName: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Email" />
                    <input type="email" className="w-full border rounded px-3 py-2" value={editCandidateData.Email} onChange={e => setEditCandidateData({ ...editCandidateData, Email: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Phone</label>
                    <input type="tel" className="w-full border rounded px-3 py-2" value={editCandidateData.Phone || ''} onChange={e => setEditCandidateData({ ...editCandidateData, Phone: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Interview Schedule (7 AM - 7 PM only)</label>
                    <p className="text-sm text-gray-600 mb-2">Setting an interview date will automatically update status to "Interview Scheduled"</p>
                    <input type="datetime-local" className="w-full border rounded px-3 py-2" value={editCandidateData.InterviewDate || ''} onChange={e => setEditCandidateData({ ...editCandidateData, InterviewDate: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Status" />
                    <select 
                      className="w-full border rounded px-3 py-2" 
                      value={editCandidateData.Status} 
                      onChange={e => setEditCandidateData({ ...editCandidateData, Status: e.target.value })}
                      required
                    >
                      {candidateStatuses.map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Resume</label>
                    <input type="file" accept=".doc,.docx,.odt,.pdf,.rtf,.txt" onChange={handleEditResumeChange} />
                    {editCandidateResume && <div className="mt-2 text-sm text-gray-600">Selected: {editCandidateResume.name}</div>}
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
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
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
                <p className="mb-4">This action cannot be undone. Please type the candidate's full name to confirm deletion:</p>
                <p className="font-medium mb-2">
                  {candidates.find(c => c.CandidateID === deleteCandidateId)?.FullName}
                </p>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 mb-2"
                  value={deleteConfirmName}
                  onChange={(e) => {
                    setDeleteConfirmName(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder="Type the candidate's full name"
                />
                {deleteError && (
                  <p className="text-red-600 text-sm mb-4">{deleteError}</p>
                )}
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => {
                      setDeleteConfirmName('');
                      setDeleteError('');
                      setDeleteCandidateId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-red-400"
                    onClick={handleDeleteCandidate}
                    disabled={!deleteConfirmName.trim()}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vacancies' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Vacancies</h2>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => setShowAddVacancy(true)}>+ Add</button>
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search vacancies..."
                  value={vacancySearch}
                  onChange={(e) => setVacancySearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={vacancyStatusFilter}
                  onChange={(e) => setVacancyStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Filled">Filled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              {/* Job Title Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <select
                  value={vacancyJobTitleFilter}
                  onChange={(e) => setVacancyJobTitleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Job Titles</option>
                  {jobTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
              
              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={resetVacancyFilters}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredVacancies.length} of {vacancies.length} vacancies
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Vacancy</th>
                  <th className="px-4 py-2">Job Title</th>
                  <th className="px-4 py-2">Hiring Manager</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVacancies.map((v) => (
                  <tr key={v.VacancyID} className="border-t">
                    <td className="px-4 py-2">{v.VacancyName}</td>
                    <td className="px-4 py-2">{v.JobTitle}</td>
                    <td className="px-4 py-2">{v.HiringManager}</td>
                    <td className="px-4 py-2">{v.Status}</td>
                    <td className="px-4 py-2 space-x-1">
                      <button className={iconBtn} title="Edit" onClick={() => openEditVacancy(v.VacancyID)}>
                        <i className="fas fa-edit text-blue-600"></i>
                      </button>
                      <button className={iconBtn} title="Delete" onClick={() => setDeleteVacancyId(v.VacancyID)}>
                        <i className="fas fa-trash text-red-600"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Add Vacancy Modal */}
          {showAddVacancy && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Add Vacancy</h3>
                <form onSubmit={handleAddVacancy}>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Job Title</label>
                    <select 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyJobTitle} 
                      onChange={e => setVacancyJobTitle(e.target.value as 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other')}
                      required
                    >
                      {jobTitles.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Vacancy Name</label>
                    <input 
                      type="text" 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyName} 
                      onChange={e => setVacancyName(e.target.value)} 
                      placeholder="Enter vacancy name"
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Hiring Manager</label>
                    <input 
                      type="text" 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyHiringManager} 
                      onChange={e => setVacancyHiringManager(e.target.value)} 
                      placeholder="Enter hiring manager"
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Status</label>
                    <select 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyStatus} 
                      onChange={e => setVacancyStatus(e.target.value as 'Active' | 'Inactive' | 'Filled' | 'Cancelled')}
                      required
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Filled">Filled</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAddVacancy(false)}>Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Edit Vacancy Modal */}
          {editVacancyId !== null && editVacancyData && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Edit Vacancy</h3>
                <form onSubmit={handleEditVacancy}>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Job Title</label>
                    <select className="w-full border rounded px-3 py-2" value={editVacancyData.JobTitle} onChange={e => setEditVacancyData({ ...editVacancyData, JobTitle: e.target.value as 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other' })}>
                      {jobTitles.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Vacancy Name</label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={editVacancyData.VacancyName} onChange={e => setEditVacancyData({ ...editVacancyData, VacancyName: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Hiring Manager</label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={editVacancyData.HiringManager} onChange={e => setEditVacancyData({ ...editVacancyData, HiringManager: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Status</label>
                    <select className="w-full border rounded px-3 py-2" value={editVacancyData.Status} onChange={e => setEditVacancyData({ ...editVacancyData, Status: e.target.value as 'Active' | 'Inactive' | 'Filled' | 'Cancelled' })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Filled">Filled</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setEditVacancyId(null)}>Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Delete Vacancy Confirmation Modal */}
          {deleteVacancyId !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[400px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 text-red-700">Delete Vacancy</h3>
                <p>Are you sure you want to delete this vacancy?</p>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setDeleteVacancyId(null)}>Cancel</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleDeleteVacancy}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecruitmentContent; 