import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/utils/serverRoleUtils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    
    const skills = await prisma.skill.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot add skills
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to add skills' },
        { status: 403 }
      );
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    // Remove any id field and yearsOfExperience (if present) from the data
    const { id, yearsOfExperience, ...skillData } = data;

    // Check if a skill with the same name already exists for this employee
    const existingSkill = await prisma.skill.findFirst({
      where: {
        employeeId: employeeId,
        name: {
          equals: skillData.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
      },
    });

    if (existingSkill) {
      return NextResponse.json(
        { error: 'A skill with this name already exists for this employee' },
        { status: 400 }
      );
    }

    const skill = await prisma.skill.create({
      data: {
        ...skillData,
        employeeId: employeeId,
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
} 