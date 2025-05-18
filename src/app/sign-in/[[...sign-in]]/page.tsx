import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-4">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-[#800000] hover:bg-red-800 text-sm normal-case",
              footerActionLink: "text-[#800000] hover:text-red-800",
            },
          }}
        />
      </div>
    </div>
  );
} 