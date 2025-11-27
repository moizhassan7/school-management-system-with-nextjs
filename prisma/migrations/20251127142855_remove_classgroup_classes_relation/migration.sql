/*
  Warnings:

  - You are about to drop the column `classGroupId` on the `Class` table. All the data in the column will be lost.
  - Added the required column `subjectGroupId` to the `Class` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_classGroupId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "classGroupId",
ADD COLUMN     "subjectGroupId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
