# Data HRMS Receives from SIS

This document outlines all the data that HRMS receives from the SIS (Student Information System) enrollment system.

---

## 1. Schedules Data

**Endpoint:** `POST /api/hrms/available-schedules`  
**HRMS Endpoint:** `GET /api/schedules/fetch-from-sis`

### Request HRMS Sends to SIS

```json
{
  "data": "fetch-all-schedules"
}
```

### Response HRMS Receives from SIS

**Expected Structure:**
```json
{
  "status": "success",
  "data": [
    {
      "scheduleId": 123,
      "schedule": {
        "id": 123,
        "day": "Monday",
        "startTime": "08:00",
        "endTime": "09:30",
        "room": "Room 101"
      },
      "subject": {
        "id": 45,
        "code": "MATH101",
        "name": "Mathematics 101"
      },
      "section": {
        "id": 10,
        "name": "Grade 7-A"
      },
      "teacher": {
        "assigned": false,
        "teacherId": null,
        "teacherName": null
      },
      "yearLevel": {
        "name": "Grade 7"
      },
      "term": {
        "id": 1
      }
    }
  ]
}
```

### Data Fields HRMS Extracts

From each schedule object, HRMS extracts:

#### Schedule Information
- `scheduleId` - SIS schedule ID (used for syncing)
- `schedule.day` - Day of week (e.g., "Monday")
- `schedule.startTime` - Start time (e.g., "08:00")
- `schedule.endTime` - End time (e.g., "09:30")
- `schedule.room` - Room name/location

#### Subject Information
- `subject.id` - SIS subject ID
- `subject.code` - Subject code (e.g., "MATH101")
- `subject.name` - Subject name (e.g., "Mathematics 101")

#### Section Information
- `section.id` - SIS section ID
- `section.name` - Section name (e.g., "Grade 7-A")

#### Teacher Information
- `teacher.assigned` - Boolean indicating if teacher is assigned
- `teacher.teacherId` - Employee ID of assigned teacher (e.g., "2026-0001")
- `teacher.teacherName` - Full name of assigned teacher

#### Additional Information
- `yearLevel.name` - Year/grade level name (e.g., "Grade 7")
- `term.id` - Term/semester ID

### How HRMS Uses This Data

1. **Matching with HRMS Data:**
   - Matches subjects by `subject.code` or `subject.name`
   - Matches sections by `section.name` (case-insensitive)
   - Matches teachers by `teacher.teacherId` (EmployeeID)

2. **Creating/Updating Schedules:**
   - Creates HRMS schedule records for SIS-only schedules
   - Updates existing HRMS schedules to match SIS

3. **Sync Status:**
   - Determines if schedule is synced, HRMS-only, SIS-only, or unassigned
   - Tracks which teacher is assigned in SIS vs HRMS

---

## 2. Sections Data

**Endpoint:** `GET /api/hrms/sections`  
**HRMS Endpoint:** `GET /api/sections/fetch-from-sis`

### Request HRMS Sends to SIS

**Method:** GET (no body, uses headers for authentication)

### Response HRMS Receives from SIS

**Expected Structure:**
```json
{
  "data": [
    {
      "sectionId": 10,
      "section": {
        "id": 10,
        "name": "Grade 7-A",
        "capacity": 30
      },
      "adviser": {
        "employeeId": "2026-0001",
        "adviserName": "Dr. Maria Santos",
        "adviserEmail": "maria@school.edu"
      },
      "yearLevel": {
        "name": "Grade 7"
      },
      "term": {
        "id": 1,
        "name": "First Semester"
      }
    }
  ]
}
```

**Alternative Structure (if SIS returns differently):**
```json
{
  "sections": [
    {
      "sectionId": 10,
      "section": {
        "name": "Grade 7-A"
      },
      "adviser": null
    }
  ]
}
```

### Data Fields HRMS Extracts

- `sectionId` - SIS section ID (used for syncing adviser assignments)
- `section.name` - Section name (used to match with HRMS sections)
- `section.capacity` - Maximum capacity of section
- `adviser.employeeId` - Employee ID of section adviser
- `adviser.adviserName` - Full name of section adviser
- `adviser.adviserEmail` - Email of section adviser
- `yearLevel.name` - Year/grade level
- `term.id` - Term/semester ID
- `term.name` - Term/semester name

### How HRMS Uses This Data

1. **Matching Sections:**
   - Matches SIS sections with HRMS sections by name (case-insensitive)
   - Links SIS section IDs to HRMS section records

2. **Syncing Advisers:**
   - Compares SIS adviser assignments with HRMS assignments
   - Syncs adviser assignments from HRMS to SIS

---

## 3. Teacher Assignment Response

**Endpoint:** `POST /api/hrms/assign-teacher` (HRMS sends TO SIS)  
**Response HRMS Receives:**

### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Schedule assignment updated successfully"
}
```

### Conflict Response (409 Conflict)
```json
{
  "status": "error",
  "error": "Schedule already has a teacher assigned",
  "currentTeacher": {
    "teacherId": "2026-0002",
    "teacherName": "Previous Teacher Name"
  }
}
```

### Error Response (404 Not Found)
```json
{
  "status": "error",
  "error": "Schedule not found"
}
```

---

## 4. Section Adviser Assignment Response

**Endpoint:** `POST /api/hrms/assign-adviser` (HRMS sends TO SIS)  
**Response HRMS Receives:**

### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Section adviser assignment updated successfully"
}
```

### Error Response (404 Not Found)
```json
{
  "status": "error",
  "error": "Section not found"
}
```

---

## Data Processing Flow

### 1. Fetching Schedules

```
HRMS → SIS: POST /api/hrms/available-schedules
         Body: { "data": "fetch-all-schedules" }

SIS → HRMS: Returns array of schedule objects

HRMS Processing:
1. Extracts schedule, subject, section, teacher data
2. Matches with HRMS subjects by code/name
3. Matches with HRMS sections by name
4. Matches with HRMS faculty by EmployeeID
5. Determines sync status
6. Returns mapped data to frontend
```

### 2. Fetching Sections

```
HRMS → SIS: GET /api/hrms/sections

SIS → HRMS: Returns array of section objects

HRMS Processing:
1. Extracts section and adviser data
2. Matches with HRMS sections by name
3. Links SIS sectionId to HRMS sections
4. Returns matched sections with SIS data
```

### 3. Syncing Teacher Assignments

```
HRMS → SIS: POST /api/hrms/assign-teacher
         Body: {
           "scheduleId": 123,
           "teacher": {
             "teacherId": "2026-0001",
             "teacherName": "Dr. Maria Santos",
             "teacherEmail": "maria@school.edu"
           }
         }

SIS → HRMS: Success (200) or Error (409/404)

HRMS Processing:
- If 200: Marks as synced
- If 409: Checks if same teacher (synced) or different (needs manual unassignment)
- If 404: Endpoint not available, saves in HRMS only
```

---

## Key Data Points

### Required Fields from SIS

**For Schedules:**
- ✅ `scheduleId` - Critical for syncing
- ✅ `schedule.day` - Required for matching
- ✅ `schedule.startTime` / `schedule.endTime` - Required for matching
- ✅ `subject.code` or `subject.name` - Required for matching
- ✅ `section.name` - Required for matching

**For Sections:**
- ✅ `sectionId` - Critical for syncing
- ✅ `section.name` - Required for matching

### Optional but Useful Fields

- `schedule.room` - Room information
- `teacher.teacherId` - For matching with HRMS faculty
- `teacher.teacherName` - Fallback if teacher not found in HRMS
- `yearLevel.name` - Display purposes
- `term.id` / `term.name` - Academic term information

---

## Data Matching Logic

### Subject Matching
```typescript
// HRMS tries to match by:
1. Subject code (exact match)
2. Subject name (case-insensitive contains)
```

### Section Matching
```typescript
// HRMS tries to match by:
1. Section name (case-insensitive contains)
```

### Teacher Matching
```typescript
// HRMS tries to match by:
1. EmployeeID (exact match with teacher.teacherId)
2. Falls back to teacherName if not found
```

---

## Common Issues

### 1. Missing Schedule Data
- **Symptom:** Schedules not appearing in HRMS
- **Cause:** SIS not returning `scheduleId` or required fields
- **Solution:** Ensure SIS returns all required fields

### 2. Subject/Section Not Matching
- **Symptom:** Schedules show "Not in HRMS"
- **Cause:** Name mismatch between SIS and HRMS
- **Solution:** Ensure section/subject names match (case-insensitive)

### 3. Teacher Not Found
- **Symptom:** Teacher shows as "Unassigned" even if assigned in SIS
- **Cause:** `teacher.teacherId` doesn't match any HRMS EmployeeID
- **Solution:** Ensure SIS uses correct EmployeeID format

---

## Notes

- All SIS responses must include proper authentication headers
- HRMS handles missing optional fields gracefully
- Raw SIS data is preserved in `rawData` field for debugging
- HRMS performs case-insensitive matching for names
- HRMS prefers HRMS data over SIS data when both exist
