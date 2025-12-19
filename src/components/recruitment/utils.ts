import { DateTime } from 'luxon';

export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = DateTime.fromISO(dateStr).setZone('Asia/Manila');
  if (!date.isValid) return dateStr;
  return date.toLocaleString(DateTime.DATE_FULL);
}

export function formatDateTime(dateTimeStr: string) {
  if (!dateTimeStr) return '';
  const date = DateTime.fromISO(dateTimeStr).setZone('Asia/Manila');
  if (!date.isValid) return dateTimeStr;
  return date.toLocaleString({
    ...DateTime.DATETIME_FULL,
    hour12: true,
    timeZoneName: undefined // Remove timezone display
  });
}

export function formatStatus(status: string) {
  // Add spaces before capital letters and handle special cases
  return status
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^ /, '') // Remove leading space
    .trim();
}

export function validateInterviewTime(dateTimeStr: string): boolean {
  if (!dateTimeStr) return true;
  const date = DateTime.fromISO(dateTimeStr).setZone('Asia/Manila');
  if (!date.isValid) return false;
  const hours = date.hour;
  return hours >= 7 && hours < 19; // 7 AM to 7 PM
}

export function calculateAge(dateOfBirth: string | Date | null): number | null {
  if (!dateOfBirth) return null;
  const dob = DateTime.fromISO(dateOfBirth.toString()).setZone('Asia/Manila');
  if (!dob.isValid) return null;

  const now = DateTime.now().setZone('Asia/Manila');
  return Math.floor(now.diff(dob, 'years').years); // Round down to whole number
}

export function validateAge(dateOfBirth: string | Date | null | undefined): { valid: boolean; age: number | null } {
  if (!dateOfBirth) return { valid: false, age: null };
  const dob = DateTime.fromISO(dateOfBirth.toString()).setZone('Asia/Manila');
  if (!dob.isValid) return { valid: false, age: null };

  const now = DateTime.now().setZone('Asia/Manila');
  const age = Math.floor(now.diff(dob, 'years').years); // Round down to whole number
  return { valid: age >= 18 && age <= 65, age };
}

export function formatName(firstName: string, lastName: string, middleName?: string | null, extensionName?: string | null): string {
  const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
  const extension = extensionName ? `, ${extensionName}` : '';
  return `${firstName}${middleInitial} ${lastName}${extension}`;
}

// Helper function to get file type from URL
export function getFileType(url: string): 'pdf' | 'image' | 'other' {
  if (!url) return 'other';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf') || lowerUrl.includes('pdf')) return 'pdf';
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif')) return 'image';
  return 'other';
}

// Helper function to get preview URL
export function getPreviewUrl(url: string): string {
  if (!url || url.trim() === '') {
    console.error('getPreviewUrl: Empty URL provided');
    return '';
  }
  
  // For Supabase storage URLs, use proxy endpoint to force inline display
  if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
    try {
      // Extract the file path from the Supabase URL
      // Supabase URLs are typically: https://[project].supabase.co/storage/v1/object/public/resumes/[path]
      const urlMatch = url.match(/\/resumes\/(.+)$/);
      if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
        const filePath = urlMatch[1];
        // Decode the path first in case it's already encoded, then re-encode to ensure proper handling
        let decodedPath: string;
        try {
          decodedPath = decodeURIComponent(filePath);
        } catch {
          decodedPath = filePath;
        }
        
        // Validate that we have a non-empty path after decoding
        if (!decodedPath || decodedPath.trim() === '') {
          console.warn('getPreviewUrl: Empty file path after decoding:', url);
          return url; // Return original URL as fallback
        }
        
        // URL encode the path to handle special characters and spaces
        // Use proxy endpoint that sets Content-Disposition: inline
        const proxyUrl = `/api/candidates/resume/${encodeURIComponent(decodedPath)}`;
        console.log('Generated proxy URL:', proxyUrl, 'from original URL:', url);
        return proxyUrl;
      } else {
        console.warn('getPreviewUrl: Could not extract file path from URL:', url);
        // Return original URL as fallback
        return url;
      }
    } catch (e) {
      console.error('Error parsing Supabase URL:', e, 'URL:', url);
      // Return original URL as fallback
      return url;
    }
  }
  
  // For non-Supabase URLs, return as-is
  console.log('getPreviewUrl: Returning original URL (not Supabase):', url);
  return url;
}

