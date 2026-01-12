import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/faculty/by-email?email=xxx - Get faculty by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        Email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        Faculty: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    if (!user || !user.Faculty) {
      return NextResponse.json(
        { error: 'Faculty member not found' },
        { status: 404 }
      );
    }

    // Return faculty data with user info
    return NextResponse.json({
      FacultyID: user.Faculty.FacultyID,
      EmployeeID: user.Faculty.EmployeeID,
      User: {
        FirstName: user.FirstName,
        LastName: user.LastName,
        Email: user.Email,
      },
    });
  } catch (error) {
    console.error('Error fetching faculty by email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty information' },
      { status: 500 }
    );
  }
}
