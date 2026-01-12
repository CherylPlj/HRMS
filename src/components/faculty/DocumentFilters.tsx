import React from 'react';
import { Search } from 'lucide-react';
import { DocumentType } from './types';
import ManageDocumentTypes from '../ManageDocumentTypes';

interface DocumentFiltersProps {
  documentSearchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDocumentType: number | 'all';
  onDocumentTypeChange: (value: number | 'all') => void;
  selectedDocumentStatus: string;
  onDocumentStatusChange: (value: string) => void;
  documentTypes: DocumentType[];
  onDocumentTypesUpdate: () => void;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  documentSearchTerm,
  onSearchChange,
  selectedDocumentType,
  onDocumentTypeChange,
  selectedDocumentStatus,
  onDocumentStatusChange,
  documentTypes,
  onDocumentTypesUpdate
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
      <div className="relative w-full md:w-80">
        <input
          type="text"
          placeholder="Search documents..."
          value={documentSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-grow">
        <div className="flex-1 min-w-[140px]">
          <select
            id="documentTypeFilter"
            value={selectedDocumentType}
            onChange={(e) => onDocumentTypeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 text-sm sm:text-base"
            title="Filter by Document Type"
          >
            <option value="all">All Document Types</option>
            {documentTypes.map((type) => (
              <option key={type.DocumentTypeID} value={type.DocumentTypeID}>
                {type.DocumentTypeName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <select
            id="documentStatusFilter"
            value={selectedDocumentStatus}
            onChange={(e) => onDocumentStatusChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 text-sm sm:text-base"
            title="Filter by Submission Status"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <ManageDocumentTypes
            documentTypes={documentTypes}
            onUpdate={onDocumentTypesUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentFilters;

