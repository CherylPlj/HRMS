import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { email, userID } = await request.json();
    console.log('Sync password request received:', { email, userID });

    if (!email && !userID) {
      return NextResponse.json(
        { error: 'Email or UserID is required' },
        { status: 400 }
      );
    }

    // First, let's check if the user exists
    let userQuery = supabaseAdmin.from('User').select('UserID, Email, PasswordHash');
    
    if (userID) {
      userQuery = userQuery.eq('UserID', userID);
    } else {
      userQuery = userQuery.eq('Email', email);
    }

    const { data: userData, error: userError } = await userQuery.single();
    
    if (userError) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError.message },
        { status: 404 }
      );
    }

    console.log('Found user:', userData);

    // Update the user's password hash to indicate it's managed by Clerk
    const updateData = {
      PasswordHash: 'CLERK_MANAGED',
      DateModified: new Date().toISOString()
    };

    console.log('Attempting to update user with data:', updateData);

    const { data, error } = await supabaseAdmin
      .from('User')
      .update(updateData)
      .eq('UserID', userData.UserID)
      .select();

    if (error) {
      console.error('Error updating user password status:', error);
      return NextResponse.json(
        { error: 'Failed to update user password status', details: error.message },
        { status: 500 }
      );
    }

    console.log('Update successful, updated data:', data);

    return NextResponse.json({ 
      success: true, 
      message: 'User password status updated successfully',
      beforeUpdate: userData,
      afterUpdate: data?.[0] || null
    });

  } catch (error) {
    console.error('Error in sync-user-password:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 