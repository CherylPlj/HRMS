import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .select(`
        *,
        Candidates (
          CandidateID,
          FullName,
          Email,
          Status,
          DateApplied
        )
      `)
      .eq('VacancyID', parseInt(id))
      .eq('isDeleted', false)
      .single();

    if (error) {
      console.error('Error fetching vacancy:', error);
      return NextResponse.json(
        { error: 'Vacancy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vacancy);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacancy' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const data = await req.json();
    const { JobTitle, VacancyName, HiringManager, Status, NumberOfPositions, Description, DatePosted } = data;

    // Validate required fields
    if (!JobTitle || !VacancyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: any = {
      JobTitle,
      VacancyName,
      HiringManager,
      Status,
      NumberOfPositions: NumberOfPositions || 1,
      DateModified: new Date().toISOString(),
      updatedBy: userId
    };

    // Include Description if provided
    if (Description !== undefined) {
      updateData.Description = Description;
    }

    // Include DatePosted if provided
    if (DatePosted !== undefined) {
      updateData.DatePosted = DatePosted;
    }

    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .update(updateData)
      .eq('VacancyID', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating vacancy:', error);
      return NextResponse.json(
        { error: 'Failed to update vacancy' },
        { status: 500 }
      );
    }

    return NextResponse.json(vacancy);
  } catch (error) {
    console.error('Error updating vacancy:', error);
    return NextResponse.json(
      { error: 'Failed to update vacancy' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    // Soft delete the vacancy
    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .update({
        isDeleted: true,
        updatedBy: userId
      })
      .eq('VacancyID', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error deleting vacancy:', error);
      return NextResponse.json(
        { error: 'Failed to delete vacancy' },
        { status: 500 }
      );
    }

    return NextResponse.json(vacancy);
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    return NextResponse.json(
      { error: 'Failed to delete vacancy' },
      { status: 500 }
    );
  }
} 