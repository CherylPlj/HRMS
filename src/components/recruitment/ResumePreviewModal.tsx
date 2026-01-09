import React, { useState, useEffect, useRef } from 'react';
import { getFileType, getPreviewUrl } from './utils';

interface ResumePreviewModalProps {
  previewResumeUrl: string | null;
  previewCandidateName: string;
  onClose: () => void;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  previewResumeUrl,
  previewCandidateName,
  onClose
}) => {
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Process URL and handle errors
  let fileType: 'pdf' | 'image' | 'other' = 'other';
  let previewUrl = '';
  let renderError: string | null = null;

  if (previewResumeUrl) {
    try {
      fileType = getFileType(previewResumeUrl);
      previewUrl = getPreviewUrl(previewResumeUrl);
    } catch (error) {
      console.error('Error processing resume URL:', error);
      renderError = 'Unable to process resume URL. Please try downloading the file instead.';
    }
  }
  
  // Check if previewUrl is invalid (empty or just the base path without file)
  // A valid proxy URL should be: /api/candidates/resume/[encoded-file-path]
  // So it should have at least 5 parts when split by '/': ['', 'api', 'candidates', 'resume', 'file-path']
  const isInvalidProxyUrl = previewUrl && previewUrl.startsWith('/api/candidates/resume') && (
    previewUrl === '/api/candidates/resume' ||
    previewUrl === '/api/candidates/resume/' ||
    previewUrl.split('/').filter(p => p).length < 4 // Less than 4 non-empty parts means no file path
  );

  // Reset error state when previewUrl changes
  // This hook must be called before any conditional returns
  useEffect(() => {
    setIframeError(false);
  }, [previewUrl]);

  // Early return after all hooks have been called
  if (!previewResumeUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Resume Preview</h2>
            <p className="text-sm text-gray-500">{previewCandidateName}</p>
          </div>
          <div className="flex items-center gap-4">
            {previewResumeUrl && (
              <a
                href={previewUrl || previewResumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
                title="Open in New Tab"
              >
                <i className="fas fa-external-link-alt text-lg"></i>
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {renderError ? (
            <div className="flex flex-col items-center justify-center h-full">
              <i className="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
              <p className="text-gray-600 mb-4">{renderError}</p>
              {previewResumeUrl && (
                <a
                  href={previewResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <i className="fas fa-external-link-alt mr-2"></i>
                  Open Original URL
                </a>
              )}
            </div>
          ) : !previewUrl || isInvalidProxyUrl ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-600 mb-4">
                {!previewUrl 
                  ? 'Unable to generate preview URL' 
                  : 'Invalid file path. The resume URL may be missing or in an unexpected format.'}
              </p>
              {previewResumeUrl && (
                <a
                  href={previewResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <i className="fas fa-external-link-alt mr-2"></i>
                  Open Original URL
                </a>
              )}
            </div>
          ) : fileType === 'pdf' ? (
            !previewUrl || previewUrl === '/' || (previewUrl.startsWith('http://localhost:3000/') && previewUrl === 'http://localhost:3000/') ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-600 mb-4">Invalid preview URL. Please use the link below to open the file.</p>
                <a
                  href={previewResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <i className="fas fa-external-link-alt mr-2"></i>
                  Open in New Tab
                </a>
              </div>
            ) : (
              <>
                {iframeError ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-600 mb-4">Failed to load resume preview. The file may be missing or inaccessible.</p>
                    <a
                      href={previewResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <i className="fas fa-external-link-alt mr-2"></i>
                      Open Original URL
                    </a>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Resume Preview"
                    className="w-full h-full border-0"
                    style={{ minHeight: '600px' }}
                    onError={(e) => {
                      console.error('Iframe load error:', e);
                      setIframeError(true);
                    }}
                    onLoad={() => {
                      console.log('Iframe loaded successfully with URL:', previewUrl);
                      // Check if the iframe content might be an error (this is a best-effort check)
                      try {
                        const iframe = iframeRef.current;
                        if (iframe && iframe.contentWindow) {
                          // Try to detect if content is JSON error (limited due to CORS)
                          // If we can't access content, assume it loaded successfully
                          setIframeError(false);
                        }
                      } catch (e) {
                        // Cross-origin restrictions prevent checking content
                        // Assume it loaded successfully if no error event fired
                        setIframeError(false);
                      }
                    }}
                  />
                )}
              </>
            )
          ) : fileType === 'image' ? (
            <img
              src={previewUrl}
              alt="Resume preview"
              className="max-w-full max-h-full object-contain mx-auto"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/file.svg';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <i className="fas fa-file-alt text-6xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 mb-4">Preview not available for this file type</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center justify-center"
              >
                <i className="fas fa-external-link-alt mr-2"></i>
                Open in New Tab
              </a>
              <p className="text-xs text-gray-500 mt-2">Note: Some file types (like .doc, .docx) may download as browsers cannot display them inline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

