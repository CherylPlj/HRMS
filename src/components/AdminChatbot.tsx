import React, { useState, useEffect } from 'react';
import { FaCheck, FaPen, FaTrash } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';

interface ChatbotResponse {
  id: number;
  createdBy: string;
  question: string;
  answer: string;
  date: string;
  trainingDoc: string | null;
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

  // Filter responses based on search
  const filteredResponses = responses.filter(response =>
    response.question.toLowerCase().includes(search.toLowerCase()) ||
    response.answer.toLowerCase().includes(search.toLowerCase()) ||
    response.createdBy.toLowerCase().includes(search.toLowerCase())
  );

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
          <input
            type="text"
            placeholder="Search queries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc', marginRight: 16 }}
          />
          <input
            type="text"
            value={dateRange}
            readOnly
            style={{ width: 220, padding: 10, borderRadius: 8, border: '1px solid #ccc', marginRight: 16, background: '#111', color: '#fff', textAlign: 'center', fontWeight: 500 }}
          />
          <button
            style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center' }}
            onClick={() => setShowModal(true)}
          >
            <span style={{ fontSize: 22, marginRight: 8 }}>+</span> Add Query
          </button>
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
            {filteredResponses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  {search ? 'No responses found matching your search.' : 'No responses available.'}
                </td>
              </tr>
            ) : (
              filteredResponses.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee', background: '#fff' }}>
                  <td style={{ textAlign: 'center', padding: 10 }}>{idx + 1}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{r.createdBy}</td>
                  <td style={{ padding: 10 }}>{r.question}</td>
                  <td style={{ padding: 10 }}>{r.answer}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    {getFilenameFromPath(r.trainingDoc || '')}
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
    </div>
  );
};

export default AdminChatbot;
