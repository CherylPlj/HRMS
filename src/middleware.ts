import { clerkMiddleware, createRouteMatcher, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
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
    "/terms-of-use",
    "/privacy-statement"
];

// Routes that can be accessed while signed out
const ignoredRoutes = [
    "/",
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
    "/terms-of-use",
    "/privacy-statement"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isIgnoredRoute = createRouteMatcher(ignoredRoutes);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    const isAuthenticated = !!userId;
    const url = new URL(req.url);
    
    // Add security headers
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://cdn.jsdelivr.net blob:; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
        "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://clerk-telemetry.com; " +
        "frame-src 'self' https://*.clerk.accounts.dev; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' blob:;"
    );

    // Always allow access to ignored routes
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
        // Redirect from sign-in/sign-up to dashboard if already authenticated
        if (url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up')) {
            try {
            // Get user's role
            const role = await getUserRole(userId ? userId : undefined);

            // Redirect to appropriate dashboard based on role
                if (role === 'admin' || role === 'super admin') {
                return NextResponse.redirect(new URL('/dashboard/admin', req.url));
            } else if (role === 'faculty') {
                return NextResponse.redirect(new URL('/dashboard/faculty', req.url));
            } else {
                    return NextResponse.redirect(new URL('/dashboard', req.url));
                }
            } catch (error) {
                console.error("Error during role-based redirect:", error);
                // Fallback to general dashboard if role lookup fails
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }
        return response;
    }

    // If not authenticated and trying to access a protected route, redirect to sign-in
    if (!isPublicRoute(req)) {
        const redirectUrl = new URL('/sign-in', req.url);
        redirectUrl.searchParams.set('redirect_url', url.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    return response;
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