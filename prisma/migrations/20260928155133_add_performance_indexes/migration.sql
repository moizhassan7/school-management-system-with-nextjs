-- DropIndex
DROP INDEX "Subject_schoolId_idx";

-- CreateIndex
CREATE INDEX "Attendance_schoolId_date_idx" ON "Attendance"("schoolId", "date");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_idx" ON "Attendance"("schoolId");

-- CreateIndex
CREATE INDEX "Challan_schoolId_status_idx" ON "Challan"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Challan_schoolId_status_updatedAt_idx" ON "Challan"("schoolId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ExamResult_examId_classId_idx" ON "ExamResult"("examId", "classId");

-- CreateIndex
CREATE INDEX "Kinship_parentId_idx" ON "Kinship"("parentId");

-- CreateIndex
CREATE INDEX "StudentRecord_sectionId_idx" ON "StudentRecord"("sectionId");

-- CreateIndex
CREATE INDEX "StudentRecord_schoolId_idx" ON "StudentRecord"("schoolId");

-- CreateIndex
CREATE INDEX "User_schoolId_role_deletedAt_idx" ON "User"("schoolId", "role", "deletedAt");
