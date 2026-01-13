/**
 * Quick Test Script for SIS Integration Endpoints
 * 
 * Usage:
 * 1. Update CONFIG section with your values
 * 2. Run: node test-sis-endpoints.js
 */

const crypto = require('crypto');

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const CONFIG = {
  BASE_URL: process.env.HRMS_BASE_URL || 'http://localhost:3000',
  API_KEY: process.env.SJSFI_SIS_API_KEY || 'YOUR_API_KEY_HERE',
  SHARED_SECRET: process.env.SJSFI_SHARED_SECRET || 'YOUR_SHARED_SECRET_HERE',
  TEST_EMAIL: 'test@school.edu', // Use an actual email from your database
  TEST_EMPLOYEE_ID: '2026-0001', // Use an actual employee ID from your database
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateSignature(body, timestamp, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body + timestamp);
  return hmac.digest('hex');
}

async function makeRequest(method, endpoint, bodyData = null) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  const timestamp = Date.now().toString();
  const body = bodyData ? JSON.stringify(bodyData) : '';
  const signature = generateSignature(body, timestamp, CONFIG.SHARED_SECRET);

  const headers = {
    'Authorization': `Bearer ${CONFIG.API_KEY}`,
    'x-timestamp': timestamp,
    'x-signature': signature,
  };

  if (bodyData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers,
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    });

    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ========================================
// TEST FUNCTIONS
// ========================================

async function testUserAccessLookup() {
  console.log('\n📧 TEST 1: User Access Lookup');
  console.log('Endpoint: POST /api/xr/user-access-lookup');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('POST', '/api/xr/user-access-lookup', {
    email: CONFIG.TEST_EMAIL,
  });
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

async function testSectionAssignments() {
  console.log('\n📋 TEST 2: Section Assignments');
  console.log('Endpoint: GET /api/xr/section-assignments');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('GET', '/api/xr/section-assignments');
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log(`Found ${result.data?.assignments?.length || 0} section assignments`);
    if (result.data?.assignments?.length > 0) {
      console.log('Sample:', JSON.stringify(result.data.assignments[0], null, 2));
    }
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

async function testFacultyAvailability() {
  console.log('\n👤 TEST 3: Faculty Availability');
  console.log(`Endpoint: GET /api/xr/faculty-availability/${CONFIG.TEST_EMPLOYEE_ID}`);
  console.log('─'.repeat(50));
  
  const result = await makeRequest('GET', `/api/xr/faculty-availability/${CONFIG.TEST_EMPLOYEE_ID}`);
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

async function testFacultyQualifications() {
  console.log('\n🎓 TEST 4: Faculty Qualifications');
  console.log(`Endpoint: GET /api/xr/faculty-qualifications/${CONFIG.TEST_EMPLOYEE_ID}`);
  console.log('─'.repeat(50));
  
  const result = await makeRequest('GET', `/api/xr/faculty-qualifications/${CONFIG.TEST_EMPLOYEE_ID}`);
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

async function testFacultyWorkload() {
  console.log('\n📊 TEST 5: Faculty Workload');
  console.log(`Endpoint: GET /api/xr/faculty-workload/${CONFIG.TEST_EMPLOYEE_ID}`);
  console.log('─'.repeat(50));
  
  const result = await makeRequest('GET', `/api/xr/faculty-workload/${CONFIG.TEST_EMPLOYEE_ID}`);
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

async function testWorkloadValidation() {
  console.log('\n✅ TEST 6: Workload Validation');
  console.log('Endpoint: POST /api/xr/faculty-workload/validate');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('POST', '/api/xr/faculty-workload/validate', {
    employeeId: CONFIG.TEST_EMPLOYEE_ID,
    additionalHours: 3,
    additionalSections: 1,
  });
  
  console.log(`Status: ${result.status}`);
  if (result.success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', result.error || result.data);
  }
  return result.success;
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log('🧪 SIS Integration Endpoints Test Suite');
  console.log('='.repeat(50));
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`API Key: ${CONFIG.API_KEY.substring(0, 10)}...`);
  console.log('='.repeat(50));

  // Check if fetch is available (Node.js 18+)
  if (typeof fetch === 'undefined') {
    console.error('\n❌ ERROR: This script requires Node.js 18+ or install node-fetch');
    console.log('Install: npm install node-fetch');
    process.exit(1);
  }

  // Check configuration
  if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE' || CONFIG.SHARED_SECRET === 'YOUR_SHARED_SECRET_HERE') {
    console.error('\n⚠️  WARNING: Please update CONFIG section with your actual values!');
    console.log('Or set environment variables:');
    console.log('  - HRMS_BASE_URL');
    console.log('  - SJSFI_SIS_API_KEY');
    console.log('  - SJSFI_SHARED_SECRET');
  }

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Run tests
  try {
    const test1 = await testUserAccessLookup();
    results.tests.push({ name: 'User Access Lookup', passed: test1 });
    if (test1) results.passed++; else results.failed++;

    const test2 = await testSectionAssignments();
    results.tests.push({ name: 'Section Assignments', passed: test2 });
    if (test2) results.passed++; else results.failed++;

    const test3 = await testFacultyAvailability();
    results.tests.push({ name: 'Faculty Availability', passed: test3 });
    if (test3) results.passed++; else results.failed++;

    const test4 = await testFacultyQualifications();
    results.tests.push({ name: 'Faculty Qualifications', passed: test4 });
    if (test4) results.passed++; else results.failed++;

    const test5 = await testFacultyWorkload();
    results.tests.push({ name: 'Faculty Workload', passed: test5 });
    if (test5) results.passed++; else results.failed++;

    const test6 = await testWorkloadValidation();
    results.tests.push({ name: 'Workload Validation', passed: test6 });
    if (test6) results.passed++; else results.failed++;
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  console.log('─'.repeat(50));
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
