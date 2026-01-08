'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import CategoryManagement from './CategoryManagement';
import ViolationTypeManagement from './ViolationTypeManagement';
import { SeverityLevel } from '@/types/disciplinary';

interface ManageCategoriesModalProps {
  categories: string[];
  violationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[];
  records?: any[];
  onCategoriesChange: (categories: string[]) => void;
  onViolationTypesChange: (violationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]) => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  categories: initialCategories,
  violationTypes: initialViolationTypes,
  records = [],
  onCategoriesChange,
  onViolationTypesChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'violations'>('categories');
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [violationTypes, setViolationTypes] = useState<{ id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]>(initialViolationTypes);

  // Update local state when props change
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setViolationTypes(initialViolationTypes);
  }, [initialViolationTypes]);

  const handleCategoriesChange = (newCategories: string[]) => {
    setCategories(newCategories);
    onCategoriesChange(newCategories);
  };

  const handleViolationTypesChange = (newViolationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]) => {
    setViolationTypes(newViolationTypes);
    onViolationTypesChange(newViolationTypes);
  };

  return (
    <>
      {/* Manage Categories Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-300 border border-gray-300"
        title="Manage Categories and Violations"
        type="button"
      >
        <Settings size={16} /> Manage Categories
      </button>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Manage Categories & Violations</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 px-6 pt-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'categories'
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab('violations')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'violations'
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Violation Types
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'categories' ? (
                <CategoryManagement
                  categories={categories}
                  onCategoriesChange={handleCategoriesChange}
                  records={records}
                />
              ) : (
                <ViolationTypeManagement
                  violationTypes={violationTypes}
                  categories={categories}
                  onViolationTypesChange={handleViolationTypesChange}
                  records={records}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageCategoriesModal;

