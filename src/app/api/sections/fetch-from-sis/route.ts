import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET /api/sections/fetch-from-sis
 * Fetches sections from SIS enrollment system and matches them with HRMS sections
 * Returns HRMS sections with SIS data merged
 */
export async function GET(request: Request) {
    try {
        const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
        const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
        const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

        if (!SHARED_SECRET) {
            return NextResponse.json({
                success: false,
                error: 'Missing required environment variable: SJSFI_SHARED_SECRET',
            }, { status: 500 });
        }
        
        if (!API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'Missing required environment variable: SJSFI_HRMS_API_KEY',
            }, { status: 500 });
        }

        // For GET requests, body is empty string
        const body = '';
        const timestamp = Date.now().toString();
        const message = body + timestamp;
        const hmac = crypto.createHmac('sha256', SHARED_SECRET);
        hmac.update(message);
        const signature = hmac.digest('hex');

        console.log('[Fetch Sections from SIS] Fetching sections from SIS...');
        console.log('[Fetch Sections from SIS] Endpoint:', `${ENROLLMENT_BASE_URL}/api/hrms/sections`);

        // Fetch sections from SIS
        const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/sections`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorText = '';
            
            // Check if response is JSON or HTML/text
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    errorText = await response.text();
                }
            } else {
                // Response is HTML or plain text (like a 404 page)
                errorText = await response.text();
                // Truncate HTML responses to avoid logging huge HTML pages
                if (errorText.length > 500) {
                    errorText = errorText.substring(0, 500) + '... (truncated)';
                }
            }
            
            console.error('[Fetch Sections from SIS] Error response:', {
                status: response.status,
                statusText: response.statusText,
                contentType,
                errorText,
            });
            
            return NextResponse.json({
                success: false,
                error: `Failed to fetch sections from SIS: ${response.status} ${response.statusText}`,
                details: response.status === 404 ? 'The SIS endpoint was not found. Please verify the endpoint URL and that the SIS service is running.' : errorText,
            }, { status: response.status });
        }

        // Check content type before parsing JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('[Fetch Sections from SIS] Non-JSON response received:', {
                contentType,
                preview: textResponse.substring(0, 200),
            });
            return NextResponse.json({
                success: false,
                error: 'SIS API returned non-JSON response',
                details: `Expected JSON but received ${contentType || 'unknown content type'}`,
            }, { status: 500 });
        }

        const sisData = await response.json();
        const sisSections = sisData.data || sisData.sections || sisData;
        console.log('[Fetch Sections from SIS] Successfully fetched sections from SIS:', {
            total: sisSections.length,
        });
        console.log('[Fetch Sections from SIS] SIS sections data:', JSON.stringify(sisSections, null, 2));

        // Fetch HRMS sections with assignments
        console.log('[Fetch Sections from SIS] Fetching HRMS sections...');
        const hrmsSections = await prisma.classSection.findMany({
            include: {
                adviserFaculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true,
                            },
                        },
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
                homeroomTeacher: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true,
                            },
                        },
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
                sectionHead: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true,
                            },
                        },
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        console.log('[Fetch Sections from SIS] Found HRMS sections:', hrmsSections.length);

        // Match SIS sections with HRMS sections by name and merge data
        const matchedSections = hrmsSections.map(hrmsSection => {
            // Find matching SIS section by name (case-insensitive)
            const matchingSisSection = sisSections.find((sisSection: any) => 
                sisSection.section?.name?.toLowerCase() === hrmsSection.name.toLowerCase()
            );

            if (matchingSisSection) {
                console.log(`[Fetch Sections from SIS] Matched HRMS section "${hrmsSection.name}" with SIS sectionId: ${matchingSisSection.sectionId}`);
            }

            return {
                ...hrmsSection,
                sisSectionId: matchingSisSection?.sectionId || null,
                sisAdviser: matchingSisSection?.adviser || null,
            };
        });

        console.log('[Fetch Sections from SIS] Returning matched sections');

        return NextResponse.json(matchedSections, { status: 200 });

    } catch (error: any) {
        console.error('[Fetch Sections from SIS] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch sections from SIS',
        }, { status: 500 });
    }
}
