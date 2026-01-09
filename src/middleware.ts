import { clerkMiddleware, createRouteMatcher, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
    "/careers",
    "/careers/all-vacancies",
    "/applicant",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/(.*)",
    "/api/updateUserStatus",
    "/api/getUserRole",
    "/api/xr/user-access-lookup",
    "/api/faculty-documents",
    "/api/faculty/user/[userId]",
    "/api/faculty-documents/[documentId]",
    "/api/faculty-documents/[documentId]/delete",
    "/api/document-types/[id]",
    "/api/leaves/[id]",
    "/api/leaves/faculty/[facultyId]",
    "/api/webhooks/clerk",
    "/api/sync-user-password",
    "/api/ip",
    "/api/vacancies/public",
    "/api/candidates/public",
    "/api/candidates/resume/(.*)",
    "/api/generate-employee-id",
    "/api/generate-user-id",
    "/terms-of-use",
    "/privacy-statement"
];

// Routes that can be accessed while signed out
const ignoredRoutes = [
    "/",
    "/careers",
    "/careers/all-vacancies",
    "/applicant",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/(.*)",
    "/api/updateUserStatus",
    "/api/getUserRole",
    "/api/xr/user-access-lookup",
    "/api/faculty-documents",
    "/api/faculty/user/[userId]",
    "/api/faculty-documents/[documentId]",
    "/api/document-types/[id]",
    "/api/faculty-documents/[documentId]/delete",
    "/api/leaves/[id]",
    "/api/leaves/faculty/[facultyId]",
    "/api/webhooks/clerk",
    "/api/sync-user-password",
    "/api/ip",
    "/api/vacancies/public",
    "/api/candidates/public",
    "/api/candidates/resume/(.*)",
    "/api/generate-employee-id",
    "/api/generate-user-id",
    "/terms-of-use",
    "/privacy-statement"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isIgnoredRoute = createRouteMatcher(ignoredRoutes);

export default clerkMiddleware(async (auth, req) => {
    try {
        const { userId } = await auth();
        const isAuthenticated = !!userId;
        const url = new URL(req.url);
        
        // Check for redirect loop protection - if we're already redirecting to sign-in, don't redirect again
        const redirectUrl = url.searchParams.get('redirect_url');
        const isRedirectLoop = url.pathname === '/sign-in' && redirectUrl && redirectUrl === url.pathname;
        
        // Add security headers
        const response = NextResponse.next();
        
        // Allow iframe embedding for resume preview API route
        const isResumeApiRoute = url.pathname.startsWith('/api/candidates/resume/');
        if (isResumeApiRoute) {
            response.headers.set("X-Frame-Options", "SAMEORIGIN");
        } else {
            response.headers.set("X-Frame-Options", "DENY");
        }
        
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        // Build CSP - allow resume API route in frame-src and object-src for preview
        // Note: embed-src is not a valid CSP directive, use object-src instead
        let csp = "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://cdn.jsdelivr.net blob:; " +
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
            "img-src 'self' data: https: blob:; " +
            "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
            "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://clerk-telemetry.com; " +
            "frame-src 'self' https://*.clerk.accounts.dev; " +
            "object-src 'self' blob:; " +
            "worker-src 'self' blob:; " +
            "child-src 'self' blob:;";
        
        response.headers.set("Content-Security-Policy", csp);

        // Always allow access to ignored routes (including sign-in/sign-up to prevent loops)
        if (isIgnoredRoute(req)) {
            return response;
        }

        // Handle API routes
        if (url.pathname.startsWith('/api/')) {
            // Allow authenticated API requests
            if (isAuthenticated) {
                return response;
            }
            // For unauthenticated API requests to protected routes, return 401
            if (!isPublicRoute(req)) {
                return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // If user is authenticated, allow access to all routes except sign-in/sign-up
        if (isAuthenticated) {
            // Only redirect from sign-in/sign-up if we're not in a redirect loop
            if ((url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up')) && !isRedirectLoop) {
                try {
                    // Get user's active role (highest priority if multiple)
                    const role = await getActiveRole(userId ? userId : undefined);

                    // Redirect to appropriate dashboard based on role
                    const dashboardPath = role === 'admin' || role === 'super admin' 
                        ? '/dashboard/admin'
                        : role === 'faculty'
                        ? '/dashboard/faculty'
                        : role === 'cashier'
                        ? '/dashboard/cashier'
                        : role === 'registrar'
                        ? '/dashboard/registrar'
                        : '/dashboard';
                    
                    return NextResponse.redirect(new URL(dashboardPath, req.url));
                } catch (error) {
                    console.error("Error during role-based redirect:", error);
                    // Fallback to general dashboard if role lookup fails
                    return NextResponse.redirect(new URL('/dashboard', req.url));
                }
            }
            return response;
        }

        // If not authenticated and trying to access a protected route, redirect to sign-in
        // But prevent redirect loops by checking if we're already at sign-in
        if (!isPublicRoute(req) && !isRedirectLoop) {
            const signInUrl = new URL('/sign-in', req.url);
            // Only add redirect_url if it's different from the current path
            if (url.pathname !== '/sign-in') {
                signInUrl.searchParams.set('redirect_url', url.pathname);
            }
            return NextResponse.redirect(signInUrl);
        }

        return response;
    } catch (error: any) {
        // Handle Clerk authentication errors gracefully
        // Clock skew and token refresh errors should not cause redirect loops
        if (error?.message?.includes('clock') || error?.message?.includes('token') || error?.message?.includes('iat')) {
            console.warn("Clerk authentication warning (clock skew/token issue):", error.message);
            // Allow the request to proceed - Clerk will handle the clock skew in development
            return NextResponse.next();
        }
        
        console.error("Middleware error:", error);
        // On error, allow access to public routes, otherwise redirect to sign-in
        try {
            const url = new URL(req.url);
            if (isPublicRoute({ pathname: url.pathname } as any)) {
                return NextResponse.next();
            }
        } catch {
            // If URL parsing fails, just allow the request through
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/sign-in', req.url));
    }
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

async function getUserRole(userId?: string): Promise<string> {
    if (!userId) return '';

    try {
        const { data, error } = await supabase
            .from('User')
            .select(`
                UserRole (
                    role:Role (
                        name
                    )
                )
            `)
            .eq('UserID', userId)
            .single();

        if (error) {
            console.error("Database error:", error);
            // Return a default role instead of empty string to avoid redirect issues
            return 'user';
        }

        if (!data) {
            console.log("No user data found for userId:", userId);
            return 'user';
        }

        const roleData = data.UserRole?.[0]?.role;
        if (!roleData || !('name' in roleData)) {
            console.log("No role data found for user:", userId);
            return 'user';
        }

        return (roleData as { name: string }).name.toLowerCase();
    } catch (error) {
        console.error("Error getting user role:", error);
        // Return default role to prevent redirect loops
        return 'user';
    }
}

/**
 * Get the active role for a user, checking session storage for selected role
 * Note: In middleware, we can't access sessionStorage, so we use the first/highest priority role
 */
async function getActiveRole(userId?: string): Promise<string> {
    if (!userId) return 'user';

    try {
        const { data, error } = await supabase
            .from('User')
            .select(`
                UserRole (
                    role:Role (
                        name
                    )
                )
            `)
            .eq('UserID', userId)
            .single();

        if (error || !data) {
            return 'user';
        }

        const roles = (data.UserRole || []).map((ur: any) => 
            ur.role?.name?.toLowerCase()
        ).filter(Boolean);

        if (roles.length === 0) {
            return 'user';
        }

        // Get role priority - higher number = higher priority
        const getPriority = (role: string): number => {
            if (role.includes('super admin')) return 100;
            if (role.includes('admin')) return 90;
            if (role.includes('registrar')) return 80;
            if (role.includes('cashier')) return 70;
            if (role.includes('faculty')) return 60;
            return 50;
        };

        // Return highest priority role
        return roles.reduce((highest: string, current: string) => {
            return getPriority(current) > getPriority(highest) ? current : highest;
        }, roles[0]);
    } catch (error) {
        console.error("Error getting active role:", error);
        return 'user';
    }
}