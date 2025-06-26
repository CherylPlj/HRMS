-- CreateTable
CREATE TABLE "trainings" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "conductedBy" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proficiencyLevel" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("EmployeeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("EmployeeID") ON DELETE CASCADE ON UPDATE CASCADE; 