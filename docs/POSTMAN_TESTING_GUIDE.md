# Testing SIS Endpoints in Postman (Deployed/Production)

This guide shows you how to test the SIS integration endpoints in Postman for your deployed HRMS application.

## Prerequisites

1. **Postman installed** (download from [postman.com](https://www.postman.com/downloads/))
2. **Your deployed HRMS URL** (e.g., `https://hrms.yourschool.edu`)
3. **API credentials**:
   - `SJSFI_SIS_API_KEY` - Your SIS API key
   - `SJSFI_SHARED_SECRET` - Your shared secret

---

## Step 1: Set Up Postman Environment

1. **Open Postman**
2. **Click "Environments"** in the left sidebar (or press `Ctrl+E`)
3. **Click "+" to create a new environment**
4. **Name it**: "HRMS Production" (or "HRMS Deployed")
5. **Add these variables**:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `https://your-hrms-domain.com` | `https://your-hrms-domain.com` |
| `api_key` | `your_sis_api_key_here` | `your_sis_api_key_here` |
| `shared_secret` | `your_shared_secret_here` | `your_shared_secret_here` |
| `test_email` | `test@school.edu` | `test@school.edu` |
| `test_employee_id` | `2026-0001` | `2026-0001` |
| `timestamp` | (leave empty) | (leave empty) |
| `signature` | (leave empty) | (leave empty) |

6. **Click "Save"**
7. **Select your environment** from the dropdown in the top-right corner

---

## Step 2: Set Up Pre-request Script (Auto-generate Signature)

This script will automatically generate the timestamp and signature for each request.

1. **Click "..." (three dots) next to your environment**
2. **Select "Edit"**
3. **Go to the "Tests" tab** (or create a new request and add this to its Pre-request Script)
4. **Add this script**:

```javascript
// Pre-request Script for HMAC-SHA256 Signature Generation
// This runs before every request

// Get environment variables
const sharedSecret = pm.environment.get("shared_secret");
const timestamp = Date.now().toString();

// Store timestamp in environment
pm.environment.set("timestamp", timestamp);

// Get request body (for POST requests)
let body = '';
if (pm.request.body && pm.request.body.raw) {
    body = pm.request.body.raw;
} else {
    // For GET requests, body is empty string
    body = '';
}

// Generate HMAC-SHA256 signature
const message = body + timestamp;
const signature = CryptoJS.HmacSHA256(message, sharedSecret).toString();

// Store signature in environment
pm.environment.set("signature", signature);

// Log for debugging (optional)
console.log("Timestamp:", timestamp);
console.log("Body:", body);
console.log("Signature:", signature);
```

**Note**: If you get an error about `CryptoJS`, you need to install it:
- In Postman, go to **Settings** → **General** → Enable **"Require variable values"** (optional)
- Or use the built-in crypto (see alternative script below)

### Alternative Script (Using Built-in Crypto)

If CryptoJS doesn't work, use this Node.js-compatible version:

```javascript
// Alternative Pre-request Script (if CryptoJS not available)
const sharedSecret = pm.environment.get("shared_secret");
const timestamp = Date.now().toString();
pm.environment.set("timestamp", timestamp);

let body = '';
if (pm.request.body && pm.request.body.raw) {
    body = pm.request.body.raw;
} else {
    body = '';
}

// Use Postman's built-in crypto
const message = body + timestamp;
const signature = CryptoJS.HmacSHA256(message, sharedSecret).toString();
pm.environment.set("signature", signature);

console.log("Generated timestamp:", timestamp);
console.log("Generated signature:", signature);
```

---

## Step 3: Create Request Collection

1. **Click "Collections"** in the left sidebar
2. **Click "+" to create a new collection**
3. **Name it**: "SIS Integration Tests"
4. **Right-click the collection** → **Edit**
5. **Go to "Pre-request Script" tab**
6. **Paste the signature generation script** (from Step 2)
7. **Click "Save"**

This will apply the script to all requests in the collection.

---

## Step 4: Create Test Requests

### Request 1: User Access Lookup (POST)

1. **Right-click your collection** → **Add Request**
2. **Name**: "User Access Lookup"
3. **Method**: `POST`
4. **URL**: `{{base_url}}/api/xr/user-access-lookup`
5. **Headers**:
   - `Authorization`: `Bearer {{api_key}}`
   - `x-timestamp`: `{{timestamp}}`
   - `x-signature`: `{{signature}}`
   - `Content-Type`: `application/json`
6. **Body** (select "raw" and "JSON"):
   ```json
   {
     "email": "{{test_email}}"
   }
   ```
7. **Click "Save"**

### Request 2: Section Assignments (GET)

1. **Add Request** → Name: "Section Assignments"
2. **Method**: `GET`
3. **URL**: `{{base_url}}/api/xr/section-assignments`
4. **Headers**:
   - `Authorization`: `Bearer {{api_key}}`
   - `x-timestamp`: `{{timestamp}}`
   - `x-signature`: `{{signature}}`
5. **Body**: None (GET request)
6. **Click "Save"`

### Request 3: Section Assignments with Filters (GET)

1. **Add Request** → Name: "Section Assignments (Filtered)"
2. **Method**: `GET`
3. **URL**: `{{base_url}}/api/xr/section-assignments?gradeLevel=7&schoolYear=2024-2025`
4. **Headers**: Same as Request 2
5. **Click "Save"**

### Request 4: Faculty Availability (GET)

1. **Add Request** → Name: "Faculty Availability"
2. **Method**: `GET`
3. **URL**: `{{base_url}}/api/xr/faculty-availability/{{test_employee_id}}`
4. **Headers**:
   - `Authorization`: `Bearer {{api_key}}`
   - `x-timestamp`: `{{timestamp}}`
   - `x-signature`: `{{signature}}`
5. **Click "Save"`

### Request 5: Faculty Qualifications (GET)

1. **Add Request** → Name: "Faculty Qualifications"
2. **Method**: `GET`
3. **URL**: `{{base_url}}/api/xr/faculty-qualifications/{{test_employee_id}}`
4. **Headers**: Same as Request 4
5. **Click "Save"`

### Request 6: Faculty Workload (GET)

1. **Add Request** → Name: "Faculty Workload"
2. **Method**: `GET`
3. **URL**: `{{base_url}}/api/xr/faculty-workload/{{test_employee_id}}`
4. **Headers**: Same as Request 4
5. **Click "Save"`

### Request 7: Workload Validation (POST)

1. **Add Request** → Name: "Workload Validation"
2. **Method**: `POST`
3. **URL**: `{{base_url}}/api/xr/faculty-workload/validate`
4. **Headers**:
   - `Authorization`: `Bearer {{api_key}}`
   - `x-timestamp`: `{{timestamp}}`
   - `x-signature`: `{{signature}}`
   - `Content-Type`: `application/json`
5. **Body** (raw JSON):
   ```json
   {
     "employeeId": "{{test_employee_id}}",
     "additionalHours": 3,
     "additionalSections": 1,
     "day": "Monday",
     "time": "10:00-11:30",
     "duration": 1.5
   }
   ```
6. **Click "Save"**

---

## Step 5: Run the Tests

### Option A: Run Individual Requests

1. **Select a request** from your collection
2. **Make sure your environment is selected** (top-right dropdown)
3. **Click "Send"**
4. **Check the response**:
   - Status should be `200 OK`
   - Response body should contain data

### Option B: Run All Tests (Collection Runner)

1. **Right-click your collection** → **Run collection**
2. **Select your environment** from the dropdown
3. **Click "Run SIS Integration Tests"**
4. **View results**:
   - Green checkmarks = Success
   - Red X = Failed
   - Check the response for error details

---

## Step 6: Verify Responses

### Expected Response Formats

#### ✅ Success Response (200 OK)

**User Access Lookup:**
```json
{
  "Email": "test@school.edu",
  "Role": ["Faculty", "Department Head"]
}
```

**Section Assignments:**
```json
{
  "success": true,
  "count": 10,
  "assignments": [
    {
      "sectionId": 1,
      "sectionName": "Grade 7-A",
      "adviser": { ... },
      "homeroomTeacher": { ... }
    }
  ]
}
```

**Faculty Availability:**
```json
{
  "status": "success",
  "data": {
    "isAvailable": true,
    "availability": {
      "status": "Available",
      "reason": "Faculty is available"
    }
  }
}
```

### ❌ Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```
→ Check your API key

**403 Invalid signature:**
```json
{
  "error": "Invalid signature"
}
```
→ Check shared secret and signature generation

**400 Invalid timestamp:**
```json
{
  "error": "Invalid request"
}
```
→ Timestamp might be outside ±5 minute window

**404 Not found:**
```json
{
  "error": "Not found"
}
```
→ Employee ID or email doesn't exist in database

---

## Troubleshooting

### Issue: "CryptoJS is not defined"

**Solution**: Use the alternative script (see Step 2) or:
1. Go to **Settings** → **General**
2. Enable **"Require variable values"**
3. Or use Postman's built-in crypto functions

### Issue: Signature doesn't match

**Solution**:
1. Check that `shared_secret` in environment matches your server
2. Verify the request body is exactly as sent (no extra spaces)
3. Check timestamp is current (within ±5 minutes)
4. For GET requests, body should be empty string `''`
5. For POST requests, body should be the exact JSON string

### Issue: 401 Unauthorized

**Solution**:
1. Verify `api_key` in environment matches `SJSFI_SIS_API_KEY` on server
2. Check Authorization header format: `Bearer {{api_key}}`
3. Ensure API key is not expired or revoked

### Issue: Can't connect to server

**Solution**:
1. Verify `base_url` is correct (include `https://`)
2. Check if server is running and accessible
3. Verify no firewall blocking the connection
4. Try accessing the URL in a browser first

---

## Quick Test Checklist

Before running tests, verify:

- [ ] Environment variables are set correctly
- [ ] Base URL points to your deployed server
- [ ] API key and shared secret are correct
- [ ] Test email/employee ID exist in your database
- [ ] Pre-request script is added to collection
- [ ] Environment is selected (top-right dropdown)

---

## Example: Complete Request Setup

Here's a complete example for "Section Assignments" request:

**Request Tab:**
- Method: `GET`
- URL: `{{base_url}}/api/xr/section-assignments`
- Headers:
  ```
  Authorization: Bearer {{api_key}}
  x-timestamp: {{timestamp}}
  x-signature: {{signature}}
  ```

**Pre-request Script Tab:**
```javascript
const sharedSecret = pm.environment.get("shared_secret");
const timestamp = Date.now().toString();
pm.environment.set("timestamp", timestamp);
const body = '';
const message = body + timestamp;
const signature = CryptoJS.HmacSHA256(message, sharedSecret).toString();
pm.environment.set("signature", signature);
```

**Tests Tab** (optional - for validation):
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});
```

---

## Export/Import Collection

### Export Collection (Share with Team)

1. **Right-click collection** → **Export**
2. **Select "Collection v2.1"**
3. **Save the JSON file**
4. **Share with your team**

### Import Collection

1. **Click "Import"** (top-left)
2. **Select the JSON file**
3. **Click "Import"**

**Note**: Environment variables are NOT exported. Share them separately (securely).

---

## Security Best Practices

1. **Never commit** environment variables to version control
2. **Use different API keys** for development and production
3. **Rotate secrets** periodically
4. **Don't share** Postman collections with real credentials
5. **Use Postman's** environment variable encryption

---

## Next Steps

1. ✅ Test all endpoints individually
2. ✅ Verify responses match expected format
3. ✅ Test with different employee IDs/emails
4. ✅ Test error cases (invalid IDs, etc.)
5. ✅ Share collection with SIS team (without credentials)

---

## Support

If you encounter issues:
1. Check Postman Console (View → Show Postman Console) for detailed logs
2. Verify server logs for incoming requests
3. Test with cURL to compare results
4. Contact the development team for assistance
