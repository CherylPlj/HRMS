# SIS Requirements for Teacher Replacement/Editing

## Current Situation

Currently, when HRMS tries to assign a teacher to a schedule that already has a different teacher assigned, SIS returns a **409 Conflict** error. HRMS cannot automatically replace the teacher because:

1. SIS does not support unassignment via API (sending `teacher: null` is not accepted)
2. SIS does not automatically replace existing teachers when a new assignment is sent

## What SIS Needs to Implement

To allow HRMS to edit/change assigned teachers, SIS has **two options**:

---

## Option 1: Automatic Replacement (RECOMMENDED) ⭐

**Simplest solution** - Update the existing `/api/hrms/assign-teacher` endpoint to automatically replace existing teachers.

### Implementation

When SIS receives a teacher assignment request:

1. **If schedule has no teacher assigned:**
   - Assign the new teacher (current behavior)

2. **If schedule already has the same teacher:**
   - Return success (no change needed) - **Already working**

3. **If schedule has a different teacher:**
   - **Automatically replace** the old teacher with the new teacher
   - Return success with message indicating replacement occurred

### Code Example (SIS Side)

```javascript
// Pseudo-code for SIS endpoint
router.post('/api/hrms/assign-teacher', async (req, res) => {
  const { scheduleId, teacher } = req.body;
  
  // Find schedule
  const schedule = await Schedule.findByPk(scheduleId);
  
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  
  // Check if schedule already has a teacher
  if (schedule.teacherId) {
    // Check if it's the same teacher
    if (schedule.teacherId === teacher.teacherId) {
      return res.status(200).json({
        status: 'success',
        message: 'Teacher already assigned - no change needed'
      });
    }
    
    // Different teacher - automatically replace
    // Log the replacement for audit purposes
    console.log(`Replacing teacher ${schedule.teacherId} with ${teacher.teacherId} on schedule ${scheduleId}`);
  }
  
  // Update schedule with new teacher
  schedule.teacherId = teacher.teacherId;
  schedule.teacherName = teacher.teacherName;
  schedule.teacherEmail = teacher.teacherEmail;
  await schedule.save();
  
  return res.status(200).json({
    status: 'success',
    message: schedule.teacherId ? 'Teacher replaced successfully' : 'Teacher assigned successfully'
  });
});
```

### Benefits

- ✅ No changes needed in HRMS code
- ✅ Single endpoint handles both assignment and replacement
- ✅ Simple and intuitive behavior
- ✅ No breaking changes to existing API

### Response Format

**Success (200 OK) - Replacement:**
```json
{
  "status": "success",
  "message": "Teacher replaced successfully",
  "previousTeacher": {
    "teacherId": "2026-0002",
    "teacherName": "Previous Teacher Name"
  }
}
```

---

## Option 2: Support Unassignment + Assignment

Allow HRMS to unassign first, then assign new teacher.

### Implementation

Update `/api/hrms/assign-teacher` to accept `teacher: null` for unassignment:

**Request for Unassignment:**
```json
{
  "scheduleId": 123,
  "teacher": null
}
```

**Request for Assignment:**
```json
{
  "scheduleId": 123,
  "teacher": {
    "teacherId": "2026-0001",
    "teacherName": "Dr. Maria Santos",
    "teacherEmail": "maria@school.edu"
  }
}
```

### Code Example (SIS Side)

```javascript
router.post('/api/hrms/assign-teacher', async (req, res) => {
  const { scheduleId, teacher } = req.body;
  
  const schedule = await Schedule.findByPk(scheduleId);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  
  if (teacher === null) {
    // Unassignment
    schedule.teacherId = null;
    schedule.teacherName = null;
    schedule.teacherEmail = null;
    await schedule.save();
    
    return res.status(200).json({
      status: 'success',
      message: 'Teacher unassigned successfully'
    });
  }
  
  // Assignment
  schedule.teacherId = teacher.teacherId;
  schedule.teacherName = teacher.teacherName;
  schedule.teacherEmail = teacher.teacherEmail;
  await schedule.save();
  
  return res.status(200).json({
    status: 'success',
    message: 'Teacher assigned successfully'
  });
});
```

### Benefits

- ✅ Explicit control over unassignment
- ✅ Can be used for other scenarios (removing teachers)

### Drawbacks

- ❌ Requires two API calls from HRMS (unassign, then assign)
- ❌ More complex error handling
- ❌ Potential race conditions between calls

---

## Option 3: Separate Update Endpoint

Create a new endpoint specifically for replacing teachers.

### Implementation

**New Endpoint:**
```
PATCH /api/hrms/schedules/{scheduleId}/teacher
```

**Request:**
```json
{
  "teacher": {
    "teacherId": "2026-0001",
    "teacherName": "Dr. Maria Santos",
    "teacherEmail": "maria@school.edu"
  }
}
```

### Benefits

- ✅ Clear separation of concerns
- ✅ RESTful design

### Drawbacks

- ❌ Requires HRMS code changes
- ❌ More endpoints to maintain
- ❌ More complex implementation

---

## Recommendation: Option 1 (Automatic Replacement)

**We recommend Option 1** because:

1. **Simplest for SIS to implement** - Just update the existing endpoint logic
2. **No HRMS changes needed** - Works with current HRMS code
3. **Intuitive behavior** - "Assign teacher" naturally means "assign or replace"
4. **Single API call** - More efficient than two calls
5. **No breaking changes** - Existing functionality continues to work

### Implementation Steps for SIS

1. Update `/api/hrms/assign-teacher` endpoint
2. Remove the 409 conflict check for different teachers
3. Instead, automatically replace the existing teacher
4. Optionally log the replacement for audit purposes
5. Return success with appropriate message

### Testing

SIS should test:
- ✅ Assigning teacher to unassigned schedule
- ✅ Assigning same teacher again (idempotent)
- ✅ Replacing existing teacher with new teacher
- ✅ Error handling for invalid scheduleId
- ✅ Error handling for invalid teacher data

---

## Current HRMS Behavior

After SIS implements automatic replacement, HRMS will:

1. ✅ Successfully sync teacher assignments
2. ✅ Automatically replace teachers when edited
3. ✅ Show success messages to users
4. ✅ No longer show "manual unassignment required" errors

---

## Questions for SIS Team

1. Which option do you prefer to implement?
2. Do you need audit logging for teacher replacements?
3. Should there be any restrictions on who can replace teachers?
4. Do you want notifications when teachers are replaced?

---

## Contact

For questions about HRMS integration requirements, contact the HRMS development team.
