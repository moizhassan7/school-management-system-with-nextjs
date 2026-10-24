CREATE TYPE "NotificationAudience" AS ENUM (
  'EVERYONE',
  'STUDENTS_AND_PARENTS',
  'CLASS',
  'STUDENT'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" "NotificationAudience" NOT NULL,
  "attachmentStoredName" TEXT,
  "attachmentName" TEXT,
  "attachmentMimeType" TEXT,
  "attachmentSize" INTEGER,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT,
  "targetStudentId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRecipient" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_schoolId_createdAt_idx" ON "Notification"("schoolId", "createdAt");
CREATE INDEX "Notification_classId_idx" ON "Notification"("classId");
CREATE INDEX "Notification_targetStudentId_idx" ON "Notification"("targetStudentId");
CREATE INDEX "Notification_createdById_idx" ON "Notification"("createdById");
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");
CREATE INDEX "NotificationRecipient_userId_readAt_createdAt_idx" ON "NotificationRecipient"("userId", "readAt", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetStudentId_fkey"
  FOREIGN KEY ("targetStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "module", "action") VALUES
  ('perm_notifications_view', 'NOTIFICATIONS', 'VIEW'),
  ('perm_notifications_create', 'NOTIFICATIONS', 'CREATE'),
  ('perm_notifications_edit', 'NOTIFICATIONS', 'EDIT'),
  ('perm_notifications_delete', 'NOTIFICATIONS', 'DELETE'),
  ('perm_notifications_approve', 'NOTIFICATIONS', 'APPROVE')
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId")
SELECT
  'rp_admin_' || LOWER(permission."action"::TEXT),
  'ADMIN'::"Role",
  permission."id"
FROM "Permission" AS permission
WHERE permission."module" = 'NOTIFICATIONS'
ON CONFLICT ("role", "permissionId") DO NOTHING;
