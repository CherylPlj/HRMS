import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { employeeId } = await context.params;
    const data = await request.json();

    const skill = await prisma.skill.create({
      data: {
        ...data,
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