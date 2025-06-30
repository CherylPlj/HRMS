import { RateLimiterMemory } from "rate-limiter-flexible";

// Password validation
export const validatePassword = (password: string): string | null => {
  const minLength = 8;
  const maxLength = 50;
  
  if (password.length > maxLength) return "Password must not exceed 50 characters";
  if (password.length < minLength) return "Password must be at least 8 characters";
  
  return null;
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