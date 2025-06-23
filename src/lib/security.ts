import { RateLimiterMemory } from "rate-limiter-flexible";

// Password validation
export const validatePassword = (password: string): string | null => {
  const minLength = 8;
  const maxLength = 50;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length > maxLength) return "Password must not exceed 50 characters";
  if (password.length < minLength) return "Password must be at least 8 characters";
  if (!hasUpperCase) return "Password must contain at least one uppercase letter";
  if (!hasLowerCase) return "Password must contain at least one lowercase letter";
  if (!hasNumbers) return "Password must contain at least one number";
  // if (!hasSpecialChar) return "Password must contain at least one special character";
  
  return null;
};

// Brute force protection
export const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 300, // per 5 minutes
  blockDuration: 900 // 15 minutes block after limit exceeded
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
  // If IP is unknown, use a more lenient approach
  if (ipAddress === 'unknown') {
    return { blocked: false, remainingAttempts: LOGIN_MAX_RETRIES };
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
  // Don't track attempts for unknown IPs
  if (ipAddress === 'unknown') return;

  const attempt = failedLoginAttempts.get(ipAddress);
  if (attempt) {
    attempt.count += 1;
    attempt.lastAttempt = Date.now();
  } else {
    failedLoginAttempts.set(ipAddress, { count: 1, lastAttempt: Date.now() });
  }
};

export const resetLoginAttempts = (ipAddress: string): void => {
  if (ipAddress === 'unknown') return;
  failedLoginAttempts.delete(ipAddress);
}; 