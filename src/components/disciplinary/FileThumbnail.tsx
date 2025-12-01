'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, File, Eye } from 'lucide-react';
import { EvidenceFile } from '@/types/disciplinary';

interface FileThumbnailProps {
  file: EvidenceFile;
  onPreview: (file: EvidenceFile) => void;
  className?: string;
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({ file, onPreview, className = '' }) => {
  const getFileIcon = () => {
    switch (file.fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPreviewButton = () => {
    if (file.fileType === 'image' || file.fileType === 'pdf') {
      return (
        <button
          onClick={() => onPreview(file)}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-50 transition-all rounded group"
          title="Preview"
        >
          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative w-16 h-16 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#800000] transition-colors ${className}`}
      onClick={() => file.fileType === 'image' || file.fileType === 'pdf' ? onPreview(file) : null}
    >
      {file.fileType === 'image' && file.url ? (
        <img
          src={file.url}
          alt={file.fileName}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : (
        getFileIcon()
      )}
      {getPreviewButton()}
      <div className="absolute -bottom-1 -right-1 bg-[#800000] text-white text-[8px] px-1 rounded truncate max-w-[60px]">
        {file.fileName.substring(0, 8)}...
      </div>
    </div>
  );
};

export default FileThumbnail;

