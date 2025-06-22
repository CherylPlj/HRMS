import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
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
    "/api/webhooks/clerk"
];

// Routes that can be accessed while signed out
const ignoredRoutes = [
    "/",
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
    "/api/webhooks/clerk"
];

// Add dashboard routes that require authentication
const dashboardRoutes = [
    "/dashboard",
    "/dashboard/(.*)"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isIgnoredRoute = createRouteMatcher(ignoredRoutes);
const isDashboardRoute = createRouteMatcher(dashboardRoutes);

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
        "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co; " +
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

    // Check for dashboard routes specifically
    if (isDashboardRoute(req)) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        return response;
    }

    // If trying to access a protected route while not authenticated
    if (!isPublicRoute(req) && !isAuthenticated) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // If trying to access a public route while authenticated
    if (isPublicRoute(req) && isAuthenticated) {
        // Allow access to terms and privacy pages
        if (url.pathname === '/terms-of-use' || url.pathname === '/privacy-statement') {
            return response;
        }

        // If accessing sign-in page while authenticated, immediately redirect to /dashboard
        if (url.pathname.startsWith('/sign-in')) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }

    return response;
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

async function getUserRole(email?: string): Promise<string> {
    if (!email) return '';

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
            .eq('Email', email.toLowerCase().trim())
            .single();

        if (error) {
            console.error("Database error:", error);
            return '';
        }

        if (!data) return '';

        const roleData = data.UserRole?.[0]?.role;
        if (!roleData || !('name' in roleData)) return '';

        return (roleData as { name: string }).name.toLowerCase();
    } catch (error) {
        console.error("Error getting user role:", error);
        return '';
    }
}