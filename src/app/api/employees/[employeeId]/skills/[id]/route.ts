import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/utils/serverRoleUtils';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot edit skills
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to edit skills' },
        { status: 403 }
      );
    }

    const { employeeId, id } = await context.params;
    const data = await request.json();
    const skillId = parseInt(id);

    // Remove yearsOfExperience if present (legacy field)
    const { yearsOfExperience, ...updateData } = data;

    // Check if a skill with the same name already exists for this employee (excluding current skill)
    if (updateData.name) {
      const existingSkill = await prisma.skill.findFirst({
        where: {
          employeeId: employeeId,
          id: {
            not: skillId, // Exclude the current skill being updated
          },
          name: {
            equals: updateData.name,
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
    }

    const skill = await prisma.skill.update({
      where: {
        id: skillId,
        employeeId: employeeId,
      },
      data: updateData,
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot delete skills
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to delete skills' },
        { status: 403 }
      );
    }

    const { employeeId, id } = await context.params;
    const skillId = parseInt(id);

    await prisma.skill.delete({
      where: {
        id: skillId,
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
} 