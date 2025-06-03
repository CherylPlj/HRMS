import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to HRMS
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete your registration to get started
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-[#800000] hover:bg-[#600000] text-sm normal-case',
              card: 'bg-white shadow-none',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 
                'border border-gray-300 hover:bg-gray-50 text-sm normal-case',
              formFieldInput: 
                'rounded-lg border-gray-300 focus:border-[#800000] focus:ring-[#800000]',
              formFieldLabel: 'text-gray-700',
              footerActionLink: 'text-[#800000] hover:text-[#600000]',
            },
          }}
          redirectUrl="/dashboard"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
} 