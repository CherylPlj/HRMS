import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

interface DirectoryFilters {
  name?: string;
  department?: string;
  position?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: DirectoryFilters = {
      name: searchParams.get('name') || undefined,
      department: searchParams.get('department') || undefined,
      position: searchParams.get('position') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    };

    // Build employee query - using the same structure as the working employees API
    let employeeQuery = supabaseAdmin
      .from('Employee')
      .select(`
        *,
        EmploymentDetail(EmploymentStatus, HireDate, ResignationDate, RetirementDate),
        ContactInfo(Phone, Email),
        Department(DepartmentName),
        User(Status)
      `)
      .order('createdAt', { ascending: false });

    // Apply filters
    if (filters.department) {
      employeeQuery = employeeQuery.eq('Department.DepartmentName', filters.department);
    }

    if (filters.position) {
      employeeQuery = employeeQuery.eq('Position', filters.position);
    }

    if (filters.status) {
      employeeQuery = employeeQuery.eq('EmploymentDetail.EmploymentStatus', filters.status);
    }

    // Execute query
    console.log('Executing employee query...');
    const employeesResult = await employeeQuery;

    if (employeesResult.error) {
      console.error('Error fetching employees:', employeesResult.error);
    }

    const employees = employeesResult.data || [];
    console.log(`Found ${employees.length} employees`);

    // Filter by name for employees (since we can't filter in the query easily)
    let filteredEmployees = employees;
    if (filters.name) {
      filteredEmployees = employees.filter((emp: any) => {
        const fullName = `${emp.FirstName || ''} ${emp.LastName || ''}`.toLowerCase();
        return fullName.includes(filters.name!.toLowerCase());
      });
    }

    // Use filtered employees as all records
    const allRecords = filteredEmployees;

    // Apply pagination
    const startIndex = (filters.page! - 1) * filters.limit!;
    const endIndex = startIndex + filters.limit!;
    const paginatedRecords = allRecords.slice(startIndex, endIndex);

    // Get filter options
    const [departmentsResult, positionsResult] = await Promise.all([
      supabaseAdmin
        .from('Department')
        .select('DepartmentName')
        .order('DepartmentName'),
      supabaseAdmin
        .from('Employee')
        .select('Position')
        .not('Position', 'is', null)
    ]);

    const departments = [...new Set(departmentsResult.data?.map((d: any) => d.DepartmentName) || [])].sort();
    const allPositions = [...new Set(positionsResult.data?.map((e: any) => e.Position).filter(Boolean) || [])].sort();
    
    console.log('Unique departments:', departments);
    console.log('Unique positions:', allPositions);

    return NextResponse.json({
      records: paginatedRecords,
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(allRecords.length / filters.limit!),
        totalCount: allRecords.length,
        limit: filters.limit,
        hasNextPage: endIndex < allRecords.length,
        hasPrevPage: filters.page! > 1
      },
      filterOptions: {
        departments,
        positions: allPositions,
        statuses: ['Regular', 'Probationary', 'Part_Time', 'Hired', 'Resigned', 'Retired']
      },
      timestamp: new Date().toISOString() // Add timestamp to help with debugging
    });

  } catch (error) {
    console.error('Error in directory API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch directory data' },
      { status: 500 }
    );
  }
}

// Admin function to update employee status
export async function PUT(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to implement proper role checking)
    const body = await request.json();
    const { employeeId, action, newStatus } = body;

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update_status':
        if (!newStatus) {
          return NextResponse.json(
            { error: 'New status is required' },
            { status: 400 }
          );
        }

        // Update employee status
        result = await supabaseAdmin
          .from('EmploymentDetail')
          .update({ EmploymentStatus: newStatus })
          .eq('employeeId', employeeId);
        break;

      case 'deactivate':
        // Deactivate user
        result = await supabaseAdmin
          .from('User')
          .update({ Status: 'Inactive' })
          .eq('UserID', employeeId);
        break;

      case 'activate':
        // Activate user
        result = await supabaseAdmin
          .from('User')
          .update({ Status: 'Active' })
          .eq('UserID', employeeId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error('Error updating employee:', result.error);
      return NextResponse.json(
        { error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Employee updated successfully' });

  } catch (error) {
    console.error('Error in directory PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}
