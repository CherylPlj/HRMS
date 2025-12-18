'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Plus, Search, Download, Upload, X, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DisciplinaryRecord, DisciplinaryFilters as FilterType } from '@/types/disciplinary';
import DisciplinaryTable from './DisciplinaryTable';
import DisciplinaryFilters from './DisciplinaryFilters';
import DisciplinaryHistoryContent from './DisciplinaryHistoryContent';
import DisciplinaryDashboard from './DisciplinaryDashboard';
import DisciplinarySettings from './DisciplinarySettings';
import CaseViewModal from './CaseViewModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import SuccessModal from './SuccessModal';
import Pagination from './Pagination';
import {
  fetchDisciplinaryRecords,
  createDisciplinaryRecord,
  updateDisciplinaryRecord,
  deleteDisciplinaryRecord,
  transformDisciplinaryRecord,
  fetchCategories,
  fetchSupervisors,
  fetchViolationTypes,
  fetchDashboardStatistics,
} from '@/lib/disciplinaryApi';

interface DisciplinaryContentProps {
  employees?: { id: string; name: string }[];
  supervisors?: { id: string; name: string }[];
}

const DisciplinaryContent: React.FC<DisciplinaryContentProps> = ({
  employees: initialEmployees = [],
  supervisors: initialSupervisors = [],
}) => {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(initialEmployees);
  const [adminEmployees, setAdminEmployees] = useState<{ id: string; name: string }[]>([]);
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
  const [filters, setFilters] = useState<FilterType>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DisciplinaryRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DisciplinaryRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'history' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // Settings state
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [violationTypesList, setViolationTypesList] = useState<{ id: string; name: string; category: string; defaultSeverity: "Minor" | "Moderate" | "Major" }[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<{ id: string; name: string }[]>(initialSupervisors);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DisciplinaryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Success modal state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successRecordInfo, setSuccessRecordInfo] = useState<{ caseNo?: string; employee?: string } | null>(null);

  // Fetch data from API
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchDisciplinaryRecords({
        page: currentPage,
        limit: itemsPerPage,
        category: filters.category,
        severity: filters.severity,
        status: filters.status,
        employeeId: filters.employee,
        supervisorId: filters.supervisor,
        violation: filters.violationType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: searchQuery || filters.searchQuery,
      });

      const transformedRecords = response.records.map(transformDisciplinaryRecord) as DisciplinaryRecord[];
      setRecords(transformedRecords);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters, searchQuery]);

  // Fetch initial data and settings
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees?all=true');
        if (!response.ok) throw new Error('Failed to fetch employees');
        const data = await response.json();
        
        const employeesList = (data.employees || data).map((emp: any) => ({
          id: emp.EmployeeID,
          name: `${emp.FirstName} ${emp.MiddleName || ''} ${emp.LastName}`.trim(),
        }));
        
        setEmployees(employeesList);
        
        // Filter employees from Admin department for supervisors
        const adminDeptEmployees = (data.employees || data)
          .filter((emp: any) => emp.Department?.DepartmentName === 'Admin')
          .map((emp: any) => ({
            id: emp.EmployeeID,
            name: `${emp.FirstName} ${emp.MiddleName || ''} ${emp.LastName}`.trim(),
          }));
        
        setAdminEmployees(adminDeptEmployees);
        setSupervisorsList(adminDeptEmployees);
      } catch (err) {
        console.error('Error fetching employees:', err);
        toast.error('Failed to load employees');
      }
    };

    fetchEmployees();
  }, []);

  // Fetch categories, supervisors, and violation types on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [categories, violationTypes] = await Promise.all([
          fetchCategories().catch((err) => {
            console.error('Error fetching categories:', err);
            toast.error('Failed to load categories. Please try again or add categories in Settings.');
            return []; // Return empty array as fallback
          }),
          fetchViolationTypes({ isActive: true }).catch((err) => {
            console.error('Error fetching violation types:', err);
            toast.error('Failed to load violation types.');
            return []; // Return empty array as fallback
          }),
        ]);
        
        setCategoriesList(categories);
        setViolationTypesList(violationTypes.map((vt: any) => ({
          id: vt.id.toString(),
          name: vt.name,
          category: vt.category?.name || vt.category || '',
          defaultSeverity: vt.defaultSeverity,
        })));
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Failed to load disciplinary settings. Please refresh the page.');
      }
    };

    fetchSettings();
  }, []);

  // Fetch dashboard stats when on dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const fetchStats = async () => {
        try {
          const stats = await fetchDashboardStatistics();
          setDashboardStats(stats);
        } catch (err) {
          console.error('Error fetching dashboard stats:', err);
        }
      };
      fetchStats();
    }
  }, [activeTab]);

  // Use records directly (already filtered by backend)
  const paginatedRecords = records;

  // Handlers
  const handleAddRecord = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: DisciplinaryRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleViewRecord = (record: DisciplinaryRecord) => {
    setViewingRecord(record);
    setEditingRecord(null); // Don't set editingRecord for view mode
    setIsModalOpen(true);
  };

  const handleDeleteRecord = (record: DisciplinaryRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDisciplinaryRecord(recordToDelete.id);
      toast.success('Record deleted successfully');
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchRecords(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete record';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitRecord = async (recordData: Partial<DisciplinaryRecord>) => {
    try {
      let recordId: string;
      
      if (editingRecord) {
        // Update existing record
        const updated = await updateDisciplinaryRecord(editingRecord.id, {
          supervisorId: recordData.supervisorId,
          category: recordData.category,
          violation: recordData.violation,
          severity: recordData.severity,
          status: recordData.status && (recordData.status.includes('Review') || recordData.status === 'For_Review') ? 'For_Review' : (recordData.status as any),
          dateTime: recordData.dateTime,
          resolution: recordData.resolution,
          resolutionDate: recordData.resolutionDate,
          remarks: recordData.remarks,
          interviewNotes: recordData.interviewNotes,
          hrRemarks: recordData.hrRemarks,
          recommendedPenalty: recordData.recommendedPenalty,
          offenseCount: recordData.offenseCount,
        });
        recordId = updated.id;
        
        // Show success modal for update
        setSuccessMessage('The disciplinary record has been updated successfully.');
        setSuccessRecordInfo({
          caseNo: editingRecord.caseNo,
          employee: editingRecord.employee,
        });
        setIsSuccessModalOpen(true);
      } else {
        // Create new record
        if (!recordData.employeeId) {
          toast.error('Employee is required');
          return;
        }
        if (!recordData.category) {
          toast.error('Category is required');
          return;
        }
        if (!recordData.violation) {
          toast.error('Violation is required');
          return;
        }

        const created = await createDisciplinaryRecord({
          employeeId: recordData.employeeId,
          supervisorId: recordData.supervisorId,
          category: recordData.category || '',
          violation: recordData.violation || '',
          severity: recordData.severity || 'Minor',
          status: ((recordData.status as string)?.includes('Review') ? 'For_Review' : (recordData.status as any)) || 'Ongoing',
          dateTime: recordData.dateTime,
          resolution: recordData.resolution,
          resolutionDate: recordData.resolutionDate,
          remarks: recordData.remarks,
          interviewNotes: recordData.interviewNotes,
          hrRemarks: recordData.hrRemarks,
          recommendedPenalty: recordData.recommendedPenalty,
          offenseCount: recordData.offenseCount || 1,
        });
        recordId = created.id;
        toast.success('Record created successfully');
      }

      // Upload evidence files if any (for new records or if new files were added)
      if (recordData.evidence && recordData.evidence.length > 0) {
        const { uploadEvidence } = await import('@/lib/disciplinaryApi');
        const fileObjects = (recordData as any)._fileObjects as Map<string, File> | undefined;
        
        for (const evidence of recordData.evidence) {
          // Check if it's a new file (has a blob URL) vs existing (has a regular URL)
          if (evidence.url && evidence.url.startsWith('blob:') && fileObjects) {
            // This is a new file that needs to be uploaded
            const file = fileObjects.get(evidence.id);
            if (file) {
              try {
                await uploadEvidence(recordId, file, evidence.fileName);
                toast.success(`Evidence "${evidence.fileName}" uploaded successfully`);
              } catch (err) {
                console.error(`Error uploading evidence ${evidence.fileName}:`, err);
                toast.error(`Failed to upload evidence "${evidence.fileName}"`);
              }
            }
          }
        }
      }
      
      // Close the edit/view modal
      setIsModalOpen(false);
      setEditingRecord(null);
      setViewingRecord(null);
      
      // Refresh list (but don't wait for it to complete before showing success modal)
      fetchRecords();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      toast.error(errorMessage);
    }
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      // Fetch all records for export (without pagination)
      const response = await fetchDisciplinaryRecords({
        limit: 10000, // Large limit to get all records
        category: filters.category,
        severity: filters.severity,
        status: filters.status,
        employeeId: filters.employee,
        supervisorId: filters.supervisor,
        violation: filters.violationType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: searchQuery || filters.searchQuery,
      });

      const allRecords = response.records.map(transformDisciplinaryRecord);

      // Define CSV headers
      const headers = [
        'Case No.',
        'Date & Time',
        'Category',
        'Violation Type',
        'Employee',
        'Employee ID',
        'Severity',
        'Status',
        'Resolution',
        'Resolution Date',
        'Remarks',
        'Interview Notes',
        'HR Remarks',
        'Recommended Penalty',
        'Supervisor',
        'Supervisor ID',
        'Offense Count',
        'Digital Acknowledgment',
        'Acknowledged At',
        'Created At',
        'Updated At'
      ];

      // Convert records to CSV rows
      const rows = allRecords.map(record => [
        record.caseNo || '',
        record.dateTime ? new Date(record.dateTime).toLocaleString() : '',
        record.category || '',
        record.violation || '',
        record.employee || '',
        record.employeeId || '',
        record.severity || '',
        record.status || '',
        record.resolution || '',
        record.resolutionDate ? new Date(record.resolutionDate).toLocaleDateString() : '',
        record.remarks || '',
        record.interviewNotes || '',
        record.hrRemarks || '',
        record.recommendedPenalty || '',
        record.supervisor || '',
        record.supervisorId || '',
        record.offenseCount?.toString() || '0',
        record.digitalAcknowledgment ? 'Yes' : 'No',
        record.acknowledgedAt ? new Date(record.acknowledgedAt).toLocaleString() : '',
        record.createdAt ? new Date(record.createdAt).toLocaleString() : '',
        record.updatedAt ? new Date(record.updatedAt).toLocaleString() : ''
      ]);

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
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
      link.setAttribute('download', `disciplinary_records_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting records:', error);
      alert('Failed to export records. Please try again.');
    }
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // Add last value
    values.push(current.trim());
    return values;
  };

  // Import from CSV using backend API
  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      // Create FormData and append file
      const formData = new FormData();
      formData.append('file', file);

      // Call backend API
      const response = await fetch('/api/disciplinary/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import records');
      }

      // Handle success
      if (result.success > 0) {
        setImportSuccess(`Successfully imported ${result.success} record(s).`);
        
        // Refresh the records list
        await fetchRecords();
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          const errorPreview = result.errors.slice(0, 5).join('; ');
          const errorMessage = result.errors.length > 5 
            ? `${errorPreview}... (${result.errors.length - 5} more)`
            : errorPreview;
          setImportError(`Some rows had errors: ${errorMessage}`);
        }
      } else {
        throw new Error('No records were imported successfully');
      }

      // Handle failures
      if (result.failed > 0 && result.errors && result.errors.length > 0) {
        const errorPreview = result.errors.slice(0, 5).join('; ');
        const errorMessage = result.errors.length > 5 
          ? `${errorPreview}... (${result.errors.length - 5} more)`
          : errorPreview;
        setImportError(errorMessage);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import CSV file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleImport(file);
      } else {
        setImportError('Please select a CSV file');
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    try {
      // Define CSV headers
      const headers = [
        'Case No.',
        'Date & Time',
        'Category',
        'Violation Type',
        'Employee',
        'Employee ID',
        'Severity',
        'Status',
        'Resolution',
        'Resolution Date',
        'Remarks',
        'Interview Notes',
        'HR Remarks',
        'Recommended Penalty',
        'Supervisor',
        'Supervisor ID',
        'Offense Count',
        'Digital Acknowledgment'
      ];

      // Example data row
      const exampleRow = [
        'DA-2024-0001',
        '2024-01-15 09:30:00',
        'Attendance',
        'Late Arrival',
        'John Doe',
        'EMP001',
        'Minor',
        'Ongoing',
        'Verbal warning issued',
        '2024-01-16',
        'Employee was 15 minutes late',
        'Discussed punctuality expectations',
        'Monitor for improvement',
        'Verbal Warning',
        'Jane Smith',
        'SUP001',
        '1',
        'No'
      ];

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      // Create CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        exampleRow.map(escapeCSV).join(',')
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'disciplinary_records_import_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* <div>
          <h1 className="text-2xl font-bold text-gray-900">Disciplinary Action Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and track employee disciplinary actions
          </p>
        </div> */}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-3 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'dashboard'
              ? 'bg-white border-[#800000] text-[#800000] font-semibold'
              : 'bg-gray-50 border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-3 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'records'
              ? 'bg-white border-[#800000] text-[#800000] font-semibold'
              : 'bg-gray-50 border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Disciplinary Records
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'bg-white border-[#800000] text-[#800000] font-semibold'
              : 'bg-gray-50 border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'settings'
              ? 'bg-white border-[#800000] text-[#800000] font-semibold'
              : 'bg-gray-50 border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <DisciplinaryDashboard records={records} stats={dashboardStats} />
      ) : activeTab === 'history' ? (
        <DisciplinaryHistoryContent
          employees={employees}
          supervisors={supervisorsList}
          categories={categoriesList}
          violationTypes={violationTypesList}
        />
      ) : activeTab === 'settings' ? (
        <DisciplinarySettings
          categories={categoriesList}
          violationTypes={violationTypesList}
          supervisors={supervisorsList}
          employees={employees}
          records={records}
          onCategoriesChange={setCategoriesList}
          onViolationTypesChange={setViolationTypesList}
          onSupervisorsChange={setSupervisorsList}
        />
      ) : (
        <>
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Import from CSV"
              >
                <Upload className="w-5 h-5" />
                Import
              </button>
              <button
                onClick={handleAddRecord}
                className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Record
              </button>
            </div>
          </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by case number, employee name, or violation..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFilters({ ...filters, searchQuery: e.target.value });
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <DisciplinaryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        employees={employees}
        supervisors={supervisorsList}
        categories={categoriesList}
        violationTypes={violationTypesList.map((vt) => vt.name)}
      />

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
          <p className="mt-2 text-gray-600">Loading records...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchRecords}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <DisciplinaryTable
            records={paginatedRecords}
            onEdit={handleEditRecord}
            onDelete={handleDeleteRecord}
            onView={handleViewRecord}
          />

          {/* Pagination */}
          {pagination.totalCount > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalCount}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </>
      )}

          {/* Add/Edit/View Modal */}
          <CaseViewModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingRecord(null);
              setViewingRecord(null);
            }}
            onSubmit={handleSubmitRecord}
            record={viewingRecord || editingRecord}
            employees={employees}
            supervisors={adminEmployees}
            categories={categoriesList}
            violationTypes={violationTypesList}
            viewMode={!!viewingRecord && !editingRecord}
          />

          {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setRecordToDelete(null);
            }}
            onConfirm={handleConfirmDelete}
            record={recordToDelete}
            isDeleting={isDeleting}
          />

          {/* Success Modal */}
          <SuccessModal
            isOpen={isSuccessModalOpen}
            onClose={() => {
              setIsSuccessModalOpen(false);
              setSuccessMessage('');
              setSuccessRecordInfo(null);
            }}
            title="Record Updated Successfully!"
            message={successMessage}
            recordInfo={successRecordInfo || undefined}
          />

          {/* Import Modal */}
          {isImportModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Import Disciplinary Records</h2>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportError('');
                      setImportSuccess('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select CSV File
                      </label>
                      <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Download CSV template"
                      >
                        <FileText className="w-4 h-4" />
                        Download Template
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Upload a CSV file with disciplinary records. Required columns: Case No., Employee, Category, Violation Type, Severity, Status.
                    </p>
                  </div>
                  
                  {importError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{importError}</p>
                    </div>
                  )}
                  
                  {importSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">{importSuccess}</p>
                    </div>
                  )}

                  {isImporting && (
                    <div className="mb-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#800000]"></div>
                      <p className="mt-2 text-sm text-gray-600">Importing records...</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportError('');
                        setImportSuccess('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={isImporting}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DisciplinaryContent;

