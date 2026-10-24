CREATE TYPE "DiaryStatus" AS ENUM ('PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

CREATE TABLE "Diary" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "diaryDate" DATE NOT NULL,
  "dueDate" DATE,
  "status" "DiaryStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "rejectionReason" TEXT,
  "attachmentStoredName" TEXT,
  "attachmentName" TEXT,
  "attachmentMimeType" TEXT,
  "attachmentSize" INTEGER,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "notificationId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Diary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Diary_notificationId_key" ON "Diary"("notificationId");
CREATE INDEX "Diary_schoolId_status_createdAt_idx" ON "Diary"("schoolId", "status", "createdAt");
CREATE INDEX "Diary_classId_status_diaryDate_idx" ON "Diary"("classId", "status", "diaryDate");
CREATE INDEX "Diary_createdById_status_idx" ON "Diary"("createdById", "status");
CREATE INDEX "Diary_subjectId_idx" ON "Diary"("subjectId");

ALTER TABLE "Diary" ADD CONSTRAINT "Diary_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diary" ADD CONSTRAINT "Diary_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diary" ADD CONSTRAINT "Diary_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diary" ADD CONSTRAINT "Diary_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diary" ADD CONSTRAINT "Diary_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Diary" ADD CONSTRAINT "Diary_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "module", "action") VALUES
  ('perm_diaries_view', 'DIARIES', 'VIEW'),
  ('perm_diaries_create', 'DIARIES', 'CREATE'),
  ('perm_diaries_edit', 'DIARIES', 'EDIT'),
  ('perm_diaries_delete', 'DIARIES', 'DELETE'),
  ('perm_diaries_approve', 'DIARIES', 'APPROVE')
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId")
SELECT 'rp_diaries_admin_' || LOWER(permission."action"::TEXT), 'ADMIN'::"Role", permission."id"
FROM "Permission" AS permission
WHERE permission."module" = 'DIARIES'
ON CONFLICT ("role", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId")
SELECT 'rp_diaries_teacher_' || LOWER(permission."action"::TEXT), 'TEACHER'::"Role", permission."id"
FROM "Permission" AS permission
WHERE permission."module" = 'DIARIES'
  AND permission."action" IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
ON CONFLICT ("role", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId")
SELECT 'rp_diaries_student_view', 'STUDENT'::"Role", permission."id"
FROM "Permission" AS permission
WHERE permission."module" = 'DIARIES' AND permission."action" = 'VIEW'
ON CONFLICT ("role", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId")
SELECT 'rp_diaries_parent_view', 'PARENT'::"Role", permission."id"
FROM "Permission" AS permission
WHERE permission."module" = 'DIARIES' AND permission."action" = 'VIEW'
ON CONFLICT ("role", "permissionId") DO NOTHING;
