import { HikvisionUnsupportedError } from './errors';

export function assertFingerprintApiSupported(capabilities: { supportsUserRecord?: boolean; endpoints?: unknown[] }) {
  if (!capabilities.supportsUserRecord) {
    throw new HikvisionUnsupportedError('fingerprint enrollment APIs');
  }
}
