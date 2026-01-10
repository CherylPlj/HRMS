import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from query params
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    if (!queryUserId || queryUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query the User table for RequirePasswordChange flag
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('RequirePasswordChange, ClerkID')
      .eq('ClerkID', userId)
      .single();

    if (error) {
      console.error('Error fetching user password change status:', error);
      return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
    }

    return NextResponse.json({
      requirePasswordChange: data?.RequirePasswordChange || false
    });
  } catch (error) {
    console.error('Error in password-change-status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
