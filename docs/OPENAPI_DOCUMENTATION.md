# HRMS API - OpenAPI/Swagger Documentation

## Overview

This document describes the formal API documentation for the HRMS (Human Resource Management System) API, provided in OpenAPI 3.0.3 format.

## Documentation File

The complete OpenAPI specification is available at: **`docs/openapi.yaml`**

## Features

### ✅ Complete API Documentation

- **All Endpoints**: Comprehensive coverage of all API endpoints
- **Request/Response Examples**: Detailed examples for all operations
- **Error Codes**: Complete error code documentation with examples
- **Authentication Requirements**: Detailed authentication methods and requirements

### 📋 Included Endpoint Categories

1. **Authentication** - User role lookup and authentication
2. **Employees** - Complete employee management (CRUD operations, sub-resources)
3. **Users** - User account management
4. **Documents** - Document upload and management
5. **Leave Management** - Leave request creation, approval, and tracking
6. **Recruitment** - Job vacancies and candidate management
7. **Performance** - Performance reviews, goals, and KPIs
8. **Directory** - Employee directory and search
9. **Chat/AI** - AI-powered chat assistant
10. **Integration (XR)** - Cross-system integration endpoints
11. **Schedules** - Teaching schedules and assignments
12. **Webhooks** - Webhook endpoints for external integrations
13. **Utilities** - Utility endpoints (ID generation, IP lookup, etc.)

## Authentication Methods

### 1. Clerk Authentication (Default)
Most endpoints require Clerk authentication via session tokens.

**Header:**
```
Authorization: Bearer <clerk_session_token>
```

**Security Scheme:** `ClerkAuth`

### 2. API Key Authentication
System-to-system integration endpoints use API key authentication.

**Header:**
```
Authorization: Bearer <api_key>
```

**Valid API Keys:**
- `SJSFI_SIS_API_KEY` - Student Information System
- `SJSFI_LMS_API_KEY` - Learning Management System
- `SJSFI_HRMS_API_KEY` - HRMS internal

**Security Scheme:** `ApiKeyAuth`

### 3. HMAC Signature Verification
Integration endpoints require additional HMAC-SHA256 signature verification.

**Headers:**
```
Authorization: Bearer <api_key>
x-timestamp: <timestamp_in_milliseconds>
x-signature: <hmac_sha256_signature>
```

**Signature Calculation:**
```
HMAC-SHA256(body + timestamp, SHARED_SECRET)
```

### 4. Webhook Signature Verification
Webhook endpoints use Svix signature verification.

**Header:**
```
svix-signature: <signature>
```

**Security Scheme:** `SvixSignature`

### 5. Public Endpoints
Some endpoints are publicly accessible without authentication:
- `/api/vacancies/public`
- `/api/candidates/public`
- `/api/webhooks/clerk`
- `/api/ip`

## HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | Success | Successful GET, PATCH requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Invalid input parameters, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions, invalid signature |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | AI service temporarily unavailable |

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Example Error Responses

**400 Bad Request:**
```json
{
  "error": "Missing required field: FirstName",
  "details": "The FirstName field is required for employee creation"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Employee not found"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Too many requests",
  "details": "Rate limit exceeded. Please try again later."
}
```

## Rate Limiting

API endpoints are protected by rate limiting:

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

## Using the OpenAPI Specification

### Viewing the Documentation

1. **Swagger UI**: Import `docs/openapi.yaml` into [Swagger Editor](https://editor.swagger.io/) or [Swagger UI](https://swagger.io/tools/swagger-ui/)
2. **Postman**: Import the OpenAPI spec into Postman for API testing
3. **Code Generation**: Use tools like [OpenAPI Generator](https://openapi-generator.tech/) to generate client SDKs

### Example: Viewing in Swagger UI

1. Go to https://editor.swagger.io/
2. Click "File" → "Import file"
3. Select `docs/openapi.yaml`
4. View interactive API documentation

### Example: Using with Postman

1. Open Postman
2. Click "Import"
3. Select "File" → Choose `docs/openapi.yaml`
4. All endpoints will be imported with example requests

### Example: Generating Client SDK

```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o ./generated-client
```

## Key Endpoints Summary

### Employee Management
- `GET /employees` - List employees (paginated)
- `POST /employees` - Create employee
- `PATCH /employees` - Update employee
- `GET /employees/{employeeId}` - Get employee details
- `PATCH /employees/{employeeId}` - Update employee
- `DELETE /employees/{employeeId}` - Delete employee (soft delete)
- `GET /employees/export` - Export employees (CSV/XLSX)
- `POST /employees/import` - Import employees (CSV)

### Leave Management
- `GET /leaves` - List leave requests
- `POST /leaves` - Create leave request
- `GET /leaves/{id}` - Get leave request
- `PATCH /leaves/{id}` - Update leave request (approve/reject)
- `GET /leaves/faculty/{facultyId}` - Get faculty leave requests

### Recruitment
- `GET /vacancies` - List job vacancies
- `POST /vacancies` - Create vacancy
- `GET /vacancies/public` - Public job listings
- `GET /candidates` - List candidates
- `POST /candidates` - Create candidate
- `POST /candidates/public` - Public application submission

### Performance
- `GET /performance/reviews` - List performance reviews
- `POST /performance/reviews` - Create performance review
- `GET /performance/my-performance` - Get user's performance data

### Integration (XR)
- `POST /xr/user-access-lookup` - User access verification
- `GET /xr/faculty-availability/{employeeId}` - Check faculty availability
- `GET /xr/faculty-qualifications/{employeeId}` - Get faculty qualifications
- `GET /xr/faculty-workload/{employeeId}` - Get faculty workload
- `POST /xr/faculty-workload/validate` - Validate workload assignment

### Chat/AI
- `POST /chat` - Chat with AI assistant

## Data Models

The specification includes comprehensive data models (schemas) for:

- **Employee** - Complete employee profile with all related data
- **Leave** - Leave request with status and details
- **Vacancy** - Job vacancy information
- **Candidate** - Candidate application data
- **PerformanceReview** - Performance review with scores
- **Document** - Document metadata
- **FacultyAvailability** - Faculty availability status
- **FacultyQualifications** - Faculty credentials
- **FacultyWorkload** - Teaching load information
- And many more...

## Request/Response Examples

Each endpoint includes detailed request/response examples:

### Example: Create Employee

**Request:**
```json
{
  "FirstName": "John",
  "LastName": "Doe",
  "DateOfBirth": "1990-01-15",
  "Sex": "Male",
  "HireDate": "2024-01-15",
  "EmploymentStatus": "Regular",
  "Designation": "Faculty",
  "Position": "Teacher",
  "DepartmentID": 1,
  "Email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "EmployeeID": "2025-0001",
  "FirstName": "John",
  "LastName": "Doe",
  "EmploymentDetail": [...],
  "ContactInfo": [...],
  ...
}
```

### Example: Create Leave Request

**Request:**
```json
{
  "FacultyID": 1,
  "RequestType": "Leave",
  "LeaveType": "Sick",
  "StartDate": "2024-01-15",
  "EndDate": "2024-01-20",
  "Reason": "Medical appointment"
}
```

**Response:**
```json
{
  "LeaveID": 1,
  "FacultyID": 1,
  "Status": "Pending",
  "StartDate": "2024-01-15T00:00:00Z",
  "EndDate": "2024-01-20T00:00:00Z",
  ...
}
```

## Validation Rules

### Employee Creation
- **Required Fields:** FirstName, LastName, DateOfBirth, HireDate, Sex
- **EmploymentStatus:** Must be one of: Hired, Resigned, Regular, Probationary, Part_Time, Retired
- **Designation:** Must be one of: President, Admin_Officer, Vice_President, Registrar, Faculty, Principal, Cashier
- **Sex:** Must be one of: Male, Female, Intersex

### Leave Request
- **Required Fields:** FacultyID, LeaveType, StartDate, EndDate, Reason
- **Date Validation:** StartDate must be before or equal to EndDate
- **Leave Type Validation:** Must match active leave types in database
- **Gender-Specific Leaves:** Maternity (female only), Paternity (male only)

### Performance Review
- **Required Fields:** employeeId, startDate, endDate
- **Score Range:** 0-100 for kpiScore, behaviorScore, attendanceScore
- **Status:** Must be one of: draft, pending, completed, approved

## Integration Endpoints

### HMAC Signature Verification

For integration endpoints (`/xr/*`), requests must include:

1. **API Key** in Authorization header
2. **Timestamp** in `x-timestamp` header (milliseconds since epoch)
3. **Signature** in `x-signature` header (HMAC-SHA256)

**Signature Calculation:**
```javascript
const crypto = require('crypto');
const timestamp = Date.now().toString();
const body = JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(body + timestamp)
  .digest('hex');
```

**Request Headers:**
```
Authorization: Bearer <api_key>
x-timestamp: 1640000000000
x-signature: <calculated_signature>
Content-Type: application/json
```

**Timestamp Window:** ±5 minutes from current time

## Best Practices

1. **Error Handling**: Always check response status codes and handle errors appropriately
2. **Pagination**: Use pagination for large datasets
3. **Rate Limiting**: Implement exponential backoff when hitting rate limits
4. **Authentication**: Always include authentication headers
5. **File Uploads**: Use FormData for file uploads
6. **Date Formats**: Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)

## Support

For API support and questions:
- **Email:** support@example.com
- **Documentation:** See `docs/API_DOCUMENTATION.md` for detailed endpoint documentation
- **OpenAPI Spec:** `docs/openapi.yaml`

## Changelog

### Version 1.0.0 (2025-01-25)
- Initial OpenAPI 3.0.3 specification
- Complete endpoint coverage
- Request/response examples
- Error code documentation
- Authentication requirements
- Integration endpoint specifications

---

**Note:** This OpenAPI specification is maintained alongside the codebase. For the most up-to-date information, refer to the source code in `src/app/api/`.
