import React, { useState, useEffect } from 'react';
import { FaCheck, FaPen, FaTrash, FaEye, FaSearch, FaTimes, FaFileCsv } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';

interface ChatbotResponse {
  id: number;
  createdBy: string;
  question: string;
  answer: string;
  date: string;
  trainingDoc: string | null;
  trainingDocTitle: string | null;
}

const AdminChatbot = () => {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responses, setResponses] = useState<ChatbotResponse[]>([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('2025-02-01–2025-03-20');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [trainingDoc, setTrainingDoc] = useState<File | null>(null);
  const [trainingDocContent, setTrainingDocContent] = useState<string>('');
  const [uploadedTrainingDocUrl, setUploadedTrainingDocUrl] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<ChatbotResponse | null>(null);
  const [deletingResponse, setDeletingResponse] = useState<ChatbotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper function to extract filename from full path
  const getFilenameFromPath = (filePath: string): string => {
    if (!filePath) return 'none';
    // Extract filename from path (handle both forward and backward slashes)
    const filename = filePath.split(/[/\\]/).pop();
    return filename || 'none';
  };

  // Fetch responses on component mount
  useEffect(() => {
    fetchResponses();
  }, []);

  // Add keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && search) {
        setSearch('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [search]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/queries');
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }
      const data = await response.json();
      setResponses(data);
    } catch (error) {
      setError('Failed to load responses');
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTrainingDoc(e.target.files[0]);
      // Upload file immediately to extract text
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('userId', user?.id || '');
      const uploadResponse = await fetch('/api/upload-training-doc', {
        method: 'POST',
        body: formData,
      });
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('File upload response:', uploadData);
        setTrainingDocContent(uploadData.extractedText || '');
        setUploadedTrainingDocUrl(uploadData.fileUrl || null); // Save the file URL
        console.log('Set uploadedTrainingDocUrl to:', uploadData.fileUrl);
      } else {
        console.error('File upload failed:', uploadResponse.status);
        setTrainingDocContent('');
        setUploadedTrainingDocUrl(null);
      }
    }
  };

  const handleEdit = (response: ChatbotResponse) => {
    setEditingResponse(response);
    setQuestion(response.question);
    setAnswer(response.answer);
    setTrainingDoc(null); // Reset training doc for edit
    setShowEditModal(true);
  };

  const handleDelete = (response: ChatbotResponse) => {
    setDeletingResponse(response);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deletingResponse) {
      try {
        const response = await fetch(`/api/queries/${deletingResponse.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete response');
        }
        
        setResponses(responses.filter(r => r.id !== deletingResponse.id));
        setShowDeleteModal(false);
        setDeletingResponse(null);
      } catch (error) {
        console.error('Error deleting response:', error);
        setError('Failed to delete response');
      }
    }
  };

  const saveEdit = async () => {
    if (editingResponse) {
      try {
        const response = await fetch(`/api/queries/${editingResponse.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            answer,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update response');
        }

        const updatedResponse = await response.json();
        setResponses(responses.map(r => 
          r.id === editingResponse.id ? updatedResponse : r
        ));
        setShowEditModal(false);
        setEditingResponse(null);
        setQuestion('');
        setAnswer('');
        setTrainingDoc(null);
        setUploadedTrainingDocUrl(null); // Reset the uploaded file URL
      } catch (error) {
        console.error('Error updating response:', error);
        setError('Failed to update response');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    // Validation: Either question/answer content or training document is required
    const hasQuestion = question && question.trim() !== '';
    const hasAnswer = answer && answer.trim() !== '';
    const hasTrainingDoc = !!uploadedTrainingDocUrl; // Use the uploaded file URL
    
    console.log('Frontend validation:', {
      hasQuestion,
      hasAnswer,
      hasTrainingDoc,
      uploadedTrainingDocUrl,
      question,
      answer
    });
    
    // If no training document, require both question and answer
    if (!hasTrainingDoc && (!hasQuestion || !hasAnswer)) {
      setError('Both question and answer are required when no training document is uploaded');
      return;
    }

    try {
      const requestBody = {
        question: hasQuestion ? question : 'none',
        answer: hasAnswer ? answer : 'none',
        userId: user.id,
        trainingDoc: uploadedTrainingDocUrl, // Use the uploaded file URL
        trainingDocContent: trainingDocContent,
      };
      
      console.log('Sending request to backend:', requestBody);
      
      // Create the query
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.error || 'Failed to create response');
      }

      const newResponse = await response.json();
      setResponses([newResponse, ...responses]);
      setShowModal(false);
      setQuestion('');
      setAnswer('');
      setTrainingDoc(null);
      setUploadedTrainingDocUrl(null); // Reset the uploaded file URL
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error creating response:', error);
      setError(error instanceof Error ? error.message : 'Failed to create response');
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = async () => {
    if (!csvFile || !user?.id) return;
    
    setCsvUploading(true);
    setCsvUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('userId', user.id);
      
      const response = await fetch('/api/import-qa-csv', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      setCsvUploadResult(result);
      
      if (result.success) {
        // Refresh the responses list
        await fetchResponses();
        // Close modal after a delay
        setTimeout(() => {
          setShowCsvModal(false);
          setCsvFile(null);
          setCsvUploadResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      setCsvUploadResult({
        success: false,
        error: 'Failed to upload CSV file'
      });
    } finally {
      setCsvUploading(false);
    }
  };

  // Enhanced search functionality
  const filteredResponses = responses.filter(response => {
    const searchTerm = search.toLowerCase().trim();
    
    if (!searchTerm) return true; // Show all if no search term
    
    // Search in multiple fields
    const matchesQuestion = response.question.toLowerCase().includes(searchTerm);
    const matchesAnswer = response.answer.toLowerCase().includes(searchTerm);
    const matchesCreatedBy = response.createdBy.toLowerCase().includes(searchTerm);
    const matchesTrainingDoc = response.trainingDocTitle?.toLowerCase().includes(searchTerm) || false;
    
    // Also search in training document filename if no title
    const matchesTrainingDocFile = response.trainingDoc ? 
      getFilenameFromPath(response.trainingDoc).toLowerCase().includes(searchTerm) : false;
    
    return matchesQuestion || matchesAnswer || matchesCreatedBy || matchesTrainingDoc || matchesTrainingDocFile;
  });

  // Function to highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ 
          backgroundColor: '#fff3cd', 
          color: '#856404', 
          padding: '1px 2px', 
          borderRadius: '2px',
          fontWeight: 'bold'
        }}>
          {part}
        </mark>
      ) : part
    );
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredResponses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResponses = filteredResponses.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Pagination functions
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, background: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#666' }}>Loading responses...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#fff', minHeight: '100vh' }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Query List</div>
      
      {error && (
        <div style={{ 
          background: '#fee2e2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          {error}
        </div>
      )}
      
      <div style={{ 
        borderRadius: 10, 
        padding: 0, 
        background: '#fff', 
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid #eee' }}>
          <div style={{ flex: 1, marginRight: 16, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch 
                style={{ 
                  position: 'absolute', 
                  left: 12, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#666', 
                  fontSize: 14 
                }} 
              />
              <input
                type="text"
                placeholder="Search questions, answers, creators, or training documents... (Ctrl+K)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px 12px 36px', 
                  borderRadius: 8, 
                  border: '1px solid #ccc', 
                  fontSize: 14,
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#8B0000';
                  e.target.style.boxShadow = '0 0 0 3px rgba(139, 0, 0, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#ccc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Clear search"
                >
                  <FaTimes style={{ fontSize: 12 }} />
                </button>
              )}
            </div>
            {search && (
              <div style={{ 
                marginTop: 4, 
                fontSize: 12, 
                color: '#666',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  {filteredResponses.length} of {responses.length} results
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </span>
                <button
                  onClick={() => setSearch('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8B0000',
                    cursor: 'pointer',
                    fontSize: 12,
                    textDecoration: 'underline'
                  }}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
          {/* <input
            type="text"
            value={dateRange}
            readOnly
            style={{ width: 220, padding: 10, borderRadius: 8, border: '1px solid #ccc', marginRight: 16, background: '#111', color: '#fff', textAlign: 'center', fontWeight: 500 }}
          /> */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={{ background: '#fff', color: '#8B0000', border: '2px solid #8B0000', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowCsvModal(true)}
            >
              <FaFileCsv style={{ marginRight: 8, fontSize: 16 }} />
              Import CSV
            </button>
            <button
              style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center' }}
              onClick={() => setShowModal(true)}
            >
              <span style={{ fontSize: 22, marginRight: 8 }}>+</span> Add Query
            </button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', color: '#888', fontWeight: 700, fontSize: 15 }}>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>#</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>CREATED BY</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>QUESTION</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>ANSWER</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>TRAINING DOCUMENTS</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}>DATE SUBMITTED</th>
              <th style={{ padding: 12, borderBottom: '1px solid #ddd' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedResponses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  {search ? 'No responses found matching your search.' : 'No responses available.'}
                </td>
              </tr>
            ) : (
              paginatedResponses.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee', background: '#fff' }}>
                  <td style={{ textAlign: 'center', padding: 10 }}>{idx + 1}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    {highlightSearchTerm(r.createdBy, search)}
                  </td>
                  <td style={{ padding: 10 }}>
                    {highlightSearchTerm(r.question, search)}
                  </td>
                  <td style={{ padding: 10 }}>
                    {highlightSearchTerm(r.answer, search)}
                  </td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    {r.trainingDoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span style={{ color: '#8B0000', fontSize: 14 }}>
                          {r.trainingDocTitle || getFilenameFromPath(r.trainingDoc)}
                        </span>
                        <button
                          onClick={() => {
                            setPreviewUrl(r.trainingDoc);
                            setShowPreviewModal(true);
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: '#8B0000', 
                            fontSize: 16,
                            padding: 4,
                            borderRadius: 4,
                            transition: 'background-color 0.2s'
                          }}
                          title="View document"
                          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                          onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <FaEye />
                        </button>
                        <a
                          href={r.trainingDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#8B0000', 
                            fontSize: 16,
                            padding: 4,
                            borderRadius: 4,
                            textDecoration: 'none',
                            transition: 'background-color 0.2s'
                          }}
                          title="Open in new tab"
                          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                          onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          ↗
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: '#666', fontSize: 14 }}>No document</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{r.date}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    <button 
                      style={{ background: 'none', border: 'none', marginRight: 8, cursor: 'pointer', color: '#b91c1c', fontSize: 18 }} 
                      title="Edit"
                      onClick={() => handleEdit(r)}
                    >
                      <FaPen />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 18 }} 
                      title="Delete"
                      onClick={() => handleDelete(r)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 24px', 
            borderTop: '1px solid #eee',
            background: '#f9fafb'
          }}>
            {/* Page Info */}
            <div style={{ fontSize: 14, color: '#666' }}>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredResponses.length)} of {filteredResponses.length} results
            </div>
            
            {/* Pagination Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Previous Button */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#f3f4f6' : '#fff',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseOut={e => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  const shouldShow = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  if (!shouldShow) {
                    // Show ellipsis if there's a gap
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={`ellipsis-${page}`} style={{ padding: '8px 12px', color: '#9ca3af' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      style={{
                        background: page === currentPage ? '#8B0000' : '#fff',
                        color: page === currentPage ? '#fff' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 14,
                        fontWeight: page === currentPage ? 600 : 500,
                        cursor: 'pointer',
                        minWidth: 40,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => {
                        if (page !== currentPage) {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseOut={e => {
                        if (page !== currentPage) {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              {/* Next Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseOut={e => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pop-up for Add Query */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 540, maxWidth: '95vw', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', padding: 0, overflowY: 'auto', position: 'relative' }}>
            {/* X Icon at top right */}
            <button
              onClick={() => {
                setShowModal(false);
                setQuestion('');
                setAnswer('');
                setTrainingDoc(null);
                setUploadedTrainingDocUrl(null);
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                fontSize: 28,
                color: '#b91c1c',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            >
              ×
            </button>
            {/* Guidelines */}
            <div style={{ background: '#f3f4f6', borderRadius: 16, margin: '48px 24px 0 24px', padding: 20, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Guidelines</div>
              <ul style={{ color: '#444', fontSize: 15, marginBottom: 16, paddingLeft: 18 }}>
                <li style={{ marginBottom: 8 }}>Ensuring clarity in both questions and answers helps improve the chatbot's overall efficiency, making interactions smoother and more user-friendly for everyone.</li>
                <li style={{ marginBottom: 8 }}>Providing brief yet informative responses allows users to get the necessary details without unnecessary complexity, making navigation much easier.</li>
                <li style={{ marginBottom: 8 }}>Organizing questions into relevant categories ensures a seamless experience, allowing users to find information quickly and reducing frustration in searching.</li>
                <li style={{ marginBottom: 8 }}>Regularly reviewing and updating chatbot responses helps maintain accuracy, ensuring users always receive the most current and reliable information available.</li>
              </ul>
              <div style={{ background: '#e0e0e0', borderRadius: 10, padding: 10, fontSize: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Example entries</div>
                <div style={{ marginBottom: 4 }}><b>Question</b><br/>"What are the enrollment requirements?"</div>
                <div style={{ marginBottom: 4 }}><b>Answer</b><br/>You need a birth certificate, report card, good moral certificate, and a 2x2 ID picture.</div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ccc', fontSize: 12, color: '#666' }}>
                  <b>Note:</b> You can upload just a PDF document without providing question/answer text. However, if no PDF is uploaded, both question and answer are required.
                </div>
              </div>
            </div>
            {/* Form */}
            <form style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '0 24px 24px 24px' }} onSubmit={handleSubmit}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Example Question {trainingDoc ? <span style={{ color: '#666', fontWeight: 400, fontSize: 14 }}>(Optional when PDF is uploaded)</span> : <span style={{ color: '#dc2626', fontWeight: 400, fontSize: 14 }}>(Required)</span>}
                </div>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder={trainingDoc ? "Enter sample question here... (optional)" : "Enter sample question here... (required)"}
                  maxLength={255}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{question.length}/255</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Example Answer {trainingDoc ? <span style={{ color: '#666', fontWeight: 400, fontSize: 14 }}>(Optional when PDF is uploaded)</span> : <span style={{ color: '#dc2626', fontWeight: 400, fontSize: 14 }}>(Required)</span>}
                </div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder={trainingDoc ? "Enter sample answer here... (optional)" : "Enter sample answer here... (required)"}
                  maxLength={255}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{answer.length}/255</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Training Document (PDF)</div>
                <label style={{ display: 'inline-block', background: '#8B0000', color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                  Upload PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
                {trainingDoc && (
                  <span style={{ marginLeft: 12, color: '#333', fontSize: 14 }}>{trainingDoc.name}</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setQuestion('');
                    setAnswer('');
                    setTrainingDoc(null);
                    setUploadedTrainingDocUrl(null);
                  }}
                  style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 20, marginRight: 8 }}>✕</span> Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  <FaCheck style={{ fontSize: 18, marginRight: 8 }} /> Save Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Pop-up */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 540, maxWidth: '95vw', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', padding: 0, overflowY: 'auto', position: 'relative' }}>
            {/* X Icon at top right */}
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingResponse(null);
                setQuestion('');
                setAnswer('');
                setTrainingDoc(null);
                setUploadedTrainingDocUrl(null); // Reset the uploaded file URL
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                fontSize: 28,
                color: '#b91c1c',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            >
              ×
            </button>
            {/* Header */}
            <div style={{ background: '#f3f4f6', borderRadius: 16, margin: '48px 24px 0 24px', padding: 20, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Edit Response</div>
              <div style={{ color: '#666', fontSize: 14 }}>Update the question and answer for this chatbot response</div>
            </div>
            {/* Form */}
            <form style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '0 24px 24px 24px' }} onSubmit={e => { e.preventDefault(); saveEdit(); }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Question</div>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Enter sample question here..."
                  maxLength={255}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{question.length}/255</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Answer</div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Enter sample answer here..."
                  maxLength={255}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{answer.length}/255</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Training Document (PDF)</div>
                <label style={{ display: 'inline-block', background: '#8B0000', color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                  Upload PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
                {trainingDoc && (
                  <span style={{ marginLeft: 12, color: '#333', fontSize: 14 }}>{trainingDoc.name}</span>
                )}
                {editingResponse?.trainingDoc && !trainingDoc && (
                  <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>Current: {editingResponse.trainingDoc}</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingResponse(null);
                    setQuestion('');
                    setAnswer('');
                    setTrainingDoc(null);
                    setUploadedTrainingDocUrl(null); // Reset the uploaded file URL
                  }}
                  style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 20, marginRight: 8 }}>✕</span> Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  <FaCheck style={{ fontSize: 18, marginRight: 8 }} /> Update Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 24, position: 'relative' }}>
            {/* X Icon at top right */}
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingResponse(null);
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                fontSize: 20,
                color: '#666',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            >
              ×
            </button>
            
            {/* Warning Icon */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: '#fee2e2', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px auto' 
              }}>
                <FaTrash style={{ fontSize: 24, color: '#dc2626' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#dc2626' }}>Delete Response</div>
              <div style={{ color: '#666', fontSize: 14, lineHeight: 1.5 }}>
                Are you sure you want to delete this response? This action cannot be undone.
              </div>
            </div>

            {/* Response Preview */}
            {deletingResponse && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Response to be deleted:</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                  <strong>Q:</strong> {deletingResponse.question}
                </div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  <strong>A:</strong> {deletingResponse.answer}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingResponse(null);
                }}
                style={{ 
                  background: '#f3f4f6', 
                  color: '#374151', 
                  border: '1px solid #d1d5db', 
                  borderRadius: 8, 
                  padding: '10px 20px', 
                  fontWeight: 600, 
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#e5e7eb')}
                onMouseOut={e => (e.currentTarget.style.background = '#f3f4f6')}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ 
                  background: '#dc2626', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '10px 20px', 
                  fontWeight: 600, 
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#b91c1c')}
                onMouseOut={e => (e.currentTarget.style.background = '#dc2626')}
              >
                Delete Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreviewModal && previewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90vw', height: '90vh', maxWidth: '1200px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#374151' }}>
                Document Preview: {getFilenameFromPath(previewUrl)}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    background: '#8B0000', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 8, 
                    padding: '8px 16px', 
                    fontWeight: 600, 
                    fontSize: 14,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#6B0000')}
                  onMouseOut={e => (e.currentTarget.style.background = '#8B0000')}
                >
                  Open in New Tab
                </a>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewUrl(null);
                  }}
                  aria-label="Close"
                  style={{
                    width: 40,
                    height: 40,
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '50%',
                    fontSize: 20,
                    color: '#666',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Document Content */}
            <div style={{ flex: 1, padding: '0 24px 24px 24px', overflow: 'hidden' }}>
              <iframe
                src={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  backgroundColor: '#f9fafb'
                }}
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, maxWidth: '95vw', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', padding: 0, overflowY: 'auto', position: 'relative' }}>
            {/* X Icon at top right */}
            <button
              onClick={() => {
                setShowCsvModal(false);
                setCsvFile(null);
                setCsvUploadResult(null);
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                fontSize: 28,
                color: '#b91c1c',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ background: '#f3f4f6', borderRadius: 16, margin: '48px 24px 0 24px', padding: 20, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Import Q&A from CSV</div>
              <div style={{ color: '#666', fontSize: 14 }}>Upload a CSV file with questions and answers to bulk import training data</div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Instructions */}
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#0369a1' }}>CSV Format Requirements:</div>
                <ul style={{ color: '#0c4a6e', fontSize: 14, margin: 0, paddingLeft: 20 }}>
                  <li>First row must contain headers: <code>question,answer</code></li>
                  <li>Each subsequent row should contain one Q&A pair</li>
                  <li>Questions and answers should be in quotes if they contain commas</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>

              {/* File Upload */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Select CSV File</div>
                <label style={{ display: 'inline-block', background: '#8B0000', color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                  Choose CSV File
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  />
                </label>
                {csvFile && (
                  <span style={{ marginLeft: 12, color: '#333', fontSize: 14 }}>{csvFile.name}</span>
                )}
              </div>

              {/* Download Template */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Need a Template?</div>
                <a
                  href="/templates/qa_import_template.csv"
                  download
                  style={{ 
                    display: 'inline-block',
                    background: '#10b981', 
                    color: '#fff', 
                    borderRadius: 8, 
                    padding: '8px 18px', 
                    fontWeight: 600, 
                    fontSize: 15, 
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  📥 Download Template
                </a>
              </div>

              {/* Upload Result */}
              {csvUploadResult && (
                <div style={{ 
                  background: csvUploadResult.success ? '#f0fdf4' : '#fef2f2', 
                  border: `1px solid ${csvUploadResult.success ? '#bbf7d0' : '#fecaca'}`, 
                  color: csvUploadResult.success ? '#166534' : '#dc2626', 
                  padding: 12, 
                  borderRadius: 8, 
                  marginBottom: 20 
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {csvUploadResult.success ? '✅ Import Successful' : '❌ Import Failed'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {csvUploadResult.message || csvUploadResult.error}
                  </div>
                  {csvUploadResult.results && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Total: {csvUploadResult.results.total} | 
                      Successful: {csvUploadResult.results.successful} | 
                      Failed: {csvUploadResult.results.failed}
                    </div>
                  )}
                  {csvUploadResult.results?.errors?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>Errors:</div>
                      {csvUploadResult.results.errors.slice(0, 3).map((error: string, index: number) => (
                        <div key={index}>• {error}</div>
                      ))}
                      {csvUploadResult.results.errors.length > 3 && (
                        <div>... and {csvUploadResult.results.errors.length - 3} more errors</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvUploadResult(null);
                  }}
                  style={{ 
                    background: '#f3f4f6', 
                    color: '#374151', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 8, 
                    padding: '10px 20px', 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || csvUploading}
                  style={{ 
                    background: !csvFile || csvUploading ? '#e5e7eb' : '#8B0000', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 8, 
                    padding: '10px 20px', 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: !csvFile || csvUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {csvUploading ? 'Uploading...' : 'Import CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatbot;
