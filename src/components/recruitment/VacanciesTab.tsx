import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DateTime } from 'luxon';
import { Download, Upload, Plus, ChevronDown } from 'lucide-react';
import { Vacancy } from './types';
import { formatDate } from './utils';
import { jobTitles } from './constants';
import { RequiredLabel } from './RequiredLabel';
import { VacanciesTable } from './VacanciesTable';
import { Pagination } from './Pagination';

interface VacanciesTabProps {
  vacancies: Vacancy[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const VacanciesTab: React.FC<VacanciesTabProps> = ({
  vacancies,
  isLoading,
  onRefresh
}) => {
  const [vacancySearch, setVacancySearch] = useState('');
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState('');
  const [vacancyJobTitleFilter, setVacancyJobTitleFilter] = useState('');
  const [showAddVacancy, setShowAddVacancy] = useState(false);
  const [showImportVacancies, setShowImportVacancies] = useState(false);
  const [editVacancyId, setEditVacancyId] = useState<number | null>(null);
  const [deleteVacancyId, setDeleteVacancyId] = useState<number | null>(null);
  const [editVacancyData, setEditVacancyData] = useState<Vacancy | null>(null);
  const [deleteVacancyConfirmName, setDeleteVacancyConfirmName] = useState('');
  const [deleteVacancyError, setDeleteVacancyError] = useState('');
  const [showVacancyEditConfirmModal, setShowVacancyEditConfirmModal] = useState(false);
  const [showVacancyEditSuccessModal, setShowVacancyEditSuccessModal] = useState(false);
  const [showVacancyDeleteSuccessModal, setShowVacancyDeleteSuccessModal] = useState(false);
  const [pendingVacancyEditSubmission, setPendingVacancyEditSubmission] = useState(false);
  const [deletedVacancyName, setDeletedVacancyName] = useState('');

  const [vacancyJobTitle, setVacancyJobTitle] = useState<'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other'>('HR_Manager');
  const [vacancyName, setVacancyName] = useState('');
  const [vacancyDescription, setVacancyDescription] = useState('');
  const [vacancyHiringManager, setVacancyHiringManager] = useState('');
  const [vacancyStatus, setVacancyStatus] = useState<'Active' | 'Inactive' | 'Filled' | 'Cancelled'>('Active');
  const [vacancyDatePosted, setVacancyDatePosted] = useState('');
  const [vacancyNumberOfPositions, setVacancyNumberOfPositions] = useState(1);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredVacancies = useMemo(() => vacancies.filter((vacancy) => {
    const searchLower = vacancySearch.toLowerCase();
    const matchesSearch = 
      vacancy.VacancyName.toLowerCase().includes(searchLower) ||
      vacancy.Description?.toLowerCase().includes(searchLower);

    const matchesStatus = !vacancyStatusFilter || vacancy.Status === vacancyStatusFilter;
    const matchesJobTitle = !vacancyJobTitleFilter || vacancy.JobTitle === vacancyJobTitleFilter;

    return matchesSearch && matchesStatus && matchesJobTitle;
  }), [vacancies, vacancySearch, vacancyStatusFilter, vacancyJobTitleFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVacancies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVacancies = filteredVacancies.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [vacancySearch, vacancyStatusFilter, vacancyJobTitleFilter]);

  const resetVacancyFilters = () => {
    setVacancySearch('');
    setVacancyStatusFilter('');
    setVacancyJobTitleFilter('');
  };

  const openEditVacancy = async (id: number) => {
    const vacancy = vacancies.find(v => v.VacancyID === id);
    if (!vacancy) return;
    setEditVacancyId(id);
    setEditVacancyData(vacancy);
  };

  const handleAddVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
          HiringManager: '',
          Status: vacancyStatus,
          DatePosted: datePosted,
          NumberOfPositions: vacancyNumberOfPositions
        })
      });

      if (!response.ok) throw new Error('Failed to create vacancy');
      
      await onRefresh();
      setShowAddVacancy(false);

      if (vacancyStatus === 'Active' && !vacancyDatePosted) {
        toast.success('Vacancy created with current date as posting date');
      } else {
        toast.success('Vacancy created successfully');
      }
    } catch (error) {
      console.error('Error creating vacancy:', error);
      toast.error('Failed to create vacancy');
    }
  };

  const handleEditVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowVacancyEditConfirmModal(true);
  };

  const handleEditVacancyConfirm = async () => {
    if (!editVacancyData) return;
    setShowVacancyEditConfirmModal(false);
    setPendingVacancyEditSubmission(true);

    try {
      const originalVacancy = vacancies.find(v => v.VacancyID === editVacancyData.VacancyID);
      
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
          HiringManager: '',
          Status: updatedData.Status,
          DatePosted: updatedData.DatePosted,
          NumberOfPositions: updatedData.NumberOfPositions
        })
      });

      if (!response.ok) throw new Error('Failed to update vacancy');
      
      await onRefresh();
      setShowVacancyEditSuccessModal(true);

      if (editVacancyData.Status === 'Active' && originalVacancy?.Status !== 'Active') {
        toast.success('Vacancy activated and posting date set to now');
      }
    } catch (error) {
      console.error('Error updating vacancy:', error);
      toast.error('Failed to update vacancy');
    } finally {
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
      const response = await fetch(`/api/vacancies/${deleteVacancyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete vacancy');
      
      setDeletedVacancyName(vacancy.VacancyName);
      await onRefresh();
      setDeleteVacancyId(null);
      setDeleteVacancyConfirmName('');
      setDeleteVacancyError('');
      setShowVacancyDeleteSuccessModal(true);
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      toast.error('Failed to delete vacancy');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportVacancies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
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
        await onRefresh();
        toast.success(`Successfully imported ${result.success} vacancies`);
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} vacancies`);
      }
    } catch (error) {
      console.error('Error importing vacancies:', error);
      toast.error('Failed to import vacancies');
    }
  };

  // Export to CSV
  const handleExportVacancies = () => {
    try {
      // Define CSV headers
      const headers = [
        'Vacancy ID',
        'Vacancy Name',
        'Job Title',
        'Description',
        'Hiring Manager',
        'Status',
        'Number of Positions',
        'Candidates Count',
        'Date Created',
        'Date Posted'
      ];

      // Convert vacancies to CSV rows
      const rows = filteredVacancies.map(vacancy => [
        vacancy.VacancyID?.toString() || '',
        vacancy.VacancyName || '',
        vacancy.JobTitle || '',
        vacancy.Description || '',
        vacancy.HiringManager || '',
        vacancy.Status || '',
        vacancy.NumberOfPositions?.toString() || '0',
        vacancy._count?.Candidates?.toString() || '0',
        formatDate(vacancy.DateCreated),
        vacancy.DatePosted ? formatDate(vacancy.DatePosted) : 'Not set'
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
      link.setAttribute('download', `vacancies_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Vacancies exported successfully');
    } catch (error) {
      console.error('Error exporting vacancies:', error);
      toast.error('Failed to export vacancies');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Vacancies</h2>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            onClick={handleExportVacancies}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowImportVacancies(true)}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            className="flex items-center gap-2 bg-[#800000] hover:bg-[#600000] text-white px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowAddVacancy(true)}
          >
            <Plus className="w-4 h-4" />
            Add Vacancy
          </button>
        </div>
      </div>
      
      {/* Search and Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option key={title} value={title}>{title.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={resetVacancyFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredVacancies.length} of {vacancies.length} vacancies
        </div>
      </div>

      <VacanciesTable
        vacancies={paginatedVacancies}
        onEdit={openEditVacancy}
        onDelete={setDeleteVacancyId}
      />

      {filteredVacancies.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredVacancies.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
        />
      )}

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
                    <option key={title} value={title}>{title.replace('_', ' ')}</option>
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
                <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => {
                  setShowAddVacancy(false);
                  setVacancyJobTitle('HR_Manager');
                  setVacancyName('');
                  setVacancyDescription('');
                  setVacancyStatus('Active');
                  setVacancyDatePosted('');
                  setVacancyNumberOfPositions(1);
                }}>Cancel</button>
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
                <div className="relative">
                  <select title="job title" className="w-full border rounded pl-3 pr-10 py-2 appearance-none bg-white" value={editVacancyData.JobTitle} onChange={e => setEditVacancyData({ ...editVacancyData, JobTitle: e.target.value as 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other' })}>
                    {jobTitles.map((title) => (
                      <option key={title} value={title}>{title.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
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
                <div className="relative">
                  <select title="vacancy status select" className="w-full border rounded pl-3 pr-10 py-2 appearance-none bg-white" value={editVacancyData.Status} onChange={e => setEditVacancyData({ ...editVacancyData, Status: e.target.value as 'Active' | 'Inactive' | 'Filled' | 'Cancelled' })} required>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Filled">Filled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
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
  );
};

