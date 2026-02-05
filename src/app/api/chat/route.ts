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

// Helper function to find matching training data answer using intelligent matching
const findTrainingDataAnswer = (message: string, trainingData: Record<string, string>): string | null => {
  const messageLower = message.toLowerCase().trim();
  
  // 1. Try exact match first
  if (trainingData[messageLower]) {
    return trainingData[messageLower];
  }
  
  // 2. Try keyword-based matching
  // Extract key action words from the message
  const actionKeywords = [
    'add', 'create', 'new', 'employee', 'employees',
    'approve', 'leave', 'request', 'requests',
    'manage', 'document', 'documents',
    'directory', 'search', 'find',
    'recruitment', 'candidate', 'screening', 'vacancy', 'vacancies',
    'performance', 'review', 'reviews', 'goal', 'goals',
    'promotion', 'promotions', 'eligibility',
    'training', 'needs', 'recommendation', 'recommendations',
    'disciplinary', 'risk', 'analysis',
    'upload', 'submit', 'update', 'edit',
    'schedule', 'schedules', 'class', 'classes', 'teaching', 'subject', 'section', 'sections', 'time', 'day', 'days'
  ];
  
  // Find keywords in the message
  const messageKeywords = actionKeywords.filter(keyword => 
    messageLower.includes(keyword)
  );
  
  // Score each training data entry based on keyword matches
  let bestMatch: { key: string; score: number } | null = null;
  
  for (const [key, value] of Object.entries(trainingData)) {
    const keyLower = key.toLowerCase();
    let score = 0;
    
    // Count matching keywords
    for (const keyword of messageKeywords) {
      if (keyLower.includes(keyword)) {
        score += 1;
      }
    }
    
    // Bonus for partial phrase matches
    const messageWords = messageLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of messageWords) {
      if (keyLower.includes(word)) {
        score += 0.5;
      }
    }
    
    // If score is high enough and better than current best, update
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { key, score };
    }
  }
  
  // Return answer if we found a good match (at least 2 keyword matches)
  if (bestMatch && bestMatch.score >= 2) {
    return trainingData[bestMatch.key];
  }
  
  // 3. Try fuzzy matching for common question patterns
  const questionPatterns = [
    { pattern: /(how|what|where|when).*(add|create|new).*(employee|staff)/i, keys: ['add', 'employee'] },
    { pattern: /(how|what|where|when).*(approve|process).*(leave|request)/i, keys: ['approve', 'leave'] },
    { pattern: /(how|what|where|when).*(manage|upload|view).*(document)/i, keys: ['manage', 'document'] },
    { pattern: /(how|what|where|when).*(use|search|find).*(directory)/i, keys: ['directory'] },
    { pattern: /(how|what|where|when).*(manage|view|process).*(recruitment|candidate|vacancy)/i, keys: ['recruitment'] },
    { pattern: /(how|what|where|when).*(view|check|see).*(performance|review|goal)/i, keys: ['performance', 'review'] },
    { pattern: /(how|what|where|when).*(view|check|see).*(training|recommendation)/i, keys: ['training'] },
    { pattern: /(how|what|where|when).*(view|check|see|find).*(schedule|class|classes|teaching)/i, keys: ['schedule'] },
  ];
  
  for (const { pattern, keys } of questionPatterns) {
    if (pattern.test(message)) {
      // Find training data entry that contains these keys
      for (const [key, value] of Object.entries(trainingData)) {
        const keyLower = key.toLowerCase();
        if (keys.every(k => keyLower.includes(k))) {
          return value;
        }
      }
    }
  }
  
  return null;
};

// Helper function to get appropriate out-of-scope response
const getOutOfScopeResponse = (userRole: string): string => {
  const responses = {
    admin: `I'm here to help you with SJSFI HRMS administrative tasks. I can assist you with:

• Managing employee profiles and information
• Processing leave requests and approvals
• Managing documents and permissions
• Recruitment and hiring processes with AI-powered candidate screening
• Employee directory management
• Performance management (reviews, goals, KPIs, promotions)
• Disciplinary actions and risk analysis
• Training needs analysis and recommendations
• AI-powered insights and reports
• User management and system administration

Please ask me about any of these HRMS-related topics, and I'll be happy to help!`,

    faculty: `I'm here to help you with SJSFI HRMS faculty features. I can assist you with:

• Updating your personal information
• Submitting and tracking leave requests
• Uploading and managing documents
• Viewing your teaching schedule
• Accessing the employee directory
• Viewing your performance reviews and goals
• Viewing training recommendations
• General HRMS navigation

Please ask me about any of these faculty-related topics, and I'll be happy to help!`,

    employee: `I'm here to help you with SJSFI HRMS employee features. I can assist you with:

• Updating your personal information
• Submitting leave requests
• Managing your documents
• Accessing the employee directory
• Viewing your performance reviews and goals
• Viewing training recommendations
• Accessing your employee portal
• General HRMS navigation

Please ask me about any of these employee-related topics, and I'll be happy to help!`
  };

  return responses[userRole as keyof typeof responses] || responses.faculty;
};

// Constants for retry logic
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 60 seconds max delay

// System prompts for different user roles
const SYSTEM_PROMPTS = {
  admin: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help administrators manage the school's human resources efficiently.

Key Responsibilities:
- Employee management and profile administration
- Document management and approval
- Leave request processing and approval
- Recruitment and hiring processes with AI-powered screening
- Training needs analysis and recommendations
- Employee directory management
- User management and role assignments
- AI-powered insights and analytics

Available Features:
1. Dashboard - Overview of system statistics, employee metrics, recruitment overview, AI insights, and recent activities
2. Employees - Add, edit, and manage employee profiles, personal information, employment details, and related data
3. Documents - Upload, review, and approve employee documents (certificates, IDs, etc.)
4. Leave - Process leave requests, approve/reject applications, and manage leave records
5. Recruitment - Manage job postings (vacancies), candidate applications, AI-powered candidate screening, interviews, and hiring process. AI provides candidate scoring, recommendations, and interview questions
6. Training - Manage training programs, track employee training history, and use AI to analyze training needs and recommend courses
7. Directory - Search and view employee directory with filtering by name, department, position, and years of service. View employee profiles and contact information
8. AI Dashboard - View AI-powered insights including candidate screening statistics and training needs
9. User Management - Create, edit, and manage user accounts and permissions (Super Admin only)

AI Agent Capabilities:
- Candidate Screening: Automatically screens candidates against job requirements, provides multi-dimensional scoring (resume, qualifications, experience, skills), and generates interview questions
- Training Needs Analysis: Identifies skill gaps, recommends specific training programs, and prioritizes training needs based on employee performance and position requirements
- Dashboard Insights: Provides comprehensive analytics on recruitment quality and training needs

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
- If asked about unrelated topics, politely redirect to HRMS features
- When discussing AI features, explain how they help with decision-making and provide actionable insights`,

  faculty: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help faculty members navigate the system and manage their personal information.

Key Features for Faculty:
- Personal Data Management
- Document Upload and Management
- Leave Request Submission and Tracking
- Employee Directory Access
- Training Recommendations
- Teaching Schedule Management

Available Sections:
1. Dashboard - Overview of personal information, recent activities, and AI insights
2. Personal Data - Update personal information, contact details, and emergency contacts
3. Documents - Upload and manage personal documents (certificates, IDs, etc.)
4. Leave Request - Submit leave applications and view request status
5. My Schedule - View your teaching schedule with classes, subjects, sections, days, and times. See your weekly schedule organized by day, view total classes, subjects, and sections. Download your schedule as PDF. View advisory classes you're assigned to
6. Training - View your training history and AI-recommended training programs based on your skill gaps and career development needs
7. Directory - Search and view employee directory, find colleagues by name, department, or position, and view contact information

Schedule Features:
- View your complete weekly teaching schedule
- See all classes organized by day (Monday through Saturday)
- View subject names, section names, time slots, and duration
- Check total number of classes, subjects, and sections you teach
- View advisory classes you're assigned to
- Download your schedule as a PDF document
- See schedule statistics including total hours per week

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
- When discussing training, explain how AI recommendations can help with career development
- When discussing schedules, guide users to the "My Schedule" section to view their specific schedule`,

  employee: `You are an AI assistant for the SJSFI (San Jose School of Future Innovation) HRMS (Human Resource Management System). You help employees navigate the system and manage their information.

Key Features for Employees:
- Personal Information Management
- Document Management
- Leave Request Submission and Tracking
- Employee Directory Access
- Training Recommendations

Available Sections:
1. Dashboard - Overview of personal information, recent activities, and AI insights
2. Personal Data - Update personal information and contact details
3. Documents - Upload and manage personal documents
4. Leave Request - Submit and track leave applications
5. Training - View your training history and AI-recommended training programs based on your skill gaps and career development needs
6. Directory - Search and view employee directory, find colleagues by name, department, or position, and view contact information

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
- If asked about unrelated topics, politely redirect to HRMS features
- When discussing training, explain how AI recommendations can help with career development`
};

// Training data with common questions and answers
const TRAINING_DATA = {
  admin: {
    "How do I add a new employee?": "To add a new employee:\n\n1. Go to the Employees section\n2. Click 'Add New Employee' or the '+' button\n3. Fill in the required information (name, email, position, department, etc.)\n4. Upload necessary documents\n5. Set employment details and status\n6. Save the profile\n\nThe new employee will receive an email invitation to set up their account.",
    
    "How do I approve leave requests?": "To approve leave requests:\n\n1. Go to the Leave section\n2. You'll see a list of pending requests\n3. Click on a request to view details\n4. Review the request and supporting documents\n5. Click 'Approve' or 'Reject'\n6. Add comments if needed\n7. Submit your decision\n\nThe employee will be notified of your decision via email.",
    
    "How do I manage employee documents?": "To manage employee documents:\n\n1. Go to the Documents section\n2. You can view all uploaded documents\n3. Click the eye icon next to a file to preview it in the modal, or use 'Open in new tab' to view it in a new window\n4. Approve or reject documents as needed\n5. Add comments for feedback\n6. Set document expiration dates\n\nYou can also upload documents on behalf of employees if needed. Accepted file types are PDF and images (JPG, PNG, GIF, WEBP).",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find employees:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information, employment details, and more\n5. As an admin, you can update employee status and manage accounts\n6. Download the directory as CSV if needed",
    
    "How do I manage recruitment?": "To manage recruitment:\n\n1. Go to the Recruitment section\n2. Create new job postings (vacancies) by clicking 'Add Vacancy'\n3. View and manage candidate applications\n4. Use AI-powered candidate screening to automatically evaluate candidates\n5. Review AI-generated scores (resume, qualifications, experience, skills)\n6. View AI recommendations and suggested interview questions\n7. Shortlist candidates for interviews\n8. Schedule and track interviews\n9. Update candidate status (Hired, Returned, etc.)\n10. View recruitment statistics and AI insights on the dashboard",
    
    "How do I view employee information?": "To view employee information:\n\n1. Go to the Employees section to see all employees\n2. Or use the Directory section to search and filter employees\n3. Click on an employee to view their full profile\n4. View personal information, employment details, documents, and more\n5. Edit employee information as needed",
    
    "How do I use AI candidate screening?": "To use AI candidate screening:\n\n1. Go to the Recruitment section\n2. Select a candidate and vacancy\n3. Click 'Screen Candidate' or use the AI screening feature\n4. The AI will automatically analyze:\n   - Resume quality and content\n   - Qualifications match\n   - Experience level\n   - Skill alignment\n5. Review the AI-generated scores and recommendation\n6. Check suggested interview questions\n7. Review strengths, weaknesses, and risk factors\n8. Use the recommendation (StrongRecommend, Recommend, Consider, Reject, NeedsReview) to make hiring decisions",
    
    // Performance module hidden for now
    // "How do I manage performance reviews?": "To manage performance reviews:\n\n1. Go to the Performance section\n2. Click 'Create Review' to start a new performance review\n3. Select the employee and review period\n4. Enter KPI scores, behavior scores, and attendance scores\n5. Add remarks, achievements, and improvement areas\n6. Set performance goals for the next period\n7. Save as draft or submit for approval\n8. Employees can view and comment on their reviews\n9. Use AI promotion analysis to identify promotion-ready employees",
    
    // "How do I analyze promotion eligibility?": "To analyze promotion eligibility:\n\n1. Go to the Performance section\n2. Navigate to Promotion Analysis or AI Dashboard\n3. Select an employee to analyze\n4. The AI will evaluate:\n   - Performance review scores\n   - Goal completion rates\n   - Training history\n   - Years in position\n   - Disciplinary records\n5. Review the AI-generated eligibility score and recommendation\n6. Check strengths, development areas, and next steps\n7. Use the recommendation (Ready, Consider, NeedsDevelopment, NotReady) for promotion decisions",
    
    "How do I analyze training needs?": "To analyze training needs:\n\n1. Go to the Performance or Training section\n2. Navigate to Training Needs Analysis\n3. Select an employee to analyze\n4. The AI will identify:\n   - Skill gaps based on position requirements\n   - Current skill levels vs required levels\n   - Training recommendations with priorities\n5. Review the AI-generated training recommendations\n6. Assign training programs based on AI suggestions\n7. Track training completion and impact on performance",
    
    // Disciplinary module hidden for now
    // "How do I manage disciplinary actions?": "To manage disciplinary actions:\n\n1. Go to the Disciplinary section\n2. Create a new disciplinary record by clicking 'Add Record'\n3. Select the employee and enter violation details\n4. Set severity level (Minor, Moderate, Major)\n5. Upload evidence if available\n6. Assign disciplinary actions (warnings, suspension, etc.)\n7. Track action status and employee acknowledgment\n8. Use AI risk analysis to identify high-risk employees\n9. Review AI-generated risk scores and recommendations\n10. Monitor patterns and trends for early intervention",
    
    // "How do I use AI disciplinary risk analysis?": "To use AI disciplinary risk analysis:\n\n1. Go to the Disciplinary section or AI Dashboard\n2. Navigate to Disciplinary Risk Analysis\n3. Select an employee to analyze\n4. The AI will evaluate:\n   - Disciplinary record history\n   - Recent violations (last 6 months)\n   - Attendance issues and patterns\n   - Performance trends\n5. Review the AI-generated risk score and level (Low, Medium, High, Critical)\n6. Check risk factors and pattern analysis\n7. Follow recommended actions for intervention\n8. Monitor high-risk employees regularly",
    
    "How do I view AI dashboard insights?": "To view AI dashboard insights:\n\n1. Go to the Dashboard or AI Dashboard section\n2. View comprehensive AI-powered analytics:\n   - Candidate screening statistics (today, this week, this month)\n   - Training needs by department and priority\n   - Recent AI recommendations\n3. Click on any insight to view detailed information\n4. Use insights to make data-driven HR decisions\n5. Refresh to get the latest AI analysis"
  },
  
  faculty: {
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Leave Request' or the '+' button\n3. Select the type of leave (sick, vacation, personal, undertime, etc.)\n4. Choose start and end dates (and times for undertime)\n5. Provide a reason for the leave\n6. Upload any supporting documents (medical certificate, etc.)\n7. Submit the request\n\nYou'll receive email notifications about the status of your request.",
    
    "How do I upload documents?": "To upload documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button (or 'Choose File' in the upload table)\n3. Select the document type (certificate, ID, TIN, SSS, etc.)\n4. Choose a file from your computer — only PDF and images are accepted (JPG, PNG, GIF, WEBP)\n5. Click to upload and wait for confirmation\n6. Wait for admin approval\n\nTo preview a document, click the eye icon next to the file; you can also use 'Open in new tab' in the preview modal.",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find colleagues:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information and employment details\n5. Use quick actions to send email or contact colleagues",
    
    "How do I update my personal information?": "To update your personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon\n3. Update the information you need to change\n4. Click 'Save' to apply changes\n\nMake sure to keep your contact information current for important notifications.",
    
    "How do I view my leave request status?": "To view your leave request status:\n\n1. Go to the Leave Request section\n2. You'll see all your leave requests listed\n3. Each request shows its current status (Pending, Approved, Returned)\n4. Click on a request to view full details\n5. Check for any comments or feedback from administrators",
    
    "How do I view my performance reviews?": "To view your performance reviews:\n\n1. Go to the Performance section\n2. You'll see a list of your performance reviews\n3. Click on a review to view details:\n   - KPI scores\n   - Behavior scores\n   - Attendance scores\n   - Total score\n   - Remarks and feedback\n   - Goals and achievements\n4. You can add comments on your reviews\n5. View your performance goals and track progress",
    
    "How do I view my performance goals?": "To view your performance goals:\n\n1. Go to the Performance section\n2. Navigate to Goals or Performance Goals\n3. View all your assigned goals with:\n   - Goal title and description\n   - Status (NotStarted, InProgress, OnTrack, Completed, etc.)\n   - Progress percentage\n   - Due dates\n4. Track your progress and update goal status\n5. Goals are linked to your performance reviews",
    
    "How do I view training recommendations?": "To view AI training recommendations:\n\n1. Go to the Performance or Training section\n2. Navigate to Training Recommendations\n3. View AI-generated recommendations based on:\n   - Your current skills vs position requirements\n   - Skill gaps identified\n   - Performance improvement areas\n4. Each recommendation includes:\n   - Training title and description\n   - Estimated hours\n   - Priority level (Low, Medium, High, Critical)\n5. Review your training history and completed courses\n6. Enroll in recommended training programs",
    
    "How do I view my schedule?": "To view your teaching schedule:\n\n1. Go to the My Schedule section\n2. You'll see your complete weekly schedule organized by day\n3. View all your classes with:\n   - Subject names\n   - Section names\n   - Day and time\n   - Duration\n4. Check the summary statistics:\n   - Total number of classes\n   - Number of different subjects\n   - Number of different sections\n   - Total hours per week\n5. View any advisory classes you're assigned to\n6. Download your schedule as PDF using the download button\n\nThe schedule shows all your teaching assignments for the current semester.",
    
    "What is my teaching schedule?": "To view your teaching schedule:\n\n1. Navigate to the My Schedule section in the faculty dashboard\n2. Your schedule will display:\n   - All classes organized by day (Monday through Saturday)\n   - Subject and section for each class\n   - Time slots and duration\n   - Summary statistics\n3. You can download your schedule as a PDF for your records\n4. If you don't see any schedule, contact the administrator as your schedule may not be assigned yet",
    
    "How do I see my classes?": "To see your classes:\n\n1. Go to the My Schedule section\n2. Your schedule displays all your teaching assignments:\n   - Organized by day of the week\n   - Shows subject name, section name, time, and duration\n3. View summary information:\n   - Total classes you teach\n   - Number of subjects\n   - Number of sections\n   - Total hours per week\n4. Check advisory classes if you're assigned as an adviser\n5. Download the schedule as PDF if needed",
    
    "Where is my schedule?": "Your teaching schedule is available in the My Schedule section:\n\n1. Navigate to My Schedule in the faculty dashboard\n2. View your weekly schedule with all classes\n3. See classes organized by day with subject, section, and time information\n4. Check the summary for total classes, subjects, sections, and hours\n5. Download as PDF if you need a copy\n\nIf you can't find your schedule or it appears empty, please contact the administrator to ensure your schedule has been assigned.",
    
    "How do I download my schedule?": "To download your schedule as PDF:\n\n1. Go to the My Schedule section\n2. Make sure your schedule is loaded\n3. Click the 'Download Schedule (PDF)' button at the top right\n4. The PDF will include:\n   - Your name and faculty information\n   - Complete weekly schedule organized by day\n   - Summary statistics\n   - All classes with subject, section, time, and duration\n5. The file will be saved with a filename including your name and date\n\nYou can use this PDF for your records or to share with others if needed."
    
    // Performance module hidden for now
    // "How do I view promotion analysis?": "To view your promotion analysis:\n\n1. Go to the Performance section\n2. Navigate to Promotion Analysis or AI Dashboard\n3. View AI-generated promotion eligibility analysis:\n   - Eligibility score\n   - Recommendation (Ready, Consider, NeedsDevelopment, NotReady)\n   - Strengths and development areas\n   - Next steps for promotion readiness\n4. This analysis considers your performance, goals, training, and tenure"
  },
  
  employee: {
    "How do I update my personal information?": "To update my personal information:\n\n1. Go to the Personal Data section\n2. Click 'Edit' or the pencil icon\n3. Update the information you need to change\n4. Click 'Save' to apply changes\n\nMake sure to keep your contact information current for important notifications.",
    
    "How do I submit a leave request?": "To submit a leave request:\n\n1. Go to the Leave Request section\n2. Click 'New Request' or the '+' button\n3. Fill in the leave details (dates, type, reason)\n4. Upload any required documents\n5. Submit the request\n\nYou'll be notified when your request is approved or rejected.",
    
    "How do I use the employee directory?": "To use the employee directory:\n\n1. Go to the Directory section\n2. Use the search filters to find colleagues:\n   - Search by employee name\n   - Filter by department\n   - Filter by position/job title\n   - Filter by years of service\n3. Click on an employee card to view their full profile\n4. View contact information and employment details\n5. Use quick actions to send email or contact colleagues",
    
    "How do I upload documents?": "To upload documents:\n\n1. Go to the Documents section\n2. Click 'Upload Document' or the '+' button\n3. Select the document type\n4. Choose a file from your computer — only PDF and images are accepted (JPG, PNG, GIF, WEBP)\n5. Add a description if needed\n6. Click 'Upload'\n7. Wait for admin approval\n\nTo preview a document, click the eye icon next to the file, or use 'Open in new tab' in the preview modal.",
    
    // Performance module hidden for now
    // "How do I view my performance reviews?": "To view your performance reviews:\n\n1. Go to the Performance section\n2. You'll see a list of your performance reviews\n3. Click on a review to view details:\n   - KPI scores\n   - Behavior scores\n   - Attendance scores\n   - Total score\n   - Remarks and feedback\n   - Goals and achievements\n4. You can add comments on your reviews\n5. View your performance goals and track progress",
    
    // "How do I view my performance goals?": "To view your performance goals:\n\n1. Go to the Performance section\n2. Navigate to Goals or Performance Goals\n3. View all your assigned goals with:\n   - Goal title and description\n   - Status (NotStarted, InProgress, OnTrack, Completed, etc.)\n   - Progress percentage\n   - Due dates\n4. Track your progress and update goal status\n5. Goals are linked to your performance reviews",
    
    "How do I view training recommendations?": "To view AI training recommendations:\n\n1. Go to the Training section\n2. Navigate to Training Recommendations\n3. View AI-generated recommendations based on:\n   - Your current skills vs position requirements\n   - Skill gaps identified\n4. Each recommendation includes:\n   - Training title and description\n   - Estimated hours\n   - Priority level (Low, Medium, High, Critical)\n5. Review your training history and completed courses\n6. Enroll in recommended training programs"
    
    // Performance module hidden for now
    // "How do I view promotion analysis?": "To view your promotion analysis:\n\n1. Go to the Performance section\n2. Navigate to Promotion Analysis or AI Dashboard\n3. View AI-generated promotion eligibility analysis:\n   - Eligibility score\n   - Recommendation (Ready, Consider, NeedsDevelopment, NotReady)\n   - Strengths and development areas\n   - Next steps for promotion readiness\n4. This analysis considers your performance, goals, training, and tenure"
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Check if we have a direct answer in our training data (with intelligent matching)
    const trainingData = TRAINING_DATA[userRole as keyof typeof TRAINING_DATA] || TRAINING_DATA.faculty;
    const directAnswer = findTrainingDataAnswer(message, trainingData);
    
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
        
        // Check if quota limit is 0 (no retries should be attempted)
        const isQuotaZero = error instanceof Error && (
          error.message.includes('limit: 0') ||
          error.message.includes('quota: 0') ||
          (error.message.includes('Quota exceeded') && error.message.includes('limit: 0'))
        );
        
        // If quota is 0, try training data one more time before showing fallback
        if (isQuotaZero) {
          // Try to find answer in training data with more flexible matching
          const fallbackAnswer = findTrainingDataAnswer(message, trainingData);
          if (fallbackAnswer) {
            return NextResponse.json({ 
              response: formatResponse(fallbackAnswer),
              fallback: true 
            });
          }
          
          // If no training data match, show helpful fallback message
          const fallbackMessage = `I apologize, but the AI service is currently unavailable due to quota limits. 

However, I can still help you with common questions about the SJSFI HRMS system. Try asking me:

${userRole === 'admin' ? `
• "How do I add a new employee?"
• "How do I approve leave requests?"
• "How do I manage employee documents?"
• "How do I use the employee directory?"
• "How do I manage recruitment?"
• "How do I manage performance reviews?"
• "How do I analyze promotion eligibility?"
• "How do I analyze training needs?"
• "How do I manage disciplinary actions?"
` : userRole === 'faculty' ? `
• "How do I submit a leave request?"
• "How do I upload documents?"
• "How do I view my schedule?"
• "How do I view my performance reviews?"
• "How do I view my performance goals?"
• "How do I view training recommendations?"
• "How do I use the employee directory?"
` : `
• "How do I update my personal information?"
• "How do I submit a leave request?"
• "How do I upload documents?"
• "How do I view my performance reviews?"
• "How do I view my performance goals?"
• "How do I view training recommendations?"
`}

For more specific help, please contact your HR administrator or IT support.`;

          return NextResponse.json({ 
            response: formatResponse(fallbackMessage),
            fallback: true 
          });
        }
        
        // Check if it's a retryable error (429 or 503)
        const is429Error = error instanceof Error && (
          error.message.includes('429') || 
          error.message.includes('Too Many Requests') ||
          error.message.includes('quota') ||
          error.message.includes('Quota exceeded')
        );
        const is503Error = error instanceof Error && error.message.includes('503');
        
        if ((is429Error || is503Error) && retryCount < MAX_RETRIES) {
          retryCount++;
          
          // Try to extract retry delay from error message for 429 errors
          let delay = BASE_DELAY * Math.pow(2, retryCount - 1);
          
          if (is429Error) {
            // Extract retry delay from error message if available
            const retryDelayMatch = error.message.match(/retry in ([\d.]+)s/i) || 
                                   error.message.match(/retryDelay["']:\s*"(\d+)s"/i);
            if (retryDelayMatch) {
              const extractedDelay = parseFloat(retryDelayMatch[1]) * 1000; // Convert to milliseconds
              delay = Math.min(extractedDelay, MAX_RETRY_DELAY); // Cap at max delay
            } else {
              // For 429 errors, use longer exponential backoff
              delay = Math.min(BASE_DELAY * Math.pow(2, retryCount) * 5, MAX_RETRY_DELAY);
            }
          }
          
          console.log(`Retry attempt ${retryCount}/${MAX_RETRIES} after ${delay}ms delay`);
          await wait(delay);
          continue;
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
      // Check for quota/rate limit errors
      const isQuotaError = error.message.includes('429') || 
                          error.message.includes('Too Many Requests') ||
                          error.message.includes('quota') ||
                          error.message.includes('Quota exceeded');
      
      if (isQuotaError) {
        return NextResponse.json(
          { 
            error: 'AI service quota has been exceeded. Please try again later or contact support.',
            details: 'The AI service is currently at capacity. Please wait a few minutes before trying again.',
            retryAfter: 60 // Suggest retrying after 60 seconds
          },
          { status: 429 }
        );
      }
      
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