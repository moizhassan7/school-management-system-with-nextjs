export function isPrivateIpv4(value: string) {
  const parts = value.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

export function assertPrivateLanIp(value: string) {
  if (!isPrivateIpv4(value)) {
    throw Object.assign(new Error('Device LAN IP must be a private IPv4 address reachable by the local gateway'), {
      status: 400,
    });
  }
}
