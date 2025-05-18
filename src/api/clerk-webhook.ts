// /app/api/clerk-webhook/route.ts (Next.js App Router)
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();

  const userId = body.id; // Clerk user ID
  const email = body.email_addresses?.[0]?.email_address || "";
  const firstName = body.first_name;
  const lastName = body.last_name;
  const role = body.public_metadata?.role || "Faculty"; // Customize default role
  const now = new Date().toISOString();

  // Generate a temporary password hash
  const tempPasswordHash = Buffer.from(Math.random().toString()).toString('base64');

  const { error } = await supabase.from("User").upsert({
    UserID: parseInt(userId),
    FirstName: firstName,
    LastName: lastName,
    Email: email.toLowerCase(),
    Photo: '', // Default empty string
    PasswordHash: tempPasswordHash,
    Role: role,
    Status: 'Active',
    DateCreated: now,
    DateModified: null,
    LastLogin: null
  });

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: "Failed to upsert user" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
