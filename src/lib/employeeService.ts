'use server';

import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function getEmployeeData(employeeId: string) {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        EmployeeID: employeeId,
      },
      include: {
        employmentDetails: true,
        contactInfo: true,
        governmentIds: true,
        Department: {
          select: {
            DepartmentName: true,
            type: true,
          },
        },
        Family: true,
        skills: true,
        MedicalInfo: true,
        Education: true,
        EmploymentHistory: true,
        certificates: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    return {
      success: true,
      data: employee,
    };
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateEmployeeData(employeeId: string, data: any) {
  try {
    const updatedEmployee = await prisma.employee.update({
      where: {
        EmployeeID: employeeId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedEmployee,
    };
  } catch (error) {
    console.error('Error updating employee data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getFamilyData(employeeId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Let's debug the database structure and relationships
    
    // First, check if the User record exists
    const userRecord = await prisma.user.findUnique({
      where: { UserID: user.id }
    });
    
    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }
    
    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin') || userRole?.includes('super admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only access your own employee data. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}, Email: ${user.emailAddresses?.[0]?.emailAddress}`);
    }

    const familyRecords = await prisma.family.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: familyRecords,
    };
  } catch (error) {
    console.error('Error fetching family data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addFamilyMember(employeeId: string, familyData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only add family members to your own record. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    // Validate required fields
    if (!familyData.type || !familyData.name) {
      throw new Error('Type and name are required fields');
    }

    // Exclude id field from data to avoid unique constraint errors
    const { id, ...cleanFamilyData } = familyData;
    
    const familyRecord = await prisma.family.create({
      data: {
        ...cleanFamilyData,
        employeeId,
      },
    });

    return {
      success: true,
      data: familyRecord,
    };
  } catch (error) {
    console.error('Error adding family member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateFamilyMember(employeeId: string, familyId: number, familyData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only update family members in your own record. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    // Validate required fields
    if (!familyData.type || !familyData.name) {
      throw new Error('Type and name are required fields');
    }

    // Exclude id field from data to avoid conflicts
    const { id, ...cleanFamilyData } = familyData;
    
    const updatedFamilyRecord = await prisma.family.update({
      where: {
        id: familyId,
        employeeId: employeeId,
      },
      data: cleanFamilyData,
    });

    return {
      success: true,
      data: updatedFamilyRecord,
    };
  } catch (error) {
    console.error('Error updating family member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getEducationData(employeeId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only access your own education data. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    const educationRecords = await prisma.education.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        yearGraduated: 'desc',
      },
    });

    return {
      success: true,
      data: educationRecords,
    };
  } catch (error) {
    console.error('Error fetching education data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addEducationRecord(employeeId: string, educationData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only add education records to your own profile. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    // Exclude id field from data to avoid unique constraint errors
    const { id, ...cleanEducationData } = educationData;
    
    const educationRecord = await prisma.education.create({
      data: {
        ...cleanEducationData,
        employeeId,
      },
    });

    return {
      success: true,
      data: educationRecord,
    };
  } catch (error) {
    console.error('Error adding education record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateEducationRecord(employeeId: string, educationId: number, educationData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only update education records in your own profile. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    // Exclude id field from data to avoid conflicts
    const { id, ...cleanEducationData } = educationData;
    
    const updatedEducationRecord = await prisma.education.update({
      where: {
        id: educationId,
        employeeId: employeeId,
      },
      data: cleanEducationData,
    });

    return {
      success: true,
      data: updatedEducationRecord,
    };
  } catch (error) {
    console.error('Error updating education record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteEducationRecord(employeeId: string, educationId: number) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only delete education records from your own profile. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    await prisma.education.delete({
      where: {
        id: educationId,
        employeeId: employeeId,
      },
    });

    return {
      success: true,
      message: 'Education record deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting education record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteFamilyMember(employeeId: string, familyId: number) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin');
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only delete family members from your own record. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    await prisma.family.delete({
      where: {
        id: familyId,
        employeeId: employeeId,
      },
    });

    return {
      success: true,
      message: 'Family member deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting family member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getPromotionHistory(employeeId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if this employee record belongs to the current user (by email)
    let employeeRecord = null;
    if (user.emailAddresses?.[0]?.emailAddress) {
      employeeRecord = await prisma.employee.findFirst({
        where: { 
          Email: user.emailAddresses[0].emailAddress 
        }
      });
    }

    // Check if user has admin role - improved logic
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    console.log('User role:', userRole); // Debug log
    console.log('User publicMetadata:', user.publicMetadata); // Debug log
    
    // More comprehensive admin check
    const isAdmin = userRole?.includes('admin') || 
                   userRole?.includes('super admin') || 
                   userRole?.includes('superadmin') ||
                   userRole === 'admin' ||
                   userRole === 'super admin' ||
                   userRole === 'superadmin';
    
    console.log('Is admin?', isAdmin); // Debug log
    
    // Allow access if user is admin OR if this employee record matches their email
    const isOwnRecord = employeeRecord?.EmployeeID === employeeId;
    console.log('Is own record?', isOwnRecord); // Debug log
    console.log('Employee record ID:', employeeRecord?.EmployeeID); // Debug log
    console.log('Requested employee ID:', employeeId); // Debug log
    
    if (!isAdmin && !isOwnRecord) {
      throw new Error(`Forbidden: You can only access your own promotion history. Found EmployeeID: ${employeeRecord?.EmployeeID}, Requested: ${employeeId}`);
    }

    const promotionRecords = await prisma.promotionHistory.findMany({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    return {
      success: true,
      data: promotionRecords,
    };
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addPromotionRecord(employeeId: string, promotionData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role - only admins can add promotion records
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin') || userRole?.includes('super admin');
    
    if (!isAdmin) {
      throw new Error('Forbidden: Only administrators can add promotion records');
    }

    // Validate required fields
    if (!promotionData.toPosition || !promotionData.effectiveDate) {
      throw new Error('Position and effective date are required fields');
    }

    // Exclude id field from data to avoid unique constraint errors
    const { id, ...cleanPromotionData } = promotionData;
    
    const promotionRecord = await prisma.promotionHistory.create({
      data: {
        ...cleanPromotionData,
        employeeId,
        effectiveDate: new Date(cleanPromotionData.effectiveDate),
        createdBy: user.id,
      },
    });

    return {
      success: true,
      data: promotionRecord,
    };
  } catch (error) {
    console.error('Error adding promotion record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updatePromotionRecord(employeeId: string, promotionId: number, promotionData: any) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role - only admins can update promotion records
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin') || userRole?.includes('super admin');
    
    if (!isAdmin) {
      throw new Error('Forbidden: Only administrators can update promotion records');
    }

    // Validate required fields
    if (!promotionData.toPosition || !promotionData.effectiveDate) {
      throw new Error('Position and effective date are required fields');
    }

    // Exclude id field from data to avoid conflicts
    const { id, ...cleanPromotionData } = promotionData;
    
    const updatedPromotionRecord = await prisma.promotionHistory.update({
      where: {
        id: promotionId,
        employeeId: employeeId,
      },
      data: {
        ...cleanPromotionData,
        effectiveDate: new Date(cleanPromotionData.effectiveDate),
        updatedBy: user.id,
      },
    });

    return {
      success: true,
      data: updatedPromotionRecord,
    };
  } catch (error) {
    console.error('Error updating promotion record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deletePromotionRecord(employeeId: string, promotionId: number) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role - only admins can delete promotion records
    const userRole = user.publicMetadata?.role?.toString().toLowerCase();
    const isAdmin = userRole?.includes('admin') || userRole?.includes('super admin');
    
    if (!isAdmin) {
      throw new Error('Forbidden: Only administrators can delete promotion records');
    }

    await prisma.promotionHistory.delete({
      where: {
        id: promotionId,
        employeeId: employeeId,
      },
    });

    return {
      success: true,
      message: 'Promotion record deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting promotion record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 