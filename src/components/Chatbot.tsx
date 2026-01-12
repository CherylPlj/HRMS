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
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    // Disable dragging on mobile devices
    if (isMobile) return;
    
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

    // Rate limiting: prevent rapid successive requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTimeRef.current = Date.now();

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
        // Handle 429 (quota exceeded) errors with specific message
        if (response.status === 429) {
          throw new Error('QUOTA_EXCEEDED');
        }
        throw new Error(data.details || data.error || `HTTP error! status: ${response.status}`);
      }

      // Simulate typing delay for better UX
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          type: 'ai',
          content: data.response || data.error || 'I received your message, but I\'m having trouble responding right now.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000);

    } catch (error: unknown) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        let errorContent = `I apologize, but I'm having trouble processing your request right now. Please try again in a moment.`;
        
        if (error instanceof Error) {
          if (error.message === 'QUOTA_EXCEEDED') {
            errorContent = `I'm currently unavailable due to service limits. Please try again later or contact support for assistance.`;
          } else if (error.message.includes('quota') || error.message.includes('429')) {
            errorContent = `The AI service is temporarily unavailable. Please try again in a few minutes.`;
          }
        }
        
        const errorMessage: ChatMessage = {
          type: 'ai',
          content: errorContent,
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

  // Calculate responsive dimensions and position
  const chatbotWidth = isMobile ? '100vw' : 380;
  const chatbotHeight = isMobile ? '100vh' : 600;
  const chatbotTop = isMobile ? 0 : position.y;
  const chatbotLeft = isMobile ? 0 : position.x;

  return (
    <div
      ref={chatbotRef}
      className={`fixed bg-white shadow-2xl z-50 border border-gray-200 overflow-hidden ${
        isMobile ? 'rounded-none' : 'rounded-2xl'
      }`}
      style={{
        width: chatbotWidth,
        height: chatbotHeight,
        top: chatbotTop,
        left: chatbotLeft,
        maxWidth: isMobile ? '100%' : 'none',
        maxHeight: isMobile ? '100%' : 'none',
      }}
    >
      {/* Header */}
      <div
        className={`p-3 md:p-4 bg-gradient-to-r from-[#800000] to-[#660000] text-white flex items-center justify-between ${
          isMobile ? 'cursor-default' : 'cursor-move'
        }`}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-robot text-white text-sm md:text-base"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-semibold truncate">{title}</h3>
            <p className="text-xs text-white text-opacity-80">
              {isTyping ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors p-1 md:p-2 rounded-full hover:bg-white hover:bg-opacity-20 flex-shrink-0"
          title="Close chat"
        >
          <i className="fas fa-times text-lg md:text-xl"></i>
        </button>
      </div>

      {/* Messages Container */}
      <div className={`flex flex-col ${isMobile ? 'h-[calc(100%-120px)]' : 'h-[calc(100%-140px)]'}`}>
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${isMobile ? 'max-w-[85%]' : 'max-w-[80%]'} rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-[#800000] to-[#660000] text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <div className="text-xs md:text-sm leading-relaxed whitespace-pre-line break-words">{message.content}</div>
                <div
                  className={`text-[10px] md:text-xs mt-1 md:mt-2 ${
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
              <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500">Typing...</span>
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
              className="w-full p-3 md:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h4 className="text-xs md:text-sm font-semibold text-gray-700">Quick questions:</h4>
              {isQuickQuestionsExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {isQuickQuestionsExpanded && (
              <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="w-full text-left text-xs md:text-sm text-gray-600 hover:text-[#800000] hover:bg-gray-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed break-words"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 md:p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 md:py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-r from-[#800000] to-[#660000] text-white rounded-full hover:from-[#660000] hover:to-[#800000] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              title="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i className="fas fa-paper-plane text-xs md:text-sm"></i>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 