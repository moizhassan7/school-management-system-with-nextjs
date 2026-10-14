import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export type AuthenticatedGateway = {
  id: string;
  schoolId: string;
  campusId: string | null;
  code: string;
};

export async function authenticateGateway(request: Request): Promise<AuthenticatedGateway> {
  const keyId = request.headers.get('x-gateway-key-id');
  const authorization = request.headers.get('authorization') || '';
  const timestamp = request.headers.get('x-gateway-timestamp');
  const secret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!keyId || !secret) {
    throw Object.assign(new Error('Gateway credentials are required'), { status: 401 });
  }

  if (timestamp) {
    const skewMs = Math.abs(Date.now() - Date.parse(timestamp));
    if (!Number.isFinite(skewMs) || skewMs > 5 * 60 * 1000) {
      throw Object.assign(new Error('Gateway request timestamp is outside the allowed window'), { status: 401 });
    }
  }

  const credential = await prisma.biometricGatewayCredential.findUnique({
    where: { keyId },
    include: { gateway: true },
  });
  if (!credential?.active || credential.expiresAt && credential.expiresAt < new Date()) {
    throw Object.assign(new Error('Gateway credential is inactive'), { status: 401 });
  }
  const ok = await bcrypt.compare(secret, credential.secretHash);
  if (!ok || !credential.gateway.isActive || credential.gateway.status === 'DISABLED') {
    throw Object.assign(new Error('Gateway authentication failed'), { status: 401 });
  }

  await prisma.biometricGatewayCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: credential.gateway.id,
    schoolId: credential.gateway.schoolId,
    campusId: credential.gateway.campusId,
    code: credential.gateway.code,
  };
}
