import { createHash } from 'node:crypto';
import { digestAuth, parseDigest } from './digest.js';

export type GatewayDeviceConfig = {
  id: string;
  lanIp: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS';
  username: string;
  password?: string;
};

export async function testDevice(device: GatewayDeviceConfig) {
  const deviceInfo = await request(device, 'GET', '/ISAPI/System/deviceInfo');
  const capabilities = await probe(device);
  return {
    online: deviceInfo.ok,
    status: deviceInfo.status,
    deviceInfo: deviceInfo.data,
    capabilities,
  };
}

async function request(device: GatewayDeviceConfig, method: string, uri: string, body?: unknown) {
  const protocol = device.protocol.toLowerCase();
  const url = `${protocol}://${device.lanIp}:${device.port}${uri}`;
  const headers: Record<string, string> = { Accept: 'application/json, application/xml, text/xml, */*' };
  const payload = body ? JSON.stringify(body) : undefined;
  if (payload) headers['Content-Type'] = 'application/json';
  const first = await fetch(url, { method, headers, body: payload, signal: AbortSignal.timeout(8000) });
  let response = first;
  const challenge = parseDigest(first.headers.get('www-authenticate'));
  if (first.status === 401 && challenge && device.password) {
    response = await fetch(url, {
      method,
      headers: {
        ...headers,
        Authorization: digestAuth({
          username: device.username,
          password: device.password,
          method,
          uri,
          challenge,
        }),
      },
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
  }
  const raw = await response.text();
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {}
  return { ok: response.ok, status: response.status, data, raw };
}

async function probe(device: GatewayDeviceConfig) {
  const endpoints = [
    { method: 'GET', endpoint: '/ISAPI/System/deviceInfo' },
    { method: 'GET', endpoint: '/ISAPI/AccessControl/UserInfo/Count?format=json' },
    {
      method: 'POST',
      endpoint: '/ISAPI/AccessControl/UserInfo/Search?format=json',
      body: { UserInfoSearchCond: { searchID: 'gateway-probe', maxResults: 1, searchResultPosition: 0 } },
    },
    {
      method: 'POST',
      endpoint: '/ISAPI/AccessControl/AcsEvent?format=json',
      body: { AcsEventCond: { searchID: 'gateway-probe', maxResults: 1, searchResultPosition: 0 } },
    },
    { method: 'GET', endpoint: '/ISAPI/Event/notification/alertStream' },
  ];
  const results = [];
  for (const item of endpoints) {
    try {
      const res = await request(device, item.method, item.endpoint, item.body);
      results.push({ endpoint: item.endpoint, method: item.method, status: res.status, supported: res.ok });
    } catch (error) {
      results.push({ endpoint: item.endpoint, method: item.method, supported: false, error: error instanceof Error ? error.message : 'Probe failed' });
    }
  }
  return {
    probedAt: new Date().toISOString(),
    endpoints: results,
    supportsDeviceInfo: results[0]?.supported === true,
    supportsUserCount: results[1]?.supported === true,
    supportsUserSearch: results[2]?.supported === true,
    supportsHistoricalEvents: results[3]?.supported === true,
    supportsAlertStream: results[4]?.supported === true,
  };
}

export function normalizeGatewayEvent(deviceId: string, raw: any) {
  const eventTimestamp = raw.eventTimestamp || raw.time || new Date().toISOString();
  const employeeNo = raw.employeeNo || raw.employeeNoString;
  const idempotencyKey =
    raw.idempotencyKey ||
    createHash('sha256').update(`${deviceId}:${employeeNo || 'unknown'}:${eventTimestamp}:${JSON.stringify(raw)}`).digest('hex');
  return {
    deviceId,
    idempotencyKey,
    employeeNo,
    eventTimestamp: new Date(eventTimestamp).toISOString(),
    verificationMethod: raw.verificationMethod || 'UNKNOWN',
    eventType: raw.eventType,
    direction: raw.direction || 'UNKNOWN',
    rawPayload: raw,
  };
}
