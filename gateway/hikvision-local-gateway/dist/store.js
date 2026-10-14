import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
function emptyStore() {
    return { eventQueue: [], cursors: {} };
}
export class GatewayStore {
    path;
    constructor(path) {
        this.path = path;
        mkdirSync(dirname(path), { recursive: true });
        this.save(this.load());
    }
    enqueueEvent(id, payload) {
        const store = this.load();
        if (!store.eventQueue.some((item) => item.id === id)) {
            store.eventQueue.push({ id, payload, attempts: 0 });
            this.save(store);
        }
    }
    nextEvents(limit = 100) {
        return this.load().eventQueue.slice(0, limit);
    }
    acknowledgeEvents(ids) {
        if (!ids.length)
            return;
        const wanted = new Set(ids);
        const store = this.load();
        store.eventQueue = store.eventQueue.filter((item) => !wanted.has(item.id));
        this.save(store);
    }
    failEvents(ids, error) {
        if (!ids.length)
            return;
        const wanted = new Set(ids);
        const store = this.load();
        store.eventQueue = store.eventQueue.map((item) => wanted.has(item.id)
            ? { ...item, attempts: item.attempts + 1, lastError: error }
            : item);
        this.save(store);
    }
    load() {
        try {
            return JSON.parse(readFileSync(this.path, 'utf8'));
        }
        catch {
            return emptyStore();
        }
    }
    save(store) {
        const tmp = `${this.path}.tmp`;
        writeFileSync(tmp, JSON.stringify(store, null, 2));
        renameSync(tmp, this.path);
    }
}
