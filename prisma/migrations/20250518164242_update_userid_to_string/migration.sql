/*
  Warnings:

  - The `status` column on the `Attendance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `UserID` on table `ActivityLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AIChat" DROP CONSTRAINT "AIChat_UserID_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_UserID_fkey";

-- DropForeignKey
ALTER TABLE "Cashier" DROP CONSTRAINT "Cashier_UserID_fkey";

-- DropForeignKey
ALTER TABLE "Faculty" DROP CONSTRAINT "Faculty_UserID_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_UserID_fkey";

-- DropForeignKey
ALTER TABLE "Registrar" DROP CONSTRAINT "Registrar_UserID_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_GeneratedBy_fkey";

-- AlterTable
ALTER TABLE "AIChat" ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ActivityLog" ALTER COLUMN "UserID" SET NOT NULL,
ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NOT_RECORDED';

-- AlterTable
ALTER TABLE "Cashier" ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Faculty" ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Registrar" ALTER COLUMN "UserID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "GeneratedBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "UserID" DROP DEFAULT,
ALTER COLUMN "UserID" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("UserID");
DROP SEQUENCE "User_UserID_seq";

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashier" ADD CONSTRAINT "Cashier_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registrar" ADD CONSTRAINT "Registrar_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChat" ADD CONSTRAINT "AIChat_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_GeneratedBy_fkey" FOREIGN KEY ("GeneratedBy") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
