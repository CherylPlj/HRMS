"use client";
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  isVisible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  suggestedPrompts: string[];
  title?: string;
  userRole?: 'admin' | 'faculty' | 'employee';
}

export default function Chatbot({
  isVisible,
  onClose,
  position,
  onPositionChange,
  suggestedPrompts,
  title = "SJSFI Assistant",
  userRole
}: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isQuickQuestionsExpanded, setIsQuickQuestionsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  // Add welcome message on first open
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      setMessages([{
        type: 'ai',
        content: "Hello! I'm your SJSFI HRMS assistant. How can I help you today?",
        timestamp: new Date()
      }]);
    }
  }, [isVisible, messages.length]);

  const handleDragStart = (e: React.MouseEvent) => {
    const chatbot = chatbotRef.current;
    if (!chatbot) return;

    const offsetX = e.clientX - chatbot.getBoundingClientRect().left;
    const offsetY = e.clientY - chatbot.getBoundingClientRect().top;

    const handleDrag = (moveEvent: MouseEvent) => {
      onPositionChange({
        x: moveEvent.clientX - offsetX,
        y: moveEvent.clientY - offsetY,
      });
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim(), userRole }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || `HTTP error! status: ${response.status}`);
      }

      // Simulate typing delay for better UX
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000);

    } catch (error: unknown) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        const errorMessage: ChatMessage = {
          type: 'ai',
          content: `I apologize, but I'm having trouble processing your request right now. Please try again in a moment.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={chatbotRef}
      className="fixed bg-white shadow-2xl rounded-2xl z-50 border border-gray-200 overflow-hidden"
      style={{
        width: 380,
        height: 600,
        top: position.y,
        left: position.x,
      }}
    >
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-[#800000] to-[#660000] text-white flex items-center justify-between cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-white text-opacity-80">
              {isTyping ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
          title="Close chat"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex flex-col h-[calc(100%-140px)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-[#800000] to-[#660000] text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-line">{message.content}</div>
                <div
                  className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-white text-opacity-70' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">Typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <div className="bg-white border-t border-gray-200">
            <button
              onClick={() => setIsQuickQuestionsExpanded(!isQuickQuestionsExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h4 className="text-sm font-semibold text-gray-700">Quick questions:</h4>
              {isQuickQuestionsExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {isQuickQuestionsExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="w-full text-left text-sm text-gray-600 hover:text-[#800000] hover:bg-gray-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-3 py-2 bg-gradient-to-r from-[#800000] to-[#660000] text-white rounded-full hover:from-[#660000] hover:to-[#800000] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i className="fas fa-paper-plane text-sm"></i>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 