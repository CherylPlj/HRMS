/**
 * SIS Sync Utility
 * 
 * Helper functions to sync schedule assignments from HRMS to SIS
 * 
 * Configuration:
 * - Set SIS_SYNC_ENABLED=true to enable syncing
 * - Set SIS_UPDATE_ENDPOINT to the SIS API endpoint URL (default: /api/hrms/assign-teacher)
 * - Uses same authentication as fetch operations (SJSFI_SHARED_SECRET, SJSFI_HRMS_API_KEY)
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface SyncToSISOptions {
    scheduleId: number; // SIS schedule ID
    employeeId: string; // HRMS Employee ID (e.g., "2026-0001")
    assigned: boolean; // true to assign, false to unassign
}

interface SyncResult {
    success: boolean;
    synced: boolean; // Whether sync was attempted and succeeded
    error?: string;
    message?: string;
}

/**
 * Syncs a schedule assignment to SIS enrollment system
 * 
 * @param options - Sync options including scheduleId, employeeId, and assigned status
 * @returns Sync result indicating success/failure
 */
export async function syncAssignmentToSIS(options: SyncToSISOptions): Promise<SyncResult> {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';
    
    // Check if sync is enabled
    const syncEnabled = process.env.SIS_SYNC_ENABLED === 'true';
    
    // Get SIS update endpoint (defaults to SIS assign-teacher endpoint)
    // Ensure endpoint starts with / if not provided
    const rawEndpoint = process.env.SIS_UPDATE_ENDPOINT || '/api/hrms/assign-teacher';
    const updateEndpoint = rawEndpoint.startsWith('/') ? rawEndpoint : `/${rawEndpoint}`;
    
    // If sync is not enabled, return success but indicate no sync was attempted
    if (!syncEnabled) {
        return {
            success: true,
            synced: false,
            message: 'SIS sync is disabled (SIS_SYNC_ENABLED is not set to "true")',
        };
    }
    
    // Validate required environment variables
    if (!SHARED_SECRET) {
        console.warn('[SIS Sync] Missing SJSFI_SHARED_SECRET - skipping sync');
        return {
            success: true,
            synced: false,
            message: 'SIS sync skipped: Missing SJSFI_SHARED_SECRET',
        };
    }
    
    if (!API_KEY) {
        console.warn('[SIS Sync] Missing SJSFI_HRMS_API_KEY - skipping sync');
        return {
            success: true,
            synced: false,
            message: 'SIS sync skipped: Missing SJSFI_HRMS_API_KEY',
        };
    }
    
    try {
        // Fetch teacher information from database
        const faculty = await prisma.faculty.findFirst({
            where: {
                EmployeeID: options.employeeId,
            },
            include: {
                User: {
                    select: {
                        FirstName: true,
                        LastName: true,
                        Email: true,
                    },
                },
            },
        });

        if (!faculty || !faculty.User) {
            console.warn(`[SIS Sync] Faculty not found for employeeId: ${options.employeeId}`);
            return {
                success: true,
                synced: false,
                message: `SIS sync skipped: Faculty not found for employee ${options.employeeId}`,
            };
        }

        // Format teacher name (FirstName + LastName)
        const teacherName = `${faculty.User.FirstName} ${faculty.User.LastName}`.trim();

        // Prepare request body in SIS format
        const requestBody = {
            scheduleId: options.scheduleId,
            teacher: {
                teacherId: options.employeeId, // Using EmployeeID as teacherId
                teacherName: teacherName,
                teacherEmail: faculty.User.Email || '',
            },
        };
        
        const rawBody = JSON.stringify(requestBody);
        
        // Generate timestamp and signature (same as fetch operations)
        const timestamp = Date.now().toString();
        const message = rawBody + timestamp;
        const hmac = crypto.createHmac('sha256', SHARED_SECRET);
        hmac.update(message);
        const signature = hmac.digest('hex');
        
        // Make POST request to SIS
        const url = `${ENROLLMENT_BASE_URL}${updateEndpoint}`;
        console.log(`[SIS Sync] Attempting to sync assignment to SIS: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: rawBody,
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { error: 'Invalid JSON response', raw: responseText };
        }
        
        if (!response.ok) {
            // Handle 404 as "endpoint doesn't exist yet" - this is expected if SIS hasn't implemented it
            if (response.status === 404) {
                console.warn(`[SIS Sync] SIS endpoint not found (404): ${url}. This is expected if SIS hasn't implemented the update endpoint yet.`);
                return {
                    success: true, // Still return success - assignment was created in HRMS
                    synced: false,
                    message: `SIS sync endpoint not available (404). Assignment saved in HRMS only.`,
                };
            }
            
            // Handle other errors
            console.error(`[SIS Sync] Failed to sync to SIS: ${response.status} - ${JSON.stringify(responseData)}`);
            return {
                success: true, // Still return success - assignment was created in HRMS
                synced: false,
                error: `SIS sync failed: ${responseData.error || response.statusText || 'Unknown error'}`,
                message: `Assignment saved in HRMS, but sync to SIS failed.`,
            };
        }
        
        // Success!
        console.log(`[SIS Sync] Successfully synced assignment to SIS: scheduleId=${options.scheduleId}, employeeId=${options.employeeId}`);
        return {
            success: true,
            synced: true,
            message: 'Assignment synced to SIS successfully',
        };
        
    } catch (error) {
        // Network errors or other exceptions
        console.error('[SIS Sync] Error syncing to SIS:', error);
        return {
            success: true, // Still return success - assignment was created in HRMS
            synced: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Assignment saved in HRMS, but sync to SIS encountered an error.',
        };
    }
}
