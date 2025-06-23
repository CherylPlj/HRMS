import { headers } from 'next/headers';

export async function getClientIp(): Promise<string> {
  try {
    // Call our internal API endpoint
    const response = await fetch('/api/ip');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get client IP:', error);
    return 'unknown';
  }
}