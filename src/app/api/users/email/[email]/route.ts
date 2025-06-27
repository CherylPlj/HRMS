import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { generateUserId } from '@/lib/generateUserId';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ email: string }> }
) {
    try {
        const { params } = context;
        const { email } =  await params;
        const { userId: clerkId } = await auth();
        
        console.log('Fetching user data for email:', email);

        if (!clerkId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let user = await prisma.user.findUnique({
            where: {
                Email: email
            },
            select: {
                UserID: true,
                FirstName: true,
                LastName: true,
                Email: true,
                Photo: true,
                Status: true
            }
        });

        if (!user) {
            console.log('User not found, creating new user record');
            
            // Extract name from email (before @ symbol)
            const nameFromEmail = email.split('@')[0];
            const firstName = nameFromEmail.split('.')[0];
            const lastName = nameFromEmail.split('.')[1] || nameFromEmail;

            // Generate a unique UserID using centralized function
            const userID = await generateUserId(new Date());

            // Create new user
            user = await prisma.user.create({
                data: {
                    UserID: userID,
                    ClerkID: clerkId,
                    FirstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
                    LastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
                    Email: email,
                    PasswordHash: 'CLERK_AUTH', // Since we're using Clerk for authentication
                    Status: 'Active',
                    DateCreated: new Date(),
                    isDeleted: false
                },
                select: {
                    UserID: true,
                    FirstName: true,
                    LastName: true,
                    Email: true,
                    Photo: true,
                    Status: true
                }
            });

            console.log('Created new user:', user);
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in user email API:', error);
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 