# Environment Variables Setup Guide

## Database Connection Issue Fix

The "prepared statement does not exist" error is caused by improper Prisma configuration with Supabase connection pooling.

## Required Environment Variables

### For Local Development (.env.local)
```env
# Supabase Database URLs
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=0"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Google AI API Key
GOOGLE_AI_API_KEY="your_google_ai_api_key_here"

# Other required variables...
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

### For Vercel Production
Set these environment variables in your Vercel dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Required Variables:
- **DATABASE_URL**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=0`
- **DIRECT_URL**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`
- **GOOGLE_AI_API_KEY**: Your Google AI API key

## How to Get Your Supabase Connection Strings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Copy the connection strings from the "Connection string" section

## Important Notes

1. **DATABASE_URL** includes connection pooling parameters (`?pgbouncer=true&connection_limit=1&pool_timeout=0`)
2. **DIRECT_URL** is the direct connection without pooling
3. Both URLs are required for Prisma to work correctly with Supabase
4. Make sure to replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your actual values

## Testing the Connection

After setting up the environment variables:

1. **Locally**: Run `npm run dev` and visit `http://localhost:3000/api/test-db`
2. **Production**: Visit `https://your-domain.vercel.app/api/test-db`

## Troubleshooting

### If you still get "prepared statement does not exist":
1. Check that both `DATABASE_URL` and `DIRECT_URL` are set
2. Verify the connection strings are correct
3. Make sure your Supabase database is active
4. Try regenerating the Prisma client: `npx prisma generate`

### If you get authentication errors:
1. Check your database password in the connection strings
2. Regenerate your database password in Supabase if needed

### If the chatbot still doesn't work:
1. Check the browser console for errors
2. Check Vercel function logs
3. Test the `/api/test-db` endpoint first 