'use client';

import React from 'react';

interface PhotoModalProps {
  isOpen: boolean;
  photo: { url: string; alt: string } | null;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ isOpen, photo, onClose }) => {
  if (!isOpen || !photo) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-white rounded-lg p-2 max-w-4xl max-h-[90vh]"
        style={{ backgroundColor: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-white rounded-full p-1"
          style={{ backgroundColor: 'white' }}
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center justify-center min-h-[200px]">
          <img
            src={photo.url}
            alt={photo.alt}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;

