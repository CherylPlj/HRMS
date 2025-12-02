'use client';

import React, { useState } from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';
import { DisciplinaryRecord } from '@/types/disciplinary';
import SeverityTag from './SeverityTag';
import StatusTag from './StatusTag';
import FileThumbnail from './FileThumbnail';
import EvidencePreviewModal from './EvidencePreviewModal';
import { EvidenceFile } from '@/types/disciplinary';

interface DisciplinaryTableProps {
  records: DisciplinaryRecord[];
  onEdit: (record: DisciplinaryRecord) => void;
  onDelete: (record: DisciplinaryRecord) => void;
  onView: (record: DisciplinaryRecord) => void;
}

const DisciplinaryTable: React.FC<DisciplinaryTableProps> = ({
  records,
  onEdit,
  onDelete,
  onView,
}) => {
  const [previewFile, setPreviewFile] = useState<{
    files: EvidenceFile[];
    currentIndex: number;
  } | null>(null);

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date: dateStr, time: timeStr };
  };

  const handlePreviewEvidence = (file: EvidenceFile, allFiles: EvidenceFile[]) => {
    const index = allFiles.findIndex((f) => f.id === file.id);
    setPreviewFile({ files: allFiles, currentIndex: index >= 0 ? index : 0 });
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No disciplinary records found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-32">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violation Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 max-w-48">
                  Resolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onView(record)}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 w-32">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{formatDateTime(record.dateTime).date}</span>
                      <span className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(record.dateTime).time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#800000]">
                    {record.caseNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.violation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.employee}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SeverityTag severity={record.severity} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {record.evidence.length > 0 ? (
                        <>
                          <FileThumbnail
                            key={record.evidence[0].id}
                            file={record.evidence[0]}
                            onPreview={(file) => handlePreviewEvidence(file, record.evidence)}
                          />
                          {record.evidence.length > 1 && (
                            <div className="w-16 h-16 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                              +{record.evidence.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No evidence</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={record.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 w-48 max-w-48">
                    <div className="truncate" title={record.resolution || 'Pending'}>
                      {record.resolution || (
                        <span className="text-gray-400 italic">Pending</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView(record)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(record)}
                        className="text-[#800000] hover:text-[#600000] p-1 rounded hover:bg-red-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(record)}
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

      {/* Evidence Preview Modal */}
      {previewFile && (
        <EvidencePreviewModal
          files={previewFile.files}
          currentIndex={previewFile.currentIndex}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
};

export default DisciplinaryTable;

