import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import type {
  CandidateScreeningResult,
  PromotionAnalysisResult,
  TrainingNeedsResult,
  DisciplinaryRiskResult,
} from '@/types/aiAgent';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class AIAgentService {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }
    ]
  });

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

    // Build a more informative prompt
    let resumeInstruction = '';
    if (candidateContext.resumeAvailable) {
      if (candidateContext.resumeUrl) {
        resumeInstruction = `IMPORTANT: The candidate HAS submitted a resume file which is available.
Resume URL: ${candidateContext.resumeUrl}

However, since the resume file content cannot be directly extracted in this automated analysis, please:
1. Acknowledge that a resume exists (do NOT say "Resume not available")
2. Base your assessment on the available candidate profile information
3. Consider that they applied to this position (which suggests alignment with job requirements)
4. For resumeScore: Give a moderate score (60-70) since a resume exists but content cannot be fully analyzed
5. Recommend "NeedsReview" to indicate manual resume review is needed
6. In your analysis, clearly state: "A resume has been submitted and should be manually reviewed for detailed qualification assessment"`;
      } else {
        resumeInstruction = `NOTE: A resume file exists but the URL is not available. Analyze based on available profile information and recommend manual review.`;
      }
    } else {
      resumeInstruction = `NOTE: No resume has been provided by the candidate. This is a significant limitation for assessment. Resume score should reflect this.`;
    }

    // AI Prompt
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
${candidateContext.resumeUrl ? `- Resume URL: ${candidateContext.resumeUrl}` : ''}

${resumeInstruction}

JOB REQUIREMENTS:
- Position: ${vacancyContext.title}
- Job Title: ${vacancyContext.jobTitle}
- Description: ${vacancyContext.description}
- Requirements: ${JSON.stringify(vacancyContext.requirements, null, 2)}

ANALYSIS GUIDELINES:
1. Resume Assessment:
   - If resume URL is provided: DO NOT say "Resume not available". Instead, state that "A resume has been submitted and requires manual review"
   - If resume exists: Give resumeScore between 60-70 (moderate score acknowledging file exists but content not analyzed)
   - If no resume: Give resumeScore below 50 and clearly note this limitation

2. For scoring:
   - Resume Score: 
     * 60-70 if resume file exists but content not accessible (acknowledge file exists)
     * 0-50 if no resume provided (clear limitation)
   - Qualification Score: Assess based on job requirements vs. available information
   - Experience Score: Consider the position level and typical experience expectations
   - Skill Match Score: Based on job requirements alignment and position applied for

3. Recommendation guidelines:
   - "NeedsReview": Use when resume content cannot be automatically analyzed (even if file exists)
   - "Reject": Only if clearly unqualified based on available information (rare without resume content)
   - "Consider" to "StrongRecommend": Based on profile completeness, but should still recommend manual review

Analyze and provide a JSON response with the following structure (no markdown, just valid JSON):
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
  "aiAnalysis": "Detailed analysis text explaining the recommendation. If resume content was not accessible, clearly state this limitation."
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
      // Update status to Failed if it exists
      try {
        await prisma.candidateScreening.updateMany({
          where: { candidateId, vacancyId },
          data: { status: 'Failed' },
        });
      } catch (updateError) {
        // Ignore update errors
      }
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

    // Build prompt
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
        trainings: {
          orderBy: { date: 'desc' },
        },
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

    const currentPosition = employee.Position || employee.employmentDetails?.Position || 'N/A';
    const currentSkills = employee.skills.map(s => ({
      name: s.name,
      proficiency: s.proficiencyLevel,
      years: s.yearsOfExperience,
    }));

    const completedTrainings = employee.trainings.map(t => t.title);
    const improvementAreas = employee.PerformanceReviews
      .flatMap(r => {
        const areas = r.improvementAreas as any;
        return Array.isArray(areas) ? areas : [];
      });

    const prompt = `Analyze training needs for employee.

EMPLOYEE:
- Position: ${currentPosition}
- Current Skills: ${JSON.stringify(currentSkills, null, 2)}
- Completed Trainings: ${JSON.stringify(completedTrainings)}
- Performance Improvement Areas: ${JSON.stringify(improvementAreas)}

Identify skill gaps and recommend training. Provide JSON response (no markdown, just valid JSON):
{
  "skillGaps": [
    {
      "skill": "skill name",
      "currentLevel": "current level",
      "requiredLevel": "required level",
      "priority": "Low" | "Medium" | "High" | "Critical"
    }
  ],
  "trainingRecommendations": [
    {
      "title": "training title",
      "description": "training description",
      "estimatedHours": <number>,
      "priority": "Low" | "Medium" | "High" | "Critical"
    }
  ],
  "analysis": "Detailed analysis text"
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

      return JSON.parse(jsonMatch[0]) as TrainingNeedsResult;
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

    const totalAttendance = employee.Attendance.length;
    const attendanceRate = totalAttendance > 0 
      ? ((totalAttendance - attendanceIssues) / totalAttendance) * 100 
      : 100;

    const recentDisciplinary = employee.DisciplinaryRecords.filter(
      r => new Date(r.dateTime) > new Date(new Date().setMonth(new Date().getMonth() - 6))
    );

    const performanceTrend = employee.PerformanceReviews.map(r => Number(r.totalScore) || 0);

    const prompt = `Analyze disciplinary risk for employee.

EMPLOYEE DATA:
- Name: ${employee.FirstName} ${employee.LastName}
- Disciplinary Records (All Time): ${employee.DisciplinaryRecords.length}
- Recent Disciplinary Records (Last 6 months): ${recentDisciplinary.length}
- Attendance Issues (Last 6 months): ${attendanceIssues} out of ${totalAttendance}
- Attendance Rate: ${attendanceRate.toFixed(1)}%
- Performance Trend: ${performanceTrend.join(', ')}

RECENT DISCIPLINARY RECORDS:
${JSON.stringify(recentDisciplinary.map(r => ({
  date: r.dateTime,
  category: r.category,
  violation: r.violation,
  severity: r.severity,
  status: r.status,
})), null, 2)}

Provide JSON response (no markdown, just valid JSON):
{
  "riskScore": <number 0-100>,
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "riskFactors": ["factor1", ...],
  "patternAnalysis": "Analysis of patterns and trends",
  "recommendedAction": "Recommended action to take"
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

      const analysis = JSON.parse(jsonMatch[0]) as DisciplinaryRiskResult;

      // Save to database - find existing record by employeeId first
      const existingAnalysis = await prisma.disciplinaryRiskAnalysis.findFirst({
        where: { employeeId },
      });

      if (existingAnalysis) {
        await prisma.disciplinaryRiskAnalysis.update({
          where: { id: existingAnalysis.id },
          data: {
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskLevel,
            riskFactors: analysis.riskFactors,
            patternAnalysis: analysis.patternAnalysis,
            recommendedAction: analysis.recommendedAction,
            lastAnalysisDate: new Date(),
          },
        });
      } else {
        await prisma.disciplinaryRiskAnalysis.create({
          data: {
            employeeId,
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskLevel,
            riskFactors: analysis.riskFactors,
            patternAnalysis: analysis.patternAnalysis,
            recommendedAction: analysis.recommendedAction,
            lastAnalysisDate: new Date(),
          },
        });
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing disciplinary risk:', error);
      throw error;
    }
  }
}

