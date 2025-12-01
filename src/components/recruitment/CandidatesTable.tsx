'use client';

import React from 'react';
import { Edit, Trash2, Eye, FileText, Sparkles } from 'lucide-react';
import { Candidate, Vacancy } from './types';
import { formatDate, formatDateTime, formatStatus, formatName, calculateAge } from './utils';

interface CandidatesTableProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
  isHiredTab?: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onPreviewResume: (url: string, name: string) => void;
  onAIScreen?: (candidateId: number, vacancyId: number) => void;
}

export const CandidatesTable: React.FC<CandidatesTableProps> = ({
  candidates,
  vacancies,
  isHiredTab = false,
  onEdit,
  onDelete,
  onPreviewResume,
  onAIScreen
}) => {
  if (candidates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No candidates found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidate Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Applied
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isHiredTab ? 'Hire Date' : 'Interview Schedule'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resume
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.map((c: Candidate) => (
              <tr
                key={c.CandidateID}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.Vacancy?.VacancyName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.Email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.ContactNumber || c.Phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(c.DateApplied)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.InterviewDate ? formatDateTime(c.InterviewDate) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formatStatus(c.Status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.ResumeUrl ? (
                    <button
                      onClick={() => onPreviewResume(c.ResumeUrl || '', c.FullName)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Preview Resume"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : c.Resume ? (
                    <span className="text-gray-500" title={c.Resume}>
                      <FileText className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {onAIScreen && !isHiredTab && (
                      <button
                        onClick={() => onAIScreen(c.CandidateID, c.VacancyID)}
                        className="text-[#800000] hover:text-[#600000] p-1 rounded hover:bg-red-50 transition-colors"
                        title="AI Screen"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(c.CandidateID)}
                      className="text-[#800000] hover:text-[#600000] p-1 rounded hover:bg-red-50 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c.CandidateID)}
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
      </div>
    </div>
  );
};
