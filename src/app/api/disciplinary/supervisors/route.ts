import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users who have been assigned as supervisors in disciplinary records
    const supervisors = await prisma.user.findMany({
      where: {
        DisciplinarySupervisor: {
          some: {},
        },
      },
      select: {
        UserID: true,
        FirstName: true,
        LastName: true,
        Email: true,
      },
      orderBy: {
        LastName: 'asc',
      },
    });

    // Also get unique supervisors from disciplinary records
    const records = await prisma.disciplinaryRecord.findMany({
      where: {
        supervisorId: {
          not: null,
        },
      },
      select: {
        supervisor: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
            Email: true,
          },
        },
      },
      distinct: ['supervisorId'],
    });

    // Combine and deduplicate
    const supervisorMap = new Map();
    
    supervisors.forEach((sup) => {
      supervisorMap.set(sup.UserID, {
        id: sup.UserID,
        name: `${sup.FirstName} ${sup.LastName}`.trim(),
        email: sup.Email,
      });
    });

    records.forEach((record) => {
      if (record.supervisor) {
        supervisorMap.set(record.supervisor.UserID, {
          id: record.supervisor.UserID,
          name: `${record.supervisor.FirstName} ${record.supervisor.LastName}`.trim(),
          email: record.supervisor.Email,
        });
      }
    });

    const uniqueSupervisors = Array.from(supervisorMap.values());

    return NextResponse.json(uniqueSupervisors);
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervisors' },
      { status: 500 }
    );
  }
}

