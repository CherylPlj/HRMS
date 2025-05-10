-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Faculty', 'Cashier', 'Registrar');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('Hired', 'Resigned');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('Submitted', 'Pending');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('Full_Time', 'Part_Time', 'Probationary');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateTable
CREATE TABLE "User" (
    "UserID" SERIAL NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Photo" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "Role" "Role" NOT NULL,
    "Status" "Status" NOT NULL DEFAULT 'Active',
    "DateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DateModified" TIMESTAMP(3),
    "LastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "FacultyID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "DateOfBirth" TIMESTAMP(3) NOT NULL,
    "Phone" TEXT,
    "Address" TEXT,
    "EmploymentStatus" "EmploymentStatus" NOT NULL,
    "HireDate" TIMESTAMP(3) NOT NULL,
    "ResignationDate" TIMESTAMP(3),
    "Position" TEXT NOT NULL,
    "DepartmentID" INTEGER NOT NULL,
    "ContractID" INTEGER,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("FacultyID")
);

-- CreateTable
CREATE TABLE "Cashier" (
    "CashierID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "WorkSchedule" TEXT,
    "ShiftStart" TIMESTAMP(3),
    "ShiftEnd" TIMESTAMP(3),

    CONSTRAINT "Cashier_pkey" PRIMARY KEY ("CashierID")
);

-- CreateTable
CREATE TABLE "Registrar" (
    "RegistrarID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "Schedule" TEXT,

    CONSTRAINT "Registrar_pkey" PRIMARY KEY ("RegistrarID")
);

-- CreateTable
CREATE TABLE "Department" (
    "DepartmentID" SERIAL NOT NULL,
    "DepartmentName" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("DepartmentID")
);

-- CreateTable
CREATE TABLE "Document" (
    "DocumentID" SERIAL NOT NULL,
    "FacultyID" INTEGER NOT NULL,
    "DocumentTypeID" INTEGER NOT NULL,
    "UploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "SubmissionStatus" "SubmissionStatus" NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("DocumentID")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "DocumentTypeID" SERIAL NOT NULL,
    "DocumentTypeName" TEXT NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("DocumentTypeID")
);

-- CreateTable
CREATE TABLE "Contract" (
    "ContractID" SERIAL NOT NULL,
    "StartDate" TIMESTAMP(3) NOT NULL,
    "EndDate" TIMESTAMP(3) NOT NULL,
    "ContractType" "ContractType" NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("ContractID")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "ScheduleID" SERIAL NOT NULL,
    "FacultyID" INTEGER NOT NULL,
    "DayOfWeek" "DayOfWeek" NOT NULL,
    "StartTime" TIMESTAMP(3) NOT NULL,
    "EndTime" TIMESTAMP(3) NOT NULL,
    "Subject" TEXT NOT NULL,
    "ClassSection" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("ScheduleID")
);

-- CreateTable
CREATE TABLE "AIChat" (
    "ChatID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "Question" TEXT NOT NULL,
    "Answer" TEXT NOT NULL,
    "Status" TEXT NOT NULL,

    CONSTRAINT "AIChat_pkey" PRIMARY KEY ("ChatID")
);

-- CreateTable
CREATE TABLE "Report" (
    "ReportID" SERIAL NOT NULL,
    "GeneratedBy" INTEGER NOT NULL,
    "ReportType" TEXT NOT NULL,
    "GeneratedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Details" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("ReportID")
);

-- CreateTable
CREATE TABLE "Notification" (
    "NotificationID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "Message" TEXT NOT NULL,
    "DateSent" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Type" TEXT NOT NULL,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("NotificationID")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "LogID" SERIAL NOT NULL,
    "UserID" INTEGER,
    "ActionType" TEXT NOT NULL,
    "EntityAffected" TEXT NOT NULL,
    "RecordID" INTEGER,
    "ActionDetails" TEXT NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IPAddress" TEXT NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("LogID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_UserID_key" ON "Faculty"("UserID");

-- CreateIndex
CREATE UNIQUE INDEX "Cashier_UserID_key" ON "Cashier"("UserID");

-- CreateIndex
CREATE UNIQUE INDEX "Registrar_UserID_key" ON "Registrar"("UserID");

-- CreateIndex
CREATE UNIQUE INDEX "Department_DepartmentName_key" ON "Department"("DepartmentName");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_DocumentTypeName_key" ON "DocumentType"("DocumentTypeName");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_DepartmentID_fkey" FOREIGN KEY ("DepartmentID") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_ContractID_fkey" FOREIGN KEY ("ContractID") REFERENCES "Contract"("ContractID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashier" ADD CONSTRAINT "Cashier_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registrar" ADD CONSTRAINT "Registrar_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_FacultyID_fkey" FOREIGN KEY ("FacultyID") REFERENCES "Faculty"("FacultyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_DocumentTypeID_fkey" FOREIGN KEY ("DocumentTypeID") REFERENCES "DocumentType"("DocumentTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_FacultyID_fkey" FOREIGN KEY ("FacultyID") REFERENCES "Faculty"("FacultyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChat" ADD CONSTRAINT "AIChat_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_GeneratedBy_fkey" FOREIGN KEY ("GeneratedBy") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;
