-- Prevent class/section deletes from cascading into enrollment history.
ALTER TABLE "StudentRecord" DROP CONSTRAINT IF EXISTS "StudentRecord_classId_fkey";
ALTER TABLE "StudentRecord" DROP CONSTRAINT IF EXISTS "StudentRecord_sectionId_fkey";
ALTER TABLE "AcademicYearStudentRecord" DROP CONSTRAINT IF EXISTS "AcademicYearStudentRecord_classId_fkey";
ALTER TABLE "AcademicYearStudentRecord" DROP CONSTRAINT IF EXISTS "AcademicYearStudentRecord_sectionId_fkey";

ALTER TABLE "StudentRecord"
  ADD CONSTRAINT "StudentRecord_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentRecord"
  ADD CONSTRAINT "StudentRecord_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademicYearStudentRecord"
  ADD CONSTRAINT "AcademicYearStudentRecord_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademicYearStudentRecord"
  ADD CONSTRAINT "AcademicYearStudentRecord_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Denormalized school scope for admission numbers.
ALTER TABLE "StudentRecord" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

UPDATE "StudentRecord" sr
SET "schoolId" = u."schoolId"
FROM "User" u
WHERE sr."userId" = u."id" AND sr."schoolId" IS NULL;

ALTER TABLE "StudentRecord" DROP CONSTRAINT IF EXISTS "StudentRecord_schoolId_fkey";
ALTER TABLE "StudentRecord"
  ADD CONSTRAINT "StudentRecord_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "StudentRecord_classId_idx" ON "StudentRecord"("classId");
CREATE INDEX IF NOT EXISTS "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_studentId_month_year_idx" ON "Invoice"("studentId", "month", "year");
CREATE INDEX IF NOT EXISTS "Challan_studentId_idx" ON "Challan"("studentId");

-- One active invoice per student per period. Cancelled rows are excluded so a challan can be reissued.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Invoice"
    WHERE "status" <> 'CANCELLED'
    GROUP BY "studentId", "month", "year"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_active_period_key"
      ON "Invoice" ("studentId", "month", "year")
      WHERE "status" <> 'CANCELLED';
  ELSE
    RAISE NOTICE 'Skipped Invoice_active_period_key because duplicate active invoices exist';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "StudentRecord"
    WHERE "admissionNumber" IS NOT NULL AND "schoolId" IS NOT NULL
    GROUP BY "schoolId", "admissionNumber"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "StudentRecord_schoolId_admissionNumber_key"
      ON "StudentRecord" ("schoolId", "admissionNumber");
  ELSE
    RAISE NOTICE 'Skipped admission number unique index because duplicates exist';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "SubjectAssignment"
    GROUP BY "teacherId", "subjectId", "classId", "sectionId"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "SubjectAssignment_teacherId_subjectId_classId_sectionId_key"
      ON "SubjectAssignment" ("teacherId", "subjectId", "classId", "sectionId");
  ELSE
    RAISE NOTICE 'Skipped subject assignment unique index because duplicates exist';
  END IF;
END $$;
