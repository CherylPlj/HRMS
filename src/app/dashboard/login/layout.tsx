"use client";
import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard/admin");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[url('/portalBG.png')] bg-cover bg-center">
      <div className="bg-white p-6 rounded-md shadow-md backdrop-blur-sm bg-opacity-80">
        <Image
          alt="logo"
          src="/sjsfilogo.png"
          width={112}
          height={112}
          className="mx-auto h-28 mb-4"
        />
        <h1 className="text-center text-xl font-bold text-[#800000] mb-4">
          Admin Login - SJSFI
        </h1>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-[#800000] hover:bg-red-800",
            },
          }}
          afterSignInUrl="/dashboard/admin"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
