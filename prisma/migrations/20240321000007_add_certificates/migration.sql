-- CreateTable
CREATE TABLE "certificates" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "description" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("EmployeeID") ON DELETE CASCADE ON UPDATE CASCADE; 