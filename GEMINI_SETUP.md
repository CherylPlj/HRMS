# Gemini AI Chatbot Setup Guide

## Prerequisites

1. **Google AI Studio Account**: You need a Google account to access Google AI Studio
2. **API Key**: Generate an API key from Google AI Studio

## Setup Instructions

### 1. Get Your Google API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

Create a `.env.local` file in your project root and add:

```env
GOOGLE_AI_API_KEY=your_actual_api_key_here
```

**Important**: Replace `your_actual_api_key_here` with the API key you generated in step 1.

### 3. Restart Your Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## Features

The chatbot now includes:

- **Real AI Responses**: Powered by Google's Gemini AI
- **HR-Specific Knowledge**: Tailored for SJSFI HR inquiries
- **Loading States**: Visual feedback while AI is processing
- **Error Handling**: Graceful fallbacks if API is unavailable
- **Professional Interface**: Clean, user-friendly design

## Supported Topics

The chatbot can help with:

- Leave policies and procedures
- Attendance and time tracking
- Employee benefits and policies
- General HR inquiries
- Document requirements
- Work schedules and arrangements

## Troubleshooting

### API Key Not Working
- Ensure the API key is correctly copied from Google AI Studio
- Check that the environment variable is named exactly `GOOGLE_AI_API_KEY`
- Restart your development server after adding the environment variable

### Chatbot Not Responding
- Check the browser console for error messages
- Verify your internet connection
- Ensure the API key has proper permissions

### Rate Limiting
- Google AI has rate limits on free tier
- Consider upgrading to a paid plan for higher usage

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- The API key is only used server-side in the API route 