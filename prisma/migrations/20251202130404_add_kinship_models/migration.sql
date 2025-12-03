-- CreateEnum
CREATE TYPE "KinshipType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- CreateTable
CREATE TABLE "ParentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occupation" TEXT,
    "cnic" TEXT,
    "officeAddress" TEXT,

    CONSTRAINT "ParentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kinship" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "relationship" "KinshipType" NOT NULL DEFAULT 'FATHER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kinship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentRecord_userId_key" ON "ParentRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Kinship_studentId_parentId_key" ON "Kinship"("studentId", "parentId");

-- AddForeignKey
ALTER TABLE "ParentRecord" ADD CONSTRAINT "ParentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kinship" ADD CONSTRAINT "Kinship_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kinship" ADD CONSTRAINT "Kinship_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
