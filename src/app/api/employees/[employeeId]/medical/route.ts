import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/utils/serverRoleUtils';
import { encrypt, decrypt, encryptFields, decryptFields } from '@/lib/encryption';

// Fields that should be encrypted in MedicalInfo
const MEDICAL_ENCRYPTED_FIELDS = [
  'medicalNotes',
  'allergies',
  'disabilityDetails',
  'pwdIdNumber',
  'healthInsuranceNumber',
  'physicianContact',
  'emergencyProcedures',
  'bloodType',
  'accommodationsNeeded',
  'emergencyProtocol',
  'disabilityCertification',
  'assistiveTechnology',
  'mobilityAids',
  'communicationNeeds',
  'workplaceModifications',
] as const;

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

    // Decrypt sensitive fields before returning
    const decryptedMedicalInfo = decryptFields(medicalInfo, MEDICAL_ENCRYPTED_FIELDS, 'medical');

    return NextResponse.json(decryptedMedicalInfo);
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot add/edit medical information
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to add or edit medical information' },
        { status: 403 }
      );
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    console.log('Creating medical info for employee:', employeeId, data);

    // Convert date strings to Date objects
    if (data.lastCheckup) data.lastCheckup = new Date(data.lastCheckup);
    if (data.pwdIdValidity) data.pwdIdValidity = new Date(data.pwdIdValidity);
    if (data.healthInsuranceExpiryDate) data.healthInsuranceExpiryDate = new Date(data.healthInsuranceExpiryDate);

    // Ensure numeric fields are properly typed
    if (data.disabilityPercentage) data.disabilityPercentage = parseInt(data.disabilityPercentage);

    // Encrypt sensitive fields before storing
    const encryptedData = encryptFields(data, MEDICAL_ENCRYPTED_FIELDS, 'medical');

    const medicalInfo = await prisma.medicalInfo.create({
      data: {
        employeeId: employeeId,
        medicalNotes: encryptedData.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: encryptedData.allergies,
        bloodType: encryptedData.bloodType,
        hasDisability: data.hasDisability || false,
        disabilityType: data.disabilityType,
        disabilityDetails: encryptedData.disabilityDetails,
        accommodationsNeeded: encryptedData.accommodationsNeeded,
        pwdIdNumber: encryptedData.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: encryptedData.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: encryptedData.assistiveTechnology,
        mobilityAids: encryptedData.mobilityAids,
        communicationNeeds: encryptedData.communicationNeeds,
        workplaceModifications: encryptedData.workplaceModifications,
        emergencyProtocol: encryptedData.emergencyProtocol,
        emergencyProcedures: encryptedData.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: encryptedData.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: encryptedData.healthInsuranceNumber,
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot add/edit medical information
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to add or edit medical information' },
        { status: 403 }
      );
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    console.log('Updating medical info for employee:', employeeId, data);

    // Convert date strings to Date objects
    if (data.lastCheckup) data.lastCheckup = new Date(data.lastCheckup);
    if (data.pwdIdValidity) data.pwdIdValidity = new Date(data.pwdIdValidity);
    if (data.healthInsuranceExpiryDate) data.healthInsuranceExpiryDate = new Date(data.healthInsuranceExpiryDate);

    // Ensure numeric fields are properly typed
    if (data.disabilityPercentage) data.disabilityPercentage = parseInt(data.disabilityPercentage);

    // Encrypt sensitive fields before storing
    const encryptedData = encryptFields(data, MEDICAL_ENCRYPTED_FIELDS, 'medical');

    const updatedMedicalInfo = await prisma.medicalInfo.upsert({
      where: {
        employeeId: employeeId
      },
      update: {
        medicalNotes: encryptedData.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: encryptedData.allergies,
        bloodType: encryptedData.bloodType,
        hasDisability: data.hasDisability,
        disabilityType: data.disabilityType,
        disabilityDetails: encryptedData.disabilityDetails,
        accommodationsNeeded: encryptedData.accommodationsNeeded,
        pwdIdNumber: encryptedData.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: encryptedData.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: encryptedData.assistiveTechnology,
        mobilityAids: encryptedData.mobilityAids,
        communicationNeeds: encryptedData.communicationNeeds,
        workplaceModifications: encryptedData.workplaceModifications,
        emergencyProtocol: encryptedData.emergencyProtocol,
        emergencyProcedures: encryptedData.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: encryptedData.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: encryptedData.healthInsuranceNumber,
        healthInsuranceExpiryDate: data.healthInsuranceExpiryDate
      },
      create: {
        employeeId: employeeId,
        medicalNotes: encryptedData.medicalNotes,
        lastCheckup: data.lastCheckup,
        vaccination: data.vaccination,
        allergies: encryptedData.allergies,
        bloodType: encryptedData.bloodType,
        hasDisability: data.hasDisability || false,
        disabilityType: data.disabilityType,
        disabilityDetails: encryptedData.disabilityDetails,
        accommodationsNeeded: encryptedData.accommodationsNeeded,
        pwdIdNumber: encryptedData.pwdIdNumber,
        pwdIdValidity: data.pwdIdValidity,
        disabilityCertification: encryptedData.disabilityCertification,
        disabilityPercentage: data.disabilityPercentage,
        assistiveTechnology: encryptedData.assistiveTechnology,
        mobilityAids: encryptedData.mobilityAids,
        communicationNeeds: encryptedData.communicationNeeds,
        workplaceModifications: encryptedData.workplaceModifications,
        emergencyProtocol: encryptedData.emergencyProtocol,
        emergencyProcedures: encryptedData.emergencyProcedures,
        primaryPhysician: data.primaryPhysician,
        physicianContact: encryptedData.physicianContact,
        healthInsuranceProvider: data.healthInsuranceProvider,
        healthInsuranceNumber: encryptedData.healthInsuranceNumber,
        healthInsuranceExpiryDate: data.healthInsuranceExpiryDate
      }
    });

    // Decrypt before returning
    const decryptedMedicalInfo = decryptFields(updatedMedicalInfo, MEDICAL_ENCRYPTED_FIELDS, 'medical');

    console.log('Medical info updated successfully:', updatedMedicalInfo);
    return NextResponse.json(decryptedMedicalInfo);
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - admins cannot delete medical information
    if (await isUserAdmin()) {
      return NextResponse.json(
        { error: 'Admins are not allowed to delete medical information' },
        { status: 403 }
      );
    }

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