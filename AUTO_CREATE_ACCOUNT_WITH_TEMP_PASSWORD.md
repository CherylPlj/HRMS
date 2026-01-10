# Auto-Create Account with Temporary Password for Hired Employees

## Overview
When an applicant's status is changed to "Hired", the system now automatically:
1. Creates a User account in the database
2. Creates a Clerk account with a secure temporary password
3. Assigns the "employee" role
4. Sends an email with login credentials
5. Forces password change on first login for security

## Key Features

### 🔐 Security First
- **Temporary passwords** are randomly generated with high complexity
- **Password requirements**: 12 characters, uppercase, lowercase, numbers, and special characters
- **Forced password change** on first login
- **One-time use**: Temporary passwords must be changed immediately
- **Secure transmission**: Passwords sent only once via email

### 📧 Direct Access
- No invitation links required
- Immediate account access
- Clear, professional email with credentials
- Step-by-step login instructions

### ✅ User Experience
- Dedicated password change page
- Real-time password strength indicator
- Visual password requirements checklist
- Clear security instructions
- Seamless redirect to dashboard after password change

## Implementation Details

### 1. Secure Temporary Password Generation

**Function**: `generateTemporaryPassword()`
**Location**: `src/app/api/candidates/[id]/route.ts`

```typescript
function generateTemporaryPassword(): string {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  // Ensures at least one of each character type
  // Returns a shuffled 12-character password
}
```

**Features**:
- 12 characters minimum
- Guaranteed mix of character types
- Cryptographically randomized
- Unique for each user

### 2. User Account Creation

**Function**: `createUserAccountForHiredEmployee()`
**Location**: `src/app/api/candidates/[id]/route.ts`

**Process**:
1. Check for existing user (prevent duplicates)
2. Generate UserID and temporary password
3. Create User record in database with `RequirePasswordChange: true`
4. Assign "employee" role via UserRole table
5. Create Clerk user with password (not invitation)
6. Update User record with ClerkID
7. Return success status and temporary password

**Error Handling**:
- Duplicate user detection
- Orphaned account cleanup
- Retry logic (up to 3 attempts)
- Database rollback on failure
- Comprehensive logging

### 3. Enhanced Email Template

**Function**: `generateStatusUpdateEmail()`
**Location**: `src/lib/email.ts`

**New Parameters**:
- `temporaryPassword`: The generated password
- `candidateEmail`: User's email address for login

**Email Content**:
- 🎉 Welcome message
- 📋 Login credentials table (Email, Temporary Password, System URL)
- ⚠️ Security steps and instructions
- 🔗 Direct "Login to HRMS Now" button
- ⚡ Password requirements reminder
- 🗑️ Instruction to delete email after password change

### 4. Database Schema Changes

**Table**: `User`
**New Column**: `RequirePasswordChange` (Boolean)

```sql
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "RequirePasswordChange" BOOLEAN NOT NULL DEFAULT false;
```

**Purpose**: Flag users who must change their password on next login

**Migration**: `migrations/add_require_password_change.sql`

### 5. Password Change Page

**File**: `src/app/change-password/page.tsx`

**Features**:
- ✅ Current password verification
- ✅ Real-time password strength indicator
- ✅ Visual password requirements checklist
- ✅ Password match validation
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

**Password Requirements**:
- Minimum 8 characters (recommended 12+)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)
- Must be different from current password

**User Flow**:
1. User enters current (temporary) password
2. User creates new strong password
3. User confirms new password
4. Real-time validation feedback
5. Password updated in Clerk
6. `RequirePasswordChange` flag set to false
7. Redirect to dashboard

### 6. Middleware Protection

**File**: `src/middleware.ts`

**Changes**:
- Added password change status check
- Redirect to `/change-password` if `RequirePasswordChange === true`
- Skip check for password change routes and APIs
- Prevent access to dashboard until password changed

**Protected Routes**: All authenticated routes except:
- `/change-password`
- `/api/user/password-change-status`
- `/api/user/update-password-flag`
- `/sign-out`

### 7. API Endpoints

#### Check Password Change Status
**Endpoint**: `GET /api/user/password-change-status`
**Parameters**: `userId` (query param)
**Response**: `{ requirePasswordChange: boolean }`
**Purpose**: Check if user needs to change password

#### Update Password Change Flag
**Endpoint**: `POST /api/user/update-password-flag`
**Body**: `{ userId, requirePasswordChange }`
**Response**: `{ success: boolean }`
**Purpose**: Update flag after successful password change

## Complete Flow Diagram

```
1. HR Marks Applicant as "Hired"
           ↓
2. System Generates Temporary Password
           ↓
3. Create User Record (RequirePasswordChange: true)
           ↓
4. Assign Employee Role
           ↓
5. Create Clerk Account with Password
           ↓
6. Update User with ClerkID
           ↓
7. Send Email with Credentials
           ↓
8. Employee Receives Email
           ↓
9. Employee Clicks Login Button / Opens HRMS URL
           ↓
10. Employee Enters Email + Temporary Password
           ↓
11. Middleware Detects RequirePasswordChange = true
           ↓
12. Redirect to /change-password Page
           ↓
13. Employee Changes Password
           ↓
14. Password Updated in Clerk
           ↓
15. RequirePasswordChange Set to false
           ↓
16. Redirect to Dashboard
           ↓
17. ✅ Employee Can Now Use System
```

## Email Example

**Subject**: Welcome to Saint Joseph School of Fairview Inc. - Your Account Credentials

**Content Highlights**:
```
🎉 Your HRMS Account Has Been Created!

🔐 Your Login Credentials
Email: john.doe@example.com
Temporary Password: Xy9@kL2mP!q8
System URL: https://hrms-v2-azure.vercel.app

⚠️ Important Security Steps:
1. Login to the system using your email and temporary password
2. You will be required to change your password immediately
3. Choose a strong, unique password
4. Do not share your password with anyone
5. Delete this email after changing your password

[Login to HRMS Now →]
```

## Security Considerations

### Password Security
- ✅ Temporary passwords are one-time use
- ✅ Forced password change on first login
- ✅ Strong password requirements enforced
- ✅ Passwords never logged or stored in plain text
- ✅ Email should be deleted after password change

### Account Security
- ✅ Clerk handles authentication securely
- ✅ User locked out of system until password changed
- ✅ No backdoor access without password change
- ✅ Audit trail via logs

### Email Security
- ✅ Credentials sent only once
- ✅ Clear instructions to delete email
- ✅ HTTPS-only system access
- ✅ No password recovery from temporary password

## Testing Checklist

### Test Case 1: Normal Hiring Flow
- [ ] Mark candidate as "Hired"
- [ ] Verify User account created in database
- [ ] Verify `RequirePasswordChange = true`
- [ ] Verify employee role assigned
- [ ] Verify Clerk user created (not invitation)
- [ ] Verify email received with credentials
- [ ] Login with temporary password
- [ ] Verify redirect to `/change-password`
- [ ] Change password successfully
- [ ] Verify redirect to dashboard
- [ ] Verify `RequirePasswordChange = false`
- [ ] Can access all features normally

### Test Case 2: Temporary Password Security
- [ ] Temporary password meets complexity requirements
- [ ] Cannot skip password change page
- [ ] Cannot access dashboard without changing password
- [ ] Cannot reuse temporary password as new password
- [ ] New password must meet all requirements

### Test Case 3: Duplicate User Handling
- [ ] Create candidate with existing user email
- [ ] Mark as "Hired"
- [ ] Verify no duplicate user created
- [ ] Verify email still sent correctly

### Test Case 4: Clerk Account Failure
- [ ] Simulate Clerk API failure
- [ ] Verify database rollback
- [ ] Verify proper error logging
- [ ] Verify candidate status update handles gracefully

### Test Case 5: Password Change Validation
- [ ] Current password required
- [ ] New password must meet requirements
- [ ] Passwords must match
- [ ] Cannot use current password as new password
- [ ] Visual requirements checklist updates in real-time
- [ ] Password strength indicator works correctly

## Configuration Requirements

### Environment Variables
- `CLERK_SECRET_KEY`: For Clerk API access
- `NEXT_PUBLIC_APP_URL`: HRMS system URL (https://hrms-v2-azure.vercel.app)
- `GMAIL_USER`: For sending emails
- `GMAIL_APP_PASSWORD`: Gmail SMTP credentials
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase admin access

### Database Requirements
- User table with `RequirePasswordChange` column
- Role table with 'employee' role
- UserRole junction table
- Candidate table with UserID column

### Migration Required
Run the SQL migration:
```bash
# Apply migration
psql -d your_database < migrations/add_require_password_change.sql
```

Or use Prisma:
```bash
npx prisma db push
```

## Benefits Over Invitation System

### For Users
1. **Immediate Access**: No waiting for invitation email
2. **Simpler Process**: Just login with provided credentials
3. **Clear Instructions**: All info in one email
4. **Faster Onboarding**: One less step in the process

### For Administrators
1. **No Invitation Management**: No need to track invitation status
2. **Reduced Support**: Fewer "where's my invitation" tickets
3. **Better Control**: Direct account creation
4. **Audit Trail**: Clear record of account creation

### For Security
1. **Forced Password Change**: Users must create their own password
2. **One-Time Passwords**: Temporary passwords can't be reused
3. **Secure by Default**: User locked out until password changed
4. **Email Cleanup**: Instructions to delete credentials email

## Troubleshooting

### Issue: User Can't Login with Temporary Password
**Solution**: 
- Verify email address is correct
- Check Clerk dashboard for account status
- Verify password was copied correctly (no extra spaces)
- Check if account is active in database

### Issue: Not Redirected to Password Change Page
**Solution**:
- Verify `RequirePasswordChange` flag in database
- Check middleware is running correctly
- Clear browser cache and cookies
- Check console for errors

### Issue: Password Change Fails
**Solution**:
- Verify current password is correct
- Ensure new password meets all requirements
- Check Clerk API status
- Verify user has correct permissions

### Issue: Stuck on Password Change Page After Changing Password
**Solution**:
- Verify `RequirePasswordChange` updated to false
- Check API endpoint responses
- Clear browser cache
- Try logging out and back in

## Related Files

**Core Implementation**:
- `src/app/api/candidates/[id]/route.ts` - Account creation logic
- `src/lib/email.ts` - Email templates
- `src/app/change-password/page.tsx` - Password change UI
- `src/middleware.ts` - Authentication middleware

**API Endpoints**:
- `src/app/api/user/password-change-status/route.ts`
- `src/app/api/user/update-password-flag/route.ts`

**Database**:
- `prisma/schema.prisma` - User model with RequirePasswordChange
- `migrations/add_require_password_change.sql` - Database migration

**Documentation**:
- `CLERK_INVITE_FOR_HIRED_EMPLOYEES.md` - Original invitation-based approach (deprecated)

---

**Last Updated**: January 2026  
**Version**: 2.0  
**Approach**: Direct Account Creation with Temporary Password  
**Security Level**: High (Forced Password Change)
