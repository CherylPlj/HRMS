# AI Agent Implementation Steps - For Approval

This document outlines the exact steps I will take to implement the AI Agent features. Please review and approve before I proceed.

---

## Implementation Overview

**Total Steps**: 15 main steps across 4 phases
**Estimated Time**: Will implement incrementally, starting with Phase 1

---

## Phase 1: Database Schema & Foundation

### Step 1: Update Prisma Schema
**File**: `prisma/schema.prisma`

**Actions**:
- Add new models:
  - `PerformanceModule`
  - `TrainingRecommendation`
  - `CandidateScreening`
  - `VacancyRequirement`
  - `TrainingNeedsAnalysis`
  - `DisciplinaryRiskAnalysis`
- Add new enums:
  - `PerformanceModuleStatus`
  - `TrainingPriority`
  - `TrainingRecommendationStatus`
  - `CandidateRecommendation`
  - `ScreeningStatus`
  - `RequirementType`
  - `TrainingAnalysisStatus`
  - `RiskLevel`
- Add relations to existing models:
  - `Employee` → add relations to new models
  - `Candidate` → add relation to `CandidateScreening`
  - `Vacancy` → add relations to `VacancyRequirement` and `CandidateScreening`

**Impact**: Database structure changes only, no breaking changes to existing data

---

### Step 2: Create Database Migration
**Command**: `npx prisma migrate dev --name add_ai_agent_models`

**Actions**:
- Generate migration files
- Apply migration to database
- Regenerate Prisma client

**Impact**: Creates new tables in database

---

## Phase 2: AI Service Layer

### Step 3: Create AI Agent Service
**File**: `src/services/aiAgentService.ts` (NEW FILE)

**Actions**:
- Create `AIAgentService` class
- Initialize Google Gemini AI client
- Implement methods:
  - `screenCandidate()` - Candidate screening
  - `analyzePromotionEligibility()` - Promotion analysis
  - `analyzeTrainingNeeds()` - Training needs analysis
  - `analyzeDisciplinaryRisk()` - Disciplinary risk analysis
- Add helper methods for context building
- Add TypeScript interfaces for return types

**Code Structure**:
```typescript
export class AIAgentService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  async screenCandidate(...)
  async analyzePromotionEligibility(...)
  async analyzeTrainingNeeds(...)
  async analyzeDisciplinaryRisk(...)
}
```

**Impact**: New service file, no changes to existing code

---

### Step 4: Create Type Definitions
**File**: `src/types/aiAgent.ts` (NEW FILE)

**Actions**:
- Define TypeScript interfaces:
  - `CandidateScreeningResult`
  - `PromotionAnalysisResult`
  - `TrainingNeedsResult`
  - `DisciplinaryRiskResult`
  - `ReportFilters`
  - `ReportType`

**Impact**: Type definitions only, improves type safety

---

## Phase 3: API Routes

### Step 5: Candidate Screening API
**File**: `src/app/api/ai/candidate-screening/route.ts` (NEW FILE)

**Actions**:
- Create POST endpoint
- Add Clerk authentication check
- Validate request body (candidateId, vacancyId)
- Call `aiAgentService.screenCandidate()`
- Return screening results
- Handle errors gracefully

**Endpoint**: `POST /api/ai/candidate-screening`

**Request Body**:
```json
{
  "candidateId": 1,
  "vacancyId": 1
}
```

**Impact**: New API endpoint

---

### Step 6: Promotion Analysis API
**File**: `src/app/api/ai/promotion-analysis/route.ts` (NEW FILE)

**Actions**:
- Create POST endpoint
- Add Clerk authentication check
- Validate request body (employeeId)
- Call `aiAgentService.analyzePromotionEligibility()`
- Return promotion analysis
- Handle errors

**Endpoint**: `POST /api/ai/promotion-analysis`

**Request Body**:
```json
{
  "employeeId": "EMP001"
}
```

**Impact**: New API endpoint

---

### Step 7: Training Needs Analysis API
**File**: `src/app/api/ai/training-analysis/route.ts` (NEW FILE)

**Actions**:
- Create POST endpoint
- Add Clerk authentication check
- Validate request body (employeeId)
- Call `aiAgentService.analyzeTrainingNeeds()`
- Return training analysis
- Handle errors

**Endpoint**: `POST /api/ai/training-analysis`

**Request Body**:
```json
{
  "employeeId": "EMP001"
}
```

**Impact**: New API endpoint

---

### Step 8: Disciplinary Risk Analysis API
**File**: `src/app/api/ai/disciplinary-risk/route.ts` (NEW FILE)

**Actions**:
- Create POST endpoint
- Add Clerk authentication check
- Validate request body (employeeId)
- Call `aiAgentService.analyzeDisciplinaryRisk()`
- Return risk analysis
- Handle errors

**Endpoint**: `POST /api/ai/disciplinary-risk`

**Request Body**:
```json
{
  "employeeId": "EMP001"
}
```

**Impact**: New API endpoint

---

### Step 9: AI Reports API
**File**: `src/app/api/ai/reports/route.ts` (NEW FILE)

**Actions**:
- Create GET endpoint
- Add Clerk authentication check
- Accept query parameters (type, filters)
- Generate reports based on type:
  - Training needs report
  - Promotion readiness report
  - Disciplinary risk report
  - Recruitment quality report
- Return formatted report data

**Endpoint**: `GET /api/ai/reports?type=training&departmentId=1`

**Impact**: New API endpoint

---

### Step 10: Dashboard Insights API
**File**: `src/app/api/ai/dashboard-insights/route.ts` (NEW FILE)

**Actions**:
- Create GET endpoint
- Add Clerk authentication check
- Aggregate AI insights across all modules
- Return summary statistics:
  - Total candidates screened
  - Promotion-ready employees count
  - Training needs summary
  - High-risk employees count
- Return actionable recommendations

**Endpoint**: `GET /api/ai/dashboard-insights`

**Impact**: New API endpoint

---

## Phase 4: Frontend Components

### Step 11: AI Candidate Screening Component
**File**: `src/components/ai/AICandidateScreening.tsx` (NEW FILE)

**Actions**:
- Create React component
- Add "Run AI Screening" button
- Display loading state
- Show screening results:
  - Overall score
  - Recommendation badge
  - Strengths list
  - Weaknesses list
  - Suggested interview questions
  - AI analysis text
- Add error handling
- Style with Tailwind CSS

**Props**:
```typescript
{
  candidateId: number;
  vacancyId: number;
  onComplete?: (result: ScreeningResult) => void;
}
```

**Impact**: New UI component

---

### Step 12: AI Promotion Recommendations Component
**File**: `src/components/ai/AIPromotionRecommendations.tsx` (NEW FILE)

**Actions**:
- Create React component
- Display promotion eligibility score
- Show recommendation status
- List strengths and development areas
- Display next steps
- Add "View Details" button
- Style with Tailwind CSS

**Props**:
```typescript
{
  employeeId: string;
  onRefresh?: () => void;
}
```

**Impact**: New UI component

---

### Step 13: AI Training Recommendations Component
**File**: `src/components/ai/AITrainingRecommendations.tsx` (NEW FILE)

**Actions**:
- Create React component
- Display skill gaps
- Show training recommendations with priorities
- Display estimated hours and cost
- Add "Approve Training" action
- Style with Tailwind CSS

**Props**:
```typescript
{
  employeeId: string;
  onApprove?: (trainingId: string) => void;
}
```

**Impact**: New UI component

---

### Step 14: AI Disciplinary Alerts Component
**File**: `src/components/ai/AIDisciplinaryAlerts.tsx` (NEW FILE)

**Actions**:
- Create React component
- Display risk level badges (Low/Medium/High/Critical)
- Show risk score
- List risk factors
- Display pattern analysis
- Show recommended actions
- Add alert styling based on risk level
- Style with Tailwind CSS

**Props**:
```typescript
{
  employeeId: string;
  onAction?: (action: string) => void;
}
```

**Impact**: New UI component

---

### Step 15: AI Dashboard Component
**File**: `src/components/ai/AIDashboard.tsx` (NEW FILE)

**Actions**:
- Create comprehensive dashboard component
- Display summary cards:
  - Candidates screened today
  - Promotion-ready employees
  - Training needs identified
  - High-risk employees
- Show recent AI recommendations
- Display action items
- Add refresh functionality
- Style with Tailwind CSS

**Props**:
```typescript
{
  userId?: string;
}
```

**Impact**: New UI component

---

## Integration Steps

### Step 16: Integrate AI Screening into Recruitment
**File**: `src/components/recruitment/CandidatesTab.tsx` (MODIFY EXISTING)

**Actions**:
- Import `AICandidateScreening` component
- Add AI screening button to candidate row
- Display screening results in modal or expandable section
- Update candidate status based on AI recommendation (optional)
- Add visual indicators for AI-screened candidates

**Impact**: Enhances existing recruitment UI

---

### Step 17: Create Performance Module Page
**File**: `src/app/dashboard/admin/performance/page.tsx` (NEW FILE)

**Actions**:
- Create new page for Performance Module
- Display employee list with promotion eligibility
- Show training recommendations
- Add filters (department, status)
- Integrate AI promotion analysis
- Add promotion action buttons
- Style with existing dashboard theme

**Impact**: New page in admin dashboard

---

### Step 18: Enhance Recruitment Dashboard
**File**: `src/components/recruitment/RecruitmentDashboard.tsx` (MODIFY EXISTING)

**Actions**:
- Add AI screening statistics section
- Display top AI-recommended candidates
- Show screening accuracy metrics
- Add AI insights card
- Integrate with existing dashboard

**Impact**: Enhances existing recruitment dashboard

---

### Step 19: Add AI Insights to Main Dashboard
**File**: `src/app/dashboard/admin/page.tsx` (MODIFY EXISTING)

**Actions**:
- Import `AIDashboard` component
- Add AI insights section
- Display key AI recommendations
- Show action items
- Add quick links to AI features

**Impact**: Enhances existing admin dashboard

---

## Utility & Helper Files

### Step 20: Create AI Utilities
**File**: `src/lib/aiUtils.ts` (NEW FILE)

**Actions**:
- Add helper functions:
  - `formatRecommendation()` - Format recommendation text
  - `getRiskLevelColor()` - Get color for risk level
  - `calculatePromotionScore()` - Calculate promotion score
  - `formatScore()` - Format score display
- Add constants for AI thresholds

**Impact**: Utility functions for AI features

---

## Testing & Validation

### Step 21: Add Error Handling
**Actions**:
- Add try-catch blocks in all API routes
- Add error boundaries in React components
- Add user-friendly error messages
- Add fallback UI for AI service failures

**Impact**: Better error handling

---

### Step 22: Add Loading States
**Actions**:
- Add loading spinners in all AI components
- Add skeleton loaders for better UX
- Add progress indicators for long-running AI tasks

**Impact**: Better user experience

---

## Summary of Files to Create/Modify

### New Files (15 files):
1. `src/services/aiAgentService.ts`
2. `src/types/aiAgent.ts`
3. `src/app/api/ai/candidate-screening/route.ts`
4. `src/app/api/ai/promotion-analysis/route.ts`
5. `src/app/api/ai/training-analysis/route.ts`
6. `src/app/api/ai/disciplinary-risk/route.ts`
7. `src/app/api/ai/reports/route.ts`
8. `src/app/api/ai/dashboard-insights/route.ts`
9. `src/components/ai/AICandidateScreening.tsx`
10. `src/components/ai/AIPromotionRecommendations.tsx`
11. `src/components/ai/AITrainingRecommendations.tsx`
12. `src/components/ai/AIDisciplinaryAlerts.tsx`
13. `src/components/ai/AIDashboard.tsx`
14. `src/app/dashboard/admin/performance/page.tsx`
15. `src/lib/aiUtils.ts`

### Modified Files (3 files):
1. `prisma/schema.prisma` - Add new models and enums
2. `src/components/recruitment/CandidatesTab.tsx` - Add AI screening
3. `src/components/recruitment/RecruitmentDashboard.tsx` - Add AI insights
4. `src/app/dashboard/admin/page.tsx` - Add AI dashboard section

---

## Implementation Order

**Phase 1** (Foundation):
- Steps 1-2: Database schema and migration

**Phase 2** (Backend):
- Steps 3-4: AI service and types
- Steps 5-10: API routes

**Phase 3** (Frontend):
- Steps 11-15: AI components
- Steps 16-19: Integration

**Phase 4** (Polish):
- Steps 20-22: Utilities and UX improvements

---

## Dependencies

- ✅ Google Gemini AI (already configured)
- ✅ Prisma (already in use)
- ✅ Clerk authentication (already in use)
- ✅ Next.js API routes (already in use)
- ✅ React/TypeScript (already in use)
- ✅ Tailwind CSS (already in use)

**No new dependencies required!**

---

## Risk Assessment

### Low Risk:
- Database schema additions (new tables, no breaking changes)
- New API endpoints (isolated, won't affect existing)
- New components (isolated, won't affect existing)

### Medium Risk:
- Modifying existing components (will test thoroughly)
- AI service integration (will add error handling)

### Mitigation:
- Test each step before proceeding
- Add comprehensive error handling
- Use TypeScript for type safety
- Follow existing code patterns

---

## Approval Checklist

Please review and approve:

- [ ] Database schema changes (Step 1)
- [ ] AI service implementation (Step 3)
- [ ] API routes structure (Steps 5-10)
- [ ] Frontend components design (Steps 11-15)
- [ ] Integration approach (Steps 16-19)
- [ ] Overall implementation plan

---

## Questions for You

1. **Should I proceed with all steps, or would you like to approve phase by phase?**
2. **Do you want to see code examples for any specific step before I implement?**
3. **Are there any specific UI/UX preferences for the AI components?**
4. **Should I add any additional features or modify the plan?**

---

**Ready to proceed once you approve!** 🚀

Please let me know:
- ✅ Approve all steps
- ✅ Approve Phase 1 only (I'll wait for approval before Phase 2)
- ❌ Request changes to specific steps
- ❓ Have questions about any step

