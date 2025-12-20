'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, MessageCircle, Calendar, Briefcase, Globe, Mail, Phone, MapPin, Users, FileText } from 'lucide-react';

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
  const [showSectionNav, setShowSectionNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
      setShowSectionNav(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="shadow-sm sticky top-0 z-50" style={{ backgroundColor: '#8B0000' }}>
        {/* Main Header - Maroon background */}
        <div className="min-h-[80px] md:min-h-[90px]" style={{ backgroundColor: '#8B0000' }}>
          <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            {/* Left Section - Logo and School Name */}
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/careers" className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-all duration-300 hover:scale-105">
                <Image
                  alt="SJSFI Logo"
                  src="/sjsfilogo.png"
                  width={60}
                  height={60}
                  className="rounded-full shadow-md"
                  priority
                />
              </Link>
              <h1 className="text-base md:text-xl lg:text-2xl font-bold whitespace-nowrap drop-shadow-sm text-white">
                Saint Joseph School of Fairview Inc.
              </h1>
            </div>

            {/* Right Section - Navigation and Login */}
            <div className="flex items-center gap-4 lg:gap-6">
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
                className="text-white px-5 md:px-7 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm md:text-base whitespace-nowrap shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                style={{ backgroundColor: '#DAA520' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c4941d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DAA520'}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Section Navigation */}
      {showSectionNav && (
        <div className="sticky top-[90px] z-40 bg-white shadow-md border-b" style={{ borderColor: '#F0E68C' }}>
          <div className="container mx-auto px-4 md:px-8">
            <nav className="flex items-center justify-center gap-4 md:gap-6 py-3 overflow-x-auto">
              <button
                onClick={() => scrollToSection('job-openings')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 hover:bg-gray-100"
                style={{ color: '#8B0000' }}
              >
                <Briefcase className="w-4 h-4" />
                Job Openings
              </button>
              <button
                onClick={() => scrollToSection('why-work-here')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 hover:bg-gray-100"
                style={{ color: '#8B0000' }}
              >
                <Users className="w-4 h-4" />
                Why Work Here
              </button>
              <button
                onClick={() => scrollToSection('application-process')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 hover:bg-gray-100"
                style={{ color: '#8B0000' }}
              >
                <FileText className="w-4 h-4" />
                Application Process
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* AI-Generated Content Notice */}
      <div className="p-4 mx-4 mt-4 rounded-r-lg shadow-sm border-l-4" style={{ backgroundColor: '#FFFACD', borderColor: '#DAA520' }}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#DAA520' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm" style={{ color: '#8B0000' }}>
            <strong>Notice:</strong> This content is AI-generated and may not reflect the complete or accurate information about Saint Joseph School of Fairview Inc. For official and comprehensive details about the school, please{' '}
            <a href="mailto:sjsfihrms@gmail.com" className="underline font-medium transition-colors" style={{ color: '#8B0000' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#DAA520'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8B0000'}
            >
              contact the institution directly
            </a>
            .
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#8B0000' }}>
            Careers at SJSFI
          </h1>

          <div className="prose max-w-none mb-8">
            <p className="text-base mb-4 text-black">
              Saint Joseph School of Fairview Inc. is always seeking passionate educators and dedicated professionals who share our commitment to excellence in education. We offer a supportive work environment where you can grow professionally while making a meaningful impact on young lives.
            </p>
            <p className="text-base text-black">
              As part of the SJSFI family, you'll join a community of educators who are devoted to nurturing students' academic, spiritual, and personal development. We value innovation, collaboration, and continuous learning in our pursuit of educational excellence.
            </p>
          </div>

          <h2 id="job-openings" className="text-2xl md:text-3xl font-bold mb-6 mt-12" style={{ color: '#8B0000' }}>
            Current Job Openings
          </h2>

          <p className="text-base text-black mb-8">
            We are currently looking for qualified and passionate individuals to join our team. Explore the available positions below and find the opportunity that matches your skills and career aspirations.
          </p>

          {/* Vacancies List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" style={{ borderColor: '#8B0000' }}></div>
              <p className="mt-4" style={{ color: '#8B0000' }}>Loading job openings...</p>
            </div>
          ) : vacancies.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center shadow-sm" style={{ borderColor: '#F0E68C' }}>
              <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: '#DAA520' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#8B0000' }}>No Current Openings</h3>
              <p style={{ color: '#8B0000' }}>
                We don't have any job openings at the moment. Please check back later or{' '}
                <a href="mailto:sjsfihrms@gmail.com" className="underline font-medium transition-colors" style={{ color: '#8B0000' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#DAA520'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#8B0000'}
                >
                  contact us
                </a>
                {' '}for future opportunities.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {vacancies.slice(0, 4).map((vacancy) => (
                  <div
                    key={vacancy.id}
                    className="rounded-lg p-6 relative"
                    style={{ 
                      backgroundColor: '#FFE4E1',
                      borderLeft: '4px solid #8B0000',
                      borderTop: '4px solid #8B0000'
                    }}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold" style={{ color: '#8B0000' }}>
                          {vacancy.title}
                        </h3>
                      </div>
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 w-fit"
                        style={{ backgroundColor: '#8B0000', color: 'white' }}
                      >
                        {vacancy.position}
                      </span>
                      <p className="text-black mb-3 text-sm">
                        {vacancy.description}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Posted: {vacancy.postedDate}
                      </p>
                      <Link
                        href={`/applicant?vacancy=${vacancy.id}`}
                        className="text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 inline-block w-fit text-sm shadow-md hover:shadow-lg"
                        style={{ backgroundColor: '#8B0000' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a0000'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B0000'}
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {vacancies.length > 4 && (
                <div className="text-center mb-8">
                  <Link
                    href="/careers/all-vacancies"
                    className="px-8 py-3 rounded-lg font-semibold transition-all duration-200 inline-block shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base text-white"
                    style={{ backgroundColor: '#8B0000' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a0000'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B0000'}
                  >
                    View All Vacancies ({vacancies.length})
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Application Instructions */}
          {vacancies.length > 0 && (
            <p className="text-base text-black mb-8">
              Interested candidates can apply by filling out this form and sending their resume to our HR department at{' '}
              <Link 
                href="/applicant" 
                className="font-medium underline"
                style={{ color: '#8B0000' }}
              >
                Applicants Portal Page
              </Link>
              {' '}and see requirements below.
            </p>
          )}

          {/* Why Work at SJSFI Section */}
          <div id="why-work-here" className="mt-12 mb-12 scroll-mt-24">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#8B0000' }}>
              Why Work at SJSFI?
            </h2>
            <p className="text-base text-black mb-8">
              SJSFI offers more than just a job - we provide a fulfilling career where you can make a lasting difference in the lives of young people. Our school values work-life balance, professional growth, and creating a positive impact in education.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-6 flex items-start gap-4">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">Competitive Compensation</h3>
                  <p className="text-black text-sm">
                    We offer competitive salaries and comprehensive benefits package including health insurance and performance incentives.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-6 flex items-start gap-4">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">Professional Development</h3>
                  <p className="text-black text-sm">
                    Access to continuous learning opportunities, workshops, seminars, and educational advancement programs.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-6 flex items-start gap-4">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">Supportive Environment</h3>
                  <p className="text-black text-sm">
                    Collaborative workplace culture with supportive colleagues and administration committed to your success.
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-6 flex items-start gap-4">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
                  <span className="text-white text-sm font-bold">•</span>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">Meaningful Impact</h3>
                  <p className="text-black text-sm">
                    Opportunity to shape young minds and contribute to building future leaders with strong values and character.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Application Process */}
          <div id="application-process" className="mt-12 scroll-mt-24">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#8B0000' }}>
              Application Process
            </h2>
            <p className="text-base mb-8" style={{ color: '#8B0000' }}>
              Ready to join our team? Follow these simple steps to apply for a position at SJSFI. We encourage all qualified candidates to submit their applications and become part of our educational mission.
            </p>

            {/* Three-Step Process */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Step 1 */}
              <div className="rounded-lg p-6" style={{ backgroundColor: '#FFE4E1' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto" style={{ backgroundColor: '#8B0000' }}>
                  1
                </div>
                <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#8B0000' }}>Submit Application</h3>
                <p className="text-black text-center text-sm">
                  Send your resume, cover letter, and required documents to our HR department.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg p-6" style={{ backgroundColor: '#FFE4E1' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto" style={{ backgroundColor: '#8B0000' }}>
                  2
                </div>
                <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#8B0000' }}>Initial Screening</h3>
                <p className="text-black text-center text-sm">
                  Our HR team will review your application and contact qualified candidates.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-lg p-6" style={{ backgroundColor: '#FFE4E1' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto" style={{ backgroundColor: '#8B0000' }}>
                  3
                </div>
                <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#8B0000' }}>Interview Process</h3>
                <p className="text-black text-center text-sm">
                  Participate in interviews with department heads and school administrators.
                </p>
              </div>
            </div>

            {/* Ready to Apply Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: '#FFFACD' }}>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#8B0000' }}>Ready to Apply?</h3>
              <p className="text-base mb-6 text-black">
                Take the first step towards joining our educational community. Send your application materials today and help us continue our mission of providing quality education to young Josephians.
              </p>

              {/* Contact Information */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-black">
                  <Globe className="w-5 h-5 text-black" />
                  <Link href="/applicant" className="text-black hover:underline">
                    HRMS - Applicant Portal
                  </Link>
                </div>
                <div className="flex items-center gap-3 text-black">
                  <Mail className="w-5 h-5 text-black" />
                  <a href="mailto:sjsfihrms@gmail.com" className="text-black hover:underline">
                    sjsfihrms@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-black">
                  <Phone className="w-5 h-5 text-black" />
                  <span>(02) 8-693-5661</span>
                </div>
                <div className="flex items-center gap-3 text-black">
                  <MapPin className="w-5 h-5 text-black" />
                  <span>
                    Phase 8, Atherton, Quezon City, 1121 Metro Manila{' '}
                    <a 
                      href="https://maps.google.com/?q=Phase+8,+Atherton,+Quezon+City,+1121+Metro+Manila" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      (Google Maps)
                    </a>
                  </span>
                </div>
              </div>

              {/* Required Documents */}
              <div className="bg-white rounded-lg p-6">
                <h4 className="text-lg font-bold mb-4" style={{ color: '#8B0000' }}>Required Documents:</h4>
                <ul className="space-y-2 text-black">
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

      {/* Footer - Matching header style */}
      <footer className="text-white mt-auto shadow-sm" style={{ backgroundColor: '#8B0000' }}>
        <div className="container mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Quick Links</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/careers" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">Careers at SJSFI</span>
                  </Link>
                </li>
                <li>
                  <Link href="/careers/all-vacancies" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">All Vacancies</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Links */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Important Links</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/sign-in" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">HRMS Portal</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi-sis.vercel.app/" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">SIS Portal</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Notices */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Important Notices</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="https://sjsfi.vercel.app/privacy-policy" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/terms-of-service" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi.vercel.app/data-privacy" target="_blank" className="transition-colors duration-200 flex items-center group text-white hover:text-[#DAA520]">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                    <span className="ml-2">Data Privacy Notice</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t pt-8" style={{ borderColor: '#DAA520' }}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center md:text-left text-white">
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

