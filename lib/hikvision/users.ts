import type { HikvisionClient } from './client';
import { HikvisionUnsupportedError } from './errors';

export async function getUserCount(client: HikvisionClient) {
  const response = await client.request('GET', '/ISAPI/AccessControl/UserInfo/Count?format=json');
  if (!response.ok) throw new HikvisionUnsupportedError('/ISAPI/AccessControl/UserInfo/Count?format=json', response.status);
  return response.data;
}

export async function searchUsers(client: HikvisionClient, searchCondition: unknown) {
  const response = await client.request('POST', '/ISAPI/AccessControl/UserInfo/Search?format=json', searchCondition);
  if (!response.ok) throw new HikvisionUnsupportedError('/ISAPI/AccessControl/UserInfo/Search?format=json', response.status);
  return response.data;
}

export async function upsertUserRecord(client: HikvisionClient, userRecordPayload: unknown) {
  const response = await client.request('POST', '/ISAPI/AccessControl/UserInfo/Record?format=json', userRecordPayload);
  if (!response.ok) throw new HikvisionUnsupportedError('/ISAPI/AccessControl/UserInfo/Record?format=json', response.status);
  return response.data;
}
