// File validation utilities for uploads

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// File size constants (in bytes)
export const FILE_SIZE_LIMITS = {
  RESUME: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  CSV: 5 * 1024 * 1024, // 5MB
  EVIDENCE: 10 * 1024 * 1024, // 10MB
  CERTIFICATE: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed MIME types for different file categories
export const ALLOWED_MIME_TYPES = {
  // Document types (resumes, general documents)
  DOCUMENTS: [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.oasis.opendocument.text', // .odt
    'application/rtf',
    'text/plain',
  ],
  
  // Image types
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  
  // CSV files
  CSV: [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
  ],
  
  // Evidence files (documents + images)
  EVIDENCE: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  
  // Faculty/Employee documents (all document types + images)
  FACULTY_DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  
  // Certificates (PDFs and images)
  CERTIFICATES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
} as const;

// File extension mappings
export const ALLOWED_EXTENSIONS = {
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt'],
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  CSV: ['.csv'],
  EVIDENCE: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
  FACULTY_DOCUMENTS: ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
  CERTIFICATES: ['.pdf', '.jpg', '.jpeg', '.png'],
} as const;

// Accept attribute values for HTML file inputs
export const FILE_INPUT_ACCEPT = {
  DOCUMENTS: '.pdf,.doc,.docx,.odt,.rtf,.txt',
  IMAGES: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
  CSV: '.csv',
  EVIDENCE: '.pdf,.doc,.docx,image/*',
  FACULTY_DOCUMENTS: '.pdf,.doc,.docx,.odt,.rtf,.txt,image/*',
  CERTIFICATES: '.pdf,image/jpeg,image/jpg,image/png',
} as const;

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate file MIME type
 */
export function validateFileMimeType(file: File, allowedTypes: readonly string[]): FileValidationResult {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(file: File, allowedExtensions: readonly string[]): FileValidationResult {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(
  file: File | null | undefined,
  options: {
    maxSize: number;
    allowedMimeTypes: readonly string[];
    allowedExtensions: readonly string[];
    required?: boolean;
  }
): FileValidationResult {
  const { maxSize, allowedMimeTypes, allowedExtensions, required = true } = options;

  // Check if file is provided
  if (!file) {
    return required
      ? { valid: false, error: 'No file provided' }
      : { valid: true };
  }

  // Validate file size
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Validate file extension (primary check)
  const extensionValidation = validateFileExtension(file, allowedExtensions);
  if (!extensionValidation.valid) {
    return extensionValidation;
  }

  // Validate MIME type (secondary check, as it can be spoofed)
  // Only check if the browser provided a MIME type
  if (file.type) {
    const mimeValidation = validateFileMimeType(file, allowedMimeTypes);
    if (!mimeValidation.valid) {
      return mimeValidation;
    }
  }

  return { valid: true };
}

/**
 * Validate resume file
 */
export function validateResumeFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  return validateFile(file, {
    maxSize: FILE_SIZE_LIMITS.RESUME,
    allowedMimeTypes: ALLOWED_MIME_TYPES.DOCUMENTS,
    allowedExtensions: ALLOWED_EXTENSIONS.DOCUMENTS,
    required,
  });
}

/**
 * Validate faculty/employee document file
 */
export function validateFacultyDocumentFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  return validateFile(file, {
    maxSize: FILE_SIZE_LIMITS.DOCUMENT,
    allowedMimeTypes: ALLOWED_MIME_TYPES.FACULTY_DOCUMENTS,
    allowedExtensions: ALLOWED_EXTENSIONS.FACULTY_DOCUMENTS,
    required,
  });
}

/**
 * Validate CSV file
 */
export function validateCSVFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  if (!file) {
    return required
      ? { valid: false, error: 'No file provided' }
      : { valid: true };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a CSV file.',
    };
  }

  // Check file size
  const sizeValidation = validateFileSize(file, FILE_SIZE_LIMITS.CSV);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

/**
 * Validate image file
 */
export function validateImageFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  return validateFile(file, {
    maxSize: FILE_SIZE_LIMITS.IMAGE,
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGES,
    allowedExtensions: ALLOWED_EXTENSIONS.IMAGES,
    required,
  });
}

/**
 * Validate evidence file (for disciplinary records)
 */
export function validateEvidenceFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  return validateFile(file, {
    maxSize: FILE_SIZE_LIMITS.EVIDENCE,
    allowedMimeTypes: ALLOWED_MIME_TYPES.EVIDENCE,
    allowedExtensions: ALLOWED_EXTENSIONS.EVIDENCE,
    required,
  });
}

/**
 * Validate certificate file
 */
export function validateCertificateFile(file: File | null | undefined, required: boolean = true): FileValidationResult {
  return validateFile(file, {
    maxSize: FILE_SIZE_LIMITS.CERTIFICATE,
    allowedMimeTypes: ALLOWED_MIME_TYPES.CERTIFICATES,
    allowedExtensions: ALLOWED_EXTENSIONS.CERTIFICATES,
    required,
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Get user-friendly error message for file validation
 */
export function getFileValidationErrorMessage(
  fileType: 'RESUME' | 'DOCUMENT' | 'IMAGE' | 'CSV' | 'EVIDENCE' | 'CERTIFICATE'
): string {
  const limits = {
    RESUME: { size: '5MB', types: 'PDF, DOC, DOCX, ODT, RTF, TXT' },
    DOCUMENT: { size: '10MB', types: 'PDF, DOC, DOCX, ODT, RTF, TXT, Images' },
    IMAGE: { size: '5MB', types: 'JPG, PNG, GIF, WEBP' },
    CSV: { size: '5MB', types: 'CSV' },
    EVIDENCE: { size: '10MB', types: 'PDF, DOC, DOCX, Images' },
    CERTIFICATE: { size: '10MB', types: 'PDF, JPG, PNG' },
  };

  const limit = limits[fileType];
  return `Maximum file size: ${limit.size}. Allowed types: ${limit.types}`;
}
