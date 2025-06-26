import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface VacancyData {
  VacancyID: number;
  JobTitle: string;
  VacancyName: string;
  Description: string | null;
  DateCreated: string;
  DatePosted: string | null;
  Status: string;
}

// This endpoint provides public vacancy data for the careers website
export async function GET() {
  try {
    const { data: vacancies, error } = await supabaseAdmin
      .from('Vacancy')
      .select(`
        VacancyID,
        JobTitle,
        VacancyName,
        Description,
        DateCreated,
        DatePosted,
        Status
      `)
      .eq('isDeleted', false)
      .eq('Status', 'Active') // Only return active vacancies
      .not('Status', 'in', ['Filled', 'Inactive', 'Cancelled']) // Exclude filled, inactive, and cancelled positions
      .order('DateCreated', { ascending: false });

    if (error) {
      console.error('Error fetching public vacancies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vacancies' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Format the data for the careers website
    const formattedVacancies = vacancies?.map((vacancy: VacancyData) => ({
      id: vacancy.VacancyID,
      title: vacancy.VacancyName,
      position: formatJobTitle(vacancy.JobTitle),
      description: vacancy.Description || generateDescription(vacancy.JobTitle, vacancy.VacancyName),
      postedDate: formatDate(vacancy.DatePosted || vacancy.DateCreated)
    })) || [];

    return NextResponse.json(formattedVacancies, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error fetching public vacancies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacancies' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Helper function to format job titles for display
function formatJobTitle(jobTitle: string): string {
  const titleMap: { [key: string]: string } = {
    'HR_Manager': 'HR Manager',
    'Faculty': 'Faculty Member',
    'Registrar': 'Registrar',
    'Cashier': 'Cashier',
    'Other': 'Other Position'
  };
  
  return titleMap[jobTitle] || jobTitle;
}

// Helper function to generate descriptions based on job title
function generateDescription(jobTitle: string, vacancyName: string): string {
  const descriptions: { [key: string]: string } = {
    'HR_Manager': 'Human Resources management position. Experience in HR policies and employee relations required.',
    'Faculty': 'Teaching position. Bachelor\'s degree in relevant field required.',
    'Registrar': 'Academic records management position. Experience with student information systems preferred.',
    'Cashier': 'Financial transactions and cashier duties. Attention to detail and accuracy required.',
    'Other': 'Please contact the school for detailed job description and requirements.'
  };
  
  return descriptions[jobTitle] || `${vacancyName} - Please contact the school for detailed requirements.`;
}

// Helper function to format dates
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return date.toLocaleDateString('en-US', options);
} 