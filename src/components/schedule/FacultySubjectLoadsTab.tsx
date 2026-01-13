'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Faculty {
  FacultyID: number;
  EmployeeID: string;
  User: {
    FirstName: string;
    LastName: string;
    Email: string;
  };
  Employee?: {
    EmployeeID: string;
    EmploymentDetail?: {
      Designation?: string | null;
    } | null;
  } | null;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  gradeLevel?: string | null;
  department?: string | null;
}

interface ClassSection {
  id: number;
  name: string;
  gradeLevel?: string | null;
  section?: string | null;
}

interface Schedule {
  id: number;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  subject: Subject;
  classSection: ClassSection;
}

interface FacultySubjectLoad {
  faculty: Faculty;
  schedules: Schedule[];
  advisorySections: ClassSection[];
  homeroomSections: ClassSection[];
  sectionHeadSections: ClassSection[];
  totalSections: number;
  totalHoursPerWeek: number;
}

export default function FacultySubjectLoadsTab() {
  const [facultyLoads, setFacultyLoads] = useState<FacultySubjectLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterLoad, setFilterLoad] = useState<string>('all');
  const [expandedFaculty, setExpandedFaculty] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchFacultyLoads();
  }, []);

  const fetchFacultyLoads = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all faculty
      const facultyRes = await fetch('/api/faculty');
      if (!facultyRes.ok) throw new Error('Failed to fetch faculty');
      const faculties: Faculty[] = await facultyRes.json();

      // Fetch all schedules
      const schedulesRes = await fetch('/api/schedules');
      if (!schedulesRes.ok) throw new Error('Failed to fetch schedules');
      const schedules: Schedule[] = await schedulesRes.json();

      // Fetch all sections with assignments
      const sectionsRes = await fetch('/api/class-sections?includeAssignments=true');
      if (!sectionsRes.ok) throw new Error('Failed to fetch sections');
      const sections = await sectionsRes.json();

      // Build faculty subject loads
      const loads: FacultySubjectLoad[] = faculties.map((faculty) => {
        const facultySchedules = schedules.filter(s => s.facultyId === faculty.FacultyID);
        
        // Get advisory sections
        const advisorySections = sections.filter(
          (s: any) => s.adviserFacultyId === faculty.FacultyID
        );

        // Get homeroom sections
        const homeroomSections = sections.filter(
          (s: any) => s.homeroomTeacherId === faculty.FacultyID
        );

        // Get section head sections
        const sectionHeadSections = sections.filter(
          (s: any) => s.sectionHeadId === faculty.FacultyID
        );

        // Calculate total hours per week
        const totalHoursPerWeek = facultySchedules.reduce(
          (sum, s) => sum + (s.duration || 0),
          0
        );

        return {
          faculty,
          schedules: facultySchedules,
          advisorySections,
          homeroomSections,
          sectionHeadSections,
          totalSections: facultySchedules.length,
          totalHoursPerWeek,
        };
      });

      setFacultyLoads(loads);
    } catch (err: any) {
      console.error('Error fetching faculty loads:', err);
      setError(err.message || 'Failed to load faculty subject loads');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (facultyId: number) => {
    setExpandedFaculty((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(facultyId)) {
        newSet.delete(facultyId);
      } else {
        newSet.add(facultyId);
      }
      return newSet;
    });
  };

  // Group schedules by subject
  const groupSchedulesBySubject = (schedules: Schedule[]) => {
    const grouped = new Map<string, Schedule[]>();
    schedules.forEach((schedule) => {
      const key = schedule.subject.name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(schedule);
    });
    return grouped;
  };

  // Filter faculty loads
  const filteredLoads = facultyLoads.filter((load) => {
    const matchesSearch =
      load.faculty.User.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.faculty.User.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.faculty.User.Email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      filterDepartment === 'all' ||
      load.schedules.some((s) => s.subject.department === filterDepartment);

    const matchesLoad = (() => {
      if (filterLoad === 'all') return true;
      if (filterLoad === '0') return load.totalHoursPerWeek === 0;
      if (filterLoad === '1-10') return load.totalHoursPerWeek >= 1 && load.totalHoursPerWeek <= 10;
      if (filterLoad === '11-20') return load.totalHoursPerWeek >= 11 && load.totalHoursPerWeek <= 20;
      if (filterLoad === '21-30') return load.totalHoursPerWeek >= 21 && load.totalHoursPerWeek <= 30;
      if (filterLoad === '31+') return load.totalHoursPerWeek >= 31;
      return true;
    })();

    return matchesSearch && matchesDepartment && matchesLoad;
  });

  // Get unique departments
  const departments = Array.from(
    new Set(
      facultyLoads.flatMap((load) =>
        load.schedules
          .map((s) => s.subject.department)
          .filter((dept): dept is string => dept != null)
      )
    )
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Faculty Subject Loads</h1>
        <p className="mt-1 text-sm text-gray-500">
          View teaching assignments, advisory roles, and workload for all faculty members
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
                placeholder="Search by faculty name or email..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Department
            </label>
            <div className="relative">
              <select
                id="filterDepartment"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label htmlFor="filterLoad" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Load
            </label>
            <div className="relative">
              <select
                id="filterLoad"
                value={filterLoad}
                onChange={(e) => setFilterLoad(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
              >
                <option value="all">All Loads</option>
                <option value="0">0 hours</option>
                <option value="1-10">1-10 hours</option>
                <option value="11-20">11-20 hours</option>
                <option value="21-30">21-30 hours</option>
                <option value="31+">31+ hours</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Loads List */}
      <div className="space-y-4">
        {filteredLoads.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
            <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No faculty found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {facultyLoads.length === 0
                ? 'No faculty members available.'
                : 'No faculty match your search criteria.'}
            </p>
          </div>
        ) : (
          filteredLoads.map((load) => {
            const isExpanded = expandedFaculty.has(load.faculty.FacultyID);
            const subjectGroups = groupSchedulesBySubject(load.schedules);
            const hasAdvisory = load.advisorySections.length > 0;
            const hasHomeroom = load.homeroomSections.length > 0;
            const hasSectionHead = load.sectionHeadSections.length > 0;
            const isAdvisory = hasAdvisory || hasHomeroom || hasSectionHead;

            return (
              <div
                key={load.faculty.FacultyID}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Faculty Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {load.faculty.User.FirstName} {load.faculty.User.LastName}
                        </h3>
                        {isAdvisory && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Adviser
                          </span>
                        )}
                        {load.faculty.Employee?.EmploymentDetail?.Designation && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            {load.faculty.Employee.EmploymentDetail.Designation.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{load.faculty.User.Email}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>
                          <span className="font-medium">Sections:</span> {load.totalSections}
                        </span>
                        <span>
                          <span className="font-medium">Hours/Week:</span> {load.totalHoursPerWeek}
                        </span>
                        {hasAdvisory && (
                          <span>
                            <span className="font-medium">Advisory:</span> {load.advisorySections.length} section(s)
                          </span>
                        )}
                        {hasHomeroom && (
                          <span>
                            <span className="font-medium">Homeroom:</span> {load.homeroomSections.length} section(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(load.faculty.FacultyID)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-gray-50">
                    {/* Advisory Assignments */}
                    {(hasAdvisory || hasHomeroom || hasSectionHead) && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Advisory & Administrative Roles</h4>
                        <div className="space-y-2">
                          {hasAdvisory && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Class Adviser:</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {load.advisorySections.map((section) => (
                                  <span
                                    key={section.id}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                  >
                                    {section.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {hasHomeroom && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Homeroom Teacher:</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {load.homeroomSections.map((section) => (
                                  <span
                                    key={section.id}
                                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded"
                                  >
                                    {section.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {hasSectionHead && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Section Head:</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {load.sectionHeadSections.map((section) => (
                                  <span
                                    key={section.id}
                                    className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                                  >
                                    {section.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Subject Loads */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Subject Loads</h4>
                      {subjectGroups.size === 0 ? (
                        <p className="text-sm text-gray-500">No subject assignments</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from(subjectGroups.entries()).map(([subjectName, subjectSchedules]) => {
                            // Group by grade level
                            const byGrade = new Map<string, Schedule[]>();
                            subjectSchedules.forEach((schedule) => {
                              const grade = schedule.classSection.gradeLevel || 'N/A';
                              if (!byGrade.has(grade)) {
                                byGrade.set(grade, []);
                              }
                              byGrade.get(grade)!.push(schedule);
                            });

                            return (
                              <div key={subjectName} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="font-medium text-gray-900 mb-2">
                                  {subjectName}
                                  {subjectSchedules[0].subject.code && (
                                    <span className="ml-2 text-sm text-gray-500">
                                      ({subjectSchedules[0].subject.code})
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {Array.from(byGrade.entries()).map(([grade, gradeSchedules]) => {
                                    const sections = gradeSchedules.map((s) => s.classSection.name).join(', ');
                                    return (
                                      <div key={grade} className="text-sm text-gray-700">
                                        <span className="font-medium">{grade}:</span> {sections}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
