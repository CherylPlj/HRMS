// import { clerkMiddleware, createRouteMatcher, currentUser } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import { prisma } from "./lib/prisma";

// const isPublicRoute = createRouteMatcher([
//     '/login',
//     '/loginf',
//     '/student',
//     '/student/forgot-password',
//     '/faculty',
//     '/faculty/forgot-password',
//     '/terms-of-use',
//     '/privacy-statement'
// ]);


// // Routes that can be accessed while signed out
// const ignoredRoutes = [
//     "/",
//     "/sign-in(.*)",
//     "/sign-up(.*)",
//     "/api/webhooks/clerk",
//     "/api/updateUserStatus",
//     "/api/getUserRole",
//     "/api/xr/user-access-lookup",
//     "/api/faculty-documents",
//     "/api/faculty/user/[userId]",
//     "/api/leaves/[id]",
//     "/api/leaves/faculty/[facultyId]",
//     "/api/webhooks/clerk"
// ];

// export default clerkMiddleware(async (auth, req) => {
//     const { userId } = await auth();
//     const isAuthenticated = !!userId;
//     const url = new URL(req.url);

//     console.log('Middleware URL:', url.pathname); // Debug: log the current URL path

//     // If trying to access a protected route while not authenticated
//     if (!isPublicRoute(req) && !isAuthenticated) {

//         console.log('User is not authenticated, redirecting to sign-in page'); // Debug: log unauthenticated access
//         await auth.protect();
//     }


//     // If trying to access a public route while authenticated
//     if (isPublicRoute(req) && isAuthenticated) {
//         console.log('User is authenticated, redirecting to appropriate dashboard'); // Debug: log authenticated access
//         // Allow access to terms and privacy pages even when authenticated

//         if (url.pathname === '/terms-of-use' || url.pathname === '/privacy-statement') {
//             console.log('Accessing terms or privacy page, allowing access'); // Debug: log access to terms/privacy
//             return NextResponse.next();
//         }

//         const loggedInUser = await currentUser()

//         console.log('Logged in user:', loggedInUser); // Debug: log the logged-in user

//         // get user role using email from clerk to check role in supabase using email
//         const userEmail = loggedInUser?.emailAddresses[0]?.emailAddress;
//         const userRole = await getUserRole(userEmail);

//         if (userRole === 'admin') {
//             // Redirect admin users to the admin dashboard
//             return NextResponse.redirect(new URL('/admin/dashboard', req.url));
//         } else if (userRole === 'registrar') {
//             // Redirect registrar users to the registrar dashboard
//             return NextResponse.redirect(new URL('/registrar/dashboard', req.url));
//         } else if (userRole === 'cashier') {
//             // Redirect cashier users to the cashier dashboard
//             return NextResponse.redirect(new URL('/cashier/dashboard', req.url));
//         } else if (userRole === 'faculty') {
//             // Redirect faculty users to the faculty dashboard
//             return NextResponse.redirect(new URL('/faculty/home', req.url));
//         }
//         // If user is a student, redirect to student home
//         if (userRole === 'student') {
//             return NextResponse.redirect(new URL('/student/home', req.url));
//         }
//     }
//     return NextResponse.next();
// }, { debug: false });// change before pushing to production

// export const config = {
//     matcher: [
//         // Skip Next.js internals and all static files, unless found in search params
//         '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//         // Always run for API routes
//         '/(api|trpc)(.*)',
//     ],
// }

// async function getUserRole(email?: string): Promise<string> {
//     try {
//         const user = await prisma.user.findFirst({
//             where: {
//                 OR: [
//                     ...(email ? [{ Email: String(email) }] : [])
//                 ],
//             },
//             select: {
//                 Email: true,
//                 Role: {
//                     select: {
//                         role: {
//                             select: {
//                                 name: true
//                             }
//                         }
//                     }
//                 },
//             },
//         })        // Transform the response to flatten role names
//         if (user) {
//             console.log('Raw user from DB:', user); // Debug: full object
//             // Flatten role names and return the first role or a default
//             const roles = user.Role.map(r => r.role.name);
//             console.log('Extracted roles:', roles); // Debug: role array
//             console.log('Returning role:', roles[0]); // Debug: final return
//             return roles[0];
//         }

//         // If user not found, return a default role or throw an error
//         return 'student';
//     } catch (error) {
//         console.error(error)
//         // Optionally, rethrow or return a default role
//         return 'student';
//     } finally {
//         // Ensure connection cleanup in development
//         if (process.env.NODE_ENV === 'development') {
//             await prisma.$disconnect()
//         }
//     }
// }