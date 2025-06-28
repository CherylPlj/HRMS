import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; id: string }> }
) {
  try {
    const { employeeId, id } = await context.params;
    const data = await request.json();
    const skillId = parseInt(id);

    const skill = await prisma.skill.update({
      where: {
        id: skillId,
        employeeId: employeeId,
      },
      data,
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