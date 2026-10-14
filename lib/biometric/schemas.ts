import { z } from 'zod';

export const gatewayCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(3).regex(/^[a-zA-Z0-9_-]+$/),
  campusId: z.string().optional().nullable(),
  label: z.string().optional(),
});

export const deviceCreateSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1).default('DS-K1T342MFX'),
  gatewayId: z.string().min(1),
  campusId: z.string().min(1),
  lanIp: z.string().min(7),
  port: z.coerce.number().int().min(1).max(65535).default(80),
  username: z.string().min(1),
  password: z.string().min(1),
  protocol: z.enum(['HTTP', 'HTTPS']).default('HTTP'),
  location: z.string().optional().nullable(),
  attendanceRole: z.string().min(1).default('ENTRY'),
  syncIntervalSeconds: z.coerce.number().int().min(15).max(86400).default(60),
});

export const deviceUpdateSchema = deviceCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const heartbeatSchema = z.object({
  version: z.string().optional(),
  hostInfo: z.record(z.string(), z.unknown()).optional(),
  devices: z
    .array(
      z.object({
        deviceId: z.string(),
        online: z.boolean(),
        latencyMs: z.number().int().nonnegative().optional(),
        message: z.string().optional(),
        deviceInfo: z.record(z.string(), z.unknown()).optional(),
        capabilities: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
});

export const gatewayEventSchema = z.object({
  deviceId: z.string(),
  idempotencyKey: z.string().min(1),
  gatewayEventId: z.string().optional(),
  deviceSerial: z.string().optional(),
  employeeNo: z.string().optional(),
  eventTimestamp: z.string().datetime(),
  verificationMethod: z
    .enum(['UNKNOWN', 'FACE', 'FINGERPRINT', 'CARD', 'PASSWORD', 'QR', 'MULTI'])
    .default('UNKNOWN'),
  eventType: z.string().optional(),
  direction: z.enum(['UNKNOWN', 'IN', 'OUT']).default('UNKNOWN'),
  rawPayload: z.unknown(),
});

export const eventBatchSchema = z.object({
  batchId: z.string().min(1),
  events: z.array(gatewayEventSchema).min(1).max(1000),
});

export const commandResultSchema = z.object({
  status: z.enum(['RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']),
  result: z.unknown().optional(),
  error: z.string().optional(),
});
