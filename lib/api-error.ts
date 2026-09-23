import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, fallback = 'Internal server error') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return jsonError('A record with these values already exists', 409);
    }
    if (error.code === 'P2025') {
      return jsonError('Record not found', 404);
    }
    if (error.code === 'P2003') {
      return jsonError('This record is still referenced and cannot be changed', 409);
    }
  }

  console.error(fallback, error);
  return jsonError(fallback, 500);
}
