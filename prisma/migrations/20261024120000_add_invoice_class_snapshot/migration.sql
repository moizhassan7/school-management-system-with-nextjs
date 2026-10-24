-- Keep the billed class on the invoice so class-wide cancellation remains
-- accurate even after a student transfers to a different class.
ALTER TABLE "Invoice" ADD COLUMN "classId" TEXT;

UPDATE "Invoice" AS invoice
SET "classId" = student_record."classId"
FROM "StudentRecord" AS student_record
WHERE invoice."studentId" = student_record."userId";

CREATE INDEX "Invoice_schoolId_classId_month_year_idx"
ON "Invoice"("schoolId", "classId", "month", "year");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
