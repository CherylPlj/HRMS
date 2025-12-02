'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from './Pagination';

interface Category {
  id: string;
  name: string;
  count?: number;
}

interface CategoryManagementProps {
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
  records?: any[];
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories: initialCategories,
  onCategoriesChange,
  records = [],
}) => {
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [categoryMap, setCategoryMap] = useState<Map<string, number>>(new Map()); // Map category name to ID
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch categories from API on mount and when initialCategories change
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Fetch full category data to get IDs
      const fullResponse = await fetch('/api/disciplinary/categories?full=true');
      if (!fullResponse.ok) throw new Error('Failed to fetch categories');
      
      const fullData = await fullResponse.json();
      const categoryNames = fullData.map((cat: any) => cat.name);
      setCategories(categoryNames);
      onCategoriesChange(categoryNames);
      
      // Build map of category name to ID
      const map = new Map<string, number>();
      fullData.forEach((cat: any) => {
        map.set(cat.name, cat.id);
      });
      setCategoryMap(map);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => 
    categories.filter((cat) =>
      cat.toLowerCase().includes(searchQuery.toLowerCase())
    ), [categories, searchQuery]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset to page 1 when search query or categories change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categories]);

  // Count cases per category
  const categoryCounts: Record<string, number> = {};
  records.forEach((record) => {
    if (record.category) {
      categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
    }
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setError('');
    setIsModalOpen(true);
  };

  const handleEdit = (category: string) => {
    setEditingCategory(category);
    setEditingCategoryId(categoryMap.get(category) || null);
    setCategoryName(category);
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (category: string) => {
    const count = categoryCounts[category] || 0;
    const categoryId = categoryMap.get(category);
    
    if (!categoryId) {
      toast.error('Category ID not found');
      return;
    }

    if (count > 0) {
      if (
        !window.confirm(
          `This category is used in ${count} case(s). Are you sure you want to delete it?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete "${category}"?`)) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/disciplinary/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
      await fetchCategories(); // Refresh categories list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingCategory && editingCategoryId) {
        // Update existing category
        const response = await fetch(`/api/disciplinary/categories/${editingCategoryId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update category');
        }

        toast.success('Category updated successfully');
      } else {
        // Create new category
        const response = await fetch('/api/disciplinary/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            description: '',
            isActive: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create category');
        }

        toast.success('Category created successfully');
      }

      // Refresh categories list
      await fetchCategories();
      
      setIsModalOpen(false);
      setCategoryName('');
      setEditingCategory(null);
      setEditingCategoryId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save category';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
            <p className="text-sm text-gray-600">Manage disciplinary action categories</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          />
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredCategories.length > 0 ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Name
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
                  {paginatedCategories.map((category) => (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {categoryCounts[category] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
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
              {filteredCategories.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCategories.length}
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
              {searchQuery ? 'No categories found matching your search.' : 'No categories yet. Add your first category.'}
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
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCategoryName('');
                  setError('');
                  setEditingCategory(null);
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
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Attendance, Behavior, Performance"
                  required
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCategoryName('');
                    setError('');
                    setEditingCategory(null);
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
                    ? editingCategory
                      ? 'Updating...'
                      : 'Adding...'
                    : editingCategory
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

export default CategoryManagement;

