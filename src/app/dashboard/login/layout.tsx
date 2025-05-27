"use client";
import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function AdminLoginPage() {
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
          redirectUrl="/dashboard/admin" // ✅ Corrected here
        />
      </div>
    </div>
  );
}
