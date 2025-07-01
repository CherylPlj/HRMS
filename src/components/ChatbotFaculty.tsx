"use client"
import React, { useState, useEffect, useRef } from 'react';

interface Topic {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const USER_ID = 'demo-user-1'; // Replace with real user ID from auth
const BOT_AVATAR = '/sjsfilogo.png';

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const ChatbotFaculty: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchTopics(); }, []);
  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchTopics() {
    setLoadingTopics(true);
    const res = await fetch(`/api/chatbot/topics?userId=${USER_ID}`);
    const data = await res.json();
    setTopics(data.topics || []);
    setLoadingTopics(false);
    // Auto-select the most recent topic if none selected
    if (!selectedTopic && data.topics && data.topics.length > 0) {
      handleSelectTopic(data.topics[0]);
    }
  }

  async function fetchMessages(topicId: string) {
    setLoadingMessages(true);
    const res = await fetch(`/api/chatbot/topics/${topicId}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setLoadingMessages(false);
  }

  async function handleSelectTopic(topic: Topic) {
    setSelectedTopic(topic);
    await fetchMessages(topic.id);
    setShowHistory(false);
  }

  async function handleNewTopic() {
    setCreatingTopic(true);
    // Create topic with temporary title first
    const now = new Date();
    const tempTitle = `Chat – ${now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`;
    const res = await fetch('/api/chatbot/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, title: tempTitle })
    });
    const data = await res.json();
    setCreatingTopic(false);
    if (data.topic) {
      setTopics([data.topic, ...topics]);
      setSelectedTopic(data.topic);
      setMessages([
        {
          id: `bot-greeting-${Date.now()}`,
          sender: 'bot',
          text: "Hello! I'm your HR assistant. How can I help you today with any questions about leave policies, attendance, benefits, or other HR matters?",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!confirm('Are you sure you want to delete this chat topic? This action cannot be undone.')) {
      return;
    }
    
    setDeletingTopic(topicId);
    try {
      const res = await fetch(`/api/chatbot/topics?userId=${USER_ID}&topicId=${topicId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Remove from topics list
        setTopics(prevTopics => prevTopics.filter(topic => topic.id !== topicId));
        
        // If this was the selected topic, clear it
        if (selectedTopic?.id === topicId) {
          setSelectedTopic(null);
          setMessages([]);
        }
      } else {
        alert('Failed to delete topic. Please try again.');
      }
    } catch (err) {
      alert('Failed to delete topic. Please try again.');
    } finally {
      setDeletingTopic(null);
    }
  }

  // Send message in the context of the selected topic
  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || !selectedTopic || isLoading) return;
    setIsLoading(true);
    const userText = input.trim();
    setInput('');
    
    // Check if this is the first user message (after greeting)
    const isFirstUserMessage = messages.length === 1 && messages[0].sender === 'bot';
    
    // Optimistically add user message
    setMessages(msgs => [
      ...msgs,
      { id: `user-${Date.now()}`, sender: 'user', text: userText, timestamp: new Date().toISOString() }
    ]);
    
    try {
      const res = await fetch(`/api/chatbot/topics/${selectedTopic.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: USER_ID, 
          text: userText,
          isFirstMessage: isFirstUserMessage 
        })
      });
      const data = await res.json();
      if (data.botMessage) {
        setMessages(msgs => [...msgs, data.botMessage]);
      }
      
      // Update topic title if this was the first message and we got a new title
      if (isFirstUserMessage && data.updatedTopic) {
        setTopics(prevTopics => 
          prevTopics.map(topic => 
            topic.id === selectedTopic.id 
              ? { ...topic, title: data.updatedTopic.title }
              : topic
          )
        );
        setSelectedTopic(prev => prev ? { ...prev, title: data.updatedTopic.title } : null);
      }
    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        { id: `bot-error-${Date.now()}`, sender: 'bot', text: 'Sorry, there was an error processing your request.', timestamp: new Date().toISOString() }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#8B0000', color: '#fff', padding: '1.5rem', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={BOT_AVATAR} alt="HR Bot" style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff' }} />
          SJSFI HRbot
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleNewTopic}
            style={{ background: '#fff', color: '#8B0000', border: 'none', borderRadius: 20, padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', outline: 'none' }}
            disabled={creatingTopic}
          >
            New Chat
          </button>
          <button
            onClick={() => setShowHistory(true)}
            style={{ background: '#fff', color: '#8B0000', border: 'none', borderRadius: 20, padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', outline: 'none' }}
          >
            Chat History
          </button>
        </div>
      </div>

      {/* Chat History Side Panel (shows topics) */}
      {showHistory && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '350px', height: '100vh', background: '#fff', boxShadow: '-2px 0 16px rgba(0,0,0,0.12)', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s' }}>
          <div style={{ padding: '1.25rem', background: '#8B0000', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            Chat Topics
            <button
              onClick={() => setShowHistory(false)}
              style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginLeft: '1rem' }}
              aria-label="Close chat history"
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#f8f9fa' }}>
            {loadingTopics ? (
              <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Loading topics...</div>
            ) : (
              topics.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No topics yet.</div>
              ) : (
                                topics.map(topic => (
                  <div
                    key={topic.id}
                    style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: selectedTopic?.id === topic.id ? '#f3eaea' : '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderLeft: selectedTopic?.id === topic.id ? '4px solid #8B0000' : '4px solid #eee', fontWeight: selectedTopic?.id === topic.id ? 600 : 400, color: selectedTopic?.id === topic.id ? '#8B0000' : '#333', borderBottom: '1px solid #f2f2f2', transition: 'background 0.2s, color 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div 
                      onClick={() => handleSelectTopic(topic)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      {topic.title}
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>{formatTimestamp(topic.updatedAt)}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(topic.id);
                      }}
                      disabled={deletingTopic === topic.id}
                      style={{ 
                        background: 'transparent', 
                        color: '#ff4444', 
                        border: 'none', 
                        borderRadius: '50%', 
                        width: 24, 
                        height: 24, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: deletingTopic === topic.id ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        opacity: deletingTopic === topic.id ? 0.5 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      title="Delete topic"
                    >
                      {deletingTopic === topic.id ? '⏳' : '×'}
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* Main Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '1.3rem', color: '#8B0000' }}>
          {selectedTopic ? selectedTopic.title : 'Select or start a chat topic'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {loadingMessages ? (
            <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Loading messages...</div>
          ) : (
            selectedTopic ? (
              messages.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No messages yet.</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {msg.sender === 'bot' && (
                      <img src={BOT_AVATAR} alt="HR Assistant" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '2px solid #8B0000', flexShrink: 0 }} />
                    )}
                    <div style={{ background: msg.sender === 'user' ? '#8B0000' : '#fff', color: msg.sender === 'user' ? '#fff' : '#333', borderRadius: 18, padding: '1rem 1.25rem', maxWidth: '60%', boxShadow: msg.sender === 'user' ? '0 2px 8px rgba(139, 0, 0, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)', fontSize: '1rem', lineHeight: '1.5', wordWrap: 'break-word', whiteSpace: 'pre-line', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{msg.text}</div>
                    {msg.sender === 'user' && (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>U</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', marginLeft: msg.sender === 'user' ? 'auto' : '0', marginRight: msg.sender === 'user' ? '0' : 'auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{formatTimestamp(msg.timestamp)}</div>
                  </div>
                ))
              )
            ) : (
              <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Select a topic to view messages.</div>
            )
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Message input */}
        <form onSubmit={handleSend} style={{ display: 'flex', padding: '1.25rem', background: '#fff', borderTop: '1px solid #e9ecef', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || !selectedTopic}
            style={{ flex: 1, padding: '0.875rem 1.25rem', borderRadius: 25, border: '2px solid #e9ecef', fontSize: '1rem', outline: 'none', opacity: isLoading ? 0.6 : 1, transition: 'border-color 0.2s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            ref={inputRef}
            onFocus={e => { e.target.style.borderColor = '#8B0000'; }}
            onBlur={e => { e.target.style.borderColor = '#e9ecef'; }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !selectedTopic}
            style={{ background: isLoading || !input.trim() || !selectedTopic ? '#e9ecef' : '#8B0000', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isLoading || !input.trim() || !selectedTopic ? 'not-allowed' : 'pointer', fontSize: 20, transition: 'all 0.2s ease', boxShadow: isLoading || !input.trim() || !selectedTopic ? 'none' : '0 2px 8px rgba(139, 0, 0, 0.2)' }}
            onMouseEnter={e => { if (!isLoading && input.trim() && selectedTopic) { e.currentTarget.style.transform = 'scale(1.05)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
        <style jsx>{`
          @keyframes slideIn {
            from { right: -400px; opacity: 0; }
            to { right: 0; opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ChatbotFaculty;