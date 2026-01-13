# Testing SIS Integration Endpoints

This guide shows you how to test the SIS integration endpoints locally and in production.

## Quick Start

### 1. **Test Locally (Development)**

If your HRMS is running locally:
- **Base URL**: `http://localhost:3000`
- **Endpoints**: All `/api/xr/*` endpoints

### 2. **Test in Production**

If your HRMS is deployed:
- **Base URL**: `https://your-hrms-domain.com`
- **Endpoints**: All `/api/xr/*` endpoints

---

## Required Environment Variables

Before testing, make sure you have these in your `.env.local`:

```env
SJSFI_SHARED_SECRET=your_shared_secret_here
SJSFI_SIS_API_KEY=your_sis_api_key_here
```

---

## Testing Methods

### Method 1: Using Node.js Test Script (Recommended)

Create a file `test-endpoints.js` in your project root:

```javascript
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// CONFIGURATION
const CONFIG = {
  BASE_URL: process.env.HRMS_BASE_URL || 'http://localhost:3000',
  API_KEY: process.env.SJSFI_SIS_API_KEY || 'your_api_key_here',
  SHARED_SECRET: process.env.SJSFI_SHARED_SECRET || 'your_shared_secret_here',
  TEST_EMAIL: 'test@school.edu', // Use an actual email from your database
  TEST_EMPLOYEE_ID: '2026-0001', // Use an actual employee ID from your database
};

// Helper: Generate signature
function generateSignature(body, timestamp, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body + timestamp);
  return hmac.digest('hex');
}

// Helper: Make GET request
async function testGet(endpoint) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  const timestamp = Date.now().toString();
  const body = '';
  const signature = generateSignature(body, timestamp, CONFIG.SHARED_SECRET);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
      'x-timestamp': timestamp,
      'x-signature': signature,
    },
  };

  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Helper: Make POST request
async function testPost(endpoint, bodyData) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  const timestamp = Date.now().toString();
  const body = JSON.stringify(bodyData);
  const signature = generateSignature(body, timestamp, CONFIG.SHARED_SECRET);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
      'x-timestamp': timestamp,
      'x-signature': signature,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Test functions
async function runTests() {
  console.log('🧪 Testing SIS Integration Endpoints\n');
  console.log(`Base URL: ${CONFIG.BASE_URL}\n`);

  // Test 1: User Access Lookup
  console.log('========================================');
  console.log('TEST 1: User Access Lookup');
  console.log('========================================');
  try {
    const result = await testPost('/api/xr/user-access-lookup', {
      email: CONFIG.TEST_EMAIL,
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  // Test 2: Section Assignments
  console.log('========================================');
  console.log('TEST 2: Section Assignments');
  console.log('========================================');
  try {
    const result = await testGet('/api/xr/section-assignments');
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  // Test 3: Faculty Availability
  console.log('========================================');
  console.log('TEST 3: Faculty Availability');
  console.log('========================================');
  try {
    const result = await testGet(`/api/xr/faculty-availability/${CONFIG.TEST_EMPLOYEE_ID}`);
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  // Test 4: Faculty Qualifications
  console.log('========================================');
  console.log('TEST 4: Faculty Qualifications');
  console.log('========================================');
  try {
    const result = await testGet(`/api/xr/faculty-qualifications/${CONFIG.TEST_EMPLOYEE_ID}`);
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  // Test 5: Faculty Workload
  console.log('========================================');
  console.log('TEST 5: Faculty Workload');
  console.log('========================================');
  try {
    const result = await testGet(`/api/xr/faculty-workload/${CONFIG.TEST_EMPLOYEE_ID}`);
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  // Test 6: Workload Validation
  console.log('========================================');
  console.log('TEST 6: Workload Validation');
  console.log('========================================');
  try {
    const result = await testPost('/api/xr/faculty-workload/validate', {
      employeeId: CONFIG.TEST_EMPLOYEE_ID,
      additionalHours: 3,
      additionalSections: 1,
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log(result.status === 200 ? '✅ SUCCESS\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message, '\n');
  }

  console.log('========================================');
  console.log('Testing Complete!');
  console.log('========================================');
}

// Run tests
runTests().catch(console.error);
```

**Run the test:**
```bash
node test-endpoints.js
```

---

### Method 2: Using cURL (Command Line)

#### Test User Access Lookup (POST)

```bash
# Windows PowerShell
$API_KEY = "your_api_key"
$SHARED_SECRET = "your_shared_secret"
$BASE_URL = "http://localhost:3000"
$EMAIL = "test@school.edu"

# Generate timestamp and signature using Node.js
node -e "
const crypto = require('crypto');
const body = JSON.stringify({email: '$EMAIL'});
const timestamp = Date.now().toString();
const signature = crypto.createHmac('sha256', '$SHARED_SECRET').update(body + timestamp).digest('hex');
console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
"

# Then use the generated values:
curl -X POST "$BASE_URL/api/xr/user-access-lookup" `
  -H "Authorization: Bearer $API_KEY" `
  -H "x-timestamp: GENERATED_TIMESTAMP" `
  -H "x-signature: GENERATED_SIGNATURE" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"$EMAIL\"}"
```

#### Test Section Assignments (GET)

```bash
# Generate signature
node -e "
const crypto = require('crypto');
const body = '';
const timestamp = Date.now().toString();
const signature = crypto.createHmac('sha256', '$SHARED_SECRET').update(body + timestamp).digest('hex');
console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
"

# Make request
curl -X GET "$BASE_URL/api/xr/section-assignments" `
  -H "Authorization: Bearer $API_KEY" `
  -H "x-timestamp: GENERATED_TIMESTAMP" `
  -H "x-signature: GENERATED_SIGNATURE"
```

#### Test Faculty Availability (GET)

```bash
$EMPLOYEE_ID = "2026-0001"

# Generate signature
node -e "
const crypto = require('crypto');
const body = '';
const timestamp = Date.now().toString();
const signature = crypto.createHmac('sha256', '$SHARED_SECRET').update(body + timestamp).digest('hex');
console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
"

# Make request
curl -X GET "$BASE_URL/api/xr/faculty-availability/$EMPLOYEE_ID" `
  -H "Authorization: Bearer $API_KEY" `
  -H "x-timestamp: GENERATED_TIMESTAMP" `
  -H "x-signature: GENERATED_SIGNATURE"
```

---

### Method 3: Using Postman

1. **Create a new request**
2. **Set the URL**: `http://localhost:3000/api/xr/section-assignments`
3. **Set Method**: GET or POST (depending on endpoint)
4. **Add Headers**:
   - `Authorization`: `Bearer YOUR_API_KEY`
   - `x-timestamp`: `1704892800000` (use current timestamp in milliseconds)
   - `x-signature`: `GENERATED_SIGNATURE` (see below)
   - `Content-Type`: `application/json` (for POST requests)

5. **Generate Signature** (use Pre-request Script in Postman):

```javascript
// Postman Pre-request Script
const crypto = require('crypto-js');

// Get environment variables
const sharedSecret = pm.environment.get('SHARED_SECRET');
const timestamp = Date.now().toString();
pm.environment.set('timestamp', timestamp);

// For GET requests
const body = '';

// For POST requests, use the request body
// const body = JSON.stringify(pm.request.body.raw);

const message = body + timestamp;
const signature = crypto.HmacSHA256(message, sharedSecret).toString();

pm.environment.set('signature', signature);
```

6. **Set Headers** (use variables):
   - `x-timestamp`: `{{timestamp}}`
   - `x-signature`: `{{signature}}`

---

### Method 4: Using Browser (for GET endpoints only)

You can test GET endpoints directly in the browser, but you'll need to generate the signature first:

1. **Open browser console** (F12)
2. **Run this code**:

```javascript
// Generate signature
const crypto = require('crypto'); // Node.js only - use browser alternative
// OR use this in browser console:
async function testEndpoint() {
  const API_KEY = 'your_api_key';
  const SHARED_SECRET = 'your_shared_secret';
  const BASE_URL = 'http://localhost:3000';
  const endpoint = '/api/xr/section-assignments';
  
  const timestamp = Date.now().toString();
  const body = '';
  
  // Generate signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SHARED_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body + timestamp)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Make request
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-timestamp': timestamp,
      'x-signature': signatureHex,
    },
  });
  
  const data = await response.json();
  console.log('Response:', data);
}

testEndpoint();
```

---

## Testing Checklist

### ✅ Before Testing

- [ ] HRMS server is running (`npm run dev`)
- [ ] Environment variables are set (`.env.local`)
- [ ] You have valid API key and shared secret
- [ ] You have test data (employee ID, email) in your database

### ✅ Test Each Endpoint

- [ ] **User Access Lookup** - `/api/xr/user-access-lookup` (POST)
- [ ] **Section Assignments** - `/api/xr/section-assignments` (GET)
- [ ] **Faculty Availability** - `/api/xr/faculty-availability/[employeeId]` (GET)
- [ ] **Faculty Qualifications** - `/api/xr/faculty-qualifications/[employeeId]` (GET)
- [ ] **Faculty Workload** - `/api/xr/faculty-workload/[employeeId]` (GET)
- [ ] **Workload Validation** - `/api/xr/faculty-workload/validate` (POST)

### ✅ Verify Responses

- [ ] Status code is `200 OK`
- [ ] Response contains expected data structure
- [ ] No authentication errors (`401`, `403`)
- [ ] No validation errors (`400`)

---

## Common Issues & Solutions

### Issue: `401 Unauthorized`
**Solution**: Check that your API key is correct and matches `SJSFI_SIS_API_KEY` in environment variables.

### Issue: `403 Invalid signature`
**Solution**: 
- Verify shared secret matches
- Check timestamp is within ±5 minutes
- Ensure signature is generated correctly: `HMAC-SHA256(body + timestamp, secret)`

### Issue: `400 Invalid timestamp`
**Solution**: 
- Use current timestamp in milliseconds
- Ensure server clock is synchronized
- Timestamp must be within ±5 minutes of server time

### Issue: `404 Not found`
**Solution**: 
- Check endpoint URL is correct
- Verify employee ID/email exists in database
- Check middleware allows the route

### Issue: `429 Too many requests`
**Solution**: 
- Rate limit is 100 requests per minute per IP
- Wait a minute before retrying
- Use different IP if testing multiple times

---

## Quick Test URLs

Once your server is running, you can quickly verify endpoints are accessible:

### Local Development
- User Access Lookup: `http://localhost:3000/api/xr/user-access-lookup`
- Section Assignments: `http://localhost:3000/api/xr/section-assignments`
- Faculty Availability: `http://localhost:3000/api/xr/faculty-availability/2026-0001`

### Production
- Replace `localhost:3000` with your production domain

**Note**: These URLs will return `401 Unauthorized` without proper authentication headers, but this confirms the endpoint exists.

---

## Next Steps

1. **Test locally** using the Node.js script
2. **Verify responses** match expected format
3. **Test with real data** from your database
4. **Share endpoints** with SIS team for integration
5. **Monitor logs** for any errors during testing

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are loaded
3. Test with Postman to isolate issues
4. Contact the development team for assistance
