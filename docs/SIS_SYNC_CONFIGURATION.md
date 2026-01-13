# SIS Sync Configuration Guide

This guide explains how to configure and enable bidirectional sync between HRMS and SIS for schedule assignments.

## Overview

By default, HRMS only creates schedule assignments locally. When you assign a teacher in HRMS, it stores the assignment in the HRMS database but does not update SIS. This creates "HRMS Only" assignments.

To enable bidirectional sync (so HRMS assignments are also sent to SIS), you need to:

1. **Confirm SIS has an update endpoint** - Ask the SIS team if they have an API endpoint to receive schedule assignment updates
2. **Configure environment variables** - Set the sync configuration in `.env.local`
3. **Enable sync** - Set `SIS_SYNC_ENABLED=true`

---

## Environment Variables

Add these variables to your `.env.local` file:

```env
# SIS Sync Configuration (Optional)
# Set to "true" to enable syncing assignments to SIS
SIS_SYNC_ENABLED=false

# SIS API endpoint for updating schedule assignments
# Default: /api/hrms/assign-teacher
# Update this if SIS uses a different endpoint
SIS_UPDATE_ENDPOINT=/api/hrms/assign-teacher
```

**Required if sync is enabled:**
- `ENROLLMENT_BASE_URL` - SIS base URL (already required for fetching)
- `SJSFI_SHARED_SECRET` - Shared secret for HMAC authentication (already required)
- `SJSFI_HRMS_API_KEY` - HRMS API key recognized by SIS (already required)

---

## How It Works

### When Sync is Disabled (Default)

```
HRMS Assignment → HRMS Database Only
                → SIS: Not updated
                → Status: "HRMS Only" (orange badge)
```

- Assignments are created in HRMS database
- SIS is not notified
- UI shows "HRMS Only" badge
- This is the current behavior

### When Sync is Enabled

```
HRMS Assignment → HRMS Database
                → Attempts to sync to SIS
                → If successful: Status "Synced" (green badge)
                → If failed: Status "HRMS Only" (orange badge)
```

- Assignments are created in HRMS database
- HRMS attempts to POST assignment to SIS
- If SIS endpoint exists and accepts the update: Status becomes "Synced"
- If SIS endpoint doesn't exist (404) or fails: Status remains "HRMS Only"
- **HRMS assignment is always created** - sync failure doesn't prevent assignment

---

## SIS Endpoint Requirements

If you want to enable sync, the SIS team needs to provide an endpoint that:

### Endpoint
```
POST {ENROLLMENT_BASE_URL}/api/hrms/assign-teacher
```
(Or whatever endpoint is set in `SIS_UPDATE_ENDPOINT`)

### Request Format

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {SJSFI_HRMS_API_KEY}
x-timestamp: {UNIX_TIMESTAMP_IN_MILLISECONDS}
x-signature: {HMAC_SHA256_SIGNATURE}
```

**Body:**
```json
{
  "scheduleId": 7,
  "teacher": {
    "teacherId": "2026-0001",
    "teacherName": "Dr. Maria Santos",
    "teacherEmail": "maria@school.edu"
  }
}
```

**Fields:**
- `scheduleId` (number) - The SIS schedule ID (from the schedule data)
- `teacher` (object) - Teacher information object
  - `teacherId` (string) - HRMS Employee ID (e.g., "2026-0001")
  - `teacherName` (string) - Full name of the teacher (FirstName + LastName)
  - `teacherEmail` (string) - Email address of the teacher

### Authentication

Uses the same HMAC-SHA256 authentication as the fetch operations:
- Shared secret: `SJSFI_SHARED_SECRET`
- API Key: `SJSFI_HRMS_API_KEY`
- Signature: `HMAC-SHA256(body + timestamp, shared_secret)`

### Expected Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Schedule assignment updated successfully"
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Error message",
  "details": "..."
}
```

---

## Configuration Steps

### Step 1: Check with SIS Team

Ask the SIS team:
1. Do you have an API endpoint to update schedule assignments?
2. What's the endpoint URL?
3. What's the request format?
4. Does it use the same authentication (HMAC-SHA256)?

### Step 2: Configure Environment Variables

If SIS has an endpoint:

1. Open `.env.local`
2. Add or update:
   ```env
   SIS_SYNC_ENABLED=true
   SIS_UPDATE_ENDPOINT=/api/hrms/assign-teacher  # Or whatever endpoint SIS provides
   ```
3. Restart your dev server

### Step 3: Test Sync

1. Assign a teacher to a schedule in HRMS
2. Check the response in browser DevTools (Network tab)
3. Look for `sync` field in the response:
   ```json
   {
     "success": true,
     "message": "Teacher assigned successfully and synced to SIS",
     "schedule": {...},
     "sync": {
       "success": true,
       "synced": true,
       "message": "Assignment synced to SIS successfully"
     }
   }
   ```
4. Check SIS to verify the assignment appears
5. Check HRMS UI - should show "Synced" badge (green) instead of "HRMS Only"

---

## Error Handling

The sync is designed to be **graceful**:

### Endpoint Not Found (404)

If SIS endpoint doesn't exist:
- HRMS assignment is still created ✅
- Sync returns `synced: false` with message
- UI shows "HRMS Only" badge
- No error is thrown

**Example response:**
```json
{
  "success": true,
  "message": "Teacher assigned successfully (SIS sync endpoint not available (404). Assignment saved in HRMS only.)",
  "sync": {
    "success": true,
    "synced": false,
    "message": "SIS sync endpoint not available (404). Assignment saved in HRMS only."
  }
}
```

### Other Errors (401, 403, 500, etc.)

If sync fails for other reasons:
- HRMS assignment is still created ✅
- Error is logged to console
- Sync returns `synced: false` with error message
- UI shows "HRMS Only" badge
- No error is thrown

**Example response:**
```json
{
  "success": true,
  "message": "Teacher assigned successfully (Assignment saved in HRMS, but sync to SIS failed.)",
  "sync": {
    "success": true,
    "synced": false,
    "error": "SIS sync failed: Unauthorized",
    "message": "Assignment saved in HRMS, but sync to SIS failed."
  }
}
```

### Network Errors

If network request fails:
- HRMS assignment is still created ✅
- Error is logged to console
- Sync returns `synced: false`
- UI shows "HRMS Only" badge
- No error is thrown

---

## Current Status

### Default Behavior (Sync Disabled)

- ✅ Assignments created in HRMS
- ❌ Assignments NOT synced to SIS
- 🟠 UI shows "HRMS Only" badge

### With Sync Enabled (If SIS Endpoint Exists)

- ✅ Assignments created in HRMS
- ✅ Assignments synced to SIS
- 🟢 UI shows "Synced" badge

### With Sync Enabled (If SIS Endpoint Doesn't Exist)

- ✅ Assignments created in HRMS
- ❌ Sync attempted but endpoint not found (404)
- 🟠 UI shows "HRMS Only" badge
- 📝 Console shows warning about endpoint not found

---

## Troubleshooting

### Sync Not Working

1. **Check environment variables:**
   ```bash
   # Make sure these are set
   echo $SIS_SYNC_ENABLED
   echo $SIS_UPDATE_ENDPOINT
   echo $ENROLLMENT_BASE_URL
   echo $SJSFI_SHARED_SECRET
   echo $SJSFI_HRMS_API_KEY
   ```

2. **Check server logs:**
   - Look for `[SIS Sync]` messages in console
   - Check for errors or warnings

3. **Check browser Network tab:**
   - Find the assignment POST request
   - Check response for `sync` field
   - Look at sync result message

4. **Verify SIS endpoint:**
   ```bash
   # Test if endpoint exists (replace with your values)
   curl -X POST https://sjsfi-enrollment.vercel.app/api/hrms/assign-teacher \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{"scheduleId": 7, "teacher": {"teacherId": "2026-0001", "teacherName": "Dr. Maria Santos", "teacherEmail": "maria@school.edu"}}'
   ```

### Sync Enabled but Showing "HRMS Only"

- Check if SIS endpoint exists (should get 404 if it doesn't)
- Check authentication (should get 401/403 if keys are wrong)
- Check SIS logs for errors
- Verify request format matches what SIS expects

---

## Summary

1. **Sync is disabled by default** - Set `SIS_SYNC_ENABLED=true` to enable
2. **Sync is optional** - HRMS assignments work fine without it
3. **Sync failures are graceful** - Assignment is always created in HRMS
4. **SIS endpoint must exist** - Sync only works if SIS provides the endpoint
5. **UI shows sync status** - Green "Synced" badge vs Orange "HRMS Only" badge

For questions or issues, check with the SIS team about endpoint availability and format.
