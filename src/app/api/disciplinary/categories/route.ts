import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure Prisma is connected
    await ensurePrismaConnected();

    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';

    // Get all active categories from DisciplinaryCategory table
    let categories;
    try {
      // Retry logic for transient connection errors
      let retries = 2;
      while (retries >= 0) {
        try {
          categories = await (prisma as any).disciplinaryCategory.findMany({
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              description: true,
            },
            orderBy: {
              name: 'asc',
            },
          });
          break; // Success, exit retry loop
        } catch (queryError: any) {
          // Check if it's a prepared statement error (transient)
          if (
            queryError?.code === '26000' ||
            queryError?.message?.includes('prepared statement') ||
            queryError?.message?.includes('does not exist')
          ) {
            if (retries > 0) {
              // Retry after reconnecting
              await ensurePrismaConnected();
              retries--;
              continue;
            }
          }
          // If not a transient error or out of retries, throw
          throw queryError;
        }
      }
    } catch (dbError: any) {
      // Handle case where table doesn't exist or schema issue
      console.error('Database error fetching categories:', dbError);
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Categories table does not exist. Please run database migrations.' },
          { status: 500 }
        );
      }
      throw dbError;
    }

    // Return full objects if requested, otherwise just names for backward compatibility
    if (full) {
      return NextResponse.json(categories);
    }
    return NextResponse.json(categories.map((c: { name: string }) => c.name));
  } catch (error) {
    console.error('Error fetching categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json(
      { error: errorMessage },
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

    // Ensure Prisma is connected
    await ensurePrismaConnected();

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    let existing;
    try {
      existing = await (prisma as any).disciplinaryCategory.findUnique({
        where: { name: body.name },
      });
    } catch (queryError: any) {
      // Retry on connection errors
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        existing = await (prisma as any).disciplinaryCategory.findUnique({
          where: { name: body.name },
        });
      } else {
        throw queryError;
      }
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    let category;
    try {
      category = await (prisma as any).disciplinaryCategory.create({
        data: {
          name: body.name,
          description: body.description,
          isActive: body.isActive !== undefined ? body.isActive : true,
          createdBy: user.id,
        },
      });
    } catch (queryError: any) {
      // Retry on connection errors
      if (queryError?.code === '26000' || queryError?.message?.includes('prepared statement')) {
        await ensurePrismaConnected();
        category = await (prisma as any).disciplinaryCategory.create({
          data: {
            name: body.name,
            description: body.description,
            isActive: body.isActive !== undefined ? body.isActive : true,
            createdBy: user.id,
          },
        });
      } else {
        throw queryError;
      }
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
