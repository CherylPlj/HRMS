# Automatic Clerk Invitation for Hired Employees

## Overview
When an applicant's status is changed to "Hired", the system now automatically:
1. Creates a User account in the database
2. Assigns the "employee" role to the user
3. Sends a Clerk invitation email for account setup
4. Sends a welcome email with account setup instructions

## Implementation Details

### 1. Helper Function: `createUserAccountForHiredEmployee()`
**Location:** `src/app/api/candidates/[id]/route.ts`

This function handles the complete user account creation process:
- Checks if user already exists (prevents duplicates)
- Generates a unique UserID
- Creates a User record in the database
- Assigns the "employee" role via UserRole table
- Creates a Clerk invitation with retry logic (handles edge cases)
- Updates the User record with the invitation ID
- Includes proper error handling and cleanup

**Features:**
- Retry logic for Clerk API calls (up to 3 attempts)
- Orphaned account cleanup if needed
- Comprehensive error logging
- Returns success status and userId for tracking

### 2. Enhanced Email Template: `generateStatusUpdateEmail()`
**Location:** `src/lib/email.ts`

Updated to accept an optional `accountCreated` parameter:
```typescript
function generateStatusUpdateEmail(
  candidateName: string, 
  vacancyName: string, 
  newStatus: string, 
  offerLink?: string, 
  accountCreated?: boolean
)
```

**New Email Content for Hired Status:**
When `accountCreated = true`, the email includes:
- 🎉 Congratulatory message with account creation confirmation
- Step-by-step instructions for completing account setup
- Information about the Clerk invitation email
- System access URL
- Reminder to check spam folder
- Professional styling with green success theme

### 3. Updated PATCH Endpoint
**Location:** `src/app/api/candidates/[id]/route.ts`

When candidate status changes to "Hired":
1. Calls `createUserAccountForHiredEmployee()` to create account
2. Updates the Candidate record with the new UserID
3. Sends welcome email with account information
4. Gracefully handles failures (email still sent even if account creation fails)

**Code Flow:**
```typescript
else if (Status === 'Hired') {
  let accountCreated = false;
  
  // Create User account and Clerk invitation
  const userCreationResult = await createUserAccountForHiredEmployee(
    Email, FirstName, LastName, parseInt(id)
  );

  if (userCreationResult.success) {
    accountCreated = true;
    // Update candidate with UserID
    await supabaseAdmin
      .from('Candidate')
      .update({ UserID: userCreationResult.userId })
      .eq('CandidateID', id);
  }

  // Send email with account information
  await sendEmail({
    to: Email,
    subject: 'Welcome to Saint Joseph School of Fairview Inc. - Application Status Update',
    html: generateStatusUpdateEmail(formattedName, vacancyName, Status, undefined, accountCreated)
  });
}
```

## Email Flow

### Step 1: HR marks candidate as "Hired"
The system automatically triggers the account creation process.

### Step 2: System creates User account
- User record created in database
- Employee role assigned
- Clerk invitation sent

### Step 3: Hired employee receives two emails

**Email 1: Welcome Email (from HRMS)**
- Subject: "Welcome to Saint Joseph School of Fairview Inc. - Application Status Update"
- Contains congratulatory message
- Provides step-by-step account setup instructions
- Links to HRMS system

**Email 2: Clerk Invitation Email (from Clerk)**
- Subject: "You've been invited to join [Organization]"
- Contains secure invitation link
- Allows user to set their password
- Redirects to HRMS dashboard after setup

### Step 4: Employee completes account setup
1. Clicks Clerk invitation link
2. Sets secure password
3. Gets redirected to HRMS dashboard
4. Can now access the system with their credentials

## Database Changes

### User Table
New records created with:
- `UserID`: Unique generated ID
- `Email`: Candidate's email (lowercase, trimmed)
- `FirstName` & `LastName`: From candidate record
- `Status`: Set to 'Invited'
- `invitationId`: Clerk invitation ID (updated after invitation sent)

### Candidate Table
Updated with:
- `UserID`: Links candidate to their user account

### UserRole Table
New record created:
- Links the User to the 'employee' Role

## Error Handling

### Duplicate User Prevention
- Checks if email already exists before creating account
- Returns existing UserID if user already exists

### Clerk API Failures
- Retry logic with 3 attempts
- Automatic cleanup of orphaned Clerk accounts
- Graceful degradation (email sent even if account creation fails)

### Email Failures
- Logged but don't block the hiring process
- User can be manually invited if needed

## Security Features

1. **Email Validation**: Lowercase and trimmed
2. **Password Hash**: Temporary secure hash generated
3. **Invitation Expiry**: Clerk handles invitation expiration
4. **Metadata Tracking**: CandidateID stored in Clerk metadata
5. **Role-Based Access**: Automatic employee role assignment

## Testing Recommendations

### Test Case 1: Normal Hiring Flow
1. Change candidate status to "Hired"
2. Verify User account created
3. Verify employee role assigned
4. Verify both emails received
5. Complete Clerk invitation
6. Login to HRMS successfully

### Test Case 2: Duplicate Email
1. Create candidate with existing user email
2. Mark as "Hired"
3. Verify no duplicate user created
4. Verify emails still sent correctly

### Test Case 3: Clerk API Failure
1. Simulate Clerk API failure
2. Verify error logged
3. Verify welcome email still sent (without account creation notice)
4. Verify candidate status still updated

### Test Case 4: Email Already in Clerk
1. Create candidate with email already in Clerk
2. Mark as "Hired"
3. Verify orphaned account cleanup
4. Verify new invitation sent successfully

## Configuration Requirements

### Environment Variables Required
- `CLERK_SECRET_KEY`: For Clerk API access
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Redirect after signup
- `NEXT_PUBLIC_APP_URL`: HRMS system URL (defaults to https://hrms-v2-azure.vercel.app)
- `GMAIL_USER`: For sending emails
- `GMAIL_APP_PASSWORD`: Gmail SMTP credentials

### Database Requirements
- User table with proper schema
- Role table with 'employee' role
- UserRole junction table
- Candidate table with UserID column

## Benefits

1. **Automation**: No manual account creation needed
2. **Consistency**: Every hired employee gets an account
3. **Security**: Uses Clerk's secure invitation system
4. **User Experience**: Clear instructions and professional emails
5. **Reliability**: Robust error handling and retry logic
6. **Auditability**: All actions logged for tracking

## Future Enhancements

Potential improvements:
1. Custom email templates per department
2. Role assignment based on position
3. Automatic onboarding checklist creation
4. Integration with employee orientation system
5. Multi-language support for emails
6. SMS notifications in addition to email

## Support & Troubleshooting

### Common Issues

**Issue: Invitation email not received**
- Check spam/junk folder
- Verify email address is correct
- Check Clerk dashboard for invitation status
- Manually resend invitation from Clerk dashboard

**Issue: User already exists error**
- Verify email in User table
- Check Clerk dashboard for existing account
- May need to update existing user instead of creating new one

**Issue: Role not assigned**
- Verify 'employee' role exists in Role table
- Check UserRole table for record
- Can manually assign role through admin interface

### Logs to Check
- Server logs: Look for "Creating user account for hired employee"
- Clerk dashboard: Check invitation status
- Database: Verify User, UserRole records created
- Email service: Check Gmail sent folder

## Related Files

- `src/app/api/candidates/[id]/route.ts` - Main endpoint
- `src/lib/email.ts` - Email templates
- `src/lib/generateUserId.ts` - UserID generation
- `src/lib/supabaseAdmin.ts` - Database access
- `prisma/schema.prisma` - Database schema

---
**Last Updated:** January 2026
**Version:** 1.0
