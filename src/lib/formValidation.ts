// Validation and sanitization utilities for form inputs

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Sanitize string input - remove dangerous characters and trim
export const sanitizeString = (input: string | null | undefined, maxLength: number = 500): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

// Sanitize name field - only letters, spaces, hyphens, apostrophes, periods
export const sanitizeName = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Only allow letters, spaces, hyphens, apostrophes, periods
  sanitized = sanitized.replace(/[^a-zA-Z\s\-\'\.]/g, '');
  
  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
};

// Sanitize phone number - only digits, spaces, hyphens, parentheses, plus
export const sanitizePhone = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Only allow digits, spaces, hyphens, parentheses, plus
  sanitized = sanitized.replace(/[^0-9\s\-\+\(\)]/g, '');
  
  // Trim
  sanitized = sanitized.trim();
  
  return sanitized;
};

// Sanitize URL
export const sanitizeUrl = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = sanitizeString(input, 500);
  
  // Basic URL validation - ensure it starts with http:// or https://
  if (sanitized && !sanitized.match(/^https?:\/\//i)) {
    // If it doesn't start with protocol, add https://
    sanitized = 'https://' + sanitized;
  }
  
  return sanitized;
};

// Sanitize government ID number - only alphanumeric, spaces, hyphens
export const sanitizeGovtId = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Only allow alphanumeric, spaces, hyphens
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-]/g, '');
  
  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
};

// Validate email format
export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.trim().length > 100) {
    return { valid: false, error: 'Email must be less than 100 characters' };
  }
  
  return { valid: true };
};

// Validate phone number (Philippine format)
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Philippine phone number: starts with +63 or 0, followed by 9-10 digits
  if (digitsOnly.startsWith('63')) {
    // +63 format (12-13 digits total)
    if (digitsOnly.length < 12 || digitsOnly.length > 13) {
      return { valid: false, error: 'Please enter a valid Philippine phone number (e.g., +639123456789)' };
    }
  } else if (digitsOnly.startsWith('0')) {
    // 0 format (11 digits total)
    if (digitsOnly.length !== 11) {
      return { valid: false, error: 'Please enter a valid Philippine phone number (e.g., 09123456789)' };
    }
  } else {
    return { valid: false, error: 'Phone number must start with +63 or 0' };
  }
  
  return { valid: true };
};

// Validate URL format
export const validateUrl = (url: string, optional: boolean = true): ValidationResult => {
  if (!url || !url.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'URL is required' };
  }
  
  const urlRegex = /^(https?:\/\/)?(www\.)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
  if (!urlRegex.test(url.trim())) {
    return { valid: false, error: 'Please enter a valid URL (e.g., https://facebook.com/yourprofile)' };
  }
  
  return { valid: true };
};

// Validate date of birth (must be valid date and reasonable age)
export const validateDateOfBirth = (dob: string): ValidationResult => {
  if (!dob || !dob.trim()) {
    return { valid: false, error: 'Date of birth is required' };
  }
  
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Please enter a valid date' };
  }
  
  // Check if date is in the future
  if (date > new Date()) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }
  
  // Check age (reasonable range: 16 to 100 years)
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  
  if (age < 16 || age > 100) {
    return { valid: false, error: 'Age must be between 16 and 100 years' };
  }
  
  return { valid: true };
};

// Validate required field
export const validateRequired = (value: string | null | undefined, fieldName: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

// Validate name field
export const validateName = (name: string | null | undefined, fieldName: string = 'Name'): ValidationResult => {
  if (!name || !name.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const sanitized = sanitizeName(name);
  if (sanitized !== name.trim()) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }
  
  if (sanitized.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, error: `${fieldName} must be less than 100 characters` };
  }
  
  return { valid: true };
};

// Validate address
export const validateAddress = (address: string | null | undefined, fieldName: string = 'Address'): ValidationResult => {
  if (!address || !address.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const sanitized = sanitizeString(address, 500);
  if (sanitized.length < 5) {
    return { valid: false, error: `${fieldName} must be at least 5 characters` };
  }
  
  return { valid: true };
};

// Validate at least one government ID is provided
export const validateAtLeastOneGovtId = (govtIds: {
  SSSNumber?: string;
  TINNumber?: string;
  PhilHealthNumber?: string;
  PagIbigNumber?: string;
  GSISNumber?: string;
  PRCLicenseNumber?: string;
}): ValidationResult => {
  const hasAtLeastOne = Object.values(govtIds).some(id => id && id.trim().length > 0);
  
  if (!hasAtLeastOne) {
    return { valid: false, error: 'At least one government ID is required (SSS, TIN, PhilHealth, Pag-IBIG, GSIS, or PRC License)' };
  }
  
  return { valid: true };
};

// Validate relationship (must not be empty and should be a valid relationship type)
export const validateRelationship = (relationship: string | null | undefined): ValidationResult => {
  if (!relationship || !relationship.trim()) {
    return { valid: false, error: 'Relationship to emergency contact is required' };
  }
  
  const validRelationships = ['Spouse', 'Parent', 'Sibling', 'Child', 'Relative', 'Friend', 'Other'];
  if (!validRelationships.includes(relationship.trim())) {
    return { valid: true }; // Allow custom relationships but validate it's not empty
  }
  
  return { valid: true };
};

// Prevent self-reference in emergency contact
export const validateEmergencyContactNotSelf = (
  candidateName: string,
  emergencyContactName: string
): ValidationResult => {
  if (!candidateName || !emergencyContactName) {
    return { valid: true }; // Will be caught by required validation
  }
  
  // Normalize names for comparison (case-insensitive, remove extra spaces)
  const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
  const candidateNormalized = normalizeName(candidateName);
  const contactNormalized = normalizeName(emergencyContactName);
  
  // Check if names are similar (simple check - if they match exactly or contain each other)
  if (candidateNormalized === contactNormalized) {
    return { valid: false, error: 'Emergency contact cannot be yourself. Please provide a different contact person.' };
  }
  
  // Check if emergency contact name is contained in candidate name (e.g., "John Doe" vs "John")
  const candidateParts = candidateNormalized.split(' ');
  if (candidateParts.some(part => part.length > 2 && contactNormalized.includes(part))) {
    return { valid: false, error: 'Emergency contact appears to be yourself. Please provide a different contact person.' };
  }
  
  return { valid: true };
};

