import React from 'react';
import { getFileType } from './utils';

interface FilePreviewProps {
  url: string;
  documentType?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ url, documentType }) => {
  const fileType = getFileType(url);
  
  return (
    <div className="w-full flex flex-col">
      <div className="border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold text-[#800000]">{documentType || 'Document Preview'}</h3>
      </div>

      <div className="flex justify-center">
        {fileType === 'image' && (
          <img 
            src={url} 
            alt="Document preview" 
            className="max-w-full max-h-[calc(70vh-4rem)] object-contain"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/file.svg';
            }}
          />
        )}
        {fileType === 'pdf' && (
          <iframe 
            src={url}
            title="Document Preview"
            className="w-full h-[calc(70vh-4rem)] border-0"
          />
        )}
        {fileType === 'other' && (
          <div className="flex flex-col items-center justify-center h-[calc(70vh-4rem)]">
            <img src="/file.svg" alt="File icon" className="w-16 h-16 mb-4" />
            <p>Preview not available</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#a83232]"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;

