import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  try {
    const { data: existingApplications, error } = await supabaseAdmin
      .from('Candidate')
      .select('CandidateID')
      .eq('Email', email)
      .eq('isDeleted', false);

    if (error) {
      console.error('Error checking email:', error);
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: existingApplications.length > 0,
      applicationCount: existingApplications.length
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: 'Failed to check email' },
      { status: 500 }
    );
  }
} 