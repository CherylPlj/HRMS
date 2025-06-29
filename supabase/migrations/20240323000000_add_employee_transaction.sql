-- Create a function to handle employee creation in a transaction
CREATE OR REPLACE FUNCTION create_employee_transaction(
  p_employee_data jsonb,
  p_employment_data jsonb DEFAULT NULL,
  p_contact_data jsonb DEFAULT NULL,
  p_government_data jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id text;
  v_result jsonb;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert into Employee table
    INSERT INTO "Employee" (
      "EmployeeID", "UserID", "LastName", "FirstName", "MiddleName", "ExtensionName",
      "Sex", "Photo", "DateOfBirth", "PlaceOfBirth", "CivilStatus", "Nationality",
      "Religion", "BloodType", "DepartmentID", "ContractID", "createdAt", "updatedAt"
    )
    SELECT
      p_employee_data->>'EmployeeID',
      p_employee_data->>'UserID',
      p_employee_data->>'LastName',
      p_employee_data->>'FirstName',
      p_employee_data->>'MiddleName',
      p_employee_data->>'ExtensionName',
      p_employee_data->>'Sex',
      p_employee_data->>'Photo',
      (p_employee_data->>'DateOfBirth')::date,
      p_employee_data->>'PlaceOfBirth',
      p_employee_data->>'CivilStatus',
      p_employee_data->>'Nationality',
      p_employee_data->>'Religion',
      p_employee_data->>'BloodType',
      (p_employee_data->>'DepartmentID')::int,
      (p_employee_data->>'ContractID')::int,
      (p_employee_data->>'createdAt')::timestamp,
      (p_employee_data->>'updatedAt')::timestamp
    RETURNING "EmployeeID" INTO v_employee_id;

    -- Insert into EmploymentDetail if data provided
    IF p_employment_data IS NOT NULL THEN
      INSERT INTO "EmploymentDetail" (
        "employeeId", "EmploymentStatus", "HireDate", "ResignationDate",
        "Designation", "Position", "SalaryGrade", "createdAt", "updatedAt"
      )
      VALUES (
        v_employee_id,
        (p_employment_data->>'EmploymentStatus')::"EmploymentStatus",
        (p_employment_data->>'HireDate')::date,
        (p_employment_data->>'ResignationDate')::date,
        (p_employment_data->>'Designation')::"Designation",
        p_employment_data->>'Position',
        p_employment_data->>'SalaryGrade',
        (p_employment_data->>'createdAt')::timestamp,
        (p_employment_data->>'updatedAt')::timestamp
      );
    END IF;

    -- Insert into ContactInfo if data provided
    IF p_contact_data IS NOT NULL THEN
      INSERT INTO "ContactInfo" (
        "employeeId", "Email", "Phone", "PresentAddress", "PermanentAddress",
        "EmergencyContactName", "EmergencyContactNumber", "createdAt", "updatedAt"
      )
      VALUES (
        v_employee_id,
        p_contact_data->>'Email',
        p_contact_data->>'Phone',
        p_contact_data->>'PresentAddress',
        p_contact_data->>'PermanentAddress',
        p_contact_data->>'EmergencyContactName',
        p_contact_data->>'EmergencyContactNumber',
        (p_contact_data->>'createdAt')::timestamp,
        (p_contact_data->>'updatedAt')::timestamp
      );
    END IF;

    -- Insert into GovernmentID if data provided
    IF p_government_data IS NOT NULL THEN
      INSERT INTO "GovernmentID" (
        "employeeId", "SSSNumber", "TINNumber", "PhilHealthNumber", "PagIbigNumber",
        "GSISNumber", "PRCLicenseNumber", "PRCValidity", "createdAt", "updatedAt"
      )
      VALUES (
        v_employee_id,
        p_government_data->>'SSSNumber',
        p_government_data->>'TINNumber',
        p_government_data->>'PhilHealthNumber',
        p_government_data->>'PagIbigNumber',
        p_government_data->>'GSISNumber',
        p_government_data->>'PRCLicenseNumber',
        (p_government_data->>'PRCValidity')::date,
        (p_government_data->>'createdAt')::timestamp,
        (p_government_data->>'updatedAt')::timestamp
      );
    END IF;

    -- Get the created employee data
    SELECT jsonb_build_object(
      'EmployeeID', e."EmployeeID",
      'FirstName', e."FirstName",
      'LastName', e."LastName",
      'EmploymentDetail', ed,
      'ContactInfo', ci,
      'GovernmentID', gi
    )
    INTO v_result
    FROM "Employee" e
    LEFT JOIN "EmploymentDetail" ed ON ed."employeeId" = e."EmployeeID"
    LEFT JOIN "ContactInfo" ci ON ci."employeeId" = e."EmployeeID"
    LEFT JOIN "GovernmentID" gi ON gi."employeeId" = e."EmployeeID"
    WHERE e."EmployeeID" = v_employee_id;

    RETURN v_result;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Employee ID already exists';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create employee: %', SQLERRM;
  END;
END;
$$; 