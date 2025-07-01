import React, { useState, useRef, useEffect } from 'react';

const BOT_AVATAR = '/sjsfilogo.png'; // Adjust path if needed

const initialMessages = [
  {
    sender: 'bot',
    text: 'Hello! How can I help you today? :)',
  },
];

const ChatbotFaculty = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((msgs) => [
      ...msgs,
      { sender: 'user', text: input },
    ]);
    // Simulate bot response
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        {
          sender: 'bot',
          text: "I see. Could you explain what the issue is? I'll do my best to help and ensure it gets resolved with ease!",
        },
      ]);
    }, 1000);
    setInput('');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ background: '#8B0000', color: '#fff', padding: '1rem', fontWeight: 'bold', fontSize: '1.5rem' }}>
        SJSFI HRbot
      </div>
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: '#f9f9f9' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            {msg.sender === 'bot' && (
              <img
                src={BOT_AVATAR}
                alt="avatar"
                style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 1rem 0 0', background: '#fff', border: '1px solid #eee' }}
              />
            )}
            <div
              style={{
                background: msg.sender === 'user' ? '#e0e0e0' : '#fff',
                color: '#222',
                borderRadius: 20,
                padding: '1rem 1.5rem',
                maxWidth: '60%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                fontSize: '1.1rem',
                textAlign: 'left',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', padding: '1rem', background: '#eee', alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a question..."
          style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: 20, border: '1px solid #ccc', fontSize: '1rem', outline: 'none' }}
        />
        <button
          type="submit"
          style={{ marginLeft: '1rem', background: '#8B0000', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24 }}
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatbotFaculty;