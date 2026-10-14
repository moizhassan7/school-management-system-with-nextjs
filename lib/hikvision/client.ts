import { buildDigestAuthorization, parseDigestChallenge } from './authentication';
import { HikvisionAuthError, HikvisionError } from './errors';
import type { HikvisionClientOptions, HikvisionResponse } from './types';

function safeParseBody(raw: string, contentType: string): unknown {
  if (!raw) return null;
  if (contentType.includes('json')) {
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class HikvisionClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: HikvisionClientOptions) {
    const protocol = options.protocol || 'http';
    const port = options.port || (protocol === 'https' ? 443 : 80);
    this.baseUrl = `${protocol}://${options.host}:${port}`;
    this.timeoutMs = options.timeoutMs || 8000;
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<HikvisionResponse<T>> {
    const uri = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${uri}`;
    const headers: HeadersInit = {
      Accept: 'application/json, application/xml, text/xml, */*',
    };
    let payload: string | undefined;
    if (body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = typeof body === 'string' ? 'application/xml' : 'application/json';
    }

    const first = await this.fetchWithTimeout(url, { method, headers, body: payload });
    if (first.status !== 401) {
      return this.toResponse<T>(first);
    }

    const challenge = parseDigestChallenge(first.headers.get('www-authenticate'));
    if (!challenge) {
      throw new HikvisionAuthError(first.status);
    }

    const authorization = buildDigestAuthorization({
      username: this.options.username,
      password: this.options.password,
      method,
      uri,
      challenge,
    });

    const second = await this.fetchWithTimeout(url, {
      method,
      headers: { ...headers, Authorization: authorization },
      body: payload,
    });
    if (second.status === 401 || second.status === 403) {
      throw new HikvisionAuthError(second.status);
    }
    return this.toResponse<T>(second);
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HikvisionError('Hikvision request timed out', 0, 'HIKVISION_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async toResponse<T>(response: Response): Promise<HikvisionResponse<T>> {
    const raw = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let data: unknown = raw;
    try {
      data = safeParseBody(raw, contentType);
    } catch (error) {
      throw new HikvisionError('Hikvision response was not valid JSON', response.status, 'HIKVISION_BAD_RESPONSE');
    }
    return {
      ok: response.ok,
      status: response.status,
      contentType,
      data: data as T,
      raw,
    };
  }
}
