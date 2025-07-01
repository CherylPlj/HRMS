import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Temporary in-memory storage until Prisma client is regenerated
declare global {
  var tempTopics: Map<string, any[]>;
}

if (!global.tempTopics) {
  global.tempTopics = new Map();
}

// GET /api/chatbot/topics — List all topics for the user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    // Temporary: return topics from memory or empty array
    const userTopics = global.tempTopics.get(userId) || [];
    return NextResponse.json({ topics: userTopics });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch topics', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

// POST /api/chatbot/topics — Create a new topic
export async function POST(request: NextRequest) {
  try {
    const { userId, title } = await request.json();
    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing userId or title' }, { status: 400 });
    }
    
    // Temporary: create topic in memory
    const topic = {
      id: `temp-${Date.now()}`,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const userTopics = global.tempTopics.get(userId) || [];
    userTopics.unshift(topic);
    global.tempTopics.set(userId, userTopics);
    
    return NextResponse.json({ topic });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create topic', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

// DELETE /api/chatbot/topics — Delete a topic
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const topicId = searchParams.get('topicId');
    
    if (!userId || !topicId) {
      return NextResponse.json({ error: 'Missing userId or topicId' }, { status: 400 });
    }
    
    // Get user topics
    const userTopics = global.tempTopics.get(userId) || [];
    
    // Remove the topic
    const updatedTopics = userTopics.filter((topic: any) => topic.id !== topicId);
    global.tempTopics.set(userId, updatedTopics);
    
    // Also remove associated messages
    if (global.tempMessages) {
      global.tempMessages.delete(topicId);
    }
    
    return NextResponse.json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete topic', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}