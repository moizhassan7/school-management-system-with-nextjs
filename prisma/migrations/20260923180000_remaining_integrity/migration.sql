-- Repair rows that blocked the previous unique indexes, then create those indexes
-- even when this database previously skipped them.

-- Keep the active invoice with the most money recorded; cancel the rest for that period.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "studentId", month, year
           ORDER BY "paidAmount" DESC, "createdAt" ASC, id ASC
         ) AS rn
  FROM "Invoice"
  WHERE status <> 'CANCELLED'
)
UPDATE "Invoice" i
SET status = 'CANCELLED', "updatedAt" = NOW()
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

-- Keep the oldest admission number; suffix later duplicates so they stay unique per school.
WITH ranked AS (
  SELECT id, "admissionNumber",
         ROW_NUMBER() OVER (
           PARTITION BY "schoolId", "admissionNumber"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "StudentRecord"
  WHERE "admissionNumber" IS NOT NULL AND "schoolId" IS NOT NULL
)
UPDATE "StudentRecord" s
SET "admissionNumber" = r."admissionNumber" || '-' || r.rn::text,
    "updatedAt" = NOW()
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- Drop exact duplicate teaching assignments, keeping one row.
DELETE FROM "SubjectAssignment" a
USING "SubjectAssignment" b
WHERE a.id > b.id
  AND a."teacherId" = b."teacherId"
  AND a."subjectId" = b."subjectId"
  AND a."classId" = b."classId"
  AND a."sectionId" IS NOT DISTINCT FROM b."sectionId";

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_active_period_key"
  ON "Invoice" ("studentId", month, year)
  WHERE status <> 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS "StudentRecord_schoolId_admissionNumber_key"
  ON "StudentRecord" ("schoolId", "admissionNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectAssignment_teacherId_subjectId_classId_sectionId_key"
  ON "SubjectAssignment" ("teacherId", "subjectId", "classId", "sectionId");

-- Shared login lockout. Survives multiple Node processes.
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoginAttempt_key_key" ON "LoginAttempt"("key");

-- Refuse the migration if money or exam rows point at a missing school.
DO $$
DECLARE
  tbl text;
  missing bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'AccountHead','AccountSubHead','StudentFeeStructure','Challan','ChallanPayment',
    'FeeStructure','Discount','Invoice','Payment','Exam'
  ]
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I t WHERE NOT EXISTS (SELECT 1 FROM "School" s WHERE s.id = t."schoolId")',
      tbl
    ) INTO missing;
    IF missing > 0 THEN
      RAISE EXCEPTION '% has % rows with an unknown schoolId', tbl, missing;
    END IF;
  END LOOP;
END $$;

ALTER TABLE "AccountHead" DROP CONSTRAINT IF EXISTS "AccountHead_schoolId_fkey";
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountSubHead" DROP CONSTRAINT IF EXISTS "AccountSubHead_schoolId_fkey";
ALTER TABLE "AccountSubHead" ADD CONSTRAINT "AccountSubHead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentFeeStructure" DROP CONSTRAINT IF EXISTS "StudentFeeStructure_schoolId_fkey";
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Challan" DROP CONSTRAINT IF EXISTS "Challan_schoolId_fkey";
ALTER TABLE "Challan" ADD CONSTRAINT "Challan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChallanPayment" DROP CONSTRAINT IF EXISTS "ChallanPayment_schoolId_fkey";
ALTER TABLE "ChallanPayment" ADD CONSTRAINT "ChallanPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeStructure" DROP CONSTRAINT IF EXISTS "FeeStructure_schoolId_fkey";
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_schoolId_fkey";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_schoolId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_schoolId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_schoolId_fkey";
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
