# How to Sync to SIS - Quick Guide

## 🔄 Sync Existing Assignments (If You Already Assigned Teachers)

If you assigned teachers **before** enabling sync, you can sync them now:

### Quick Method: Use Browser Console

1. **Make sure sync is enabled** (see Step 1 below)
2. Open browser DevTools (F12) → **Console** tab
3. Run this command:
```javascript
fetch('/api/schedules/fetch-from-sis/sync-existing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(async r => {
  const data = await r.json();
  if (!r.ok) {
    console.error('❌ Sync Failed:', data.error || 'Unknown error');
    console.error('Full response:', data);
    return;
  }
  if (data.success && data.summary) {
    console.log('✅ Sync Complete!');
    console.log(`Synced: ${data.summary.synced}, Skipped: ${data.summary.skipped}, Errors: ${data.summary.errors}`);
    console.log('Full results:', data);
  } else {
    console.error('❌ Unexpected response format:', data);
  }
})
.catch(error => {
  console.error('❌ Network error:', error);
});
```

4. Check the console output for results

### Alternative: Use cURL or Postman

```bash
POST http://localhost:3000/api/schedules/fetch-from-sis/sync-existing
```

**What it does:**
- Fetches all schedules from SIS
- Matches them with your HRMS schedules
- Syncs all existing teacher assignments to SIS
- Returns a summary of what was synced

---

## 🚀 Quick Setup (3 Steps) - For New Assignments

### Step 1: Add Environment Variables

Open your `.env.local` file and add/update these variables:

```env
# Enable SIS Sync
SIS_SYNC_ENABLED=true

# SIS Endpoint (already set to the correct one)
SIS_UPDATE_ENDPOINT=/api/hrms/assign-teacher

# Required: Make sure these are already set
ENROLLMENT_BASE_URL=https://your-sis-url.com
SJSFI_SHARED_SECRET=your_shared_secret
SJSFI_HRMS_API_KEY=your_hrms_api_key
```

### Step 2: Restart Your Server

After updating `.env.local`, restart your development server:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### Step 3: Assign a Teacher

That's it! Sync happens **automatically** when you:

1. **Assign a teacher to a schedule** in HRMS
   - Go to: Schedules & Loads → SIS Schedules tab
   - Click "Assign Teacher" on any unassigned schedule
   - Select a teacher and confirm

2. **The sync happens automatically** in the background
   - HRMS creates the assignment locally
   - HRMS sends the assignment to SIS
   - You'll see the result in the response

---

## ✅ How to Verify Sync is Working

### Method 1: Check Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Assign a teacher to a schedule
4. Find the `POST /api/schedules/fetch-from-sis/assign-teacher` request
5. Check the **Response** tab - look for `sync` field:

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

✅ **If `synced: true`** → Sync is working!

❌ **If `synced: false`** → Check the `message` field for the reason

### Method 2: Check Server Console

Look for these log messages in your server console:

```
[SIS Sync] Attempting to sync assignment to SIS: https://your-sis-url.com/api/hrms/assign-teacher
[SIS Sync] Successfully synced assignment to SIS: scheduleId=7, employeeId=2026-0001
```

### Method 3: Check SIS System

1. Log into your SIS system
2. Navigate to the schedule that was assigned
3. Verify the teacher appears in SIS

### Method 4: Check UI Badge

In HRMS, schedules will show:
- 🟢 **"Synced"** badge (green) - Successfully synced to SIS
- 🟠 **"HRMS Only"** badge (orange) - Not synced (sync disabled or failed)

---

## 🔍 Troubleshooting

### Sync Not Working?

**1. Check if sync is enabled:**
```bash
# In your .env.local, make sure:
SIS_SYNC_ENABLED=true  # Must be exactly "true" (string)
```

**2. Check required environment variables:**
```bash
# All of these must be set:
ENROLLMENT_BASE_URL=https://your-sis-url.com
SJSFI_SHARED_SECRET=your_shared_secret
SJSFI_HRMS_API_KEY=your_hrms_api_key
```

**3. Check server logs:**
Look for `[SIS Sync]` messages in your console. Common issues:
- `Missing SJSFI_SHARED_SECRET` → Add the secret to `.env.local`
- `Missing SJSFI_HRMS_API_KEY` → Add the API key to `.env.local`
- `SIS endpoint not found (404)` → SIS endpoint doesn't exist yet
- `SIS sync failed: Unauthorized` → Wrong API key or secret

**4. Test SIS endpoint manually:**
```bash
curl -X POST https://your-sis-url.com/api/hrms/assign-teacher \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-timestamp: $(date +%s%3N)" \
  -H "x-signature: YOUR_SIGNATURE" \
  -d '{
    "scheduleId": 7,
    "teacher": {
      "teacherId": "2026-0001",
      "teacherName": "Dr. Maria Santos",
      "teacherEmail": "maria@school.edu"
    }
  }'
```

---

## 📋 When Does Sync Happen?

### Automatic Sync (New Assignments)

Sync happens **automatically** in these scenarios:

1. ✅ **Assigning a teacher** via `/api/schedules/fetch-from-sis/assign-teacher`
2. ✅ **Restoring original teacher** via `/api/schedules/fetch-from-sis/restore-original-teacher`

### Manual Sync (Existing Assignments)

If you assigned teachers **before** enabling sync, you can sync them now:

**Option 1: Using API Endpoint (Recommended)**

```bash
# Make a POST request to sync all existing assignments
curl -X POST http://localhost:3000/api/schedules/fetch-from-sis/sync-existing \
  -H "Content-Type: application/json"
```

Or use Postman/Thunder Client:
- **Method:** POST
- **URL:** `/api/schedules/fetch-from-sis/sync-existing`
- **Body:** (empty or `{}`)

**Option 2: Using Browser Console**

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Run:
```javascript
fetch('/api/schedules/fetch-from-sis/sync-existing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('Sync Results:', data));
```

**Response Example:**
```json
{
  "success": true,
  "message": "Sync complete: 15 synced, 3 skipped, 0 errors",
  "summary": {
    "total": 18,
    "synced": 15,
    "skipped": 3,
    "errors": 0
  },
  "results": [...]
}
```

### What Gets Synced?

- ✅ All HRMS schedules that have a teacher assigned
- ✅ Only schedules that match SIS schedules (by subject, section, day, time)
- ❌ Schedules without matching SIS schedule are skipped

### Sync Does NOT Happen For:

- ❌ Creating schedules directly via `/api/schedules` (POST)
- ❌ Manual database updates
- ❌ Bulk imports

---

## 🎯 What Gets Synced?

When you assign a teacher, HRMS sends this to SIS:

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

**Data source:**
- `scheduleId` - From the SIS schedule ID
- `teacherId` - From HRMS EmployeeID
- `teacherName` - From User FirstName + LastName
- `teacherEmail` - From User Email

---

## 🔒 Security

All sync requests use:
- **HMAC-SHA256 signature** for request verification
- **API Key authentication** via Bearer token
- **Timestamp validation** (must be within 5 minutes)

---

## 📝 Notes

- **Sync is graceful**: If sync fails, the assignment is still created in HRMS
- **Sync is optional**: HRMS works fine without it
- **Sync is one-way**: HRMS → SIS (assignments flow from HRMS to SIS)
- **No manual sync needed**: It happens automatically when you assign teachers

---

## 🆘 Still Having Issues?

1. Check the full documentation: `docs/SIS_SYNC_CONFIGURATION.md`
2. Verify all environment variables are set correctly
3. Check SIS endpoint is accessible and working
4. Review server console logs for detailed error messages

---

**Last Updated:** 2026-01-20
**Status:** Ready for Production
