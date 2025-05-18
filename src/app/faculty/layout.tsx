import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Check if user is authenticated and has faculty role
  if (!session.userId || !session.sessionClaims?.metadata?.role || session.sessionClaims.metadata.role !== "Faculty") {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
} 