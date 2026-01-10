# 🚀 SIS-HRMS Integration Quick Reference

## 📌 What You Got (2-Day Delivery)

### 3 Production-Ready APIs:
1. **Faculty Availability** - Check leave status before scheduling
2. **Faculty Qualifications** - Validate credentials and licenses  
3. **Faculty Workload** - Manage teaching load and prevent overload

---

## ⚡ Quick Start (5 Minutes)

### 1. Get Your Credentials
Contact HRMS admin for:
- `HRMS_API_KEY` - Your SIS API key
- `HRMS_SHARED_SECRET` - Signature generation secret
- `HRMS_BASE_URL` - API endpoint (e.g., https://hrms.school.edu.ph)

### 2. Test Immediately
```bash
# Install axios
npm install axios

# Set environment variables
export HRMS_API_KEY="your_key"
export HRMS_SHARED_SECRET="your_secret"
export HRMS_BASE_URL="https://hrms.school.edu.ph"

# Run test script
node test-sis-integration.js
```

### 3. Start Integrating
Copy the example code from `SIS_INTEGRATION_API_DOCUMENTATION.md` section "Integration into Your SIS"

---

## 📡 API Quick Reference

### Check Faculty Availability
```http
GET /api/xr/faculty-availability/{employeeId}
```
**Returns**: Is faculty available? On leave? Employment status?

**Use before**: Scheduling any class

### Get Faculty Qualifications  
```http
GET /api/xr/faculty-qualifications/{employeeId}
```
**Returns**: Education, PRC License, certifications, skills, experience

**Use before**: Assigning faculty to specialized subjects

### Get Current Workload
```http
GET /api/xr/faculty-workload/{employeeId}
```
**Returns**: Current sections, hours/week, schedule, capacity

**Use to**: Check if faculty can take more classes

### Validate New Assignment
```http
POST /api/xr/faculty-workload/validate
Body: {
  "employeeId": "2026-0001",
  "additionalHours": 3,
  "additionalSections": 1,
  "day": "Monday",
  "time": "08:00-09:00",
  "duration": 1
}
```
**Returns**: Can assign? Any conflicts? Remaining capacity?

**Use before**: Actually assigning new section in SIS

---

## 🔐 Authentication (All Endpoints)

```javascript
const crypto = require('crypto');

// Generate signature
const timestamp = Date.now().toString();
const body = ''; // For GET, or JSON.stringify(data) for POST
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(body + timestamp)
  .digest('hex');

// Add headers
headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'x-timestamp': timestamp,
  'x-signature': signature,
  'Content-Type': 'application/json' // For POST only
}
```

---

## 💡 Common Use Cases

### Use Case 1: Schedule Class for Faculty
```javascript
// Step 1: Check availability
const avail = await GET(`/api/xr/faculty-availability/${employeeId}`);
if (!avail.isAvailable) {
  return alert(`Faculty on ${avail.currentLeave.type} leave`);
}

// Step 2: Validate workload
const valid = await POST('/api/xr/faculty-workload/validate', {
  employeeId,
  additionalSections: 1,
  day: 'Monday',
  time: '08:00-09:00',
  duration: 1
});

if (!valid.canAssign) {
  return alert(valid.reason); // "Schedule conflict" or "Max load reached"
}

// Step 3: Proceed with scheduling in SIS
scheduleClass(employeeId, sectionId, 'Monday', '08:00-09:00');
```

### Use Case 2: Validate Faculty Can Teach Subject
```javascript
// Get qualifications
const qual = await GET(`/api/xr/faculty-qualifications/${employeeId}`);

// Check requirements for Advanced Physics
if (!qual.licenses.prc.isValid) {
  return alert('Valid PRC license required');
}
if (!qual.qualificationSummary.hasPostgraduate) {
  return alert('Masters degree required for advanced courses');
}
if (qual.experience.yearsOfTeaching < 5) {
  return alert('Minimum 5 years experience required');
}

// Faculty is qualified - proceed with assignment
```

### Use Case 3: Find Faculty With Available Capacity
```javascript
const facultyList = await getAllFacultyFromSIS();

for (const faculty of facultyList) {
  const workload = await GET(`/api/xr/faculty-workload/${faculty.employeeId}`);
  
  if (workload.workload.canTakeMoreSections) {
    console.log(`${faculty.name}: ${workload.workload.availableHours} hours available`);
  }
}
```

---

## 📊 Response Quick Reference

### Availability Response
```json
{
  "isAvailable": true/false,
  "availability": { "status": "Available", "reason": null },
  "currentLeave": { ... },
  "upcomingLeaves": [ ... ]
}
```

### Qualifications Response
```json
{
  "education": [ ... ],
  "licenses": { "prc": { "isValid": true, ... } },
  "certifications": [ ... ],
  "qualificationSummary": {
    "hasValidPRCLicense": true,
    "hasPostgraduate": true,
    "yearsOfExperience": 8,
    "isQualified": true
  }
}
```

### Workload Response
```json
{
  "workload": {
    "totalSections": 6,
    "totalHoursPerWeek": 24,
    "workloadPercentage": 60,
    "canTakeMoreSections": true,
    "availableHours": 16
  },
  "schedules": [ ... ]
}
```

### Validation Response
```json
{
  "canAssign": true/false,
  "reason": "...",
  "currentWorkload": { ... },
  "proposedWorkload": { ... },
  "conflicts": [ ... ]
}
```

---

## ⚠️ Common Errors

| Code | Error | Solution |
|------|-------|----------|
| 401 | Unauthorized | Check API key is correct |
| 403 | Invalid signature | Verify shared secret and timestamp |
| 404 | Not found | Check employee ID exists |
| 429 | Rate limit | Wait 60 seconds, add retry logic |
| 500 | Server error | Contact HRMS team |

---

## 📁 File Locations

```
Your Project Root/
├── src/app/api/xr/
│   ├── faculty-availability/[employeeId]/route.ts    ✅ NEW
│   ├── faculty-qualifications/[employeeId]/route.ts  ✅ NEW
│   ├── faculty-workload/[employeeId]/route.ts        ✅ NEW
│   └── faculty-workload/validate/route.ts            ✅ NEW
│
├── Documentation/
│   ├── SIS_INTEGRATION_API_DOCUMENTATION.md          📚 FULL API DOCS
│   ├── TESTING_GUIDE.md                              🧪 TEST SCRIPTS
│   ├── IMPLEMENTATION_SUMMARY.md                     ✅ WHAT WAS DONE
│   ├── SIS_HRMS_INTEGRATION_SUGGESTIONS.md          💡 10 MORE IDEAS
│   ├── 2_DAY_INTEGRATION_PLAN.md                    📅 TIMELINE
│   └── QUICK_REFERENCE.md                           ⚡ THIS FILE
│
└── test-sis-integration.js                           🧪 READY-TO-RUN TESTS
```

---

## 🎯 Integration Checklist

### Before You Start:
- [ ] Get API credentials from HRMS admin
- [ ] Read `SIS_INTEGRATION_API_DOCUMENTATION.md`
- [ ] Run test script successfully
- [ ] Understand authentication flow

### During Integration:
- [ ] Add HRMS integration module to SIS
- [ ] Implement availability check before scheduling
- [ ] Add qualification validation for subject assignment
- [ ] Add workload validation before assignment
- [ ] Implement error handling
- [ ] Add caching for performance
- [ ] Test with real faculty data

### After Integration:
- [ ] Monitor API call logs
- [ ] Track error rates
- [ ] Gather user feedback
- [ ] Plan additional integrations

---

## 📞 Need Help?

1. **Can't connect to API?**
   - Check `TESTING_GUIDE.md` troubleshooting section
   - Verify network connectivity
   - Confirm credentials are correct

2. **Authentication failing?**
   - See authentication examples in `SIS_INTEGRATION_API_DOCUMENTATION.md`
   - Verify timestamp is within 5 minutes
   - Check signature generation code

3. **API returning unexpected data?**
   - Check response format in documentation
   - Verify employee ID format (YYYY-NNNN)
   - Ensure faculty record exists

4. **Need more features?**
   - See `SIS_HRMS_INTEGRATION_SUGGESTIONS.md` for 10 additional integration points
   - Contact HRMS team to discuss requirements

---

## 🚀 What's Next?

### Week 1: Testing
- Run all test scripts
- Test with real employee IDs
- Verify all use cases work

### Week 2: Integration
- Implement in SIS codebase
- Add UI elements
- Deploy to staging

### Week 3: Go Live
- Final testing
- Train users
- Deploy to production

### Week 4+: Enhance
- Monitor performance
- Implement caching
- Add more integration points

---

## 💪 You Got This!

Everything you need is ready:
- ✅ 4 working APIs
- ✅ Complete documentation
- ✅ Test scripts
- ✅ Integration examples
- ✅ Troubleshooting guide

**Estimated integration time**: 3-5 days for SIS team

---

## 🎓 Key Concepts

### Faculty Availability
Check if faculty can teach before assigning classes

### Faculty Qualifications
Verify credentials meet requirements for subjects

### Faculty Workload
Prevent overloading and ensure fair distribution

### Workload Limits
- Regular: 40 hrs/week, 10 sections
- Probationary: 35 hrs/week, 8 sections
- Part-Time: 20 hrs/week, 5 sections

---

**Version**: 1.0  
**Date**: January 11, 2026  
**Status**: Production Ready  

**Questions?** See full documentation or contact HRMS team.
