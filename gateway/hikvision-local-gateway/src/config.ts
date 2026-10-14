export type GatewayConfig = {
  erpBaseUrl: string;
  keyId: string;
  secret: string;
  dbPath: string;
  pollIntervalMs: number;
};

export function loadConfig(): GatewayConfig {
  const erpBaseUrl = process.env.ERP_BASE_URL;
  const keyId = process.env.GATEWAY_KEY_ID;
  const secret = process.env.GATEWAY_SECRET;
  if (!erpBaseUrl || !keyId || !secret) {
    throw new Error('ERP_BASE_URL, GATEWAY_KEY_ID, and GATEWAY_SECRET are required');
  }
  return {
    erpBaseUrl: erpBaseUrl.replace(/\/$/, ''),
    keyId,
    secret,
    dbPath: process.env.GATEWAY_DB_PATH || './gateway.sqlite',
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 60000),
  };
}
