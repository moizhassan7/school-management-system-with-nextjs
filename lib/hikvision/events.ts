import { createHash } from 'crypto';
import type { HikvisionClient } from './client';
import { HikvisionUnsupportedError } from './errors';
import type { AccessEvent } from './types';

function stableKey(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function normalizeAccessEvent(payload: any, deviceSerial?: string): AccessEvent {
  const timestamp =
    payload?.time ||
    payload?.dateTime ||
    payload?.eventTime ||
    payload?.AcsEventInfo?.time ||
    new Date().toISOString();
  const employeeNo =
    payload?.employeeNoString ||
    payload?.employeeNo ||
    payload?.cardNo ||
    payload?.AcsEventInfo?.employeeNoString;
  const eventId = payload?.majorMinor || payload?.eventId || payload?.serialNo || payload?.AcsEventInfo?.serialNo;

  return {
    sourceEventKey: String(eventId || `${employeeNo || 'unknown'}:${timestamp}:${stableKey(payload).slice(0, 16)}`),
    employeeNo: employeeNo ? String(employeeNo) : undefined,
    deviceSerial,
    eventTimestamp: new Date(timestamp).toISOString(),
    eventType: payload?.eventType || payload?.major || payload?.AcsEventInfo?.major,
    verificationMethod: payload?.currentVerifyMode || payload?.verifyMode || payload?.AcsEventInfo?.currentVerifyMode,
    direction: payload?.attendanceStatus || payload?.inAndOut || payload?.AcsEventInfo?.attendanceStatus,
    rawPayload: payload,
  };
}

export async function searchAccessEvents(client: HikvisionClient, eventCondition: unknown) {
  const response = await client.request('POST', '/ISAPI/AccessControl/AcsEvent?format=json', eventCondition);
  if (!response.ok) throw new HikvisionUnsupportedError('/ISAPI/AccessControl/AcsEvent?format=json', response.status);
  return response.data;
}
