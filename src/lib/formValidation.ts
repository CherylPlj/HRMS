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

// Sanitize phone number - only digits for Philippine mobile format (09XXXXXXXXX)
export const sanitizePhone = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Only allow digits
  sanitized = sanitized.replace(/[^0-9]/g, '');
  
  // Limit to 11 digits
  if (sanitized.length > 11) {
    sanitized = sanitized.slice(0, 11);
  }
  
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

// Validate phone number (Philippine mobile format only: 09XXXXXXXXX)
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Must be exactly 11 digits starting with 09
  if (digitsOnly.length !== 11) {
    return { valid: false, error: 'Phone number must be exactly 11 digits (e.g., 09123456789)' };
  }
  
  if (!digitsOnly.startsWith('09')) {
    return { valid: false, error: 'Phone number must start with 09 (e.g., 09123456789)' };
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
  
  // Check if address contains at least some alphabetic characters
  const hasAlpha = /[a-zA-Z]/.test(sanitized);
  if (!hasAlpha) {
    return { valid: false, error: `${fieldName} must contain letters (not just numbers)` };
  }
  
  // Check if address is alphanumeric with allowed special characters (spaces, commas, periods, hyphens, #)
  const isValidFormat = /^[a-zA-Z0-9\s,.\-#()]+$/.test(sanitized);
  if (!isValidFormat) {
    return { valid: false, error: `${fieldName} can only contain letters, numbers, spaces, commas, periods, hyphens, and #` };
  }
  
  return { valid: true };
};

// Mask government ID number for display - shows only first 2-4 digits, masks the rest
// This provides better security by exposing minimal information
export const maskGovtId = (id: string | null | undefined): string => {
  if (!id || !id.trim()) return '';
  
  const trimmed = id.trim();
  
  // If the ID contains dashes (formatted), preserve the format
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    const maskedParts = parts.map((part, index) => {
      if (part.length <= 2) {
        // For very short parts, mask all for security
        return '*'.repeat(part.length);
      } else if (index === 0) {
        // First part: show first 2 digits only, mask the rest
        return part.slice(0, 2) + '*'.repeat(Math.max(0, part.length - 2));
      } else {
        // All other parts (middle and last): mask completely
        return '*'.repeat(part.length);
      }
    });
    return maskedParts.join('-');
  } else {
    // No dashes - show first 2-4 digits depending on length, mask the rest
    if (trimmed.length <= 2) {
      // If too short, mask all
      return '*'.repeat(trimmed.length);
    } else if (trimmed.length <= 6) {
      // For shorter IDs, show first 2 digits
      const firstTwo = trimmed.slice(0, 2);
      return firstTwo + '*'.repeat(trimmed.length - 2);
    } else {
      // For longer IDs, show first 4 digits (similar to credit card masking)
      const firstFour = trimmed.slice(0, 4);
      return firstFour + '*'.repeat(trimmed.length - 4);
    }
  }
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

// Validate SSS Number format (XX-XXXXXXX-X or 10 digits)
export const validateSSSNumber = (sssNumber: string, optional: boolean = true): ValidationResult => {
  if (!sssNumber || !sssNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'SSS Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = sssNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{10}$/.test(digitsOnly)) {
    return { valid: false, error: 'SSS Number must be 10 digits (format: XX-XXXXXXX-X)' };
  }
  
  return { valid: true };
};

// Validate TIN Number format (XXX-XXX-XXX-XXX or 9-12 digits)
export const validateTINNumber = (tinNumber: string, optional: boolean = true): ValidationResult => {
  if (!tinNumber || !tinNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'TIN Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = tinNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{9,12}$/.test(digitsOnly)) {
    return { valid: false, error: 'TIN Number must be 9-12 digits (format: XXX-XXX-XXX or XXX-XXX-XXX-XXX)' };
  }
  
  return { valid: true };
};

// Validate PhilHealth Number format (XX-XXXXXXXXX-X or 12 digits)
export const validatePhilHealthNumber = (philHealthNumber: string, optional: boolean = true): ValidationResult => {
  if (!philHealthNumber || !philHealthNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'PhilHealth Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = philHealthNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{12}$/.test(digitsOnly)) {
    return { valid: false, error: 'PhilHealth Number must be 12 digits (format: XX-XXXXXXXXX-X)' };
  }
  
  return { valid: true };
};

// Validate Pag-IBIG Number format (XXXX-XXXX-XXXX or 12 digits)
export const validatePagIbigNumber = (pagIbigNumber: string, optional: boolean = true): ValidationResult => {
  if (!pagIbigNumber || !pagIbigNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'Pag-IBIG Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = pagIbigNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{12}$/.test(digitsOnly)) {
    return { valid: false, error: 'Pag-IBIG Number must be 12 digits (format: XXXX-XXXX-XXXX)' };
  }
  
  return { valid: true };
};

// Validate GSIS Number format (11 digits)
export const validateGSISNumber = (gsisNumber: string, optional: boolean = true): ValidationResult => {
  if (!gsisNumber || !gsisNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'GSIS Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = gsisNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{11}$/.test(digitsOnly)) {
    return { valid: false, error: 'GSIS Number must be 11 digits' };
  }
  
  return { valid: true };
};

// Validate PRC License Number format (7 digits)
export const validatePRCLicenseNumber = (prcNumber: string, optional: boolean = true): ValidationResult => {
  if (!prcNumber || !prcNumber.trim()) {
    return optional ? { valid: true } : { valid: false, error: 'PRC License Number is required' };
  }
  
  // Remove hyphens and spaces for validation
  const digitsOnly = prcNumber.replace(/[-\s]/g, '');
  
  if (!/^\d{7}$/.test(digitsOnly)) {
    return { valid: false, error: 'PRC License Number must be 7 digits' };
  }
  
  return { valid: true };
};

// Validate relationship (must not be empty and should be a valid relationship type)
export const validateRelationship = (relationship: string | null | undefined): ValidationResult => {
  if (!relationship || !relationship.trim()) {
    return { valid: false, error: 'Relationship to emergency contact is required' };
  }
  
  // Always return valid if a value is provided (either predefined or custom)
  // The dropdown ensures valid options, and custom "Other" allows any text
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
  
  // Only check if names are exactly the same
  if (candidateNormalized === contactNormalized) {
    return { valid: false, error: 'Emergency contact cannot be yourself. Please provide a different contact person.' };
  }
  
  // Check if the full first and last names match (more strict comparison)
  const candidateParts = candidateNormalized.split(' ');
  const contactParts = contactNormalized.split(' ');
  
  // Only flag as self if at least first AND last name match
  if (candidateParts.length >= 2 && contactParts.length >= 2) {
    const candidateFirst = candidateParts[0];
    const candidateLast = candidateParts[candidateParts.length - 1];
    const contactFirst = contactParts[0];
    const contactLast = contactParts[contactParts.length - 1];
    
    if (candidateFirst === contactFirst && candidateLast === contactLast) {
      return { valid: false, error: 'Emergency contact appears to be yourself. Please provide a different contact person.' };
    }
  }
  
  return { valid: true };
};

