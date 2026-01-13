# Section 3: Integration Specifications

This document provides detailed API specifications for integrating SIS (Student Information System) with HRMS (Human Resource Management System) across three key integration points: User Account Integration, Schedule Integration, and Section Assignment Integration.

---

## Integration 1: User Account Integration

**Integration**: SIS ↔ HRMS  
**Purpose**: Lookup user access and roles by email for system account integration. SIS queries HRMS to verify employee status and roles when creating or managing user accounts in the SIS system.  
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
    "description": "User email address to lookup",
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

**Error Response (404 - User Not Found):**
```json
{
  "status": "error",
  "error": "Not found",
  "errors": []
}
```

**Error Response (400 - Invalid Request):**
```json
{
  "status": "error",
  "error": "Invalid request",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SJSFI_SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Signature Generation:**
1. Concatenate request body (JSON string) with timestamp
2. Generate HMAC-SHA256 hash using shared secret (`SJSFI_SHARED_SECRET`)
3. Include hash in `x-signature` header

**Example (Node.js):**
```javascript
const crypto = require('crypto');
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const API_KEY = process.env.SJSFI_SIS_API_KEY;

const bodyData = JSON.stringify({
  email: 'juan.delacruz@school.edu.ph'
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
- `400` - Invalid request (missing/invalid email, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - User not found
- `429` - Rate limit exceeded (100 requests per minute per IP)
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 400ms (p95)
- **Rate Limit**: 100 requests per minute per IP
- **Timestamp Window**: ±5 minutes from server time

### Version
`v1.0.0`

### Change Log
- **Pre-2026-01-10**: Initial release (existing integration)
- **2026-01-10**: Documented for reference

---

## Integration 2: Schedule Integration

**Integration**: SIS ↔ HRMS  
**Purpose**: Bidirectional synchronization of class schedule assignments. SIS provides schedule data to HRMS, and HRMS assigns teachers to schedules and syncs assignments back to SIS. This ensures both systems maintain consistent schedule and teacher assignment data.  
**Location**: Multiple endpoints (see below)

### 2.1: SIS Provides Schedules to HRMS

**Integration**: SIS → HRMS  
**Purpose**: HRMS fetches all available schedules from SIS to display and assign teachers.  
**SIS Endpoint Required**: SIS must provide this endpoint

#### API Endpoint (SIS to Provide)
```
POST {ENROLLMENT_BASE_URL}/api/hrms/available-schedules
```

#### Method
`POST`

#### Request Format

**Request Body:**
```json
{
  "data": {
    "field": "data",
    "type": "string",
    "required": true,
    "description": "Request identifier",
    "example": "fetch-all-schedules"
  }
}
```

**Example Request:**
```json
{
  "data": "fetch-all-schedules"
}
```

#### Response Format (SIS Should Return)

**Success (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "scheduleId": 123,
      "schedule": {
        "id": 123,
        "day": "Monday",
        "startTime": "08:00",
        "endTime": "09:30",
        "room": "Room 101"
      },
      "subject": {
        "id": 45,
        "code": "MATH101",
        "name": "Mathematics 101"
      },
      "section": {
        "id": 10,
        "name": "Grade 7-A"
      },
      "teacher": {
        "assigned": false,
        "teacherId": null,
        "teacherName": null
      },
      "yearLevel": {
        "name": "Grade 7"
      },
      "term": {
        "id": 1
      }
    }
  ]
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Error message",
  "errors": []
}
```

#### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SJSFI_HRMS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Note**: When HRMS calls SIS, it uses `SJSFI_HRMS_API_KEY` (the API key that SIS recognizes as coming from HRMS).

### 2.2: HRMS Syncs Teacher Assignments to SIS

**Integration**: HRMS → SIS  
**Purpose**: HRMS sends teacher assignment updates to SIS when teachers are assigned or unassigned from schedules.  
**SIS Endpoint Required**: SIS must provide this endpoint

#### API Endpoint (SIS to Provide)
```
POST {ENROLLMENT_BASE_URL}/api/hrms/assign-teacher
```

**Note**: This endpoint can be customized via `SIS_UPDATE_ENDPOINT` environment variable in HRMS.

#### Method
`POST`

#### Request Format

**Request Body:**
```json
{
  "scheduleId": {
    "field": "scheduleId",
    "type": "number",
    "required": true,
    "description": "SIS schedule ID to assign teacher to",
    "example": 123
  },
  "teacher": {
    "field": "teacher",
    "type": "object",
    "required": true,
    "description": "Teacher information object",
    "fields": {
      "teacherId": {
        "field": "teacherId",
        "type": "string",
        "required": true,
        "description": "HRMS Employee ID",
        "example": "2026-0001"
      },
      "teacherName": {
        "field": "teacherName",
        "type": "string",
        "required": true,
        "description": "Full name of teacher (FirstName + LastName)",
        "example": "Dr. Maria Santos"
      },
      "teacherEmail": {
        "field": "teacherEmail",
        "type": "string",
        "required": true,
        "description": "Email address of teacher",
        "example": "maria.santos@school.edu"
      }
    }
  }
}
```

**Example Request:**
```json
{
  "scheduleId": 123,
  "teacher": {
    "teacherId": "2026-0001",
    "teacherName": "Dr. Maria Santos",
    "teacherEmail": "maria.santos@school.edu"
  }
}
```

#### Response Format (SIS Should Return)

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "Schedule assignment updated successfully"
  }
}
```

**Error Response (400 - Invalid Request):**
```json
{
  "status": "error",
  "error": "Invalid schedule ID or teacher information",
  "errors": []
}
```

**Error Response (404 - Schedule Not Found):**
```json
{
  "status": "error",
  "error": "Schedule not found",
  "errors": []
}
```

#### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SJSFI_HRMS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Signature Generation:**
1. Concatenate request body (JSON string) with timestamp
2. Generate HMAC-SHA256 hash using shared secret (`SJSFI_SHARED_SECRET`)
3. Include hash in `x-signature` header

**Example (Node.js):**
```javascript
const crypto = require('crypto');
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const API_KEY = process.env.SJSFI_HRMS_API_KEY;

const bodyData = JSON.stringify({
  scheduleId: 123,
  teacher: {
    teacherId: '2026-0001',
    teacherName: 'Dr. Maria Santos',
    teacherEmail: 'maria.santos@school.edu'
  }
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

### Error Codes (Both Schedule Endpoints)
- `400` - Invalid request (missing/invalid data, invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `404` - Schedule not found (for assign-teacher endpoint)
- `429` - Rate limit exceeded
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: 
  - Fetch schedules: < 2000ms (p95)
  - Assign teacher: < 700ms (p95)
- **Rate Limit**: 100 requests per minute per IP
- **Timestamp Window**: ±5 minutes from server time

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release
- **Note**: SIS sync is optional and controlled by `SIS_SYNC_ENABLED` environment variable in HRMS

---

## Integration 3: Section Assignment Integration

**Integration**: SIS ↔ HRMS  
**Purpose**: SIS fetches class section assignments (advisers, homeroom teachers, section heads) from HRMS to display and manage section assignments in the SIS system.  
**Location**: `src/app/api/xr/section-assignments/route.ts`

### API Endpoint
```
GET /api/xr/section-assignments
```

### Method
`GET`

### Request Format

**Query Parameters (All Optional):**
```json
{
  "sectionId": {
    "field": "sectionId",
    "type": "number (string in query)",
    "required": false,
    "description": "Filter by specific section ID",
    "example": "1"
  },
  "gradeLevel": {
    "field": "gradeLevel",
    "type": "string",
    "required": false,
    "description": "Filter by grade level",
    "example": "7"
  },
  "schoolYear": {
    "field": "schoolYear",
    "type": "string",
    "required": false,
    "description": "Filter by school year",
    "example": "2024-2025"
  }
}
```

**Example Request:**
```
GET /api/xr/section-assignments?gradeLevel=7&schoolYear=2024-2025
```

### Response Format

**Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "count": 10,
    "assignments": [
      {
        "sectionId": 1,
        "sectionName": "Grade 7-A",
        "gradeLevel": "7",
        "section": "A",
        "schoolYear": "2024-2025",
        "semester": "1st",
        "adviser": {
          "facultyId": 123,
          "employeeId": "2026-0001",
          "firstName": "John",
          "lastName": "Doe",
          "fullName": "John Doe",
          "email": "john.doe@school.edu"
        },
        "homeroomTeacher": {
          "facultyId": 124,
          "employeeId": "2026-0002",
          "firstName": "Jane",
          "lastName": "Smith",
          "fullName": "Jane Smith",
          "email": "jane.smith@school.edu"
        },
        "sectionHead": {
          "facultyId": 125,
          "employeeId": "2026-0003",
          "firstName": "Robert",
          "lastName": "Johnson",
          "fullName": "Robert Johnson",
          "email": "robert.johnson@school.edu"
        }
      }
    ]
  }
}
```

**Note**: Any of `adviser`, `homeroomTeacher`, or `sectionHead` can be `null` if not assigned.

**Error Response:**
```json
{
  "status": "error",
  "error": "Failed to fetch section assignments",
  "errors": []
}
```

### Authentication
**Method**: HMAC-SHA256 Signature + API Key

**Required Headers:**
```
Authorization: Bearer {SJSFI_SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

**Signature Generation:**
1. For GET requests, use empty string as body
2. Concatenate empty string with timestamp
3. Generate HMAC-SHA256 hash using shared secret (`SJSFI_SHARED_SECRET`)
4. Include hash in `x-signature` header

**Example (Node.js):**
```javascript
const crypto = require('crypto');
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const API_KEY = process.env.SJSFI_SIS_API_KEY;

// For GET requests, body is empty string
const body = '';
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
- `400` - Invalid request (invalid timestamp window)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Invalid signature
- `429` - Rate limit exceeded (100 requests per minute per IP)
- `500` - Server error

### SLA
- **Availability**: 99.5% uptime
- **Response Time**: < 500ms (p95)
- **Rate Limit**: 100 requests per minute per IP
- **Timestamp Window**: ±5 minutes from server time

### Version
`v1.0.0`

### Change Log
- **2026-01-10**: Initial release

---

## Common Authentication Details

All endpoints use the same authentication mechanism:

### Environment Variables Required

**For HRMS:**
- `SJSFI_SHARED_SECRET` - Shared secret for HMAC signature verification
- `SJSFI_SIS_API_KEY` - API key for SIS system (used when SIS calls HRMS)
- `SJSFI_HRMS_API_KEY` - API key for HRMS system (used when HRMS calls SIS)
- `ENROLLMENT_BASE_URL` - Base URL of SIS system (for HRMS to call SIS)

**For SIS:**
- `SJSFI_SHARED_SECRET` - Shared secret for HMAC signature verification (same as HRMS)
- `SJSFI_SIS_API_KEY` - API key for SIS system (same as HRMS)
- `SJSFI_HRMS_API_KEY` - API key for HRMS system (same as HRMS)

### Signature Generation Process

1. **For POST requests:**
   - Convert request body to JSON string
   - Concatenate JSON string with timestamp: `message = body + timestamp`
   - Generate HMAC-SHA256: `signature = HMAC-SHA256(message, SHARED_SECRET)`

2. **For GET requests:**
   - Use empty string as body
   - Concatenate empty string with timestamp: `message = '' + timestamp`
   - Generate HMAC-SHA256: `signature = HMAC-SHA256(message, SHARED_SECRET)`

### Timestamp Window

- Timestamp must be within ±5 minutes of server time
- Timestamp format: Unix timestamp in milliseconds (e.g., `1704892800000`)
- Requests with timestamps outside this window will be rejected with `400 Bad Request`

### Rate Limiting

- All endpoints enforce rate limiting: **100 requests per minute per IP address**
- Exceeding the rate limit returns `429 Too Many Requests`
- Rate limiting is based on client IP address

---

## Integration Summary

| Integration | Direction | HRMS Endpoint | SIS Endpoint Required | Purpose |
|------------|-----------|---------------|----------------------|---------|
| User Account | SIS → HRMS | `POST /api/xr/user-access-lookup` | None | Lookup user roles by email |
| Schedule Fetch | HRMS → SIS | None | `POST /api/hrms/available-schedules` | HRMS fetches schedules from SIS |
| Schedule Assign | HRMS → SIS | None | `POST /api/hrms/assign-teacher` | HRMS syncs teacher assignments to SIS |
| Section Assignments | SIS → HRMS | `GET /api/xr/section-assignments` | None | SIS fetches section assignments from HRMS |

---

## Testing Integration

### Test User Account Integration

```bash
curl -X POST https://hrms.example.com/api/xr/user-access-lookup \
  -H "Authorization: Bearer YOUR_SIS_API_KEY" \
  -H "x-timestamp: $(date +%s)000" \
  -H "x-signature: GENERATED_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@school.edu"}'
```

### Test Section Assignments Integration

```bash
curl -X GET "https://hrms.example.com/api/xr/section-assignments?gradeLevel=7" \
  -H "Authorization: Bearer YOUR_SIS_API_KEY" \
  -H "x-timestamp: $(date +%s)000" \
  -H "x-signature: GENERATED_SIGNATURE"
```

### Test Schedule Integration (SIS Endpoints)

SIS team should test their endpoints using the same authentication mechanism, ensuring they can:
1. Accept schedule fetch requests from HRMS
2. Accept teacher assignment updates from HRMS

---

## Support and Contact

For integration support, please contact:
- **HRMS Team**: [Contact Information]
- **SIS Team**: [Contact Information]

For technical issues or API changes, please refer to the change log section of each integration point.
