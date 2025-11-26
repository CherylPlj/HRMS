import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Gemini AI client
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

// Helper function to detect out-of-scope messages
const isOutOfScope = (message: string): boolean => {
  const outOfScopeKeywords = [
    // General topics unrelated to HRMS
    'weather', 'news', 'sports', 'entertainment', 'movies', 'music', 'games',
    'cooking', 'recipes', 'travel', 'vacation', 'shopping', 'fashion',
    'politics', 'religion', 'philosophy', 'science', 'history', 'geography',
    'mathematics', 'physics', 'chemistry', 'biology', 'astronomy',
    'personal advice', 'relationship', 'dating', 'marriage', 'family',
    'health', 'medical', 'doctor', 'hospital', 'medicine', 'therapy',
    'financial', 'investment', 'banking', 'insurance', 'taxes',
    'technology', 'programming', 'coding', 'software', 'hardware',
    'social media', 'facebook', 'instagram', 'twitter', 'tiktok',
    'gaming', 'video games', 'playstation', 'xbox', 'nintendo',
    'jokes', 'humor', 'comedy', 'funny', 'memes',
    'random', 'trivia', 'facts', 'quotes', 'poetry',
    'current events', 'world news', 'breaking news',
    'personal problems', 'emotional support', 'counseling',
    'legal advice', 'law', 'court', 'lawyer', 'attorney',
    'academic subjects', 'homework', 'assignment', 'research',
    'other schools', 'universities', 'colleges', 'education systems'
  ];

  const messageLower = message.toLowerCase();
  return outOfScopeKeywords.some(keyword => messageLower.includes(keyword));
};

// Helper function to get appropriate out-of-scope response
const getOutOfScopeResponse = (userRole: string): string => {
  const responses = {
    admin: `I'm here to help you with SJSFI HRMS administrative tasks. I can assist you with:

• Managing employee profiles and information
• Processing leave requests and approvals
• Managing documents and permissions
• Recruitment and hiring processes
• Employee directory management
• User management and system administration

Please ask me about any of these HRMS-related topics, and I'll be happy to help!`,

    faculty: `I'm here to help you with SJSFI HRMS faculty features. I can assist you with:

• Updating your personal information
• Submitting and tracking leave requests
• Uploading and managing documents
• Accessing the employee directory
• General HRMS navigation

Please ask me about any of these faculty-related topics, and I'll be happy to help!`,

    employee: `I'm here to help you with SJSFI HRMS employee features. I can assist you with:

• Updating your personal information
• Submitting leave requests
• Managing your documents
• Accessing the employee directory
• Accessing your employee portal
• General HRMS navigation

Please ask me about any of these employee-related topics, and I'll be happy to help!`
  };

  return responses[userRole as keyof typeof responses] || responses.faculty;
};

// Constants for retry logic
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

// System prompts for different user roles
const SYSTEM_PROMPTS = {
  admin: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help administrators manage the school's human resources efficiently.

Key Responsibilities:
- Employee management and profile administration
- Document management and approval
- Leave request processing and approval
- Recruitment and hiring processes
- Employee directory management
- User management and role assignments

Available Features:
1. Dashboard - Overview of system statistics, employee metrics, recruitment overview, and recent activities
2. Employees - Add, edit, and manage employee profiles, personal information, employment details, and related data
3. Documents - Upload, review, and approve employee documents (certificates, IDs, etc.)
4. Leave - Process leave requests, approve/reject applications, and manage leave records
5. Recruitment - Manage job postings (vacancies), candidate applications, interviews, and hiring process
6. Directory - Search and view employee directory with filtering by name, department, position, and years of service. View employee profiles and contact information
7. User Management - Create, edit, and manage user accounts and permissions (Super Admin only)

Guidelines:
- Provide clear, step-by-step instructions with proper spacing
- Use numbered lists for procedures
- Separate different sections with blank lines
- Be professional and helpful
- If you don't know specific details about the system, suggest contacting IT support
- Focus on administrative tasks and system management
- Always prioritize data security and privacy
- Format responses for easy reading with proper line breaks
- Stay focused on SJSFI HRMS topics only
- If asked about unrelated topics, politely redirect to HRMS features`,

  faculty: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help faculty members navigate the system and manage their personal information.

Key Features for Faculty:
- Personal Data Management
- Document Upload and Management
- Leave Request Submission and Tracking
- Employee Directory Access

Available Sections:
1. Dashboard - Overview of personal information and recent activities
2. Personal Data - Update personal information, contact details, and emergency contacts
3. Documents - Upload and manage personal documents (certificates, IDs, etc.)
4. Leave Request - Submit leave applications and view request status
5. Directory - Search and view employee directory, find colleagues by name, department, or position, and view contact information

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
- If asked about unrelated topics, politely redirect to HRMS features`,

  employee: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help employees navigate the system and manage their information.

Key Features for Employees:
- Personal Information Management
- Document Management
- Leave Request Submission and Tracking
- Employee Directory Access

Available Sections:
1. Dashboard - Overview of personal information and recent activities
2. Personal Data - Update personal information and contact details
3. Documents - Upload and manage personal documents
4. Leave Request - Submit and track leave applications
5. Directory - Search and view employee directory, find colleagues by name, department, or position, and view contact information

Guidelines:
- Provide clear, simple instructions with proper formatting
- Use numbered lists for procedures
- Add blank lines between sections for readability
- Be patient and helpful
- Focus on employee-specific features
- If you don't know specific details, suggest contacting HR or IT support
- Emphasize the importance of keeping information up to date
- Format responses for easy reading with proper line breaks
- Stay focused on SJSFI HRMS topics only
- If asked about unrelated topics, politely redirect to HRMS features`
};

// Training data with common questions and answers
const TRAINING_DATA = {
  admin: {
    "How do I add a new employee?": "To add a new employee:\n\n1. Go to the Employees section\n2. Click 'Add New Employee' or the '+' button\n3. Fill in the required information (name, email, position, department, etc.)\n4. Upload necessary documents\n5. Set employment details and status\n6. Save the profile\n\nThe new employee will receive an email invitation to set up their account.",
    
    "How do I approve leave requests?": "To approve leave requests:\n\n1. Go to the Leave section\n2. You'll see a list of pending requests\n3. Click on a request to view details\n4. Review the request and supporting documents\n5. Click 'Approve' or 'Reject'\n6. Add comments if needed\n7. Submit your decision\n\nThe employee will be notified of your decision via email.",
    
    "How do I manage employee documents?": "To manage employee documents:\n\n1. Go to the Documents section\n2. You can view all uploaded documents\n3. Click on a document to review it\n4. Approve or reject documents as needed\n5. Add comments for feedback\n6. Set document expiration dates\n\nYou can also upload documents on behalf of employees if needed.",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find employees:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information, employment details, and more\n5. As an admin, you can update employee status and manage accounts\n6. Download the directory as CSV if needed",
    
    "How do I manage recruitment?": "To manage recruitment:\n\n1. Go to the Recruitment section\n2. Create new job postings (vacancies) by clicking 'Add Vacancy'\n3. View and manage candidate applications\n4. Shortlist candidates for interviews\n5. Schedule and track interviews\n6. Update candidate status (Hired, Returned, etc.)\n7. View recruitment statistics on the dashboard",
    
    "How do I view employee information?": "To view employee information:\n\n1. Go to the Employees section to see all employees\n2. Or use the Directory section to search and filter employees\n3. Click on an employee to view their full profile\n4. View personal information, employment details, documents, and more\n5. Edit employee information as needed"
  },
  
  faculty: {
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Leave Request' or the '+' button\n3. Select the type of leave (sick, vacation, personal, undertime, etc.)\n4. Choose start and end dates (and times for undertime)\n5. Provide a reason for the leave\n6. Upload any supporting documents (medical certificate, etc.)\n7. Submit the request\n\nYou'll receive email notifications about the status of your request.",
    
    "How do I upload documents?": "To upload documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type (certificate, ID, etc.)\n4. Choose the file from your computer\n5. Add a description if needed\n6. Click 'Upload'\n7. Wait for admin approval\n\nMake sure documents are clear and in supported formats (PDF, JPG, PNG).",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find colleagues:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information and employment details\n5. Use quick actions to send email or contact colleagues",
    
    "How do I update my personal information?": "To update your personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon\n3. Update the information you need to change\n4. Click 'Save' to apply changes\n\nMake sure to keep your contact information current for important notifications.",
    
    "How do I view my leave request status?": "To view your leave request status:\n\n1. Go to the Leave Request section\n2. You'll see all your leave requests listed\n3. Each request shows its current status (Pending, Approved, Returned)\n4. Click on a request to view full details\n5. Check for any comments or feedback from administrators"
  },
  
  employee: {
    "How do I update my personal information?": "To update your personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon\n3. Update the information you need to change\n4. Click 'Save' to apply changes\n\nMake sure to keep your contact information current for important notifications.",
    
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Request' or the '+' button\n3. Fill in the leave details (dates, type, reason)\n4. Upload any required documents\n5. Submit the request\n\nYou'll be notified when your request is approved or rejected.",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find colleagues:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information and employment details\n5. Use quick actions to send email or contact colleagues",
    
    "How do I upload documents?": "To upload documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type\n4. Choose the file from your computer\n5. Add a description if needed\n6. Click 'Upload'\n7. Wait for admin approval\n\nMake sure documents are in supported formats (PDF, JPG, PNG)."
  }
};

export async function POST(request: Request) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Google AI API key is not configured' },
        { status: 500 }
      );
    }

    const { message, userRole = 'faculty' } = await request.json();

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Check if we have a direct answer in our training data
    const trainingData = TRAINING_DATA[userRole as keyof typeof TRAINING_DATA] || TRAINING_DATA.faculty;
    const directAnswer = trainingData[message.toLowerCase() as keyof typeof trainingData];
    
    if (directAnswer) {
      return NextResponse.json({ response: formatResponse(directAnswer) });
    }

    // Check if the message is out of scope
    if (isOutOfScope(message)) {
      return NextResponse.json({ 
        response: formatResponse(getOutOfScopeResponse(userRole))
      });
    }

    // Prepare the system prompt
    const systemPrompt = SYSTEM_PROMPTS[userRole as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.faculty;

    // Create the full prompt with context
    const fullPrompt = `${systemPrompt}

User Question: ${message}

Please provide a helpful, accurate response based on the HRMS system features and guidelines above. If you're not sure about specific system details, suggest contacting the appropriate support team.

Response:`;

    let lastError: Error | null = null;
    let retryCount = 0;

    // Retry loop
    while (retryCount < MAX_RETRIES) {
      try {
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

        return NextResponse.json({ response: formatResponse(text) });
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a 503 error (service unavailable)
        if (error instanceof Error && error.message.includes('503')) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            // Exponential backoff
            const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
            await wait(delay);
            continue;
          }
        }
        
        // For other errors or if we've exhausted retries, throw the error
        throw error;
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
    console.error('Error in chat API:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to process your request',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 