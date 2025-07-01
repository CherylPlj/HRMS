"use client"
import React, { useState, useEffect } from 'react';

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

const ChatbotFacultyThreads: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  // Fetch topics on mount
  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    setLoadingTopics(true);
    const res = await fetch(`/api/chatbot/topics?userId=${USER_ID}`);
    const data = await res.json();
    setTopics(data.topics || []);
    setLoadingTopics(false);
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
  }

  async function handleNewTopic() {
    if (!newTopicTitle.trim()) return;
    setCreatingTopic(true);
    const res = await fetch('/api/chatbot/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, title: newTopicTitle.trim() })
    });
    const data = await res.json();
    setNewTopicTitle('');
    setCreatingTopic(false);
    if (data.topic) {
      setTopics([data.topic, ...topics]);
      setSelectedTopic(data.topic);
      setMessages([]);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: '#fff', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem 1rem 1rem 1rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '1.2rem', color: '#8B0000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Topics
          <button
            style={{ background: '#8B0000', color: '#fff', border: 'none', borderRadius: 16, padding: '0.3rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}
            onClick={handleNewTopic}
            disabled={creatingTopic || !newTopicTitle.trim()}
          >
            New Chat
          </button>
        </div>
        <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
          <input
            type="text"
            placeholder="New topic title..."
            value={newTopicTitle}
            onChange={e => setNewTopicTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #ccc', fontSize: '1rem' }}
            disabled={creatingTopic}
            onKeyDown={e => { if (e.key === 'Enter') handleNewTopic(); }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingTopics ? (
            <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Loading topics...</div>
          ) : (
            topics.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No topics yet.</div>
            ) : (
              topics.map(topic => (
                <div
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    background: selectedTopic?.id === topic.id ? '#f3eaea' : 'transparent',
                    borderLeft: selectedTopic?.id === topic.id ? '4px solid #8B0000' : '4px solid transparent',
                    fontWeight: selectedTopic?.id === topic.id ? 600 : 400,
                    color: selectedTopic?.id === topic.id ? '#8B0000' : '#333',
                    borderBottom: '1px solid #f2f2f2',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {topic.title}
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>{new Date(topic.updatedAt).toLocaleString()}</div>
                </div>
              ))
            )
          )}
        </div>
      </div>
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
                    <div style={{ background: msg.sender === 'user' ? '#8B0000' : '#fff', color: msg.sender === 'user' ? '#fff' : '#333', borderRadius: 18, padding: '1rem 1.25rem', maxWidth: '60%', boxShadow: msg.sender === 'user' ? '0 2px 8px rgba(139, 0, 0, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)', fontSize: '1rem', lineHeight: '1.5', wordWrap: 'break-word', whiteSpace: 'pre-line', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', marginLeft: msg.sender === 'user' ? 'auto' : '0', marginRight: msg.sender === 'user' ? '0' : 'auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                ))
              )
            ) : (
              <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Select a topic to view messages.</div>
            )
          )}
        </div>
        {/* Message input will be added in the next step */}
      </div>
    </div>
  );
};

export default ChatbotFacultyThreads;
