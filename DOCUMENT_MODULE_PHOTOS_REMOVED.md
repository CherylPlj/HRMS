# Faculty Photos Removed from Admin Document Management

## Changes Made

Employee/faculty profile photos have been completely removed from the admin document management module to improve performance and simplify the UI.

### Files Modified

1. **src/components/tabs/EmployeeListTab.tsx**
   - Removed photo display from employee information cell
   - Removed Photo field from Employee interface
   - Simplified employee display to show only name and email

2. **src/components/tabs/EmployeeDocumentsTab.tsx**
   - Removed Photo field from Employee interface

3. **src/components/DocumentsContent.tsx**
   - Removed Photo field from Employee interface

4. **src/components/faculty/FacultyTable.tsx** (NEW)
   - Removed photo display from faculty information cell
   - Removed getProfilePhoto prop from interface
   - Simplified faculty display to show only name and email

5. **src/components/FacultyContent.tsx** (NEW)
   - Removed getProfilePhoto function definition
   - Removed getProfilePhoto prop when calling FacultyTable
   - Cleaned up unused photo logic

### UI Changes

**Before:**
- Employee and faculty lists showed circular avatar photos
- Photos loaded from data or default avatar
- Photo handling with fallback for missing images

**After:**
- Clean text-only display
- Names and emails displayed without photos
- More compact and faster-loading tables

### Performance Benefits

1. Eliminates image loading - No more HTTP requests for photos
2. Faster rendering - Simpler DOM structure
3. Reduced data transfer - Photos not fetched from API
4. Better performance - Especially with large lists
5. Cleaner UI - More focus on document information

### Visual Impact

Both employee and faculty lists now display:
- Name
- Email address
- Position
- Department
- Employment status
- Document submission status

All information is clearly visible without photos.
