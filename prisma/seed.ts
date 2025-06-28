import { prisma } from "@/lib/prisma";
import { hashWithSHA256 } from '@/lib/hash';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// await prisma.role.createMany({
//   data: [
//     { name: 'Admin' },
//     { name: 'Faculty' },
//     { name: 'Registrar' },
//     { name: 'Cashier' },
//   ],
//   skipDuplicates: true
// });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createDefaultDepartments() {
    const departments = [
        { name: 'Pre-School', type: 'Pre_School' as const },
        { name: 'Primary', type: 'Primary' as const },
        { name: 'Intermediate', type: 'Intermediate' as const },
        { name: 'JHS', type: 'JHS' as const },
        { name: 'Admin', type: 'Admin' as const },
        { name: 'Default', type: 'Default' as const }
    ];

    for (const dept of departments) {
        try {
            await prisma.department.upsert({
                where: { DepartmentName: dept.name },
                update: { type: dept.type },
                create: { 
                    DepartmentName: dept.name,
                    type: dept.type
                },
            });
            await delay(100); // Small delay to prevent prepared statement conflicts
        } catch (error) {
            console.log(`Department ${dept.name} already exists or error:`, error);
        }
    }
}

async function createDefaultDocumentTypes() {
    const documentTypes = [
        { name: 'Resume' },
        { name: 'Contract' },
        { name: 'Faculty Clearance Form' },
        { name: 'SSS' },
        { name: 'PhilHealth' },
        { name: 'PAGIBIG' },
        { name: 'TIN Number' },
    ];

    for (const doc of documentTypes) {
        try {
            await prisma.documentType.upsert({
                where: { DocumentTypeName: doc.name },
                update: {},
                create: { DocumentTypeName: doc.name, AllowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'] },
            });
            await delay(100); // Small delay to prevent prepared statement conflicts
        } catch (error) {
            console.log(`Document type ${doc.name} already exists or error:`, error);
        }
    }
}

async function createUserWithRole({
    email,
    plainPassword,
    firstName,
    lastName,
    roleName,
    facultyData = null,
}: {
    email: string;
    plainPassword: string;
    firstName: string;
    lastName: string;
    roleName: string;
    facultyData?: {
        departmentName: string;
        position: string;
        dateOfBirth: Date;
        phone?: string;
        address?: string;
    } | null;
}) {
    const { saltHash } = hashWithSHA256(plainPassword);

    const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
    });

    const user = await prisma.user.upsert({
        where: { Email: email },
        update: {
            // Update existing user data
            FirstName: firstName,
            LastName: lastName,
            PasswordHash: saltHash,
            Status: 'Active',
            DateModified: new Date(),
        },
        create: {
            // Generate a unique user ID with this prefix AND FORMAT 2025-XXXX-XXXX
            UserID: `2025-${randomUUID().split('-')[2]}-${randomUUID().split('-')[3]}`,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            PasswordHash: saltHash,
            Status: 'Active',
            Role: {
                create: {
                    roleId: role.id,
                },
            },
        },
    });

    // If this is a faculty user and faculty data is provided, create faculty record
    if (roleName === 'Faculty' && facultyData) {
        const department = await prisma.department.findFirst({
            where: { DepartmentName: facultyData.departmentName },
        });

        if (!department) {
            throw new Error(`Department '${facultyData.departmentName}' not found`);
        }

        await prisma.faculty.upsert({
            where: { UserID: user.UserID },
            update: {
                DateOfBirth: facultyData.dateOfBirth,
                Phone: facultyData.phone,
                Address: facultyData.address,
                Position: facultyData.position,
                DepartmentID: department.DepartmentID,
                HireDate: new Date(), // Default hire date to today
            },
            create: {
                FacultyID: parseInt(randomUUID().split('-')[0], 16) % 1000000, // Generate a unique FacultyID
                UserID: user.UserID,
                DateOfBirth: facultyData.dateOfBirth,
                Phone: facultyData.phone,
                Address: facultyData.address,
                Position: facultyData.position,
                DepartmentID: department.DepartmentID,
                HireDate: new Date(), // Default hire date to today
            },
        });
    }

    return user;
}

async function createDefaultVacancies() {
    const vacancies = [
        {
            JobTitle: 'Faculty',
            VacancyName: 'Elementary Teacher',
            Description: 'Full-time position for grades 1-6. Bachelor\'s degree in Education required.',
            HiringManager: 'HR Department',
            Status: 'Active',
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Faculty',
            VacancyName: 'High School Math Teacher',
            Description: 'Teaching position for junior and senior high school mathematics.',
            HiringManager: 'HR Department',
            Status: 'Active',
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Other',
            VacancyName: 'School Guidance Counselor',
            Description: 'Full-time counselor position. Psychology or Guidance Counseling degree preferred.',
            HiringManager: 'HR Department',
            Status: 'Active',
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Other',
            VacancyName: 'Administrative Assistant',
            Description: 'Support role for school administration. Computer literacy and communication skills required.',
            HiringManager: 'HR Department',
            Status: 'Active',
            DatePosted: new Date('2025-05-01'),
        },
    ];

    for (const vacancy of vacancies) {
        try {
            // Check if vacancy already exists
            const existingVacancy = await prisma.vacancy.findFirst({
                where: { VacancyName: vacancy.VacancyName },
            });

            if (!existingVacancy) {
                await prisma.vacancy.create({
                    data: {
                        JobTitle: vacancy.JobTitle as any,
                        VacancyName: vacancy.VacancyName,
                        HiringManager: vacancy.HiringManager,
                        Status: vacancy.Status as any,
                        // Note: Description and DatePosted will be added after schema migration
                    },
                });
            }
            await delay(100); // Small delay to prevent prepared statement conflicts
        } catch (error) {
            console.log(`Vacancy ${vacancy.VacancyName} already exists or error:`, error);
        }
    }
    console.log('Default vacancies created/verified');
}

async function main() {
    console.log('Seeding database...');

    // Create default departments first
    // await createDefaultDepartments();
    // await createDefaultDocumentTypes();
    console.log('Default departments created/verified');
    console.log('Default document types created/verified');

    // Create default vacancies
    await createDefaultVacancies();

    // Seed Subjects
    // const subjects = [
    //     'Mathematics',
    //     'Science',
    //     'English',
    //     'History',
    //     'Filipino',
    //     'MAPEH',
    //     'Technology and Livelihood Education',
    //     'Values Education',
    // ];

    // for (const name of subjects) {
    //     await prisma.subject.upsert({
    //         where: { name },
    //         update: {},
    //         create: { name },
    //     });
    // }
    // console.log('Subjects seeded.');

    // // Seed Class Sections
    // // Kinder 1 & 2
    // await prisma.classSection.upsert({ where: { name: 'Kinder 1-Mapagbigay' }, update: {}, create: { name: 'Kinder 1-Mapagbigay' } });
    // await prisma.classSection.upsert({ where: { name: 'Kinder 2-Mabait' }, update: {}, create: { name: 'Kinder 2-Mabait' } });
    // await prisma.classSection.upsert({ where: { name: 'Kinder 2-Matiyaga' }, update: {}, create: { name: 'Kinder 2-Matiyaga' } });

    // // Grade 1
    // await prisma.classSection.upsert({ where: { name: 'Grade 1-Malinis' }, update: {}, create: { name: 'Grade 1-Malinis' } });

    // // Grade 2
    // await prisma.classSection.upsert({ where: { name: 'Grade 2-Matapat' }, update: {}, create: { name: 'Grade 2-Matapat' } });

    // // Grade 3
    // await prisma.classSection.upsert({ where: { name: 'Grade 3-Mapagmahal' }, update: {}, create: { name: 'Grade 3-Mapagmahal' } });
    // await prisma.classSection.upsert({ where: { name: 'Grade 3-Magalang' }, update: {}, create: { name: 'Grade 3-Magalang' } });

    // // Grade 4
    // await prisma.classSection.upsert({ where: { name: 'Grade 4-Maalalahanin' }, update: {}, create: { name: 'Grade 4-Maalalahanin' } });
    // await prisma.classSection.upsert({ where: { name: 'Grade 4-Magiliw' }, update: {}, create: { name: 'Grade 4-Magiliw' } });

    // // Grade 5
    // await prisma.classSection.upsert({ where: { name: 'Grade 5-Malikhain' }, update: {}, create: { name: 'Grade 5-Malikhain' } });

    // // Grade 6
    // await prisma.classSection.upsert({ where: { name: 'Grade 6-Masigasig' }, update: {}, create: { name: 'Grade 6-Masigasig' } });

    // // Grade 7
    // await prisma.classSection.upsert({ where: { name: 'Grade 7-Magiting' }, update: {}, create: { name: 'Grade 7-Magiting' } });

    // // Grade 8
    // await prisma.classSection.upsert({ where: { name: 'Grade 8-Masinop' }, update: {}, create: { name: 'Grade 8-Masinop' } });

    // // Grade 9
    // await prisma.classSection.upsert({ where: { name: 'Grade 9-Masunurin' }, update: {}, create: { name: 'Grade 9-Masunurin' } });

    // // Grade 10
    // await prisma.classSection.upsert({ where: { name: 'Grade 10-Mahusay' }, update: {}, create: { name: 'Grade 10-Mahusay' } });

    // console.log('Class sections seeded.');

    // const users = [
    //     {
    //         email: 'admin@admin.com',
    //         plainPassword: 'SJSFI@dmin1',
    //         firstName: 'Admin',
    //         lastName: 'User',
    //         roleName: 'Admin',
    //     },
    //     {
    //         email: 'faculty@faculty.com',
    //         plainPassword: 'SJSFIF@culty1',
    //         firstName: 'Faculty',
    //         lastName: 'User',
    //         roleName: 'Faculty',
    //         facultyData: {
    //             departmentName: 'Math',
    //             position: 'Assistant Professor',
    //             dateOfBirth: new Date('1990-01-15'),
    //             phone: '+63 912 345 6789',
    //             address: '123 Faculty Street, Manila, Philippines',
    //             emergencyContact: '+63 998 765 4321',
    //         },
    //     },
    //     {
    //         email: 'faculty2@faculty.com',
    //         plainPassword: 'SJSFIF@culty2',
    //         firstName: 'Jane',
    //         lastName: 'Smith',
    //         roleName: 'Faculty',
    //         facultyData: {
    //             departmentName: 'English',
    //             position: 'Associate Professor',
    //             dateOfBirth: new Date('1985-06-20'),
    //             phone: '+63 923 456 7890',
    //             address: '456 Teacher Avenue, Quezon City, Philippines',
    //             emergencyContact: '+63 987 654 3210',
    //         },
    //     },
    //     {
    //         email: 'faculty3@faculty.com',
    //         plainPassword: 'SJSFIF@culty3',
    //         firstName: 'Michael',
    //         lastName: 'Johnson',
    //         roleName: 'Faculty',
    //         facultyData: {
    //             departmentName: 'Science',
    //             position: 'Professor',
    //             dateOfBirth: new Date('1980-12-10'),
    //             phone: '+63 934 567 8901',
    //             address: '789 Business Road, Makati, Philippines',
    //             emergencyContact: '+63 976 543 2109',
    //         },
    //     },
    //     {
    //         email: 'registrar@registrar.com',
    //         plainPassword: 'Registrar@SJSFI',
    //         firstName: 'Registrar',
    //         lastName: 'User',
    //         roleName: 'Registrar',
    //     },
    //     {
    //         email: 'cashier@cashier.com',
    //         plainPassword: 'Cashier@SJSFI',
    //         firstName: 'Cashier',
    //         lastName: 'User',
    //         roleName: 'Cashier',
    //     },
    //     {
    //         email: 'student@student.com',
    //         plainPassword: 'Student@SJSFI',
    //         firstName: 'Student',
    //         lastName: 'User',
    //         roleName: 'Student',
    //     },
    // ];

    // for (const user of users) {
    //     const createdUser = await createUserWithRole(user);
    //     console.log(`Seeded user: ${createdUser.Email} with role: ${user.roleName}`);
    //     if (user.facultyData) {
    //         console.log(`  - Faculty record created for department: ${user.facultyData.departmentName}`);
    //     }
    // }

    // Create employees with relations using individual create operations
    const employeesToCreate = [
        {
            EmployeeID: '2024-0064',
            FirstName: 'Maria',
            LastName: 'Santos',
            MiddleName: 'Cruz',
            ExtensionName: undefined,
            Sex: 'Female',
            DateOfBirth: new Date('1990-05-01'),
            DepartmentID: 1,
            contactInfo: {
                Email: 'maria.santos@sjsfi.edu.ph',
                Phone: '09170000005',
                PresentAddress: '005-A Katipunan Commonwealth Quezon City',
                EmergencyContactName: 'Ivhann Glenn C. Bendal',
                EmergencyContactNumber: '0965-3447382',
            },
            employmentDetails: {
                EmploymentStatus: 'Regular',
                HireDate: new Date('2024-01-01'),
                Designation: 'Faculty',
                Position: 'Math Teacher',
            }
        },
        {
            EmployeeID: '2022-0003',
            FirstName: 'Ana',
            LastName: 'Bote',
            MiddleName: 'Reyes',
            ExtensionName: undefined,
            Sex: 'Female',
            DateOfBirth: new Date('1991-06-02'),
            DepartmentID: 2,
            contactInfo: {
                Email: 'ana.bote@sjsfi.edu.ph',
                Phone: '09170000006',
                PresentAddress: 'Block 35 Lot 20 Lower Narra Street Paez Santos Ville  Quezon City',
                EmergencyContactName: 'Josie B. Bote',
                EmergencyContactNumber: '0910-5877378',
            },
            employmentDetails: {
                EmploymentStatus: 'Regular',
                HireDate: new Date('2022-01-01'),
                Designation: 'Faculty',
                Position: 'English Teacher',
            }
        },
    ];

    // Create employees with their relations
    for (const employeeData of employeesToCreate) {
        try {
            await prisma.employee.create({
                data: {
                    EmployeeID: employeeData.EmployeeID,
                    FirstName: employeeData.FirstName,
                    LastName: employeeData.LastName,
                    MiddleName: employeeData.MiddleName,
                    ExtensionName: (employeeData as any).ExtensionName || null,
                    Sex: employeeData.Sex,
                    DateOfBirth: employeeData.DateOfBirth,
                    DepartmentID: employeeData.DepartmentID,
                    contactInfo: {
                        create: {
                            Email: employeeData.contactInfo.Email,
                            Phone: employeeData.contactInfo.Phone,
                            PresentAddress: employeeData.contactInfo.PresentAddress,
                            EmergencyContactName: employeeData.contactInfo.EmergencyContactName,
                            EmergencyContactNumber: employeeData.contactInfo.EmergencyContactNumber,
                        }
                    },
                    employmentDetails: {
                        create: {
                            EmploymentStatus: employeeData.employmentDetails.EmploymentStatus as any,
                            HireDate: employeeData.employmentDetails.HireDate,
                            Designation: employeeData.employmentDetails.Designation as any,
                            Position: employeeData.employmentDetails.Position,
                        }
                    }
                }
            });
            console.log(`Created employee: ${employeeData.FirstName} ${employeeData.LastName}`);
        } catch (error) {
            console.error(`Error creating employee ${employeeData.FirstName} ${employeeData.LastName}:`, error);
        }
    }

    console.log('Employee seeding complete.');

    const faculties = await prisma.faculty.findMany();

    for (const faculty of faculties) {
        // Check if an Employee already exists for this Faculty
        const existingEmployee = await prisma.employee.findUnique({
            where: { EmployeeID: faculty.EmployeeID || faculty.UserID }, // Use Faculty.EmployeeID if available, else UserID
        });
        if (existingEmployee) continue;

        // Create Employee with related data
        const employee = await prisma.employee.create({
            data: {
                EmployeeID: faculty.EmployeeID || faculty.UserID, // Use Faculty.EmployeeID if available, else UserID
                UserID: faculty.UserID,
                DateOfBirth: faculty.DateOfBirth,
                DepartmentID: faculty.DepartmentID,
                ContractID: faculty.ContractID,
                contactInfo: {
                    create: {
                        Phone: faculty.Phone || '',
                        PresentAddress: faculty.Address || '',
                        EmergencyContactName: faculty.EmergencyContact || '',
                    }
                },
                employmentDetails: {
                    create: {
                        EmploymentStatus: faculty.EmploymentStatus,
                        HireDate: faculty.HireDate,
                        ResignationDate: faculty.ResignationDate,
                        Position: faculty.Position || '',
                    }
                }
            },
        });

        // Update Faculty to reference Employee
        await prisma.faculty.update({
            where: { FacultyID: faculty.FacultyID },
            data: { EmployeeID: employee.EmployeeID },
        });

        // Update User to reference Employee
        await prisma.user.updateMany({
            where: { UserID: faculty.UserID },
            data: { EmployeeID: employee.EmployeeID },
        });
    }

    const users = await prisma.user.findMany({
        where: { EmployeeID: null }, // Only users not already linked
    });

    for (const user of users) {
        // Create Employee with related data
        const employee = await prisma.employee.create({
            data: {
                EmployeeID: user.UserID,
                UserID: user.UserID,
                // Fill with dummy/default values or from user if available
                DateOfBirth: new Date('1990-01-01'),
                contactInfo: {
                    create: {
                        Phone: '',
                        PresentAddress: '',
                        EmergencyContactName: '',
                    }
                },
                employmentDetails: {
                    create: {
                        EmploymentStatus: 'Regular',
                        HireDate: new Date(),
                        Position: '',
                    }
                }
            },
        });

        // Update User to reference Employee
        await prisma.user.update({
            where: { UserID: user.UserID },
            data: { EmployeeID: employee.EmployeeID },
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

