import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { hashWithSHA256 } from '../src/lib/hash';
import { randomUUID } from 'crypto';

async function createDefaultDepartments() {
    const departments = [
        { name: 'Math' },
        { name: 'English' },
        { name: 'Science' },
        { name: 'AP' },
        { name: 'Filipino' },
        { name: 'ESP' },
        { name: 'MAPEH' },
    ];

    for (const dept of departments) {
        const { data: existingDept, error: deptError } = await supabaseAdmin
            .from('Department')
            .select('DepartmentID')
            .eq('DepartmentName', dept.name)
            .single();

        if (deptError && deptError.code === 'PGRST116') {
            // Department doesn't exist, create it
            const { error: createDeptError } = await supabaseAdmin
                .from('Department')
                .insert({ DepartmentName: dept.name });

            if (createDeptError) {
                console.error(`Failed to create department ${dept.name}:`, createDeptError);
            } else {
                console.log(`✅ Created department: ${dept.name}`);
            }
        } else if (deptError) {
            console.error(`Failed to check department ${dept.name}:`, deptError);
        } else {
            console.log(`✅ Department already exists: ${dept.name}`);
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
        const { data: existingDoc, error: docError } = await supabaseAdmin
            .from('DocumentType')
            .select('DocumentTypeID')
            .eq('DocumentTypeName', doc.name)
            .single();

        if (docError && docError.code === 'PGRST116') {
            // Document type doesn't exist, create it
            const { error: createDocError } = await supabaseAdmin
                .from('DocumentType')
                .insert({ DocumentTypeName: doc.name, AllowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'] });

            if (createDocError) {
                console.error(`Failed to create document type ${doc.name}:`, createDocError);
            } else {
                console.log(`✅ Created document type: ${doc.name}`);
            }
        } else if (docError) {
            console.error(`Failed to check document type ${doc.name}:`, docError);
        } else {
            console.log(`✅ Document type already exists: ${doc.name}`);
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
        emergencyContact?: string;
    } | null;
}) {
    const { saltHash } = hashWithSHA256(plainPassword);

    // First, ensure the role exists
    const { data: existingRole, error: roleError } = await supabaseAdmin
        .from('Role')
        .select('id')
        .eq('name', roleName)
        .single();

    let roleId: number;

    if (roleError && roleError.code === 'PGRST116') {
        // Role doesn't exist, create it
        const { data: newRole, error: createRoleError } = await supabaseAdmin
            .from('Role')
            .insert({ name: roleName })
            .select('id')
            .single();

        if (createRoleError) {
            throw new Error(`Failed to create role ${roleName}: ${createRoleError.message}`);
        }
        roleId = newRole.id;
    } else if (roleError) {
        throw new Error(`Failed to check role ${roleName}: ${roleError.message}`);
    } else {
        roleId = existingRole.id;
    }

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabaseAdmin
        .from('User')
        .select('UserID')
        .eq('Email', email)
        .single();

    if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create new user
        const userId = `2025-${randomUUID().split('-')[2]}-${randomUUID().split('-')[3]}`;
        
        const { data: newUser, error: createUserError } = await supabaseAdmin
            .from('User')
            .insert({
                UserID: userId,
                FirstName: firstName,
                LastName: lastName,
                Email: email,
                PasswordHash: saltHash,
                Status: 'Active',
                DateCreated: new Date().toISOString(),
                isDeleted: false
            })
            .select('UserID')
            .single();

        if (createUserError) {
            throw new Error(`Failed to create user ${email}: ${createUserError.message}`);
        }

        // Create user role relationship
        const { error: userRoleError } = await supabaseAdmin
            .from('UserRole')
            .insert({
                userId: newUser.UserID,
                roleId: roleId
            });

        if (userRoleError) {
            throw new Error(`Failed to assign role to user ${email}: ${userRoleError.message}`);
        }

        // If this is a faculty user and faculty data is provided, create faculty record
        if (roleName === 'Faculty' && facultyData) {
            const { data: department, error: deptError } = await supabaseAdmin
                .from('Department')
                .select('DepartmentID')
                .eq('DepartmentName', facultyData.departmentName)
                .single();

            if (deptError) {
                throw new Error(`Department '${facultyData.departmentName}' not found: ${deptError.message}`);
            }

            const facultyId = parseInt(randomUUID().split('-')[0], 16) % 1000000; // Generate a unique FacultyID

            const { error: facultyError } = await supabaseAdmin
                .from('Faculty')
                .insert({
                    FacultyID: facultyId,
                    UserID: newUser.UserID,
                    DateOfBirth: facultyData.dateOfBirth.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
                    Phone: facultyData.phone,
                    Address: facultyData.address,
                    Position: facultyData.position,
                    DepartmentID: department.DepartmentID,
                    EmergencyContact: facultyData.emergencyContact,
                    HireDate: new Date().toISOString().split('T')[0], // Default hire date to today
                    EmploymentStatus: 'Regular',
                    EmployeeType: 'Regular',
                });

            if (facultyError) {
                throw new Error(`Failed to create faculty record for ${email}: ${facultyError.message}`);
            }
        }

        return newUser;
    } else if (userError) {
        throw new Error(`Failed to check user ${email}: ${userError.message}`);
    } else {
        // User exists, update it
        const { data: updatedUser, error: updateUserError } = await supabaseAdmin
            .from('User')
            .update({
                FirstName: firstName,
                LastName: lastName,
                PasswordHash: saltHash,
                Status: 'Active',
                DateModified: new Date().toISOString(),
                isDeleted: false
            })
            .eq('UserID', existingUser.UserID)
            .select('UserID')
            .single();

        if (updateUserError) {
            throw new Error(`Failed to update user ${email}: ${updateUserError.message}`);
        }

        // Update user role relationship (delete existing and create new)
        await supabaseAdmin
            .from('UserRole')
            .delete()
            .eq('userId', existingUser.UserID);

        const { error: userRoleError } = await supabaseAdmin
            .from('UserRole')
            .insert({
                userId: existingUser.UserID,
                roleId: roleId
            });

        if (userRoleError) {
            throw new Error(`Failed to update role for user ${email}: ${userRoleError.message}`);
        }

        // If this is a faculty user and faculty data is provided, update faculty record
        if (roleName === 'Faculty' && facultyData) {
            const { data: department, error: deptError } = await supabaseAdmin
                .from('Department')
                .select('DepartmentID')
                .eq('DepartmentName', facultyData.departmentName)
                .single();

            if (deptError) {
                throw new Error(`Department '${facultyData.departmentName}' not found: ${deptError.message}`);
            }

            // Check if faculty record exists
            const { data: existingFaculty, error: facultyCheckError } = await supabaseAdmin
                .from('Faculty')
                .select('FacultyID')
                .eq('UserID', existingUser.UserID)
                .single();

            if (facultyCheckError && facultyCheckError.code === 'PGRST116') {
                // Faculty record doesn't exist, create it
                const facultyId = parseInt(randomUUID().split('-')[0], 16) % 1000000;
                const { error: facultyError } = await supabaseAdmin
                    .from('Faculty')
                    .insert({
                        FacultyID: facultyId,
                        UserID: existingUser.UserID,
                        DateOfBirth: facultyData.dateOfBirth.toISOString().split('T')[0],
                        Phone: facultyData.phone,
                        Address: facultyData.address,
                        Position: facultyData.position,
                        DepartmentID: department.DepartmentID,
                        EmergencyContact: facultyData.emergencyContact,
                        HireDate: new Date().toISOString().split('T')[0],
                        EmploymentStatus: 'Regular',
                        EmployeeType: 'Regular',
                    });

                if (facultyError) {
                    throw new Error(`Failed to create faculty record for ${email}: ${facultyError.message}`);
                }
            } else if (facultyCheckError) {
                throw new Error(`Failed to check faculty record for ${email}: ${facultyCheckError.message}`);
            } else {
                // Faculty record exists, update it
                const { error: facultyError } = await supabaseAdmin
                    .from('Faculty')
                    .update({
                        DateOfBirth: facultyData.dateOfBirth.toISOString().split('T')[0],
                        Phone: facultyData.phone,
                        Address: facultyData.address,
                        Position: facultyData.position,
                        DepartmentID: department.DepartmentID,
                        EmergencyContact: facultyData.emergencyContact,
                    })
                    .eq('UserID', existingUser.UserID);

                if (facultyError) {
                    throw new Error(`Failed to update faculty record for ${email}: ${facultyError.message}`);
                }
            }
        }

        return updatedUser;
    }
}

async function main() {
    console.log('Starting Supabase seeding...');

    // Create default departments first
    await createDefaultDepartments();
    await createDefaultDocumentTypes();
    console.log('Default document types created/verified');

    const users = [
        {
            email: 'admin@admin.com',
            plainPassword: 'SJSFI@dmin1',
            firstName: 'Admin',
            lastName: 'User',
            roleName: 'Admin',
        },
        {
            email: 'faculty@faculty.com',
            plainPassword: 'SJSFIF@culty1',
            firstName: 'Faculty',
            lastName: 'User',
            roleName: 'Faculty',
            facultyData: {
                departmentName: 'Math',
                position: 'Assistant Professor',
                dateOfBirth: new Date('1990-01-15'),
                phone: '+63 912 345 6789',
                address: '123 Faculty Street, Manila, Philippines',
                emergencyContact: '+63 998 765 4321',
            },
        },
        {
            email: 'faculty2@faculty.com',
            plainPassword: 'SJSFIF@culty2',
            firstName: 'Jane',
            lastName: 'Smith',
            roleName: 'Faculty',
            facultyData: {
                departmentName: 'English',
                position: 'Associate Professor',
                dateOfBirth: new Date('1985-06-20'),
                phone: '+63 923 456 7890',
                address: '456 Teacher Avenue, Quezon City, Philippines',
                emergencyContact: '+63 987 654 3210',
            },
        },
        {
            email: 'faculty3@faculty.com',
            plainPassword: 'SJSFIF@culty3',
            firstName: 'Michael',
            lastName: 'Johnson',
            roleName: 'Faculty',
            facultyData: {
                departmentName: 'Science',
                position: 'Professor',
                dateOfBirth: new Date('1980-12-10'),
                phone: '+63 934 567 8901',
                address: '789 Business Road, Makati, Philippines',
                emergencyContact: '+63 976 543 2109',
            },
        },
        {
            email: 'registrar@registrar.com',
            plainPassword: 'Registrar@SJSFI',
            firstName: 'Registrar',
            lastName: 'User',
            roleName: 'Registrar',
        },
        {
            email: 'cashier@cashier.com',
            plainPassword: 'Cashier@SJSFI',
            firstName: 'Cashier',
            lastName: 'User',
            roleName: 'Cashier',
        },
        {
            email: 'student@student.com',
            plainPassword: 'Student@SJSFI',
            firstName: 'Student',
            lastName: 'User',
            roleName: 'Student',
        },
    ];

    for (const user of users) {
        try {
            const createdUser = await createUserWithRole(user);
            console.log(`✅ Seeded user: ${user.email} (ID: ${createdUser.UserID}) with role: ${user.roleName}`);
            if (user.facultyData) {
                console.log(`  📚 Faculty record created for department: ${user.facultyData.departmentName}`);
            }
        } catch (error) {
            console.error(`❌ Failed to seed user ${user.email}:`, error);
        }
    }

    console.log('Supabase seeding completed!');
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    }); 