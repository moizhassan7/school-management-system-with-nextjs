/*
  Warnings:

  - You are about to drop the column `remarks` on the `ExamResult` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('TERM', 'CLASS_TEST');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "type" "ExamType" NOT NULL DEFAULT 'TERM';

-- AlterTable
ALTER TABLE "ExamResult" DROP COLUMN "remarks",
ADD COLUMN     "status" TEXT;

-- CreateTable
CREATE TABLE "QuestionDefinition" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "examConfigId" TEXT NOT NULL,

    CONSTRAINT "QuestionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionMark" (
    "id" TEXT NOT NULL,
    "obtainedMarks" DOUBLE PRECISION NOT NULL,
    "examResultId" TEXT NOT NULL,
    "questionDefId" TEXT NOT NULL,

    CONSTRAINT "QuestionMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionMark_examResultId_questionDefId_key" ON "QuestionMark"("examResultId", "questionDefId");

-- AddForeignKey
ALTER TABLE "QuestionDefinition" ADD CONSTRAINT "QuestionDefinition_examConfigId_fkey" FOREIGN KEY ("examConfigId") REFERENCES "ExamConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionMark" ADD CONSTRAINT "QuestionMark_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "ExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionMark" ADD CONSTRAINT "QuestionMark_questionDefId_fkey" FOREIGN KEY ("questionDefId") REFERENCES "QuestionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
