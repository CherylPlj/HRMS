-- AlterTable
ALTER TABLE "ClassSection" ADD COLUMN "adviserFacultyId" INTEGER;
ALTER TABLE "ClassSection" ADD COLUMN "homeroomTeacherId" INTEGER;
ALTER TABLE "ClassSection" ADD COLUMN "sectionHeadId" INTEGER;

-- AddForeignKey
ALTER TABLE "ClassSection" ADD CONSTRAINT "ClassSection_adviserFacultyId_fkey" FOREIGN KEY ("adviserFacultyId") REFERENCES "Faculty"("FacultyID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassSection" ADD CONSTRAINT "ClassSection_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "Faculty"("FacultyID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassSection" ADD CONSTRAINT "ClassSection_sectionHeadId_fkey" FOREIGN KEY ("sectionHeadId") REFERENCES "Faculty"("FacultyID") ON DELETE SET NULL ON UPDATE CASCADE;
