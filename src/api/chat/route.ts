import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Google AI API key is not configured' },
        { status: 500 }
      );
    }

    const { message } = await req.json();

    // Check for quota=0 error before making request
    // Note: This route may be deprecated - consider using /app/api/chat instead
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Generate response
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });
    
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Check for quota errors
    const isQuotaError = error instanceof Error && (
      error.message.includes('429') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('quota') ||
      error.message.includes('Quota exceeded') ||
      error.message.includes('limit: 0')
    );
    
    if (isQuotaError) {
      return NextResponse.json(
        { 
          error: 'AI service quota has been exceeded. Please try again later.',
          details: 'The AI service is currently at capacity.'
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}