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

• Managing faculty and employee profiles
• Processing leave requests and approvals
• Generating attendance reports
• Managing documents and permissions
• Recruitment and hiring processes
• User management and system administration

Please ask me about any of these HRMS-related topics, and I'll be happy to help!`,

    faculty: `I'm here to help you with SJSFI HRMS faculty features. I can assist you with:

• Updating your personal information
• Submitting and tracking leave requests
• Recording and viewing attendance
• Uploading and managing documents
• Viewing your schedule and records
• General HRMS navigation

Please ask me about any of these faculty-related topics, and I'll be happy to help!`,

    employee: `I'm here to help you with SJSFI HRMS employee features. I can assist you with:

• Updating your personal information
• Submitting leave requests
• Viewing attendance records
• Managing your documents
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
- Faculty and employee management
- Document management and approval
- Attendance monitoring and reporting
- Leave request processing
- Recruitment and hiring processes
- User management and role assignments

Available Features:
1. Dashboard - Overview of system statistics and recent activities
2. Employees - Add, edit, and manage employee profiles and information
3. Documents - Upload, review, and approve faculty/employee documents
4. Attendance - Monitor daily attendance, view reports, and manage schedules
5. Leave - Process leave requests, approve/reject applications
6. Recruitment - Manage job postings, candidate applications, and hiring process
7. User Management - Create, edit, and manage user accounts and permissions (Super Admin only)
8. Session Management - Monitor active sessions and user activity (Super Admin only)

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
- If asked about unrelated topics, politely redirect to HRMS features`,

  employee: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help employees navigate the system and manage their information.

Key Features for Employees:
- Personal Information Management
- Document Management
- Attendance Tracking
- Leave Requests

Available Sections:
1. Dashboard - Overview of personal information and recent activities
2. Personal Data - Update personal information and contact details
3. Documents - Upload and manage personal documents
4. Attendance - View attendance records and schedules
5. Leave Request - Submit and track leave applications

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
    "How do I manage faculty schedules?": "To manage faculty schedules:\n\n1. Go to the Attendance section\n2. Click on 'Schedules' or 'Manage Schedules'\n3. Select the faculty member\n4. Set their working hours and days\n5. Save the schedule\n\nYou can also view and edit existing schedules from the same section.",
    
    "How do I add a new employee?": "To add a new employee:\n\n1. Go to the Employees section\n2. Click 'Add New Employee' or the '+' button\n3. Fill in the required information:\n   - Personal details (name, email, phone)\n   - Position and department\n   - Employment details (start date, salary)\n   - Emergency contact information\n4. Upload required documents (resume, certificates, IDs)\n5. Set their initial schedule and work hours\n6. Click 'Save' to create the employee profile\n\nAfter saving, you can create a user account for them to access the system.",
    
    "How do I add a new faculty member?": "To add a new faculty member:\n\n1. Go to the Employees section\n2. Click 'Add New Employee' or the '+' button\n3. Select 'Faculty' as the employee type\n4. Fill in the required information:\n   - Personal details (name, email, phone)\n   - Academic credentials and qualifications\n   - Teaching subjects and specializations\n   - Department assignment\n5. Upload required documents:\n   - Resume/CV\n   - Academic certificates\n   - Teaching licenses\n   - Government IDs\n6. Set their teaching schedule and office hours\n7. Click 'Save' to create the faculty profile\n\nThe new faculty member will receive an email invitation to set up their account.",
    
    "How do I check and approve documents?": "To check and approve documents:\n\n1. Go to the Documents section\n2. You'll see a list of all uploaded documents with their status\n3. Click on 'Pending Review' to see documents awaiting approval\n4. Click on a document to view it in detail\n5. Review the document content and verify it meets requirements\n6. Choose your action:\n   - Click 'Approve' if the document is acceptable\n   - Click 'Reject' if it needs corrections\n   - Add comments explaining your decision\n7. Submit your decision\n\nThe employee/faculty member will be notified of the approval or rejection via email.",
    
    "How do I create a user account for an employee?": "To create a user account for an employee:\n\n1. Go to the User Management section (Super Admin only)\n2. Click 'Create New User' or the '+' button\n3. Select the employee from the dropdown list\n4. Set the user role (Employee, Faculty, Admin)\n5. Configure permissions based on their role\n6. Set the initial password or enable email invitation\n7. Click 'Create Account'\n\nThe employee will receive an email with login credentials or an invitation link.\n\nNote: Only Super Admins can create user accounts. Regular admins should contact the Super Admin for user account creation.",
    
    "How do I reject a document submission?": "To reject a document submission:\n\n1. Go to the Documents section\n2. Find the document you want to reject\n3. Click on the document to open it\n4. Review the document and identify the issues\n5. Click 'Reject' button\n6. Provide a detailed reason for rejection in the comments field\n7. Suggest what needs to be corrected or resubmitted\n8. Click 'Submit Rejection'\n\nThe employee/faculty member will receive an email notification explaining why their document was rejected and what they need to do to resubmit it properly.",
    
    "How do I approve leave requests?": "To approve leave requests:\n\n1. Go to the Leave section\n2. You'll see a list of pending requests\n3. Click on a request to view details\n4. Review the request and supporting documents\n5. Click 'Approve' or 'Reject'\n6. Add comments if needed\n7. Submit your decision\n\nThe faculty member will be notified of your decision via email.",
    
    "How do I view attendance reports?": "To view attendance reports:\n\n1. Go to the Attendance section\n2. Click on 'Reports' or 'Attendance Summary'\n3. Select the date range and faculty members\n4. Choose the report type (daily, weekly, monthly)\n5. Generate the report\n6. You can export the report as PDF or Excel\n\nReports show time in/out, late arrivals, and attendance patterns.",
    
    "How do I manage employee documents?": "To manage employee documents:\n\n1. Go to the Documents section\n2. You can view all uploaded documents\n3. Click on a document to review it\n4. Approve or reject documents as needed\n5. Add comments for feedback\n6. Set document expiration dates\n\nYou can also upload documents on behalf of employees if needed."
  },
  
  faculty: {
    "How do I update my personal information?": "To update your personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon next to the information you want to change\n3. Update the following fields as needed:\n   - Contact information (phone, email, address)\n   - Emergency contact details\n   - Educational background\n   - Work experience\n   - Family information\n4. Click 'Save' to apply your changes\n5. Your updated information will be reviewed by admin\n\nMake sure to keep your information current for important notifications and records.",
    
    "How do I submit required documents?": "To submit required documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type from the dropdown:\n   - Academic certificates\n   - Government IDs\n   - Teaching licenses\n   - Medical certificates\n   - Other required documents\n4. Choose the file from your computer\n5. Add a description or notes about the document\n6. Click 'Upload' to submit\n7. Wait for admin approval\n\nThe document will be reviewed and you'll receive an email notification once it's approved or if changes are needed.",
    
    "How do I upload my profile photo?": "To upload your profile photo:\n\n1. Go to the Personal Data section\n2. Look for your current profile picture\n3. Click on the camera icon or 'Change Photo' button\n4. Select a photo from your computer\n5. Make sure the photo meets requirements:\n   - Clear, professional headshot\n   - Good lighting and background\n   - Supported formats: JPG, PNG\n   - File size under 5MB\n6. Click 'Upload' to save your new profile photo\n\nYour new photo will be visible immediately and used across the system.",
    
    "How do I update my contact details?": "To update your contact details:\n\n1. Go to the Personal Data section\n2. Find the 'Contact Information' section\n3. Click 'Edit' or the pencil icon\n4. Update the following information:\n   - Phone number (mobile and landline)\n   - Email address\n   - Current address\n   - Emergency contact person and number\n5. Click 'Save' to apply changes\n6. Verify your information is correct\n\nUpdated contact details help ensure you receive important notifications and can be reached when needed.",
    
    "How do I submit my educational background?": "To submit your educational background:\n\n1. Go to the Personal Data section\n2. Find the 'Education' or 'Academic Background' section\n3. Click 'Add Education' or the '+' button\n4. Fill in the required information:\n   - Degree/Qualification earned\n   - Institution name\n   - Year of completion\n   - Field of study\n   - GPA or honors (if applicable)\n5. Upload supporting documents:\n   - Diploma or certificate\n   - Transcript of records\n   - Professional licenses\n6. Click 'Save' to submit your educational background\n\nYour educational information will be reviewed by admin for verification.",
    
    "How do I request a change in my teaching schedule?": "To request a schedule change:\n\n1. Go to the Personal Data section\n2. Look for 'Schedule Request' or contact your admin\n3. Submit a formal request with your proposed changes\n4. Include the reason for the change\n5. Wait for admin approval\n\nAlternatively, you can contact your department head or admin directly.",
    
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Leave Request' or the '+' button\n3. Select the type of leave (sick, vacation, personal, etc.)\n4. Choose start and end dates\n5. Provide a reason for the leave\n6. Upload any supporting documents (medical certificate, etc.)\n7. Submit the request\n\nYou'll receive email notifications about the status of your request.",
    
    "How do I view my attendance records?": "To view your attendance records:\n\n1. Go to the Attendance section\n2. You'll see your daily attendance summary\n3. Click on 'History' to view past records\n4. Select date ranges to filter records\n5. View your time in/out, late arrivals, and absences\n\nYou can also download your attendance report if needed.",
    
    "How do I upload documents?": "To upload documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type (certificate, ID, etc.)\n4. Choose the file from your computer\n5. Add a description if needed\n6. Click 'Upload'\n7. Wait for admin approval\n\nMake sure documents are clear and in supported formats (PDF, JPG, PNG).",
    
    "Where is the campus located?": "The SJSFI campus is located at [Insert actual campus address].\n\nFor specific directions or campus map, please contact the administration office or check the school's official website."
  },
  
  employee: {
    "How do I update my personal information?": "To update your personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon next to the information you want to change\n3. Update the following fields as needed:\n   - Contact information (phone, email, address)\n   - Emergency contact details\n   - Personal details (birth date, marital status)\n   - Work information\n4. Click 'Save' to apply your changes\n5. Your updated information will be reviewed by admin\n\nMake sure to keep your information current for important notifications and records.",
    
    "How do I submit required documents?": "To submit required documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type from the dropdown:\n   - Government IDs\n   - Certificates\n   - Medical certificates\n   - Other required documents\n4. Choose the file from your computer\n5. Add a description or notes about the document\n6. Click 'Upload' to submit\n7. Wait for admin approval\n\nThe document will be reviewed and you'll receive an email notification once it's approved or if changes are needed.",
    
    "How do I upload my profile photo?": "To upload your profile photo:\n\n1. Go to the Personal Data section\n2. Look for your current profile picture\n3. Click on the camera icon or 'Change Photo' button\n4. Select a photo from your computer\n5. Make sure the photo meets requirements:\n   - Clear, professional headshot\n   - Good lighting and background\n   - Supported formats: JPG, PNG\n   - File size under 5MB\n6. Click 'Upload' to save your new profile photo\n\nYour new photo will be visible immediately and used across the system.",
    
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Request' or the '+' button\n3. Fill in the leave details:\n   - Leave type (sick, vacation, personal)\n   - Start and end dates\n   - Reason for leave\n4. Upload any required documents (medical certificate, etc.)\n5. Submit the request\n\nYou'll be notified when your request is approved or rejected.",
    
    "How do I view my attendance?": "To view your attendance:\n\n1. Go to the Attendance section\n2. You'll see your current day's status\n3. Click 'History' to view past records\n4. Select dates to see specific periods\n\nYour attendance shows your time in/out and any late arrivals."
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