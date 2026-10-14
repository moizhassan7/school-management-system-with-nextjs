import type { GatewayConfig } from './config.js';

export class CloudClient {
  constructor(private readonly config: GatewayConfig) {}

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.secret}`,
      'x-gateway-key-id': this.config.keyId,
      'x-gateway-timestamp': new Date().toISOString(),
    };
  }

  async heartbeat(payload: unknown) {
    return this.post('/api/biometric/gateways/heartbeat', payload);
  }

  async commands() {
    const res = await fetch(`${this.config.erpBaseUrl}/api/biometric/gateways/commands`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Command fetch failed: ${res.status}`);
    return res.json() as Promise<{ commands: Array<{ id: string; type: string; deviceId?: string; payload?: unknown }> }>;
  }

  async commandResult(id: string, payload: unknown) {
    return this.post(`/api/biometric/gateways/commands/${id}/result`, payload);
  }

  async pushEvents(batchId: string, events: unknown[]) {
    return this.post('/api/biometric/gateways/events/batch', { batchId, events });
  }

  private async post(path: string, payload: unknown) {
    const res = await fetch(`${this.config.erpBaseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `${path} failed: ${res.status}`);
    return body;
  }
}
