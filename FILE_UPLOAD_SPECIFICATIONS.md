# File Upload Specifications

This document outlines all file upload specifications, including file type restrictions and size limits, implemented across the HRMS application.

## Table of Contents
- [Overview](#overview)
- [File Size Limits](#file-size-limits)
- [Allowed File Types](#allowed-file-types)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [Validation Utilities](#validation-utilities)

## Overview

All file uploads in the HRMS application are validated both on the frontend (client-side) and backend (server-side) to ensure:
- Files are of acceptable types
- Files don't exceed size limits
- Uploads are secure and efficient

## File Size Limits

The following file size limits are enforced across the application:

| Upload Type | Maximum Size | Purpose |
|------------|--------------|---------|
| **Resumes** | 5 MB | Candidate/applicant resumes |
| **Documents** | 10 MB | Faculty/employee documents |
| **Images** | 5 MB | Profile pictures and image uploads |
| **CSV Files** | 5 MB | Bulk import files |
| **Evidence** | 10 MB | Disciplinary evidence files |
| **Certificates** | 10 MB | Employee certificates |

## Allowed File Types

### 1. Resumes (Candidates/Applicants)
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.odt`, `.rtf`, `.txt`
- **MIME Types**:
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.oasis.opendocument.text`
  - `application/rtf`
  - `text/plain`
- **Size Limit**: 5 MB
- **Use Cases**:
  - Public job applications
  - Manual candidate additions
  - Candidate profile updates

### 2. Faculty/Employee Documents
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.odt`, `.rtf`, `.txt`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **MIME Types**: All document types + image types
- **Size Limit**: 10 MB
- **Use Cases**:
  - Faculty document submissions
  - Employee document management
  - Required compliance documents

### 3. Images
- **Extensions**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **MIME Types**:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`
- **Size Limit**: 5 MB
- **Use Cases**:
  - Profile pictures
  - Avatar uploads
  - General image uploads

### 4. CSV Files (Bulk Import)
- **Extensions**: `.csv`
- **MIME Types**:
  - `text/csv`
  - `application/csv`
  - `application/vnd.ms-excel`
- **Size Limit**: 5 MB
- **Use Cases**:
  - Employee bulk import
  - Candidate bulk import
  - Vacancy bulk import
  - Faculty bulk import
  - Disciplinary records import
  - Disciplinary actions import

### 5. Disciplinary Evidence
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **MIME Types**: Selected document types + image types
- **Size Limit**: 10 MB
- **Use Cases**:
  - Evidence files for disciplinary cases
  - Supporting documentation

### 6. Certificates
- **Extensions**: `.pdf`, `.jpg`, `.jpeg`, `.png`
- **MIME Types**:
  - `application/pdf`
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
- **Size Limit**: 10 MB
- **Use Cases**:
  - Employee professional certificates
  - Training certificates
  - Certifications and licenses

## API Endpoints

### General Upload
- **Endpoint**: `/api/upload`
- **Method**: POST
- **File Type**: Images
- **Validation**: Server-side validation using `validateImageFile()`

### Candidate/Applicant Resumes
- **Endpoint**: `/api/candidates/public` (public applications)
- **Endpoint**: `/api/candidates` (admin-created candidates)
- **Method**: POST
- **File Type**: Documents (resumes)
- **Validation**: Server-side validation using `validateResumeFile()`

### Faculty Documents
- **Endpoint**: `/api/faculty-documents`
- **Method**: POST
- **File Type**: Faculty documents
- **Validation**: Server-side validation using `validateFacultyDocumentFile()`

### Disciplinary Evidence
- **Endpoint**: `/api/disciplinary/[id]/evidence`
- **Method**: POST
- **File Type**: Evidence files
- **Validation**: Server-side validation using `validateEvidenceFile()`

### Employee Certificates
- **Endpoint**: `/api/employees/[employeeId]/certificates`
- **Method**: POST
- **File Type**: Certificates
- **Validation**: Server-side validation using `validateCertificateFile()`

### CSV Imports
Multiple endpoints for bulk imports:
- `/api/employees/import` - Employee bulk import
- `/api/candidates/import` - Candidate bulk import
- `/api/vacancies/import` - Vacancy bulk import
- `/api/faculty/import` - Faculty bulk import
- `/api/disciplinary/import` - Disciplinary records import
- `/api/disciplinary/actions/import` - Disciplinary actions import
- **Method**: POST
- **File Type**: CSV
- **Validation**: Server-side validation using `validateCSVFile()`

## Frontend Components

### Components with File Upload Validation

#### 1. ApplicantPage
- **Location**: `src/components/ApplicantPage.tsx`
- **Upload Type**: Resume
- **Accept Attribute**: `.pdf,.doc,.docx`
- **UI Message**: "Maximum file size: 5MB"
- **Client Validation**: Yes

#### 2. DocumentsFaculty
- **Location**: `src/components/DocumentsFaculty.tsx`
- **Upload Type**: Faculty documents
- **Accept Attribute**: Dynamic based on document type from `AcceptedFileTypes`
- **UI Message**: Varies by document type
- **Client Validation**: Yes

#### 3. CaseViewModal (Disciplinary Evidence)
- **Location**: `src/components/disciplinary/CaseViewModal.tsx`
- **Upload Type**: Evidence files
- **Accept Attribute**: `image/*,.pdf,.doc,.docx`
- **UI Message**: "Images, PDFs, and documents (Max 10MB per file)"
- **Client Validation**: Yes
- **Features**: Multiple file upload support

#### 4. CertificatesTab
- **Location**: `src/components/tabs/CertificatesTab.tsx`
- **Upload Type**: Certificates
- **Accept Attribute**: `.pdf,.jpg,.jpeg,.png`
- **UI Message**: "Maximum file size: 10MB. Accepted formats: PDF, JPG, PNG"
- **Client Validation**: Yes

#### 5. EmployeeContentNew (CSV Import)
- **Location**: `src/components/EmployeeContentNew.tsx`
- **Upload Type**: CSV
- **Accept Attribute**: `.csv`
- **UI Message**: "Maximum file size: 5MB"
- **Client Validation**: Yes

#### 6. CandidatesTab
- **Location**: `src/components/recruitment/CandidatesTab.tsx`
- **Upload Types**:
  - Resume: `.doc,.docx,.odt,.pdf,.rtf,.txt` (5MB)
  - CSV Import: `.csv` (5MB)
- **UI Messages**: Shown for both upload types
- **Client Validation**: Yes

#### 7. VacanciesTab
- **Location**: `src/components/recruitment/VacanciesTab.tsx`
- **Upload Type**: CSV
- **Accept Attribute**: `.csv`
- **UI Message**: "Maximum file size: 5MB"
- **Client Validation**: Yes

#### 8. DisciplinaryContent (CSV Import)
- **Location**: `src/components/disciplinary/DisciplinaryContent.tsx`
- **Upload Type**: CSV
- **Accept Attribute**: `.csv`
- **UI Message**: Includes required columns and "Maximum file size: 5MB"
- **Client Validation**: Yes

#### 9. EmployeeDocumentsTab (CSV Import)
- **Location**: `src/components/tabs/EmployeeDocumentsTab.tsx`
- **Upload Type**: CSV
- **Accept Attribute**: `.csv`
- **UI Message**: "Maximum file size: 5MB"
- **Client Validation**: Yes (hidden input with button trigger)

## Validation Utilities

### Core Validation Module
**Location**: `src/lib/fileValidation.ts`

This module provides centralized file validation utilities used throughout the application.

#### Key Functions

##### 1. `validateFile()`
Generic file validation function that checks:
- File existence
- File size against limit
- File extension
- MIME type

##### 2. Specialized Validators
- `validateResumeFile()` - For candidate resumes
- `validateFacultyDocumentFile()` - For faculty/employee documents
- `validateCSVFile()` - For CSV imports
- `validateImageFile()` - For image uploads
- `validateEvidenceFile()` - For disciplinary evidence
- `validateCertificateFile()` - For employee certificates

##### 3. Helper Functions
- `validateFileSize()` - Check file size
- `validateFileMimeType()` - Check MIME type
- `validateFileExtension()` - Check file extension
- `formatFileSize()` - Format bytes to readable size
- `getFileValidationErrorMessage()` - Get user-friendly error messages

#### Constants Exported
- `FILE_SIZE_LIMITS` - Object with all size limits
- `ALLOWED_MIME_TYPES` - Object with allowed MIME types by category
- `ALLOWED_EXTENSIONS` - Object with allowed extensions by category
- `FILE_INPUT_ACCEPT` - Object with accept attribute values for HTML inputs

### Usage Example

```typescript
import { validateResumeFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

// Validate a resume file
const validation = validateResumeFile(file, true);
if (!validation.valid) {
  return NextResponse.json(
    { error: validation.error },
    { status: 400 }
  );
}

// Additional size check
if (file.size > FILE_SIZE_LIMITS.RESUME) {
  return NextResponse.json(
    { error: `File size exceeds maximum limit` },
    { status: 400 }
  );
}
```

## Security Considerations

1. **Dual Validation**: All uploads are validated on both client and server side
2. **Extension Check**: Primary validation uses file extensions (more reliable)
3. **MIME Type Check**: Secondary validation (can be spoofed but provides additional layer)
4. **Size Limits**: Enforced to prevent DoS attacks and storage issues
5. **Sanitized Filenames**: Server generates unique, sanitized filenames
6. **Storage**: Files stored in secure cloud storage (Supabase/Google Drive)

## User Experience

### Error Messages
All validation errors provide clear, user-friendly messages:
- "File size must be less than 5MB"
- "Invalid file extension. Allowed extensions: .pdf, .doc, .docx"
- "Invalid file type. Please upload a CSV file"

### Visual Feedback
- File size limits shown near upload inputs
- Accepted file types listed in UI
- Real-time feedback on file selection
- Clear error messages on validation failure

## Maintenance

When adding new upload types:
1. Add size limit to `FILE_SIZE_LIMITS` in `fileValidation.ts`
2. Add allowed types to `ALLOWED_MIME_TYPES` and `ALLOWED_EXTENSIONS`
3. Create specialized validator function if needed
4. Update API endpoint with validation
5. Update frontend component with accept attribute and UI messages
6. Update this documentation

## Related Files

- `src/lib/fileValidation.ts` - Core validation utilities
- `src/lib/formValidation.ts` - Form field validation (non-file)
- `src/app/api/*/route.ts` - API endpoints with file upload
- `src/components/**/*.tsx` - Frontend components with file inputs

## Testing Checklist

When testing file uploads:
- [ ] Test with valid file types
- [ ] Test with invalid file types
- [ ] Test with files at size limit
- [ ] Test with files exceeding size limit
- [ ] Test with empty files
- [ ] Test with missing files (when required)
- [ ] Test with special characters in filename
- [ ] Verify error messages are clear
- [ ] Verify accept attribute works in all browsers
- [ ] Verify both client and server validation work

---

**Last Updated**: January 2026  
**Maintained By**: Development Team
