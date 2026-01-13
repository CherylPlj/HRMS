import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/hrms/sections
 * Fetches sections from SIS enrollment system API endpoint
 * Returns sections from SIS (no HRMS database query)
 * This endpoint is used by the HRMS frontend to display section assignments
 */
export async function POST(request: NextRequest) {
  try {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    // Check if credentials are available
    if (!SHARED_SECRET || !API_KEY) {
      return NextResponse.json(
        { 
          error: 'SIS credentials not configured',
          message: 'Missing SJSFI_SHARED_SECRET or SJSFI_HRMS_API_KEY environment variables'
        },
        { status: 500 }
      );
    }

    // Fetch sections from SIS
    try {
      // For POST requests, get raw body string for signature generation
      // If no body provided or body is just {}, use a standard format similar to other SIS endpoints
      let rawBody = '';
      try {
        rawBody = await request.text();
        // Check if body is empty or just an empty JSON object
        const trimmedBody = rawBody.trim();
        if (!trimmedBody || trimmedBody === '' || trimmedBody === '{}') {
          // Use a standard format for fetching sections (similar to schedules endpoint)
          rawBody = JSON.stringify({ data: "fetch-all-sections" });
        }
      } catch (e) {
        // If error reading body, use standard format
        rawBody = JSON.stringify({ data: "fetch-all-sections" });
      }
      
      const timestamp = Date.now().toString();
      const message = rawBody + timestamp;
      const hmac = crypto.createHmac('sha256', SHARED_SECRET);
      hmac.update(message);
      const signature = hmac.digest('hex');

      console.log('[HRMS Sections] Fetching sections from SIS...');
      console.log('[HRMS Sections] Endpoint:', `${ENROLLMENT_BASE_URL}/api/hrms/sections`);
      console.log('[HRMS Sections] Timestamp:', timestamp);
      console.log('[HRMS Sections] Body:', rawBody);

      // Fetch sections from SIS using POST
      const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'x-timestamp': timestamp,
          'x-signature': signature,
        },
        body: rawBody,
      });

      if (response.ok) {
        // Check content type before parsing JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const sisData = await response.json();
          const sisSections = sisData.data || sisData.sections || sisData;
          
          console.log('[HRMS Sections] Successfully fetched sections from SIS:', {
            total: Array.isArray(sisSections) ? sisSections.length : 0,
          });

          console.log('[HRMS Sections] Returning sections from SIS');
          return NextResponse.json(Array.isArray(sisSections) ? sisSections : []);
        } else {
          const textResponse = await response.text();
          console.error('[HRMS Sections] SIS returned non-JSON response:', {
            contentType,
            preview: textResponse.substring(0, 200),
          });
          return NextResponse.json({
            error: 'SIS API returned non-JSON response',
            details: `Expected JSON but received ${contentType || 'unknown content type'}`,
          }, { status: 500 });
        }
      } else {
        // SIS request failed
        const contentType = response.headers.get('content-type');
        let errorText = '';
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || JSON.stringify(errorData);
          } catch (e) {
            errorText = await response.text();
          }
        } else {
          errorText = await response.text();
          if (errorText.length > 200) {
            errorText = errorText.substring(0, 200) + '... (truncated)';
          }
        }
        
        console.error('[HRMS Sections] Failed to fetch from SIS:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          timestamp: timestamp,
          bodyLength: rawBody.length,
        });
        
        return NextResponse.json({
          error: `Failed to fetch sections from SIS: ${response.status} ${response.statusText}`,
          details: errorText,
        }, { status: response.status });
      }
    } catch (sisError: any) {
      // SIS fetch failed
      console.error('[HRMS Sections] Error fetching from SIS:', sisError.message);
      return NextResponse.json({
        error: 'Failed to fetch sections from SIS',
        message: sisError.message || 'An error occurred while fetching sections from SIS',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in HRMS sections endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch sections',
        message: error.message || 'An error occurred while fetching sections'
      },
      { status: 500 }
    );
  }
}
