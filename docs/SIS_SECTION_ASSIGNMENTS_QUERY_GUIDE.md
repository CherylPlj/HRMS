# SIS Section Assignments API - Query Guide

## Endpoint

```
GET {HRMS_BASE_URL}/api/xr/section-assignments
```

## Authentication

**Required Headers:**
```
Authorization: Bearer {SJSFI_SIS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

## Signature Generation (for GET requests)

For GET requests, the body is an **empty string**. The signature is calculated as:

```
message = '' + timestamp
signature = HMAC-SHA256(message, SJSFI_SHARED_SECRET)
```

### Example Code (Node.js)

```javascript
const crypto = require('crypto');

const SHARED_SECRET = 'your_shared_secret';
const API_KEY = 'your_sis_api_key';
const BASE_URL = 'https://your-hrms-domain.com';

// For GET requests, body is empty string
const body = '';
const timestamp = Date.now().toString();

// Generate signature
const message = body + timestamp;
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(message)
  .digest('hex');

// Make request
const response = await fetch(`${BASE_URL}/api/xr/section-assignments`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'x-timestamp': timestamp,
    'x-signature': signature,
  },
});

const data = await response.json();
console.log(data);
```

## Query Parameters (All Optional)

You can filter results using query parameters:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `sectionId` | number | `1` | Filter by specific section ID |
| `gradeLevel` | string | `7` | Filter by grade level |
| `schoolYear` | string | `2024-2025` | Filter by school year |

## Example Queries

### 1. Get All Section Assignments

```
GET /api/xr/section-assignments
```

**Full URL:**
```
https://your-hrms-domain.com/api/xr/section-assignments
```

### 2. Filter by Grade Level

```
GET /api/xr/section-assignments?gradeLevel=7
```

**Full URL:**
```
https://your-hrms-domain.com/api/xr/section-assignments?gradeLevel=7
```

### 3. Filter by School Year

```
GET /api/xr/section-assignments?schoolYear=2024-2025
```

**Full URL:**
```
https://your-hrms-domain.com/api/xr/section-assignments?schoolYear=2024-2025
```

### 4. Filter by Grade Level and School Year

```
GET /api/xr/section-assignments?gradeLevel=7&schoolYear=2024-2025
```

**Full URL:**
```
https://your-hrms-domain.com/api/xr/section-assignments?gradeLevel=7&schoolYear=2024-2025
```

### 5. Get Specific Section

```
GET /api/xr/section-assignments?sectionId=1
```

**Full URL:**
```
https://your-hrms-domain.com/api/xr/section-assignments?sectionId=1
```

## Complete Example (cURL)

```bash
# Set variables
API_KEY="your_sis_api_key"
SHARED_SECRET="your_shared_secret"
BASE_URL="https://your-hrms-domain.com"

# Generate timestamp
TIMESTAMP=$(date +%s%3N)  # Linux/Mac
# Or for Windows PowerShell:
# $TIMESTAMP = [DateTimeOffset]::Now.ToUnixTimeMilliseconds().ToString()

# For GET requests, body is empty
BODY=""

# Generate signature (Linux/Mac)
SIGNATURE=$(echo -n "${BODY}${TIMESTAMP}" | openssl dgst -sha256 -hmac "${SHARED_SECRET}" | cut -d' ' -f2)

# Make request
curl -X GET "${BASE_URL}/api/xr/section-assignments" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-timestamp: ${TIMESTAMP}" \
  -H "x-signature: ${SIGNATURE}"
```

## Complete Example (PHP)

```php
<?php
$apiKey = 'your_sis_api_key';
$sharedSecret = 'your_shared_secret';
$baseUrl = 'https://your-hrms-domain.com';

// Generate timestamp (milliseconds)
$timestamp = round(microtime(true) * 1000);

// For GET requests, body is empty string
$body = '';

// Generate signature
$message = $body . $timestamp;
$signature = hash_hmac('sha256', $message, $sharedSecret);

// Make request
$url = $baseUrl . '/api/xr/section-assignments';
$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'x-timestamp: ' . $timestamp,
    'x-signature: ' . $signature,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
echo json_encode($data, JSON_PRETTY_PRINT);
?>
```

## Complete Example (Python)

```python
import hmac
import hashlib
import time
import requests

api_key = 'your_sis_api_key'
shared_secret = 'your_shared_secret'
base_url = 'https://your-hrms-domain.com'

# Generate timestamp (milliseconds)
timestamp = str(int(time.time() * 1000))

# For GET requests, body is empty string
body = ''

# Generate signature
message = body + timestamp
signature = hmac.new(
    shared_secret.encode(),
    message.encode(),
    hashlib.sha256
).hexdigest()

# Make request
headers = {
    'Authorization': f'Bearer {api_key}',
    'x-timestamp': timestamp,
    'x-signature': signature,
}

response = requests.get(f'{base_url}/api/xr/section-assignments', headers=headers)
data = response.json()
print(data)
```

## Expected Response

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 1,
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
      "homeroomTeacher": null,
      "sectionHead": null
    }
  ]
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Invalid signature:**
```json
{
  "error": "Invalid signature"
}
```

**400 Invalid request:**
```json
{
  "error": "Invalid request"
}
```

**429 Too many requests:**
```json
{
  "error": "Too many requests"
}
```

## Important Notes

1. **For GET requests**: Body is always an **empty string** (`''`) for signature generation
2. **Timestamp**: Must be in milliseconds (Unix timestamp × 1000)
3. **Timestamp window**: Must be within ±5 minutes of server time
4. **Rate limit**: 100 requests per minute per IP address
5. **Query parameters**: All are optional - if none provided, returns all sections

## Common Mistakes

❌ **Wrong**: Using request body for GET signature
```javascript
// WRONG - Don't use request body for GET
const body = JSON.stringify({ sectionId: 1 });
```

✅ **Correct**: Empty string for GET requests
```javascript
// CORRECT - Empty string for GET
const body = '';
```

❌ **Wrong**: Using seconds instead of milliseconds for timestamp
```javascript
// WRONG
const timestamp = Math.floor(Date.now() / 1000).toString();
```

✅ **Correct**: Milliseconds for timestamp
```javascript
// CORRECT
const timestamp = Date.now().toString();
```

❌ **Wrong**: Including query parameters in signature
```javascript
// WRONG - Query params are NOT part of the signature
const body = '?gradeLevel=7';
```

✅ **Correct**: Query params are in URL, not in signature body
```javascript
// CORRECT - Body is empty, query params go in URL
const body = '';
const url = `${baseUrl}/api/xr/section-assignments?gradeLevel=7`;
```

## Testing Checklist

- [ ] API key is correct (`SJSFI_SIS_API_KEY`)
- [ ] Shared secret is correct (`SJSFI_SHARED_SECRET`)
- [ ] Timestamp is in milliseconds
- [ ] Body is empty string for GET requests
- [ ] Signature is generated correctly: `HMAC-SHA256('' + timestamp, secret)`
- [ ] Headers are set correctly
- [ ] Base URL is correct (include `https://`)
