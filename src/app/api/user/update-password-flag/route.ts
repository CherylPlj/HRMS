import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(req);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, requirePasswordChange } = await req.json();

    // Verify the user making the request matches the user being updated
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the RequirePasswordChange flag in database
    const { error } = await supabaseAdmin
      .from('User')
      .update({
        RequirePasswordChange: requirePasswordChange,
        DateModified: new Date().toISOString()
      })
      .eq('ClerkID', clerkUserId);

    if (error) {
      console.error('Error updating password change flag:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-password-flag API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
