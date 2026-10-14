import { HikvisionUnsupportedError } from './errors';

export function assertFaceApiSupported(capabilities: { supportsUserRecord?: boolean; endpoints?: unknown[] }) {
  if (!capabilities.supportsUserRecord) {
    throw new HikvisionUnsupportedError('face enrollment APIs');
  }
}
