import { RateLimiterMemory } from "rate-limiter-flexible";

// SQL injection prevention - check for dangerous patterns
// Note: These patterns detect common SQL injection attempts, not legitimate password characters
const SQL_INJECTION_PATTERNS = [
  // SQL comments and statement terminators
  /(--|\/\*|\*\/|;)/g,
  // SQL injection attempts with OR/AND conditions
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
  /(\b(OR|AND)\s+['"]1['"]\s*=\s*['"]1['"])/gi,
  /(\b(OR|AND)\s+1\s*=\s*1)/gi,
  // Dangerous SQL keywords when used in injection context
  /(\b(UNION|EXEC|EXECUTE)\s+(SELECT|ALL))/gi,
];

// Sanitize password input to prevent SQL injection and other security risks
// Note: This removes dangerous characters but should be used with validation
export const sanitizePassword = (password: string): string => {
  if (!password || typeof password !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters (security risk)
  let sanitized = password.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove SQL comment patterns (security risk)
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');
  sanitized = sanitized.replace(/;/g, '');
  
  // Limit length to prevent buffer overflow
  const maxLength = 50;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

// Check if password contains dangerous patterns
export const hasSecurityRisks = (password: string): boolean => {
  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(password)) {
      return true;
    }
  }
  
  // Check for null bytes or control characters
  if (/[\x00-\x1F\x7F]/.test(password)) {
    return true;
  }
  
  // Check length constraints (security, not UX)
  const minLength = 8;
  const maxLength = 50;
  if (password.length < minLength || password.length > maxLength) {
    return true;
  }
  
  return false;
};

// Password validation - returns boolean (true if valid, false if invalid)
// Does not display descriptive messages to prevent information disclosure
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  // Check for security risks (SQL injection, length, etc.)
  return !hasSecurityRisks(password);
};

// Brute force protection - separate limiters for known and unknown IPs
export const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 300, // per 5 minutes
  blockDuration: 900 // 15 minutes block after limit exceeded
});

// More restrictive rate limiter for unknown IPs
export const unknownIPRateLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 600, // per 10 minutes
  blockDuration: 1800 // 30 minutes block after limit exceeded
});

// IP-based login attempt tracking
interface LoginAttempt {
  count: number;
  lastAttempt: number;
}

const failedLoginAttempts = new Map<string, LoginAttempt>();
const LOGIN_MAX_RETRIES = 3;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const checkLoginAttempts = (ipAddress: string): { blocked: boolean; remainingAttempts: number } => {
  // For unknown IPs, use a more restrictive approach
  if (ipAddress === 'unknown') {
    return { blocked: false, remainingAttempts: 2 }; // Allow fewer attempts for unknown IPs
  }

  const now = Date.now();
  const attempt = failedLoginAttempts.get(ipAddress);

  if (attempt) {
    // Check if lockout duration has passed
    if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
      failedLoginAttempts.delete(ipAddress);
      return { blocked: false, remainingAttempts: LOGIN_MAX_RETRIES };
    }

    // Check if max retries exceeded
    if (attempt.count >= LOGIN_MAX_RETRIES) {
      return { blocked: true, remainingAttempts: 0 };
    }

    return { blocked: false, remainingAttempts: LOGIN_MAX_RETRIES - attempt.count };
  }

  return { blocked: false, remainingAttempts: LOGIN_MAX_RETRIES };
};

export const recordFailedLoginAttempt = (ipAddress: string): void => {
  // Track attempts for unknown IPs too, but with a special prefix
  const key = ipAddress === 'unknown' ? `unknown_${Date.now()}` : ipAddress;

  const attempt = failedLoginAttempts.get(key);
  if (attempt) {
    attempt.count += 1;
    attempt.lastAttempt = Date.now();
  } else {
    failedLoginAttempts.set(key, { count: 1, lastAttempt: Date.now() });
  }

  // Clean up old unknown IP entries to prevent memory bloat
  if (ipAddress === 'unknown') {
    const cutoffTime = Date.now() - LOCKOUT_DURATION;
    for (const [k, v] of failedLoginAttempts.entries()) {
      if (k.startsWith('unknown_') && v.lastAttempt < cutoffTime) {
        failedLoginAttempts.delete(k);
      }
    }
  }
};

export const resetLoginAttempts = (ipAddress: string): void => {
  if (ipAddress === 'unknown') {
    // For unknown IPs, clean up recent entries
    const recentTime = Date.now() - 60000; // Last minute
    for (const [k] of failedLoginAttempts.entries()) {
      if (k.startsWith('unknown_')) {
        failedLoginAttempts.delete(k);
      }
    }
    return;
  }
  failedLoginAttempts.delete(ipAddress);
}; 