export class HikvisionError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code = 'HIKVISION_ERROR'
  ) {
    super(message);
    this.name = 'HikvisionError';
  }
}

export class HikvisionUnsupportedError extends HikvisionError {
  constructor(endpoint: string, status?: number) {
    super(`Hikvision endpoint is unsupported or unavailable: ${endpoint}`, status, 'HIKVISION_UNSUPPORTED');
    this.name = 'HikvisionUnsupportedError';
  }
}

export class HikvisionAuthError extends HikvisionError {
  constructor(status?: number) {
    super('Hikvision authentication failed', status, 'HIKVISION_AUTH_FAILED');
    this.name = 'HikvisionAuthError';
  }
}
