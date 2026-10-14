-- CreateEnum
CREATE TYPE "BiometricProtocol" AS ENUM ('HTTP', 'HTTPS');
CREATE TYPE "BiometricGatewayStatus" AS ENUM ('PENDING', 'ONLINE', 'OFFLINE', 'DISABLED');
CREATE TYPE "BiometricDeviceStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE', 'DEGRADED', 'ARCHIVED');
CREATE TYPE "BiometricPersonType" AS ENUM ('STUDENT', 'STAFF');
CREATE TYPE "BiometricEnrollmentStatus" AS ENUM ('NOT_ENROLLED', 'USER_CREATED', 'AWAITING_PHYSICAL_ENROLLMENT', 'FACE_ENROLLED', 'FINGERPRINT_ENROLLED', 'FULLY_ENROLLED', 'ENROLLMENT_FAILED', 'UNSUPPORTED');
CREATE TYPE "BiometricEnrollmentModality" AS ENUM ('USER', 'FACE', 'FINGERPRINT', 'CARD');
CREATE TYPE "BiometricJobStatus" AS ENUM ('PENDING', 'DISPATCHED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "BiometricSyncJobType" AS ENUM ('TEST_CONNECTION', 'PROBE_CAPABILITIES', 'SYNC_ATTENDANCE', 'SYNC_USERS', 'ENROLL_USER', 'REMOVE_USER', 'BACKFILL_EVENTS');
CREATE TYPE "BiometricEventStatus" AS ENUM ('RAW', 'MATCHED', 'UNMATCHED', 'IGNORED', 'PROCESSED', 'FAILED');
CREATE TYPE "BiometricVerificationMethod" AS ENUM ('UNKNOWN', 'FACE', 'FINGERPRINT', 'CARD', 'PASSWORD', 'QR', 'MULTI');
CREATE TYPE "BiometricDirection" AS ENUM ('UNKNOWN', 'IN', 'OUT');

-- CreateTable
CREATE TABLE "BiometricGateway" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BiometricGatewayStatus" NOT NULL DEFAULT 'PENDING',
    "lastHeartbeatAt" TIMESTAMP(3),
    "version" TEXT,
    "hostInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricGateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricGatewayCredential" (
    "id" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    CONSTRAINT "BiometricGatewayCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "gatewayId" TEXT,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'DS-K1T342MFX',
    "serialNumber" TEXT,
    "lanIp" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 80,
    "protocol" "BiometricProtocol" NOT NULL DEFAULT 'HTTP',
    "username" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "location" TEXT,
    "attendanceRole" TEXT NOT NULL DEFAULT 'ENTRY',
    "syncIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "status" "BiometricDeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "firmwareVersion" TEXT,
    "capabilities" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricPersonMapping" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "personType" "BiometricPersonType" NOT NULL,
    "studentRecordId" TEXT,
    "staffRecordId" TEXT,
    "deviceEmployeeNo" TEXT NOT NULL,
    "deviceUserId" TEXT,
    "enrollmentStatus" "BiometricEnrollmentStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
    "faceStatus" "BiometricEnrollmentStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
    "fingerprintStatus" "BiometricEnrollmentStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
    "cardNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "latestScanAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricPersonMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricEnrollmentJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "mappingId" TEXT,
    "modality" "BiometricEnrollmentModality" NOT NULL,
    "status" "BiometricJobStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricEnrollmentJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricAttendanceEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "mappingId" TEXT,
    "sourceEventKey" TEXT NOT NULL,
    "gatewayEventId" TEXT,
    "deviceSerial" TEXT,
    "employeeNo" TEXT,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationMethod" "BiometricVerificationMethod" NOT NULL DEFAULT 'UNKNOWN',
    "eventType" TEXT,
    "direction" "BiometricDirection" NOT NULL DEFAULT 'UNKNOWN',
    "status" "BiometricEventStatus" NOT NULL DEFAULT 'RAW',
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricAttendanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricSyncCursor" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "cursorType" TEXT NOT NULL DEFAULT 'EVENTS',
    "cursorValue" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "lastEventKey" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricSyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricSyncJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gatewayId" TEXT,
    "deviceId" TEXT,
    "type" "BiometricSyncJobType" NOT NULL,
    "status" "BiometricJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "notBefore" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiometricSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricDeviceHealthLog" (
    "id" TEXT NOT NULL,
    "gatewayId" TEXT,
    "deviceId" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "message" TEXT,
    "details" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BiometricDeviceHealthLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BiometricAuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gatewayId" TEXT,
    "deviceId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BiometricAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BiometricGateway_code_key" ON "BiometricGateway"("code");
CREATE INDEX "BiometricGateway_schoolId_idx" ON "BiometricGateway"("schoolId");
CREATE INDEX "BiometricGateway_campusId_idx" ON "BiometricGateway"("campusId");
CREATE INDEX "BiometricGateway_status_idx" ON "BiometricGateway"("status");
CREATE UNIQUE INDEX "BiometricGatewayCredential_keyId_key" ON "BiometricGatewayCredential"("keyId");
CREATE INDEX "BiometricGatewayCredential_gatewayId_active_idx" ON "BiometricGatewayCredential"("gatewayId", "active");
CREATE UNIQUE INDEX "BiometricDevice_gatewayId_lanIp_port_key" ON "BiometricDevice"("gatewayId", "lanIp", "port");
CREATE UNIQUE INDEX "BiometricDevice_schoolId_serialNumber_key" ON "BiometricDevice"("schoolId", "serialNumber");
CREATE INDEX "BiometricDevice_schoolId_idx" ON "BiometricDevice"("schoolId");
CREATE INDEX "BiometricDevice_campusId_idx" ON "BiometricDevice"("campusId");
CREATE INDEX "BiometricDevice_gatewayId_idx" ON "BiometricDevice"("gatewayId");
CREATE INDEX "BiometricDevice_status_idx" ON "BiometricDevice"("status");
CREATE UNIQUE INDEX "BiometricPersonMapping_deviceId_deviceEmployeeNo_key" ON "BiometricPersonMapping"("deviceId", "deviceEmployeeNo");
CREATE UNIQUE INDEX "BiometricPersonMapping_deviceId_studentRecordId_key" ON "BiometricPersonMapping"("deviceId", "studentRecordId");
CREATE UNIQUE INDEX "BiometricPersonMapping_deviceId_staffRecordId_key" ON "BiometricPersonMapping"("deviceId", "staffRecordId");
CREATE INDEX "BiometricPersonMapping_schoolId_idx" ON "BiometricPersonMapping"("schoolId");
CREATE INDEX "BiometricPersonMapping_studentRecordId_idx" ON "BiometricPersonMapping"("studentRecordId");
CREATE INDEX "BiometricPersonMapping_staffRecordId_idx" ON "BiometricPersonMapping"("staffRecordId");
CREATE INDEX "BiometricPersonMapping_personType_idx" ON "BiometricPersonMapping"("personType");
CREATE INDEX "BiometricEnrollmentJob_schoolId_idx" ON "BiometricEnrollmentJob"("schoolId");
CREATE INDEX "BiometricEnrollmentJob_deviceId_status_idx" ON "BiometricEnrollmentJob"("deviceId", "status");
CREATE INDEX "BiometricEnrollmentJob_mappingId_idx" ON "BiometricEnrollmentJob"("mappingId");
CREATE UNIQUE INDEX "BiometricAttendanceEvent_deviceId_sourceEventKey_key" ON "BiometricAttendanceEvent"("deviceId", "sourceEventKey");
CREATE INDEX "BiometricAttendanceEvent_schoolId_eventTimestamp_idx" ON "BiometricAttendanceEvent"("schoolId", "eventTimestamp");
CREATE INDEX "BiometricAttendanceEvent_deviceId_eventTimestamp_idx" ON "BiometricAttendanceEvent"("deviceId", "eventTimestamp");
CREATE INDEX "BiometricAttendanceEvent_mappingId_idx" ON "BiometricAttendanceEvent"("mappingId");
CREATE INDEX "BiometricAttendanceEvent_status_idx" ON "BiometricAttendanceEvent"("status");
CREATE INDEX "BiometricAttendanceEvent_employeeNo_idx" ON "BiometricAttendanceEvent"("employeeNo");
CREATE UNIQUE INDEX "BiometricSyncCursor_deviceId_cursorType_key" ON "BiometricSyncCursor"("deviceId", "cursorType");
CREATE UNIQUE INDEX "BiometricSyncJob_idempotencyKey_key" ON "BiometricSyncJob"("idempotencyKey");
CREATE INDEX "BiometricSyncJob_schoolId_status_idx" ON "BiometricSyncJob"("schoolId", "status");
CREATE INDEX "BiometricSyncJob_gatewayId_status_createdAt_idx" ON "BiometricSyncJob"("gatewayId", "status", "createdAt");
CREATE INDEX "BiometricSyncJob_deviceId_status_idx" ON "BiometricSyncJob"("deviceId", "status");
CREATE INDEX "BiometricSyncJob_type_idx" ON "BiometricSyncJob"("type");
CREATE INDEX "BiometricDeviceHealthLog_gatewayId_recordedAt_idx" ON "BiometricDeviceHealthLog"("gatewayId", "recordedAt");
CREATE INDEX "BiometricDeviceHealthLog_deviceId_recordedAt_idx" ON "BiometricDeviceHealthLog"("deviceId", "recordedAt");
CREATE INDEX "BiometricAuditLog_schoolId_createdAt_idx" ON "BiometricAuditLog"("schoolId", "createdAt");
CREATE INDEX "BiometricAuditLog_deviceId_createdAt_idx" ON "BiometricAuditLog"("deviceId", "createdAt");
CREATE INDEX "BiometricAuditLog_gatewayId_createdAt_idx" ON "BiometricAuditLog"("gatewayId", "createdAt");
CREATE INDEX "BiometricAuditLog_actorId_idx" ON "BiometricAuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "BiometricGateway" ADD CONSTRAINT "BiometricGateway_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricGateway" ADD CONSTRAINT "BiometricGateway_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricGatewayCredential" ADD CONSTRAINT "BiometricGatewayCredential_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "BiometricGateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "BiometricGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricPersonMapping" ADD CONSTRAINT "BiometricPersonMapping_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricPersonMapping" ADD CONSTRAINT "BiometricPersonMapping_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricPersonMapping" ADD CONSTRAINT "BiometricPersonMapping_staffRecordId_fkey" FOREIGN KEY ("staffRecordId") REFERENCES "StaffRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricEnrollmentJob" ADD CONSTRAINT "BiometricEnrollmentJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricEnrollmentJob" ADD CONSTRAINT "BiometricEnrollmentJob_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "BiometricPersonMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricAttendanceEvent" ADD CONSTRAINT "BiometricAttendanceEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricAttendanceEvent" ADD CONSTRAINT "BiometricAttendanceEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricAttendanceEvent" ADD CONSTRAINT "BiometricAttendanceEvent_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "BiometricPersonMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricSyncCursor" ADD CONSTRAINT "BiometricSyncCursor_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BiometricSyncJob" ADD CONSTRAINT "BiometricSyncJob_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "BiometricGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricSyncJob" ADD CONSTRAINT "BiometricSyncJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricDeviceHealthLog" ADD CONSTRAINT "BiometricDeviceHealthLog_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "BiometricGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricDeviceHealthLog" ADD CONSTRAINT "BiometricDeviceHealthLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricAuditLog" ADD CONSTRAINT "BiometricAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiometricAuditLog" ADD CONSTRAINT "BiometricAuditLog_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "BiometricGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BiometricAuditLog" ADD CONSTRAINT "BiometricAuditLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
