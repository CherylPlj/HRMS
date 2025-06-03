import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public routes that don't require authentication
const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/webhooks/clerk",
    "/api/updateUserStatus"
];

// Routes that can be accessed while signed out
const ignoredRoutes = [
    "/api/webhooks/clerk",
    "/api/updateUserStatus"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isIgnoredRoute = createRouteMatcher(ignoredRoutes);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    const isAuthenticated = !!userId;
    const url = new URL(req.url);

    // Allow access to ignored routes
    if (isIgnoredRoute(req)) {
        return NextResponse.next();
    }

    // If trying to access a protected route while not authenticated
    if (!isPublicRoute(req) && !isAuthenticated) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // If trying to access a public route while authenticated
    if (isPublicRoute(req) && isAuthenticated) {
        // Allow access to terms and privacy pages
        if (url.pathname === '/terms-of-use' || url.pathname === '/privacy-statement') {
            return NextResponse.next();
        }

        // Redirect to appropriate dashboard based on role
        const session = await auth();
        const userEmail = session.sessionClaims?.email as string;
        const userRole = await getUserRole(userEmail);

        if (userRole === 'admin') {
            return NextResponse.redirect(new URL('/dashboard/admin', req.url));
        } else if (userRole === 'faculty') {
            return NextResponse.redirect(new URL('/dashboard/faculty', req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

async function getUserRole(email?: string): Promise<string> {
    if (!email) return '';

    const { data, error } = await supabase
        .from('User')
        .select(`
            UserRole (
                role:Role (
                    name
                )
            )
        `)
        .eq('Email', email)
        .single();

    if (error || !data) return '';

    const roleData = data.UserRole?.[0]?.role;
    if (!roleData || !('name' in roleData)) return '';

    return (roleData as { name: string }).name.toLowerCase();
}