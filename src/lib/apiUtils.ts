export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries: number = 3,
  delay: number = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // If server error (5xx) and not last retry, wait and retry
      if (i < retries - 1) {
        console.log(`Attempt ${i + 1} failed with status ${response.status}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      if (i < retries - 1) {
        console.log(`Attempt ${i + 1} failed with error:`, error, `retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('All retry attempts failed');
} 