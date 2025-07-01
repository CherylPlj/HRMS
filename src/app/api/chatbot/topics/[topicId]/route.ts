import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory storage for messages (shared with messages route)
declare global {
  var tempMessages: Map<string, any[]>;
}

if (!global.tempMessages) {
  global.tempMessages = new Map();
}

// GET /api/chatbot/topics/[topicId] — Get all messages for a topic
export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }
    const messages = global.tempMessages.get(topicId) || [];
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}