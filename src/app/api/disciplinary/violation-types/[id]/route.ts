import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { DisciplinarySeverity } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const violationType = await prisma.violationType.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!violationType) {
      return NextResponse.json(
        { error: 'Violation type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(violationType);
  } catch (error) {
    console.error('Error fetching violation type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch violation type' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate severity enum if provided
    if (body.defaultSeverity && !['Minor', 'Moderate', 'Major'].includes(body.defaultSeverity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be Minor, Moderate, or Major' },
        { status: 400 }
      );
    }

    // Check if name is being changed and if it conflicts with existing
    if (body.name) {
      const existing = await prisma.violationType.findUnique({
        where: { name: body.name },
      });

      if (existing && existing.id !== parseInt(id, 10)) {
        return NextResponse.json(
          { error: 'Violation type with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Resolve categoryId if category name is provided
    let categoryId: number | undefined;
    if (body.categoryId) {
      categoryId = body.categoryId;
    } else if (body.category) {
      const categoryRecord = await (prisma as any).disciplinaryCategory.findFirst({
        where: { name: body.category },
      });
      if (categoryRecord) {
        categoryId = categoryRecord.id;
      }
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (body.defaultSeverity !== undefined) updateData.defaultSeverity = body.defaultSeverity as DisciplinarySeverity;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.penaltyGuidelines !== undefined) updateData.penaltyGuidelines = body.penaltyGuidelines;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    updateData.updatedBy = user.id;

    const violationType = await prisma.violationType.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(violationType);
  } catch (error) {
    console.error('Error updating violation type:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update violation type';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const violationTypeId = parseInt(id, 10);

    // Get violation type name first
    const violationTypeToDelete = await prisma.violationType.findUnique({
      where: { id: violationTypeId },
      select: { name: true },
    });

    if (!violationTypeToDelete) {
      return NextResponse.json(
        { error: 'Violation type not found' },
        { status: 404 }
      );
    }

    // Check if violation type is used in any disciplinary records
    const recordsCount = await prisma.disciplinaryRecord.count({
      where: { violation: violationTypeToDelete.name },
    });

    if (recordsCount > 0) {
      // Soft delete by setting isActive to false
      const violationType = await prisma.violationType.update({
        where: { id: violationTypeId },
        data: {
          isActive: false,
          updatedBy: user.id,
        },
      });
      return NextResponse.json({ success: true, violationType, softDeleted: true });
    }

    // Hard delete if not used in any records
    await prisma.violationType.delete({
      where: { id: violationTypeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting violation type:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete violation type';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

