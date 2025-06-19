'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { 
  ssr: false,
  loading: () => <div>Loading PDF viewer...</div>
});

const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { 
  ssr: false 
});

interface PDFViewerProps {
  file: string;
  onLoadSuccess?: (pdf: any) => void;
  onError?: (error: any) => void;
  pageNumber?: number;
  renderTextLayer?: boolean;
  renderAnnotationLayer?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onLoadSuccess,
  onError,
  pageNumber = 1,
  renderTextLayer = true,
  renderAnnotationLayer = true
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    // Set up PDF.js worker
    import('react-pdf').then(({ pdfjs }) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    });
  }, []);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess({ numPages });
    }
  };

  return (
    <Document
      file={file}
      onLoadSuccess={handleLoadSuccess}
      onError={onError}
      className="flex justify-center"
    >
      <Page
        pageNumber={pageNumber}
        renderTextLayer={renderTextLayer}
        renderAnnotationLayer={renderAnnotationLayer}
        className="shadow-lg"
      />
    </Document>
  );
};

export default PDFViewer; 