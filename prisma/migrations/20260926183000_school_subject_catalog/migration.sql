-- Subjects belong to a school so they can be defined without a subject group.
ALTER TABLE "Subject" ADD COLUMN "schoolId" TEXT;

UPDATE "Subject" AS s
SET "schoolId" = sub."schoolId"
FROM (
  SELECT sg.id AS "subjectGroupId", c."schoolId"
  FROM "SubjectGroup" sg
  JOIN "ClassGroup" cg ON cg.id = sg."classGroupId"
  JOIN "Campus" c ON c.id = cg."campusId"
) AS sub
WHERE s."subjectGroupId" = sub."subjectGroupId"
  AND s."schoolId" IS NULL;

UPDATE "Subject"
SET "schoolId" = (SELECT id FROM "School" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "schoolId" IS NULL
  AND EXISTS (SELECT 1 FROM "School");

ALTER TABLE "Subject" ALTER COLUMN "schoolId" SET NOT NULL;

ALTER TABLE "Subject" ALTER COLUMN "subjectGroupId" DROP NOT NULL;

ALTER TABLE "Subject" DROP CONSTRAINT "Subject_subjectGroupId_fkey";

ALTER TABLE "Subject"
  ADD CONSTRAINT "Subject_subjectGroupId_fkey"
  FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Subject"
  ADD CONSTRAINT "Subject_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");
