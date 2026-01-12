'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="shadow-sm sticky top-0 z-50" style={{ backgroundColor: '#8B0000' }}>
        {/* Main Header - Maroon background */}
        <div className="min-h-[80px] md:min-h-[90px]" style={{ backgroundColor: '#8B0000' }}>
          <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            {/* Left Section - Logo and School Name */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Link href="/careers" className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-all duration-300 hover:scale-105">
                <Image
                  alt="SJSFI Logo"
                  src="/sjsfilogo.png"
                  width={60}
                  height={60}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-[60px] md:h-[60px] rounded-full shadow-md"
                  priority
                />
              </Link>
              <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold whitespace-nowrap drop-shadow-sm text-white max-w-[150px] sm:max-w-none overflow-hidden text-ellipsis">
                Saint Joseph School of Fairview Inc.
              </h1>
            </div>

            {/* Right Section - Navigation and Login */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <nav className="hidden md:flex gap-4 lg:gap-6 text-white">
                <Link 
                  href="/careers" 
                  className={`transition-all duration-200 text-sm lg:text-base font-medium px-3 py-1.5 rounded-md ${
                    pathname === '/' || pathname === '/careers'
                      ? 'text-white shadow-md' 
                      : 'hover:bg-white/20'
                  }`}
                  style={pathname === '/' || pathname === '/careers' ? { backgroundColor: '#DAA520' } : {}}
                >
                  Careers at SJSFI
                </Link>
                <Link 
                  href="/careers/all-vacancies" 
                  className={`transition-all duration-200 text-sm lg:text-base font-medium px-3 py-1.5 rounded-md ${
                    pathname === '/careers/all-vacancies' 
                      ? 'text-white shadow-md' 
                      : 'hover:bg-white/20'
                  }`}
                  style={pathname === '/careers/all-vacancies' ? { backgroundColor: '#DAA520' } : {}}
                >
                  All Vacancies
                </Link>
              </nav>
              <button
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.log('No session to sign out');
                  }
                  router.push('/sign-in');
                }}
                className="text-white px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm md:text-base whitespace-nowrap shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                style={{ backgroundColor: '#DAA520' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c4941d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DAA520'}
                title="for Admin or Employees"
                aria-label="HRMS Portal for Admin or Employees"
              >
                HRMS Portal 
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Careers */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6" style={{ color: '#8B0000' }}>
            Careers at SJSFI
          </h1>

          <div className="prose max-w-none mb-8">
            <p className="text-sm sm:text-base mb-4 text-black">
              Saint Joseph School of Fairview Inc. is always seeking passionate educators and dedicated professionals who share our commitment to excellence in education. We offer a supportive work environment where you can grow professionally while making a meaningful impact on young lives.
            </p>
            <p className="text-sm sm:text-base text-black">
              As part of the SJSFI family, you'll join a community of educators who are devoted to nurturing students' academic, spiritual, and personal development. We value innovation, collaboration, and continuous learning in our pursuit of educational excellence.
            </p>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 mt-12" style={{ color: '#8B0000' }}>
            Current Job Openings
          </h2>

          <p className="text-sm sm:text-base text-black mb-8">
            We are currently looking for qualified and passionate individuals to join our team. Explore the available positions below and find the opportunity that matches your skills and career aspirations.
          </p>

          <div className="text-center mb-8">
            <Link
              href="/careers"
              className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-all duration-200 inline-block shadow-md hover:shadow-lg transform hover:-translate-y-1 text-sm sm:text-base text-white"
              style={{ backgroundColor: '#8B0000' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a0000'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B0000'}
            >
              View All Job Openings
            </Link>
          </div>

          {/* Why Work at SJSFI Section */}
          <div className="mt-12 mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#8B0000' }}>
              Why Work at SJSFI?
            </h2>
            <p className="text-sm sm:text-base text-black mb-8">
              SJSFI offers more than just a job - we provide a fulfilling career where you can make a lasting difference in the lives of young people. Our school values work-life balance, professional growth, and creating a positive impact in education.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-xs sm:text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1 text-sm sm:text-base">Competitive Compensation</h3>
                  <p className="text-black text-xs sm:text-sm">
                    We offer competitive salaries and comprehensive benefits package including health insurance and performance incentives.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-xs sm:text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1 text-sm sm:text-base">Professional Development</h3>
                  <p className="text-black text-xs sm:text-sm">
                    Access to continuous learning opportunities, workshops, seminars, and educational advancement programs.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-xs sm:text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1 text-sm sm:text-base">Supportive Environment</h3>
                  <p className="text-black text-xs sm:text-sm">
                    Collaborative workplace culture with supportive colleagues and administration committed to your success.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-xs sm:text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1 text-sm sm:text-base">Meaningful Impact</h3>
                  <p className="text-black text-xs sm:text-sm">
                    Opportunity to shape young minds and contribute to building future leaders with strong values and character.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Matching header style */}
      <footer className="text-white mt-auto shadow-sm" style={{ backgroundColor: '#800000' }}>
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-4 text-white">Quick Links</h3>
              <ul className="space-y-2 sm:space-y-2.5">
                <li>
                  <Link href="/careers" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">Careers at SJSFI</span>
                  </Link>
                </li>
                <li>
                  <Link href="/careers/all-vacancies" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">All Vacancies</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Links */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-4 text-white">Important Links</h3>
              <ul className="space-y-2 sm:space-y-2.5">
                <li>
                  <Link href="/sign-in" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">HRMS Portal</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi-sis.vercel.app/" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">SIS Portal</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Notices */}
            <div className="sm:col-span-2 md:col-span-1">
              <h3 className="text-base sm:text-lg font-bold mb-4 text-white">Important Notices</h3>
              <ul className="space-y-2 sm:space-y-2.5">
                <li>
                  <Link href="https://sjsfi.vercel.app/privacy-policy" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/terms-of-service" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/data-privacy" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block text-sm sm:text-base">→</span>
                    <span className="ml-2 text-sm sm:text-base">Data Privacy Notice</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t pt-8" style={{ borderColor: '#DAA520' }}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs sm:text-sm text-center md:text-left text-white">
                © 2025 Saint Joseph School of Fairview Inc. All rights reserved. | Accredited by PAASCU | Recognized by DepEd & CHED
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 px-5 py-3 rounded-full flex items-center gap-2 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 z-50 text-white"
          style={{ backgroundColor: '#DAA520' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c4941d'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DAA520'}
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="hidden sm:inline">Top</span>
        </button>
      )}
    </div>
  );
}
