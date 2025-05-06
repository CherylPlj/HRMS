"use client";
import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient"; // Adjust the path if needed

export default function AdminLoginPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error.message);
          return;
        }

        if (data?.role === "admin") {
          router.push("/admin");
        } else {
          console.warn("Unauthorized access: User is not an admin.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchRole();
  }, [user, router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[url('/portalBG.png')] bg-cover bg-center">
      <div className="bg-white p-6 rounded-md shadow-md backdrop-blur-sm bg-opacity-80">
        <img src="/sjsfilogo.png" className="mx-auto h-28 mb-4" />
        <h1 className="text-center text-xl font-bold text-[#800000] mb-4">
          Admin Login - SJSFI
        </h1>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-[#800000] hover:bg-red-800",
            },
          }}
          redirectUrl="/admin"
        />
      </div>
    </div>
  );
}
