import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error';
import { assertSameSchool, requireAuth, requirePermission, schoolScope } from '@/lib/authz';
import {
  deleteNotificationAttachment,
  saveNotificationAttachment,
  type StoredNotificationAttachment,
} from '@/lib/notification-attachments';
import {
  resolveNotificationRecipientIds,
  type NotificationAudienceKey,
} from '@/lib/notification-targeting';
import { pageMeta, parsePagination } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';

const notificationSchema = z
  .object({
    schoolId: z.string().min(1),
    title: z.string().trim().min(3).max(120),
    message: z.string().trim().min(1).max(5000),
    audience: z.enum(['EVERYONE', 'STUDENTS_AND_PARENTS', 'CLASS', 'STUDENT']),
    classId: z.string().trim().optional(),
    targetStudentId: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.audience === 'CLASS' && !data.classId) {
      ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Select a class' });
    }
    if (data.audience === 'STUDENT' && !data.targetStudentId) {
      ctx.addIssue({ code: 'custom', path: ['targetStudentId'], message: 'Select a student' });
    }
  });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const manage = searchParams.get('manage') === '1';
    const { page, pageSize } = parsePagination(searchParams, {
      defaultPageSize: 20,
      minPageSize: 1,
      maxPageSize: 100,
    });
    const q = searchParams.get('q')?.trim() || '';

    if (manage) {
      const { session, error } = await requirePermission('NOTIFICATIONS', 'VIEW');
      if (error || !session) return error;

      const requestedSchoolId = searchParams.get('schoolId')?.trim();
      const where: Prisma.NotificationWhereInput = {
        ...(session.user.role === 'SUPER_ADMIN'
          ? requestedSchoolId ? { schoolId: requestedSchoolId } : {}
          : schoolScope(session)),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { message: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [total, notifications] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            message: true,
            audience: true,
            attachmentName: true,
            attachmentSize: true,
            createdAt: true,
            createdBy: { select: { id: true, name: true } },
            school: { select: { id: true, name: true } },
            myClass: { select: { id: true, name: true } },
            targetStudent: { select: { id: true, name: true } },
            _count: { select: { recipients: true } },
          },
        }),
      ]);

      const readCounts = notifications.length
        ? await prisma.notificationRecipient.groupBy({
            by: ['notificationId'],
            where: {
              notificationId: { in: notifications.map((notification) => notification.id) },
              readAt: { not: null },
            },
            _count: { _all: true },
          })
        : [];
      const readCountByNotification = new Map(
        readCounts.map((row) => [row.notificationId, row._count._all])
      );

      return NextResponse.json({
        data: notifications.map((notification) => ({
          ...notification,
          recipientCount: notification._count.recipients,
          readCount: readCountByNotification.get(notification.id) || 0,
          _count: undefined,
        })),
        ...pageMeta(page, pageSize, total),
      });
    }

    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (!session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipientWhere: Prisma.NotificationRecipientWhereInput = {
      userId: session.user.id,
      ...(q
        ? {
            notification: {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { message: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const [total, unreadCount, recipients] = await Promise.all([
      prisma.notificationRecipient.count({ where: recipientWhere }),
      prisma.notificationRecipient.count({
        where: { userId: session.user.id, readAt: null },
      }),
      prisma.notificationRecipient.findMany({
        where: recipientWhere,
        orderBy: { notification: { createdAt: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          readAt: true,
          notification: {
            select: {
              id: true,
              title: true,
              message: true,
              audience: true,
              attachmentName: true,
              attachmentSize: true,
              createdAt: true,
              createdBy: { select: { name: true } },
              myClass: { select: { name: true } },
              targetStudent: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: recipients.map((recipient) => ({
        recipientId: recipient.id,
        readAt: recipient.readAt,
        ...recipient.notification,
      })),
      unreadCount,
      ...pageMeta(page, pageSize, total),
    });
  } catch (error) {
    return handleApiError(error, 'Failed to load notifications');
  }
}

export async function POST(request: Request) {
  let attachment: StoredNotificationAttachment | null = null;
  try {
    const { session, error } = await requirePermission('NOTIFICATIONS', 'CREATE');
    if (error || !session) return error;
    if (!session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const data = notificationSchema.parse({
      schoolId: formData.get('schoolId'),
      title: formData.get('title'),
      message: formData.get('message'),
      audience: formData.get('audience'),
      classId: formData.get('classId') || undefined,
      targetStudentId: formData.get('targetStudentId') || undefined,
    });

    const denied = assertSameSchool(session, data.schoolId);
    if (denied) return denied;

    if (data.classId) {
      const targetClass = await prisma.class.findFirst({
        where: { id: data.classId, classGroup: { campus: { schoolId: data.schoolId } } },
        select: { id: true },
      });
      if (!targetClass) {
        return NextResponse.json({ error: 'Class not found in the selected school' }, { status: 404 });
      }
    }

    const attachmentValue = formData.get('attachment');
    if (attachmentValue instanceof File && attachmentValue.size > 0) {
      attachment = await saveNotificationAttachment(attachmentValue);
    }

    const notification = await prisma.$transaction(async (tx) => {
      const recipientIds = await resolveNotificationRecipientIds(tx, {
        audience: data.audience as NotificationAudienceKey,
        schoolId: data.schoolId,
        classId: data.classId,
        targetStudentId: data.targetStudentId,
      });
      if (recipientIds.length === 0) {
        throw Object.assign(new Error('No active login accounts match the selected audience'), {
          status: 400,
        });
      }

      const created = await tx.notification.create({
        data: {
          schoolId: data.schoolId,
          title: data.title,
          message: data.message,
          audience: data.audience,
          classId: data.audience === 'CLASS' ? data.classId : null,
          targetStudentId: data.audience === 'STUDENT' ? data.targetStudentId : null,
          createdById: session.user.id!,
          attachmentStoredName: attachment?.storedName,
          attachmentName: attachment?.originalName,
          attachmentMimeType: attachment?.mimeType,
          attachmentSize: attachment?.size,
        },
        select: { id: true, title: true, createdAt: true },
      });

      await tx.notificationRecipient.createMany({
        data: recipientIds.map((userId) => ({ notificationId: created.id, userId })),
        skipDuplicates: true,
      });

      return { ...created, recipientCount: recipientIds.length };
    });

    return NextResponse.json(
      {
        ...notification,
        message: `Notification sent to ${notification.recipientCount} login${notification.recipientCount === 1 ? '' : 's'}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (attachment) await deleteNotificationAttachment(attachment.storedName).catch(() => undefined);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid notification' },
        { status: 400 }
      );
    }
    const status = (error as { status?: number }).status;
    if (status === 400) {
      return NextResponse.json({ error: (error as Error).message }, { status });
    }
    return handleApiError(error, 'Failed to send notification');
  }
}
