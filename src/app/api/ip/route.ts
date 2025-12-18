import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get headers from the request
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ip = forwardedFor.split(',')[0].trim();
      return NextResponse.json({ ip });
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return NextResponse.json({ ip: realIp });
    }

    // Get IP from request connection
    const remoteIp = request.headers.get('x-real-ip') || 
                    request.headers.get('x-client-ip') || 
                    request.headers.get('x-forwarded') ||
                    request.headers.get('cf-connecting-ip') ||
                    'unknown';
                    
    return NextResponse.json({ ip: remoteIp });
  } catch (error) {
    console.error('Error getting IP:', error);
    return NextResponse.json({ ip: 'unknown' });
  }
} 