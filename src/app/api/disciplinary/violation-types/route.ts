import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { DisciplinarySeverity } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    } else if (category) {
      // If category name is provided, find the category first
      const categoryRecord = await (prisma as any).disciplinaryCategory.findFirst({
        where: { name: category },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const violationTypes = await prisma.violationType.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(violationTypes);
  } catch (error) {
    console.error('Error fetching violation types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch violation types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.categoryId && !body.category) {
      return NextResponse.json(
        { error: 'Category ID or Category name is required' },
        { status: 400 }
      );
    }

    // Resolve categoryId from category name if needed
    let categoryId: number;
    if (body.categoryId) {
      categoryId = body.categoryId;
    } else {
      const categoryRecord = await (prisma as any).disciplinaryCategory.findFirst({
        where: { name: body.category },
      });
      if (!categoryRecord) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        );
      }
      categoryId = categoryRecord.id;
    }

    if (!body.defaultSeverity) {
      return NextResponse.json(
        { error: 'Default severity is required' },
        { status: 400 }
      );
    }

    // Validate severity enum
    if (!['Minor', 'Moderate', 'Major'].includes(body.defaultSeverity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be Minor, Moderate, or Major' },
        { status: 400 }
      );
    }

    // Check if violation type with same name already exists
    const existing = await prisma.violationType.findUnique({
      where: { name: body.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Violation type with this name already exists' },
        { status: 400 }
      );
    }

    const violationType = await prisma.violationType.create({
      data: {
        name: body.name,
        categoryId: categoryId,
        defaultSeverity: body.defaultSeverity as DisciplinarySeverity,
        description: body.description,
        penaltyGuidelines: body.penaltyGuidelines,
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdBy: user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(violationType, { status: 201 });
  } catch (error) {
    console.error('Error creating violation type:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create violation type';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

