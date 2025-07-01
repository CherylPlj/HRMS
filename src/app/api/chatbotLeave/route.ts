import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Helper function to wait between retries
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to format AI responses for better readability
const formatResponse = (text: string): string => {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code blocks
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    // Add proper spacing
    .replace(/\n\n+/g, '\n\n') // Normalize multiple newlines
    .replace(/([.!?])\s*\n/g, '$1\n\n') // Add space after sentences
    .replace(/(\d+\.)\s*/g, '\n$1 ') // Add newline before numbered lists
    .replace(/(\d+\. .+?)\n\n(?=\d+\.)/gs, '$1\n') // Lessen newlines between steps
    .replace(/([A-Z][a-z]+:)\s*/g, '\n$1 ') // Add newline before sections
    .trim(); // Remove extra whitespace
};

// Constants for retry logic
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

// System prompt for HR chatbot focused on leave and attendance
const SYSTEM_PROMPT = `You are an HR assistant for SJSFI (San Jose School Foundation Inc.). You help faculty members with their questions about:

1. Leave policies and procedures
2. Attendance and time tracking
3. Employee benefits and policies
4. General HR inquiries
5. Document requirements
6. Work schedules and arrangements

Key Features for Faculty:
- Personal Data Management
- Document Upload and Management
- Attendance Recording and Viewing
- Leave Request Submission
- Schedule Viewing

Available Sections:
1. Dashboard - Overview of personal information and recent activities
2. Personal Data - Update personal information, contact details, and emergency contacts
3. Documents - Upload and manage personal documents (certificates, IDs, etc.)
4. Attendance - Record daily attendance (time in/out) and view attendance history
5. Leave Request - Submit leave applications and view request status

Guidelines:
- Provide friendly, helpful guidance with clear formatting
- Use numbered lists for step-by-step instructions
- Add blank lines between different sections
- Focus on faculty-specific features
- Explain processes in simple terms
- If you don't know specific details, suggest contacting the admin or IT support
- Emphasize the importance of accurate data entry
- Format responses for easy reading with proper spacing
- Stay focused on SJSFI HRMS topics only
- If asked about unrelated topics, politely redirect to HRMS features

Please provide helpful, accurate, and professional responses. If you don't know something specific about SJSFI policies, suggest contacting the HR department directly.

Keep responses concise but informative. Be friendly and supportive while maintaining professionalism.`;

// Training data with common leave and attendance questions
const TRAINING_DATA = {
  "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Leave Request' or the '+' button\n3. Select the type of leave (sick, vacation, personal, etc.)\n4. Choose start and end dates\n5. Provide a reason for the leave\n6. Upload any supporting documents (medical certificate, etc.)\n7. Submit the request\n\nYou'll receive email notifications about the status of your request.",
  
  "How do I view my attendance records?": "To view your attendance records:\n\n1. Go to the Attendance section\n2. You'll see your daily attendance summary\n3. Click on 'History' to view past records\n4. Select date ranges to filter records\n5. View your time in/out, late arrivals, and absences\n\nYou can also download your attendance report if needed.",
  
  "How do I record my attendance?": "To record your attendance:\n\n1. Go to the Attendance section\n2. You'll see today's date and current time\n3. Click 'Time In' when you arrive at work\n4. Click 'Time Out' when you leave work\n5. Add any remarks if needed (late arrival, early departure, etc.)\n6. Save your attendance record\n\nMake sure to record your attendance daily for accurate tracking.",
  
  "What types of leave are available?": "SJSFI offers several types of leave:\n\n1. Sick Leave - For medical appointments and illness\n2. Vacation Leave - For personal time off\n3. Emergency Leave - For urgent personal matters\n4. Undertime - For partial day absences\n5. Maternity Leave - For expecting mothers\n6. Paternity Leave - For new fathers\n\nEach leave type has specific requirements and approval processes. Check with HR for detailed policies.",
  
  "How do I check my leave balance?": "To check your leave balance:\n\n1. Go to the Leave Request section\n2. Look for 'Leave Balance' or 'My Leaves'\n3. You'll see your available leave credits\n4. View your leave history and pending requests\n\nIf you don't see this information, contact HR for assistance.",
  
  "How do I upload documents for leave?": "To upload documents for leave:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select 'Leave Supporting Document' as the type\n4. Choose the file from your computer\n5. Add a description (e.g., 'Medical Certificate for Sick Leave')\n6. Click 'Upload'\n7. Wait for admin approval\n\nMake sure documents are clear and in supported formats (PDF, JPG, PNG).",
  
  "What should I do if I'm late for work?": "If you're late for work:\n\n1. Record your actual time in the Attendance section\n2. Add a remark explaining the reason for being late\n3. If it's a recurring issue, consider submitting a schedule change request\n4. For emergencies, contact your supervisor immediately\n\nBeing honest about your attendance helps maintain trust and allows for proper planning.",
  
  "How do I request a schedule change?": "To request a schedule change:\n\n1. Go to the Personal Data section\n2. Look for 'Schedule Request' or contact your admin\n3. Submit a formal request with your proposed changes\n4. Include the reason for the change\n5. Wait for admin approval\n\nAlternatively, you can contact your department head or admin directly.",
  
  "How do I view my work schedule?": "To view your work schedule:\n\n1. Go to the Attendance section\n2. Look for 'My Schedule' or 'Schedule View'\n3. You'll see your assigned working hours and days\n4. Check for any upcoming schedule changes\n\nIf you don't see your schedule, contact HR or your supervisor.",
  
  "What documents do I need for leave?": "Required documents depend on leave type:\n\n1. Sick Leave - Medical certificate from a doctor\n2. Vacation Leave - Usually no documents required\n3. Emergency Leave - May require explanation or supporting documents\n4. Maternity Leave - Medical certificate and pregnancy-related documents\n5. Paternity Leave - Birth certificate or hospital records\n\nAlways check with HR for specific requirements before submitting your request."
};

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    // Check if we have a direct answer in our training data
    const directAnswer = TRAINING_DATA[message.toLowerCase() as keyof typeof TRAINING_DATA];
    
    if (directAnswer) {
      return NextResponse.json({ response: formatResponse(directAnswer) });
    }

    // Try different models in order of preference
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let lastError: Error | null = null;
    let retryCount = 0;

    // Retry loop
    while (retryCount < MAX_RETRIES) {
      for (const modelName of models) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          // Create the full prompt with context
          const fullPrompt = `${SYSTEM_PROMPT}

User Question: ${message}

Please provide a helpful, accurate response based on the HRMS system features and guidelines above. If you're not sure about specific system details, suggest contacting the appropriate support team.

Response:`;

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.3, // Lower temperature for more consistent responses
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              }
            ]
          });

          const response = result.response;
          const text = response.text();
          
          console.log(`Successfully used model: ${modelName}`);
          return NextResponse.json({ 
            response: formatResponse(text),
            timestamp: new Date().toISOString()
          });
          
        } catch (modelError) {
          console.log(`Model ${modelName} failed:`, modelError);
          lastError = modelError as Error;
          
          // Check if it's a 503 error (service unavailable)
          if (modelError instanceof Error && modelError.message.includes('503')) {
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              // Exponential backoff
              const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
              await wait(delay);
              continue;
            }
          }
          
          // If this is the last model, throw the error
          if (modelName === models[models.length - 1]) {
            throw modelError;
          }
          // Continue to next model
          continue;
        }
      }
      
      // If we've tried all models and still failed, increment retry count
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await wait(delay);
      }
    }

    // If we've exhausted all retries, return a user-friendly error
    return NextResponse.json(
      { 
        error: 'Service is currently busy. Please try again in a few moments.',
        details: lastError?.message 
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('Chatbot API error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing API key' },
          { status: 500 }
        );
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded' },
          { status: 429 }
        );
      }
      if (error.message.includes('404') || error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'AI model temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 }
    );
  }
}
