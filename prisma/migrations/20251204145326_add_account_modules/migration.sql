-- CreateEnum
CREATE TYPE "AccountHead" AS ENUM ('ASSETS', 'LIABILITIES');

-- AlterTable
ALTER TABLE "FeeHead" ADD COLUMN     "accountSubHeadId" TEXT;

-- CreateTable
CREATE TABLE "AccountSubHead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "head" "AccountHead" NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSubHead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubHead_schoolId_name_key" ON "AccountSubHead"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "FeeHead" ADD CONSTRAINT "FeeHead_accountSubHeadId_fkey" FOREIGN KEY ("accountSubHeadId") REFERENCES "AccountSubHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
