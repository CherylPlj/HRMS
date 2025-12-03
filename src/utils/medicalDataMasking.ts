/**
 * Utility functions for masking sensitive medical information
 * Per DPA Philippines compliance requirements
 */

export interface UserRole {
  role: string;
  permissions?: string[];
}

/**
 * Check if user has permission to view unmasked medical data
 */
export function canViewUnmaskedMedicalData(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  
  const authorizedRoles = [
    'HR Manager',
    'HR',
    'Medical Personnel',
    'Benefits Administrator',
    'Admin',
    'Administrator'
  ];
  
  return authorizedRoles.includes(userRole.role) || 
         userRole.permissions?.includes('view_unmasked_medical') === true;
}

/**
 * Mask health insurance number - show only last 4 digits
 */
export function maskHealthInsuranceNumber(
  number: string | null | undefined,
  canViewUnmasked: boolean
): string {
  if (!number) return 'N/A';
  if (canViewUnmasked) return number;
  
  if (number.length <= 4) return '****';
  
  const last4 = number.slice(-4);
  const masked = '*'.repeat(Math.max(0, number.length - 4));
  return `${masked}${last4}`;
}

/**
 * Mask PWD ID number - show only last 4 digits
 */
export function maskPwdIdNumber(
  number: string | null | undefined,
  canViewUnmasked: boolean
): string {
  if (!number) return 'N/A';
  if (canViewUnmasked) return number;
  
  if (number.length <= 4) return '****';
  
  const last4 = number.slice(-4);
  const masked = '*'.repeat(Math.max(0, number.length - 4));
  return `${masked}${last4}`;
}

/**
 * Mask phone number - show only last 4 digits
 */
export function maskPhoneNumber(
  number: string | null | undefined,
  canViewUnmasked: boolean
): string {
  if (!number) return 'N/A';
  if (canViewUnmasked) return number;
  
  // Remove all non-digits
  const digits = number.replace(/\D/g, '');
  
  if (digits.length <= 4) return '***-***-****';
  
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

/**
 * Mask sensitive text data (allergies, disability details, etc.)
 */
export function maskSensitiveText(
  text: string | null | undefined,
  canViewUnmasked: boolean
): string {
  if (!text || text.trim() === '') return 'N/A';
  if (canViewUnmasked) return text;
  
  return '***';
}

/**
 * Mask blood type
 */
export function maskBloodType(
  bloodType: string | null | undefined,
  canViewUnmasked: boolean
): string {
  if (!bloodType) return 'N/A';
  if (canViewUnmasked) return bloodType;
  
  return '***';
}

/**
 * Get user role from Clerk user object or session
 */
export function getUserRole(user: any): UserRole | null {
  if (!user) return null;
  
  // Check Clerk publicMetadata first
  const role = user.publicMetadata?.role;
  if (role && typeof role === 'string') {
    return {
      role: role,
      permissions: user.publicMetadata?.permissions as string[] | undefined
    };
  }
  
  // Fallback: check if user has admin/HR roles in email or metadata
  const email = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (email) {
    // Check for admin indicators in email or metadata
    const adminIndicators = ['admin', 'hr', 'manager', 'super admin'];
    const roleStr = role?.toString().toLowerCase() || '';
    if (adminIndicators.some(indicator => roleStr.includes(indicator))) {
      return {
        role: roleStr,
        permissions: ['view_unmasked_medical']
      };
    }
  }
  
  return null;
}

