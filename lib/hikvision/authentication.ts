import { createHash, randomBytes } from 'crypto';

type DigestChallenge = Record<string, string>;

function md5(value: string) {
  return createHash('md5').update(value).digest('hex');
}

export function parseDigestChallenge(header: string | null): DigestChallenge | null {
  if (!header?.toLowerCase().startsWith('digest ')) return null;
  const challenge: DigestChallenge = {};
  const input = header.slice(7);
  const re = /(\w+)=("([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    challenge[match[1]] = match[3] ?? match[4] ?? '';
  }
  return challenge;
}

export function buildDigestAuthorization(input: {
  username: string;
  password: string;
  method: string;
  uri: string;
  challenge: DigestChallenge;
}) {
  const { username, password, method, uri, challenge } = input;
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop?.split(',').map((part) => part.trim()).find((part) => part === 'auth');
  const nc = '00000001';
  const cnonce = randomBytes(8).toString('hex');
  const algorithm = (challenge.algorithm || 'MD5').toUpperCase();

  if (algorithm !== 'MD5') {
    throw new Error(`Unsupported digest algorithm: ${algorithm}`);
  }

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method.toUpperCase()}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  const fields: Record<string, string> = {
    username,
    realm,
    nonce,
    uri,
    response,
    algorithm,
  };
  if (challenge.opaque) fields.opaque = challenge.opaque;
  if (qop) {
    fields.qop = qop;
    fields.nc = nc;
    fields.cnonce = cnonce;
  }

  return `Digest ${Object.entries(fields)
    .map(([key, value]) => `${key}="${value}"`)
    .join(', ')}`;
}
