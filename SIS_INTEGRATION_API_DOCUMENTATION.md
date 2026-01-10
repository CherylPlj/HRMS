# SIS-HRMS Integration API Documentation

## 🚀 Quick Start (For SIS Team)

You now have **3 new API endpoints** to integrate HRMS data with your SIS:

1. **Faculty Availability** - Check if faculty is available or on leave
2. **Faculty Qualifications** - Get education, licenses, certifications
3. **Faculty Teaching Load** - Get workload and validate assignments

---

## 🔐 Authentication (All Endpoints)

All endpoints use the **same authentication** as the existing `/api/xr/user-access-lookup`:

### Required Headers:
```
Authorization: Bearer YOUR_API_KEY
x-timestamp: UNIX_TIMESTAMP_IN_MILLISECONDS
x-signature: HMAC_SHA256_SIGNATURE
```

### Authentication Process:

1. **API Key**: Use the SIS API key provided by HRMS team
2. **Timestamp**: Current time in milliseconds (must be within 5 minutes)
3. **Signature**: HMAC-SHA256 hash of `body + timestamp` using shared secret

### Example (Node.js):
```javascript
const crypto = require('crypto');

const SHARED_SECRET = 'your_shared_secret';
const API_KEY = 'your_sis_api_key';

// For GET requests
const body = '';
const timestamp = Date.now().toString();
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(body + timestamp)
  .digest('hex');

// For POST requests
const bodyData = JSON.stringify({ employeeId: '2026-0001' });
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

---

## 📚 API Endpoints

### 1. Faculty Availability API

**Endpoint**: `GET /api/xr/faculty-availability/[employeeId]`

**Purpose**: Check if faculty is available for teaching or currently on leave

**Use Cases**:
- ✅ Check before scheduling classes
- ✅ Get leave schedule for planning
- ✅ Verify employment status
- ✅ See upcoming leaves

**Request**:
```http
GET /api/xr/faculty-availability/2026-0001?startDate=2026-01-15&endDate=2026-01-30
Authorization: Bearer YOUR_API_KEY
x-timestamp: 1736543210000
x-signature: abc123...
```

**Query Parameters** (Optional):
- `startDate`: Check availability from this date (YYYY-MM-DD)
- `endDate`: Check availability until this date (YYYY-MM-DD)

**Response** (200 OK):
```json
{
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
```

**Error Responses**:
- `404` - Faculty not found
- `401` - Invalid API key
- `403` - Invalid signature
- `429` - Rate limit exceeded

---

### 2. Faculty Qualifications API

**Endpoint**: `GET /api/xr/faculty-qualifications/[employeeId]`

**Purpose**: Get faculty educational background, licenses, and certifications

**Use Cases**:
- ✅ Validate if faculty can teach specific subjects
- ✅ Check PRC License validity
- ✅ Verify educational requirements
- ✅ Compliance checking for DepEd/CHED

**Request**:
```http
GET /api/xr/faculty-qualifications/2026-0001
Authorization: Bearer YOUR_API_KEY
x-timestamp: 1736543210000
x-signature: abc123...
```

**Response** (200 OK):
```json
{
  "employeeId": "2026-0001",
  "facultyId": 1,
  "name": "Juan Dela Cruz",
  "email": "juan.delacruz@school.edu.ph",
  "position": "Teacher III",
  "department": {
    "id": 1,
    "name": "Math",
    "type": "JHS"
  },
  "education": [
    {
      "level": "Master's Degree",
      "schoolName": "University of the Philippines",
      "course": "Master of Arts in Mathematics Education",
      "yearGraduated": 2020,
      "honors": "With Distinction"
    },
    {
      "level": "Bachelor's Degree",
      "schoolName": "Ateneo de Manila University",
      "course": "BS Mathematics",
      "yearGraduated": 2015,
      "honors": "Cum Laude"
    }
  ],
  "highestEducation": {
    "level": "Master's Degree",
    "course": "Master of Arts in Mathematics Education",
    "schoolName": "University of the Philippines"
  },
  "licenses": {
    "prc": {
      "licenseNumber": "1234567",
      "validity": "2028-06-30T00:00:00.000Z",
      "isValid": true,
      "status": "Valid"
    },
    "other": {
      "tin": "123-456-789-000",
      "bir": "12-3456789-0",
      "passport": null,
      "passportValidity": null
    }
  },
  "eligibility": [
    {
      "title": "Licensure Examination for Teachers (LET)",
      "licenseNumber": "1234567",
      "rating": "87.5",
      "examDate": "2015-09-27T00:00:00.000Z",
      "examPlace": "Manila",
      "validityDate": null
    }
  ],
  "certifications": [
    {
      "name": "Advanced Teaching Methodology",
      "issuingOrganization": "DepEd",
      "issueDate": "2023-03-15T00:00:00.000Z",
      "expiryDate": "2026-03-15T00:00:00.000Z",
      "isValid": true
    }
  ],
  "skills": [
    {
      "name": "Mathematics",
      "proficiencyLevel": "Expert",
      "description": "Advanced algebra, calculus, statistics"
    },
    {
      "name": "Educational Technology",
      "proficiencyLevel": "Advanced",
      "description": "Google Classroom, Moodle, Canvas"
    }
  ],
  "trainings": [
    {
      "title": "K-12 Curriculum Training",
      "sponsoredBy": "DepEd",
      "trainingType": "Workshop",
      "dateFrom": "2024-06-01T00:00:00.000Z",
      "dateTo": "2024-06-05T00:00:00.000Z",
      "numberOfHours": 40,
      "dateCompleted": "2024-06-05T00:00:00.000Z"
    }
  ],
  "experience": {
    "yearsOfTeaching": 8,
    "hireDate": "2018-06-01T00:00:00.000Z",
    "currentPosition": "Teacher III",
    "employmentStatus": "Regular",
    "previousEmployment": [
      {
        "schoolName": "St. Mary's Academy",
        "position": "Math Teacher",
        "startDate": "2015-06-01T00:00:00.000Z",
        "endDate": "2018-05-31T00:00:00.000Z",
        "yearsOfService": 2
      }
    ]
  },
  "qualificationSummary": {
    "hasValidPRCLicense": true,
    "hasPostgraduate": true,
    "hasBachelors": true,
    "yearsOfExperience": 8,
    "numberOfCertifications": 1,
    "numberOfTrainings": 1,
    "isQualified": true
  }
}
```

**Error Responses**:
- `404` - Employee not found
- `401` - Invalid API key
- `403` - Invalid signature
- `429` - Rate limit exceeded

---

### 3. Faculty Teaching Load API

**Endpoint**: `GET /api/xr/faculty-workload/[employeeId]`

**Purpose**: Get faculty current teaching workload and schedule

**Use Cases**:
- ✅ Check current teaching load
- ✅ See detailed schedule
- ✅ Determine if faculty can take more sections
- ✅ Workload balancing

**Request**:
```http
GET /api/xr/faculty-workload/2026-0001
Authorization: Bearer YOUR_API_KEY
x-timestamp: 1736543210000
x-signature: abc123...
```

**Response** (200 OK):
```json
{
  "employeeId": "2026-0001",
  "facultyId": 1,
  "name": "Juan Dela Cruz",
  "email": "juan.delacruz@school.edu.ph",
  "position": "Teacher III",
  "employmentType": "Regular",
  "employmentStatus": "Regular",
  "department": {
    "id": 1,
    "name": "Math"
  },
  "workload": {
    "totalSections": 6,
    "totalHoursPerWeek": 24,
    "maxHoursPerWeek": 40,
    "maxSections": 10,
    "availableHours": 16,
    "workloadPercentage": 60,
    "canTakeMoreSections": true,
    "status": "Moderate Load"
  },
  "scheduleByDay": {
    "Monday": [
      {
        "scheduleId": 1,
        "subject": "Mathematics 7",
        "section": "Grade 7 - Rizal",
        "time": "08:00-09:00",
        "duration": 1,
        "subjectId": 5,
        "sectionId": 10
      }
    ],
    "Tuesday": [],
    "Wednesday": []
  },
  "hoursPerDay": [
    {
      "day": "Monday",
      "totalHours": 4,
      "numberOfClasses": 4
    }
  ],
  "schedules": [
    {
      "scheduleId": 1,
      "day": "Monday",
      "time": "08:00-09:00",
      "duration": 1,
      "subject": {
        "id": 5,
        "name": "Mathematics 7"
      },
      "section": {
        "id": 10,
        "name": "Grade 7 - Rizal"
      }
    }
  ],
  "contract": {
    "contractType": "Full_Time",
    "startDate": "2024-06-01T00:00:00.000Z",
    "endDate": "2025-05-31T00:00:00.000Z"
  },
  "recommendations": {
    "canAssignMore": true,
    "suggestedMaxAdditionalHours": 16,
    "suggestedMaxAdditionalSections": 4,
    "warnings": []
  }
}
```

**Error Responses**:
- `404` - Faculty not found
- `401` - Invalid API key
- `403` - Invalid signature
- `429` - Rate limit exceeded

---

### 4. Faculty Workload Validation API

**Endpoint**: `POST /api/xr/faculty-workload/validate`

**Purpose**: Validate if faculty can take additional workload before assignment

**Use Cases**:
- ✅ Before assigning new section
- ✅ Check schedule conflicts
- ✅ Prevent overloading faculty
- ✅ Compliance with labor standards

**Request**:
```http
POST /api/xr/faculty-workload/validate
Authorization: Bearer YOUR_API_KEY
x-timestamp: 1736543210000
x-signature: abc123...
Content-Type: application/json

{
  "employeeId": "2026-0001",
  "additionalHours": 3,
  "additionalSections": 1,
  "day": "Monday",
  "time": "08:00-09:00",
  "duration": 1
}
```

**Request Body**:
```typescript
{
  employeeId: string;          // Required
  additionalHours?: number;    // Optional: hours to add
  additionalSections?: number; // Optional: sections to add
  day?: string;                // Optional: for conflict check
  time?: string;               // Optional: for conflict check
  duration?: number;           // Optional: class duration in hours
}
```

**Response** (200 OK - Can Assign):
```json
{
  "canAssign": true,
  "reason": "Faculty can take additional workload",
  "validation": {
    "employeeId": "2026-0001",
    "facultyId": 1,
    "name": "Juan Dela Cruz",
    "employmentType": "Regular"
  },
  "currentWorkload": {
    "sections": 6,
    "hoursPerWeek": 24
  },
  "proposedWorkload": {
    "sections": 7,
    "hoursPerWeek": 28
  },
  "limits": {
    "maxSections": 10,
    "maxHoursPerWeek": 40
  },
  "availability": {
    "remainingSections": 3,
    "remainingHours": 12
  },
  "checks": {
    "exceedsHours": false,
    "exceedsSections": false,
    "scheduleConflict": false
  },
  "conflicts": []
}
```

**Response** (200 OK - Cannot Assign):
```json
{
  "canAssign": false,
  "reason": "Schedule conflict detected",
  "validation": {
    "employeeId": "2026-0001",
    "facultyId": 1,
    "name": "Juan Dela Cruz",
    "employmentType": "Regular"
  },
  "currentWorkload": {
    "sections": 6,
    "hoursPerWeek": 24
  },
  "proposedWorkload": {
    "sections": 7,
    "hoursPerWeek": 28
  },
  "limits": {
    "maxSections": 10,
    "maxHoursPerWeek": 40
  },
  "availability": {
    "remainingSections": 3,
    "remainingHours": 12
  },
  "checks": {
    "exceedsHours": false,
    "exceedsSections": false,
    "scheduleConflict": true
  },
  "conflicts": [
    {
      "day": "Monday",
      "time": "08:00-09:00",
      "duration": 1,
      "subject": "Mathematics 7",
      "section": "Grade 7 - Rizal"
    }
  ]
}
```

**Error Responses**:
- `404` - Faculty not found
- `400` - Invalid request data
- `401` - Invalid API key
- `403` - Invalid signature
- `429` - Rate limit exceeded

---

## 🧪 Testing Guide

### Step 1: Get Your Credentials

Contact HRMS team to get:
1. **SIS API Key** (`SJSFI_SIS_API_KEY`)
2. **Shared Secret** (`SJSFI_SHARED_SECRET`)
3. **Base URL** (e.g., `https://hrms.school.edu.ph`)

### Step 2: Test with cURL

#### Test Faculty Availability:
```bash
# Set variables
API_KEY="your_api_key_here"
SHARED_SECRET="your_shared_secret_here"
BASE_URL="https://hrms.school.edu.ph"
EMPLOYEE_ID="2026-0001"

# Generate timestamp
TIMESTAMP=$(date +%s%3N)

# For GET requests, body is empty
BODY=""

# Generate signature (Linux/Mac)
SIGNATURE=$(echo -n "${BODY}${TIMESTAMP}" | openssl dgst -sha256 -hmac "${SHARED_SECRET}" | cut -d' ' -f2)

# Make request
curl -X GET "${BASE_URL}/api/xr/faculty-availability/${EMPLOYEE_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-timestamp: ${TIMESTAMP}" \
  -H "x-signature: ${SIGNATURE}"
```

#### Test Faculty Qualifications:
```bash
curl -X GET "${BASE_URL}/api/xr/faculty-qualifications/${EMPLOYEE_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-timestamp: ${TIMESTAMP}" \
  -H "x-signature: ${SIGNATURE}"
```

#### Test Workload Validation:
```bash
# Generate timestamp
TIMESTAMP=$(date +%s%3N)

# Request body
BODY='{"employeeId":"2026-0001","additionalHours":3,"additionalSections":1}'

# Generate signature
SIGNATURE=$(echo -n "${BODY}${TIMESTAMP}" | openssl dgst -sha256 -hmac "${SHARED_SECRET}" | cut -d' ' -f2)

# Make request
curl -X POST "${BASE_URL}/api/xr/faculty-workload/validate" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-timestamp: ${TIMESTAMP}" \
  -H "x-signature: ${SIGNATURE}" \
  -H "Content-Type: application/json" \
  -d "${BODY}"
```

### Step 3: Test with Postman

1. **Create Collection**: "HRMS-SIS Integration"
2. **Add Environment Variables**:
   - `api_key`: Your SIS API key
   - `shared_secret`: Your shared secret
   - `base_url`: HRMS base URL

3. **Pre-request Script** (Add to collection level):
```javascript
const timestamp = Date.now().toString();
const body = pm.request.method === 'GET' ? '' : pm.request.body.raw || '';
const signature = CryptoJS.HmacSHA256(
  body + timestamp,
  pm.environment.get('shared_secret')
).toString();

pm.request.headers.add({
  key: 'x-timestamp',
  value: timestamp
});

pm.request.headers.add({
  key: 'x-signature',
  value: signature
});

pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('api_key')
});
```

### Step 4: Integration into Your SIS

#### Example: Check Faculty Availability Before Scheduling

```javascript
// sis-integration.js
const crypto = require('crypto');
const axios = require('axios');

class HRMSIntegration {
  constructor(apiKey, sharedSecret, baseUrl) {
    this.apiKey = apiKey;
    this.sharedSecret = sharedSecret;
    this.baseUrl = baseUrl;
  }

  generateSignature(body, timestamp) {
    return crypto
      .createHmac('sha256', this.sharedSecret)
      .update(body + timestamp)
      .digest('hex');
  }

  async checkFacultyAvailability(employeeId, startDate = null, endDate = null) {
    const timestamp = Date.now().toString();
    const body = '';
    const signature = this.generateSignature(body, timestamp);

    let url = `${this.baseUrl}/api/xr/faculty-availability/${employeeId}`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-timestamp': timestamp,
          'x-signature': signature,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error checking faculty availability:', error.response?.data || error.message);
      throw error;
    }
  }

  async validateFacultyWorkload(employeeId, additionalData) {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({ employeeId, ...additionalData });
    const signature = this.generateSignature(body, timestamp);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/xr/faculty-workload/validate`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error validating workload:', error.response?.data || error.message);
      throw error;
    }
  }

  async getFacultyQualifications(employeeId) {
    const timestamp = Date.now().toString();
    const body = '';
    const signature = this.generateSignature(body, timestamp);

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/xr/faculty-qualifications/${employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting qualifications:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Usage Example
async function scheduleClass(facultyEmployeeId, sectionId, day, time, duration) {
  const hrms = new HRMSIntegration(
    process.env.HRMS_API_KEY,
    process.env.HRMS_SHARED_SECRET,
    process.env.HRMS_BASE_URL
  );

  try {
    // Step 1: Check if faculty is available
    const availability = await hrms.checkFacultyAvailability(facultyEmployeeId);
    
    if (!availability.isAvailable) {
      console.log(`Faculty unavailable: ${availability.availability.reason}`);
      return { success: false, reason: availability.availability.reason };
    }

    // Step 2: Validate workload
    const validation = await hrms.validateFacultyWorkload(facultyEmployeeId, {
      additionalSections: 1,
      day,
      time,
      duration,
    });

    if (!validation.canAssign) {
      console.log(`Cannot assign: ${validation.reason}`);
      return { success: false, reason: validation.reason };
    }

    // Step 3: Proceed with scheduling in SIS
    console.log('Faculty can be assigned. Proceeding with scheduling...');
    // Your SIS scheduling logic here
    
    return { success: true };
  } catch (error) {
    console.error('Integration error:', error);
    return { success: false, reason: 'Integration error' };
  }
}

module.exports = { HRMSIntegration, scheduleClass };
```

---

## 📊 Workload Limits Reference

| Employment Type | Max Hours/Week | Max Sections |
|----------------|----------------|--------------|
| Regular        | 40             | 10           |
| Probationary   | 35             | 8            |
| Part-Time      | 20             | 5            |

---

## 🔍 Common Issues & Troubleshooting

### Issue: "Invalid signature" (403)
**Solution**: 
- Ensure timestamp is current (within 5 minutes)
- Check body content matches exactly (no extra spaces)
- Verify shared secret is correct
- For GET requests, use empty string as body

### Issue: "Rate limit exceeded" (429)
**Solution**:
- Wait 1 minute before retrying
- Implement exponential backoff
- Cache responses when possible

### Issue: "Faculty not found" (404)
**Solution**:
- Verify Employee ID format (should be YYYY-NNNN like "2026-0001")
- Check if faculty exists in HRMS
- Ensure faculty is not deleted (isDeleted = false)

### Issue: No schedules returned
**Solution**:
- Faculty may not have schedules assigned yet
- Check if Faculty ID exists (not just Employee ID)

---

## 📞 Support

For integration support:
- **Technical Issues**: Contact HRMS Development Team
- **API Access**: Contact HRMS Administrator
- **Data Questions**: Contact HR Department

---

## 🔄 API Versioning

Current Version: **v1** (2026-01-10)

All endpoints are under `/api/xr/` namespace for cross-system integration.

---

*Last Updated: January 10, 2026*  
*Status: Production Ready*
