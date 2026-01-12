'use client';

import React, { useState, useRef } from 'react';

interface CSVRow {
  facultyId?: string;
  facultyName?: string;
  facultyEmail?: string;
  subjectId?: string;
  subjectName?: string;
  classSectionId?: string;
  sectionName?: string;
  day: string;
  time: string;
  duration: string;
  [key: string]: string | undefined;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (schedules: any[]) => Promise<ImportResult>;
}

export default function ImportCSVModal({ isOpen, onClose, onImport }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Parse data rows
      const data: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {
          day: '',
          time: '',
          duration: ''
        };
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      }

      setCsvData(data);
      validateCSVData(data);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const validateCSVData = (data: CSVRow[]) => {
    const errors: ValidationError[] = [];
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of header and 0-index

      // Check faculty identification (ID, name, or email)
      const hasFacultyId = row.facultyid || row.facultyId || row.facultyid;
      const hasFacultyName = row.facultyname || row.facultyName;
      const hasFacultyEmail = row.facultyemail || row.facultyEmail;
      
      if (!hasFacultyId && !hasFacultyName && !hasFacultyEmail) {
        errors.push({ row: rowNum, field: 'faculty', message: 'Faculty ID, Name, or Email is required' });
      }

      // Check subject identification (ID or name)
      const hasSubjectId = row.subjectid || row.subjectId;
      const hasSubjectName = row.subjectname || row.subjectName;
      
      if (!hasSubjectId && !hasSubjectName) {
        errors.push({ row: rowNum, field: 'subject', message: 'Subject ID or Name is required' });
      }

      // Check section identification (ID or name)
      const hasSectionId = row.classsectionid || row.classSectionId || row.sectionid || row.sectionId;
      const hasSectionName = row.sectionname || row.sectionName || row.section;
      
      if (!hasSectionId && !hasSectionName) {
        errors.push({ row: rowNum, field: 'section', message: 'Section ID or Name is required' });
      }

      if (!row.day) {
        errors.push({ row: rowNum, field: 'day', message: 'Day is required' });
      } else if (!validDays.includes(row.day)) {
        errors.push({ row: rowNum, field: 'day', message: `Day must be one of: ${validDays.join(', ')}` });
      }
      if (!row.time) {
        errors.push({ row: rowNum, field: 'time', message: 'Time is required' });
      }
      if (!row.duration) {
        errors.push({ row: rowNum, field: 'duration', message: 'Duration is required' });
      } else if (isNaN(parseInt(row.duration!))) {
        errors.push({ row: rowNum, field: 'duration', message: 'Duration must be a number' });
      }
    });

    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      alert('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    
    const schedules = csvData.map(row => {
      const schedule: any = {
        day: row.day,
        time: row.time,
        duration: parseInt(row.duration!),
      };

      // Handle faculty (ID, name, or email)
      if (row.facultyid || row.facultyId) {
        schedule.facultyId = parseInt((row.facultyid || row.facultyId)!);
      } else if (row.facultyname || row.facultyName) {
        schedule.facultyName = row.facultyname || row.facultyName;
      } else if (row.facultyemail || row.facultyEmail) {
        schedule.facultyEmail = row.facultyemail || row.facultyEmail;
      }

      // Handle subject (ID or name)
      if (row.subjectid || row.subjectId) {
        schedule.subjectId = parseInt((row.subjectid || row.subjectId)!);
      } else if (row.subjectname || row.subjectName) {
        schedule.subjectName = row.subjectname || row.subjectName;
      }

      // Handle section (ID or name)
      if (row.classsectionid || row.classSectionId || row.sectionid || row.sectionId) {
        schedule.classSectionId = parseInt((row.classsectionid || row.classSectionId || row.sectionid || row.sectionId)!);  
      } else if (row.sectionname || row.sectionName || row.section) {
        schedule.sectionName = row.sectionname || row.sectionName || row.section;
      }

      return schedule;
    });

    try {
      const result = await onImport(schedules);
      setImportResult(result);
      setStep('result');
    } catch (error) {
      alert('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setImportResult(null);
    setStep('upload');
    onClose();
  };

  const downloadTemplate = () => {
    const template = 'facultyName,subjectName,sectionName,day,time,duration\nJuan Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1\nMaria Santos,English 8,Grade 8 - Bonifacio,Tuesday,10:00-11:00,1';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div
          className="relative bg-white text-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Import Schedules from CSV</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4">
            {step === 'upload' && (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">📋 CSV Format Instructions</h3>
                  <p className="text-sm text-blue-800 mb-2">Your CSV file should have the following columns:</p>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li><strong>facultyName</strong> - Full name as "FirstName LastName" (e.g., "Juan Cruz") OR <strong>facultyEmail</strong> OR <strong>facultyId</strong></li>
                    <li><strong>subjectName</strong> - Subject name (e.g., "Mathematics 7") OR <strong>subjectId</strong></li>
                    <li><strong>sectionName</strong> - Section name (e.g., "Grade 7 - Rizal") OR <strong>sectionId</strong></li>
                    <li><strong>day</strong> - Day of week (Monday, Tuesday, etc.)</li>
                    <li><strong>time</strong> - Time slot (e.g., 08:00-09:00)</li>
                    <li><strong>duration</strong> - Duration in hours (e.g., 1, 2, 3)</li>
                  </ul>
                  <p className="text-sm text-blue-700 mt-2 font-medium">💡 Tip: Using names is easier than IDs!</p>
                  <p className="text-sm text-amber-700 mt-1">⚠️ Faculty name must match FirstName + LastName in the system</p>
                  <button
                    onClick={downloadTemplate}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    📥 Download Template CSV
                  </button>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">CSV file only</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Select CSV File
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                {/* Validation Summary */}
                <div className={`border rounded-lg p-4 ${validationErrors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center">
                    {validationErrors.length > 0 ? (
                      <>
                        <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">
                          {validationErrors.length} validation error(s) found
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-green-800">
                          {csvData.length} schedule(s) ready to import
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="border border-red-300 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>
                          Row {error.row}, {error.field}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Data Preview */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                    <h4 className="text-sm font-medium text-gray-900">Preview ({csvData.length} rows)</h4>
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Faculty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Subject</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Section</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Day</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-xs">
                              {row.facultyname || row.facultyName || row.facultyemail || row.facultyEmail || row.facultyid || row.facultyId}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {row.subjectname || row.subjectName || row.subjectid || row.subjectId}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {row.sectionname || row.sectionName || row.section || row.classsectionid || row.classSectionId || row.sectionid || row.sectionId}
                            </td>
                            <td className="px-3 py-2">{row.day}</td>
                            <td className="px-3 py-2">{row.time}</td>
                            <td className="px-3 py-2">{row.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validationErrors.length > 0 || importing}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : `Import ${csvData.length} Schedule(s)`}
                  </button>
                </div>
              </div>
            )}

            {step === 'result' && importResult && (
              <div className="space-y-4">
                {/* Success Summary */}
                <div className="text-center py-6">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${importResult.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <svg
                      className={`h-6 w-6 ${importResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Import Complete!</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Successfully imported {importResult.success} schedule(s)
                    {importResult.failed > 0 && `, ${importResult.failed} failed`}
                  </p>
                </div>

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">Import Errors:</h4>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>Row {error.row}: {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-[#800000] text-white rounded-md text-sm font-medium hover:bg-[#600018]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
