# Out-of-Scope Message Examples

## What the Chatbot Will Handle

The SJSFI HRMS chatbot is designed to help with HRMS-related tasks only. Here are examples of appropriate responses for out-of-scope messages:

## Examples of Out-of-Scope Messages

### 1. **Weather Questions**
**User:** "What's the weather like today?"
**Response:** 
```
I'm here to help you with SJSFI HRMS faculty features. I can assist you with:

• Updating your personal information
• Submitting and tracking leave requests
• Recording and viewing attendance
• Uploading and managing documents
• Viewing your schedule and records
• General HRMS navigation

Please ask me about any of these faculty-related topics, and I'll be happy to help!
```

### 2. **General Questions**
**User:** "Tell me a joke"
**Response:** Same as above - redirects to HRMS features

### 3. **Personal Advice**
**User:** "I'm having relationship problems"
**Response:** Same as above - redirects to HRMS features

### 4. **Academic Questions**
**User:** "How do I solve this math problem?"
**Response:** Same as above - redirects to HRMS features

### 5. **News/Current Events**
**User:** "What's happening in the news?"
**Response:** Same as above - redirects to HRMS features

### 6. **Technology Questions**
**User:** "How do I program in Python?"
**Response:** Same as above - redirects to HRMS features

### 7. **Health/Medical Questions**
**User:** "I have a headache, what should I do?"
**Response:** Same as above - redirects to HRMS features

### 8. **Financial Questions**
**User:** "How should I invest my money?"
**Response:** Same as above - redirects to HRMS features

## Role-Specific Responses

### **For Admins:**
The response will mention:
- Managing faculty and employee profiles
- Processing leave requests and approvals
- Generating attendance reports
- Managing documents and permissions
- Recruitment and hiring processes
- User management and system administration

### **For Faculty:**
The response will mention:
- Updating personal information
- Submitting and tracking leave requests
- Recording and viewing attendance
- Uploading and managing documents
- Viewing schedule and records
- General HRMS navigation

### **For Employees:**
The response will mention:
- Updating personal information
- Submitting leave requests
- Viewing attendance records
- Managing documents
- Accessing employee portal
- General HRMS navigation

## Keywords That Trigger Out-of-Scope Detection

The chatbot detects out-of-scope messages based on keywords including:

- **General Topics:** weather, news, sports, entertainment, movies, music, games
- **Personal Topics:** cooking, recipes, travel, vacation, shopping, fashion
- **Academic Topics:** politics, religion, philosophy, science, history, geography
- **Health Topics:** health, medical, doctor, hospital, medicine, therapy
- **Financial Topics:** financial, investment, banking, insurance, taxes
- **Technology Topics:** technology, programming, coding, software, hardware
- **Social Media:** social media, facebook, instagram, twitter, tiktok
- **Gaming:** gaming, video games, playstation, xbox, nintendo
- **Entertainment:** jokes, humor, comedy, funny, memes
- **Other:** random, trivia, facts, quotes, poetry, current events

## Benefits of This Approach

1. **Stays Focused:** Keeps the chatbot focused on HRMS tasks
2. **Professional:** Maintains a professional tone
3. **Helpful:** Still provides value by redirecting to relevant features
4. **Consistent:** Provides consistent responses across all roles
5. **User-Friendly:** Politely explains what the chatbot can help with

## Implementation

The out-of-scope detection is implemented in the chat API with:
- Keyword-based detection
- Role-specific response templates
- Proper formatting and spacing
- Consistent messaging across all user types 