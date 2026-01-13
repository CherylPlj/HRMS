# SIS Sync Guide - Subjects and Sections

This guide explains how to sync subjects and sections from SIS to HRMS using three different methods.

## Overview

The sync functionality extracts unique subjects and sections from SIS schedules and imports them into HRMS. This ensures that your HRMS database has the same subjects and sections as SIS, eliminating "Not in HRMS" warnings.

## Prerequisites

1. **Environment Variables** must be set in `.env.local`:
   ```env
   ENROLLMENT_BASE_URL=https://sjsfi-enrollment.vercel.app
   SJSFI_SHARED_SECRET=your_shared_secret_here
   SJSFI_HRMS_API_KEY=your_hrms_api_key_here
   ```

2. **SIS Connection** - Make sure SIS enrollment system is accessible

---

## Method 1: Using the UI Button (Recommended)

### Steps:

1. Navigate to **Dashboard > Admin > Schedules and Loads**
2. Click on the **"SIS Schedules"** tab
3. Click the **"Sync Subjects & Sections"** button (blue button)
4. Wait for the sync to complete
5. You'll see a success message with the number of items imported

### What it does:
- Fetches all schedules from SIS
- Extracts unique subjects and sections
- Creates new records or updates existing ones
- Does NOT delete any existing data (safe sync)

---

## Method 2: Using npm Scripts

### Basic Sync (No deletion)

```bash
npm run sync:sis
```

This command will:
- Fetch schedules from SIS
- Extract unique subjects and sections
- Import/update them in HRMS
- Keep all existing experimental data

### Sync with Cleanup (Removes unused experimental data)

```bash
npm run sync:sis:clear
```

This command will:
- Fetch schedules from SIS
- Extract unique subjects and sections
- Delete subjects/sections that:
  - Are not in the SIS data
  - Are not used by any schedules (safe deletion)
- Import/update subjects and sections from SIS

### Example Output:

```
🔄 Starting sync from SIS...

📡 Fetching schedules from SIS...
✅ Fetched 5 schedules from SIS

📚 Found 5 unique subjects
📁 Found 1 unique sections

📝 Syncing subjects...
✅ Subjects: 5 created, 0 updated

📝 Syncing sections...
✅ Sections: 1 created, 0 updated

🎉 Sync completed successfully!

Summary:
  Subjects: 5 created, 0 updated
  Sections: 1 created, 0 updated
```

---

## Method 3: Using API (Postman/curl)

### Preview (GET) - See what will be imported

**cURL:**
```bash
curl -X GET http://localhost:3000/api/sync/subjects-sections-from-sis
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/sync/subjects-sections-from-sis`
- Headers: None required (uses server-side authentication)

**Response:**
```json
{
  "success": true,
  "preview": true,
  "subjects": {
    "count": 5,
    "data": [
      {
        "sisId": 7,
        "name": "English 1",
        "code": "ENG1"
      },
      ...
    ]
  },
  "sections": {
    "count": 1,
    "data": [
      {
        "sisId": 1,
        "name": "Section 1",
        "capacity": 30,
        "gradeLevel": "Grade 1"
      }
    ]
  }
}
```

### Sync (POST) - Import data

**cURL - Basic Sync (No deletion):**
```bash
curl -X POST http://localhost:3000/api/sync/subjects-sections-from-sis \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": false}'
```

**cURL - Sync with Cleanup:**
```bash
curl -X POST http://localhost:3000/api/sync/subjects-sections-from-sis \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": true}'
```

**Postman:**
1. Method: `POST`
2. URL: `http://localhost:3000/api/sync/subjects-sections-from-sis`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "clearExisting": false
   }
   ```
   Or for cleanup:
   ```json
   {
     "clearExisting": true
   }
   ```

**Response:**
```json
{
  "success": true,
  "message": "Subjects and sections synced from SIS",
  "results": {
    "subjects": {
      "total": 5,
      "created": 5,
      "updated": 0,
      "errors": 0
    },
    "sections": {
      "total": 1,
      "created": 1,
      "updated": 0,
      "errors": 0
    }
  },
  "errors": {
    "subjects": [],
    "sections": []
  }
}
```

### Postman Collection Example

Create a new request in Postman:

1. **Preview Request**
   - Name: "Preview SIS Sync"
   - Method: `GET`
   - URL: `{{baseUrl}}/api/sync/subjects-sections-from-sis`
   - Environment Variable: `baseUrl = http://localhost:3000`

2. **Sync Request**
   - Name: "Sync from SIS (Safe)"
   - Method: `POST`
   - URL: `{{baseUrl}}/api/sync/subjects-sections-from-sis`
   - Body (raw JSON):
     ```json
     {
       "clearExisting": false
     }
     ```

3. **Sync with Cleanup Request**
   - Name: "Sync from SIS (Cleanup)"
   - Method: `POST`
   - URL: `{{baseUrl}}/api/sync/subjects-sections-from-sis`
   - Body (raw JSON):
     ```json
     {
       "clearExisting": true
     }
     ```

---

## What Gets Synced?

The sync extracts unique data from SIS schedules:

### Subjects:
- **Name** (e.g., "English 1", "Mathematics 1")
- **Code** (e.g., "ENG1", "MATH1")
- Sets `isActive = true`

### Sections:
- **Name** (e.g., "Section 1")
- **Capacity** (if available)
- **Grade Level** (extracted from schedule's yearLevel)
- Sets `isActive = true`

---

## Safety Features

1. **Upsert Logic**: Uses `upsert` to safely create or update records (no duplicates)
2. **Safe Deletion**: When `clearExisting: true`, only deletes records that:
   - Are not in the SIS data
   - Have no schedules referencing them
3. **Error Handling**: Errors are collected and reported without stopping the entire sync
4. **Transaction Safety**: Each record is processed individually (if one fails, others continue)

---

## Troubleshooting

### Error: "Missing environment variables"
**Solution**: Make sure `.env.local` has all required variables set and restart your dev server.

### Error: "Failed to fetch schedules: 401"
**Solution**: Check that `SJSFI_HRMS_API_KEY` and `SJSFI_SHARED_SECRET` are correct.

### Error: "Failed to fetch schedules: 404"
**Solution**: Verify `ENROLLMENT_BASE_URL` is correct and SIS is accessible.

### Sync completes but items still show "Not in HRMS"
**Solution**: 
1. Click "Refresh from SIS" to reload the schedules
2. Check that the subject/section names match exactly (case-sensitive matching)

### Duplicate key errors
**Solution**: The upsert logic handles this automatically. If you see errors, check the database for conflicting unique constraints (e.g., subject codes).

---

## Best Practices

1. **First Time Setup**: Run sync with `clearExisting: true` to clean up experimental data
2. **Regular Syncs**: Use `clearExisting: false` for regular updates (safer)
3. **Before Major Changes**: Always preview first using GET endpoint
4. **Backup**: Consider backing up your database before running sync with cleanup

---

## API Endpoint Details

- **GET** `/api/sync/subjects-sections-from-sis` - Preview only (no changes)
- **POST** `/api/sync/subjects-sections-from-sis` - Sync data
  - Body: `{ "clearExisting": boolean }` (default: false)
