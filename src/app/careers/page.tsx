'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, MessageCircle, Calendar, Briefcase, Globe, Mail, Phone, MapPin } from 'lucide-react';

interface Vacancy {
  id: number;
  title: string;
  position: string;
  description: string;
  postedDate: string;
}

export default function CareersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        const response = await fetch('/api/vacancies/public');
        if (!response.ok) {
          throw new Error('Failed to fetch vacancies');
        }
        const data = await response.json();
        setVacancies(data);
      } catch (error) {
        console.error('Error fetching vacancies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        {/* Main Header - Yellow Background */}
        <div className="bg-yellow-400 min-h-[80px] md:min-h-[90px]">
          <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            {/* Left Section - Logo and School Name */}
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/" className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  alt="SJSFI Logo"
                  src="/sjsfilogo.png"
                  width={60}
                  height={60}
                  className="rounded-full"
                  priority
                />
              </Link>
              <h1 className="text-white text-base md:text-xl lg:text-2xl font-bold whitespace-nowrap">
                Saint Joseph School of Fairview Inc.
              </h1>
            </div>

            {/* Right Section - Navigation and Login */}
            <div className="flex items-center gap-4 lg:gap-6">
              <nav className="hidden md:flex gap-4 lg:gap-6 text-white">
                <Link 
                  href="/" 
                  className={`hover:text-[#5a0000] transition-colors text-sm lg:text-base font-semibold ${
                    pathname === '/' ? 'text-[#5a0000] border-b-2 border-[#5a0000] pb-1' : ''
                  }`}
                >
                  About SJSFI HRMS
                </Link>
                <Link 
                  href="/careers" 
                  className={`hover:text-[#5a0000] transition-colors text-sm lg:text-base font-semibold ${
                    pathname === '/careers' ? 'text-[#5a0000] border-b-2 border-[#5a0000] pb-1' : ''
                  }`}
                >
                  Careers at SJSFI
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
                className="bg-[#5a0000] text-white px-4 md:px-6 py-2 rounded-md font-semibold hover:bg-[#4a0000] transition-colors text-sm md:text-base whitespace-nowrap"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI-Generated Content Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-700">
            <strong>Notice:</strong> This content is AI-generated and may not reflect the complete or accurate information about Saint Joseph School of Fairview Inc. For official and comprehensive details about the school, please{' '}
            <a href="mailto:sjsfihrms@gmail.com" className="text-[#5a0000] hover:underline">
              contact the institution directly
            </a>
            .
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-[#5a0000] mb-6">
            Careers at SJSFI
          </h1>

          <div className="prose max-w-none mb-8">
            <p className="text-base text-gray-700 mb-4">
              Saint Joseph School of Fairview Inc. is always seeking passionate educators and dedicated professionals who share our commitment to excellence in education. We offer a supportive work environment where you can grow professionally while making a meaningful impact on young lives.
            </p>
            <p className="text-base text-gray-700">
              As part of the SJSFI family, you'll join a community of educators who are devoted to nurturing students' academic, spiritual, and personal development. We value innovation, collaboration, and continuous learning in our pursuit of educational excellence.
            </p>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#5a0000] mb-6 mt-12">
            Current Job Openings
          </h2>

          <p className="text-base text-gray-700 mb-8">
            We are currently looking for qualified and passionate individuals to join our team. Explore the available positions below and find the opportunity that matches your skills and career aspirations.
          </p>

          {/* Vacancies List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5a0000] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading job openings...</p>
            </div>
          ) : vacancies.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Current Openings</h3>
              <p className="text-gray-600">
                We don't have any job openings at the moment. Please check back later or{' '}
                <a href="mailto:sjsfihrms@gmail.com" className="text-[#5a0000] hover:underline">
                  contact us
                </a>
                {' '}for future opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {vacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#5a0000] mb-2">
                        {vacancy.title}
                      </h3>
                      <div className="flex items-center gap-4 text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          <span>{vacancy.position}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          <span>Posted: {vacancy.postedDate}</span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4 line-clamp-3">
                        {vacancy.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href={`/applicant?vacancy=${vacancy.id}`}
                        className="bg-[#5a0000] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#4a0000] transition-colors inline-block whitespace-nowrap"
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Application Process */}
          <div className="mt-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#5a0000] mb-4">
              Application Process
            </h2>
            <p className="text-base text-gray-700 mb-8">
              Ready to join our team? Follow these simple steps to apply for a position at SJSFI. We encourage all qualified candidates to submit their applications and become part of our educational mission.
            </p>

            {/* Three-Step Process */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Step 1 */}
              <div className="bg-pink-50 rounded-lg p-6 border border-pink-100">
                <div className="w-12 h-12 bg-[#5a0000] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-[#5a0000] mb-3">Submit Application</h3>
                <p className="text-gray-700">
                  Send your resume, cover letter, and required documents to our HR department.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-pink-50 rounded-lg p-6 border border-pink-100">
                <div className="w-12 h-12 bg-[#5a0000] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-[#5a0000] mb-3">Initial Screening</h3>
                <p className="text-gray-700">
                  Our HR team will review your application and contact qualified candidates.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-pink-50 rounded-lg p-6 border border-pink-100">
                <div className="w-12 h-12 bg-[#5a0000] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-xl font-bold text-[#5a0000] mb-3">Interview Process</h3>
                <p className="text-gray-700">
                  Participate in interviews with department heads and school administrators.
                </p>
              </div>
            </div>

            {/* Ready to Apply Section */}
            <div className="bg-yellow-50 rounded-lg p-8 border border-yellow-200">
              <h3 className="text-2xl font-bold text-[#5a0000] mb-4">Ready to Apply?</h3>
              <p className="text-base text-gray-700 mb-6">
                Take the first step towards joining our educational community. Send your application materials today and help us continue our mission of providing quality education to young Josephians.
              </p>

              {/* Contact Information */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <Globe className="w-5 h-5 text-[#5a0000]" />
                  <span>HRMS - Applicant Portal</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="w-5 h-5 text-[#5a0000]" />
                  <a href="mailto:sjsfihrms@gmail.com" className="hover:text-[#5a0000] transition-colors">
                    sjsfihrms@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-5 h-5 text-[#5a0000]" />
                  <span>(02) 8-693-5661</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-[#5a0000]" />
                  <span>
                    Phase 8, Atherton, Quezon City, 1121 Metro Manila{' '}
                    <a 
                      href="https://maps.google.com/?q=Phase+8,+Atherton,+Quezon+City,+1121+Metro+Manila" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#5a0000] hover:underline"
                    >
                      (Google Maps)
                    </a>
                  </span>
                </div>
              </div>

              {/* Required Documents */}
              <div className="bg-white rounded-lg p-6 border border-gray-300">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Required Documents:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Updated Resume/CV</li>
                  {/* <li>• Cover Letter</li> */}
                  <li>• Teaching License (for teaching positions)</li>
                  <li>• Letter of Recommendation (if available)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#5a0000] text-white mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="hover:text-yellow-300 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-yellow-300 transition-colors">
                    About SJSFI HRMS
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-yellow-300 transition-colors">
                    Careers at SJSFI
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Links */}
            <div>
              <h3 className="text-xl font-bold mb-4">Important Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/sign-in" className="hover:text-yellow-300 transition-colors">
                    HRMS Portal
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in?portal=admin" className="hover:text-yellow-300 transition-colors">
                    SIS Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Notices */}
            <div>
              <h3 className="text-xl font-bold mb-4">Important Notices</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="https://sjsfi.vercel.app/privacy-policy" target="_blank" className="hover:text-yellow-300 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/terms-of-service" target="_blank" className="hover:text-yellow-300 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/data-privacy" target="_blank" className="hover:text-yellow-300 transition-colors">
                    Data Privacy Notice
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-600 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center md:text-left">
                © 2025 Saint Joseph School of Fairview Inc. All rights reserved. | Accredited by PAASCU | Recognized by DepEd & CHED
              </p>
              <div className="flex gap-4">
                <button
                  onClick={scrollToTop}
                  className="bg-[#4a0000] hover:bg-[#3a0000] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                >
                  Back to Top
                  <ArrowUp className="w-4 h-4" />
                </button>
                
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

