import type { HikvisionClient } from './client';
import type { CapabilityProbeResult, DeviceCapabilities } from './types';

const CANDIDATE_ENDPOINTS: { endpoint: string; method: 'GET' | 'POST'; body?: unknown }[] = [
  { method: 'GET', endpoint: '/ISAPI/System/deviceInfo' },
  { method: 'GET', endpoint: '/ISAPI/AccessControl/UserInfo/Count?format=json' },
  {
    method: 'POST',
    endpoint: '/ISAPI/AccessControl/UserInfo/Search?format=json',
    body: { UserInfoSearchCond: { searchID: 'capability-probe', maxResults: 1, searchResultPosition: 0 } },
  },
  {
    method: 'POST',
    endpoint: '/ISAPI/AccessControl/UserInfo/Record?format=json',
    body: { capabilityProbe: true },
  },
  {
    method: 'POST',
    endpoint: '/ISAPI/AccessControl/AcsEvent?format=json',
    body: { AcsEventCond: { searchID: 'capability-probe', maxResults: 1, searchResultPosition: 0 } },
  },
  { method: 'GET', endpoint: '/ISAPI/Event/notification/alertStream' },
];

export async function probeCapabilities(client: HikvisionClient): Promise<DeviceCapabilities> {
  const endpoints: CapabilityProbeResult[] = [];
  for (const candidate of CANDIDATE_ENDPOINTS) {
    try {
      const response = await client.request(candidate.method, candidate.endpoint, candidate.body);
      endpoints.push({
        endpoint: candidate.endpoint,
        method: candidate.method,
        supported: response.status >= 200 && response.status < 500 && ![401, 403, 404, 405].includes(response.status),
        status: response.status,
        contentType: response.contentType,
      });
    } catch (error) {
      endpoints.push({
        endpoint: candidate.endpoint,
        method: candidate.method,
        supported: false,
        error: error instanceof Error ? error.message : 'Unknown probe failure',
      });
    }
  }

  const has = (endpoint: string) => endpoints.some((item) => item.endpoint === endpoint && item.supported);
  return {
    probedAt: new Date().toISOString(),
    endpoints,
    supportsDeviceInfo: has('/ISAPI/System/deviceInfo'),
    supportsUserCount: has('/ISAPI/AccessControl/UserInfo/Count?format=json'),
    supportsUserSearch: has('/ISAPI/AccessControl/UserInfo/Search?format=json'),
    supportsUserRecord: has('/ISAPI/AccessControl/UserInfo/Record?format=json'),
    supportsHistoricalEvents: has('/ISAPI/AccessControl/AcsEvent?format=json'),
    supportsAlertStream: has('/ISAPI/Event/notification/alertStream'),
  };
}
