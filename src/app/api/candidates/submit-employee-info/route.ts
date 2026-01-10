import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, employeeInfo } = body;

    if (!token || !employeeInfo) {
      return NextResponse.json(
        { error: 'Token and employee information are required' },
        { status: 400 }
      );
    }

    // Validate token and fetch candidate
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('Candidate')
      .select('CandidateID, Status, Token, TokenExpiry, EmployeeInfoSubmitted, InfoReturned, FullName, ContactNumber')
      .eq('Token', token)
      .eq('isDeleted', false)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (candidate.TokenExpiry) {
      const expiryDate = new Date(candidate.TokenExpiry);
      const now = new Date();
      
      if (now > expiryDate) {
        return NextResponse.json(
          { error: 'Token has expired. Please contact HR for a new link.' },
          { status: 400 }
        );
      }
    }

    // Check if status is "Offered"
    if (candidate.Status !== 'Offered') {
      return NextResponse.json(
        { error: 'This link is no longer valid for your current application status.' },
        { status: 400 }
      );
    }

    // Check if employee info has already been submitted (allow resubmission if returned)
    if (candidate.EmployeeInfoSubmitted && !candidate.InfoReturned) {
      return NextResponse.json(
        { error: 'Employee information has already been submitted.' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'DateOfBirth',
      'PlaceOfBirth',
      'CivilStatus',
      'Nationality',
      'PresentAddress',
      'PermanentAddress',
      'Phone',
      'EmergencyContactName',
      'EmergencyContactNumber',
      'EmergencyContactRelationship'
    ];

    const missingFields = requiredFields.filter(field => !employeeInfo[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate at least one government ID is provided
    const hasAtLeastOneGovtId = !!(
      employeeInfo.SSSNumber?.trim() ||
      employeeInfo.TINNumber?.trim() ||
      employeeInfo.PhilHealthNumber?.trim() ||
      employeeInfo.PagIbigNumber?.trim() ||
      employeeInfo.GSISNumber?.trim() ||
      employeeInfo.PRCLicenseNumber?.trim()
    );
    
    if (!hasAtLeastOneGovtId) {
      return NextResponse.json(
        { error: 'At least one government ID is required (SSS, TIN, PhilHealth, Pag-IBIG, GSIS, or PRC License Number)' },
        { status: 400 }
      );
    }

    // Validate emergency contact is not the candidate themselves
    if (employeeInfo.EmergencyContactName) {
      const candidateName = candidate.FullName || '';
      const emergencyName = employeeInfo.EmergencyContactName.trim().toLowerCase();
      const normalizedCandidateName = candidateName.toLowerCase().trim();
      
      if (emergencyName === normalizedCandidateName) {
        return NextResponse.json(
          { error: 'Emergency contact cannot be yourself. Please provide a different contact person.' },
          { status: 400 }
        );
      }
    }

    // Validate emergency contact number is not the same as applicant's contact number
    if (employeeInfo.EmergencyContactNumber) {
      // Normalize phone numbers (remove all non-digit characters)
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      const applicantPhone = normalizePhone(employeeInfo.Phone || candidate.ContactNumber || '');
      const emergencyPhone = normalizePhone(employeeInfo.EmergencyContactNumber);
      
      if (applicantPhone && emergencyPhone && applicantPhone === emergencyPhone) {
        return NextResponse.json(
          { error: 'Emergency contact number cannot be the same as your contact number. Please provide a different contact number.' },
          { status: 400 }
        );
      }
    }

    // Update candidate with submitted employee information
    // If resubmitting after return, clear the returned flags
    const updateData: any = {
      EmployeeInfoSubmitted: true,
      EmployeeInfoSubmittedDate: new Date().toISOString(),
      SubmittedEmployeeInfo: employeeInfo,
      DateModified: new Date().toISOString()
    };

    // Clear returned flags if this is a resubmission
    if (candidate.InfoReturned) {
      updateData.InfoReturned = false;
      updateData.InfoReturnedDate = null;
      updateData.InfoReturnReason = null;
    }

    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('Candidate')
      .update(updateData)
      .eq('CandidateID', candidate.CandidateID)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit employee information' },
        { status: 500 }
      );
    }

    const isResubmission = candidate.InfoReturned;
    
    return NextResponse.json({
      success: true,
      message: isResubmission 
        ? 'Employee information has been resubmitted successfully. Our HR team will review your updated information and contact you soon.'
        : 'Employee information submitted successfully. Our HR team will review your information and contact you soon.',
      candidate: updatedCandidate
    });
  } catch (error) {
    console.error('Error submitting employee information:', error);
    return NextResponse.json(
      { error: 'Failed to submit employee information' },
      { status: 500 }
    );
  }
}

