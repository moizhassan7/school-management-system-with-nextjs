import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { assertSameSchool, requirePermission, stripSecrets } from '@/lib/authz';
import { hashPassword } from '@/lib/password';
import {
  permissionKey,
  resolveCampusIds,
  resolveUserPermissions,
} from '@/lib/permissions';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional().nullable().or(z.literal('')),
  password: z.string().min(6).optional(),
  phone: z.string().optional().or(z.literal('')),
  schoolId: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  suspended: z.boolean().optional(),
  locked: z.boolean().optional(),
  campusIds: z.array(z.string()).optional(),
  permissionOverrides: z
    .array(
      z.object({
        module: z.string(),
        action: z.string(),
        granted: z.boolean(),
      })
    )
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, error } = await requirePermission('USERS', 'VIEW');
    if (error || !session) return error;

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        campusAccess: {
          include: { campus: { select: { id: true, name: true, schoolId: true } } },
        },
        userPermissions: {
          include: { permission: true },
        },
        studentRecord: {
          include: {
            academicYearRecords: {
              include: { academicYear: true, myClass: true, section: true },
            },
            myClass: true,
            section: true,
            feeStructure: {
              include: {
                items: { include: { feeHead: true }, orderBy: { createdAt: 'asc' } },
              },
            },
            parents: {
              include: {
                parentRecord: {
                  include: {
                    user: {
                      select: { id: true, name: true, phone: true, email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const denied = assertSameSchool(session, user.schoolId);
    if (denied) return denied;

    const [effectivePermissions, campusIds] = await Promise.all([
      resolveUserPermissions(prisma, user.id, user.role),
      resolveCampusIds(prisma, user.id),
    ]);

    return NextResponse.json({
      ...user,
      passwordHash: undefined,
      effectivePermissions,
      campusIds,
      permissionOverrides: user.userPermissions.map((up) => ({
        module: up.permission.module,
        action: up.permission.action,
        granted: up.granted,
      })),
    });
  } catch (error) {
    console.error('GET User Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, error } = await requirePermission('USERS', 'EDIT');
    if (error) return error;

    const { userId } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const denied = assertSameSchool(session, existing.schoolId);
    if (denied) return denied;

    if (data.schoolId && data.schoolId !== existing.schoolId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot move user to another school' }, { status: 403 });
    }

    if (data.role === Role.SUPER_ADMIN && session!.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot assign SUPER_ADMIN' }, { status: 403 });
    }

    const passwordHash = data.password ? await hashPassword(data.password) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          email: data.email,
          username:
            data.username === undefined
              ? undefined
              : data.username
                ? data.username
                : null,
          passwordHash,
          phone: data.phone === undefined ? undefined : data.phone || null,
          schoolId: data.schoolId,
          role: data.role,
          suspended: data.suspended,
          locked: data.locked,
        },
      });

      if (data.campusIds) {
        await tx.campusAccess.deleteMany({ where: { userId } });
        if (data.campusIds.length) {
          await tx.campusAccess.createMany({
            data: data.campusIds.map((campusId) => ({ userId, campusId })),
            skipDuplicates: true,
          });
        }
      }

      if (data.permissionOverrides) {
        await tx.userPermission.deleteMany({ where: { userId } });
        const perms = await tx.permission.findMany();
        const byKey = new Map(
          perms.map((p) => [permissionKey(p.module, p.action), p.id])
        );
        for (const o of data.permissionOverrides) {
          const permissionId = byKey.get(permissionKey(o.module, o.action));
          if (!permissionId) continue;
          await tx.userPermission.create({
            data: { userId, permissionId, granted: o.granted },
          });
        }
      }

      return user;
    });

    return NextResponse.json(stripSecrets(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, error } = await requirePermission('USERS', 'DELETE');
    if (error || !session) return error;

    const { userId } = await params;
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const denied = assertSameSchool(session, existing.schoolId);
    if (denied) return denied;
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), suspended: true },
    });
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
