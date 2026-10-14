import { createHash, randomBytes } from 'node:crypto';

function md5(value: string) {
  return createHash('md5').update(value).digest('hex');
}

export function parseDigest(header: string | null) {
  if (!header?.toLowerCase().startsWith('digest ')) return null;
  const out: Record<string, string> = {};
  const re = /(\w+)=("([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(header.slice(7)))) out[match[1]] = match[3] ?? match[4] ?? '';
  return out;
}

export function digestAuth(input: {
  username: string;
  password: string;
  method: string;
  uri: string;
  challenge: Record<string, string>;
}) {
  const qop = input.challenge.qop?.split(',').map((part) => part.trim()).find((part) => part === 'auth');
  const nc = '00000001';
  const cnonce = randomBytes(8).toString('hex');
  const ha1 = md5(`${input.username}:${input.challenge.realm || ''}:${input.password}`);
  const ha2 = md5(`${input.method}:${input.uri}`);
  const response = qop
    ? md5(`${ha1}:${input.challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${input.challenge.nonce}:${ha2}`);
  const fields: Record<string, string> = {
    username: input.username,
    realm: input.challenge.realm || '',
    nonce: input.challenge.nonce || '',
    uri: input.uri,
    response,
    algorithm: input.challenge.algorithm || 'MD5',
  };
  if (input.challenge.opaque) fields.opaque = input.challenge.opaque;
  if (qop) Object.assign(fields, { qop, nc, cnonce });
  return `Digest ${Object.entries(fields).map(([key, value]) => `${key}="${value}"`).join(', ')}`;
}
