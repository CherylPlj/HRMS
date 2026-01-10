# Quick Testing Script for SIS Integration APIs

## Test Script (Node.js)

Save this as `test-sis-integration.js`:

```javascript
const crypto = require('crypto');
const axios = require('axios');

// CONFIGURATION - Update these values
const CONFIG = {
  API_KEY: process.env.HRMS_API_KEY || 'YOUR_API_KEY_HERE',
  SHARED_SECRET: process.env.HRMS_SHARED_SECRET || 'YOUR_SHARED_SECRET_HERE',
  BASE_URL: process.env.HRMS_BASE_URL || 'http://localhost:3000',
  TEST_EMPLOYEE_ID: '2026-0001', // Change to an actual employee ID in your system
};

// Helper function to generate signature
function generateSignature(body, timestamp, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body + timestamp)
    .digest('hex');
}

// Helper function to make authenticated GET request
async function authenticatedGet(url) {
  const timestamp = Date.now().toString();
  const body = '';
  const signature = generateSignature(body, timestamp, CONFIG.SHARED_SECRET);

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Helper function to make authenticated POST request
async function authenticatedPost(url, bodyData) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(bodyData);
  const signature = generateSignature(body, timestamp, CONFIG.SHARED_SECRET);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'Content-Type': 'application/json',
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Test 1: Faculty Availability
async function testFacultyAvailability() {
  console.log('\n========================================');
  console.log('TEST 1: Faculty Availability API');
  console.log('========================================');

  const url = `${CONFIG.BASE_URL}/api/xr/faculty-availability/${CONFIG.TEST_EMPLOYEE_ID}`;
  console.log(`Testing: ${url}`);

  const result = await authenticatedGet(url);

  if (result.success) {
    console.log('✅ SUCCESS');
    console.log(`Faculty: ${result.data.name}`);
    console.log(`Available: ${result.data.isAvailable ? 'YES' : 'NO'}`);
    console.log(`Status: ${result.data.availability.status}`);
    if (result.data.currentLeave) {
      console.log(`Current Leave: ${result.data.currentLeave.type} (${result.data.currentLeave.startDate} to ${result.data.currentLeave.endDate})`);
    }
    console.log(`Employment: ${result.data.employmentStatus} - ${result.data.employeeType}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Status: ${result.status}`);
    console.log(`Error:`, result.error);
  }

  return result.success;
}

// Test 2: Faculty Qualifications
async function testFacultyQualifications() {
  console.log('\n========================================');
  console.log('TEST 2: Faculty Qualifications API');
  console.log('========================================');

  const url = `${CONFIG.BASE_URL}/api/xr/faculty-qualifications/${CONFIG.TEST_EMPLOYEE_ID}`;
  console.log(`Testing: ${url}`);

  const result = await authenticatedGet(url);

  if (result.success) {
    console.log('✅ SUCCESS');
    console.log(`Faculty: ${result.data.name}`);
    console.log(`Position: ${result.data.position}`);
    console.log(`Highest Education: ${result.data.highestEducation?.level || 'N/A'} - ${result.data.highestEducation?.course || 'N/A'}`);
    console.log(`PRC License: ${result.data.licenses.prc.status}`);
    console.log(`Years of Experience: ${result.data.experience.yearsOfTeaching}`);
    console.log(`Certifications: ${result.data.qualificationSummary.numberOfCertifications}`);
    console.log(`Trainings: ${result.data.qualificationSummary.numberOfTrainings}`);
    console.log(`Qualified: ${result.data.qualificationSummary.isQualified ? 'YES' : 'NO'}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Status: ${result.status}`);
    console.log(`Error:`, result.error);
  }

  return result.success;
}

// Test 3: Faculty Workload
async function testFacultyWorkload() {
  console.log('\n========================================');
  console.log('TEST 3: Faculty Workload API');
  console.log('========================================');

  const url = `${CONFIG.BASE_URL}/api/xr/faculty-workload/${CONFIG.TEST_EMPLOYEE_ID}`;
  console.log(`Testing: ${url}`);

  const result = await authenticatedGet(url);

  if (result.success) {
    console.log('✅ SUCCESS');
    console.log(`Faculty: ${result.data.name}`);
    console.log(`Current Sections: ${result.data.workload.totalSections}`);
    console.log(`Total Hours/Week: ${result.data.workload.totalHoursPerWeek}`);
    console.log(`Max Hours: ${result.data.workload.maxHoursPerWeek}`);
    console.log(`Workload: ${result.data.workload.workloadPercentage}% (${result.data.workload.status})`);
    console.log(`Can Take More: ${result.data.workload.canTakeMoreSections ? 'YES' : 'NO'}`);
    console.log(`Available Hours: ${result.data.workload.availableHours}`);
    if (result.data.recommendations.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${result.data.recommendations.warnings.join(', ')}`);
    }
  } else {
    console.log('❌ FAILED');
    console.log(`Status: ${result.status}`);
    console.log(`Error:`, result.error);
  }

  return result.success;
}

// Test 4: Workload Validation
async function testWorkloadValidation() {
  console.log('\n========================================');
  console.log('TEST 4: Workload Validation API');
  console.log('========================================');

  const url = `${CONFIG.BASE_URL}/api/xr/faculty-workload/validate`;
  console.log(`Testing: ${url}`);

  const testData = {
    employeeId: CONFIG.TEST_EMPLOYEE_ID,
    additionalHours: 3,
    additionalSections: 1,
    day: 'Monday',
    time: '14:00-15:00',
    duration: 1,
  };

  console.log('Test Data:', testData);

  const result = await authenticatedPost(url, testData);

  if (result.success) {
    console.log('✅ SUCCESS');
    console.log(`Can Assign: ${result.data.canAssign ? 'YES' : 'NO'}`);
    console.log(`Reason: ${result.data.reason}`);
    console.log(`Current: ${result.data.currentWorkload.sections} sections, ${result.data.currentWorkload.hoursPerWeek} hours`);
    console.log(`Proposed: ${result.data.proposedWorkload.sections} sections, ${result.data.proposedWorkload.hoursPerWeek} hours`);
    console.log(`Remaining: ${result.data.availability.remainingSections} sections, ${result.data.availability.remainingHours} hours`);
    if (result.data.conflicts.length > 0) {
      console.log(`⚠️  Schedule Conflicts:`);
      result.data.conflicts.forEach(conflict => {
        console.log(`   - ${conflict.day} ${conflict.time}: ${conflict.subject} (${conflict.section})`);
      });
    }
  } else {
    console.log('❌ FAILED');
    console.log(`Status: ${result.status}`);
    console.log(`Error:`, result.error);
  }

  return result.success;
}

// Run all tests
async function runAllTests() {
  console.log('========================================');
  console.log('SIS-HRMS INTEGRATION API TESTS');
  console.log('========================================');
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`Test Employee ID: ${CONFIG.TEST_EMPLOYEE_ID}`);
  console.log(`API Key: ${CONFIG.API_KEY ? '[SET]' : '[NOT SET]'}`);
  console.log(`Shared Secret: ${CONFIG.SHARED_SECRET ? '[SET]' : '[NOT SET]'}`);

  const results = {
    availability: await testFacultyAvailability(),
    qualifications: await testFacultyQualifications(),
    workload: await testFacultyWorkload(),
    validation: await testWorkloadValidation(),
  };

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Faculty Availability: ${results.availability ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Faculty Qualifications: ${results.qualifications ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Faculty Workload: ${results.workload ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Workload Validation: ${results.validation ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.values(results).length;

  console.log('\n========================================');
  console.log(`OVERALL: ${passCount}/${totalCount} tests passed`);
  console.log('========================================\n');

  process.exit(passCount === totalCount ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
```

## How to Run Tests

### 1. Install Dependencies
```bash
npm install axios
```

### 2. Set Environment Variables
```bash
# Linux/Mac
export HRMS_API_KEY="your_api_key"
export HRMS_SHARED_SECRET="your_shared_secret"
export HRMS_BASE_URL="http://localhost:3000"

# Windows PowerShell
$env:HRMS_API_KEY="your_api_key"
$env:HRMS_SHARED_SECRET="your_shared_secret"
$env:HRMS_BASE_URL="http://localhost:3000"
```

### 3. Run Tests
```bash
node test-sis-integration.js
```

## Expected Output

```
========================================
SIS-HRMS INTEGRATION API TESTS
========================================
Base URL: http://localhost:3000
Test Employee ID: 2026-0001
API Key: [SET]
Shared Secret: [SET]

========================================
TEST 1: Faculty Availability API
========================================
Testing: http://localhost:3000/api/xr/faculty-availability/2026-0001
✅ SUCCESS
Faculty: Juan Dela Cruz
Available: YES
Status: Available
Employment: Regular - Regular

========================================
TEST 2: Faculty Qualifications API
========================================
Testing: http://localhost:3000/api/xr/faculty-qualifications/2026-0001
✅ SUCCESS
Faculty: Juan Dela Cruz
Position: Teacher III
Highest Education: Master's Degree - Mathematics Education
PRC License: Valid
Years of Experience: 8
Certifications: 3
Trainings: 5
Qualified: YES

========================================
TEST 3: Faculty Workload API
========================================
Testing: http://localhost:3000/api/xr/faculty-workload/2026-0001
✅ SUCCESS
Faculty: Juan Dela Cruz
Current Sections: 6
Total Hours/Week: 24
Max Hours: 40
Workload: 60% (Moderate Load)
Can Take More: YES
Available Hours: 16

========================================
TEST 4: Workload Validation API
========================================
Testing: http://localhost:3000/api/xr/faculty-workload/validate
✅ SUCCESS
Can Assign: YES
Reason: Faculty can take additional workload
Current: 6 sections, 24 hours
Proposed: 7 sections, 28 hours
Remaining: 3 sections, 12 hours

========================================
TEST SUMMARY
========================================
Faculty Availability: ✅ PASS
Faculty Qualifications: ✅ PASS
Faculty Workload: ✅ PASS
Workload Validation: ✅ PASS

========================================
OVERALL: 4/4 tests passed
========================================
```

## Manual Testing with cURL (Windows PowerShell)

### Test 1: Faculty Availability
```powershell
$API_KEY = "your_api_key"
$SHARED_SECRET = "your_shared_secret"
$BASE_URL = "http://localhost:3000"
$EMPLOYEE_ID = "2026-0001"

$timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds().ToString()
$body = ""
$hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($SHARED_SECRET))
$signature = [BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body + $timestamp))).Replace("-","").ToLower()

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "x-timestamp" = $timestamp
    "x-signature" = $signature
}

Invoke-RestMethod -Uri "$BASE_URL/api/xr/faculty-availability/$EMPLOYEE_ID" -Method GET -Headers $headers
```

### Test 2: Workload Validation
```powershell
$timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds().ToString()
$bodyData = @{
    employeeId = "2026-0001"
    additionalHours = 3
    additionalSections = 1
    day = "Monday"
    time = "14:00-15:00"
    duration = 1
} | ConvertTo-Json

$hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($SHARED_SECRET))
$signature = [BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($bodyData + $timestamp))).Replace("-","").ToLower()

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "x-timestamp" = $timestamp
    "x-signature" = $signature
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "$BASE_URL/api/xr/faculty-workload/validate" -Method POST -Headers $headers -Body $bodyData
```

## Integration Checklist

- [ ] Get API credentials from HRMS team
- [ ] Test connectivity to HRMS API
- [ ] Run all 4 test endpoints successfully
- [ ] Implement error handling in SIS
- [ ] Add caching for frequently accessed data
- [ ] Set up monitoring/logging for API calls
- [ ] Create integration documentation for SIS team
- [ ] Schedule go-live date
- [ ] Plan rollback procedure if needed

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure HRMS server is running
   - Check firewall rules
   - Verify BASE_URL is correct

2. **401 Unauthorized**
   - Check API key is correct
   - Verify API key is active in HRMS

3. **403 Invalid Signature**
   - Ensure timestamp is within 5-minute window
   - Check shared secret is correct
   - Verify body content matches exactly

4. **404 Not Found**
   - Check employee ID exists in HRMS
   - Verify employee is not deleted
   - Ensure faculty record exists (for workload APIs)

5. **429 Rate Limit**
   - Wait 60 seconds before retrying
   - Implement exponential backoff
   - Cache responses when possible

## Support

For issues:
1. Check logs in HRMS (look for `[Faculty Availability API]`, `[Faculty Qualifications API]`, etc.)
2. Verify test employee ID exists in database
3. Contact HRMS development team with error details
