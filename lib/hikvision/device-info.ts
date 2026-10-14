import type { HikvisionClient } from './client';
import { HikvisionUnsupportedError } from './errors';
import type { HikvisionDeviceInfo } from './types';

export async function getDeviceInfo(client: HikvisionClient): Promise<HikvisionDeviceInfo> {
  const response = await client.request<HikvisionDeviceInfo>('GET', '/ISAPI/System/deviceInfo');
  if (!response.ok) {
    throw new HikvisionUnsupportedError('/ISAPI/System/deviceInfo', response.status);
  }
  return response.data;
}
