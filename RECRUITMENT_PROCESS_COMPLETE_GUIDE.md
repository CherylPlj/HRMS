# Complete Recruitment Process in SJSFI HRMS

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Job Posting](#phase-1-job-posting)
3. [Phase 2: Application Submission](#phase-2-application-submission)
4. [Phase 3: Initial Screening](#phase-3-initial-screening)
5. [Phase 4: Interview Process](#phase-4-interview-process)
6. [Phase 5: Selection & Offer](#phase-5-selection--offer)
7. [Phase 6: Hiring & Onboarding](#phase-6-hiring--onboarding)
8. [Phase 7: First Login & Password Change](#phase-7-first-login--password-change)
9. [Phase 8: Active Employee](#phase-8-active-employee)
10. [Additional Features](#additional-recruitment-features)
11. [Security](#security-throughout-process)

---

## Overview

The SJSFI HRMS Recruitment System is a comprehensive, end-to-end recruitment and onboarding solution that automates the entire hiring process from job posting to employee activation.

**Key Features**:
- Public job posting portal
- Online application submission
- Automated email notifications
- Secure document management
- Interview scheduling
- Employee information collection
- Automatic account creation with credentials
- Forced password change security
- Role-based access control

---

## 📋 Phase 1: Job Posting

### 1.1 Create Vacancy
**Who**: HR Admin/Recruitment Manager  
**Where**: Dashboard → Recruitment → Vacancies

**Actions**:
Create new vacancy with the following details:

| Field | Description | Example |
|-------|-------------|---------|
| Job Title | Position type | Teacher, Principal, Admin Officer |
| Vacancy Name | Custom name for position | "Senior High School Math Teacher" |
| Description | Job responsibilities & requirements | Full job description |
| Number of Positions | How many to fill | 2 |
| Hiring Manager | Person responsible | "Ms. Rodriguez" |
| Date Posted | Publication date | Auto-set or manual |
| Status | Vacancy status | Active |

**Vacancy Statuses**:
- `Active` - Open for applications
- `Filled` - All positions filled (auto-set)
- `Closed` - Manually closed by HR

### 1.2 Public Job Posting
**Where**: `https://hrms-v2-azure.vercel.app/careers`

**Public Features**:
- Professional landing page with SJSFI branding
- List of all active vacancies
- "View All Job Openings" button
- Job details display
- "Apply Now" functionality
- Mobile-responsive design

**Information Displayed**:
- Position title
- Job description
- Requirements
- Number of openings
- Date posted
- How to apply

---

## 👥 Phase 2: Application Submission

### 2.1 Candidate Applies
**Who**: Job Applicant  
**Where**: Public application form (`/applicant`)

**Required Information**:

**Personal Information**:
- Last Name
- First Name
- Middle Name (optional)
- Extension Name (optional)
- Email Address
- Contact Number
- Date of Birth
- Sex/Gender

**Additional Contact Details** (Optional):
- Messenger Name
- Facebook Link

**Application Materials**:
- Resume/CV Upload (PDF/DOC/DOCX)
- Position Applied For (dropdown selection)

**Validation**:
- Email format check
- Phone number format
- Age validation (18-65)
- File type validation
- File size limit
- Required fields

### 2.2 Application Received
**System Actions**:

1. **Creates Candidate Record**:
   - Stores all personal information
   - Status: `Applied`
   - Uploads resume to secure storage
   - Generates unique CandidateID
   - Records submission timestamp

2. **Sends Email 1 - To Applicant**:
```
Subject: Application Received - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

Thank you for submitting your application to Saint Joseph School 
of Fairview Inc. This email confirms that we have received your 
application.

What happens next?
• Our HR team will review your application
• If your qualifications match our requirements, we will contact 
  you via email or phone for the next steps
• The review process typically takes 5-7 business days

If you have any questions or need to update your application, 
please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Please save this email for your records.

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

3. **Sends Email 2 - To HR Team** (`sjsfihrms@gmail.com`):
```
Subject: New Job Application Received

Dear HR Team,

A new job application has been submitted through the public 
application form.

Applicant Details:
  Full Name: [Name]
  Email: [Email]
  Contact Number: [Phone]
  Position Applied For: [Vacancy Name]
  Date Applied: [Date & Time]

Please log in to the HRMS system to review this application 
and proceed with the recruitment process.

Best regards,
HRMS System
```

---

## 🔍 Phase 3: Initial Screening

### 3.1 HR Reviews Applications
**Who**: HR Admin  
**Where**: Dashboard → Recruitment → Candidates Tab

**Available Features**:

**View Options**:
- List view with key candidate info
- Detailed candidate view
- Resume preview/download
- Application history

**Filter & Search**:
- By Vacancy
- By Status
- By Date Applied
- By Name/Email
- Date range

**Information Displayed**:
| Field | Description |
|-------|-------------|
| Full Name | Candidate's complete name |
| Email | Contact email |
| Phone | Contact number |
| Position | Vacancy applied for |
| Status | Current application status |
| Date Applied | Submission date |
| Resume | Download/Preview link |
| Actions | Edit/Delete/Status Change |

**Available Actions**:
- ✏️ **Edit** - Update candidate information
- 📅 **Schedule Interview** - Set interview date/time
- ✅ **Shortlist** - Move to next stage
- ❌ **Reject** - Mark as Returned
- 🗑️ **Delete** - Remove application (soft delete)
- 📧 **Send Email** - Manual email communication

### 3.2 Shortlist Candidates
**Status Change**: `Applied` → `Shortlisted`

**HR Actions**:
1. Review candidate resume and qualifications
2. Select candidates who meet requirements
3. Click "Shortlist" button
4. Confirm action

**Automated Email to Candidate**:
```
Subject: Application Status Update - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

This email is regarding your application for the [Vacancy Name] position.

Your application has been shortlisted. We will contact you soon 
with further details about the next steps.

If you have any questions, please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

---

## 🗓️ Phase 4: Interview Process

### 4.1 Schedule Interview
**Status Change**: `Shortlisted` → `InterviewScheduled`

**HR Actions**:
1. Select candidate
2. Click "Schedule Interview"
3. Set interview date and time
4. Confirm scheduling

**System Actions**:
- Updates candidate status
- Records interview date/time
- Sends automated email

**Automated Email to Candidate**:
```
Subject: Interview Schedule - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

We are pleased to inform you that your application for the 
[Vacancy Name] position has progressed to the next stage.

Your interview has been scheduled for:
┌────────────────────────────────────────┐
│ [Weekday, Month Day, Year]             │
│ [Time] (Philippine Time)               │
└────────────────────────────────────────┘

Important Notes:
• Please arrive 15 minutes before your scheduled time
• Bring a valid ID and a copy of your resume
• Dress appropriately for a professional interview
• Be prepared to discuss your qualifications and experience

Location: Saint Joseph School of Fairview Inc.

If you need to reschedule or have any questions, please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

### 4.2 Conduct Interview
**Who**: Hiring Manager + HR Team

**Interview Process**:
1. **Preparation**:
   - Review candidate resume
   - Prepare interview questions
   - Set up interview room

2. **Interview Activities**:
   - Greet candidate
   - Introduction to SJSFI
   - Discuss position details
   - Ask competency questions
   - Technical/Skills assessment
   - Answer candidate questions
   - Explain next steps

3. **Evaluation**:
   - Assess qualifications
   - Evaluate cultural fit
   - Review credentials
   - Take notes for decision

### 4.3 Mark Interview Complete
**Status Change**: `InterviewScheduled` → `InterviewCompleted`

**HR Actions**:
1. After interview completion
2. Update candidate status
3. Add interview notes (optional)

**Automated Email to Candidate**:
```
Subject: Application Status Update - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

This email is regarding your application for the [Vacancy Name] position.

Thank you for attending the interview. Our team is currently 
reviewing your application and we will get back to you with our 
decision soon.

If you have any questions, please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

---

## 🎯 Phase 5: Selection & Offer

### 5.1 Offer Position
**Status Change**: `InterviewCompleted` → `Offered`

**HR Actions**:
1. Decision to hire candidate
2. Click "Offer" button
3. Confirm offer

**System Actions**:
1. **Generates Secure Token**:
   - Cryptographically secure random token
   - 64-character hexadecimal string
   - Unique per candidate
   - Expires in 30 days

2. **Creates Offer Link**:
   - Format: `https://hrms-v2-azure.vercel.app/offered-applicant/[token]`
   - Secure, one-time use
   - Validates token expiry

3. **Sends Automated Email**:
```
Subject: Application Status Update - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

This email is regarding your application for the [Vacancy Name] position.

Congratulations! We would like to offer you the position. Please 
complete your employee information using the link below to proceed 
with your onboarding.

┌────────────────────────────────────────┐
│ Next Steps:                            │
│                                        │
│ Please click the link below to submit │
│ your employee information:             │
│                                        │
│ [Submit Employee Information]          │
│                                        │
│ This link will expire in 30 days.     │
│ Please complete the form as soon as    │
│ possible.                              │
└────────────────────────────────────────┘

If you have any questions, please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

### 5.2 Candidate Submits Employee Information
**Who**: Offered Candidate  
**Where**: Secure token link (`/offered-applicant/[token]`)

**Validation**:
- Token validity check
- Token expiry check (30 days)
- One-time submission (unless returned)

**Information Required**:

#### Personal Details
- Complete Name (First, Middle, Last, Extension)
- Date of Birth
- Place of Birth
- Present Address (Full)
- Permanent Address (Full)
- Contact Number
- Email Address
- Civil Status (Single/Married/Widowed/Separated)
- Citizenship/Nationality
- Religion
- Height (cm)
- Weight (kg)
- Blood Type

#### Government IDs & Numbers
- SSS Number (format: XX-XXXXXXX-X)
- TIN Number (format: XXX-XXX-XXX-XXX)
- PhilHealth Number (format: XX-XXXXXXXXX-X)
- PagIbig Number (format: XXXX-XXXX-XXXX)
- GSIS Number (if applicable)
- PRC License Number (if applicable)
- PRC License Validity Date (if applicable)

#### Emergency Contact
- Emergency Contact Name
- Emergency Contact Number
- Relationship to Employee

#### For Faculty Positions
- Department Selection (dropdown)
- Position/Designation
- Academic qualifications
- Teaching experience

**Form Features**:
- Real-time validation
- Format checking
- Required field indicators
- Help text for each field
- Save progress functionality
- Review before submit
- Confirmation dialog

**System Actions After Submission**:
1. Validates all information
2. Stores as JSON in `SubmittedEmployeeInfo`
3. Sets `EmployeeInfoSubmitted: true`
4. Records `EmployeeInfoSubmittedDate`
5. Disables token for reuse
6. Shows success confirmation

**Success Message**:
```
✅ Employee Information Submitted Successfully!

Thank you for submitting your employee information.

Our HR team will review your submission and complete your 
onboarding process. You will receive an email with your 
account credentials once your information is approved.

If there are any issues with your submission, we will 
contact you for clarification.

Please check your email regularly for updates.
```

### 5.3 HR Reviews Submitted Information
**Where**: Dashboard → Recruitment → Submitted Information Tab

**Information Display**:
- List of candidates who submitted employee info
- Submission date
- Status (Pending Review/Approved/Returned)
- View full details button

**HR Options**:

#### Option A: Approve Information
**Actions**:
1. Click "Approve" button
2. Review all submitted data
3. Confirm approval

**System Actions** (See Phase 6 for details):
- Creates Employee record
- Creates User account with credentials
- Sends welcome email
- Updates candidate status to `Hired`

#### Option B: Return for Corrections
**Actions**:
1. Click "Return" button
2. Enter reason for return
3. Specify what needs correction
4. Confirm return

**System Actions**:
1. Changes candidate status to `Returned`
2. Resets `EmployeeInfoSubmitted: false`
3. Keeps original submission for reference
4. Sends email with edit link

**Email to Candidate**:
```
Subject: Employee Information Returned - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

Thank you for submitting your employee information for the 
[Vacancy Name] position.

After reviewing your submitted information, we need some 
clarification or corrections. Please review the following:

┌────────────────────────────────────────┐
│ Return Reason:                         │
│                                        │
│ [HR's detailed feedback explaining     │
│  what needs to be corrected or         │
│  clarified]                            │
└────────────────────────────────────────┘

Next Steps:
Please click the link below to review and update your employee 
information based on the feedback above, then resubmit:

[Edit and Resubmit Information]

We appreciate your attention to these details and look forward 
to completing your onboarding process.

If you have any questions, please contact us at:
  Email: sjsfihrms@gmail.com
  Phone: (02) 8-693-5661

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

---

## ✅ Phase 6: Hiring & Onboarding

### 6.1 Approve & Mark as Hired
**Status Change**: `Offered` → `Hired`

**HR Actions**:
1. Review submitted employee information
2. Click "Approve" button
3. Confirm approval and hiring

**System Executes Complete Onboarding** (Automatic):

### Step 1: Create Employee Record

**Employee Table Creation**:
```sql
INSERT INTO Employee (
  EmployeeID,          -- Auto-generated: YYYY-NNNN
  UserID,              -- Will be linked later
  LastName,
  FirstName,
  MiddleName,
  ExtensionName,
  Sex,
  DateOfBirth,
  PlaceOfBirth,
  CivilStatus,
  Nationality,
  Religion,
  Height,
  Weight,
  BloodType,
  DepartmentID,        -- For faculty
  createdAt,
  updatedAt
)
```

**EmployeeID Format**: `YYYY-NNNN`
- YYYY = Current year
- NNNN = Sequential number (e.g., 2026-0001)

### Step 2: Create Related Records

**A. EmploymentDetail Table**:
```sql
INSERT INTO EmploymentDetail (
  employeeId,
  EmploymentStatus,    -- 'Regular', 'Probationary', 'Part_Time'
  HireDate,            -- Current date
  ResignationDate,     -- NULL
  Designation,         -- Position designation
  Position,            -- Job position
  SalaryGrade,         -- If provided
  SalaryAmount,        -- If provided
  createdAt,
  updatedAt
)
```

**B. ContactInfo Table**:
```sql
INSERT INTO ContactInfo (
  employeeId,
  Email,
  Phone,
  PresentAddress,
  PermanentAddress,
  EmergencyContactName,
  EmergencyContactNumber,
  createdAt,
  updatedAt
)
```

**C. GovernmentID Table**:
```sql
INSERT INTO GovernmentID (
  employeeId,
  SSSNumber,
  TINNumber,
  PhilHealthNumber,
  PagIbigNumber,
  GSISNumber,
  PRCLicenseNumber,
  PRCValidity,
  createdAt,
  updatedAt
)
```

**D. Faculty Table** (If Faculty Position):
```sql
INSERT INTO Faculty (
  FacultyID,           -- Auto-increment
  UserID,              -- Will be linked later
  EmployeeID,
  DateOfBirth,
  Phone,
  Address,
  EmploymentStatus,
  HireDate,
  Position,
  DepartmentID,
  createdAt,
  updatedAt
)
```

### Step 3: Create User Account & Credentials

**A. Generate Secure Temporary Password**:
```javascript
function generateTemporaryPassword() {
  // Creates 12-character password with:
  // - At least 1 uppercase letter
  // - At least 1 lowercase letter
  // - At least 1 number
  // - At least 1 special character (!@#$%^&*)
  // Example: Xy9@kL2mP!q8
}
```

**B. Generate Unique UserID**:
```javascript
// Format: YYYY-NNNN (e.g., 2026-0001)
const userId = await generateUserId(new Date());
```

**C. Create User Record in Database**:
```sql
INSERT INTO User (
  UserID,              -- Generated: YYYY-NNNN
  ClerkID,             -- Will be updated after Clerk creation
  EmployeeID,          -- Links to Employee
  FirstName,
  LastName,
  Email,
  PasswordHash,        -- Temporary hash
  Status,              -- 'Active'
  RequirePasswordChange, -- TRUE (forced change)
  DateCreated,
  DateModified,
  createdBy,
  isDeleted            -- FALSE
)
```

**D. Assign Employee Role**:
```sql
-- Find employee role
SELECT id FROM Role WHERE name ILIKE 'employee';

-- Create UserRole record
INSERT INTO UserRole (
  userId,
  roleId
)
```

**E. Create Clerk Authentication Account**:
```javascript
const clerkUser = await clerk.users.createUser({
  emailAddress: [candidateEmail],
  password: temporaryPassword,  // Not invitation!
  firstName: firstName,
  lastName: lastName,
  publicMetadata: {
    userId: userId,
    role: 'employee',
    candidateId: candidateId
  }
});
```

**Features**:
- Direct account creation (not invitation)
- Password set immediately
- Account active immediately
- Metadata stored for reference

**F. Update User with ClerkID**:
```sql
UPDATE User
SET ClerkID = clerkUserId,
    DateModified = NOW()
WHERE UserID = userId;
```

**G. Link Candidate to User**:
```sql
UPDATE Candidate
SET UserID = userId
WHERE CandidateID = candidateId;
```

### Step 4: Send Welcome Email with Credentials

**Email Details**:
```
To: [Candidate Email]
Subject: Welcome to Saint Joseph School of Fairview Inc. - Your Account Credentials

──────────────────────────────────────────────────────────
🎉 Your HRMS Account Has Been Created!
──────────────────────────────────────────────────────────

Dear [Candidate Name],

Congratulations! You are now officially part of Saint Joseph 
School of Fairview Inc. We've created your account in our 
Human Resource Management System. You can now access the 
system using the credentials below.

┌────────────────────────────────────────────────────────┐
│ 🔐 Your Login Credentials                              │
├────────────────────────────────────────────────────────┤
│ Email:              john.doe@example.com               │
│ Temporary Password: Xy9@kL2mP!q8                       │
│ System URL:         https://hrms-v2-azure.vercel.app   │
└────────────────────────────────────────────────────────┘

⚠️ Important Security Steps:

1. Login to the system using your email and temporary password
2. You WILL BE REQUIRED to change your password immediately 
   upon first login
3. Choose a strong, unique password that you haven't used elsewhere
4. Do not share your password with anyone
5. Delete this email after you've changed your password

Password Requirements:
  ✓ At least 8 characters long
  ✓ One uppercase letter
  ✓ One lowercase letter
  ✓ One number
  ✓ One special character (!@#$%^&*)

┌────────────────────────────────────────────────────────┐
│         [Login to HRMS Now →]                          │
└────────────────────────────────────────────────────────┘

Note: This is a one-time temporary password. For security 
reasons, you must change it when you first login.

If you have any questions or need assistance, please contact 
the HR department.

Best regards,
HR Department
Saint Joseph School of Fairview Inc.

──────────────────────────────────────────────────────────
This is an automated message. Please do not reply to this email.
──────────────────────────────────────────────────────────
```

**Email Features**:
- Professional HTML template
- SJSFI branding (maroon color scheme)
- Clear credentials display
- Security instructions
- Direct login button
- Password requirements reminder
- Contact information

### Step 5: Check Vacancy Status

**System Actions**:
1. **Count Hired Candidates**:
```sql
SELECT COUNT(*) 
FROM Candidate 
WHERE VacancyID = vacancyId 
  AND Status = 'Hired';
```

2. **Compare with Number of Positions**:
```sql
SELECT NumberOfPositions 
FROM Vacancy 
WHERE VacancyID = vacancyId;
```

3. **If Vacancy Filled** (Hired Count >= Number of Positions):

**A. Update Vacancy Status**:
```sql
UPDATE Vacancy 
SET Status = 'Filled',
    DateModified = NOW()
WHERE VacancyID = vacancyId;
```

**B. Get Remaining Candidates**:
```sql
SELECT * 
FROM Candidate 
WHERE VacancyID = vacancyId 
  AND Status NOT IN ('Hired', 'Returned', 'Withdrawn');
```

**C. Send Position Filled Emails**:
```
Subject: Position Update - Saint Joseph School of Fairview Inc.

Dear [Candidate Name],

We want to inform you that the position of [Vacancy Name] 
has been filled. While we were impressed with your 
qualifications, we have decided to move forward with 
another candidate who closely matched our current requirements.

We sincerely appreciate your interest in joining Saint Joseph 
School of Fairview Inc. and the time you invested in applying 
for this position. We encourage you to apply for future 
positions that match your qualifications.

We wish you the best in your career endeavors.

Best regards,
HR Department
Saint Joseph School of Fairview Inc.
```

### Error Handling

**If Any Step Fails**:
1. Log detailed error
2. Attempt rollback if possible
3. Notify HR of failure
4. Candidate status remains at previous stage
5. HR can retry manually

**Retry Logic**:
- Clerk account creation: Up to 3 attempts
- Orphaned account cleanup if needed
- 2-second delay between retries

**Transaction Safety**:
- Employee record created first
- User account links to employee
- Clerk account created last
- All or nothing approach where possible

---

## 🔑 Phase 7: First Login & Password Change

### 7.1 Employee Opens HRMS System
**Who**: New Employee  
**Where**: `https://hrms-v2-azure.vercel.app`

**Actions**:
1. Employee receives email with credentials
2. Clicks "Login to HRMS Now" button or opens URL directly
3. Arrives at login page

### 7.2 Enter Credentials
**Login Process**:
1. **Enter Email**: The email address provided in welcome email
2. **Enter Password**: The temporary password from email
3. **Click "Sign In"**

**Clerk Authentication**:
- Validates credentials against Clerk database
- Verifies account is active
- Creates session
- Generates authentication token

### 7.3 Middleware Detects Password Change Required

**Middleware Check**:
```javascript
// After successful authentication
const { data: user } = await supabaseAdmin
  .from('User')
  .select('RequirePasswordChange')
  .eq('ClerkID', userId)
  .single();

if (user?.RequirePasswordChange === true) {
  // Redirect to password change page
  return NextResponse.redirect(
    new URL('/change-password', req.url)
  );
}
```

**Protected Routes**:
- Employee CANNOT access any dashboard or system pages
- Automatic redirect to `/change-password`
- No bypass possible
- Session maintained during redirect

**Allowed Routes During Password Change**:
- `/change-password` - Password change page
- `/api/user/password-change-status` - Check status API
- `/api/user/update-password-flag` - Update flag API
- `/sign-out` - Sign out option

### 7.4 Password Change Page
**URL**: `/change-password`

**Page Layout**:

**Header Section**:
```
┌────────────────────────────────────────────┐
│     🔒                                     │
│                                            │
│     Change Your Password                   │
│                                            │
│ ⚠️  For security reasons, you must change │
│     your temporary password before         │
│     accessing the system.                  │
└────────────────────────────────────────────┘
```

**Form Fields**:

**1. Current Password**
- Input type: password (toggleable visibility)
- Label: "Current Password"
- Placeholder: "Enter your temporary password"
- Eye icon to show/hide password
- Required field

**2. New Password**
- Input type: password (toggleable visibility)
- Label: "New Password"
- Placeholder: "Enter your new password"
- Eye icon to show/hide password
- Real-time strength indicator
- Required field

**Password Strength Indicator**:
```
[████████░░░░] Strong
```
- Color-coded:
  - Red: Very Weak
  - Orange: Weak
  - Yellow: Fair
  - Light Green: Good
  - Green: Strong
  - Dark Green: Very Strong
- Updates in real-time as user types

**3. Confirm New Password**
- Input type: password (toggleable visibility)
- Label: "Confirm New Password"
- Placeholder: "Confirm your new password"
- Eye icon to show/hide password
- Match indicator (✓ Passwords match)
- Required field

**Password Requirements Checklist**:
```
Password Requirements:
  ✓ At least 8 characters long
  ○ One uppercase letter
  ○ One lowercase letter
  ○ One number
  ○ One special character (!@#$%^&*)
```
- ✓ Green checkmark: Requirement met
- ○ Gray circle: Requirement not met
- Updates in real-time

**Submit Button**:
- Text: "Change Password"
- Disabled until all requirements met
- Loading state while processing
- Full-width button

### 7.5 Password Validation

**Client-Side Validation** (Real-time):
```javascript
// All fields required
if (!currentPassword || !newPassword || !confirmPassword) {
  setError("All fields are required");
}

// Passwords must match
if (newPassword !== confirmPassword) {
  setError("New passwords do not match");
}

// Cannot reuse temporary password
if (newPassword === currentPassword) {
  setError("New password must be different from current password");
}

// Length check
if (newPassword.length < 8) {
  setError("Password must be at least 8 characters long");
}

// Uppercase check
if (!/[A-Z]/.test(newPassword)) {
  setError("Password must contain at least one uppercase letter");
}

// Lowercase check
if (!/[a-z]/.test(newPassword)) {
  setError("Password must contain at least one lowercase letter");
}

// Number check
if (!/[0-9]/.test(newPassword)) {
  setError("Password must contain at least one number");
}

// Special character check
if (!/[^a-zA-Z0-9]/.test(newPassword)) {
  setError("Password must contain at least one special character");
}
```

**Server-Side Validation**:
1. Verify current password with Clerk
2. Validate new password requirements
3. Ensure passwords match
4. Check against common passwords (Clerk handles this)

### 7.6 Update Password

**Process**:
1. **Submit Form** → Shows loading indicator
2. **Update Clerk Password**:
```javascript
await user.updatePassword({
  currentPassword: currentPassword,
  newPassword: newPassword
});
```

3. **Update Database Flag**:
```javascript
await fetch('/api/user/update-password-flag', {
  method: 'POST',
  body: JSON.stringify({
    userId: userId,
    requirePasswordChange: false
  })
});
```

4. **Success Actions**:
   - Password updated in Clerk
   - `RequirePasswordChange` set to `false` in database
   - Session maintained
   - Redirect to dashboard

**Error Handling**:
- Invalid current password → "Please check your current password"
- Network error → "Connection failed, please try again"
- Clerk API error → "Failed to update password, please try again"
- Database error → Logged, user retries

### 7.7 Redirect to Dashboard
**After Successful Password Change**:

**Middleware Check** (Next Request):
```javascript
// User no longer has RequirePasswordChange flag
// Allow access to dashboard and all system features
```

**Dashboard Path** (Role-Based):
- Employee role → `/dashboard`
- Faculty role → `/dashboard/faculty`
- Admin role → `/dashboard/admin`
- Cashier role → `/dashboard/cashier`
- Registrar role → `/dashboard/registrar`

**Success Indicators**:
- Welcome message on dashboard
- Full system access granted
- All features available
- Profile data populated

---

## 📊 Phase 8: Active Employee

### 8.1 Dashboard Access
**Role**: Employee

**Available Features**:

#### Personal Information
- View profile
- Update contact information
- Upload profile photo
- View employment details
- Download employment contract

#### Leave Management
- Submit leave requests
- View leave balance
- Track leave status
- View leave history
- Download leave forms

#### Payroll & Compensation
- View payslips
- Download payslips
- View salary history
- View deductions
- Tax documents (BIR forms)

#### Time & Attendance
- Clock in/out (if applicable)
- View attendance records
- View time logs
- Submit time corrections

#### Documents & Forms
- Upload required documents
- Access employee handbook
- Download HR forms
- View company policies
- Training certificates

#### Training & Development
- View available training
- Enroll in courses
- Track training progress
- Download certificates
- View training history

#### Performance
- View performance reviews
- Self-assessment forms
- Goal setting
- Performance feedback
- Development plans

#### Communications
- View announcements
- Company news
- HR notifications
- Team updates
- Important notices

#### Self-Service
- Update emergency contacts
- Request certificates
- Submit complaints/concerns
- Access help desk
- FAQs

---

### 8.2 HR Management of Employees

**HR Dashboard Features**:

#### Employee Records
- View all employees
- Search and filter
- Export employee list
- Bulk operations
- Employee reports

#### Recruitment Pipeline
- Active vacancies
- Candidate tracking
- Interview scheduling
- Offer management
- Onboarding progress

#### Leave Management
- Approve/reject leave
- View team calendar
- Leave balance tracking
- Leave policies
- Reports and analytics

#### Payroll Processing
- Process payroll
- Generate payslips
- Tax computations
- Deduction management
- Payroll reports

#### Performance Management
- Schedule reviews
- Performance tracking
- Goal management
- Feedback collection
- Performance reports

#### Training & Development
- Create training programs
- Assign training
- Track completion
- Evaluate effectiveness
- Training reports

#### Reports & Analytics
- Headcount reports
- Turnover analysis
- Recruitment metrics
- Leave analytics
- Payroll summaries
- Custom reports

---

## 🔄 Additional Recruitment Features

### Candidate Status Flow

**Complete Status Progression**:
```
Applied
  ↓
Shortlisted
  ↓
InterviewScheduled
  ↓
InterviewCompleted
  ↓
Offered
  ↓
Hired
```

### Alternative Status Paths

**1. Rejection at Any Stage**:
```
Applied/Shortlisted/InterviewCompleted
  ↓
Returned (Rejected)
```

**2. Candidate Withdrawal**:
```
Any Status
  ↓
Withdrawn (Candidate withdraws)
```

**3. Position Filled**:
```
Shortlisted/InterviewScheduled/InterviewCompleted
  ↓
Shortlisted (Position filled, returned to pool)
```

### Email Notification Matrix

| Status Change | Email Sent | Subject | Content |
|--------------|------------|---------|---------|
| → Applied | Yes | Application Received | Confirmation & next steps |
| → Shortlisted | Yes | Status Update | Shortlisted notification |
| → InterviewScheduled | Yes | Interview Schedule | Date, time, location |
| → InterviewCompleted | Yes | Status Update | Thank you message |
| → Offered | Yes | Status Update | Offer with submission link |
| → Hired | Yes | Welcome + Credentials | Account details |
| → Returned | Yes | Status Update | Rejection message |
| → Withdrawn | Yes | Status Update | Acknowledgment |
| Vacancy Filled | Yes (to others) | Position Update | Position filled notice |

### Vacancy Auto-Close Logic

**Trigger**: When `Hired Count >= Number of Positions`

**Actions**:
1. Update Vacancy status to `Filled`
2. Stop accepting new applications
3. Send emails to remaining candidates
4. Update candidates to `Shortlisted` (keep in pool)
5. Record vacancy close date

### Resume Management

**Features**:
- Secure upload (Supabase Storage)
- Preview in browser (PDF)
- Download original file
- File type validation (PDF, DOC, DOCX)
- Size limit (5MB)
- Virus scanning (if configured)
- Automatic cleanup on delete

**Storage Path**:
```
/resumes/[timestamp]_[filename]
Example: /resumes/1704067200000_john_doe_resume.pdf
```

### Data Privacy & GDPR Compliance

**Features**:
- Consent collection on application
- Data retention policies
- Right to be forgotten
- Data export capability
- Secure data storage
- Encrypted communication
- Access logging
- Privacy policy display

### Audit Trail

**Logged Actions**:
- Application submission
- Status changes
- HR actions
- Email sends
- Document uploads
- Account creation
- Password changes
- Login attempts

**Log Format**:
```sql
INSERT INTO ActivityLog (
  UserID,
  ActionType,
  EntityAffected,
  ActionDetails,
  IPAddress,
  Timestamp
)
```

---

## 🔐 Security Throughout Process

### Application Security

**1. Public Form Protection**:
- CSRF token validation
- Rate limiting (prevent spam)
- File upload validation
- XSS prevention
- SQL injection protection
- Input sanitization

**2. Data Validation**:
- Email format check
- Phone number validation
- Age verification
- File type validation
- File size limits
- Required field checks

**3. Secure Storage**:
- Encrypted database
- Secure file storage (Supabase)
- HTTPS only communication
- Environment variables for secrets
- No sensitive data in logs

### Token Security

**Offer Token Features**:
- Cryptographically secure (64-char hex)
- Single-use (disabled after submission)
- Time-limited (30-day expiry)
- Validated on every access
- Associated with specific candidate
- Cannot be guessed or brute-forced

**Token Validation**:
```javascript
// Check token exists
const candidate = await findByToken(token);
if (!candidate) return "Invalid token";

// Check not expired
if (new Date() > candidate.TokenExpiry) {
  return "Token expired";
}

// Check not already used
if (candidate.EmployeeInfoSubmitted) {
  return "Token already used";
}
```

### Account Security

**1. Password Security**:
- Minimum 8 characters
- Complexity requirements
- Cannot reuse temporary password
- Clerk handles hashing (bcrypt)
- Forced password change on first login
- No password recovery from temporary password

**2. Authentication**:
- Clerk handles authentication
- Session management
- Token-based access
- Automatic token refresh
- Secure cookie handling
- Multi-factor authentication (available)

**3. Authorization**:
- Role-based access control (RBAC)
- Permission checking
- Resource-level permissions
- API endpoint protection
- Middleware enforcement

### Email Security

**1. Credential Transmission**:
- Sent only once
- HTTPS email delivery
- Clear deletion instructions
- No password recovery from email
- Secure email service (Gmail SMTP)

**2. Email Content**:
- No sensitive data beyond credentials
- Professional templates only
- Anti-phishing indicators
- Official email address
- Branded templates

### Middleware Protection

**1. Route Protection**:
```javascript
// Public routes
const publicRoutes = [
  "/careers",
  "/applicant",
  "/sign-in",
  // ... etc
];

// Protected routes (require authentication)
// Everything else requires valid session
```

**2. Password Change Enforcement**:
```javascript
// Check RequirePasswordChange flag
if (user.RequirePasswordChange && !isPasswordChangeRoute) {
  redirect('/change-password');
}
```

**3. Security Headers**:
```javascript
// Applied to all responses
headers.set("X-Frame-Options", "DENY");
headers.set("X-Content-Type-Options", "nosniff");
headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
headers.set("Content-Security-Policy", csp);
```

### Database Security

**1. Access Control**:
- Service role key for admin operations
- Row-level security policies
- Prepared statements (prevent SQL injection)
- Connection pooling
- Encrypted connections

**2. Data Protection**:
- Soft deletes (isDeleted flag)
- Audit logging
- Backup and recovery
- Data encryption at rest
- Compliance with data protection laws

### API Security

**1. Authentication**:
- Clerk session validation
- JWT token verification
- API key validation (where applicable)
- Rate limiting

**2. Authorization**:
- Role checking
- Permission verification
- Resource ownership validation
- Scope limitations

**3. Input Validation**:
- Type checking
- Format validation
- Range validation
- Sanitization
- Error handling

---

## 📱 User Experience Features

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop full features
- Touch-friendly interfaces
- Adaptive layouts

### Accessibility
- WCAG 2.1 compliance
- Screen reader support
- Keyboard navigation
- High contrast mode
- Clear error messages
- Descriptive labels

### Performance
- Fast page loads
- Lazy loading
- Image optimization
- Code splitting
- Caching strategies
- CDN for static assets

### User Feedback
- Loading indicators
- Success messages
- Error messages
- Progress indicators
- Confirmation dialogs
- Help tooltips

### Professional Design
- SJSFI branding (maroon color)
- Consistent typography
- Clear hierarchy
- Intuitive navigation
- Clean layouts
- Modern UI components

---

## 🎓 Training & Support

### For HR Users

**System Training**:
- Dashboard navigation
- Vacancy management
- Candidate screening
- Interview scheduling
- Offer management
- Employee onboarding
- Report generation

**Resources**:
- User manual
- Video tutorials
- Quick reference guides
- FAQ section
- Help desk contact

### For New Employees

**Onboarding Materials**:
- Welcome package
- System access guide
- Password change instructions
- Dashboard walkthrough
- Self-service features
- Company policies
- Employee handbook

**Support Channels**:
- HR contact information
- IT help desk
- Email support
- Phone support
- Online knowledge base

---

## 📊 Metrics & Reporting

### Recruitment Metrics

**Time-to-Hire**:
- Average days from application to hire
- By position type
- By department
- Historical trends

**Source Tracking**:
- Application sources
- Channel effectiveness
- Conversion rates
- Cost per hire

**Candidate Pipeline**:
- Candidates per stage
- Conversion rates
- Drop-off points
- Bottleneck identification

**Vacancy Analytics**:
- Open positions
- Fill rate
- Time to fill
- Applications per vacancy

### HR Analytics

**Headcount Reports**:
- Total employees
- By department
- By position
- By employment status

**Turnover Analysis**:
- Turnover rate
- Retention rate
- Exit reasons
- At-risk employees

**Compliance Reports**:
- Government ID compliance
- Document completion
- Training completion
- Policy acknowledgments

---

## 🔧 System Administration

### Configuration

**System Settings**:
- Email templates
- Notification rules
- Workflow automation
- Security policies
- Data retention

**User Management**:
- Role creation
- Permission assignment
- User deactivation
- Bulk operations
- Access reviews

**Integration**:
- Clerk authentication
- Supabase database
- Email service (Gmail)
- File storage
- External APIs

### Maintenance

**Regular Tasks**:
- Database backups
- Log rotation
- Performance monitoring
- Security updates
- Bug fixes

**Monitoring**:
- System uptime
- Error rates
- Response times
- User activity
- Storage usage

---

## 📝 Compliance & Legal

### Data Protection
- GDPR compliance
- Data privacy act compliance
- Secure data handling
- Consent management
- Right to access
- Right to deletion

### Employment Law
- Equal opportunity
- Non-discrimination
- Record keeping
- Document retention
- Privacy policies

### Audit Requirements
- Activity logging
- Change tracking
- Access control
- Data integrity
- Compliance reporting

---

## 🚀 Future Enhancements

### Planned Features
- Video interview integration
- Skills assessment tools
- Reference checking automation
- Background verification
- Offer letter generation
- E-signature integration
- Mobile app
- Chatbot support
- AI-powered candidate matching
- Advanced analytics

---

## 📞 Support Information

### Technical Support
**Email**: IT-support@sjsfi.edu.ph  
**Phone**: (02) 8-693-5661  
**Hours**: Monday-Friday, 8:00 AM - 5:00 PM

### HR Support
**Email**: sjsfihrms@gmail.com  
**Phone**: (02) 8-693-5661  
**Hours**: Monday-Friday, 8:00 AM - 5:00 PM

### Emergency Contact
**After Hours**: [Emergency number]  
**For Urgent Issues**: [Escalation process]

---

## 📚 Related Documentation

- User Manual (HR Staff)
- User Manual (Employees)
- API Documentation
- Database Schema
- Security Policies
- Privacy Policy
- Terms of Service
- Data Processing Agreement

---

**Document Version**: 2.0  
**Last Updated**: January 2026  
**Prepared By**: HRMS Development Team  
**Organization**: Saint Joseph School of Fairview Inc.

---

## Appendix A: Status Definitions

| Status | Definition | Stage |
|--------|-----------|-------|
| Applied | Initial application submitted | Screening |
| Shortlisted | Passed initial screening | Screening |
| InterviewScheduled | Interview date/time set | Interview |
| InterviewCompleted | Interview finished | Post-Interview |
| Offered | Position offered, awaiting info | Offer |
| Hired | Employee info approved, account created | Onboarding |
| Returned | Application/info rejected | Closed |
| Withdrawn | Candidate withdrew application | Closed |

## Appendix B: Email Template List

1. Application Confirmation (to applicant)
2. New Application Notification (to HR)
3. Shortlisted Notification
4. Interview Schedule
5. Interview Completed
6. Offer Letter with Link
7. Welcome Email with Credentials
8. Information Returned
9. Position Filled (to other candidates)
10. Status Update (generic)

## Appendix C: Role Permissions

### Employee Role
- View own profile
- Update contact info
- Submit leave requests
- View payslips
- Access training
- Clock in/out

### HR Admin Role
- All employee permissions
- Manage vacancies
- Screen candidates
- Schedule interviews
- Approve hiring
- Create user accounts
- Generate reports
- Manage all employees

### Faculty Role
- All employee permissions
- View student records
- Grade submission
- Curriculum access
- Faculty resources

---

*This document provides a complete overview of the SJSFI HRMS Recruitment System. For technical implementation details, refer to the codebase documentation.*
