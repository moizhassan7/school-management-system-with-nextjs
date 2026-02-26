-- CreateTable
CREATE TABLE "StudentFeeStructure" (
    "id" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "classId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeStructureItem" (
    "id" TEXT NOT NULL,
    "studentFeeStructureId" TEXT NOT NULL,
    "feeHeadId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeStructureItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeStructure_studentRecordId_key" ON "StudentFeeStructure"("studentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeStructureItem_studentFeeStructureId_feeHeadId_key" ON "StudentFeeStructureItem"("studentFeeStructureId", "feeHeadId");

-- AddForeignKey
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructureItem" ADD CONSTRAINT "StudentFeeStructureItem_studentFeeStructureId_fkey" FOREIGN KEY ("studentFeeStructureId") REFERENCES "StudentFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructureItem" ADD CONSTRAINT "StudentFeeStructureItem_feeHeadId_fkey" FOREIGN KEY ("feeHeadId") REFERENCES "FeeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
