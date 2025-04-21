"use client"; 
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function FacultyLoginLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const router = useRouter(); // Initialize the router

  const handleSignIn = () => {
    router.push('/faculty'); // Redirect to the faculty page
  };
  
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Faculty Login Page</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
          rel="stylesheet"
        />
      </Head>

      <div className="flex justify-end min-h-screen bg-[url('/portalBG.png')] bg-cover bg-center">
        <div className="w-2/3 max-w-2xl bg-white p-8 bg-opacity-75 backdrop-blur-sm">
          <div className="w-full p-2">
            <div className="flex justify-center mb-4">
              <img
                alt="Saint Joseph School of Fairview Inc. logo"
                className="mx-auto h-50 w-50 py-5"
                src="/sjsfilogo.png"
              />
            </div>
        
            <h1 className="text-4xl font-bold mb-4 text-center text-[#800000]">
              SAINT JOSEPH SCHOOL OF FAIRVIEW INC.
            </h1>

            <div className="flex items-center justify-center mb-4 ">
              <button
                onClick={() => window.history.back()} // Go back to the previous page
                className="text-[#800000] hover:text-red-800 mr-4"
                aria-label="Go Back"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h2 className="text-center text-xl font-bold text-black">Faculty Login</h2>
            </div>
            <p className="text-center text-black mb-6 pt-5">Sign in to your account.</p>


      <form>
        <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-black-700">Email<span className="text-red-500">*</span></label>
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            id="email"
            name="email"
            placeholder="Email"
            type="email"
          />
        </div>

        <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-black-700">Password<span className="text-red-500">*</span></label>
          <div className="relative mt-1">
            <input
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              id="password"
              name="password"
              placeholder="Password"
              type="password"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i className="fas fa-eye text-gray-500"></i>
            </div>
          </div>
        </div>

        <h1 className="text-1xl py-5 font-regular mb-4 text-center">Forgot Password?Click <a href ="/reset_password" className="text-[#800000] font-bold ">Here</a></h1>

        <div>
          <button
            className="w-full bg-[#800000] text-white py-2 rounded-md font-semibold hover:bg-red-800"
            type="button" 
            onClick={handleSignIn} // Call the handleSignIn function on click
          >
            Sign In
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        By using this service, you understood and agree to the SJSFI Online Services{' '}
        <a className="text-blue-500 underline" href="#">
          Terms of Use
        </a>{' '}
        and{' '}
        <a className="text-blue-500 underline" href="#">
          Privacy Statement
        </a>
        .
      </p>
            {/* {children} */}
          </div>
        </div>
      </div>
    </>
  );
}