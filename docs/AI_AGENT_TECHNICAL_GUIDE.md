# AI Agent Technical Implementation Guide

## Quick Start: Code Examples and Implementation Details

This guide provides concrete code examples and implementation patterns for the AI Agent features.

---

## 1. Database Schema Updates

### Step 1: Update `prisma/schema.prisma`

Add these models after the existing models:

```prisma
// Performance Module
model PerformanceModule {
  id                  String              @id @default(cuid())
  employeeId          String              @unique
  currentPosition     String?
  currentSalaryGrade  String?
  currentSalaryAmount Decimal?            @db.Decimal(10, 2)
  recommendedPosition String?
  recommendedSalaryGrade String?
  recommendedSalaryAmount Decimal?        @db.Decimal(10, 2)
  promotionEligibilityScore Decimal?      @db.Decimal(5, 2)
  promotionRecommendation String?          @db.Text
  lastPromotionDate   DateTime?           @db.Date
  yearsInCurrentPosition Float?
  status              PerformanceModuleStatus @default(Active)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  employee            Employee            @relation(fields: [employeeId], references: [EmployeeID])
  trainingRecommendations TrainingRecommendation[]
  
  @@index([employeeId])
  @@index([promotionEligibilityScore])
  @@index([status])
}

model TrainingRecommendation {
  id                    String            @id @default(cuid())
  performanceModuleId   String
  trainingTitle         String
  trainingDescription   String?           @db.Text
  priority              TrainingPriority  @default(Medium)
  reason                String?           @db.Text
  estimatedHours        Int?
  estimatedCost         Decimal?          @db.Decimal(10, 2)
  skillGap              String?
  status                TrainingRecommendationStatus @default(Pending)
  aiGenerated           Boolean           @default(true)
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  performanceModule     PerformanceModule @relation(fields: [performanceModuleId], references: [id], onDelete: Cascade)
  
  @@index([performanceModuleId])
  @@index([priority])
  @@index([status])
}

// Recruitment AI
model CandidateScreening {
  id                    String              @id @default(cuid())
  candidateId           Int
  vacancyId             Int
  overallScore           Decimal?            @db.Decimal(5, 2)
  resumeScore           Decimal?            @db.Decimal(5, 2)
  qualificationScore    Decimal?            @db.Decimal(5, 2)
  experienceScore       Decimal?            @db.Decimal(5, 2)
  skillMatchScore       Decimal?            @db.Decimal(5, 2)
  recommendation        CandidateRecommendation @default(Reject)
  aiAnalysis            String?             @db.Text
  strengths             Json?
  weaknesses            Json?
  missingQualifications Json?
  suggestedQuestions    Json?
  riskFactors           Json?
  status                ScreeningStatus     @default(Pending)
  screenedAt            DateTime?          @default(now())
  screenedBy            String?             @default("AI_AGENT")
  candidate             Candidate           @relation(fields: [candidateId], references: [CandidateID])
  vacancy               Vacancy             @relation(fields: [vacancyId], references: [VacancyID])
  
  @@unique([candidateId, vacancyId])
  @@index([overallScore])
  @@index([recommendation])
  @@index([status])
}

model VacancyRequirement {
  id                    String              @id @default(cuid())
  vacancyId             Int
  requirementType        RequirementType
  requirementText        String              @db.Text
  isRequired             Boolean             @default(true)
  weight                 Decimal?            @db.Decimal(5, 2)
  vacancy                Vacancy             @relation(fields: [vacancyId], references: [VacancyID])
  
  @@index([vacancyId])
  @@index([requirementType])
}

// Training Needs Analysis
model TrainingNeedsAnalysis {
  id                    String              @id @default(cuid())
  employeeId             String
  analysisDate          DateTime            @default(now())
  currentSkills          Json?
  requiredSkills         Json?
  skillGaps              Json?
  trainingPlan           Json?
  priorityScore          Decimal?           @db.Decimal(5, 2)
  estimatedCompletion    DateTime?          @db.Date
  status                 TrainingAnalysisStatus @default(Pending)
  aiGenerated            Boolean             @default(true)
  employee               Employee            @relation(fields: [employeeId], references: [EmployeeID])
  
  @@index([employeeId])
  @@index([priorityScore])
  @@index([status])
}

// Disciplinary Risk Analysis
model DisciplinaryRiskAnalysis {
  id                    String              @id @default(cuid())
  employeeId             String
  riskScore              Decimal?           @db.Decimal(5, 2)
  riskLevel              RiskLevel          @default(Low)
  riskFactors            Json?
  patternAnalysis        String?            @db.Text
  recommendedAction      String?            @db.Text
  lastAnalysisDate       DateTime           @default(now())
  employee               Employee           @relation(fields: [employeeId], references: [EmployeeID])
  
  @@index([employeeId])
  @@index([riskScore])
  @@index([riskLevel])
}

// Update existing models to add relations
model Employee {
  // ... existing fields ...
  performanceModule      PerformanceModule?
  trainingNeedsAnalysis TrainingNeedsAnalysis[]
  disciplinaryRiskAnalysis DisciplinaryRiskAnalysis[]
}

model Candidate {
  // ... existing fields ...
  screenings             CandidateScreening[]
}

model Vacancy {
  // ... existing fields ...
  requirements           VacancyRequirement[]
  screenings             CandidateScreening[]
}

// Enums
enum PerformanceModuleStatus {
  Active
  Inactive
  UnderReview
}

enum TrainingPriority {
  Low
  Medium
  High
  Critical
}

enum TrainingRecommendationStatus {
  Pending
  Approved
  Rejected
  Completed
  InProgress
}

enum CandidateRecommendation {
  StrongRecommend
  Recommend
  Consider
  Reject
  NeedsReview
}

enum ScreeningStatus {
  Pending
  Processing
  Completed
  Failed
}

enum RequirementType {
  Education
  Experience
  Skill
  Certification
  Language
  Other
}

enum TrainingAnalysisStatus {
  Pending
  InProgress
  Completed
  Archived
}

enum RiskLevel {
  Low
  Medium
  High
  Critical
}
```

### Step 2: Run Migration

```bash
npx prisma migrate dev --name add_ai_agent_models
npx prisma generate
```

---

## 2. AI Agent Service Implementation

### Create `src/services/aiAgentService.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface CandidateScreeningResult {
  overallScore: number;
  resumeScore: number;
  qualificationScore: number;
  experienceScore: number;
  skillMatchScore: number;
  recommendation: 'StrongRecommend' | 'Recommend' | 'Consider' | 'Reject' | 'NeedsReview';
  strengths: string[];
  weaknesses: string[];
  missingQualifications: string[];
  suggestedQuestions: string[];
  riskFactors: string[];
  aiAnalysis: string;
}

export interface PromotionAnalysisResult {
  eligibilityScore: number;
  recommendation: 'Ready' | 'Consider' | 'NeedsDevelopment' | 'NotReady';
  strengths: string[];
  developmentAreas: string[];
  nextSteps: string[];
  analysis: string;
}

export interface TrainingNeedsResult {
  skillGaps: Array<{
    skill: string;
    currentLevel: string;
    requiredLevel: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
  }>;
  trainingRecommendations: Array<{
    title: string;
    description: string;
    estimatedHours: number;
    priority: string;
  }>;
  analysis: string;
}

export interface DisciplinaryRiskResult {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskFactors: string[];
  patternAnalysis: string;
  recommendedAction: string;
}

export class AIAgentService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  /**
   * Screen a candidate against a vacancy
   */
  async screenCandidate(
    candidateId: number,
    vacancyId: number
  ): Promise<CandidateScreeningResult> {
    // Fetch candidate and vacancy data
    const candidate = await prisma.candidate.findUnique({
      where: { CandidateID: candidateId },
      include: { Vacancy: true },
    });

    const vacancy = await prisma.vacancy.findUnique({
      where: { VacancyID: vacancyId },
      include: { requirements: true },
    });

    if (!candidate || !vacancy) {
      throw new Error('Candidate or vacancy not found');
    }

    // Build context for AI
    const context = this.buildCandidateContext(candidate, vacancy);

    // AI Prompt
    const prompt = `You are an AI recruitment specialist. Analyze the candidate's profile against the job requirements.

CANDIDATE PROFILE:
- Name: ${candidate.FullName}
- Email: ${candidate.Email}
- Resume: ${candidate.ResumeUrl ? 'Available' : 'Not provided'}
- Experience: ${candidate.DateApplied ? `Applied on ${candidate.DateApplied}` : 'N/A'}

JOB REQUIREMENTS:
- Position: ${vacancy.VacancyName}
- Job Title: ${vacancy.JobTitle}
- Description: ${vacancy.Description || 'N/A'}
- Requirements: ${JSON.stringify(vacancy.requirements || [])}

Analyze and provide a JSON response with:
{
  "overallScore": <0-100>,
  "resumeScore": <0-100>,
  "qualificationScore": <0-100>,
  "experienceScore": <0-100>,
  "skillMatchScore": <0-100>,
  "recommendation": "StrongRecommend" | "Recommend" | "Consider" | "Reject" | "NeedsReview",
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "missingQualifications": ["qualification1", ...],
  "suggestedQuestions": ["question1", "question2", ...],
  "riskFactors": ["risk1", ...],
  "aiAnalysis": "Detailed analysis text"
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

      const analysis = JSON.parse(jsonMatch[0]);
      
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

  /**
   * Analyze promotion eligibility
   */
  async analyzePromotionEligibility(
    employeeId: string
  ): Promise<PromotionAnalysisResult> {
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      include: {
        PerformanceReviews: {
          orderBy: { endDate: 'desc' },
          take: 3,
        },
        PerformanceGoals: {
          where: { status: { in: ['Completed', 'InProgress'] } },
        },
        trainings: true,
        DisciplinaryRecords: {
          where: { status: { not: 'Resolved' } },
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

    const yearsInPosition = employee.PromotionHistory[0]
      ? (new Date().getTime() - new Date(employee.PromotionHistory[0].effectiveDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 365)
      : (new Date().getTime() - new Date(employee.HireDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 365);

    const trainingCount = employee.trainings.length;
    const disciplinaryCount = employee.DisciplinaryRecords.length;

    // Build prompt
    const prompt = `You are an AI HR analyst. Analyze employee performance data for promotion eligibility.

EMPLOYEE DATA:
- Name: ${employee.FirstName} ${employee.LastName}
- Position: ${employee.Position || 'N/A'}
- Years in Position: ${yearsInPosition.toFixed(1)}
- Average Performance Score: ${avgPerformanceScore.toFixed(2)}/100
- Goal Completion Rate: ${goalCompletionRate.toFixed(1)}%
- Training Completed: ${trainingCount}
- Disciplinary Records: ${disciplinaryCount}
- Last Promotion: ${employee.PromotionHistory[0]?.effectiveDate || 'Never'}

PERFORMANCE REVIEWS:
${JSON.stringify(employee.PerformanceReviews.map(r => ({
  period: r.period,
  totalScore: r.totalScore,
  remarks: r.remarks,
})))}}

Provide a JSON response:
{
  "eligibilityScore": <0-100>,
  "recommendation": "Ready" | "Consider" | "NeedsDevelopment" | "NotReady",
  "strengths": ["strength1", ...],
  "developmentAreas": ["area1", ...],
  "nextSteps": ["step1", ...],
  "analysis": "Detailed analysis"
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

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing promotion:', error);
      throw error;
    }
  }

  /**
   * Analyze training needs
   */
  async analyzeTrainingNeeds(employeeId: string): Promise<TrainingNeedsResult> {
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      include: {
        skills: true,
        trainings: true,
        PerformanceReviews: {
          orderBy: { endDate: 'desc' },
          take: 2,
        },
        employmentDetails: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const prompt = `Analyze training needs for employee.

EMPLOYEE:
- Position: ${employee.Position}
- Current Skills: ${JSON.stringify(employee.skills)}
- Completed Trainings: ${JSON.stringify(employee.trainings.map(t => t.title))}
- Performance Areas: ${JSON.stringify(employee.PerformanceReviews.map(r => r.improvementAreas))}

Identify skill gaps and recommend training. Provide JSON:
{
  "skillGaps": [{"skill": "...", "currentLevel": "...", "requiredLevel": "...", "priority": "..."}],
  "trainingRecommendations": [{"title": "...", "description": "...", "estimatedHours": ..., "priority": "..."}],
  "analysis": "..."
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

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing training needs:', error);
      throw error;
    }
  }

  /**
   * Analyze disciplinary risk
   */
  async analyzeDisciplinaryRisk(employeeId: string): Promise<DisciplinaryRiskResult> {
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
      include: {
        DisciplinaryRecords: {
          orderBy: { dateTime: 'desc' },
        },
        Attendance: {
          where: {
            date: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
        },
        PerformanceReviews: {
          orderBy: { endDate: 'desc' },
          take: 2,
        },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const attendanceIssues = employee.Attendance.filter(
      a => a.status === 'ABSENT' || a.status === 'LATE'
    ).length;

    const prompt = `Analyze disciplinary risk for employee.

EMPLOYEE DATA:
- Disciplinary Records: ${employee.DisciplinaryRecords.length}
- Recent Attendance Issues: ${attendanceIssues}
- Performance Trend: ${employee.PerformanceReviews.map(r => r.totalScore).join(', ')}

Provide JSON:
{
  "riskScore": <0-100>,
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "riskFactors": ["factor1", ...],
  "patternAnalysis": "...",
  "recommendedAction": "..."
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

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing disciplinary risk:', error);
      throw error;
    }
  }

  // Helper methods
  private buildCandidateContext(candidate: any, vacancy: any): string {
    return JSON.stringify({
      candidate: {
        name: candidate.FullName,
        email: candidate.Email,
        resume: candidate.ResumeUrl,
      },
      vacancy: {
        title: vacancy.VacancyName,
        description: vacancy.Description,
        requirements: vacancy.requirements,
      },
    });
  }
}
```

---

## 3. API Routes Implementation

### Create `src/app/api/ai/candidate-screening/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AIAgentService } from '@/services/aiAgentService';
import { auth } from '@clerk/nextjs/server';

const aiService = new AIAgentService();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, vacancyId } = await req.json();

    if (!candidateId || !vacancyId) {
      return NextResponse.json(
        { error: 'Candidate ID and Vacancy ID are required' },
        { status: 400 }
      );
    }

    const result = await aiService.screenCandidate(candidateId, vacancyId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in candidate screening:', error);
    return NextResponse.json(
      { error: 'Failed to screen candidate' },
      { status: 500 }
    );
  }
}
```

### Create `src/app/api/ai/promotion-analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AIAgentService } from '@/services/aiAgentService';
import { auth } from '@clerk/nextjs/server';

const aiService = new AIAgentService();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const result = await aiService.analyzePromotionEligibility(employeeId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in promotion analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze promotion eligibility' },
      { status: 500 }
    );
  }
}
```

---

## 4. Frontend Component Example

### Create `src/components/ai/AICandidateScreening.tsx`

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ScreeningResult {
  overallScore: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  suggestedQuestions: string[];
  aiAnalysis: string;
}

export function AICandidateScreening({
  candidateId,
  vacancyId,
  onComplete,
}: {
  candidateId: number;
  vacancyId: number;
  onComplete?: (result: ScreeningResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const handleScreen = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/candidate-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, vacancyId }),
      });

      if (!response.ok) throw new Error('Screening failed');

      const data = await response.json();
      setResult(data);
      onComplete?.(data);
      toast.success('Candidate screened successfully');
    } catch (error) {
      toast.error('Failed to screen candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <button
        onClick={handleScreen}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Screening...' : 'Run AI Screening'}
      </button>

      {result && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-bold">Overall Score: {result.overallScore}/100</h3>
            <p className="text-sm text-gray-600">Recommendation: {result.recommendation}</p>
          </div>

          <div>
            <h4 className="font-semibold">Strengths</h4>
            <ul className="list-disc list-inside">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Weaknesses</h4>
            <ul className="list-disc list-inside">
              {result.weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Suggested Interview Questions</h4>
            <ul className="list-disc list-inside">
              {result.suggestedQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">AI Analysis</h4>
            <p className="text-sm">{result.aiAnalysis}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Environment Variables

Add to `.env.local`:

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

---

## 6. Next Steps

1. **Run the migration** to add new database models
2. **Implement the AI service** with your specific business logic
3. **Create API routes** for each AI feature
4. **Build frontend components** to display AI insights
5. **Test thoroughly** with real data
6. **Refine prompts** based on results

---

## 7. Testing Example

```typescript
// Example test for candidate screening
describe('AIAgentService', () => {
  it('should screen a candidate', async () => {
    const service = new AIAgentService();
    const result = await service.screenCandidate(1, 1);
    
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(['StrongRecommend', 'Recommend', 'Consider', 'Reject', 'NeedsReview'])
      .toContain(result.recommendation);
  });
});
```

---

This guide provides the foundation for implementing AI Agent features. Customize the prompts and scoring algorithms based on your specific requirements.

