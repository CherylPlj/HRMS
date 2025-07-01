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
      {/* Left side - Background */}
      <div className="flex-1 bg-[url('/portalBG.png')] bg-cover bg-center" />

      {/* Right side - Login panel */}
      <div className="absolute right-0 w-full md:w-1/3 min-h-screen min-w-[360px] pt-[10vh] overflow-hidden bg-white/70 backdrop-blur-[20px] backdrop-saturate-[168%] shadow-md m-0 rounded-none flex flex-col bg-clip-border border border-transparent break-words mb-4">
        <div className="flex flex-col items-center h-full w-full">
          <div className="flex flex-col items-center justify-center w-full mb-4">
            <Image
              alt="SJSFI Logo"
              src="/sjsfilogo.png"
              width={90}
              height={90}
              className="mb-2"
              priority
            />
            <h1 className="text-3xl text-center text-[#800000] w-full">
              Welcome to <span className="font-bold">SJSFI-FLS Portal</span>
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center w-full">
            <p className="text-center text-black text-sm mb-4">
              Please click or tap your role to sign in
            </p>
            <div className="w-full px-4">
              <div className="mb-4 w-full">
                <button
                  type="button"
                  onClick={navigateToFaculty}
                  className="relative bg-[#800000] text-white text-base font-medium rounded-sm px-4 py-3 w-full transition duration-200 ease-in-out hover:before:absolute hover:before:inset-0 hover:before:bg-black hover:before:opacity-50 hover:before:rounded-sm"
                >
                  <span className="relative z-10">Faculty</span>
                </button>
              </div>
              <div className="mb-4 w-full">
                <button
                  type="button"
                  onClick={navigateToAdmin}
                  className="relative bg-[#B8860B] text-white text-base font-medium rounded-sm px-4 py-3 w-full transition duration-200 ease-in-out hover:before:absolute hover:before:inset-0 hover:before:bg-black hover:before:opacity-25 hover:before:rounded-sm"
                >
                  <span className="relative z-10">Admin</span>
                </button>
              </div>
              <div className="flex items-center justify-center mb-4 w-full">
                <p className="text-sm text-black text-center">
                  By using this service, you understood and agree to the
                  <span className="font-medium text-[#DAA520]"> SJSFI Online Services </span>
                  <a
                    className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                    href="/terms-of-use"
                  >
                    Terms of Use
                  </a>
                  {' '}and{' '}
                  <a
                    className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                    href="/privacy-statement"
                  >
                    Privacy Statement
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
