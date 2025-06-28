import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    console.log('Testing Supabase connection...');

    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('Employee')
      .select('EmployeeID, FirstName, LastName')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      sampleData: data
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { 
        error: 'Connection test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 