'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import Pagination from './Pagination';

interface Supervisor {
  id: string;
  name: string;
}

interface SupervisorManagementProps {
  supervisors: Supervisor[];
  employees: Supervisor[];
  onSupervisorsChange: (supervisors: Supervisor[]) => void;
  records?: any[];
}

const SupervisorManagement: React.FC<SupervisorManagementProps> = ({
  supervisors: initialSupervisors,
  employees,
  onSupervisorsChange,
  records = [],
}) => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>(initialSupervisors);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter employees that aren't already supervisors
  const availableEmployees = employees.filter(
    (emp) => !supervisors.find((sup) => sup.id === emp.id) || editingSupervisor?.id === emp.id
  );

  const filteredSupervisors = useMemo(() => 
    supervisors.filter((sup) =>
      sup.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [supervisors, searchQuery]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSupervisors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSupervisors = filteredSupervisors.slice(startIndex, endIndex);

  // Reset to page 1 when search query or supervisors change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supervisors]);

  // Count cases per supervisor
  const supervisorCounts: Record<string, number> = {};
  records.forEach((record) => {
    if (record.supervisorId) {
      supervisorCounts[record.supervisorId] = (supervisorCounts[record.supervisorId] || 0) + 1;
    }
  });

  const handleAdd = () => {
    setEditingSupervisor(null);
    setSelectedEmployeeId('');
    setError('');
    setIsModalOpen(true);
  };

  const handleEdit = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setSelectedEmployeeId(supervisor.id);
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = (supervisor: Supervisor) => {
    const count = supervisorCounts[supervisor.id] || 0;
    if (count > 0) {
      if (
        !window.confirm(
          `This supervisor is assigned to ${count} case(s). Are you sure you want to remove them?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to remove "${supervisor.name}" as supervisor?`)) {
        return;
      }
    }

    const updated = supervisors.filter((sup) => sup.id !== supervisor.id);
    setSupervisors(updated);
    onSupervisorsChange(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmployeeId) {
      setError('Please select an employee');
      return;
    }

    const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
    if (!selectedEmployee) {
      setError('Selected employee not found');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      let updated: Supervisor[];
      if (editingSupervisor) {
        // Update existing supervisor
        updated = supervisors.map((sup) =>
          sup.id === editingSupervisor.id ? selectedEmployee : sup
        );
      } else {
        // Add new supervisor
        updated = [...supervisors, selectedEmployee];
      }

      setSupervisors(updated);
      onSupervisorsChange(updated);
      setIsModalOpen(false);
      setSelectedEmployeeId('');
      setEditingSupervisor(null);
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Supervisors</h3>
            <p className="text-sm text-gray-600">Manage supervisors who can handle disciplinary cases</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
            disabled={availableEmployees.length === 0 && !editingSupervisor}
          >
            <Plus className="w-5 h-5" />
            Add Supervisor
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search supervisors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          />
        </div>

        {/* Supervisors List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredSupervisors.length > 0 ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supervisor Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cases Assigned
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSupervisors.map((supervisor) => (
                    <tr key={supervisor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {supervisor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supervisor.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {supervisorCounts[supervisor.id] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(supervisor)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supervisor)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSupervisors.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredSupervisors.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {searchQuery
                ? 'No supervisors found matching your search.'
                : 'No supervisors yet. Add your first supervisor.'}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSupervisor ? 'Edit Supervisor' : 'Add Supervisor'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedEmployeeId('');
                  setError('');
                  setEditingSupervisor(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select Employee</option>
                  {editingSupervisor && (
                    <option value={editingSupervisor.id}>{editingSupervisor.name}</option>
                  )}
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                {availableEmployees.length === 0 && !editingSupervisor && (
                  <p className="mt-1 text-sm text-gray-500">
                    All available employees are already assigned as supervisors.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedEmployeeId('');
                    setError('');
                    setEditingSupervisor(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors disabled:opacity-50"
                  disabled={isSubmitting || (availableEmployees.length === 0 && !editingSupervisor)}
                >
                  {isSubmitting
                    ? editingSupervisor
                      ? 'Updating...'
                      : 'Adding...'
                    : editingSupervisor
                    ? 'Update'
                    : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupervisorManagement;

