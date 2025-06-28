import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;

    const medicalInfo = await prisma.medicalInfo.findUnique({
      where: {
        employeeId: employeeId
      }
    });

    if (!medicalInfo) {
      return NextResponse.json(
        { error: 'Medical information not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(medicalInfo);
  } catch (error) {
    console.error('Error fetching medical info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medical information' },
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

    return NextResponse.json(updatedMedicalInfo);
  } catch (error) {
    console.error('Error updating medical info:', error);
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
    return NextResponse.json(
      { error: 'Failed to delete medical information' },
      { status: 500 }
    );
  }
} 