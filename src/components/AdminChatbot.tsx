import React, { useState } from 'react';
import { FaCheck, FaPen, FaTrash } from 'react-icons/fa';

const mockResponses = [
  { id: 1, createdBy: 'Admin1', question: 'Hello', answer: 'Hello!', date: '03-24-2025', trainingDoc: null },
  { id: 2, createdBy: 'Admin1', question: 'Sample', answer: 'Sample Text', date: '03-02-2025', trainingDoc: null },
  { id: 3, createdBy: 'Admin1', question: 'Thanks!', answer: "You're welcome!", date: '02-28-2025', trainingDoc: null },
  { id: 4, createdBy: 'Admin1', question: 'Help?', answer: 'How can I help?', date: '02-15-2025', trainingDoc: null },
];

const AdminChatbot = () => {
  const [showModal, setShowModal] = useState(false);
  const [responses, setResponses] = useState(mockResponses);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('2025-02-01–2025-03-20');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [trainingDoc, setTrainingDoc] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTrainingDoc(e.target.files[0]);
    }
  };

  return (
    <div style={{ padding: 24, background: '#fff', minHeight: '100vh' }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Response List</div>
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
            {responses.map((r, idx) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee', background: '#fff' }}>
                <td style={{ textAlign: 'center', padding: 10 }}>{idx + 1}</td>
                <td style={{ textAlign: 'center', padding: 10 }}>{r.createdBy}</td>
                <td style={{ padding: 10 }}>{r.question}</td>
                <td style={{ padding: 10 }}>{r.answer}</td>
                <td style={{ textAlign: 'center', padding: 10 }}>
                  {r.trainingDoc ? r.trainingDoc : 'none'}
                </td>
                <td style={{ textAlign: 'center', padding: 10 }}>{r.date}</td>
                <td style={{ textAlign: 'center', padding: 10 }}>
                  <button style={{ background: 'none', border: 'none', marginRight: 8, cursor: 'pointer', color: '#b91c1c', fontSize: 18 }} title="Edit">
                    <FaPen />
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 18 }} title="Delete">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Pop-up for Add Query */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 540, maxWidth: '95vw', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', padding: 0, overflowY: 'auto', position: 'relative' }}>
            {/* X Icon at top right */}
            <button
              onClick={() => setShowModal(false)}
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
                <div><b>Answer</b><br/>You need a birth certificate, report card, good moral certificate, and a 2x2 ID picture.</div>
              </div>
            </div>
            {/* Form */}
            <form style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '0 24px 24px 24px' }} onSubmit={e => { e.preventDefault(); setShowModal(false); }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Example Question</div>
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
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Example Answer</div>
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
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 20, marginRight: 8 }}>✕</span> Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center' }}
                >
                  {/* Save icon */}
                  <FaCheck style={{ fontSize: 18, marginRight: 8 }} /> Save Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatbot;
