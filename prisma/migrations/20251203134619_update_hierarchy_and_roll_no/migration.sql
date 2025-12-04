/*
  Warnings:

  - You are about to drop the column `subjectGroupId` on the `Class` table. All the data in the column will be lost.
  - Added the required column `classGroupId` to the `Class` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_subjectGroupId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "subjectGroupId",
ADD COLUMN     "classGroupId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StudentRecord" ADD COLUMN     "rollNumber" TEXT,
ADD COLUMN     "subjectGroupId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT';

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRecord" ADD CONSTRAINT "StudentRecord_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
