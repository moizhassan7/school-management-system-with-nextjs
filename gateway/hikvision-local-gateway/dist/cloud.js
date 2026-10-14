export class CloudClient {
    config;
    constructor(config) {
        this.config = config;
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.secret}`,
            'x-gateway-key-id': this.config.keyId,
            'x-gateway-timestamp': new Date().toISOString(),
        };
    }
    async heartbeat(payload) {
        return this.post('/api/biometric/gateways/heartbeat', payload);
    }
    async commands() {
        const res = await fetch(`${this.config.erpBaseUrl}/api/biometric/gateways/commands`, {
            headers: this.headers(),
        });
        if (!res.ok)
            throw new Error(`Command fetch failed: ${res.status}`);
        return res.json();
    }
    async commandResult(id, payload) {
        return this.post(`/api/biometric/gateways/commands/${id}/result`, payload);
    }
    async pushEvents(batchId, events) {
        return this.post('/api/biometric/gateways/events/batch', { batchId, events });
    }
    async post(path, payload) {
        const res = await fetch(`${this.config.erpBaseUrl}${path}`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok)
            throw new Error(body.error || `${path} failed: ${res.status}`);
        return body;
    }
}
