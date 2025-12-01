'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { EvidenceFile } from '@/types/disciplinary';

interface EvidencePreviewModalProps {
  files: EvidenceFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: EvidenceFile) => void;
}

const EvidencePreviewModal: React.FC<EvidencePreviewModalProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [imageError, setImageError] = useState(false);

  // Reset error state when active index changes
  useEffect(() => {
    setImageError(false);
  }, [activeIndex]);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[activeIndex];


  const handleNext = () => {
    setActiveIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
    setImageError(false); // Reset error state when changing files
  };

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
    setImageError(false); // Reset error state when changing files
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentFile);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = currentFile.url;
      link.download = currentFile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderPreview = () => {
    switch (currentFile.fileType) {
      case 'image':
        if (imageError) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <p className="text-lg mb-2">Image failed to load</p>
              <p className="text-sm mb-4">{currentFile.fileName}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={currentFile.url}
              alt={currentFile.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={() => {
                setImageError(true);
              }}
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-[70vh]">
            <iframe
              src={currentFile.url}
              className="w-full h-full border-0 rounded-lg"
              title={currentFile.fileName}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg mb-2">File Preview Not Available</p>
            <p className="text-sm">{currentFile.fileName}</p>
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">{currentFile.fileName}</h3>
            <span className="text-sm text-gray-500">
              {activeIndex + 1} of {files.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 1 && (
              <>
                <button
                  onClick={() => {
                    handlePrevious();
                  }}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    handleNext();
                  }}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">{renderPreview()}</div>

        {/* Thumbnail Strip */}
        {files.length > 1 && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2 overflow-x-auto">
              {files.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => {
                    setActiveIndex(index);
                    setImageError(false);
                  }}
                  className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                    activeIndex === index ? 'border-[#800000]' : 'border-gray-300'
                  }`}
                >
                  {file.fileType === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const container = target.parentElement;
                        if (container && !container.querySelector('.error-placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full bg-gray-100 flex items-center justify-center error-placeholder';
                          placeholder.innerHTML = '<span class="text-xs text-gray-400">IMG</span>';
                          container.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {file.fileType === 'pdf' ? 'PDF' : 'FILE'}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidencePreviewModal;

