import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;

    console.log('Fetching medical info for employee:', employeeId);

    const medicalInfo = await prisma.medicalInfo.findUnique({
      where: {
        employeeId: employeeId
      }
    });

    console.log('Medical info result:', medicalInfo);

    // Return empty object if no medical info exists (instead of 404)
    if (!medicalInfo) {
      return NextResponse.json({});
    }

    return NextResponse.json(medicalInfo);
  } catch (error) {
    console.error('Error fetching medical info:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes('prepared statement')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch medical information' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const data = await request.json();

    console.log('Creating medical info for employee:', employeeId, data);

    // Convert date strings to Date objects
    if (data.lastCheckup) data.lastCheckup = new Date(data.lastCheckup);
    if (data.pwdIdValidity) data.pwdIdValidity = new Date(data.pwdIdValidity);
    if (data.healthInsuranceExpiryDate) data.healthInsuranceExpiryDate = new Date(data.healthInsuranceExpiryDate);

    // Ensure numeric fields are properly typed
    if (data.height) data.height = parseFloat(data.height);
    if (data.weight) data.weight = parseFloat(data.weight);
    if (data.disabilityPercentage) data.disabilityPercentage = parseInt(data.disabilityPercentage);

    const medicalInfo = await prisma.medicalInfo.create({
      data: {
        employeeId: employeeId,
        medicalNotes: data.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: data.allergies,
        hasDisability: data.hasDisability || false,
        disabilityType: data.disabilityType,
        disabilityDetails: data.disabilityDetails,
        accommodationsNeeded: data.accommodationsNeeded,
        pwdIdNumber: data.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: data.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: data.assistiveTechnology,
        mobilityAids: data.mobilityAids,
        communicationNeeds: data.communicationNeeds,
        workplaceModifications: data.workplaceModifications,
        emergencyProtocol: data.emergencyProtocol,
        bloodPressure: data.bloodPressure,
        height: data.height,
        weight: data.weight,
        emergencyProcedures: data.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: data.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: data.healthInsuranceNumber,
        healthInsuranceExpiryDate: data.healthInsuranceExpiryDate
      }
    });

    console.log('Medical info created successfully:', medicalInfo);
    return NextResponse.json(medicalInfo);
  } catch (error) {
    console.error('Error creating medical info:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes('prepared statement')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create medical information' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const data = await request.json();

    console.log('Updating medical info for employee:', employeeId, data);

    // Convert date strings to Date objects
    if (data.lastCheckup) data.lastCheckup = new Date(data.lastCheckup);
    if (data.pwdIdValidity) data.pwdIdValidity = new Date(data.pwdIdValidity);
    if (data.healthInsuranceExpiryDate) data.healthInsuranceExpiryDate = new Date(data.healthInsuranceExpiryDate);

    // Ensure numeric fields are properly typed
    if (data.height) data.height = parseFloat(data.height);
    if (data.weight) data.weight = parseFloat(data.weight);
    if (data.disabilityPercentage) data.disabilityPercentage = parseInt(data.disabilityPercentage);

    const updatedMedicalInfo = await prisma.medicalInfo.upsert({
      where: {
        employeeId: employeeId
      },
      update: {
        medicalNotes: data.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: data.allergies,
        hasDisability: data.hasDisability,
        disabilityType: data.disabilityType,
        disabilityDetails: data.disabilityDetails,
        accommodationsNeeded: data.accommodationsNeeded,
        pwdIdNumber: data.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: data.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: data.assistiveTechnology,
        mobilityAids: data.mobilityAids,
        communicationNeeds: data.communicationNeeds,
        workplaceModifications: data.workplaceModifications,
        emergencyProtocol: data.emergencyProtocol,
        bloodPressure: data.bloodPressure,
        height: data.height,
        weight: data.weight,
        emergencyProcedures: data.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: data.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: data.healthInsuranceNumber,
        healthInsuranceExpiryDate: data.healthInsuranceExpiryDate
      },
      create: {
        employeeId: employeeId,
        medicalNotes: data.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: data.allergies,
        hasDisability: data.hasDisability || false,
        disabilityType: data.disabilityType,
        disabilityDetails: data.disabilityDetails,
        accommodationsNeeded: data.accommodationsNeeded,
        pwdIdNumber: data.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: data.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: data.assistiveTechnology,
        mobilityAids: data.mobilityAids,
        communicationNeeds: data.communicationNeeds,
        workplaceModifications: data.workplaceModifications,
        emergencyProtocol: data.emergencyProtocol,
        bloodPressure: data.bloodPressure,
        height: data.height,
        weight: data.weight,
        emergencyProcedures: data.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: data.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: data.healthInsuranceNumber,
        healthInsuranceExpiryDate: data.healthInsuranceExpiryDate
      }
    });

    console.log('Medical info updated successfully:', updatedMedicalInfo);
    return NextResponse.json(updatedMedicalInfo);
  } catch (error) {
    console.error('Error updating medical info:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes('prepared statement')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update medical information' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;

    await prisma.medicalInfo.delete({
      where: {
        employeeId: employeeId
      }
    });

    return NextResponse.json({ message: 'Medical information deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical info:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes('prepared statement')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete medical information' },
      { status: 500 }
    );
  }
} 