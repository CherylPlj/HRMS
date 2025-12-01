'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { EmployeeDisciplinaryHistory, DisciplinaryRecord } from '@/types/disciplinary';
import StatusTag from './StatusTag';
import SeverityTag from './SeverityTag';

interface HistoryTableProps {
  histories: EmployeeDisciplinaryHistory[];
  onViewCase: (record: DisciplinaryRecord) => void;
  startIndex?: number;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ histories, onViewCase, startIndex = 0 }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (employeeId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (histories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No disciplinary records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                {/* Expand/Collapse column */}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cases
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ongoing
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resolved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {histories.map((history, index) => {
              const isExpanded = expandedRows.has(history.employeeId);
              return (
                <React.Fragment key={history.employeeId}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleRow(history.employeeId)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-16">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {history.employeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                        {history.totalCases}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-medium">
                        {history.ongoingCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {history.pendingCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                        {history.resolvedCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(history.lastUpdated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleRow(history.employeeId)}
                        className="text-[#800000] hover:text-[#600000] transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'View'} Details
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Row - List of Offenses */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 mb-3">Disciplinary Cases</h4>
                          {history.offenses.length > 0 ? (
                            <div className="space-y-2">
                              {history.offenses.map((offense) => (
                                <div
                                  key={offense.id}
                                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Case No.</p>
                                      <p className="text-sm font-medium text-[#800000]">
                                        {offense.caseNo}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Date</p>
                                      <p className="text-sm text-gray-900">
                                        {formatDate(offense.dateTime)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Violation</p>
                                      <p className="text-sm text-gray-900">{offense.violation}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <SeverityTag severity={offense.severity} />
                                      <StatusTag status={offense.status} />
                                      <button
                                        onClick={() => onViewCase(offense)}
                                        className="ml-auto p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                        title="View Details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No offenses recorded.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;

