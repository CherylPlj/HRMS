import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { AIAgentService } from '@/services/aiAgentService';
import { TrainingPriority } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const aiService = new AIAgentService();

export async function POST(request: NextRequest) {
  try {
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

    const employees = await prisma.employee.findMany({
      where,
      select: {
        EmployeeID: true,
        FirstName: true,
        LastName: true,
      },
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
        // Check if employee has recent training recommendations (within last 7 days)
        if (skipRecent) {
          const performanceModule = await prisma.performanceModule.findUnique({
            where: { employeeId: employee.EmployeeID },
            include: {
              trainingRecommendations: {
                where: {
                  aiGenerated: true,
                  createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                  },
                },
                take: 1,
              },
            },
          });

          if (performanceModule?.trainingRecommendations && performanceModule.trainingRecommendations.length > 0) {
            skippedRecent++;
            continue; // Skip if has recent AI-generated training recommendations
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
            aiResult = await aiService.analyzeTrainingNeeds(employee.EmployeeID);
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

        // Get or create PerformanceModule
        let performanceModule = await prisma.performanceModule.findUnique({
          where: { employeeId: employee.EmployeeID },
        });

        if (!performanceModule) {
          performanceModule = await prisma.performanceModule.create({
            data: {
              employeeId: employee.EmployeeID,
              status: 'Active',
            },
          });
        }

        // Map priority from AI result to enum
        const priorityMap: Record<string, TrainingPriority> = {
          Critical: 'Critical',
          High: 'High',
          Medium: 'Medium',
          Low: 'Low',
        };

        // Create training recommendations from AI analysis
        if (aiResult.trainingRecommendations && Array.isArray(aiResult.trainingRecommendations)) {
          for (const training of aiResult.trainingRecommendations) {
            const priority = priorityMap[training.priority] || 'Medium';
            
            await prisma.trainingRecommendation.create({
              data: {
                performanceModuleId: performanceModule.id,
                trainingTitle: training.title,
                trainingDescription: training.description || aiResult.analysis,
                priority,
                reason: `AI Analysis: ${aiResult.analysis || 'Training needed based on skill gaps'}`,
                estimatedHours: training.estimatedHours || null,
                estimatedCost: null, // Can be calculated separately
                skillGap: aiResult.skillGaps?.[0]?.skill || null,
                status: 'Pending',
                aiGenerated: true,
              },
            });
            recommendations++;
          }
        }

        analyzed++;
      } catch (error) {
        const errorMsg = `Error analyzing ${employee.EmployeeID}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return NextResponse.json({
      message: `Analysis complete. Analyzed ${analyzed} employees (${skippedRecent} skipped - recently analyzed, ${skipped} not processed - limit reached), generated ${recommendations} training recommendations.`,
      analyzed,
      skippedRecent,
      skipped,
      recommendations,
      totalEmployees: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in batch training analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze training needs';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

