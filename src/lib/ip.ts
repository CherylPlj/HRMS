// Client-side function: calls the API endpoint
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

// Server-side function: extracts IP from NextRequest headers
export function getServerIp(request: { headers: { get: (key: string) => string | null } }): string {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    return request.headers.get('x-client-ip') || 
           request.headers.get('cf-connecting-ip') || 
           'unknown';
  } catch (error) {
    console.error('Failed to get server IP:', error);
    return 'unknown';
  }
}