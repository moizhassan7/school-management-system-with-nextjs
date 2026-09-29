-- Indexes for paginated directory, class filters, and invoice lists
CREATE INDEX "StudentRecord_classId_sectionId_idx" ON "StudentRecord"("classId", "sectionId");

CREATE INDEX "User_schoolId_deletedAt_createdAt_idx" ON "User"("schoolId", "deletedAt", "createdAt");

CREATE INDEX "Invoice_schoolId_createdAt_idx" ON "Invoice"("schoolId", "createdAt");
