import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensurePrismaConnected();

    const { id } = await params;
    let category;
    try {
      category = await (prisma as any).disciplinaryCategory.findUnique({
        where: { id: parseInt(id, 10) },
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        category = await (prisma as any).disciplinaryCategory.findUnique({
          where: { id: parseInt(id, 10) },
        });
      } else {
        throw queryError;
      }
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
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

    await ensurePrismaConnected();

    const { id } = await params;
    const body = await request.json();

    // Check if name is being changed and if it conflicts with existing
    if (body.name) {
      let existing;
      try {
        existing = await (prisma as any).disciplinaryCategory.findUnique({
          where: { name: body.name },
        });
      } catch (queryError: any) {
        if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
          await ensurePrismaConnected();
          existing = await (prisma as any).disciplinaryCategory.findUnique({
            where: { name: body.name },
          });
        } else {
          throw queryError;
        }
      }

      if (existing && existing.id !== parseInt(id, 10)) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    updateData.updatedBy = user.id;

    let category;
    try {
      category = await (prisma as any).disciplinaryCategory.update({
        where: { id: parseInt(id, 10) },
        data: updateData,
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        category = await (prisma as any).disciplinaryCategory.update({
          where: { id: parseInt(id, 10) },
          data: updateData,
        });
      } else {
        throw queryError;
      }
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
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

    await ensurePrismaConnected();

    const { id } = await params;

    // Check if category is used in any violation types
    let violationTypesCount;
    try {
      violationTypesCount = await prisma.violationType.count({
        where: { categoryId: parseInt(id, 10) },
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        violationTypesCount = await prisma.violationType.count({
          where: { categoryId: parseInt(id, 10) },
        });
      } else {
        throw queryError;
      }
    }

    if (violationTypesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It is used in ${violationTypesCount} violation type(s).` },
        { status: 400 }
      );
    }

    // Get category name first
    let categoryToDelete;
    try {
      categoryToDelete = await (prisma as any).disciplinaryCategory.findUnique({
        where: { id: parseInt(id, 10) },
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        categoryToDelete = await (prisma as any).disciplinaryCategory.findUnique({
          where: { id: parseInt(id, 10) },
        });
      } else {
        throw queryError;
      }
    }

    if (!categoryToDelete) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is used in any disciplinary records
    let recordsCount;
    try {
      recordsCount = await prisma.disciplinaryRecord.count({
        where: { category: categoryToDelete.name },
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        recordsCount = await prisma.disciplinaryRecord.count({
          where: { category: categoryToDelete.name },
        });
      } else {
        throw queryError;
      }
    }

    if (recordsCount > 0) {
      // Soft delete by setting isActive to false
      let category;
      try {
        category = await (prisma as any).disciplinaryCategory.update({
          where: { id: parseInt(id, 10) },
          data: {
            isActive: false,
            updatedBy: user.id,
          },
        });
      } catch (queryError: any) {
        if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
          await ensurePrismaConnected();
          category = await (prisma as any).disciplinaryCategory.update({
            where: { id: parseInt(id, 10) },
            data: {
              isActive: false,
              updatedBy: user.id,
            },
          });
        } else {
          throw queryError;
        }
      }
      return NextResponse.json({ success: true, category, softDeleted: true });
    }

    // Hard delete if not used in any records
    try {
      await (prisma as any).disciplinaryCategory.delete({
        where: { id: parseInt(id, 10) },
      });
    } catch (queryError: any) {
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        await (prisma as any).disciplinaryCategory.delete({
          where: { id: parseInt(id, 10) },
        });
      } else {
        throw queryError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

