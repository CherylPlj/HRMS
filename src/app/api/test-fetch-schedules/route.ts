/**
 * Sample Next.js API Route
 * This demonstrates how to send a request to the available-schedules endpoint
 * from another system (HRMS/LMS)
 * 
 * File location in your HRMS/LMS project: src/app/api/test-fetch-schedules/route.ts
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
    try {
        // ========================================
        // STEP 1: Configuration (from your .env)
        // ========================================
        const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000'; // https://sjsfi-enrollment.vercel.app
        const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || 'cda9e5cb-cda5-4181-9d55-6dc0b34c8f02';
        const API_KEY = process.env.SJSFI_HRMS_API_KEY || '390c8181-6eff-467c-b434-14a42ca8caed';

        console.log('=== Fetching Schedules from Enrollment System ===');
        console.log('Target URL:', `${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`); // this is the endpoint we are calling

        // ========================================
        // STEP 2: Prepare Request Body
        // ========================================
        const requestBody = {
            data: "fetch-all-schedules" // Required by the endpoint, any string works
        };

        const rawBody = JSON.stringify(requestBody);
        console.log('Request body:', rawBody);

        // ========================================
        // STEP 3: Generate Timestamp
        // ========================================
        const timestamp = Date.now().toString();
        console.log('Timestamp:', timestamp);

        // ========================================
        // STEP 4: Generate HMAC Signature
        // ========================================
        const message = rawBody + timestamp;
        const hmac = crypto.createHmac('sha256', SHARED_SECRET);
        hmac.update(message);
        const signature = hmac.digest('hex');
        console.log('Signature generated:', signature);

        // ========================================
        // STEP 5: Make POST Request
        // ========================================
        const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: rawBody,
        });

        console.log('Response status:', response.status);

        // ========================================
        // STEP 6: Parse Response
        // ========================================
        const responseText = await response.text();
        console.log('Response body:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Failed to parse response',
                rawResponse: responseText,
            }, { status: 500 });
        }

        // ========================================
        // STEP 7: Handle Response
        // ========================================
        if (!response.ok) {
            console.error('Error response:', data);
            return NextResponse.json({
                success: false,
                error: data.error || 'Request failed',
                status: response.status,
                details: data,
            }, { status: response.status });
        }

        // Success! Return the schedules
        console.log(`✅ Success! Received ${data.total} schedules`);
        
        return NextResponse.json({
            success: true,
            message: 'Successfully fetched schedules from enrollment system',
            summary: {
                totalSchedules: data.total,
                sampleCount: Math.min(5, data.data?.length || 0),
            },
            // Return first 5 schedules as sample
            sampleSchedules: data.data?.slice(0, 5) || [],
            // Include full data for processing
            fullData: data,
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching schedules:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, { status: 500 });
    }
}

// ========================================
// Alternative: Using async/await pattern
// ========================================
async function fetchSchedulesFromEnrollmentSystem() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET!;
    const API_KEY = process.env.SJSFI_HRMS_API_KEY!;

    // Prepare body
    const requestBody = { data: "fetch-all-schedules" };
    const rawBody = JSON.stringify(requestBody);

    // Generate timestamp and signature
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Make request
    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: rawBody,
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.status}`);
    }

    return response.json();
}

// Export for use in other files
export { fetchSchedulesFromEnrollmentSystem };
