/*
  Warnings:

  - You are about to drop the column `head` on the `AccountSubHead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccountSubHead" DROP COLUMN "head",
ADD COLUMN     "headId" TEXT;

-- DropEnum
DROP TYPE "AccountHead";

-- CreateTable
CREATE TABLE "AccountHead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountHead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountHead_schoolId_name_key" ON "AccountHead"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "AccountSubHead" ADD CONSTRAINT "AccountSubHead_headId_fkey" FOREIGN KEY ("headId") REFERENCES "AccountHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
