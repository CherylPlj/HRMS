import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Temporary in-memory storage for messages (shared with topic route)
declare global {
  var tempMessages: Map<string, any[]>;
  var tempTopics: Map<string, any[]>;
}

if (!global.tempMessages) {
  global.tempMessages = new Map();
}

if (!global.tempTopics) {
  global.tempTopics = new Map();
}

// Function to generate topic title from user message
function generateTopicTitle(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Keywords mapping
  const keywords = {
    'attendance': 'Attendance',
    'time in': 'Time In/Out',
    'time out': 'Time In/Out',
    'clock in': 'Time In/Out',
    'clock out': 'Time In/Out',
    'leave': 'Leave Request',
    'vacation': 'Leave Request',
    'sick': 'Sick Leave',
    'medical': 'Medical Leave',
    'maternity': 'Maternity Leave',
    'paternity': 'Paternity Leave',
    'emergency': 'Emergency Leave',
    'documents': 'Documents',
    'upload': 'Document Upload',
    'certificate': 'Certificates',
    'personal': 'Personal Data',
    'profile': 'Personal Data',
    'schedule': 'Schedule',
    'work schedule': 'Work Schedule',
    'benefits': 'Benefits',
    'salary': 'Salary',
    'payroll': 'Payroll',
    'contract': 'Contract',
    'employment': 'Employment',
    'training': 'Training',
    'education': 'Education',
    'family': 'Family Information',
    'emergency contact': 'Emergency Contact',
    'health': 'Health Information',
    'medical info': 'Medical Information'
  };
  
  // Check for exact matches first
  for (const [key, title] of Object.entries(keywords)) {
    if (lowerMessage.includes(key)) {
      return title;
    }
  }
  
  // If no specific keyword found, extract first few words
  const words = message.trim().split(/\s+/).slice(0, 3);
  const title = words.join(' ').charAt(0).toUpperCase() + words.join(' ').slice(1);
  return title.length > 30 ? title.substring(0, 30) + '...' : title;
}

// GET /api/chatbot/topics/[topicId]/messages — Get messages for a topic
export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    const messages = global.tempMessages.get(topicId) || [];
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

// POST /api/chatbot/topics/[topicId]/messages — Add a message to a topic
export async function POST(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    const { userId, text, isFirstMessage } = await request.json();
    if (!topicId || !userId || !text) {
      return NextResponse.json({ error: 'Missing topicId, userId, or text' }, { status: 400 });
    }

    // Get existing messages for this topic
    const messages = global.tempMessages.get(topicId) || [];

    // Save user message
    const userMessage = {
      id: `user-${Date.now()}`,
      topicId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    messages.push(userMessage);

    // Get previous messages for context
    const previousMessages = messages.map((msg: { sender: string; text: string }) => ({
      sender: msg.sender,
      text: msg.text
    }));

    // Compose prompt for Gemini
    const conversation = previousMessages
      .map((msg: { sender: string; text: string }) => `${msg.sender === 'user' ? 'User' : 'HRbot'}: ${msg.text}`)
      .join('\n');
    const prompt = `${conversation}\nUser: ${text}\nHRbot:`;

    // Call Gemini AI using the chatbotLeave endpoint
    let botText = 'Sorry, I encountered an error processing your request.';
    
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chatbotLeave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        botText = aiData.response || botText;
      } else {
        console.error('ChatbotLeave API error:', aiResponse.status, aiResponse.statusText);
        const errorData = await aiResponse.text();
        console.error('Error details:', errorData);
      }
    } catch (fetchError) {
      console.error('Fetch error to chatbotLeave:', fetchError);
      
      // Fallback: try direct Gemini API
      try {
        if (process.env.GOOGLE_AI_API_KEY) {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `You are an HR assistant. Please help with this question: ${text}` }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          });
          botText = result.response.text();
        } else {
          botText = 'Sorry, I encountered an error processing your request. Please try again.';
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        botText = 'Sorry, I encountered an error processing your request. Please try again.';
      }
    }

    // Save bot message
    const botMessage = {
      id: `bot-${Date.now()}`,
      topicId,
      sender: 'bot',
      text: botText,
      timestamp: new Date().toISOString()
    };
    messages.push(botMessage);

    // Update messages in memory
    global.tempMessages.set(topicId, messages);

    // Generate topic title from first user message
    let updatedTopic = null;
    if (isFirstMessage) {
      const topicTitle = generateTopicTitle(text);
      updatedTopic = { id: topicId, title: topicTitle };
      
      // Update topic in memory (shared with topics route)
      if (!global.tempTopics) {
        global.tempTopics = new Map();
      }
      const userTopics = global.tempTopics.get(userId) || [];
      const updatedTopics = userTopics.map((topic: any) => 
        topic.id === topicId ? { ...topic, title: topicTitle } : topic
      );
      global.tempTopics.set(userId, updatedTopics);
    }

    return NextResponse.json({ userMessage, botMessage, updatedTopic });
  } catch (error) {
    console.error('Error in messages route:', error);
    return NextResponse.json({ error: 'Failed to add message', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 
