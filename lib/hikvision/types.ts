export type HikvisionProtocol = 'http' | 'https';

export type HikvisionClientOptions = {
  host: string;
  port?: number;
  protocol?: HikvisionProtocol;
  username: string;
  password: string;
  timeoutMs?: number;
};

export type HikvisionResponse<T = unknown> = {
  ok: boolean;
  status: number;
  contentType: string;
  data: T;
  raw: string;
};

export type HikvisionDeviceInfo = {
  deviceName?: string;
  deviceID?: string;
  model?: string;
  serialNumber?: string;
  macAddress?: string;
  firmwareVersion?: string;
  firmwareReleasedDate?: string;
  [key: string]: unknown;
};

export type CapabilityProbeResult = {
  endpoint: string;
  method: 'GET' | 'POST';
  supported: boolean;
  status?: number;
  contentType?: string;
  error?: string;
};

export type DeviceCapabilities = {
  probedAt: string;
  endpoints: CapabilityProbeResult[];
  supportsDeviceInfo: boolean;
  supportsUserCount: boolean;
  supportsUserSearch: boolean;
  supportsUserRecord: boolean;
  supportsHistoricalEvents: boolean;
  supportsAlertStream: boolean;
};

export type AccessEvent = {
  sourceEventKey: string;
  employeeNo?: string;
  deviceSerial?: string;
  eventTimestamp: string;
  eventType?: string;
  verificationMethod?: string;
  direction?: string;
  rawPayload: unknown;
};
