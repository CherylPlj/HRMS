export const validateEmailCharacters = (email: string): string | null => {
  // Regular expression to match only allowed characters
  const validEmailRegex = /^[a-zA-Z0-9._\-@ ]*$/;
  if (!validEmailRegex.test(email)) {
    return 'Only letters, numbers, dots, underscores, hyphens, and @ are allowed';
  }

  // Check for length requirements
  if (email.length > 50) {
    return 'Email must not exceed 50 characters';
  }

  if (email.length < 6 && email.length > 0) {
    return 'Email must be at least 6 characters';
  }

  // Always check for valid email format if there's input
  if (email.length > 0) {
    const emailRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9._\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      if (!email.includes('@')) {
        return 'Please include @ in the email address';
      }
      if (!email.includes('.')) {
        return 'Please include a domain (e.g., .com, .edu)';
      }
      return 'Please enter a valid email address (e.g., example@domain.com)';
    }
  }

  return null;
}; 