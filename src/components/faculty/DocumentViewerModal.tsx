import React from 'react';
import { Link, Download, X } from 'lucide-react';
import { DocumentFacultyRow } from './types';
import { getViewUrl, getDownloadUrl, getPreviewUrl } from './utils';
import FilePreview from './FilePreview';

interface DocumentViewerModalProps {
  isOpen: boolean;
  selectedDocument: DocumentFacultyRow | null;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  selectedDocument,
  onClose
}) => {
  if (!isOpen || !selectedDocument || !selectedDocument.FileUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedDocument.documentTypeName}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedDocument.facultyName} - {new Date(selectedDocument.UploadDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href={getViewUrl(selectedDocument.FileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900"
              title="Open in New Tab"
            >
              <Link className="w-5 h-5" />
            </a>
            <a
              href={getDownloadUrl(selectedDocument.DownloadUrl || selectedDocument.FileUrl)}
              download
              className="text-gray-600 hover:text-gray-900"
              title="Download Document"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <FilePreview 
            url={getPreviewUrl(selectedDocument.FileUrl)} 
            documentType={selectedDocument.documentTypeName}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;

