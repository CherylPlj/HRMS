import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = await params.id;
  try {
    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .select(`
        *,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle,
          HiringManager
        )
      `)
      .eq('CandidateID', parseInt(id))
      .eq('isDeleted', false)
      .single();

    if (error) {
      console.error('Error fetching candidate:', error);
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await req.json();
    const {
      VacancyID,
      LastName,
      FirstName,
      MiddleName,
      ExtensionName,
      Email,
      ContactNumber,
      Sex,
      DateOfBirth,
      Status,
      InterviewDate,
    } = data;

    // Validation
    if (Email && (typeof Email !== 'string' || !Email.includes('@'))) {
      return NextResponse.json({ message: 'Invalid Email format' }, { status: 400 });
    }

    if (Sex && !['Male', 'Female', 'Intersex'].includes(Sex)) {
      return NextResponse.json({ message: 'Invalid value for Sex' }, { status: 400 });
    }

    // Dynamic FullName
    const fullName = [FirstName, MiddleName, LastName, ExtensionName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .update({
        VacancyID,
        LastName,
        FirstName,
        MiddleName,
        ExtensionName,
        FullName: fullName,
        Email,
        ContactNumber,
        Sex,
        DateOfBirth: DateOfBirth ? new Date(DateOfBirth).toISOString() : null,
        Phone: ContactNumber, // backward compatibility
        Status,
        InterviewDate: InterviewDate ? new Date(InterviewDate).toISOString() : null,
        DateModified: new Date().toISOString(),
      })
      .eq('CandidateID', id)
      .select();

    if (error) {
      console.error('Error updating candidate:', error);
      return NextResponse.json(
        { message: 'Error updating candidate', error },
        { status: 500 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    return NextResponse.json(
      { message: 'Error updating candidate', error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = await params.id;
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete the candidate
    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .update({
        isDeleted: true,
        updatedBy: userId
      })
      .eq('CandidateID', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error deleting candidate:', error);
      return NextResponse.json(
        { error: 'Failed to delete candidate' },
        { status: 500 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
} 