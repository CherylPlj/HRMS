import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { performanceService } from '@/services/performanceService';
import { KPICategory } from '@prisma/client';

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
    const kpi = await performanceService.getKPIById(id);

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(kpi);
  } catch (error) {
    console.error('Error fetching KPI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch KPI';
    return NextResponse.json(
      { error: errorMessage },
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

    // Validate category enum if provided
    if (body.category && !['kpi', 'behavior', 'attendance', 'other'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be kpi, behavior, attendance, or other' },
        { status: 400 }
      );
    }

    // Validate weight (0-100) if provided
    if (body.weight !== undefined && (body.weight < 0 || body.weight > 100)) {
      return NextResponse.json(
        { error: 'Weight must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate scores if provided
    if (body.maxScore !== undefined && body.maxScore <= 0) {
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

    // Get current KPI to validate score ranges
    const currentKpi = await performanceService.getKPIById(id);
    if (!currentKpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

    const maxScore = body.maxScore ?? Number(currentKpi.maxScore);
    const minScore = body.minScore ?? Number(currentKpi.minScore);

    if (maxScore <= minScore) {
      return NextResponse.json(
        { error: 'Max score must be greater than min score' },
        { status: 400 }
      );
    }

    // Get user ID from Clerk
    const userId = user.id;

    // Update the KPI
    const kpi = await performanceService.updateKPI(id, {
      name: body.name,
      description: body.description,
      category: body.category ? (body.category as KPICategory) : undefined,
      weight: body.weight,
      maxScore: body.maxScore,
      minScore: body.minScore,
      isActive: body.isActive,
      updatedBy: userId,
    });

    return NextResponse.json(kpi);
  } catch (error) {
    console.error('Error updating KPI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update KPI';
    
    // Handle not found error
    if (errorMessage.includes('not found') || errorMessage.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

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

    // Check if KPI exists
    const kpi = await performanceService.getKPIById(id);
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

    await performanceService.deleteKPI(id);

    return NextResponse.json({ message: 'KPI deleted successfully' });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete KPI';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

