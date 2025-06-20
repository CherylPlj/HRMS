import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST() {
    try {
        // Clear any active sessions in Supabase
        const { error: supabaseError } = await supabase.auth.signOut();
        
        if (supabaseError) {
            console.error('Error clearing Supabase sessions:', supabaseError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error during cleanup:', error);
        return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
    }
} 