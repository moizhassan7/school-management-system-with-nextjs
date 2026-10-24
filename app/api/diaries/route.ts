import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error';
import { requirePermission, schoolScope } from '@/lib/authz';
import {
  deleteDiaryAttachment,
  saveDiaryAttachment,
  type StoredDiaryAttachment,
} from '@/lib/diary-attachments';
import { pageMeta, parsePagination } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';

const createDiarySchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(1).max(5000),
  diaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).optional(),
});

const diaryStatuses = new Set(['PENDING_APPROVAL', 'PUBLISHED', 'REJECTED']);

const diarySelect = {
  id: true,
  title: true,
  message: true,
  diaryDate: true,
  dueDate: true,
  status: true,
  rejectionReason: true,
  attachmentName: true,
  attachmentSize: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  school: { select: { id: true, name: true } },
  myClass: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true, code: true } },
} satisfies Prisma.DiarySelect;

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('DIARIES', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams, {
      defaultPageSize: 15,
      minPageSize: 1,
      maxPageSize: 100,
    });
    const q = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status')?.trim();
    const role = session.user.role;
    const where: Prisma.DiaryWhereInput = {
      ...schoolScope(session),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { message: { contains: q, mode: 'insensitive' } },
              { subject: { name: { contains: q, mode: 'insensitive' } } },
              { myClass: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      if (status && status !== 'ALL' && diaryStatuses.has(status)) {
        where.status = status as 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';
      }
    } else if (role === 'TEACHER') {
      where.createdById = session.user.id || '__none__';
      if (status && status !== 'ALL' && diaryStatuses.has(status)) {
        where.status = status as 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';
      }
    } else if (role === 'STUDENT') {
      const record = await prisma.studentRecord.findUnique({
        where: { userId: session.user.id || '__none__' },
        select: { classId: true },
      });
      where.status = 'PUBLISHED';
      where.classId = record?.classId || '__none__';
    } else if (role === 'PARENT') {
      const parent = await prisma.parentRecord.findUnique({
        where: { userId: session.user.id || '__none__' },
        select: { students: { select: { studentRecord: { select: { classId: true } } } } },
      });
      const classIds = [
        ...new Set(parent?.students.map((item) => item.studentRecord.classId).filter((id): id is string => Boolean(id)) || []),
      ];
      where.status = 'PUBLISHED';
      where.classId = { in: classIds.length ? classIds : ['__none__'] };
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [total, diaries] = await Promise.all([
      prisma.diary.count({ where }),
      prisma.diary.findMany({
        where,
        orderBy: [{ diaryDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: diarySelect,
      }),
    ]);

    return NextResponse.json({ data: diaries, ...pageMeta(page, pageSize, total) });
  } catch (error) {
    return handleApiError(error, 'Failed to load diaries');
  }
}

export async function POST(request: Request) {
  let attachment: StoredDiaryAttachment | null = null;
  try {
    const { session, error } = await requirePermission('DIARIES', 'CREATE');
    if (error || !session) return error;
    if (!session.user.id || !session.user.schoolId) {
      return NextResponse.json({ error: 'School account is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const data = createDiarySchema.parse({
      classId: formData.get('classId'),
      subjectId: formData.get('subjectId'),
      title: formData.get('title'),
      message: formData.get('message'),
      diaryDate: formData.get('diaryDate'),
      dueDate: formData.get('dueDate') || '',
    });
    if (data.dueDate && data.dueDate < data.diaryDate) {
      return NextResponse.json({ error: 'Due date cannot be before the diary date' }, { status: 400 });
    }

    const [targetClass, subject] = await Promise.all([
      prisma.class.findFirst({
        where: {
          id: data.classId,
          classGroup: { campus: { schoolId: session.user.schoolId } },
        },
        select: { id: true },
      }),
      prisma.subject.findFirst({
        where: { id: data.subjectId, schoolId: session.user.schoolId },
        select: { id: true },
      }),
    ]);
    if (!targetClass || !subject) {
      return NextResponse.json({ error: 'Class or subject does not belong to your school' }, { status: 403 });
    }

    if (session.user.role === 'TEACHER') {
      const assignment = await prisma.subjectAssignment.findFirst({
        where: {
          classId: data.classId,
          subjectId: data.subjectId,
          teacher: { userId: session.user.id },
        },
        select: { id: true },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: 'You can only submit diary work for your assigned class and subject' },
          { status: 403 }
        );
      }
    } else if (!['ADMIN', 'SUPER_ADMIN'].includes(String(session.user.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attachmentValue = formData.get('attachment');
    if (attachmentValue instanceof File && attachmentValue.size > 0) {
      attachment = await saveDiaryAttachment(attachmentValue);
    }

    const diary = await prisma.diary.create({
      data: {
        schoolId: session.user.schoolId,
        classId: data.classId,
        subjectId: data.subjectId,
        title: data.title,
        message: data.message,
        diaryDate: utcDate(data.diaryDate),
        dueDate: data.dueDate ? utcDate(data.dueDate) : null,
        createdById: session.user.id,
        attachmentStoredName: attachment?.storedName,
        attachmentName: attachment?.originalName,
        attachmentMimeType: attachment?.mimeType,
        attachmentSize: attachment?.size,
      },
      select: diarySelect,
    });

    return NextResponse.json(
      { diary, message: 'Diary submitted for admin approval' },
      { status: 201 }
    );
  } catch (error) {
    if (attachment) await deleteDiaryAttachment(attachment.storedName).catch(() => undefined);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid diary' },
        { status: 400 }
      );
    }
    const status = (error as { status?: number }).status;
    if (status === 400) return NextResponse.json({ error: (error as Error).message }, { status });
    return handleApiError(error, 'Failed to submit diary');
  }
}
