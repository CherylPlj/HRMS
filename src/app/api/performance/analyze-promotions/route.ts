import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';
import { AIAgentService } from '@/services/aiAgentService';
import { Decimal } from '@prisma/client/runtime/library';
import { PromotionPriority, PromotionRecommendationStatus } from '@prisma/client';

const aiService = new AIAgentService();

// Helper function to retry database operations with connection handling
async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Ensure connection before each attempt
      await ensurePrismaConnected();
      return await operation();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a connection error
      const isConnectionError = 
        error?.message?.includes('Engine is not yet connected') ||
        error?.message?.includes('not yet connected') ||
        error?.code === 'P1001' ||
        error?.code === 'P1000';
      
      if (isConnectionError && attempt < maxRetries - 1) {
        // Try to reconnect
        try {
          await prisma.$disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // If not a connection error or out of retries, throw
      throw error;
    }
  }
  
  throw lastError || new Error('Database operation failed after retries');
}

export async function POST(request: NextRequest) {
  try {
    // Ensure Prisma is connected before making queries
    await ensurePrismaConnected();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body - handle empty body gracefully
    let employeeIds: string[] | undefined;
    let batchSize: number = 20; // Default: analyze 20 employees at a time
    let skipRecent: boolean = true; // Skip employees analyzed in last 7 days
    let maxEmployees: number = 50; // Maximum employees to analyze per request
    
    try {
      const body = await request.json();
      employeeIds = body.employeeIds;
      batchSize = body.batchSize || batchSize;
      skipRecent = body.skipRecent !== undefined ? body.skipRecent : skipRecent;
      maxEmployees = body.maxEmployees || maxEmployees;
    } catch (error) {
      // Empty body is fine - we'll analyze all employees
      employeeIds = undefined;
    }
    
    // Get all active employees or specific ones if provided
    const where = employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0
      ? { EmployeeID: { in: employeeIds }, isDeleted: false }
      : { isDeleted: false };

    // Use retry logic for the database query
    const employees = await retryDatabaseOperation(async () => {
      return await prisma.employee.findMany({
        where,
        select: {
          EmployeeID: true,
          FirstName: true,
          LastName: true,
          HireDate: true,
          Position: true,
          DepartmentID: true,
        },
      });
    });

    if (employees.length === 0) {
      return NextResponse.json({ 
        message: 'No employees found to analyze',
        analyzed: 0,
        recommendations: 0,
      });
    }

    // Limit number of employees to analyze per request
    const employeesToAnalyze = employees.slice(0, maxEmployees);
    const skipped = employees.length - employeesToAnalyze.length;

    let analyzed = 0;
    let skippedRecent = 0;
    let recommendations = 0;
    const errors: string[] = [];

    // Analyze each employee with delay to avoid overwhelming the database and AI quota
    for (let i = 0; i < employeesToAnalyze.length; i++) {
      const employee = employeesToAnalyze[i];
      try {
        // Check if employee was recently analyzed (within last 7 days)
        if (skipRecent) {
          const existingModule = await retryDatabaseOperation(async () => {
            return await prisma.performanceModule.findUnique({
              where: { employeeId: employee.EmployeeID },
              select: { updatedAt: true, promotionEligibilityScore: true },
            });
          });

          if (existingModule?.updatedAt) {
            const daysSinceUpdate = (new Date().getTime() - new Date(existingModule.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 7 && existingModule.promotionEligibilityScore !== null) {
              skippedRecent++;
              continue; // Skip if analyzed within last 7 days
            }
          }
        }

        // Rate limiting: Add delay between AI API calls to avoid quota exhaustion
        // 2-3 seconds delay between each AI call to stay within free tier limits
        if (i > 0) {
          const delay = 2500; // 2.5 seconds between AI calls
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Run AI analysis with retry logic for database connection issues
        let aiResult;
        let retries = 3;
        while (retries > 0) {
          try {
            aiResult = await aiService.analyzePromotionEligibility(employee.EmployeeID);
            break;
          } catch (dbError: any) {
            if (dbError.message?.includes('prepared statement') || dbError.message?.includes('does not exist')) {
              retries--;
              if (retries > 0) {
                // Reconnect Prisma client
                await prisma.$disconnect();
                await prisma.$connect();
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
                continue;
              }
            }
            throw dbError;
          }
        }
        
        if (!aiResult) {
          throw new Error('Failed to get AI analysis after retries');
        }

        // Calculate years in service
        const yearsInService = employee.HireDate
          ? (new Date().getTime() - new Date(employee.HireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          : 0;

        // Get or create PerformanceModule
        let performanceModule = await retryDatabaseOperation(async () => {
          return await prisma.performanceModule.findUnique({
            where: { employeeId: employee.EmployeeID },
          });
        });

        // Get current position from employee or employment details
        const employmentDetail = await retryDatabaseOperation(async () => {
          return await prisma.employmentDetail.findFirst({
            where: { employeeId: employee.EmployeeID },
            select: { Position: true, SalaryGrade: true },
          });
        });

        const currentPosition = employmentDetail?.Position || employee.Position;
        const currentSalaryGrade = employmentDetail?.SalaryGrade;

        // Update or create PerformanceModule
        const moduleData: any = {
          currentPosition,
          currentSalaryGrade,
          promotionEligibilityScore: new Decimal(aiResult.eligibilityScore || 0),
          yearsInCurrentPosition: yearsInService,
          status: 'Active',
        };

        if (performanceModule) {
          // Update existing module
          const moduleId = performanceModule.id;
          performanceModule = await retryDatabaseOperation(async () => {
            return await prisma.performanceModule.update({
              where: { id: moduleId },
              data: moduleData,
            });
          });
        } else {
          // Create new module
          performanceModule = await retryDatabaseOperation(async () => {
            return await prisma.performanceModule.create({
              data: {
                employeeId: employee.EmployeeID,
                ...moduleData,
              },
            });
          });
        }

        // Ensure performanceModule is defined (should always be after if/else above)
        if (!performanceModule) {
          throw new Error('Failed to create or update performance module');
        }

        // Determine priority based on eligibility score
        const priorityMap: Record<string, PromotionPriority> = {
          Ready: 'High',
          Consider: 'Medium',
          NeedsDevelopment: 'Low',
          NotReady: 'Low',
        };
        const priority = priorityMap[aiResult.recommendation] || 'Medium';

        // Only create promotion recommendation if eligible (score >= 70 and years >= 2)
        if (aiResult.eligibilityScore >= 70 && yearsInService >= 2) {
          // Determine recommended position (could be enhanced with AI suggestion)
          const recommendedPosition = currentPosition ? `${currentPosition} (Senior)` : 'Promotion Recommended';
          
          await retryDatabaseOperation(async () => {
            return await prisma.promotionRecommendation.create({
              data: {
                performanceModuleId: performanceModule.id,
                recommendedPosition,
                recommendedSalaryGrade: currentSalaryGrade ? `Grade ${parseInt(currentSalaryGrade) + 1}` : null,
                promotionReason: aiResult.analysis || `AI Analysis: ${aiResult.recommendation}. ${aiResult.strengths?.join(', ') || ''}`,
                eligibilityScore: new Decimal(aiResult.eligibilityScore),
                priority,
                status: PromotionRecommendationStatus.Pending,
                aiGenerated: true,
              },
            });
          });
          recommendations++;
        }

        analyzed++;
      } catch (error) {
        const errorMsg = `Error analyzing ${employee.EmployeeID}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return NextResponse.json({
      message: `Analysis complete. Analyzed ${analyzed} employees (${skippedRecent} skipped - recently analyzed, ${skipped} not processed - limit reached), found ${recommendations} promotion recommendations.`,
      analyzed,
      skippedRecent,
      skipped,
      recommendations,
      totalEmployees: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in batch promotion analysis:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to analyze promotions';
    if (error instanceof Error) {
      if (error.message.includes('Engine is not yet connected') || 
          error.message.includes('not yet connected')) {
        errorMessage = 'Database connection error. Please try again.';
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = 'You are not authorized to perform this action.';
      } else if (error.message.length < 200) {
        // Only use the error message if it's short and user-friendly
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

