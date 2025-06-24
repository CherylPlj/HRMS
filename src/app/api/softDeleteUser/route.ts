import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Add helper function to log activities
async function logActivity(
  userId: string,
  actionType: string,
  entityAffected: string,
  actionDetails: string,
  ipAddress: string = 'system'
) {
  try {
    await supabase
      .from('ActivityLog')
      .insert([
        {
          UserID: userId,
          ActionType: actionType,
          EntityAffected: entityAffected,
          ActionDetails: actionDetails,
          Timestamp: new Date().toISOString(),
          IPAddress: ipAddress
        }
      ]);
    console.log('Activity logged successfully:', { actionType, userId });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, updatedBy } = await request.json();

    // Sanitize and validate inputs
    const sanitizedUserId = userId?.trim();
    const sanitizedUpdatedBy = updatedBy?.trim();

    if (!sanitizedUserId || !sanitizedUpdatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details before update
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('FirstName, LastName, Email, Status')
      .eq('UserID', sanitizedUserId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user in Supabase to set isDeleted to true
    const { error: updateError } = await supabase
      .from('User')
      .update({
        isDeleted: true,
        DateModified: new Date().toISOString(),
        updatedBy: sanitizedUpdatedBy
      })
      .eq('UserID', sanitizedUserId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    // Log the activity
    await logActivity(
      sanitizedUpdatedBy,
      'user_deleted',
      'User',
      `Soft deleted user: ${userData.FirstName} ${userData.LastName} (${userData.Email})`,
      request.headers.get('x-forwarded-for') || 'system'
    );

    return NextResponse.json({
      message: 'User deleted successfully',
      userId: sanitizedUserId
    });

  } catch (error) {
    console.error('Error in soft delete user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
} 