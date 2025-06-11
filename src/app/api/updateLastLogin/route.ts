import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({ 
        LastLogin: new Date().toISOString(),
        DateModified: new Date().toISOString()
      })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error updating last login:', updateError);
      return NextResponse.json(
        { error: 'Failed to update last login' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in updateLastLogin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 