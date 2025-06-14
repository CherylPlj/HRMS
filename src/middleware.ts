import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/clerk",
    "/api/updateUserStatus",
    "/api/getUserRole",
    "/api/xr/user-access-lookup",
    "/api/faculty-documents",
    "/api/faculty/user/[userId]",
    "/api/faculty-documents/[documentId]",
    "/api/leaves/[id]",
    "/api/webhooks/clerk"
];

// Routes that can be accessed while signed out
const ignoredRoutes = [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/clerk",
    "/api/updateUserStatus",
    "/api/getUserRole",
    "/api/xr/user-access-lookup",
    "/api/faculty-documents",
    "/api/faculty/user/[userId]",
    "/api/faculty-documents/[documentId]",
    "/api/leaves/[id]",
    "/api/webhooks/clerk"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isIgnoredRoute = createRouteMatcher(ignoredRoutes);

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const userLimit = rateLimit.get(ip);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= MAX_REQUESTS) {
        return false;
    }

    userLimit.count++;
    return true;
}

export default clerkMiddleware(async (auth, req) => {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Only apply rate limiting to authentication-related routes
    if (req.url.includes('/sign-in') || req.url.includes('/sign-up')) {
        // Check rate limit
        if (!checkRateLimit(ip)) {
            const response = new NextResponse(
                JSON.stringify({
                    error: "Too many requests. Please try again in a minute.",
                    retryAfter: 60
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": "60",
                    },
                }
            );
            return response;
        }
    }

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
        "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co; " +
        "frame-src 'self' https://*.clerk.accounts.dev; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' blob:;"
    );

    // Allow access to ignored routes
    if (isIgnoredRoute(req)) {
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

        try {
            // Redirect to appropriate dashboard based on role
            const session = await auth();
            const userEmail = session.sessionClaims?.email as string;
            
            if (!userEmail) {
                throw new Error("No email found in session");
            }

            const userRole = await getUserRole(userEmail);
            
            if (!userRole) {
                throw new Error("No role found for user");
            }
            

            switch (userRole.toLowerCase()) {
                case 'admin':
                    return NextResponse.redirect(new URL('/dashboard/admin', req.url));
                case 'faculty':
                    return NextResponse.redirect(new URL('/dashboard/faculty', req.url));
                case 'registrar':
                    return NextResponse.redirect(new URL('/dashboard/registrar', req.url));
                case 'cashier':
                    return NextResponse.redirect(new URL('/dashboard/cashier', req.url));
                default:
                    throw new Error("Invalid user role");
            }
        } catch (error) {
            console.error("Authentication error:", error);
            return NextResponse.redirect(new URL('/sign-in?error=unauthorized', req.url));
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