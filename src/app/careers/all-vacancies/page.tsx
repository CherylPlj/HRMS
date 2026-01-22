'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, Search, Briefcase, Calendar } from 'lucide-react';

interface Vacancy {
  id: number;
  title: string;
  position: string;
  description: string;
  postedDate: string;
}

export default function AllVacanciesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filteredVacancies, setFilteredVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        setFilteredVacancies(data);
      } catch (error) {
        console.error('Error fetching vacancies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVacancies(vacancies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = vacancies.filter(
        (vacancy) =>
          vacancy.title.toLowerCase().includes(query) ||
          vacancy.position.toLowerCase().includes(query) ||
          vacancy.description.toLowerCase().includes(query)
      );
      setFilteredVacancies(filtered);
    }
  }, [searchQuery, vacancies]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="shadow-sm sticky top-0 z-50" style={{ backgroundColor: '#8B0000' }}>
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

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6" style={{ color: '#8B0000' }}>
            All Vacancies
          </h1>

          <div className="bg-yellow-50 border-l-4 rounded p-4 mb-8" style={{ borderColor: '#DAA520' }}>
            <p className="text-sm sm:text-base text-black italic">
              <strong>Note:</strong> The job openings and vacancies displayed here do not reflect SJSFI's current openings and are only part of a capstone project for demonstration purposes.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search job titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] text-sm sm:text-base bg-white text-black"
                style={{ borderColor: '#F0E68C' }}
              />
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Found {filteredVacancies.length} {filteredVacancies.length === 1 ? 'result' : 'results'}
              </p>
            )}
          </div>

          {/* Vacancies List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" style={{ borderColor: '#8B0000' }}></div>
              <p className="mt-4" style={{ color: '#8B0000' }}>Loading job openings...</p>
            </div>
          ) : filteredVacancies.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center shadow-sm" style={{ borderColor: '#F0E68C' }}>
              <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: '#DAA520' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#8B0000' }}>
                {searchQuery ? 'No Results Found' : 'No Current Openings'}
              </h3>
              <p style={{ color: '#8B0000' }}>
                {searchQuery 
                  ? 'Try adjusting your search terms.'
                  : "We don't have any job openings at the moment. Please check back later."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {filteredVacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="rounded-lg p-4 sm:p-6 relative"
                  style={{ 
                    backgroundColor: '#FFE4E1',
                    borderLeft: '4px solid #8B0000',
                    borderTop: '4px solid #8B0000'
                  }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg sm:text-xl font-bold" style={{ color: '#8B0000' }}>
                        {vacancy.title}
                      </h3>
                    </div>
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-3 w-fit"
                      style={{ backgroundColor: '#8B0000', color: 'white' }}
                    >
                      {vacancy.position}
                    </span>
                    <p className="text-black mb-3 text-xs sm:text-sm">
                      {vacancy.description}
                    </p>
                    <p className="text-xs text-gray-600 mb-4">
                      Posted: {vacancy.postedDate}
                    </p>
                    <Link
                      href={`/applicant?vacancy=${vacancy.id}`}
                      className="text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 inline-block w-fit text-xs sm:text-sm shadow-md hover:shadow-lg"
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
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-white mt-auto shadow-sm" style={{ backgroundColor: '#8B0000' }}>
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
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

