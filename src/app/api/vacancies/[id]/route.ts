import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .eq('VacancyID', parseInt(params.id))
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { JobTitle, VacancyName, HiringManager, Status, NumberOfPositions } = data;

    // Validate required fields
    if (!JobTitle || !VacancyName || !HiringManager) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .update({
        JobTitle,
        VacancyName,
        HiringManager,
        Status,
        NumberOfPositions: NumberOfPositions || 1,
        DateModified: new Date().toISOString(),
        updatedBy: userId
      })
      .eq('VacancyID', parseInt(params.id))
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete the vacancy
    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .update({
        isDeleted: true,
        updatedBy: userId
      })
      .eq('VacancyID', parseInt(params.id))
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