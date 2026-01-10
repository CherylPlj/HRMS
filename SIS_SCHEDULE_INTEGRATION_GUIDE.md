# SIS-HRMS Schedule Integration Guide

## 📊 SIS Schema Overview

### Your SIS Tables:

**Schedule Table:**
```sql
- id (integer, PK)
- subjectId (integer, FK → Subject.id)
- time (text)
- room (text)
- instructor (text)          ← KEY FIELD for HRMS integration
- day (text)
- createdAt (timestamp)
- updatedAt (timestamp)
```

**Subject Table:**
```sql
- id (integer, PK)
- code (text)
- name (text)
- description (text)
- units (integer)
- gradeLevel (text)
- department (text)
- isActive (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)
```

---

## 🔗 Integration Mapping

### Key Integration Point: `Schedule.instructor` ↔ HRMS `EmployeeID`

The `instructor` field in your SIS Schedule table should store the HRMS `EmployeeID` (e.g., "2026-0001") to enable integration.

**Recommended Approach:**
```javascript
// SIS Schedule record
{
  id: 1,
  subjectId: 5,
  instructor: "2026-0001",  // ← Store HRMS EmployeeID here
  time: "08:00-09:00",
  room: "Room 101",
  day: "Monday"
}
```

### Alternative: Add Faculty Reference Field

If you want to keep instructor as a name, consider adding a new field:

```sql
ALTER TABLE Schedule ADD COLUMN hrmsEmployeeId TEXT;
ALTER TABLE Schedule ADD COLUMN hrmsFacultyId INTEGER;
```

Then:
```javascript
{
  id: 1,
  instructor: "Juan Dela Cruz",      // Display name
  hrmsEmployeeId: "2026-0001",       // HRMS reference
  hrmsFacultyId: 1,                   // HRMS Faculty ID
  // ... other fields
}
```

---

## 🎯 Integration Workflow

### Scenario 1: Creating a New Schedule Assignment

```javascript
// SIS: Before creating schedule
async function assignFacultyToSchedule(scheduleData) {
  const {
    subjectId,
    employeeId,  // HRMS Employee ID (e.g., "2026-0001")
    day,
    time,
    duration,
    room
  } = scheduleData;

  // STEP 1: Get subject details from SIS
  const subject = await db.query(
    'SELECT * FROM Subject WHERE id = $1',
    [subjectId]
  );

  // STEP 2: Check faculty availability in HRMS
  const availability = await hrmsAPI.checkFacultyAvailability(employeeId);
  
  if (!availability.isAvailable) {
    throw new Error(
      `Faculty unavailable: ${availability.availability.reason}. ` +
      `Current leave: ${availability.currentLeave?.type || 'N/A'}`
    );
  }

  // STEP 3: Get faculty qualifications from HRMS
  const qualifications = await hrmsAPI.getFacultyQualifications(employeeId);
  
  // Check if faculty department matches subject department
  if (qualifications.department?.name !== subject.department) {
    console.warn(
      `Warning: Faculty department (${qualifications.department?.name}) ` +
      `doesn't match subject department (${subject.department})`
    );
  }

  // Check if PRC license is valid for teaching
  if (!qualifications.licenses.prc.isValid) {
    throw new Error('Faculty does not have valid PRC license');
  }

  // STEP 4: Validate workload capacity
  const validation = await hrmsAPI.validateFacultyWorkload(employeeId, {
    additionalSections: 1,
    additionalHours: duration,
    day: day,
    time: time
  });

  if (!validation.canAssign) {
    throw new Error(
      `Cannot assign faculty: ${validation.reason}. ` +
      `Current load: ${validation.currentWorkload.sections} sections, ` +
      `${validation.currentWorkload.hoursPerWeek} hours/week`
    );
  }

  // Check for schedule conflicts
  if (validation.conflicts.length > 0) {
    const conflict = validation.conflicts[0];
    throw new Error(
      `Schedule conflict on ${conflict.day} at ${conflict.time}: ` +
      `${conflict.subject} (${conflict.section})`
    );
  }

  // STEP 5: All validations passed - create schedule in SIS
  const newSchedule = await db.query(
    `INSERT INTO Schedule (subjectId, instructor, time, room, day, createdAt, updatedAt)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [subjectId, employeeId, time, room, day]
  );

  // STEP 6: Optionally sync back to HRMS
  // (Future enhancement: HRMS can store SIS schedule references)

  return {
    success: true,
    schedule: newSchedule.rows[0],
    facultyName: qualifications.name,
    facultyWorkload: {
      current: validation.currentWorkload,
      proposed: validation.proposedWorkload,
      remaining: validation.availability
    }
  };
}
```

### Scenario 2: Bulk Schedule Creation (e.g., Start of Semester)

```javascript
async function bulkAssignSchedules(scheduleList) {
  const results = {
    success: [],
    failed: []
  };

  for (const schedule of scheduleList) {
    try {
      // Get faculty workload summary first
      const workload = await hrmsAPI.getFacultyWorkload(schedule.employeeId);
      
      // Skip if already at capacity
      if (!workload.workload.canTakeMoreSections) {
        results.failed.push({
          schedule,
          reason: `Faculty at capacity: ${workload.workload.status}`
        });
        continue;
      }

      // Validate specific assignment
      const validation = await hrmsAPI.validateFacultyWorkload(
        schedule.employeeId,
        {
          additionalSections: 1,
          day: schedule.day,
          time: schedule.time,
          duration: schedule.duration
        }
      );

      if (validation.canAssign) {
        // Create schedule
        const result = await assignFacultyToSchedule(schedule);
        results.success.push(result);
      } else {
        results.failed.push({
          schedule,
          reason: validation.reason,
          conflicts: validation.conflicts
        });
      }

    } catch (error) {
      results.failed.push({
        schedule,
        reason: error.message
      });
    }
  }

  return results;
}
```

### Scenario 3: Display Faculty Info in Schedule View

```javascript
// SIS: When displaying schedule to students/admin
async function getScheduleWithFacultyDetails(scheduleId) {
  // Get schedule from SIS
  const schedule = await db.query(
    `SELECT s.*, sub.name as subjectName, sub.code as subjectCode
     FROM Schedule s
     JOIN Subject sub ON s.subjectId = sub.id
     WHERE s.id = $1`,
    [scheduleId]
  );

  const scheduleData = schedule.rows[0];

  // Get faculty details from HRMS
  const facultyQual = await hrmsAPI.getFacultyQualifications(
    scheduleData.instructor  // This is the HRMS EmployeeID
  );

  return {
    // SIS Schedule data
    scheduleId: scheduleData.id,
    subject: {
      id: scheduleData.subjectid,
      code: scheduleData.subjectcode,
      name: scheduleData.subjectname
    },
    day: scheduleData.day,
    time: scheduleData.time,
    room: scheduleData.room,

    // HRMS Faculty data
    instructor: {
      employeeId: scheduleData.instructor,
      name: facultyQual.name,
      email: facultyQual.email,
      position: facultyQual.position,
      department: facultyQual.department?.name,
      photo: facultyQual.photo, // If available
      education: facultyQual.highestEducation,
      licenses: facultyQual.licenses.prc,
      yearsOfExperience: facultyQual.experience.yearsOfTeaching
    }
  };
}
```

---

## 📋 Recommended SIS Code Changes

### 1. Create HRMS Integration Module

**File: `lib/hrms-integration.js`**

```javascript
const crypto = require('crypto');
const axios = require('axios');

class HRMSIntegration {
  constructor() {
    this.apiKey = process.env.HRMS_API_KEY;
    this.sharedSecret = process.env.HRMS_SHARED_SECRET;
    this.baseUrl = process.env.HRMS_BASE_URL;
  }

  generateSignature(body, timestamp) {
    return crypto
      .createHmac('sha256', this.sharedSecret)
      .update(body + timestamp)
      .digest('hex');
  }

  async authenticatedGet(endpoint) {
    const timestamp = Date.now().toString();
    const body = '';
    const signature = this.generateSignature(body, timestamp);

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
    });

    return response.data;
  }

  async authenticatedPost(endpoint, data) {
    const timestamp = Date.now().toString();
    const body = JSON.stringify(data);
    const signature = this.generateSignature(body, timestamp);

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  // Convenience methods
  async checkFacultyAvailability(employeeId) {
    return this.authenticatedGet(`/api/xr/faculty-availability/${employeeId}`);
  }

  async getFacultyQualifications(employeeId) {
    return this.authenticatedGet(`/api/xr/faculty-qualifications/${employeeId}`);
  }

  async getFacultyWorkload(employeeId) {
    return this.authenticatedGet(`/api/xr/faculty-workload/${employeeId}`);
  }

  async validateFacultyWorkload(employeeId, assignmentData) {
    return this.authenticatedPost('/api/xr/faculty-workload/validate', {
      employeeId,
      ...assignmentData
    });
  }
}

module.exports = new HRMSIntegration();
```

### 2. Update Schedule Controller

**File: `controllers/scheduleController.js`**

```javascript
const hrms = require('../lib/hrms-integration');

// CREATE Schedule with HRMS validation
async function createSchedule(req, res) {
  const { subjectId, instructor, time, room, day } = req.body;

  try {
    // Validate with HRMS
    const availability = await hrms.checkFacultyAvailability(instructor);
    
    if (!availability.isAvailable) {
      return res.status(400).json({
        error: 'Faculty unavailable',
        reason: availability.availability.reason,
        currentLeave: availability.currentLeave
      });
    }

    // Get subject to calculate duration
    const subject = await db.query(
      'SELECT * FROM Subject WHERE id = $1',
      [subjectId]
    );

    // Validate workload
    const validation = await hrms.validateFacultyWorkload(instructor, {
      additionalSections: 1,
      additionalHours: subject.units || 1,
      day,
      time
    });

    if (!validation.canAssign) {
      return res.status(400).json({
        error: 'Cannot assign faculty',
        reason: validation.reason,
        currentWorkload: validation.currentWorkload,
        conflicts: validation.conflicts
      });
    }

    // Create schedule in SIS
    const result = await db.query(
      `INSERT INTO Schedule (subjectId, instructor, time, room, day, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [subjectId, instructor, time, room, day]
    );

    res.json({
      success: true,
      schedule: result.rows[0],
      validation: {
        facultyName: availability.name,
        workloadStatus: validation.proposedWorkload
      }
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
}

// GET Schedule with faculty details
async function getScheduleWithFaculty(req, res) {
  const { scheduleId } = req.params;

  try {
    // Get schedule from SIS
    const schedule = await db.query(
      `SELECT s.*, sub.name as subjectName, sub.code as subjectCode
       FROM Schedule s
       JOIN Subject sub ON s.subjectId = sub.id
       WHERE s.id = $1`,
      [scheduleId]
    );

    if (schedule.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const scheduleData = schedule.rows[0];

    // Get faculty details from HRMS
    const facultyQual = await hrms.getFacultyQualifications(
      scheduleData.instructor
    );

    res.json({
      schedule: scheduleData,
      faculty: {
        employeeId: facultyQual.employeeId,
        name: facultyQual.name,
        email: facultyQual.email,
        position: facultyQual.position,
        department: facultyQual.department,
        education: facultyQual.highestEducation,
        licenses: facultyQual.licenses.prc,
        experience: facultyQual.experience
      }
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
}

module.exports = {
  createSchedule,
  getScheduleWithFaculty
};
```

### 3. Add Faculty Selector Component (Frontend)

**File: `components/FacultySelector.jsx`**

```javascript
import { useState, useEffect } from 'react';
import hrmsAPI from '../lib/hrms-api';

function FacultySelector({ subjectId, selectedDay, selectedTime, onChange }) {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState({});

  // Load available faculties
  useEffect(() => {
    loadFaculties();
  }, []);

  async function loadFaculties() {
    setLoading(true);
    try {
      // Get all faculties from your SIS or HRMS
      const facultyList = await fetch('/api/faculties').then(r => r.json());
      
      // Check availability for each
      const withAvailability = await Promise.all(
        facultyList.map(async (faculty) => {
          try {
            const availability = await hrmsAPI.checkFacultyAvailability(
              faculty.employeeId
            );
            const workload = await hrmsAPI.getFacultyWorkload(
              faculty.employeeId
            );
            
            return {
              ...faculty,
              isAvailable: availability.isAvailable,
              availabilityReason: availability.availability.reason,
              workload: workload.workload
            };
          } catch (error) {
            return {
              ...faculty,
              isAvailable: false,
              availabilityReason: 'Error checking availability'
            };
          }
        })
      );

      setFaculties(withAvailability);
    } catch (error) {
      console.error('Error loading faculties:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(employeeId) {
    // Validate before selecting
    const validation = await hrmsAPI.validateFacultyWorkload(employeeId, {
      additionalSections: 1,
      day: selectedDay,
      time: selectedTime,
      duration: 1
    });

    setValidationResults({
      ...validationResults,
      [employeeId]: validation
    });

    if (validation.canAssign) {
      onChange(employeeId);
    } else {
      alert(`Cannot assign: ${validation.reason}`);
    }
  }

  if (loading) return <div>Loading faculties...</div>;

  return (
    <div className="faculty-selector">
      <h3>Select Faculty</h3>
      <div className="faculty-list">
        {faculties.map(faculty => (
          <div
            key={faculty.employeeId}
            className={`faculty-item ${
              faculty.isAvailable ? 'available' : 'unavailable'
            }`}
          >
            <div className="faculty-info">
              <strong>{faculty.name}</strong>
              <span className="employee-id">{faculty.employeeId}</span>
              <span className="department">{faculty.department}</span>
            </div>
            
            <div className="faculty-status">
              {faculty.isAvailable ? (
                <>
                  <span className="badge available">Available</span>
                  <span className="workload">
                    Load: {faculty.workload.totalSections} sections, 
                    {faculty.workload.totalHoursPerWeek}h/week
                    ({faculty.workload.workloadPercentage}%)
                  </span>
                </>
              ) : (
                <span className="badge unavailable">
                  {faculty.availabilityReason}
                </span>
              )}
            </div>

            <button
              onClick={() => handleSelect(faculty.employeeId)}
              disabled={!faculty.isAvailable}
              className="btn-select"
            >
              {faculty.isAvailable ? 'Select' : 'Unavailable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FacultySelector;
```

---

## 🗺️ Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      SIS Schedule Creation                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. User selects: Subject, Day, Time, Room                   │
│  2. User needs to select Faculty                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│       HRMS Integration - Validate Faculty                    │
├─────────────────────────────────────────────────────────────┤
│  ✓ Check Availability (on leave?)                            │
│  ✓ Check Qualifications (valid license?)                     │
│  ✓ Check Workload (at capacity?)                             │
│  ✓ Check Conflicts (time conflict?)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
                   ▼                     ▼
          ┌────────────────┐    ┌────────────────┐
          │  Can Assign?   │    │ Cannot Assign? │
          │  ✓ All checks  │    │  ✗ Show reason │
          │    passed      │    │  ✗ Show        │
          └────────────────┘    │    conflicts   │
                   │             └────────────────┘
                   ▼                     │
          ┌────────────────┐            │
          │ Create Schedule│            │
          │ in SIS DB      │            │
          │                │            │
          │ INSERT INTO    │            │
          │ Schedule(...)  │            │
          └────────────────┘            │
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌──────────────────┐
                    │  Return Result   │
                    │  to User         │
                    └──────────────────┘
```

---

## 🔄 Bidirectional Sync (Future Enhancement)

### Option 1: SIS pushes to HRMS when schedule is created

```javascript
// After creating schedule in SIS, notify HRMS
async function syncScheduleToHRMS(schedule) {
  // Future HRMS API endpoint
  await hrmsAPI.post('/api/xr/schedule-sync', {
    sisScheduleId: schedule.id,
    employeeId: schedule.instructor,
    subjectCode: schedule.subject.code,
    day: schedule.day,
    time: schedule.time,
    duration: schedule.duration,
    room: schedule.room
  });
}
```

### Option 2: HRMS pulls from SIS periodically

```javascript
// HRMS can query SIS for faculty schedules
// This would require exposing a SIS API endpoint
```

---

## 📝 Environment Variables for SIS

Add to your SIS `.env` file:

```bash
# HRMS Integration
HRMS_BASE_URL=https://hrms.school.edu.ph
HRMS_API_KEY=your_sis_api_key_from_hrms
HRMS_SHARED_SECRET=your_shared_secret_from_hrms

# Optional: Feature flags
ENABLE_HRMS_VALIDATION=true
ENABLE_HRMS_AVAILABILITY_CHECK=true
ENABLE_HRMS_WORKLOAD_CHECK=true
```

---

## ✅ Implementation Checklist for SIS Team

### Phase 1: Basic Integration
- [ ] Add HRMS credentials to SIS environment variables
- [ ] Create HRMS integration module (`lib/hrms-integration.js`)
- [ ] Test connection to HRMS APIs
- [ ] Store HRMS EmployeeID in Schedule.instructor field

### Phase 2: Validation
- [ ] Add availability check before schedule creation
- [ ] Add workload validation
- [ ] Display validation errors to users
- [ ] Handle HRMS API failures gracefully

### Phase 3: UI Enhancement
- [ ] Create faculty selector with availability indicators
- [ ] Show workload status for each faculty
- [ ] Display schedule conflicts
- [ ] Add faculty details in schedule view

### Phase 4: Optimization
- [ ] Implement caching for faculty data
- [ ] Add batch validation for bulk scheduling
- [ ] Optimize API calls
- [ ] Add retry logic for failures

---

## 🎯 Quick Win: Start with Read-Only Integration

**Week 1**: Display faculty details from HRMS in your existing schedules

```javascript
// Just enhance your schedule display
async function enhanceSchedulesWithHRMSData(schedules) {
  return Promise.all(schedules.map(async (schedule) => {
    try {
      const faculty = await hrms.getFacultyQualifications(schedule.instructor);
      return {
        ...schedule,
        facultyName: faculty.name,
        facultyEmail: faculty.email,
        facultyDepartment: faculty.department?.name
      };
    } catch (error) {
      // Gracefully handle if HRMS is unavailable
      return schedule;
    }
  }));
}
```

**Week 2**: Add validation for new schedule assignments

**Week 3**: Full integration with UI enhancements

---

## 📞 Next Steps

1. **Review this integration guide**
2. **Set up HRMS credentials in SIS**
3. **Test connectivity with provided test scripts**
4. **Implement basic integration (display faculty data)**
5. **Add validation to schedule creation**
6. **Enhance UI with real-time checks**

---

*Ready to integrate? Start with the HRMS integration module and test connectivity!*
