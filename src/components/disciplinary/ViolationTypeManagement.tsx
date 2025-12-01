'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { SeverityLevel } from '@/types/disciplinary';
import { toast } from 'react-hot-toast';

interface ViolationType {
  id: string;
  name: string;
  category: string;
  defaultSeverity: SeverityLevel;
}

interface ViolationTypeManagementProps {
  violationTypes: ViolationType[];
  categories: string[];
  onViolationTypesChange: (violationTypes: ViolationType[]) => void;
  records?: any[];
}

const ViolationTypeManagement: React.FC<ViolationTypeManagementProps> = ({
  violationTypes: initialViolationTypes,
  categories,
  onViolationTypesChange,
  records = [],
}) => {
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>(initialViolationTypes);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ViolationType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultSeverity: 'Minor' as SeverityLevel,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredViolations = violationTypes.filter((vt) => {
    const matchesSearch = vt.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || vt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Count cases per violation type
  const violationCounts: Record<string, number> = {};
  records.forEach((record) => {
    if (record.violation) {
      violationCounts[record.violation] = (violationCounts[record.violation] || 0) + 1;
    }
  });

  const handleAdd = () => {
    setEditingViolation(null);
    setFormData({ name: '', category: '', defaultSeverity: 'Minor' });
    setError('');
    setIsModalOpen(true);
  };

  const handleEdit = (violation: ViolationType) => {
    setEditingViolation(violation);
    setFormData({
      name: violation.name,
      category: violation.category,
      defaultSeverity: violation.defaultSeverity,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = (violation: ViolationType) => {
    const count = violationCounts[violation.name] || 0;
    if (count > 0) {
      if (
        !window.confirm(
          `This violation type is used in ${count} case(s). Are you sure you want to delete it?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete "${violation.name}"?`)) {
        return;
      }
    }

    const updated = violationTypes.filter((vt) => vt.id !== violation.id);
    setViolationTypes(updated);
    onViolationTypesChange(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Violation type name is required');
      return;
    }

    if (!formData.category) {
      setError('Category is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Violation type name must be at least 2 characters');
      return;
    }

    // Check for duplicates (case-insensitive, but allow same name when editing)
    const normalizedName = trimmedName.toLowerCase();
    const existing = violationTypes.find(
      (vt) =>
        vt.name.toLowerCase() === normalizedName &&
        vt.category === formData.category &&
        (!editingViolation || vt.id !== editingViolation.id)
    );

    if (existing) {
      setError('Violation type with this name already exists in the selected category');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingViolation) {
        // Update existing violation type
        const response = await fetch(`/api/disciplinary/violation-types/${editingViolation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            category: formData.category,
            defaultSeverity: formData.defaultSeverity,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update violation type');
        }

        toast.success('Violation type updated successfully');
      } else {
        // Create new violation type
        const response = await fetch('/api/disciplinary/violation-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            category: formData.category,
            defaultSeverity: formData.defaultSeverity,
            isActive: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create violation type');
        }

        toast.success('Violation type created successfully');
      }

      // Refresh violation types list
      await fetchViolationTypes();
      
      setIsModalOpen(false);
      setFormData({ name: '', category: '', defaultSeverity: 'Minor' });
      setEditingViolation(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save violation type';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch violation types from API
  const fetchViolationTypes = async () => {
    try {
      const response = await fetch('/api/disciplinary/violation-types?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch violation types');
      
      const data = await response.json();
      const transformed = data.map((vt: any) => ({
        id: vt.id.toString(),
        name: vt.name,
        category: vt.category?.name || vt.category || '',
        defaultSeverity: vt.defaultSeverity,
      }));
      
      setViolationTypes(transformed);
      onViolationTypesChange(transformed);
    } catch (err) {
      console.error('Error fetching violation types:', err);
      toast.error('Failed to load violation types');
    }
  };

  // Fetch violation types on mount
  useEffect(() => {
    fetchViolationTypes();
  }, []);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Violation Types</h3>
            <p className="text-sm text-gray-600">Manage violation types for each category</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Violation Type
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search violation types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Violation Types List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredViolations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violation Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cases Count
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {violation.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {violation.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          violation.defaultSeverity === 'Minor'
                            ? 'bg-yellow-100 text-yellow-800'
                            : violation.defaultSeverity === 'Moderate'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {violation.defaultSeverity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {violationCounts[violation.name] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(violation)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(violation)}
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
          ) : (
            <div className="p-8 text-center text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? 'No violation types found matching your filters.'
                : 'No violation types yet. Add your first violation type.'}
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
                {editingViolation ? 'Edit Violation Type' : 'Add Violation Type'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ name: '', category: '', defaultSeverity: 'Minor' });
                  setError('');
                  setEditingViolation(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Violation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent ${
                    error && error.includes('name') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Late Arrival, Insubordination"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    setError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent ${
                    error && error.includes('Category') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Severity <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.defaultSeverity}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultSeverity: e.target.value as SeverityLevel })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  required
                >
                  <option value="Minor">Minor</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Major">Major</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', category: '', defaultSeverity: 'Minor' });
                    setError('');
                    setEditingViolation(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? editingViolation
                      ? 'Updating...'
                      : 'Adding...'
                    : editingViolation
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

export default ViolationTypeManagement;

