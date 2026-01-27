# Appendix: Selected Code Snippets for Critical Functions

## Table of Contents
1. [AI-Powered Candidate Screening](#1-ai-powered-candidate-screening)
2. [User Authentication and Authorization](#2-user-authentication-and-authorization)
3. [Employee Account Creation](#3-employee-account-creation)
4. [SIS Integration and Data Synchronization](#4-sis-integration-and-data-synchronization)
5. [Leave Request Processing](#5-leave-request-processing)
6. [Performance Analysis and Promotion Recommendations](#6-performance-analysis-and-promotion-recommendations)

---

## 1. AI-Powered Candidate Screening

### 1.1 Candidate Screening Function
**File:** `src/services/aiAgentService.ts`

This function uses Google Gemini AI to analyze candidate profiles against job requirements and generate comprehensive screening results.

```typescript
async screenCandidate(
  candidateId: number,
  vacancyId: number
): Promise<CandidateScreeningResult> {
  // Ensure Prisma connection is established
  await this.ensureConnection();
  
  // Fetch candidate and vacancy data
  const candidate = await prisma.candidate.findUnique({
    where: { CandidateID: candidateId },
    include: { 
      Vacancy: {
        include: {
          requirements: true
        }
      }
    },
  });

  const vacancy = await prisma.vacancy.findUnique({
    where: { VacancyID: vacancyId },
    include: { requirements: true },
  });

  if (!candidate || !vacancy) {
    throw new Error('Candidate or vacancy not found');
  }

  // Build comprehensive candidate context
  const candidateContext = {
    name: candidate.FullName,
    email: candidate.Email,
    contactNumber: candidate.ContactNumber || candidate.Phone || 'Not provided',
    sex: candidate.Sex || 'Not specified',
    dateOfBirth: candidate.DateOfBirth ? new Date(candidate.DateOfBirth).toLocaleDateString() : 'Not provided',
    resumeUrl: candidate.ResumeUrl || null,
    resumeAvailable: !!(candidate.ResumeUrl || candidate.Resume),
    appliedDate: new Date(candidate.DateApplied).toLocaleDateString(),
    status: candidate.Status,
  };

  const vacancyContext = {
    title: vacancy.VacancyName,
    jobTitle: vacancy.JobTitle,
    description: vacancy.Description || 'N/A',
    requirements: vacancy.requirements?.map(r => ({
      type: r.requirementType,
      text: r.requirementText,
      required: r.isRequired,
      weight: r.weight,
    })) || [],
  };

  // AI Prompt for candidate analysis
  const prompt = `You are an AI recruitment specialist. Analyze the candidate's profile against the job requirements.

CANDIDATE PROFILE:
- Full Name: ${candidateContext.name}
- Email: ${candidateContext.email}
- Contact Number: ${candidateContext.contactNumber}
- Sex: ${candidateContext.sex}
- Date of Birth: ${candidateContext.dateOfBirth}
- Date Applied: ${candidateContext.appliedDate}
- Application Status: ${candidateContext.status}
- Resume Available: ${candidateContext.resumeAvailable ? 'Yes' : 'No'}

JOB REQUIREMENTS:
- Position: ${vacancyContext.title}
- Job Title: ${vacancyContext.jobTitle}
- Description: ${vacancyContext.description}
- Requirements: ${JSON.stringify(vacancyContext.requirements, null, 2)}

Analyze and provide a JSON response with the following structure:
{
  "overallScore": <number 0-100>,
  "resumeScore": <number 0-100>,
  "qualificationScore": <number 0-100>,
  "experienceScore": <number 0-100>,
  "skillMatchScore": <number 0-100>,
  "recommendation": "StrongRecommend" | "Recommend" | "Consider" | "Reject" | "NeedsReview",
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "missingQualifications": ["qualification1", ...],
  "suggestedQuestions": ["question1", "question2", ...],
  "riskFactors": ["risk1", ...],
  "aiAnalysis": "Detailed analysis text explaining the recommendation."
}`;

  try {
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response.text();
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const analysis = JSON.parse(jsonMatch[0]) as CandidateScreeningResult;
    
    // Validate the response structure
    if (!analysis.overallScore || !analysis.recommendation) {
      throw new Error('Invalid AI response structure');
    }
    
    // Save to database
    await prisma.candidateScreening.upsert({
      where: {
        candidateId_vacancyId: {
          candidateId,
          vacancyId,
        },
      },
      create: {
        candidateId,
        vacancyId,
        overallScore: analysis.overallScore,
        resumeScore: analysis.resumeScore,
        qualificationScore: analysis.qualificationScore,
        experienceScore: analysis.experienceScore,
        skillMatchScore: analysis.skillMatchScore,
        recommendation: analysis.recommendation,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        missingQualifications: analysis.missingQualifications,
        suggestedQuestions: analysis.suggestedQuestions,
        riskFactors: analysis.riskFactors,
        aiAnalysis: analysis.aiAnalysis,
        status: 'Completed',
        screenedAt: new Date(),
      },
      update: {
        overallScore: analysis.overallScore,
        resumeScore: analysis.resumeScore,
        qualificationScore: analysis.qualificationScore,
        experienceScore: analysis.experienceScore,
        skillMatchScore: analysis.skillMatchScore,
        recommendation: analysis.recommendation,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        missingQualifications: analysis.missingQualifications,
        suggestedQuestions: analysis.suggestedQuestions,
        riskFactors: analysis.riskFactors,
        aiAnalysis: analysis.aiAnalysis,
        status: 'Completed',
        screenedAt: new Date(),
      },
    });

    return analysis;
  } catch (error) {
    console.error('Error screening candidate:', error);
    throw error;
  }
}
```

**Key Features:**
- Multi-dimensional scoring (resume, qualifications, experience, skills)
- AI-generated interview questions
- Risk factor identification
- Automatic database persistence
- Error handling with quota management

---

## 2. User Authentication and Authorization

### 2.1 Middleware for Route Protection
**File:** `src/middleware.ts`

This middleware handles authentication and authorization for all routes using Clerk.

```typescript
import { clerkMiddleware, createRouteMatcher, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
    "/careers",
    "/careers/all-vacancies",
    "/applicant",
    "/offered-applicant/(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/(.*)",
    // ... more public routes
];

const isPublicRoute = createRouteMatcher(publicRoutes);

export default clerkMiddleware(async (auth, req) => {
    try {
        const url = new URL(req.url);
        
        // Allow public routes to skip Clerk auth protection
        if (isPublicRoute(req)) {
            const response = NextResponse.next();
            // Add security headers
            response.headers.set('X-Frame-Options', 'DENY');
            response.headers.set('X-Content-Type-Options', 'nosniff');
            return response;
        }

        // For protected routes, verify authentication
        const { userId } = await auth();
        
        if (!userId) {
            // Redirect to sign-in if not authenticated
            const signInUrl = new URL('/sign-in', req.url);
            if (url.pathname !== '/sign-in') {
                signInUrl.searchParams.set('redirect_url', url.pathname);
            }
            return NextResponse.redirect(signInUrl);
        }

        // Verify user status in database
        const { data: userData } = await supabaseAdmin
            .from('User')
            .select('UserID, Status, isDeleted, UserRole (role:Role (name))')
            .eq('Email', /* user email from Clerk */)
            .single();

        if (!userData || userData.isDeleted || userData.Status !== 'Active') {
            return NextResponse.redirect(new URL('/sign-in?error=inactive', req.url));
        }

        // Role-based access control
        const userRole = userData.UserRole?.[0]?.role?.name?.toLowerCase();
        const pathname = url.pathname.toLowerCase();

        // Check role-based route access
        if (pathname.startsWith('/dashboard/admin') && 
            !['admin', 'super admin'].includes(userRole)) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        return NextResponse.next();
    } catch (error: any) {
        // Handle Clerk authentication errors gracefully
        if (error?.message?.includes('clock') || error?.message?.includes('token')) {
            console.warn("Clerk authentication warning:", error.message);
            return NextResponse.next();
        }
        
        console.error("Middleware error:", error);
        return NextResponse.redirect(new URL('/sign-in', req.url));
    }
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**Key Features:**
- Public route whitelisting
- Automatic authentication verification
- Role-based access control
- User status validation
- Graceful error handling

---

## 3. Employee Account Creation

### 3.1 Automatic Account Creation for Hired Employees
**File:** `src/app/api/candidates/[id]/route.ts`

This function automatically creates user accounts when a candidate's status is changed to "Hired".

```typescript
async function createUserAccountForHiredEmployee(
  candidateEmail: string,
  firstName: string,
  lastName: string,
  candidateId: number
): Promise<{ success: boolean; userId?: string; temporaryPassword?: string; error?: string; accountAlreadyExists?: boolean }> {
  try {
    console.log('Creating user account for hired employee:', candidateEmail);

    // Check if user already exists in database
    const { data: existingUser } = await supabaseAdmin
      .from('User')
      .select('UserID, Email')
      .ilike('Email', candidateEmail.trim())
      .single();

    if (existingUser) {
      console.log('User already exists:', existingUser.UserID);
      return { success: true, userId: existingUser.UserID, accountAlreadyExists: true };
    }

    // Generate unique UserID and temporary password
    const userId = await generateUserId(new Date());
    const temporaryPassword = generateTemporaryPassword();
    console.log('Generated UserID:', userId);

    // Create User record in database with 'employee' role by default
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('User')
      .insert({
        UserID: userId,
        Email: candidateEmail.toLowerCase().trim(),
        FirstName: firstName,
        LastName: lastName,
        Status: 'Active',
        RequirePasswordChange: true, // Flag to force password change on first login
        DateCreated: new Date().toISOString(),
        PasswordHash: crypto.createHash('sha256').update(crypto.randomBytes(32).toString('hex')).digest('hex')
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return { success: false, error: `Failed to create user: ${userError.message}` };
    }

    // Determine role based on position/designation
    let roleToAssign = 'employee'; // Default role
    try {
      const { data: candidateData } = await supabaseAdmin
        .from('Candidate')
        .select(`
          VacancyID,
          Vacancy (JobTitle)
        `)
        .eq('CandidateID', candidateId)
        .single();

      if (candidateData?.Vacancy?.JobTitle) {
        const jobTitle = candidateData.Vacancy.JobTitle;
        
        // Map JobTitle to role
        switch (jobTitle) {
          case 'Registrar':
            roleToAssign = 'registrar';
            break;
          case 'Cashier':
            roleToAssign = 'cashier';
            break;
          case 'HR_Manager':
            roleToAssign = 'admin';
            break;
          case 'Faculty':
            roleToAssign = 'faculty';
            break;
          default:
            roleToAssign = 'employee';
        }
      }
    } catch (vacancyError) {
      console.error('Error checking vacancy for role assignment:', vacancyError);
    }

    // Assign the appropriate role to the user
    const { data: roleData } = await supabaseAdmin
      .from('Role')
      .select('id, name')
      .ilike('name', roleToAssign)
      .single();

    if (roleData) {
      await supabaseAdmin
        .from('UserRole')
        .insert({
          userId: userId,
          roleId: roleData.id
        });
    }

    // Create Clerk user with password
    let clerkUserId: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const clerkUser = await clerk.users.createUser({
          emailAddress: [candidateEmail.toLowerCase().trim()],
          password: temporaryPassword,
          firstName: firstName,
          lastName: lastName,
          publicMetadata: {
            userId: userId,
            role: 'employee',
            candidateId: candidateId
          },
          skipPasswordChecks: false,
        });
        
        clerkUserId = clerkUser.id;
        console.log('Clerk user created successfully:', clerkUserId);
        break;
      } catch (clerkError: any) {
        retryCount++;
        if (retryCount >= maxRetries) {
          // Clean up the orphaned User record if Clerk creation failed
          await supabaseAdmin
            .from('User')
            .delete()
            .eq('UserID', userId);
          
          return { 
            success: false, 
            error: 'Failed to create authentication account. Please contact IT support.' 
          };
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { 
      success: true, 
      userId: userId, 
      temporaryPassword: temporaryPassword 
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

**Key Features:**
- Automatic account creation on hire
- Role assignment based on job title
- Temporary password generation
- Clerk integration with retry logic
- Duplicate account prevention
- Cleanup on failure

---

## 4. SIS Integration and Data Synchronization

### 4.1 Schedule Assignment Synchronization
**File:** `src/lib/sisSync.ts`

This function synchronizes schedule assignments from HRMS to the SIS (Student Information System) enrollment system.

```typescript
/**
 * Syncs a schedule assignment to SIS enrollment system
 * 
 * @param options - Sync options including scheduleId, employeeId, and assigned status
 * @returns Sync result indicating success/failure
 */
export async function syncAssignmentToSIS(options: SyncToSISOptions): Promise<SyncResult> {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';
    
    // Check if sync is enabled
    const syncEnabled = process.env.SIS_SYNC_ENABLED === 'true';
    
    if (!syncEnabled) {
        return {
            success: true,
            synced: false,
            message: 'SIS sync is disabled',
        };
    }
    
    // Validate required environment variables
    if (!SHARED_SECRET || !API_KEY) {
        return {
            success: true,
            synced: false,
            message: 'SIS sync skipped: Missing required credentials',
        };
    }
    
    try {
        // Fetch teacher information from database
        const faculty = await prisma.faculty.findFirst({
            where: {
                EmployeeID: options.employeeId,
            },
            include: {
                User: {
                    select: {
                        FirstName: true,
                        LastName: true,
                        Email: true,
                    },
                },
            },
        });

        if (!faculty || !faculty.User) {
            return {
                success: true,
                synced: false,
                message: `SIS sync skipped: Faculty not found for employee ${options.employeeId}`,
            };
        }

        // Format teacher name
        const teacherName = `${faculty.User.FirstName} ${faculty.User.LastName}`.trim();

        // Prepare request body in SIS format
        const requestBody = {
            scheduleId: options.scheduleId,
            teacher: {
                teacherId: options.employeeId,
                teacherName: teacherName,
                teacherEmail: faculty.User.Email || '',
            },
        };
        
        const rawBody = JSON.stringify(requestBody);
        
        // Generate timestamp and HMAC signature for security
        const timestamp = Date.now().toString();
        const message = rawBody + timestamp;
        const hmac = crypto.createHmac('sha256', SHARED_SECRET);
        hmac.update(message);
        const signature = hmac.digest('hex');
        
        // Make POST request to SIS
        const url = `${ENROLLMENT_BASE_URL}/api/hrms/assign-teacher`;
        console.log(`[SIS Sync] Attempting to sync assignment to SIS: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: rawBody,
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { error: 'Invalid JSON response', raw: responseText };
        }
        
        if (!response.ok) {
            // Handle 404 as "endpoint doesn't exist yet"
            if (response.status === 404) {
                return {
                    success: true,
                    synced: false,
                    message: `SIS sync endpoint not available (404). Assignment saved in HRMS only.`,
                };
            }
            
            // Handle 409 - Schedule already has a teacher assigned
            if (response.status === 409) {
                const currentTeacher = responseData.currentTeacher;
                // Check if it's the same teacher
                if (currentTeacher && currentTeacher.teacherId === options.employeeId) {
                    return {
                        success: true,
                        synced: true,
                        message: 'Schedule already has this teacher assigned in SIS.',
                    };
                }
            }
            
            return {
                success: false,
                synced: false,
                message: `SIS sync failed: ${responseData.error || response.statusText}`,
                error: responseData,
            };
        }
        
        return {
            success: true,
            synced: true,
            message: 'Successfully synced assignment to SIS',
            data: responseData,
        };
    } catch (error) {
        console.error('[SIS Sync] Error:', error);
        return {
            success: false,
            synced: false,
            message: `SIS sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
```

**Key Features:**
- HMAC-SHA256 signature for secure API communication
- Automatic teacher information retrieval
- Conflict resolution (handles existing assignments)
- Graceful error handling
- Configurable sync enable/disable

---

## 5. Leave Request Processing

### 5.1 Leave Request Creation and Validation
**File:** `src/app/api/leaves/route.ts`

This function handles leave request creation with comprehensive validation including leave type restrictions, date validation, and leave balance checking.

```typescript
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { 
            FacultyID, 
            RequestType, 
            LeaveType, 
            StartDate, 
            EndDate, 
            TimeIn,
            TimeOut,
            Reason, 
            employeeSignature,
            departmentHeadSignature 
        } = body;

        // Validate and sanitize FacultyID
        const sanitizedFacultyID = parseRequiredInteger(FacultyID, 'FacultyID');
        
        // Validate required fields
        if (!LeaveType || !StartDate || !EndDate || !Reason) {
            const missingFields = [];
            if (!LeaveType) missingFields.push('LeaveType');
            if (!StartDate) missingFields.push('StartDate');
            if (!EndDate) missingFields.push('EndDate');
            if (!Reason) missingFields.push('Reason');
            
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate leave type from database
        const { data: leaveTypesFromDB } = await supabaseAdmin
            .from('LeaveTypes')
            .select('LeaveTypeName, IsActive')
            .order('LeaveTypeName', { ascending: true });

        const activeLeaveTypes = (leaveTypesFromDB || []).filter((lt: any) => lt.IsActive !== false);
        const validLeaveTypeNames = activeLeaveTypes.map((lt: any) => {
            const name = lt.LeaveTypeName.trim();
            if (name.toLowerCase().endsWith(' leave')) {
                return name.slice(0, -6).trim();
            }
            return name;
        });

        const normalizedIncomingType = normalizeLeaveType(LeaveType);
        const isValidLeaveType = validLeaveTypeNames.some(
            (validType: string) => validType.toLowerCase() === normalizedIncomingType.toLowerCase()
        );

        if (!isValidLeaveType) {
            return NextResponse.json(
                { error: `Invalid leave type. Must be one of: ${validLeaveTypeNames.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate gender-specific leave types
        const leaveTypeLower = LeaveType.toLowerCase();
        if ((leaveTypeLower.includes('maternity') || leaveTypeLower.includes('paternity'))) {
            const faculty = await prisma.faculty.findUnique({
                where: { FacultyID: sanitizedFacultyID },
                include: {
                    Employee: {
                        select: {
                            Sex: true
                        }
                    }
                }
            });

            if (!faculty) {
                return NextResponse.json(
                    { error: 'Faculty record not found' },
                    { status: 404 }
                );
            }

            const employeeGender = faculty.Employee?.Sex?.toLowerCase() || '';
            
            // Maternity leave only for females
            if (leaveTypeLower.includes('maternity') && !leaveTypeLower.includes('transferred')) {
                if (employeeGender !== 'female' && employeeGender !== 'f') {
                    return NextResponse.json(
                        { error: 'Maternity leave is only available for female employees' },
                        { status: 400 }
                    );
                }
            }
            
            // Paternity leave only for males
            if (leaveTypeLower.includes('paternity')) {
                if (employeeGender !== 'male' && employeeGender !== 'm') {
                    return NextResponse.json(
                        { error: 'Paternity leave is only available for male employees' },
                        { status: 400 }
                    );
                }
            }
        }

        // Validate dates
        const start = new Date(StartDate);
        const end = new Date(EndDate);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const requestDays = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        if (start > end) {
            return NextResponse.json(
                { error: 'Start date must be before or equal to end date' },
                { status: 400 }
            );
        }

        // Check leave balance
        const currentYear = new Date().getFullYear();
        const approvedLeaves = await prisma.leave.findMany({
            where: {
                FacultyID: sanitizedFacultyID,
                Status: LeaveStatus.Approved,
                LeaveType: LeaveType,
                StartDate: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`),
                },
            },
        });

        const usedDays = approvedLeaves.reduce((total, leave) => {
            const leaveStart = new Date(leave.StartDate!);
            const leaveEnd = new Date(leave.EndDate!);
            const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
        }, 0);

        // Get leave type limits from database
        const { data: leaveTypeData } = await supabaseAdmin
            .from('LeaveTypes')
            .select('MaxDays, LeaveTypeName')
            .ilike('LeaveTypeName', LeaveType)
            .single();

        const maxDays = leaveTypeData?.MaxDays || 0;
        const remainingDays = maxDays - usedDays;

        if (requestDays > remainingDays) {
            return NextResponse.json(
                { 
                    error: `Insufficient leave balance. Requested: ${requestDays} days, Available: ${remainingDays} days` 
                },
                { status: 400 }
            );
        }

        // Create leave request
        const newLeave = await prisma.leave.create({
            data: {
                FacultyID: sanitizedFacultyID,
                RequestType: RequestType || RequestTypeEnum.Leave,
                LeaveType: LeaveType as LeaveType,
                StartDate: start,
                EndDate: end,
                TimeIn: TimeIn ? new Date(TimeIn) : null,
                TimeOut: TimeOut ? new Date(TimeOut) : null,
                Reason: Reason,
                Status: LeaveStatus.Pending,
                employeeSignature: employeeSignature || null,
                departmentHeadSignature: departmentHeadSignature || null,
            },
        });

        return NextResponse.json({
            message: 'Leave request created successfully',
            leave: newLeave,
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to create leave request' },
            { status: 500 }
        );
    }
}
```

**Key Features:**
- Comprehensive field validation
- Gender-specific leave type validation
- Leave balance checking
- Date range validation
- Database-driven leave type configuration
- Automatic leave day calculation

---

## 6. Performance Analysis and Promotion Recommendations

### 6.1 AI-Powered Promotion Eligibility Analysis
**File:** `src/services/aiAgentService.ts`

This function analyzes employee performance data to determine promotion eligibility using AI.

```typescript
/**
 * Analyze promotion eligibility
 */
async analyzePromotionEligibility(
  employeeId: string
): Promise<PromotionAnalysisResult> {
  // Ensure Prisma connection is established
  await this.ensureConnection();
  
  const employee = await prisma.employee.findUnique({
    where: { EmployeeID: employeeId },
    include: {
      PerformanceReviews: {
        orderBy: { endDate: 'desc' },
        take: 3,
      },
      PerformanceGoals: {
        where: { 
          status: { 
            in: ['Completed', 'InProgress', 'OnTrack'] 
          } 
        },
      },
      trainings: {
        orderBy: { date: 'desc' },
        take: 10,
      },
      DisciplinaryRecords: {
        where: { 
          status: { not: 'Resolved' },
          severity: { in: ['Moderate', 'Major'] }
        },
      },
      employmentDetails: true,
      PromotionHistory: {
        orderBy: { effectiveDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Calculate metrics
  const avgPerformanceScore = employee.PerformanceReviews.length > 0
    ? employee.PerformanceReviews.reduce((sum, r) => 
        sum + (Number(r.totalScore) || 0), 0) / employee.PerformanceReviews.length
    : 0;

  const goalCompletionRate = employee.PerformanceGoals.length > 0
    ? (employee.PerformanceGoals.filter(g => g.status === 'Completed').length / 
       employee.PerformanceGoals.length) * 100
    : 0;

  const lastPromotion = employee.PromotionHistory[0];
  const yearsInPosition = lastPromotion
    ? (new Date().getTime() - new Date(lastPromotion.effectiveDate).getTime()) / 
      (1000 * 60 * 60 * 24 * 365)
    : (new Date().getTime() - new Date(employee.HireDate).getTime()) / 
      (1000 * 60 * 60 * 24 * 365);

  const trainingCount = employee.trainings.length;
  const disciplinaryCount = employee.DisciplinaryRecords.length;
  const currentPosition = employee.Position || employee.employmentDetails?.Position || 'N/A';
  const currentSalaryGrade = employee.employmentDetails?.SalaryGrade || 'N/A';

  // Build AI prompt
  const prompt = `You are an AI HR analyst. Analyze employee performance data for promotion eligibility.

EMPLOYEE DATA:
- Name: ${employee.FirstName} ${employee.LastName}
- Current Position: ${currentPosition}
- Current Salary Grade: ${currentSalaryGrade}
- Years in Position: ${yearsInPosition.toFixed(1)}
- Average Performance Score: ${avgPerformanceScore.toFixed(2)}/100
- Goal Completion Rate: ${goalCompletionRate.toFixed(1)}%
- Training Completed: ${trainingCount}
- Disciplinary Records (Moderate/Major): ${disciplinaryCount}
- Last Promotion: ${lastPromotion?.effectiveDate ? new Date(lastPromotion.effectiveDate).toLocaleDateString() : 'Never'}

PERFORMANCE REVIEWS:
${JSON.stringify(employee.PerformanceReviews.map(r => ({
  period: r.period,
  totalScore: r.totalScore,
  kpiScore: r.kpiScore,
  behaviorScore: r.behaviorScore,
  attendanceScore: r.attendanceScore,
  remarks: r.remarks?.substring(0, 200),
})), null, 2)}

GOALS:
${JSON.stringify(employee.PerformanceGoals.map(g => ({
  title: g.title,
  status: g.status,
  progress: g.progress,
})), null, 2)}

Provide a JSON response (no markdown, just valid JSON):
{
  "eligibilityScore": <number 0-100>,
  "recommendation": "Ready" | "Consider" | "NeedsDevelopment" | "NotReady",
  "strengths": ["strength1", ...],
  "developmentAreas": ["area1", ...],
  "nextSteps": ["step1", ...],
  "analysis": "Detailed analysis explaining the recommendation"
}`;

  try {
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    return JSON.parse(jsonMatch[0]) as PromotionAnalysisResult;
  } catch (error) {
    console.error('Error analyzing promotion:', error);
    
    // Check for quota=0 error
    if (this.isQuotaZeroError(error)) {
      this.handleAIError(error, 'Promotion analysis');
    }
    
    throw error;
  }
}
```

**Key Features:**
- Multi-dimensional performance analysis
- Historical data aggregation
- AI-powered recommendation generation
- Comprehensive metric calculation
- Structured JSON response parsing
- Error handling with quota management

---

## Summary

This appendix presents selected code snippets from critical functions of the HRMS system, demonstrating:

1. **AI Integration**: Google Gemini AI for candidate screening and performance analysis
2. **Security**: HMAC-signed API communication and role-based access control
3. **Automation**: Automatic account creation and data synchronization
4. **Validation**: Comprehensive input validation and business rule enforcement
5. **Error Handling**: Robust error handling with retry logic and cleanup procedures
6. **Data Integrity**: Database transactions and consistency checks

These code snippets represent the core functionality that enables the HRMS system to automate HR processes, provide AI-powered insights, and maintain data integrity across integrated systems.
