import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type QueuedEvent = {
  id: string;
  payload: unknown;
  attempts: number;
  lastError?: string;
};

type StoreShape = {
  eventQueue: QueuedEvent[];
  cursors: Record<string, { cursorValue?: string; updatedAt: string }>;
};

function emptyStore(): StoreShape {
  return { eventQueue: [], cursors: {} };
}

export class GatewayStore {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.save(this.load());
  }

  enqueueEvent(id: string, payload: unknown) {
    const store = this.load();
    if (!store.eventQueue.some((item) => item.id === id)) {
      store.eventQueue.push({ id, payload, attempts: 0 });
      this.save(store);
    }
  }

  nextEvents(limit = 100): QueuedEvent[] {
    return this.load().eventQueue.slice(0, limit);
  }

  acknowledgeEvents(ids: string[]) {
    if (!ids.length) return;
    const wanted = new Set(ids);
    const store = this.load();
    store.eventQueue = store.eventQueue.filter((item) => !wanted.has(item.id));
    this.save(store);
  }

  failEvents(ids: string[], error: string) {
    if (!ids.length) return;
    const wanted = new Set(ids);
    const store = this.load();
    store.eventQueue = store.eventQueue.map((item) =>
      wanted.has(item.id)
        ? { ...item, attempts: item.attempts + 1, lastError: error }
        : item
    );
    this.save(store);
  }

  private load(): StoreShape {
    try {
      return JSON.parse(readFileSync(this.path, 'utf8')) as StoreShape;
    } catch {
      return emptyStore();
    }
  }

  private save(store: StoreShape) {
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(store, null, 2));
    renameSync(tmp, this.path);
  }
}
