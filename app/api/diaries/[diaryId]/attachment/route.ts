import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/authz';
import { readDiaryAttachment } from '@/lib/diary-attachments';
import { can } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ diaryId: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) return error;
    if (!session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { diaryId } = await params;
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      select: {
        schoolId: true,
        classId: true,
        status: true,
        createdById: true,
        attachmentStoredName: true,
        attachmentName: true,
        attachmentMimeType: true,
      },
    });
    if (!diary?.attachmentStoredName || !diary.attachmentName) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    let allowed =
      diary.createdById === session.user.id ||
      ((session.user.role === 'SUPER_ADMIN' || session.user.schoolId === diary.schoolId) &&
        can(session.user, 'DIARIES', 'APPROVE'));
    if (!allowed && diary.status === 'PUBLISHED' && session.user.role === 'STUDENT') {
      allowed = Boolean(
        await prisma.studentRecord.findFirst({
          where: { userId: session.user.id, classId: diary.classId },
          select: { id: true },
        })
      );
    }
    if (!allowed && diary.status === 'PUBLISHED' && session.user.role === 'PARENT') {
      allowed = Boolean(
        await prisma.kinship.findFirst({
          where: {
            parentRecord: { userId: session.user.id },
            studentRecord: { classId: diary.classId },
          },
          select: { id: true },
        })
      );
    }
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const file = await readDiaryAttachment(diary.attachmentStoredName);
    return new Response(file, {
      headers: {
        'Content-Type': diary.attachmentMimeType || 'application/octet-stream',
        'Content-Length': String(file.byteLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(diary.attachmentName)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to download diary attachment');
  }
}
