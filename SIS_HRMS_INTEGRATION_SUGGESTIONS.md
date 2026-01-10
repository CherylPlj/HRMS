# SIS-HRMS Integration Suggestions

## Current Integration

### ✅ Implemented: System Account Integration
- **Description**: SIS Registrar accounts are created from HRMS
- **Direction**: HRMS → SIS
- **Implementation**: HRMS creates and manages user accounts for registrars
- **API**: `/api/xr/user-access-lookup` (POST) - Cross-system user verification
- **Authentication**: API key + HMAC-SHA256 signature verification
- **Status**: ✅ LIVE

---

## Planned Integrations

### 🚧 To Do: Schedule Per Section & Faculty Assignment
- **Description**: SIS manages class sections and schedules; HRMS assigns faculty to sections
- **Bi-directional Data Flow**:
  - SIS → HRMS: Class sections, schedules, subject assignments
  - HRMS → SIS: Faculty availability, qualifications, assignments
- **Status**: 📋 PLANNED

---

## 🎯 Recommended Integration Points

### 1. **Faculty Academic Credentials & Qualifications** (HIGH PRIORITY)
**Use Case**: Ensure only qualified faculty teach specific subjects

**HRMS Data to Share with SIS:**
- Professional Licenses (PRC License Number, Validity)
- Educational Background (degrees, majors, universities, graduation years)
- Professional Certifications
- Specializations/Subject Matter Expertise
- Teaching Experience

**Benefits:**
- SIS can validate faculty qualifications before section assignment
- Automated compliance checking for DepEd/CHED requirements
- Prevent assignment of unqualified faculty to specialized subjects

**API Suggestion:**
```
GET /api/xr/faculty-qualifications/:employeeId
POST /api/xr/faculty-qualifications/validate
```

**Integration Flow:**
```
SIS → HRMS: "Can this faculty teach Advanced Physics?"
HRMS → SIS: {
  qualified: true,
  licenses: [...],
  education: [...],
  certifications: [...]
}
```

---

### 2. **Faculty Availability & Leave Status** (HIGH PRIORITY)
**Use Case**: Real-time faculty availability for class scheduling

**HRMS Data to Share with SIS:**
- Current leave status (on leave, available, part-time)
- Leave schedule (dates faculty will be unavailable)
- Employment status (Regular, Part-Time, Probationary)
- Work schedule/shift assignments
- Resignation/Retirement status

**Benefits:**
- Prevent scheduling conflicts with faculty on leave
- Automatic substitute teacher alerts
- Better workload distribution
- Real-time schedule adjustments

**API Suggestion:**
```
GET /api/xr/faculty-availability/:employeeId
GET /api/xr/faculty-availability/date-range
POST /api/xr/faculty-availability/check-multiple
```

**Integration Flow:**
```
SIS → HRMS: "Is Faculty ID 1 available for Week of Jan 15-19?"
HRMS → SIS: {
  available: false,
  reason: "Sick Leave",
  leaveType: "Medical",
  startDate: "2026-01-15",
  endDate: "2026-01-17"
}
```

---

### 3. **Faculty Teaching Load & Workload Management** (MEDIUM PRIORITY)
**Use Case**: Prevent overloading faculty and ensure fair distribution

**HRMS Data to Share with SIS:**
- Current number of sections assigned
- Total teaching hours per week
- Contract type (Full-Time vs Part-Time limits)
- Maximum teaching load per contract
- Administrative duties (reduces available teaching hours)

**SIS Data to Share with HRMS:**
- Assigned sections per faculty
- Class schedule (day, time, duration)
- Total credit hours/contact hours

**Benefits:**
- Automated workload compliance
- Fair distribution of teaching assignments
- Overtime tracking for part-time faculty
- Identify faculty with capacity for additional sections

**API Suggestion:**
```
GET /api/xr/faculty-workload/:employeeId
POST /api/xr/faculty-workload/validate-assignment
GET /api/xr/faculty-workload/available-for-additional
```

**Bi-directional Flow:**
```
SIS → HRMS: "Can Faculty ID 5 take one more section?"
HRMS → SIS: {
  canAssign: false,
  currentLoad: 24,
  maxLoad: 24,
  reason: "At maximum teaching load"
}
```

---

### 4. **Faculty Department & Assignment Sync** (MEDIUM PRIORITY)
**Use Case**: Keep department assignments consistent across systems

**HRMS Data to Share with SIS:**
- Faculty department assignment
- Position/rank (Instructor, Assistant Professor, etc.)
- Department head designation
- Transfer/reassignment history

**Benefits:**
- Consistent organizational structure
- Proper reporting lines
- Department-level analytics
- Coordinated department meetings

**API Suggestion:**
```
GET /api/xr/faculty-department/:employeeId
POST /api/xr/department-sync
GET /api/xr/departments/hierarchy
```

---

### 5. **Faculty Performance Data Integration** (MEDIUM PRIORITY)
**Use Case**: Link teaching performance with HR evaluations

**HRMS Data to Share with SIS:**
- Performance review scores
- Attendance records
- Disciplinary records (if relevant to teaching)

**SIS Data to Share with HRMS:**
- Student evaluation scores
- Course completion rates
- Teaching effectiveness metrics
- Student feedback

**Benefits:**
- Holistic faculty evaluation
- Identify training needs
- Promotion/tenure decisions
- Performance improvement planning

**API Suggestion:**
```
POST /api/xr/performance-integration
GET /api/xr/performance-summary/:employeeId
```

---

### 6. **New Hire & Termination Notifications** (HIGH PRIORITY)
**Use Case**: Automatic account provisioning and deprovisioning

**HRMS to SIS Notifications:**
- New faculty hired → Create SIS access
- Faculty resignation → Disable SIS access
- Faculty termination → Immediate access revocation
- Faculty contract renewal → Update access dates

**Benefits:**
- Automated account lifecycle management
- Security: Immediate access revocation
- No manual account creation delays
- Audit trail compliance

**API Suggestion:**
```
POST /api/xr/notifications/new-hire
POST /api/xr/notifications/termination
POST /api/xr/notifications/status-change
```

**Webhook Integration:**
```
HRMS Event: Faculty Hired
→ Trigger: Send notification to SIS
→ SIS Action: Create user account + teaching portal access
```

---

### 7. **Attendance & Time Records Integration** (LOW-MEDIUM PRIORITY)
**Use Case**: Correlate teaching attendance with payroll

**HRMS Data to Share with SIS:**
- Official attendance records
- Time-in/time-out logs
- Biometric/DTR data

**SIS Data to Share with HRMS:**
- Class attendance (did faculty show up to teach?)
- Teaching period actual hours

**Benefits:**
- Verify faculty actually taught assigned classes
- Payroll accuracy for part-time faculty
- Identify patterns (chronic lateness)
- Support leave request validation

**API Suggestion:**
```
GET /api/xr/attendance/:employeeId/:date
POST /api/xr/attendance/bulk-sync
```

---

### 8. **Student-Related Faculty Information** (LOW PRIORITY)
**Use Case**: Display faculty info to students in SIS

**HRMS Data to Share with SIS:**
- Faculty profile photo
- Office location
- Consultation hours
- Contact information (institutional email, office phone)
- Professional bio

**Benefits:**
- Unified faculty directory
- Better student-faculty communication
- Professional presentation
- Accurate contact details

**API Suggestion:**
```
GET /api/xr/faculty-profile/:employeeId/public
GET /api/xr/faculty-directory
```

---

### 9. **Training & Professional Development Tracking** (LOW PRIORITY)
**Use Case**: Track required training completion

**HRMS Data to Share with SIS:**
- Completed training courses
- Certifications earned
- Professional development hours
- Required training status (compliant/non-compliant)

**SIS Data to Share with HRMS:**
- Teaching methodology workshops
- Curriculum development training
- Technology integration training

**Benefits:**
- Ensure faculty complete required training
- Professional development portfolio
- Support promotion applications
- Compliance with educational regulations

**API Suggestion:**
```
GET /api/xr/training-records/:employeeId
POST /api/xr/training-completion
```

---

### 10. **Contract & Compensation Integration** (LOW PRIORITY - SENSITIVE)
**Use Case**: Validate faculty contracts align with teaching load

**HRMS Data to Share with SIS:**
- Contract dates (start/end)
- Employment type (Full-Time, Part-Time)
- Contract status (Active, Expiring, Expired)

**Note:** ⚠️ Salary data should NOT be shared with SIS for privacy reasons

**Benefits:**
- Prevent scheduling beyond contract end date
- Alert before contract expiration
- Validate teaching load vs contract type

**API Suggestion:**
```
GET /api/xr/contract-status/:employeeId
GET /api/xr/contracts/expiring
```

---

## 📊 Priority Matrix

| Integration Point | Priority | Complexity | Impact | Timeline |
|------------------|----------|------------|--------|----------|
| Faculty Qualifications | 🔴 HIGH | Medium | High | Q1 2026 |
| Availability & Leave | 🔴 HIGH | Low | High | Q1 2026 |
| New Hire/Termination Notifications | 🔴 HIGH | Low | High | Q1 2026 |
| Teaching Load Management | 🟡 MEDIUM | Medium | High | Q2 2026 |
| Department Sync | 🟡 MEDIUM | Low | Medium | Q2 2026 |
| Performance Integration | 🟡 MEDIUM | High | Medium | Q3 2026 |
| Attendance Integration | 🟡 MEDIUM | Medium | Medium | Q3 2026 |
| Faculty Public Profile | 🟢 LOW | Low | Low | Q4 2026 |
| Training Records | 🟢 LOW | Low | Low | Q4 2026 |
| Contract Integration | 🟢 LOW | Low | Medium | Q4 2026 |

---

## 🏗️ Technical Implementation Considerations

### Security Requirements
1. **API Authentication**: Extend current HMAC-SHA256 signature system
2. **Rate Limiting**: Already implemented, may need adjustment
3. **Data Encryption**: HTTPS/TLS for all transfers
4. **Access Control**: Role-based permissions for sensitive data
5. **Audit Logging**: Track all cross-system data access

### Current API Infrastructure
Your HRMS already has:
- ✅ RESTful API architecture
- ✅ API key authentication
- ✅ HMAC signature verification
- ✅ Rate limiting
- ✅ Zod schema validation
- ✅ Structured error handling

**Recommendation**: Extend the existing `/api/xr/` namespace for all SIS integrations

### Data Models Already Available in HRMS
```typescript
// Faculty
- FacultyID, UserID, EmployeeID
- Department, Position, Employment Status
- Schedules (class assignments)

// Employee (includes Faculty)
- Education background
- Government IDs (including PRC License)
- Skills, Certifications
- Performance Reviews
- Attendance records
- Leave records
- Training records

// Schedules
- Faculty assignments to sections
- Subject, Class Section, Day, Time, Duration
```

---

## 🔄 Recommended Integration Architecture

### Phase 1: Read-Only APIs (Q1 2026)
Start with SIS reading from HRMS:
1. Faculty Qualifications Lookup
2. Faculty Availability Check
3. Faculty Profile Information

### Phase 2: Bi-directional Sync (Q2 2026)
Implement two-way data flow:
1. Schedule Assignments (SIS ↔ HRMS)
2. Teaching Load Management
3. Department Sync

### Phase 3: Real-time Notifications (Q3 2026)
Implement webhook-based notifications:
1. New Hire → Auto-create SIS account
2. Termination → Auto-disable SIS account
3. Leave Approved → Update SIS availability

### Phase 4: Advanced Analytics (Q4 2026)
Cross-system analytics and reporting:
1. Performance Integration
2. Attendance Correlation
3. Training Compliance

---

## 💡 Quick Wins (Can Implement This Month)

### 1. **Faculty Qualifications API**
**Effort**: 2-3 days
**Impact**: Immediate validation of teaching assignments

```typescript
// /api/xr/faculty-qualifications/[employeeId]/route.ts
export async function GET(request: NextRequest, { params }: { params: { employeeId: string } }) {
  // Return: Education, GovernmentIDs (PRC License), Certificates, Skills
}
```

### 2. **Faculty Availability API**
**Effort**: 1-2 days
**Impact**: Prevent scheduling conflicts

```typescript
// /api/xr/faculty-availability/[employeeId]/route.ts
export async function GET(request: NextRequest, { params }: { params: { employeeId: string } }) {
  // Return: Current leave status, employment status, availability
}
```

### 3. **Faculty Profile API**
**Effort**: 1 day
**Impact**: Unified faculty directory

```typescript
// /api/xr/faculty-profile/[employeeId]/route.ts
export async function GET(request: NextRequest, { params }: { params: { employeeId: string } }) {
  // Return: Public profile info for student/parent portal
}
```

---

## 📝 Next Steps

1. **Review & Prioritize**: Discuss with SIS team to align priorities
2. **Data Mapping**: Create detailed field-level mapping document
3. **API Specification**: Define request/response schemas for each endpoint
4. **Security Review**: Ensure compliance with Data Privacy Act
5. **Pilot Implementation**: Start with 1-2 high-priority, low-complexity integrations
6. **Testing**: Establish test environments for both systems
7. **Documentation**: Create integration guide for both teams
8. **Monitoring**: Set up logging and monitoring for integration endpoints

---

## 🤝 Collaboration Required

### From HRMS Team:
- Expose additional API endpoints
- Implement webhook notifications
- Maintain data quality and accuracy
- Provide API documentation

### From SIS Team:
- Define exact data requirements
- Implement API consumers
- Handle error cases gracefully
- Establish data refresh intervals

### Joint Responsibilities:
- Define data formats and schemas
- Establish SLA for API response times
- Create integration testing suite
- Document troubleshooting procedures

---

## 📚 References

**Current HRMS API Endpoints:**
- `/api/xr/user-access-lookup` - User verification
- `/api/employees` - Employee management
- `/api/faculty-documents` - Faculty documents
- `/api/leave` - Leave management
- `/api/performance` - Performance reviews
- `/api/directory` - Employee directory

**HRMS Database Schema:**
- See `prisma/schema.prisma` for complete data model
- Faculty, Employee, Department, Schedules, Attendance, Leave models available

---

*Generated: January 10, 2026*  
*Version: 1.0*  
*Status: Recommendations for Discussion*
