import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { CandidatesTab, VacanciesTab, RecruitmentDashboard, ResumePreviewModal, SubmittedInformationTab, Candidate, Vacancy } from './recruitment';

const RecruitmentContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL query parameter, default to 'dashboard'
  const urlTab = searchParams.get('view');
  const validTabs = ['dashboard', 'candidates', 'submitted', 'hired', 'vacancies'];
  const initialTab = urlTab && validTabs.includes(urlTab) 
    ? urlTab as 'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies' 
    : 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies'>(initialTab);
  
  // Set initial URL if no view parameter exists
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (!currentView) {
      router.replace(`/dashboard/admin/recruitment?view=dashboard`, { scroll: false });
    }
  }, [router, searchParams]);
  
  // Sync activeTab with URL parameter changes (e.g., back button)
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (currentView && validTabs.includes(currentView)) {
      setActiveTab(currentView as 'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies');
    } else if (!currentView) {
      setActiveTab('dashboard');
    }
  }, [searchParams]);
  
  // Handler to change tab and update URL
  const handleTabChange = (tabId: 'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies') => {
    setActiveTab(tabId);
    router.push(`/dashboard/admin/recruitment?view=${tabId}`, { scroll: false });
  };
  const [isLoading, setIsLoading] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [previewResumeUrl, setPreviewResumeUrl] = useState<string | null>(null);
  const [previewCandidateName, setPreviewCandidateName] = useState<string>('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousCandidateCountRef = useRef<number>(0);

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

  const fetchCandidates = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await fetch('/api/candidates');
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      
      // Check if new candidates were added
      const newCandidateCount = data.length;
      const previousCount = previousCandidateCountRef.current;
      
      if (previousCount > 0 && newCandidateCount > previousCount) {
        const newApplicants = newCandidateCount - previousCount;
        toast.success(`${newApplicants} new applicant${newApplicants > 1 ? 's' : ''} received!`, {
          duration: 5000,
          icon: '🎉',
        });
      }
      
      previousCandidateCountRef.current = newCandidateCount;
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      if (!silent) toast.error('Failed to fetch candidates');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const refreshData = async (silent = false) => {
    await Promise.all([fetchVacancies(), fetchCandidates(silent)]);
  };

  // Add function to check and update vacancy status
  const updateVacancyStatusIfFilled = async (vacancyId: number) => {
    try {
      const vacancy = vacancies.find(v => v.VacancyID === vacancyId);
      if (!vacancy) return;

      const hiredCount = candidates.filter(
        c => c.VacancyID === vacancyId && c.Status === 'Hired'
      ).length;

      if (hiredCount >= vacancy.NumberOfPositions && vacancy.Status !== 'Filled') {
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

        const candidatesToUpdate = candidates.filter(
          c => c.VacancyID === vacancyId 
              && c.Status !== 'Hired' 
              && c.Status !== 'Returned' 
              && c.Status !== 'Withdrawn'
        );

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

        await refreshData();
        toast.success('Vacancy status updated to Filled and other candidates marked as Shortlisted');
      }
    } catch (error) {
      console.error('Error updating vacancy status:', error);
      toast.error('Failed to update vacancy status');
    }
  };

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, []);

  // Auto-refresh polling for candidates when on dashboard or candidates tab
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only enable polling when on dashboard or candidates tab and auto-refresh is enabled
    const shouldPoll = autoRefreshEnabled && (activeTab === 'dashboard' || activeTab === 'candidates');
    
    if (shouldPoll) {
      // Poll every 30 seconds for new candidates
      pollingIntervalRef.current = setInterval(() => {
        fetchCandidates(true); // silent fetch (no loading spinner)
      }, 30000); // 30 seconds

      console.log('Auto-refresh enabled: Checking for new applicants every 30 seconds');
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeTab, autoRefreshEnabled]);

  // Remove localStorage tab handling - now using URL params
  useEffect(() => {
    const storedFilter = localStorage.getItem('recruitmentFilter');
    if (storedFilter) {
      localStorage.removeItem('recruitmentFilter');
    }
  }, []);

  // Filter and sort candidates based on active tab
  // Active candidates excludes: Hired and Withdrawn
  // Shortlisted candidates are moved to the bottom
  const activeCandidates = candidates
    .filter(candidate => 
      candidate.Status !== 'Hired' && 
      candidate.Status !== 'Withdrawn'
    )
    .sort((a, b) => {
      // Define priority for statuses (lower number = higher priority/shown first)
      const statusPriority: Record<string, number> = {
        'ApplicationInitiated': 1,
        'UnderReview': 2,
        'InterviewScheduled': 3,
        'InterviewCompleted': 4,
        'Offered': 5,
        'Returned': 6,
        'Shortlisted': 99  // Move to bottom
      };
      
      const priorityA = statusPriority[a.Status] || 50;
      const priorityB = statusPriority[b.Status] || 50;
      
      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by date applied (newest first)
      const dateA = new Date(a.DateApplied || 0).getTime();
      const dateB = new Date(b.DateApplied || 0).getTime();
      return dateB - dateA;
    });

  const hiredCandidates = candidates.filter(candidate => candidate.Status === 'Hired');

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6 min-h-[600px]">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
          <button
            className={`px-3 sm:px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap text-sm sm:text-base ${activeTab === 'dashboard' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleTabChange('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-3 sm:px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap text-sm sm:text-base ${activeTab === 'candidates' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleTabChange('candidates')}
          >
            Active Candidates
          </button>
          <button
            className={`px-3 sm:px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap text-sm sm:text-base ${activeTab === 'submitted' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleTabChange('submitted')}
          >
            Submitted Information
          </button>
          <button
            className={`px-3 sm:px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap text-sm sm:text-base ${activeTab === 'hired' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleTabChange('hired')}
          >
            Hired Candidates
          </button>
          <button
            className={`px-3 sm:px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap text-sm sm:text-base ${activeTab === 'vacancies' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleTabChange('vacancies')}
          >
            Vacancies
          </button>
        </div>
        
        {/* Auto-refresh toggle - only show on dashboard and candidates tab */}
        {(activeTab === 'dashboard' || activeTab === 'candidates') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                autoRefreshEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoRefreshEnabled ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'dashboard' && (
        <RecruitmentDashboard
          candidates={candidates}
          vacancies={vacancies}
        />
      )}

      {(activeTab === 'candidates' || activeTab === 'hired') && (
        <CandidatesTab
          candidates={activeTab === 'candidates' ? activeCandidates : hiredCandidates}
          vacancies={vacancies}
          isLoading={isLoading}
          onRefresh={refreshData}
          onUpdateVacancyStatus={updateVacancyStatusIfFilled}
          onPreviewResume={(url, name) => {
            setPreviewResumeUrl(url);
            setPreviewCandidateName(name);
          }}
          isHiredTab={activeTab === 'hired'}
        />
      )}

      {activeTab === 'submitted' && (
        <SubmittedInformationTab
          onRefresh={refreshData}
          onNavigateToHired={() => handleTabChange('hired')}
        />
      )}

      {activeTab === 'vacancies' && (
        <VacanciesTab
          vacancies={vacancies}
          isLoading={isLoading}
          onRefresh={refreshData}
        />
      )}

      <ResumePreviewModal
        previewResumeUrl={previewResumeUrl}
        previewCandidateName={previewCandidateName}
        onClose={() => {
          setPreviewResumeUrl(null);
          setPreviewCandidateName('');
        }}
      />
    </div>
  );
};

export default RecruitmentContent;

