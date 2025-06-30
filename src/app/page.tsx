// app/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { signOut } = useClerk();

  const navigateToFaculty = async () => {
    // Clear any existing session before navigating to faculty sign-in
    try {
      await signOut();
    } catch (error) {
      console.log('No session to sign out');
    }
    router.push('/sign-in?portal=faculty&redirect_url=/dashboard/faculty');
  };

  const navigateToAdmin = async () => {
    // Clear any existing session before navigating to admin sign-in
    try {
      await signOut();
    } catch (error) {
      console.log('No session to sign out');
    }
    router.push('/sign-in?portal=admin&redirect_url=/dashboard/admin');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Maroon background with logo and school info */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-[#800000] text-white p-8 relative">
        <div className="flex flex-col items-center">
          <Image
            alt="SJSFI Logo"
            src="/sjsfilogo.png"
            width={220}
            height={220}
            className="mb-8"
            priority
          />
          <h1 className="text-5xl font-extrabold text-center mb-4 drop-shadow-lg">
            Saint Joseph School of Fairview Inc.
          </h1>
          <p className="text-2xl text-center font-light mb-2">
            Human Resource Faculty Management System
          </p>
        </div>
      </div>

      {/* Right side - Login panel */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen bg-[#f7f8fa] relative">
        <div className="w-full max-w-xl px-6 flex flex-col items-center">
          <h2 className="text-4xl font-extrabold text-[#22223b] text-center mb-2 mt-8 md:mt-0">Welcome Back</h2>
          <p className="text-lg text-[#22223b]/80 text-center mb-8">Please select your role to continue</p>

          {/* Portal Buttons */}
          <div className="w-full flex flex-col gap-6 mb-8">
            {/* Faculty Portal */}
            <button
              type="button"
              onClick={navigateToFaculty}
              className="flex items-center w-full bg-white rounded-xl shadow-md px-6 py-6 transition hover:shadow-lg focus:outline-none group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-[#800000]/10 rounded-lg mr-6">
                <Image src="/class.png" alt="Faculty Icon" width={40} height={40} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-2xl font-bold text-[#800000] mb-1">Faculty Portal</div>
                <div className="text-base text-[#22223b]/80">Access your faculty dashboard</div>
              </div>
              <div className="ml-4">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#800000" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>

            {/* Admin Portal */}
            <button
              type="button"
              onClick={navigateToAdmin}
              className="flex items-center w-full bg-white rounded-xl shadow-md px-6 py-6 transition hover:shadow-lg focus:outline-none group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-[#B8860B]/10 rounded-lg mr-6">
                <Image src="/setting.png" alt="Admin Icon" width={40} height={40} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-2xl font-bold text-[#B8860B] mb-1">Administrator Portal</div>
                <div className="text-base text-[#22223b]/80">Access administrative controls</div>
              </div>
              <div className="ml-4">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#B8860B" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="w-full text-center mt-8 mb-4 text-[#22223b]/60 text-sm">
            © 2025 Saint Joseph School of Fairview Inc.
          </div>
        </div>
      </div>
    </div>
  );
}
