   This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# HRMS System

## Repository Structure

For an overview of directories and key modules, see `docs/file-structure.md`.

## Email Configuration

To enable email sending for account invitations and notifications, you need to configure the following environment variables:

### Gmail Configuration

1. Create a Gmail account or use an existing one
2. Enable 2-factor authentication on your Gmail account
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
4. Add these environment variables to your `.env.local` file:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### Required Environment Variables

Make sure these are also set in your `.env.local`:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=http://localhost:3000/dashboard

# Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### Email Features

When properly configured, the system will:
- Send welcome emails when creating new user accounts
- Send reactivation emails when reactivating soft-deleted users
- Include account details and setup instructions
- Send Clerk invitation emails for account completion

### Testing Email Configuration

To test if email is working:
1. Create a new user account through the admin panel
2. Check that two emails are sent:
   - Welcome email from your Gmail account (with account details)
   - Invitation email from Clerk (with account setup link)

If emails aren't being sent, check the server console for error messages related to email configuration.

## Troubleshooting

### Clerk Authentication Issues

#### Clock Skew Errors

If you see errors like:
```
JWT issued at date claim (iat) is in the future
Clerk: Clock skew detected
```

**Solution:**
1. **Sync your system clock** - This is the primary fix:
   - **Windows**: 
     - Right-click on the time in the taskbar
     - Select "Adjust date/time"
     - Turn off "Set time automatically", wait a few seconds, then turn it back on
     - Or run `w32tm /resync` in PowerShell as Administrator
   - **macOS**: 
     - System Preferences → Date & Time
     - Uncheck and recheck "Set date and time automatically"
   - **Linux**: 
     - `sudo ntpdate -s time.nist.gov` or `sudo timedatectl set-ntp true`

2. The middleware has been updated to handle clock skew gracefully in development mode, but you should still sync your system clock for the best experience.

#### Infinite Redirect Loops

If you experience infinite redirect loops when signing in:

**Causes:**
- Mismatched Clerk keys (publishable key and secret key don't match)
- System clock is significantly out of sync
- Middleware redirect logic conflicts

**Solutions:**
1. **Verify Clerk Keys**: Ensure your `.env.local` has the correct keys from your Clerk dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` should match your Clerk instance
   - `CLERK_SECRET_KEY` should match the same Clerk instance

2. **Clear Browser Data**: Clear cookies and local storage, then try again

3. **Check System Clock**: Follow the clock skew solution above

4. **Check Middleware**: The middleware has been updated with redirect loop protection. If issues persist, check the browser console and server logs for specific error messages.

#### Token Refresh Issues

If you see "Refreshing the session token resulted in an infinite redirect loop":

**Solutions:**
1. Verify your Clerk keys are correct (see above)
2. Ensure your system clock is synced
3. Clear browser cookies for your development domain
4. Restart your development server

The middleware now handles these errors gracefully and will log warnings instead of causing redirect loops.

