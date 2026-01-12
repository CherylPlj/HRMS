# SIS-HRMS Integration API Reference

Complete API documentation for all integration points between SIS (Student Information System) and HRMS (Human Resource Management System).

---

## Integration 1: Faculty Availability Check

**Integration**: SIS ↔ HRMS  
**Purpose**: Check if faculty is available for teaching or currently on leave to prevent scheduling conflicts  
**Location**: `src/app/api/xr/faculty-availability/[employeeId]/route.ts`

### API Endpoint
```
GET /api/xr/faculty-availability/{employeeId}
```

### Method
`GET`

### Request Format

**Path Parameters:**
```json
{
  "employeeId": {
    "field": "employeeId",
    "type": "string",
    "required": true,
    "description": "Employee ID (e.g., '2026-0001')",
    "example": "2026-0001"
  }
}
```

**Query Parameters (Optional):**
```json
{
  "startDate": {
    "field": "startDate",
    "type": "string (YYYY-MM-DD)",
    "required": false,
    "description": "Check availability from this date",
    "example": "2026-01-15"
  },
  "endDate": {
    "field": "endDate",
    "type": "string (YYYY-MM-DD)",
    "required": false,
    "description": "Check availability until this date",
    "example": "2026-01-30"
  }
}
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "employeeId": "2026-0001",
    "facultyId": 1,
    "name": "Juan Dela Cruz",
    "email": "juan.delacruz@school.edu.ph",
    "isAvailable": false,
    "availability": {
      "status": "Unavailable",
      "reason": "On Sick Leave"
    },
    "employmentStatus": "Regular",
    "employeeType": "Regular",
    "userStatus": "Active",
    "department": {
      "id": 1,
      "name": "Math"
    },
    "currentLeave": {
      "leaveId": 42,
      "type": "Sick",
      "requestType": "Leave",
      "startDate": "2026-01-15T00:00:00.000Z",
      "endDate": "2026-01-17T00:00:00.000Z",
      "reason": "Medical consultation",
      "status": "Approved"
    },
    "upcomingLeaves": [
      {
        "leaveId": 43,
        "type": "Vacation",
        "requestType": "Leave",
        "startDate": "2026-02-10T00:00:00.000Z",
        "endDate": "2026-02-14T00:00:00.000Z",
        "reason": "Family vacation",
        "status": "Approved"
      }
    ],
    "recentLeaves": []
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Faculty not found",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

**Example (Node.js):**
```javascript
const crypto = require('crypto');
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const API_KEY = process.env.SJSFI_SIS_API_KEY;

const body = ''; // Empty for GET requests
const timestamp = Date.now().toString();
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(body + timestamp)
  .digest('hex');

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'x-timestamp': timestamp,
  'x-signature': signature
};
```

### Error Codes
- `400` - Invalid request (missing/invalid employeeId, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - Faculty not found
- `429` - Rate limit exceeded (too many requests)
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 500ms (p95)
- **Rate Limit**: 100 requests per minute per IP

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release
- **2026-01-10**: Added date range filtering support

---

## Integration 2: Faculty Qualifications

**Integration**: SIS ↔ HRMS  
**Purpose**: Get faculty educational background, licenses, and certifications to validate teaching assignments and ensure compliance  
**Location**: `src/app/api/xr/faculty-qualifications/[employeeId]/route.ts`

### API Endpoint
```
GET /api/xr/faculty-qualifications/{employeeId}
```

### Method
`GET`

### Request Format

**Path Parameters:**
```json
{
  "employeeId": {
    "field": "employeeId",
    "type": "string",
    "required": true,
    "description": "Employee ID (e.g., '2026-0001')",
    "example": "2026-0001"
  }
}
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "employeeId": "2026-0001",
    "facultyId": 1,
    "name": "Juan Dela Cruz",
    "email": "juan.delacruz@school.edu.ph",
    "position": "Assistant Professor",
    "department": {
      "id": 1,
      "name": "Mathematics",
      "type": "Academic"
    },
    "education": [
      {
        "level": "Master's Degree",
        "schoolName": "University of the Philippines",
        "course": "Mathematics",
        "yearGraduated": 2015,
        "honors": "Cum Laude"
      }
    ],
    "highestEducation": {
      "level": "Master's Degree",
      "course": "Mathematics",
      "schoolName": "University of the Philippines"
    },
    "licenses": {
      "prc": {
        "licenseNumber": "123456",
        "validity": "2027-12-31T00:00:00.000Z",
        "isValid": true,
        "status": "Valid"
      },
      "other": {
        "tin": "123-456-789-000",
        "bir": null,
        "passport": "P1234567",
        "passportValidity": "2028-01-01T00:00:00.000Z"
      }
    },
    "eligibility": [
      {
        "title": "Civil Service Professional",
        "licenseNumber": "CS-123456",
        "rating": 85.5,
        "examDate": "2010-05-15T00:00:00.000Z",
        "validityDate": null
      }
    ],
    "certifications": [
      {
        "name": "Google Certified Educator",
        "issuingOrganization": "Google for Education",
        "issueDate": "2024-01-15T00:00:00.000Z",
        "expiryDate": "2026-01-15T00:00:00.000Z",
        "isValid": true
      }
    ],
    "skills": [
      {
        "name": "Mathematics",
        "proficiencyLevel": "Expert",
        "description": "Advanced mathematics and statistics"
      }
    ],
    "trainings": [
      {
        "title": "Modern Teaching Methods",
        "sponsoredBy": "DepEd",
        "numberOfHours": 40,
        "dateCompleted": "2025-06-01T00:00:00.000Z"
      }
    ],
    "experience": {
      "yearsOfTeaching": 10,
      "hireDate": "2015-01-15T00:00:00.000Z",
      "currentPosition": "Assistant Professor",
      "employmentStatus": "Regular",
      "previousEmployment": [
        {
          "schoolName": "ABC High School",
          "position": "Math Teacher",
          "startDate": "2010-01-01T00:00:00.000Z",
          "endDate": "2014-12-31T00:00:00.000Z",
          "yearsOfService": 5
        }
      ]
    },
    "qualificationSummary": {
      "hasValidPRCLicense": true,
      "hasPostgraduate": true,
      "hasBachelors": true,
      "yearsOfExperience": 10,
      "numberOfCertifications": 3,
      "numberOfTrainings": 5,
      "isQualified": true
    }
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Employee not found",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

**Example**: Same as Integration 1 (GET request with empty body)

### Error Codes
- `400` - Invalid request (missing/invalid employeeId, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - Employee not found
- `429` - Rate limit exceeded
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 800ms (p95)
- **Rate Limit**: 100 requests per minute per IP

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release

---

## Integration 3: Faculty Workload (Get Current Load)

**Integration**: SIS ↔ HRMS  
**Purpose**: Get faculty's current teaching workload, schedule, and capacity to manage teaching assignments  
**Location**: `src/app/api/xr/faculty-workload/[employeeId]/route.ts`

### API Endpoint
```
GET /api/xr/faculty-workload/{employeeId}
```

### Method
`GET`

### Request Format

**Path Parameters:**
```json
{
  "employeeId": {
    "field": "employeeId",
    "type": "string",
    "required": true,
    "description": "Employee ID (e.g., '2026-0001')",
    "example": "2026-0001"
  }
}
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "employeeId": "2026-0001",
    "facultyId": 1,
    "name": "Juan Dela Cruz",
    "email": "juan.delacruz@school.edu.ph",
    "position": "Assistant Professor",
    "employmentType": "Regular",
    "employmentStatus": "Regular",
    "department": {
      "id": 1,
      "name": "Mathematics"
    },
    "workload": {
      "totalSections": 5,
      "totalHoursPerWeek": 20,
      "maxHoursPerWeek": 40,
      "maxSections": 10,
      "availableHours": 20,
      "workloadPercentage": 50,
      "canTakeMoreSections": true,
      "status": "Moderate Load"
    },
    "scheduleByDay": {
      "Monday": [
        {
          "scheduleId": 1,
          "subject": "Algebra 1",
          "section": "Grade 7-A",
          "time": "08:00-09:30",
          "duration": 1.5,
          "subjectId": 1,
          "sectionId": 1
        }
      ],
      "Tuesday": []
    },
    "hoursPerDay": [
      {
        "day": "Monday",
        "totalHours": 3,
        "numberOfClasses": 2
      }
    ],
    "schedules": [
      {
        "scheduleId": 1,
        "day": "Monday",
        "time": "08:00-09:30",
        "duration": 1.5,
        "subject": {
          "id": 1,
          "name": "Algebra 1"
        },
        "section": {
          "id": 1,
          "name": "Grade 7-A"
        }
      }
    ],
    "contract": {
      "contractType": "Regular",
      "startDate": "2015-01-15T00:00:00.000Z",
      "endDate": null
    },
    "recommendations": {
      "canAssignMore": true,
      "suggestedMaxAdditionalHours": 20,
      "suggestedMaxAdditionalSections": 5,
      "warnings": []
    }
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Faculty not found",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

**Example**: Same as Integration 1 (GET request with empty body)

### Error Codes
- `400` - Invalid request (missing/invalid employeeId, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - Faculty not found
- `429` - Rate limit exceeded
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 600ms (p95)
- **Rate Limit**: 100 requests per minute per IP

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release

---

## Integration 4: Faculty Workload Validation

**Integration**: SIS ↔ HRMS  
**Purpose**: Validate if a faculty can take additional workload before assigning new sections to prevent overloading  
**Location**: `src/app/api/xr/faculty-workload/validate/route.ts`

### API Endpoint
```
POST /api/xr/faculty-workload/validate
```

### Method
`POST`

### Request Format

**Request Body:**
```json
{
  "employeeId": {
    "field": "employeeId",
    "type": "string",
    "required": true,
    "description": "Employee ID (e.g., '2026-0001')",
    "example": "2026-0001"
  },
  "additionalHours": {
    "field": "additionalHours",
    "type": "number",
    "required": false,
    "description": "Additional hours to add to current workload",
    "example": 3
  },
  "additionalSections": {
    "field": "additionalSections",
    "type": "number (integer)",
    "required": false,
    "description": "Additional sections to add",
    "example": 1
  },
  "day": {
    "field": "day",
    "type": "string",
    "required": false,
    "description": "Day of week for schedule conflict check (e.g., 'Monday')",
    "example": "Monday"
  },
  "time": {
    "field": "time",
    "type": "string",
    "required": false,
    "description": "Time range for schedule conflict check (e.g., '08:00-09:30')",
    "example": "08:00-09:30"
  },
  "duration": {
    "field": "duration",
    "type": "number",
    "required": false,
    "description": "Duration in hours for schedule conflict check",
    "example": 1.5
  }
}
```

**Example Request:**
```json
{
  "employeeId": "2026-0001",
  "additionalHours": 3,
  "additionalSections": 1,
  "day": "Monday",
  "time": "10:00-11:30",
  "duration": 1.5
}
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "canAssign": true,
    "reason": "Faculty can take additional workload",
    "validation": {
      "employeeId": "2026-0001",
      "facultyId": 1,
      "name": "Juan Dela Cruz",
      "employmentType": "Regular"
    },
    "currentWorkload": {
      "sections": 5,
      "hoursPerWeek": 20
    },
    "proposedWorkload": {
      "sections": 6,
      "hoursPerWeek": 23
    },
    "limits": {
      "maxSections": 10,
      "maxHoursPerWeek": 40
    },
    "availability": {
      "remainingSections": 4,
      "remainingHours": 17
    },
    "checks": {
      "exceedsHours": false,
      "exceedsSections": false,
      "scheduleConflict": false
    },
    "conflicts": []
  }
}
```

**Error Response (Cannot Assign):**
```json
{
  "status": "success",
  "data": {
    "canAssign": false,
    "reason": "Exceeds maximum hours (43/40 hours); Schedule conflict detected",
    "validation": {
      "employeeId": "2026-0001",
      "facultyId": 1,
      "name": "Juan Dela Cruz",
      "employmentType": "Regular"
    },
    "currentWorkload": {
      "sections": 5,
      "hoursPerWeek": 20
    },
    "proposedWorkload": {
      "sections": 6,
      "hoursPerWeek": 43
    },
    "limits": {
      "maxSections": 10,
      "maxHoursPerWeek": 40
    },
    "availability": {
      "remainingSections": 4,
      "remainingHours": 0
    },
    "checks": {
      "exceedsHours": true,
      "exceedsSections": false,
      "scheduleConflict": true
    },
    "conflicts": [
      {
        "day": "Monday",
        "time": "10:00-11:30",
        "duration": 1.5,
        "subject": "Algebra 1",
        "section": "Grade 7-B"
      }
    ]
  }
}
```

**Error Response (Faculty on Leave):**
```json
{
  "status": "success",
  "data": {
    "canAssign": false,
    "reason": "Faculty is currently on leave",
    "currentLeave": {
      "type": "Sick",
      "startDate": "2026-01-15T00:00:00.000Z",
      "endDate": "2026-01-17T00:00:00.000Z"
    }
  }
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Example (Node.js):**
```javascript
const crypto = require('crypto');
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const API_KEY = process.env.SJSFI_SIS_API_KEY;

const bodyData = JSON.stringify({
  employeeId: '2026-0001',
  additionalHours: 3,
  additionalSections: 1,
  day: 'Monday',
  time: '10:00-11:30',
  duration: 1.5
});

const timestamp = Date.now().toString();
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(bodyData + timestamp)
  .digest('hex');

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'x-timestamp': timestamp,
  'x-signature': signature,
  'Content-Type': 'application/json'
};
```

### Error Codes
- `400` - Invalid request (missing/invalid data, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - Faculty not found
- `429` - Rate limit exceeded
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 700ms (p95)
- **Rate Limit**: 100 requests per minute per IP

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release

---

## Integration 5: User Access Lookup

**Integration**: SIS ↔ HRMS  
**Purpose**: Lookup user access and roles by email for system account integration  
**Location**: `src/app/api/xr/user-access-lookup/route.ts`

### API Endpoint
```
POST /api/xr/user-access-lookup
```

### Method
`POST`

### Request Format

**Request Body:**
```json
{
  "email": {
    "field": "email",
    "type": "string (email format)",
    "required": true,
    "description": "User email address",
    "example": "juan.delacruz@school.edu.ph"
  }
}
```

**Example Request:**
```json
{
  "email": "juan.delacruz@school.edu.ph"
}
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "Email": "juan.delacruz@school.edu.ph",
    "Role": [
      "Faculty",
      "Department Head"
    ]
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Not found",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Example**: Same as Integration 4 (POST request with JSON body)

### Error Codes
- `400` - Invalid request (missing/invalid email, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - User not found
- `429` - Rate limit exceeded
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 400ms (p95)
- **Rate Limit**: 100 requests per minute per IP

### Version
`v1.0.0`

### Change Log
- **Pre-2026-01-10**: Initial release (existing integration)
- **2026-01-10**: Documented for reference

---

## Common Authentication Details

All endpoints use the same authentication mechanism:

### Environment Variables Required
- `SJSFI_SHARED_SECRET` - Shared secret for HMAC signature
- `SJSFI_SIS_API_KEY` - API key for SIS system
- `SJSFI_LMS_API_KEY` - API key for LMS system (if applicable)

### Signature Generation
1. Concatenate request body (or empty string for GET) with timestamp
2. Generate HMAC-SHA256 hash using shared secret
3. Include hash in `x-signature` header

### Timestamp Window
- Timestamp must be within ±5 minutes of server time
- Format: Unix timestamp in milliseconds

### Rate Limiting
- 100 requests per minute per IP address
- Uses token bucket algorithm
- Returns `429 Too Many Requests` when exceeded

---

## File Locations Summary

| Integration | File Path |
|------------|-----------|
| Faculty Availability | `src/app/api/xr/faculty-availability/[employeeId]/route.ts` |
| Faculty Qualifications | `src/app/api/xr/faculty-qualifications/[employeeId]/route.ts` |
| Faculty Workload (GET) | `src/app/api/xr/faculty-workload/[employeeId]/route.ts` |
| Faculty Workload (Validate) | `src/app/api/xr/faculty-workload/validate/route.ts` |
| User Access Lookup | `src/app/api/xr/user-access-lookup/route.ts` |

---

## Testing

All endpoints can be tested using:
- Postman
- Thunder Client (VS Code extension)
- cURL
- Custom integration scripts

See `TESTING_GUIDE.md` for detailed testing instructions.

---

## Support

For issues or questions:
1. Check error codes and messages in responses
2. Verify authentication headers
3. Check rate limiting status
4. Contact HRMS development team

---

**Last Updated**: 2026-01-11  
**Documentation Version**: 1.0.0
