'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import FacultyScheduleView from '@/components/schedule/FacultyScheduleView';
import jsPDF from 'jspdf';
import { formatTimeRangeShort } from '@/lib/timeUtils';

interface Schedule {
  id: number;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  subject: {
    name: string;
    code?: string;
  };
  classSection: {
    name: string;
  };
}

interface ClassSection {
  id: number;
  name: string;
  gradeLevel?: string | null;
  section?: string | null;
}

export default function MySchedulePage() {
  const { user } = useUser();
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [advisorySections, setAdvisorySections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facultyName, setFacultyName] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  // Generate and download PDF
  const handleDownloadPDF = () => {
    if (schedules.length === 0) {
      alert('No schedule to download');
      return;
    }

    setDownloading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(128, 0, 32); // Maroon color
      doc.text('Teaching Schedule', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Faculty: ${facultyName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary Stats
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Total Classes: ${schedules.length}`, 20, yPos);
      yPos += 6;
      doc.text(`Subjects: ${new Set(schedules.map(s => s.subject.name)).size}`, 20, yPos);
      yPos += 6;
      doc.text(`Sections: ${new Set(schedules.map(s => s.classSection.name)).size}`, 20, yPos);
      yPos += 12;

      // Schedule Table Header
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Weekly Schedule', 14, yPos);
      yPos += 8;

      // Table headers
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(128, 0, 32); // Maroon background
      doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
      
      doc.text('Day', 16, yPos);
      doc.text('Time', 50, yPos);
      doc.text('Subject', 80, yPos);
      doc.text('Section', 140, yPos);
      doc.text('Duration', 180, yPos);
      yPos += 8;

      // Group schedules by day
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const schedulesByDay = schedules.reduce((acc, schedule) => {
        if (!acc[schedule.day]) {
          acc[schedule.day] = [];
        }
        acc[schedule.day].push(schedule);
        return acc;
      }, {} as Record<string, Schedule[]>);

      // Sort schedules within each day by time
      Object.keys(schedulesByDay).forEach(day => {
        schedulesByDay[day].sort((a, b) => a.time.localeCompare(b.time));
      });

      // Add schedule rows
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      let rowCount = 0;

      daysOrder.forEach(day => {
        if (schedulesByDay[day]) {
          schedulesByDay[day].forEach(schedule => {
            // Check if we need a new page
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }

            // Alternate row colors
            if (rowCount % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(14, yPos - 5, pageWidth - 28, 7, 'F');
            }

            doc.setTextColor(0, 0, 0);
            doc.text(day, 16, yPos);
            doc.text(formatTimeRangeShort(schedule.time), 50, yPos);
            doc.text(schedule.subject.name, 80, yPos);
            doc.text(schedule.classSection.name, 140, yPos);
            doc.text(`${schedule.duration}h`, 180, yPos);
            
            yPos += 7;
            rowCount++;
          });
        }
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `Schedule_${facultyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Fetch faculty ID from user email
  useEffect(() => {
    const fetchFacultyId = async () => {
      if (!user?.emailAddresses[0]?.emailAddress) return;

      try {
        const response = await fetch(`/api/faculty/by-email?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch faculty information');
        }

        const data = await response.json();
        setFacultyId(data.FacultyID);
        setFacultyName(`${data.User.FirstName} ${data.User.LastName}`);
      } catch (err) {
        console.error('Error fetching faculty ID:', err);
        setError(err instanceof Error ? err.message : 'Failed to load faculty information');
        setLoading(false);
      }
    };

    fetchFacultyId();
  }, [user]);

  // Fetch schedules and advisory classes when facultyId is available
  useEffect(() => {
    const fetchData = async () => {
      if (!facultyId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch schedules
        const schedulesResponse = await fetch(`/api/schedules/faculty/${facultyId}`);
        if (!schedulesResponse.ok) {
          const errorText = await schedulesResponse.text();
          console.error('Schedules API error:', schedulesResponse.status, errorText);
          throw new Error(`Failed to fetch schedules: ${schedulesResponse.status}`);
        }
        const schedulesData = await schedulesResponse.json();
        
        // The API returns { faculty, schedules, schedulesByDay, summary }
        // Ensure schedules array is set correctly
        const schedulesArray = Array.isArray(schedulesData.schedules) 
          ? schedulesData.schedules 
          : [];
        
        setSchedules(schedulesArray);

        // Fetch sections with assignments to get advisory roles
        const sectionsResponse = await fetch('/api/class-sections?includeAssignments=true');
        if (sectionsResponse.ok) {
          const sections: any[] = await sectionsResponse.json();
          // Filter sections where this faculty is assigned as adviser
          const advisory = sections.filter((s: any) => s.adviserFacultyId === facultyId);
          setAdvisorySections(advisory);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load your schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facultyId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header with Download Button */}
      <div className="mb-6 sm:mb-8 flex justify-end">
        {schedules.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Schedule (PDF)
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-[#800000]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Classes</p>
              <p className="text-2xl font-semibold text-gray-900">{schedules.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(schedules.map(s => s.subject.name)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sections</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(schedules.map(s => s.classSection.name)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Advisory Classes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {advisorySections.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Classes Section */}
      {advisorySections.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 sm:mb-8 p-6">
          <div className="flex flex-wrap gap-2">
          <p className="text-lg font-medium text-gray-500">Advisory Classes : </p>

            {advisorySections.map((section) => (
              <span
                key={section.id}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
              >
                {section.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule View - Always show to display faculty info and summary */}
      {facultyId && (
        <div className="bg-white rounded-lg shadow">
          <FacultyScheduleView 
            facultyId={facultyId}
          />
        </div>
      )}
    </div>
  );
}
