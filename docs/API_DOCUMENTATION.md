# HRMS API Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Base URL:** `https://your-domain.com/api`

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Employees](#employees)
   - [Users](#users)
   - [Documents](#documents)
   - [Leave Management](#leave-management)
   - [Recruitment](#recruitment)
   - [Directory](#directory)
   - [Chat/AI](#chatai)
   - [Webhooks](#webhooks)
   - [Utilities](#utilities)
6. [Request/Response Formats](#requestresponse-formats)
7. [Webhook Events](#webhook-events)

---

## Overview

The HRMS API provides programmatic access to Human Resource Management System functionality. The API follows RESTful principles and uses JSON for data exchange.

### Key Features
- RESTful API design
- Clerk-based authentication
- Role-based access control
- Pagination support
- Webhook integration
- Rate limiting
- CORS support for public endpoints

---

## Authentication

The HRMS API uses multiple authentication methods depending on the endpoint:

### 1. Clerk Authentication (Default)
Most endpoints require Clerk authentication via session tokens.

**Headers:**
```
Authorization: Bearer <clerk_session_token>
```

**Usage:**
```typescript
const response = await fetch('/api/employees', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. API Key Authentication
Some endpoints accept API keys for system-to-system integration.

**Headers:**
```
Authorization: Bearer <api_key>
```

**Valid API Keys:**
- `SJSFI_SIS_API_KEY` - Student Information System
- `SJSFI_LMS_API_KEY` - Learning Management System
- `SJSFI_HRMS_API_KEY` - HRMS internal

**Example:**
```typescript
const response = await fetch('/api/getUserRole?userId=123', {
  headers: {
    'Authorization': `Bearer ${process.env.SJSFI_SIS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Webhook Signature Verification
Webhook endpoints use Svix signature verification.

**Headers:**
```
svix-id: <id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

### 4. Public Endpoints
Some endpoints are publicly accessible without authentication:
- `/api/vacancies/public`
- `/api/candidates/public`
- `/api/webhooks/clerk`

---

## Rate Limiting

API endpoints are protected by rate limiting to prevent abuse:

- **Default Rate Limit:** 10 requests per minute per IP
- **Login Endpoints:** 5 requests per 5 minutes
- **Unknown IPs:** 3 requests per 10 minutes
- **Response:** `429 Too Many Requests` when limit exceeded

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640000000
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

### Common Error Scenarios

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required field: FirstName"
}
```

**404 Not Found:**
```json
{
  "error": "Employee not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch employees"
}
```

---

## API Endpoints

### Employees

#### Get Employees List
**GET** `/api/employees`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `all` (boolean, optional): Return all records (default: false)

**Response:**
```json
{
  "employees": [
    {
      "EmployeeID": "2025-0001",
      "FirstName": "John",
      "LastName": "Doe",
      "EmploymentDetail": [
        {
          "EmploymentStatus": "Regular",
          "HireDate": "2024-01-15",
          "Designation": "Faculty",
          "Position": "Teacher"
        }
      ],
      "ContactInfo": [...],
      "Department": {
        "DepartmentName": "Primary"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 100,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Create Employee
**POST** `/api/employees`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "FirstName": "John",
  "LastName": "Doe",
  "MiddleName": "M",
  "ExtensionName": "Jr",
  "DateOfBirth": "1990-01-15",
  "Sex": "Male",
  "HireDate": "2024-01-15",
  "EmploymentStatus": "Regular",
  "Designation": "Faculty",
  "Position": "Teacher",
  "DepartmentID": 1,
  "Email": "john.doe@example.com",
  "Phone": "+1234567890"
}
```

**Required Fields:**
- `FirstName`
- `LastName`
- `DateOfBirth`
- `HireDate`
- `Sex`

**Response:**
```json
{
  "EmployeeID": "2025-0001",
  "FirstName": "John",
  "LastName": "Doe",
  ...
}
```

#### Update Employee
**PATCH** `/api/employees`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "EmployeeID": "2025-0001",
  "FirstName": "John",
  "LastName": "Smith",
  ...
}
```

#### Get Employee by ID
**GET** `/api/employees/[employeeId]`

**Authentication:** Required (Clerk, Admin or own record)

**Response:**
```json
{
  "EmployeeID": "2025-0001",
  "FirstName": "John",
  "LastName": "Doe",
  "EmploymentDetail": [...],
  "ContactInfo": [...],
  "Family": [...],
  "Education": [...],
  "skills": [...],
  "certificates": [...]
}
```

#### Employee Sub-resources

**Certificates:**
- `GET /api/employees/[employeeId]/certificates` - List certificates
- `POST /api/employees/[employeeId]/certificates` - Add certificate
- `GET /api/employees/[employeeId]/certificates/[id]` - Get certificate
- `DELETE /api/employees/[employeeId]/certificates/[id]` - Delete certificate

**Skills:**
- `GET /api/employees/[employeeId]/skills` - List skills
- `POST /api/employees/[employeeId]/skills` - Add skill
- `PATCH /api/employees/[employeeId]/skills/[id]` - Update skill
- `DELETE /api/employees/[employeeId]/skills/[id]` - Delete skill

**Education:**
- `GET /api/employees/[employeeId]/education` - List education records
- `POST /api/employees/[employeeId]/education` - Add education
- `PATCH /api/employees/[employeeId]/education/[id]` - Update education
- `DELETE /api/employees/[employeeId]/education/[id]` - Delete education

**Family:**
- `GET /api/employees/[employeeId]/family` - List family members
- `POST /api/employees/[employeeId]/family` - Add family member
- `PATCH /api/employees/[employeeId]/family/[id]` - Update family member
- `DELETE /api/employees/[employeeId]/family/[id]` - Delete family member

**Work Experience:**
- `GET /api/employees/[employeeId]/work-experience` - List work experience
- `POST /api/employees/[employeeId]/work-experience` - Add work experience
- `PATCH /api/employees/[employeeId]/work-experience/[id]` - Update work experience
- `DELETE /api/employees/[employeeId]/work-experience/[id]` - Delete work experience

**Promotion History:**
- `GET /api/employees/[employeeId]/promotion-history` - List promotions
- `POST /api/employees/[employeeId]/promotion-history` - Add promotion
- `PATCH /api/employees/[employeeId]/promotion-history/[id]` - Update promotion
- `DELETE /api/employees/[employeeId]/promotion-history/[id]` - Delete promotion

**Medical Info:**
- `GET /api/employees/[employeeId]/medical` - Get medical information
- `PATCH /api/employees/[employeeId]/medical` - Update medical information

#### Export Employees
**GET** `/api/employees/export`

**Authentication:** Required (Clerk, Admin role)

**Query Parameters:**
- `format` (string): `csv` or `xlsx` (default: `csv`)
- `designation` (string, optional): Filter by designation
- `hireDateFrom` (string, optional): Filter from date (YYYY-MM-DD)
- `hireDateTo` (string, optional): Filter to date (YYYY-MM-DD)
- `orderBy` (string, optional): Sort field (`LastName`, `FirstName`, `EmployeeID`)
- `orderDir` (string, optional): Sort direction (`asc`, `desc`)

**Response:** File download (CSV or XLSX)

#### Import Employees
**POST** `/api/employees/import`

**Authentication:** Required (Clerk, Admin role)

**Request:** Multipart form data with CSV file

**Response:**
```json
{
  "success": true,
  "imported": 50,
  "errors": []
}
```

---

### Users

#### Get User Role
**GET** `/api/getUserRole`

**Authentication:** API Key required

**Query Parameters:**
- `userId` (string, optional): User ID
- `email` (string, optional): User email

**Response:**
```json
{
  "role": "admin",
  "userId": "2025-0001",
  "email": "user@example.com"
}
```

#### Refresh Clerk ID
**POST** `/api/users/refresh-clerk-id`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "email": "user@example.com",
  "userId": "2025-0001"
}
```

**Response:**
```json
{
  "message": "ClerkID updated successfully",
  "clerkId": "user_abc123",
  "searchMethod": "exact_email"
}
```

#### Refresh Password Hash
**POST** `/api/users/refresh-password-hash`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "userId": "2025-0001",
  "password": "newpassword"
}
```

#### Get User by ID
**GET** `/api/users/[id]`

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "UserID": "2025-0001",
  "FirstName": "John",
  "LastName": "Doe",
  "Email": "john.doe@example.com",
  "Status": "Active",
  "Role": [...]
}
```

#### Get User by Email
**GET** `/api/users/email/[email]`

**Authentication:** Required (Clerk)

**Response:** Same as Get User by ID

#### Create User
**POST** `/api/createUser`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "FirstName": "John",
  "LastName": "Doe",
  "Email": "john.doe@example.com",
  "Password": "securepassword",
  "Role": "admin"
}
```

#### Update User
**PATCH** `/api/updateUser`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "UserID": "2025-0001",
  "FirstName": "John",
  "LastName": "Smith",
  ...
}
```

#### Delete User
**DELETE** `/api/deleteUser`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "UserID": "2025-0001"
}
```

#### Soft Delete User
**POST** `/api/softDeleteUser`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "UserID": "2025-0001"
}
```

#### Verify User Role
**POST** `/api/verifyUserRole`

**Authentication:** Required (Clerk)

**Request Body:**
```json
{
  "userId": "2025-0001",
  "requiredRole": "admin"
}
```

**Response:**
```json
{
  "hasRole": true,
  "userRole": "admin"
}
```

---

### Documents

#### Get Employee Documents
**GET** `/api/employee-documents`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `employeeId` (string, optional): Filter by employee ID
- `documentTypeId` (number, optional): Filter by document type

**Response:**
```json
{
  "documents": [
    {
      "DocumentID": 1,
      "employeeId": "2025-0001",
      "DocumentTypeID": 1,
      "SubmissionStatus": "Approved",
      "FileUrl": "https://...",
      "UploadDate": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Upload Employee Document
**POST** `/api/employee-documents`

**Authentication:** Required (Clerk)

**Request:** Multipart form data
- `employeeId` (string, required)
- `documentTypeId` (number, required)
- `file` (File, required)

**Response:**
```json
{
  "DocumentID": 1,
  "FileUrl": "https://...",
  "SubmissionStatus": "Submitted"
}
```

#### Get Faculty Documents
**GET** `/api/faculty-documents`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `facultyId` (number, optional): Filter by faculty ID

**Response:** Same format as employee documents

#### Upload Faculty Document
**POST** `/api/faculty-documents`

**Authentication:** Required (Clerk)

**Request:** Multipart form data
- `facultyId` (number, required)
- `documentTypeId` (number, required)
- `file` (File, required)

#### Delete Document
**DELETE** `/api/faculty-documents/[documentId]`

**Authentication:** Required (Clerk, Admin role)

#### Get Document Types
**GET** `/api/document-types`

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "documentTypes": [
    {
      "DocumentTypeID": 1,
      "DocumentTypeName": "Resume",
      "AllowedFileTypes": ["pdf", "doc", "docx"]
    }
  ]
}
```

---

### Leave Management

#### Get Leave Requests
**GET** `/api/leaves`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `status` (string, optional): Filter by status
- `facultyId` (number, optional): Filter by faculty ID

**Response:**
```json
{
  "leaves": [
    {
      "id": 1,
      "facultyId": 1,
      "leaveType": "Sick Leave",
      "startDate": "2024-01-15",
      "endDate": "2024-01-20",
      "status": "Pending",
      "reason": "Medical appointment"
    }
  ]
}
```

#### Create Leave Request
**POST** `/api/leaves`

**Authentication:** Required (Clerk)

**Request Body:**
```json
{
  "facultyId": 1,
  "leaveType": "Sick Leave",
  "startDate": "2024-01-15",
  "endDate": "2024-01-20",
  "reason": "Medical appointment"
}
```

#### Update Leave Request
**PATCH** `/api/leaves/[id]`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "status": "Approved",
  "comments": "Approved by admin"
}
```

#### Get Faculty Leave Requests
**GET** `/api/leaves/faculty/[facultyId]`

**Authentication:** Required (Clerk)

**Response:** Array of leave requests for the specified faculty

---

### Recruitment

#### Get Vacancies (Public)
**GET** `/api/vacancies/public`

**Authentication:** Not required (Public endpoint)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Mathematics Teacher",
    "position": "Faculty Member",
    "description": "Teaching position...",
    "postedDate": "January 15, 2024"
  }
]
```

**CORS:** Enabled for cross-origin requests

#### Get Vacancies
**GET** `/api/vacancies`

**Authentication:** Required (Clerk, Admin role)

**Response:**
```json
{
  "vacancies": [
    {
      "VacancyID": 1,
      "JobTitle": "Faculty",
      "VacancyName": "Mathematics Teacher",
      "Description": "...",
      "Status": "Active",
      "DateCreated": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Create Vacancy
**POST** `/api/vacancies`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "JobTitle": "Faculty",
  "VacancyName": "Mathematics Teacher",
  "Description": "Teaching position for mathematics",
  "Status": "Active"
}
```

#### Get Candidates (Public)
**POST** `/api/candidates/public`

**Authentication:** Not required (Public endpoint)

**Request:** Multipart form data
- `VacancyID` (number, required)
- `FirstName` (string, required)
- `LastName` (string, required)
- `Email` (string, required)
- `Sex` (string, required): "Male" or "Female"
- `DateOfBirth` (string, required): YYYY-MM-DD
- `ContactNumber` (string, optional)
- `resume` (File, optional)

**Validation:**
- Age must be between 18-65 years
- Sex must be "Male" or "Female"

**Response:**
```json
{
  "CandidateID": 1,
  "FullName": "John Doe",
  "Email": "john.doe@example.com",
  "Status": "ApplicationInitiated"
}
```

#### Get Candidates
**GET** `/api/candidates`

**Authentication:** Required (Clerk, Admin role)

**Query Parameters:**
- `vacancyId` (number, optional): Filter by vacancy
- `status` (string, optional): Filter by status

**Response:**
```json
{
  "candidates": [
    {
      "CandidateID": 1,
      "VacancyID": 1,
      "FullName": "John Doe",
      "Email": "john.doe@example.com",
      "Status": "ApplicationInitiated",
      "ResumeUrl": "https://..."
    }
  ]
}
```

#### Update Candidate Status
**PATCH** `/api/candidates/[id]`

**Authentication:** Required (Clerk, Admin role)

**Request Body:**
```json
{
  "Status": "InterviewScheduled",
  "InterviewDate": "2024-02-01"
}
```

#### Check Candidate Email
**GET** `/api/candidates/check-email`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `email` (string, required)

**Response:**
```json
{
  "exists": true,
  "candidateId": 1
}
```

---

### Directory

#### Get Directory
**GET** `/api/directory`

**Authentication:** Required (Clerk)

**Query Parameters:**
- `name` (string, optional): Search by name
- `department` (string, optional): Filter by department
- `position` (string, optional): Filter by position
- `status` (string, optional): Filter by employment status
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)

**Response:**
```json
{
  "records": [
    {
      "EmployeeID": "2025-0001",
      "FirstName": "John",
      "LastName": "Doe",
      "Department": {
        "DepartmentName": "Primary"
      },
      "EmploymentDetail": [
        {
          "EmploymentStatus": "Regular",
          "HireDate": "2024-01-15"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "limit": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filterOptions": {
    "departments": ["Primary", "Secondary"],
    "positions": ["Teacher", "Principal"],
    "statuses": ["Regular", "Probationary"]
  }
}
```

---

### Chat/AI

#### Chat with AI Assistant
**POST** `/api/chat`

**Authentication:** Required (Clerk)

**Request Body:**
```json
{
  "message": "How do I add a new employee?",
  "userRole": "admin",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "To add a new employee, navigate to the Employees section...",
  "conversationHistory": [...]
}
```

**Features:**
- Role-based responses (admin, faculty, employee)
- Context-aware conversations
- Out-of-scope detection
- Retry logic for API failures

---

### Webhooks

#### Clerk Webhook
**POST** `/api/webhooks/clerk`

**Authentication:** Svix signature verification

**Headers:**
```
svix-id: <id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

**Supported Events:**
- `user.created` - New user created in Clerk
- `user.updated` - User profile updated
- `user.deleted` - User deleted
- `session.created` - User session started
- `session.ended` - User session ended
- `invitation.accepted` - User accepted invitation
- `invitation.expired` - Invitation expired

**Event Payload Example:**
```json
{
  "type": "user.created",
  "data": {
    "id": "user_abc123",
    "email_addresses": [
      {
        "email_address": "user@example.com"
      }
    ],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Utilities

#### Get Departments
**GET** `/api/departments`

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "departments": [
    {
      "DepartmentID": 1,
      "DepartmentName": "Primary",
      "type": "Primary"
    }
  ]
}
```

#### Generate Employee ID
**GET** `/api/generate-employee-id`

**Authentication:** Required (Clerk, Admin role)

**Response:**
```json
{
  "employeeId": "2025-0001"
}
```

#### Generate User ID
**GET** `/api/generate-user-id`

**Authentication:** Required (Clerk, Admin role)

**Response:**
```json
{
  "userId": "2025-0001"
}
```

#### Upload File
**POST** `/api/upload`

**Authentication:** Required (Clerk)

**Request:** Multipart form data with file

**Response:**
```json
{
  "url": "https://...",
  "fileId": "file_abc123"
}
```

#### Get Client IP
**GET** `/api/ip`

**Authentication:** Not required (Public)

**Response:**
```json
{
  "ip": "192.168.1.1"
}
```

#### User Access Lookup (XR Integration)
**POST** `/api/xr/user-access-lookup`

**Authentication:** API Key + Signature

**Headers:**
```
Authorization: Bearer <api_key>
x-timestamp: <timestamp>
x-signature: <signature>
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "hasAccess": true,
  "role": "admin",
  "userId": "2025-0001"
}
```

---

## Request/Response Formats

### Date Formats
- **ISO 8601:** `2024-01-15T10:00:00Z`
- **Date Only:** `2024-01-15`
- **Display Format:** `January 15, 2024`

### Enum Values

**Employment Status:**
- `Hired`
- `Resigned`
- `Regular`
- `Probationary`
- `Part_Time`
- `Retired`

**Designation:**
- `President`
- `Admin_Officer`
- `Vice_President`
- `Registrar`
- `Faculty`
- `Principal`
- `Cashier`

**Sex:**
- `Male`
- `Female`
- `Intersex`

**Document Submission Status:**
- `Submitted`
- `Approved`
- `Returned`
- `Pending`

**User Status:**
- `Active`
- `Inactive`
- `Invited`

**Department Type:**
- `Pre_School`
- `Primary`
- `Intermediate`
- `JHS`
- `Admin`
- `Default`

---

## Webhook Events

### User Created
Triggered when a new user is created in Clerk.

**Event:** `user.created`

**Actions:**
- Creates or updates user record in database
- Links ClerkID to UserID
- Sets status to Active
- Logs activity

### User Updated
Triggered when user profile is updated in Clerk.

**Event:** `user.updated`

**Actions:**
- Updates user data in database
- Updates profile photo
- Logs activity

### User Deleted
Triggered when user is deleted in Clerk.

**Event:** `user.deleted`

**Actions:**
- Sets user status to Inactive
- Marks user as deleted
- Logs activity

### Session Created
Triggered when user starts a new session.

**Event:** `session.created`

**Actions:**
- Updates LastLogin timestamp
- Logs activity

### Session Ended
Triggered when user session ends.

**Event:** `session.ended`

**Actions:**
- Logs activity

### Invitation Accepted
Triggered when user accepts an invitation.

**Event:** `invitation.accepted`

**Actions:**
- Activates user account
- Links ClerkID
- Cleans up pending webhooks
- Logs activity

### Invitation Expired
Triggered when an invitation expires.

**Event:** `invitation.expired`

**Actions:**
- Logs activity

---

## Best Practices

### 1. Error Handling
Always check response status codes and handle errors appropriately:

```typescript
const response = await fetch('/api/employees');
if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error);
  // Handle error
}
```

### 2. Pagination
Use pagination for large datasets:

```typescript
let page = 1;
let allData = [];

while (true) {
  const response = await fetch(`/api/employees?page=${page}&limit=100`);
  const data = await response.json();
  allData.push(...data.employees);
  
  if (!data.pagination.hasNextPage) break;
  page++;
}
```

### 3. Rate Limiting
Implement exponential backoff when hitting rate limits:

```typescript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status !== 429) return response;
    
    const delay = Math.pow(2, i) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Rate limit exceeded');
}
```

### 4. Authentication
Always include authentication headers:

```typescript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### 5. File Uploads
Use FormData for file uploads:

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('employeeId', '2025-0001');
formData.append('documentTypeId', '1');

const response = await fetch('/api/employee-documents', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Support

For API support and questions:
- **Email:** support@example.com
- **Documentation:** https://docs.example.com
- **Status Page:** https://status.example.com

---

## Changelog

### Version 1.0 (2025-01-27)
- Initial API documentation
- Employee management endpoints
- User management endpoints
- Document management
- Leave management
- Recruitment endpoints
- Webhook integration
- Chat/AI endpoints

---

**Note:** This documentation is maintained alongside the codebase. For the most up-to-date information, refer to the source code in `src/app/api/`.

