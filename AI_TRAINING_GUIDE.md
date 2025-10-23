# AI Training Guide for SJSFI HRMS Chatbot

## Overview
This guide explains how to train and improve the AI chatbot to provide better, more accurate responses for your HRMS system.

## Current Implementation

### 1. System Prompts
The AI uses role-specific system prompts that provide context about:
- User responsibilities and permissions
- Available features and sections
- Guidelines for responses
- System-specific information

### 2. Training Data
Pre-defined Q&A pairs for common questions:
- **Admin questions**: Faculty management, document approval
- **Faculty questions**: Personal data, leave requests
- **Employee questions**: Information updates, leave requests

### 3. Context-Aware Responses
The AI receives:
- User role (admin/faculty/employee)
- System context and features
- Specific guidelines for each role

## How to Improve AI Training

### 1. Expand Training Data

Add more Q&A pairs to the `TRAINING_DATA` object in `src/app/api/chat/route.ts`:

```javascript
const TRAINING_DATA = {
  admin: {
    // Add more admin-specific questions
    "How do I reset a user's password?": "To reset a user's password:\n1. Go to User Management\n2. Find the user\n3. Click 'Reset Password'\n4. Send invitation email\n\nThe user will receive an email to set a new password.",
    
    // Add more questions...
  },
  faculty: {
    // Add more faculty-specific questions
    "How do I update my emergency contact?": "To update emergency contact:\n1. Go to Personal Data\n2. Click 'Edit'\n3. Update emergency contact section\n4. Save changes",
    
    // Add more questions...
  }
};
```

### 2. Update System Prompts

Modify the `SYSTEM_PROMPTS` to include:
- More specific feature descriptions
- Actual system workflows
- School-specific policies
- Contact information for support

### 3. Add Dynamic Context

Enhance the API to include:
- User's current location in the system
- Recent actions performed
- System status and notifications
- Real-time data when available

### 4. Implement Learning from Feedback

Add a feedback system:
```javascript
// Add to the chat API
const { message, userRole, feedback } = await request.json();

// Store feedback for improvement
if (feedback) {
  // Save feedback to database
  // Use for future training improvements
}
```

### 5. Create a Knowledge Base

Build a comprehensive knowledge base:

#### A. System Documentation
- Step-by-step guides for all features
- Screenshots and visual aids
- Video tutorials
- Troubleshooting guides

#### B. FAQ Database
- Common issues and solutions
- Error messages and fixes
- Best practices
- Policy information

#### C. Context-Sensitive Help
- Inline help tooltips
- Contextual suggestions
- Progressive disclosure of information

### 6. Implement Conversation Memory

Add conversation history to provide better context:

```javascript
// Store conversation context
const conversationContext = {
  userId: user.id,
  role: userRole,
  recentMessages: [],
  currentSection: activeSection,
  lastAction: lastAction
};
```

### 7. Add Intent Recognition

Implement better intent recognition:

```javascript
// Common intents for HRMS
const INTENTS = {
  'leave_requests': ['leave', 'vacation', 'sick', 'time off'],
  'document_upload': ['upload', 'document', 'file', 'certificate'],
  'profile_update': ['profile', 'personal', 'contact', 'update']
};
```

### 8. Create Training Scripts

Develop scripts to test and improve responses:

```javascript
// Test script for common scenarios
const testScenarios = [
  {
    role: 'admin',
    question: 'How do I add a new employee?',
    expectedKeywords: ['Employees', 'Add New', 'profile', 'save']
  },
  {
    role: 'faculty',
    question: 'How do I submit a leave request?',
    expectedKeywords: ['Leave Request', 'submit', 'dates', 'reason']
  }
];
```

### 9. Implement A/B Testing

Test different response styles:
- Formal vs. casual tone
- Detailed vs. concise answers
- Step-by-step vs. overview responses

### 10. Add Multilingual Support

If needed, add support for multiple languages:

```javascript
const LANGUAGE_PROMPTS = {
  en: { /* English prompts */ },
  es: { /* Spanish prompts */ },
  // Add more languages
};
```

## Best Practices

### 1. Regular Updates
- Update training data monthly
- Review and improve system prompts
- Add new features to the knowledge base

### 2. User Feedback
- Collect feedback on AI responses
- Use feedback to improve training data
- Monitor common questions and issues

### 3. Performance Monitoring
- Track response accuracy
- Monitor user satisfaction
- Analyze conversation patterns

### 4. Security and Privacy
- Never include sensitive data in training
- Ensure responses don't expose private information
- Follow data protection guidelines

## Quick Start Improvements

### Immediate Actions:
1. **Add your actual campus address** to the training data
2. **Update system-specific workflows** in the prompts
3. **Add contact information** for IT support
4. **Include actual feature names** from your system

### Short-term Goals:
1. **Collect user questions** and add them to training data
2. **Create system-specific FAQs**
3. **Add error message explanations**
4. **Implement feedback collection**

### Long-term Goals:
1. **Build comprehensive knowledge base**
2. **Implement conversation memory**
3. **Add multilingual support**
4. **Create advanced analytics**

## Testing Your Improvements

1. **Test with real users** - Have faculty and admin test the chatbot
2. **Monitor response quality** - Check if answers are helpful and accurate
3. **Gather feedback** - Ask users to rate responses
4. **Iterate and improve** - Use feedback to enhance training data

## Example: Adding a New Feature

When you add a new feature to your HRMS:

1. **Update system prompts** to include the new feature
2. **Add training data** with common questions about the feature
3. **Create step-by-step guides** for the feature
4. **Test the AI responses** for the new feature
5. **Collect user feedback** and improve responses

## Conclusion

The AI chatbot is now much more intelligent and context-aware. It will provide better, more accurate responses based on the user's role and the specific features of your HRMS system. 

To continue improving:
- Regularly update the training data
- Collect and act on user feedback
- Monitor performance and accuracy
- Expand the knowledge base as your system grows

The foundation is now in place for a highly effective AI assistant that truly understands your HRMS system and can help users navigate it effectively. 