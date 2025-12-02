import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { KPICategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: any = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const category = searchParams.get('category');
    if (category && category !== 'all') {
      if (['kpi', 'behavior', 'attendance', 'other'].includes(category)) {
        filters.category = category as KPICategory;
      }
    } else if (category === 'all') {
      filters.category = 'all';
    }

    const isActive = searchParams.get('isActive');
    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    const searchQuery = searchParams.get('search');
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = await performanceService.getKPIs(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch KPIs';
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

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'KPI name is required' },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: 'KPI description is required' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'KPI category is required' },
        { status: 400 }
      );
    }

    if (!['kpi', 'behavior', 'attendance', 'other'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be kpi, behavior, attendance, or other' },
        { status: 400 }
      );
    }

    if (body.weight === undefined || body.weight === null) {
      return NextResponse.json(
        { error: 'KPI weight is required' },
        { status: 400 }
      );
    }

    if (body.maxScore === undefined || body.maxScore === null) {
      return NextResponse.json(
        { error: 'KPI max score is required' },
        { status: 400 }
      );
    }

    // Validate weight (0-100)
    if (body.weight < 0 || body.weight > 100) {
      return NextResponse.json(
        { error: 'Weight must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate scores
    if (body.maxScore <= 0) {
      return NextResponse.json(
        { error: 'Max score must be greater than 0' },
        { status: 400 }
      );
    }

    if (body.minScore !== undefined && body.minScore < 0) {
      return NextResponse.json(
        { error: 'Min score must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    if (body.minScore !== undefined && body.maxScore <= body.minScore) {
      return NextResponse.json(
        { error: 'Max score must be greater than min score' },
        { status: 400 }
      );
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Create the KPI
    const kpi = await performanceService.createKPI({
      name: body.name,
      description: body.description,
      category: body.category as KPICategory,
      weight: body.weight,
      maxScore: body.maxScore,
      minScore: body.minScore,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: userId,
    });

    return NextResponse.json(kpi, { status: 201 });
  } catch (error) {
    console.error('Error creating KPI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create KPI';
    
    // Handle unique constraint violation
    if (errorMessage.includes('Unique constraint') || errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: 'A KPI with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

