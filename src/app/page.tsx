'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, MessageCircle, Target, Users, BarChart3, FileText, Calendar, Scale, BookOpen, Brain, MessageSquare } from 'lucide-react';
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

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#5a0000] to-[#4a0000] text-white py-8 md:py-10 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome to SJSFI-HRMS Portal
          </h2>
          <p className="text-lg md:text-xl text-yellow-200">
            Comprehensive Human Resource Management System
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#5a0000] text-center mb-12">
            What's Inside the System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {/* 1. Recruitment */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Target className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Recruitment & Hiring</h3>
              <p className="text-gray-600">
                Manage job vacancies, screen candidates with AI assistance, and streamline the hiring process.
              </p>
            </div>

            {/* 2. Employee */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Users className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-lg font-bold text-[#5a0000] mb-2">Employee Management</h3>
              <p className="text-gray-600">
                Comprehensive employee directory, profiles, and personal data management with secure access controls.
              </p>
            </div>

            {/* 3. Performance */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <BarChart3 className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Performance Management</h3>
              <p className="text-gray-600">
                Track performance reviews, set goals, monitor KPIs, and get AI-powered promotion recommendations.
              </p>
            </div>

            {/* 4. Document */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <FileText className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Document Management</h3>
              <p className="text-gray-600">
                Secure storage and management of employee documents, certificates, and official records.
              </p>
            </div>

            {/* 5. Leave */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Calendar className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Leave</h3>
              <p className="text-gray-600">
                Track and manage leave requests.
              </p>
            </div>

            {/* 6. Disciplinary */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Scale className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Disciplinary Records</h3>
              <p className="text-gray-600">
                Track disciplinary actions, manage violations, and monitor employee conduct.
              </p>
            </div>

            {/* 7. Training */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <BookOpen className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Training</h3>
              <p className="text-gray-600">
                Identify training needs and track employee development.
              </p>
            </div>

            {/* 8. AI-Powered Insights */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Brain className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600">
                Get intelligent recommendations for promotions, training needs, and candidate screening.
              </p>
            </div>

            {/* 9. Chatbot */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <MessageSquare className="w-10 h-10 mb-4 text-[#5a0000]" />
              <h3 className="text-xl font-bold text-[#5a0000] mb-2">Chatbot</h3>
              <p className="text-gray-600">
                Get instant answers to your HR-related questions with our AI-powered chatbot assistant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#5a0000] text-white py-8 md:py-10 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-6 text-yellow-200">
            Join our team and make a meaningful impact on young lives
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/careers"
              className="bg-yellow-400 text-[#5a0000] px-8 py-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors inline-block"
            >
              View Job Openings
            </Link>
            <Link
              href="/applicant"
              className="bg-white text-[#5a0000] px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors inline-block"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#5a0000] text-white mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-3">Quick Links</h3>
              <ul className="space-y-1.5">
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
              <h3 className="text-lg font-bold mb-3">Important Links</h3>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/sign-in" className="hover:text-yellow-300 transition-colors">
                    HRMS Portal
                  </Link>
                </li>
                <li>
                  <Link href="https://sjsfi-sis.vercel.app/" className="hover:text-yellow-300 transition-colors">
                    SIS Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Important Notices */}
            <div>
              <h3 className="text-lg font-bold mb-3">Important Notices</h3>
              <ul className="space-y-1.5">
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
          <div className="border-t border-gray-600 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <p className="text-xs text-center md:text-left">
                © 2025 Saint Joseph School of Fairview Inc. All rights reserved. | Accredited by PAASCU | Recognized by DepEd & CHED
              </p>
              <div className="flex gap-4">
                <button
                  onClick={scrollToTop}
                  className="bg-[#4a0000] hover:bg-[#3a0000] text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                >
                  Back to Top
                  <ArrowUp className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
