import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CandidatesTab, VacanciesTab, RecruitmentDashboard, ResumePreviewModal, SubmittedInformationTab, Candidate, Vacancy } from './recruitment';

const RecruitmentContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [previewResumeUrl, setPreviewResumeUrl] = useState<string | null>(null);
  const [previewCandidateName, setPreviewCandidateName] = useState<string>('');

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

  const refreshData = async () => {
    await Promise.all([fetchVacancies(), fetchCandidates()]);
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

  useEffect(() => {
    const storedTab = localStorage.getItem('recruitmentTab') as 'dashboard' | 'candidates' | 'submitted' | 'hired' | 'vacancies' | null;
    const storedFilter = localStorage.getItem('recruitmentFilter');

    if (storedTab) {
      setActiveTab(storedTab);
      localStorage.removeItem('recruitmentTab');
    }

    if (storedFilter) {
      localStorage.removeItem('recruitmentFilter');
    }
  }, []);

  // Filter candidates based on active tab
  const activeCandidates = candidates.filter(candidate => 
    activeTab === 'hired' ? candidate.Status === 'Hired' : candidate.Status !== 'Hired'
  );

  const hiredCandidates = candidates.filter(candidate => candidate.Status === 'Hired');

  return (
    <div className="bg-white rounded-lg shadow p-6 min-h-[600px]">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'dashboard' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'candidates' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('candidates')}
        >
          Active Candidates
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'submitted' ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('submitted')}
        >
          Submitted Information
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
          onNavigateToHired={() => setActiveTab('hired')}
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

