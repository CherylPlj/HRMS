# SIS-HRMS Sync Status

## Current Status: One-Way Sync (SIS → HRMS Only)

### What Works Now:

1. **HRMS reads from SIS** ✅
   - HRMS can fetch schedules from SIS
   - HRMS displays schedules from SIS
   - HRMS can view which schedules are assigned/unassigned in SIS

2. **HRMS stores assignments locally** ✅
   - When you assign a teacher in HRMS, it creates a schedule in HRMS database
   - HRMS shows it as "assigned" in the HRMS interface
   - The assignment is stored in HRMS `schedules` table

### What Doesn't Work:

1. **HRMS does NOT update SIS** ❌
   - Assignments made in HRMS are NOT synced back to SIS
   - SIS will still show the schedule as "unassigned"
   - SIS doesn't know about HRMS assignments

---

## How to Verify Current Behavior

### To Check if Assignment Exists in HRMS:

1. **Via HRMS UI:**
   - Go to Dashboard > Admin > Schedules and Loads > SIS Schedules
   - Assign a teacher to a schedule
   - After refresh, you'll see it marked as "Assigned" in HRMS

2. **Via Database:**
   ```sql
   -- Check HRMS schedules table
   SELECT * FROM "Schedules" 
   WHERE "subjectId" = <subject_id> 
   AND "classSectionId" = <section_id>
   AND "day" = 'Monday'  -- or whatever day
   ORDER BY "createdAt" DESC;
   ```

### To Check if Assignment Exists in SIS:

1. **Via SIS UI:**
   - Go to SIS enrollment system: `https://sjsfi-enrollment.vercel.app/registrar/schedule`
   - Check the same schedule
   - **It will still show as "Unassigned"** (because HRMS doesn't update SIS)

2. **Via SIS API:**
   ```bash
   # Fetch schedules from SIS
   curl -X POST https://sjsfi-enrollment.vercel.app/api/hrms/available-schedules \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-api-key>" \
     -d '{"data": "fetch-all-schedules"}'
   
   # Check the "teacher.assigned" field - it will be false
   ```

---

## Options to Enable Bidirectional Sync

### Option 1: Implement SIS Update API (Recommended)

**Requires:** SIS team to create an API endpoint that HRMS can call to update assignments.

**What's needed:**
1. SIS API endpoint: `POST /api/hrms/update-schedule-assignment`
2. Endpoint should accept:
   ```json
   {
     "scheduleId": 123,
     "employeeId": "2026-0001",  // HRMS Employee ID
     "assigned": true
   }
   ```
3. HRMS calls this endpoint after creating assignment

**Implementation in HRMS:**
- Update `src/app/api/schedules/fetch-from-sis/assign-teacher/route.ts`
- After creating schedule in HRMS, also call SIS API to update

### Option 2: SIS Pulls from HRMS (Alternative)

**Requires:** SIS to periodically fetch assignments from HRMS.

**What's needed:**
1. HRMS API endpoint: `GET /api/xr/schedules/assignments` (expose HRMS assignments)
2. SIS periodically calls this endpoint
3. SIS updates its database based on HRMS data

### Option 3: Manual Sync (Current Workaround)

**For now, you can:**
1. Assign teachers in HRMS (for HRMS records)
2. Manually assign the same teachers in SIS (for SIS records)
3. Both systems maintain separate records

---

## Recommended Next Steps

1. **Ask SIS team:** Do they have an API endpoint to update schedule assignments?
2. **If YES:** We can implement Option 1 (HRMS calls SIS to update)
3. **If NO:** Consider Option 2 (SIS pulls from HRMS) or continue with Option 3 (manual sync)

---

## Testing Current Implementation

To test what's currently working:

```bash
# 1. Assign a teacher in HRMS UI
# 2. Check HRMS database
# 3. Verify it shows in HRMS UI
# 4. Check SIS - it will NOT show (expected behavior)
```

### Expected Results:

| Action | HRMS Database | HRMS UI | SIS Database | SIS UI |
|--------|--------------|---------|--------------|--------|
| Assign in HRMS | ✅ Created | ✅ Shows assigned | ❌ Not updated | ❌ Still unassigned |
| Assign in SIS | ❌ Not updated | ❌ Shows unassigned* | ✅ Updated | ✅ Shows assigned |

*HRMS will show SIS assignment when you refresh from SIS, but only if the teacher exists in HRMS by EmployeeID match.

---

## Questions for SIS Team

1. **Do you have an API endpoint to update schedule assignments?**
   - If yes, what's the endpoint URL?
   - What authentication is required?
   - What's the request/response format?

2. **Can HRMS send updates to SIS when teachers are assigned?**
   - What data format do you expect?
   - How should we identify schedules? (scheduleId, subjectId+sectionId+day+time, etc.)

3. **Do you prefer:**
   - HRMS pushes updates to SIS (Option 1)?
   - SIS pulls updates from HRMS (Option 2)?
   - Manual sync (Option 3)?

---

## Summary

**Current State:**
- ✅ HRMS can read from SIS
- ✅ HRMS stores assignments locally
- ❌ HRMS does NOT update SIS
- ⚠️ SIS will NOT reflect HRMS assignments

**To enable bidirectional sync, we need:**
- Coordination with SIS team
- API endpoint in SIS (preferred) OR HRMS (alternative)
- Implementation of sync logic

**For now:**
- Assignments in HRMS are local to HRMS only
- To verify: Check SIS directly - it won't show HRMS assignments
- This is expected behavior with current implementation
