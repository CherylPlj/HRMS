import React, { useState, ChangeEvent, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DateTime } from 'luxon';

interface Vacancy {
  VacancyID: number;
  JobTitle: 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other';
  VacancyName: string;
  Description?: string;
  HiringManager: string;
  Status: 'Active' | 'Inactive' | 'Filled' | 'Cancelled';
  DateCreated: string;
  DatePosted?: string;
  NumberOfPositions: number;
  _count?: {
    Candidates: number;
  }
}

interface Candidate {
  CandidateID: number;
  VacancyID: number;
  LastName: string;
  FirstName: string;
  MiddleName?: string;
  ExtensionName?: string;
  FullName: string;
  Email: string;
  ContactNumber?: string;
  Sex?: string;
  DateOfBirth?: string;
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
  const date = DateTime.fromISO(dateStr).setZone('Asia/Manila');
  if (!date.isValid) return dateStr;
  return date.toLocaleString(DateTime.DATE_FULL);
}

function formatDateTime(dateTimeStr: string) {
  if (!dateTimeStr) return '';
  const date = DateTime.fromISO(dateTimeStr).setZone('Asia/Manila');
  if (!date.isValid) return dateTimeStr;
  return date.toLocaleString({
    ...DateTime.DATETIME_FULL,
    hour12: true,
    timeZoneName: undefined // Remove timezone display
  });
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
  'Returned',
  'Withdrawn'
];

const RequiredLabel = ({ text }: { text: string }) => (
  <label className="block mb-1 font-medium">
    {text} <span className="text-red-600">*</span>
  </label>
);

const validateInterviewTime = (dateTimeStr: string): boolean => {
  if (!dateTimeStr) return true;
  const date = DateTime.fromISO(dateTimeStr).setZone('Asia/Manila');
  if (!date.isValid) return false;
  const hours = date.hour;
  return hours >= 7 && hours < 19; // 7 AM to 7 PM
};

const calculateAge = (dateOfBirth: string | Date | null): number | null => {
  if (!dateOfBirth) return null;
  const dob = DateTime.fromISO(dateOfBirth.toString()).setZone('Asia/Manila');
  if (!dob.isValid) return null;

  const now = DateTime.now().setZone('Asia/Manila');
  return Math.floor(now.diff(dob, 'years').years); // Round down to whole number
};

const validateAge = (dateOfBirth: string | Date | null | undefined): { valid: boolean; age: number | null } => {
  if (!dateOfBirth) return { valid: false, age: null };
  const dob = DateTime.fromISO(dateOfBirth.toString()).setZone('Asia/Manila');
  if (!dob.isValid) return { valid: false, age: null };

  const now = DateTime.now().setZone('Asia/Manila');
  const age = Math.floor(now.diff(dob, 'years').years); // Round down to whole number
  return { valid: age >= 18 && age <= 65, age };
};

const formatName = (firstName: string, lastName: string, middleName?: string | null, extensionName?: string | null): string => {
  const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
  const extension = extensionName ? `, ${extensionName}` : '';
  return `${firstName}${middleInitial} ${lastName}${extension}`;
};

// Helper function to get file type from URL
const getFileType = (url: string): 'pdf' | 'image' | 'other' => {
  if (!url) return 'other';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf') || lowerUrl.includes('pdf')) return 'pdf';
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif')) return 'image';
  return 'other';
};

// Helper function to get preview URL
const getPreviewUrl = (url: string): string => {
  if (!url || url.trim() === '') {
    console.error('getPreviewUrl: Empty URL provided');
    return '';
  }
  
  // For Supabase storage URLs, use proxy endpoint to force inline display
  if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
    try {
      // Extract the file path from the Supabase URL
      // Supabase URLs are typically: https://[project].supabase.co/storage/v1/object/public/resumes/[path]
      const urlMatch = url.match(/\/resumes\/(.+)$/);
      if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
        const filePath = urlMatch[1];
        // URL encode the path to handle special characters and spaces
        // Use proxy endpoint that sets Content-Disposition: inline
        const proxyUrl = `/api/candidates/resume/${encodeURIComponent(filePath)}`;
        console.log('Generated proxy URL:', proxyUrl, 'from original URL:', url);
        return proxyUrl;
      } else {
        console.warn('getPreviewUrl: Could not extract file path from URL:', url);
        // Return original URL as fallback
        return url;
      }
    } catch (e) {
      console.error('Error parsing Supabase URL:', e, 'URL:', url);
      // Return original URL as fallback
      return url;
    }
  }
  
  // For non-Supabase URLs, return as-is
  console.log('getPreviewUrl: Returning original URL (not Supabase):', url);
  return url;
};

const RecruitmentContent: React.FC = () => {
  // State declarations
  const [activeTab, setActiveTab] = useState<'candidates' | 'hired' | 'vacancies'>('candidates');
  const [showAddVacancy, setShowAddVacancy] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showImportCandidates, setShowImportCandidates] = useState(false);
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
  const [vacancyDescription, setVacancyDescription] = useState('');
  const [vacancyHiringManager, setVacancyHiringManager] = useState('');
  const [vacancyStatus, setVacancyStatus] = useState<'Active' | 'Inactive' | 'Filled' | 'Cancelled'>('Active');
  const [vacancyDatePosted, setVacancyDatePosted] = useState('');
  const [vacancyNumberOfPositions, setVacancyNumberOfPositions] = useState(1);

  // Candidate form state
  const [candidateLastName, setCandidateLastName] = useState('');
  const [candidateFirstName, setCandidateFirstName] = useState('');
  const [candidateMiddleName, setCandidateMiddleName] = useState('');
  const [candidateExtensionName, setCandidateExtensionName] = useState('');
  const [candidateName, setCandidateName] = useState(''); // Keeping for backward compatibility
  const [candidateVacancy, setCandidateVacancy] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateContactNumber, setCandidateContactNumber] = useState('');
  const [candidateSex, setCandidateSex] = useState('');
  const [candidateDateOfBirth, setCandidateDateOfBirth] = useState('');
  const [candidatePhone, setCandidatePhone] = useState(''); // Keeping for backward compatibility
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

  // Form errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importVacancy, setImportVacancy] = useState('');
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [showImportVacancies, setShowImportVacancies] = useState(false);

  // Edit confirmation state
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [pendingEditSubmission, setPendingEditSubmission] = useState(false);

  // Resume preview state
  const [previewResumeUrl, setPreviewResumeUrl] = useState<string | null>(null);
  const [previewCandidateName, setPreviewCandidateName] = useState<string>('');

  // Function declarations

  // Filter functions
  const filteredCandidates = candidates.filter((candidate) => {
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
  }).filter(candidate => activeTab === 'hired' ? candidate.Status === 'Hired' : candidate.Status !== 'Hired');

  const filteredVacancies = vacancies.filter((vacancy) => {
    const searchLower = vacancySearch.toLowerCase();
    const matchesSearch = 
      vacancy.VacancyName.toLowerCase().includes(searchLower) ||
      vacancy.Description?.toLowerCase().includes(searchLower) ||
      vacancy.HiringManager.toLowerCase().includes(searchLower);

    const matchesStatus = !vacancyStatusFilter || vacancy.Status === vacancyStatusFilter;
    const matchesJobTitle = !vacancyJobTitleFilter || vacancy.JobTitle === vacancyJobTitleFilter;

    return matchesSearch && matchesStatus && matchesJobTitle;
  });

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

  // Data fetching functions
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

  // Form handlers
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

  // Navigation functions
  const openEditCandidate = async (id: number) => {
    const candidate = candidates.find(c => c.CandidateID === id);
    if (!candidate) return;
    setEditCandidateId(id);
    setEditCandidateData(candidate);
  };

  const openEditVacancy = async (id: number) => {
    const vacancy = vacancies.find(v => v.VacancyID === id);
    if (!vacancy) return;
    setEditVacancyId(id);
    setEditVacancyData(vacancy);
  };

  // Form submission handlers
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
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
      
      // Refresh candidates list to ensure we have the latest data with Vacancy relation
      const candidatesResponse = await fetch('/api/candidates');
      if (candidatesResponse.ok) {
        const updatedCandidates = await candidatesResponse.json();
        setCandidates(updatedCandidates);
      } else {
        // Fallback: add the new candidate to the list
        setCandidates([...candidates, newCandidate]);
      }

      // If new candidate is hired, check vacancy status
      if (candidateStatus === 'Hired') {
        await updateVacancyStatusIfFilled(parseInt(candidateVacancy));
      }

      // Set the added candidate name for the success modal
      const fullName = `${candidateFirstName} ${candidateLastName}`.trim();
      setAddedCandidateName(fullName);
      
      setShowAddCandidate(false);
      resetCandidateForm();
      setShowAddSuccessModal(true);
      toast.success('Candidate added successfully');
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast.error('Failed to create candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      // If status is Active and no DatePosted is set, use current date
      const datePosted = vacancyStatus === 'Active' && !vacancyDatePosted
        ? DateTime.now().setZone('Asia/Manila').toISO()
        : vacancyDatePosted;

      const response = await fetch('/api/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          JobTitle: vacancyJobTitle,
          VacancyName: vacancyName,
          Description: vacancyDescription,
          HiringManager: vacancyHiringManager,
          Status: vacancyStatus,
          DatePosted: datePosted,
          NumberOfPositions: vacancyNumberOfPositions
        })
      });

      if (!response.ok) throw new Error('Failed to create vacancy');
      
      await fetchVacancies();
      setShowAddVacancy(false);

      // Show success message with additional info if date was auto-set
      if (vacancyStatus === 'Active' && !vacancyDatePosted) {
        toast.success('Vacancy created with current date as posting date');
      } else {
        toast.success('Vacancy created successfully');
      }
    } catch (error) {
      console.error('Error creating vacancy:', error);
      toast.error('Failed to create vacancy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandidateData) return;

    // Validate required fields
    if (!editCandidateData.Sex || !editCandidateData.DateOfBirth) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate age
    if (!validateAge(editCandidateData.DateOfBirth).valid) {
      toast.error('Age must be between 18 and 65 years old');
      return;
    }

    // Validate interview time if set
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
      setIsLoading(true);
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
      
      const updatedCandidates = candidates.map(c => 
        c.CandidateID === editCandidateData.CandidateID ? { ...c, ...editCandidateData } : c
      );
      setCandidates(updatedCandidates);

      // If candidate was updated to Hired, check vacancy status
      if (editCandidateData.Status === 'Hired') {
        await updateVacancyStatusIfFilled(editCandidateData.VacancyID);
      }

      setShowEditSuccessModal(true);
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate');
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      const response = await fetch(`/api/candidates/${deleteCandidateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete candidate');
      
      setDeletedCandidateName(candidate.FullName);
      const updatedCandidates = candidates.filter(c => c.CandidateID !== deleteCandidateId);
      setCandidates(updatedCandidates);
      setDeleteCandidateId(null);
      setDeleteConfirmName('');
      setDeleteError('');
      setShowDeleteSuccessModal(true);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      toast.error('Failed to delete candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCandidates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importVacancy) return;

    try {
      setIsLoading(true);
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
        const candidatesResponse = await fetch('/api/candidates');
        if (candidatesResponse.ok) {
          const updatedCandidates = await candidatesResponse.json();
          setCandidates(updatedCandidates);
        }
      }
    } catch (error) {
      console.error('Error importing candidates:', error);
      toast.error('Failed to import candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportVacancies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/vacancies/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to import vacancies');
      
      const result = await response.json();
      setImportResults(result);
      
      if (result.success > 0) {
        await fetchVacancies();
        toast.success(`Successfully imported ${result.success} vacancies`);
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} vacancies`);
      }
    } catch (error) {
      console.error('Error importing vacancies:', error);
      toast.error('Failed to import vacancies');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [vacanciesResponse, candidatesResponse] = await Promise.all([
          fetch('/api/vacancies'),
          fetch('/api/candidates')
        ]);

        if (!vacanciesResponse.ok) throw new Error('Failed to fetch vacancies');
        if (!candidatesResponse.ok) throw new Error('Failed to fetch candidates');

        const [vacanciesData, candidatesData] = await Promise.all([
          vacanciesResponse.json(),
          candidatesResponse.json()
        ]);

        setVacancies(vacanciesData);
        setCandidates(candidatesData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    // Get stored tab and filter from localStorage
    const storedTab = localStorage.getItem('recruitmentTab') as 'candidates' | 'hired' | 'vacancies' | null;
    const storedFilter = localStorage.getItem('recruitmentFilter');

    // Set the active tab if stored
    if (storedTab) {
      setActiveTab(storedTab);
      localStorage.removeItem('recruitmentTab'); // Clear after use
    }

    // Set the filter if stored
    if (storedFilter) {
      if (storedTab === 'vacancies') {
        setVacancyStatusFilter(storedFilter);
      } else {
        setCandidateStatusFilter(storedFilter);
      }
      localStorage.removeItem('recruitmentFilter'); // Clear after use
    }
  }, []);

  // Delete success state
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deletedCandidateName, setDeletedCandidateName] = useState('');

  // Add success state
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [addedCandidateName, setAddedCandidateName] = useState('');

  // Vacancy edit/delete confirmation state
  const [showVacancyEditConfirmModal, setShowVacancyEditConfirmModal] = useState(false);
  const [showVacancyEditSuccessModal, setShowVacancyEditSuccessModal] = useState(false);
  const [pendingVacancyEditSubmission, setPendingVacancyEditSubmission] = useState(false);
  const [deleteVacancyConfirmName, setDeleteVacancyConfirmName] = useState('');
  const [deleteVacancyError, setDeleteVacancyError] = useState('');
  const [showVacancyDeleteSuccessModal, setShowVacancyDeleteSuccessModal] = useState(false);
  const [deletedVacancyName, setDeletedVacancyName] = useState('');

  // ... existing code ...

  const handleEditVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowVacancyEditConfirmModal(true);
  };

  const handleEditVacancyConfirm = async () => {
    if (!editVacancyData) return;
    setShowVacancyEditConfirmModal(false);
    setPendingVacancyEditSubmission(true);

    try {
      setIsLoading(true);

      // Find original vacancy to check if status is being changed to Active
      const originalVacancy = vacancies.find(v => v.VacancyID === editVacancyData.VacancyID);
      
      // If status is being changed to Active, set DatePosted to now
      const updatedData = {
        ...editVacancyData,
        DatePosted: editVacancyData.Status === 'Active' && originalVacancy?.Status !== 'Active' 
          ? DateTime.now().setZone('Asia/Manila').toISO()
          : editVacancyData.DatePosted
      };

      const response = await fetch(`/api/vacancies/${editVacancyData.VacancyID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          JobTitle: updatedData.JobTitle,
          VacancyName: updatedData.VacancyName,
          Description: updatedData.Description,
          HiringManager: updatedData.HiringManager,
          Status: updatedData.Status,
          DatePosted: updatedData.DatePosted,
          NumberOfPositions: updatedData.NumberOfPositions
        })
      });

      if (!response.ok) throw new Error('Failed to update vacancy');
      
      await fetchVacancies();
      setShowVacancyEditSuccessModal(true);

      // Show additional toast if date was auto-set
      if (editVacancyData.Status === 'Active' && originalVacancy?.Status !== 'Active') {
        toast.success('Vacancy activated and posting date set to now');
      }
    } catch (error) {
      console.error('Error updating vacancy:', error);
      toast.error('Failed to update vacancy');
    } finally {
      setIsLoading(false);
      setPendingVacancyEditSubmission(false);
    }
  };

  const handleDeleteVacancy = async () => {
    const vacancy = vacancies.find(v => v.VacancyID === deleteVacancyId);
    if (!vacancy) return;

    if (deleteVacancyConfirmName.trim() !== vacancy.VacancyName) {
      setDeleteVacancyError('The vacancy name does not match. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/vacancies/${deleteVacancyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete vacancy');
      
      setDeletedVacancyName(vacancy.VacancyName);
      await fetchVacancies();
      setDeleteVacancyId(null);
      setDeleteVacancyConfirmName('');
      setDeleteVacancyError('');
      setShowVacancyDeleteSuccessModal(true);
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      toast.error('Failed to delete vacancy');
    } finally {
      setIsLoading(false);
    }
  };

  // ... existing code ...

  // Add function to check and update vacancy status
  const updateVacancyStatusIfFilled = async (vacancyId: number) => {
    try {
      // Get the vacancy details
      const vacancy = vacancies.find(v => v.VacancyID === vacancyId);
      if (!vacancy) return;

      // Count hired candidates for this vacancy
      const hiredCount = candidates.filter(
        c => c.VacancyID === vacancyId && c.Status === 'Hired'
      ).length;

      // If all positions are filled
      if (hiredCount >= vacancy.NumberOfPositions && vacancy.Status !== 'Filled') {
        // Update vacancy status to Filled
        const response = await fetch(`/api/vacancies/${vacancyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            JobTitle: vacancy.JobTitle,
            VacancyName: vacancy.VacancyName,
            Description: vacancy.Description,
            HiringManager: vacancy.HiringManager,
            Status: 'Filled',
            DatePosted: vacancy.DatePosted,
            NumberOfPositions: vacancy.NumberOfPositions
          })
        });

        if (!response.ok) throw new Error('Failed to update vacancy status');

        // Update other candidates to Shortlisted
        const candidatesToUpdate = candidates.filter(
          c => c.VacancyID === vacancyId 
              && c.Status !== 'Hired' 
              && c.Status !== 'Returned' 
              && c.Status !== 'Withdrawn'
        );

        // Update each candidate's status to Shortlisted
        await Promise.all(candidatesToUpdate.map(async (candidate) => {
          const candidateResponse = await fetch(`/api/candidates/${candidate.CandidateID}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              LastName: candidate.LastName,
              FirstName: candidate.FirstName,
              MiddleName: candidate.MiddleName,
              ExtensionName: candidate.ExtensionName,
              Email: candidate.Email,
              ContactNumber: candidate.ContactNumber,
              Sex: candidate.Sex,
              DateOfBirth: candidate.DateOfBirth,
              InterviewDate: candidate.InterviewDate,
              Status: 'Shortlisted',
              VacancyID: candidate.VacancyID
            })
          });

          if (!candidateResponse.ok) {
            console.error(`Failed to update candidate ${candidate.CandidateID} status`);
          }
        }));

        // Refresh both vacancies and candidates data
        await Promise.all([
          fetchVacancies(),
          fetch('/api/candidates').then(async (candidatesResponse) => {
            if (candidatesResponse.ok) {
              const updatedCandidates = await candidatesResponse.json();
              setCandidates(updatedCandidates);
            }
          })
        ]);

        toast.success('Vacancy status updated to Filled and other candidates marked as Shortlisted');
      }
    } catch (error) {
      console.error('Error updating vacancy status:', error);
      toast.error('Failed to update vacancy status');
    }
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
          Active Candidates
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'hired' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('hired')}
        >
          Hired Candidates
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'vacancies' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('vacancies')}
        >
          Vacancies
        </button>
      </div>

      {(activeTab === 'candidates' || activeTab === 'hired') && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{activeTab === 'candidates' ? 'Active Candidates' : 'Hired Candidates'}</h2>
            {activeTab === 'candidates' && (
              <div className="space-x-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => setShowAddCandidate(true)}>+ Add</button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowImportCandidates(true)}>Import</button>
              </div>
            )}
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className={`grid grid-cols-1 ${activeTab === 'hired' ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-4`}>
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
              
              {/* Status Filter - Hidden for Hired tab */}
              {activeTab !== 'hired' && (
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
              
              {/* Vacancy Filter */}
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
              
              {/* Interview Date / Hire Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'hired' ? 'Hire Date' : 'Interview Date'}
                </label>
                <input
                  title={activeTab === 'hired' ? 'Hire Date' : 'Interview Date'}
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
                  <th className="px-4 py-2">Position</th>
                  <th className="px-4 py-2">Candidate Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Contact Number</th>
                  <th className="px-4 py-2">Date Applied</th>
                  <th className="px-4 py-2">{activeTab === 'hired' ? 'Hire Date' : 'Interview Schedule'}</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Resume</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c: Candidate) => (
                  <tr key={c.CandidateID} className="border-t">
                    <td className="px-4 py-2">{c.Vacancy?.VacancyName}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {formatName(
                          c.FirstName,
                          c.LastName,
                          c.MiddleName,
                          c.ExtensionName
                        )}
                      </div>
                      {c.DateOfBirth && (
                        <div className="text-sm text-gray-500">
                          {calculateAge(c.DateOfBirth)} years old {c.Sex || ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">{c.Email}</td>
                    <td className="px-4 py-2">{c.ContactNumber || c.Phone || '-'}</td>
                    <td className="px-4 py-2">{formatDate(c.DateApplied)}</td>
                    <td className="px-4 py-2">{c.InterviewDate ? formatDateTime(c.InterviewDate) : '-'}</td>
                    <td className="px-4 py-2">{formatStatus(c.Status)}</td>
                    <td className="px-4 py-2">
                      {c.ResumeUrl ? (
                        <button 
                          onClick={() => {
                            setPreviewResumeUrl(c.ResumeUrl || null);
                            setPreviewCandidateName(c.FullName);
                          }}
                          className={iconBtn}
                          title="Preview Resume"
                        >
                          <i className="fas fa-eye text-blue-600"></i>
                        </button>
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
                        
                        // Store the local datetime for the input field
                        setCandidateInterview(selectedDateTime);
                        
                        // Update status if interview is scheduled
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
                      {activeTab === 'hired' || editCandidateData.Status === 'Hired' ? 'Hire Date' : 'Interview Schedule (7 AM - 7 PM only)'}
                    </label>
                    {activeTab !== 'hired' && editCandidateData.Status !== 'Hired' && (
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
                        
                        // Convert to ISO string in Manila timezone
                        const manilaDateTime = selectedDateTime 
                          ? DateTime.fromISO(selectedDateTime).setZone('Asia/Manila').toISO() 
                          : '';
                        
                        setEditCandidateData(prev => {
                          if (!prev) return prev;
                          const isHired = activeTab === 'hired' || prev.Status === 'Hired';
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
                      {activeTab === 'hired' || editCandidateData.Status === 'Hired' ? (
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
                          setPreviewResumeUrl(editCandidateData.ResumeUrl || null);
                          setPreviewCandidateName(editCandidateData.FullName);
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
                      accept=".xlsx,.xls,.csv" 
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
        </div>
      )}

      {activeTab === 'vacancies' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Vacancies</h2>
            <div className="space-x-2">
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => setShowAddVacancy(true)}>+ Add</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowImportVacancies(true)}>Import</button>
            </div>
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
                  title="vacancy status filter"
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
                  title="job title filter"
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
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Hiring Manager</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Positions</th>
                  <th className="px-4 py-2">Date Posted</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVacancies.map((v: Vacancy) => (
                  <tr key={v.VacancyID} className="border-t">
                    <td className="px-4 py-2">{v.VacancyName}</td>
                    <td className="px-4 py-2">{v.JobTitle}</td>
                    <td className="px-4 py-2 max-w-xs">
                      <div className="truncate" title={v.Description || 'No description'}>
                        {v.Description || 'No description'}
                      </div>
                    </td>
                    <td className="px-4 py-2">{v.HiringManager}</td>
                    <td className="px-4 py-2">{v.Status}</td>
                    <td className="px-4 py-2">{v.NumberOfPositions}</td>
                    <td className="px-4 py-2">
                      {v.DatePosted ? formatDate(v.DatePosted) : 'Not set'}
                    </td>
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
                    <RequiredLabel text="Job Title" />
                    <select 
                      title="job title"
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
                    <RequiredLabel text="Vacancy Name" />
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
                    <label className="block mb-1 font-medium">Description</label>
                    <textarea 
                      className="w-full border rounded px-3 py-2 h-24 resize-vertical" 
                      value={vacancyDescription} 
                      onChange={e => setVacancyDescription(e.target.value)} 
                      placeholder="Enter job description and requirements"
                      rows={4}
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Number of Positions" />
                    <input 
                      title="number of position"
                      type="number" 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyNumberOfPositions} 
                      onChange={e => setVacancyNumberOfPositions(Math.max(1, parseInt(e.target.value) || 1))} 
                      min="1"
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Hiring Manager" />
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
                    <label className="block mb-1 font-medium">Date Posted</label>
                    <input 
                      title="Date posted"
                      type="date" 
                      className="w-full border rounded px-3 py-2" 
                      value={vacancyDatePosted} 
                      onChange={e => setVacancyDatePosted(e.target.value)} 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Status" />
                    <select 
                      title="vacancy status"
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
                    <RequiredLabel text="Job Title" />
                    <select title="job title" className="w-full border rounded px-3 py-2" value={editVacancyData.JobTitle} onChange={e => setEditVacancyData({ ...editVacancyData, JobTitle: e.target.value as 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other' })}>
                      {jobTitles.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Vacancy Name" />
                    <input title="vacancy name" type="text" className="w-full border rounded px-3 py-2" value={editVacancyData.VacancyName} onChange={e => setEditVacancyData({ ...editVacancyData, VacancyName: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Description</label>
                    <textarea 
                      className="w-full border rounded px-3 py-2 h-24 resize-vertical" 
                      value={editVacancyData.Description || ''} 
                      onChange={e => setEditVacancyData({ ...editVacancyData, Description: e.target.value })} 
                      placeholder="Enter job description and requirements"
                      rows={4}
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Number of Positions" />
                    <input 
                      title="number"
                      type="number" 
                      className="w-full border rounded px-3 py-2" 
                      value={editVacancyData.NumberOfPositions} 
                      onChange={e => setEditVacancyData({ ...editVacancyData, NumberOfPositions: Math.max(1, parseInt(e.target.value) || 1) })} 
                      min="1"
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Hiring Manager" />
                    <input 
                      title="hiring manager"
                      type="text" 
                      className="w-full border rounded px-3 py-2" 
                      value={editVacancyData.HiringManager} 
                      onChange={e => setEditVacancyData({ ...editVacancyData, HiringManager: e.target.value })} 
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 font-medium">Date Posted</label>
                    <input 
                      title="post date"
                      type="date" 
                      className="w-full border rounded px-3 py-2" 
                      value={editVacancyData.DatePosted ? editVacancyData.DatePosted.split('T')[0] : ''} 
                      onChange={e => setEditVacancyData({ ...editVacancyData, DatePosted: e.target.value })} 
                    />
                  </div>
                  <div className="mb-4">
                    <RequiredLabel text="Status" />
                    <select title="vacancy status select" className="w-full border rounded px-3 py-2" value={editVacancyData.Status} onChange={e => setEditVacancyData({ ...editVacancyData, Status: e.target.value as 'Active' | 'Inactive' | 'Filled' | 'Cancelled' })} required>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Filled">Filled</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-gray-300 rounded" 
                      onClick={() => {
                        setEditVacancyId(null);
                        setEditVacancyData(null);
                      }}
                      disabled={pendingVacancyEditSubmission}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
                      disabled={pendingVacancyEditSubmission}
                    >
                      {pendingVacancyEditSubmission ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Vacancy Edit Confirmation Modal */}
          {showVacancyEditConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70]">
              <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
                <h3 className="text-lg font-bold mb-4">Confirm Changes</h3>
                <p className="mb-4">Are you sure you want to save these changes?</p>
                <div className="flex justify-end space-x-2">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    onClick={() => setShowVacancyEditConfirmModal(false)}
                    disabled={pendingVacancyEditSubmission}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                    onClick={handleEditVacancyConfirm}
                    disabled={pendingVacancyEditSubmission}
                  >
                    {pendingVacancyEditSubmission ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Vacancy Edit Success Modal */}
          {showVacancyEditSuccessModal && (
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
                    The vacancy information has been updated.
                  </p>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={() => {
                      setShowVacancyEditSuccessModal(false);
                      setEditVacancyId(null);
                      setEditVacancyData(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Delete Vacancy Confirmation Modal */}
          {deleteVacancyId !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[400px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 text-red-700">Delete Vacancy</h3>
                <p className="mb-4">This action cannot be undone. To confirm deletion, please type:</p>
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <p className="font-medium text-gray-800">
                    {vacancies.find(v => v.VacancyID === deleteVacancyId)?.VacancyName}
                  </p>
                </div>
                <input
                  type="text"
                  className={`w-full border rounded px-3 py-2 mb-2 ${
                    deleteVacancyError ? 'border-red-500' : 
                    deleteVacancyConfirmName === vacancies.find(v => v.VacancyID === deleteVacancyId)?.VacancyName 
                    ? 'border-green-500' 
                    : 'border-gray-300'
                  }`}
                  value={deleteVacancyConfirmName}
                  onChange={(e) => {
                    setDeleteVacancyConfirmName(e.target.value);
                    setDeleteVacancyError('');
                  }}
                  placeholder="Type the vacancy name exactly as shown above"
                />
                {deleteVacancyError && (
                  <p className="text-red-600 text-sm mb-4">{deleteVacancyError}</p>
                )}
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    onClick={() => {
                      setDeleteVacancyConfirmName('');
                      setDeleteVacancyError('');
                      setDeleteVacancyId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-4 py-2 text-white rounded ${
                      deleteVacancyConfirmName === vacancies.find(v => v.VacancyID === deleteVacancyId)?.VacancyName
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-400 cursor-not-allowed'
                    }`}
                    onClick={handleDeleteVacancy}
                    disabled={deleteVacancyConfirmName !== vacancies.find(v => v.VacancyID === deleteVacancyId)?.VacancyName}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Vacancy Delete Success Modal */}
          {showVacancyDeleteSuccessModal && (
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
                    Vacancy Deleted Successfully
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {deletedVacancyName} has been removed from the system.
                  </p>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={() => {
                      setShowVacancyDeleteSuccessModal(false);
                      setDeletedVacancyName('');
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Import Vacancies Modal */}
          {showImportVacancies && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Import Vacancies</h3>
                <form onSubmit={handleImportVacancies}>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <RequiredLabel text="Import File (CSV)" />
                      <a 
                        href="/templates/vacancy_import_template.csv" 
                        download
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <i className="fas fa-download mr-1"></i>
                        Download Template
                      </a>
                    </div>
                    <input 
                      title="csv file import"
                      type="file" 
                      accept=".csv" 
                      onChange={handleImportFileChange}
                      required 
                    />
                    {importFile && <div className="mt-2 text-sm text-gray-600">Selected: {importFile.name}</div>}
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
                        setShowImportVacancies(false);
                        setImportFile(null);
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
      {/* Resume Preview Modal */}
      {previewResumeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Resume Preview</h2>
                <p className="text-sm text-gray-500">{previewCandidateName}</p>
              </div>
              <div className="flex items-center gap-4">
                {previewResumeUrl && (() => {
                  const previewUrl = getPreviewUrl(previewResumeUrl);
                  const urlToOpen = previewUrl || previewResumeUrl;
                  return (
                    <a
                      href={urlToOpen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900"
                      title="Open in New Tab"
                    >
                      <i className="fas fa-external-link-alt text-lg"></i>
                    </a>
                  );
                })()}
                <button
                  onClick={() => {
                    setPreviewResumeUrl(null);
                    setPreviewCandidateName('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                if (!previewResumeUrl) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-600">No resume URL provided</p>
                    </div>
                  );
                }
                
                const fileType = getFileType(previewResumeUrl);
                const previewUrl = getPreviewUrl(previewResumeUrl);
                
                if (!previewUrl) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-600 mb-4">Unable to generate preview URL</p>
                      <a
                        href={previewResumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <i className="fas fa-external-link-alt mr-2"></i>
                        Open Original URL
                      </a>
                    </div>
                  );
                }
                
                if (fileType === 'pdf') {
                  // Ensure previewUrl is valid and not empty before rendering iframe
                  if (!previewUrl || previewUrl === '/' || previewUrl.startsWith('http://localhost:3000/') && previewUrl === 'http://localhost:3000/') {
                    return (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-gray-600 mb-4">Invalid preview URL. Please use the link below to open the file.</p>
                        <a
                          href={previewResumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <i className="fas fa-external-link-alt mr-2"></i>
                          Open in New Tab
                        </a>
                      </div>
                    );
                  }
                  
                  // Use iframe with proper attributes - Chrome should allow this with our CSP settings
                  return (
                    <iframe
                      src={previewUrl}
                      title="Resume Preview"
                      className="w-full h-full border-0"
                      style={{ minHeight: '600px' }}
                      onError={(e) => {
                        console.error('Iframe load error:', e);
                      }}
                      onLoad={() => {
                        console.log('Iframe loaded successfully with URL:', previewUrl);
                      }}
                    />
                  );
                } else if (fileType === 'image') {
                  return (
                    <img
                      src={previewUrl}
                      alt="Resume preview"
                      className="max-w-full max-h-full object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/file.svg';
                      }}
                    />
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <i className="fas fa-file-alt text-6xl text-gray-400 mb-4"></i>
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center justify-center"
                      >
                        <i className="fas fa-external-link-alt mr-2"></i>
                        Open in New Tab
                      </a>
                      <p className="text-xs text-gray-500 mt-2">Note: Some file types (like .doc, .docx) may download as browsers cannot display them inline</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentContent; 