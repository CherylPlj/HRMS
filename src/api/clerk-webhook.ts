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
  const fullName = body.first_name + " " + body.last_name;
  const role = body.public_metadata?.role || "faculty"; // Customize default role
  const department = body.public_metadata?.department || null;

  const { error } = await supabase.from("users").upsert({
    id: userId,
    full_name: fullName,
    email,
    role,
    department,
  });

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: "Failed to upsert user" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
