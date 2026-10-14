import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission, schoolScope } from '@/lib/authz';
import { enqueueDeviceJob } from '@/lib/biometric/service';

const mappingSchema = z.object({
  deviceId: z.string().min(1),
  personType: z.enum(['STUDENT', 'STAFF']),
  studentRecordId: z.string().optional(),
  staffRecordId: z.string().optional(),
  deviceEmployeeNo: z.string().optional(),
});

function employeeNoFor(personType: 'STUDENT' | 'STAFF', recordId: string) {
  const prefix = personType === 'STUDENT' ? '10' : '20';
  const digest = createHash('sha1').update(`${personType}:${recordId}`).digest('hex');
  return `${prefix}${Number.parseInt(digest.slice(0, 8), 16).toString().slice(0, 8)}`;
}

export async function GET(request: Request) {
  const { session, error } = await requirePermission('ATTENDANCE', 'VIEW');
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const studentRecordId = searchParams.get('studentRecordId') || undefined;
  const staffRecordId = searchParams.get('staffRecordId') || undefined;

  const mappings = await prisma.biometricPersonMapping.findMany({
    where: {
      ...schoolScope(session),
      ...(studentRecordId ? { studentRecordId } : {}),
      ...(staffRecordId ? { staffRecordId } : {}),
    },
    include: {
      device: { select: { id: true, name: true, status: true, location: true, campus: { select: { name: true } } } },
      enrollmentJobs: { take: 5, orderBy: { createdAt: 'desc' } },
      events: { take: 5, orderBy: { eventTimestamp: 'desc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  const { session, error } = await requirePermission('ATTENDANCE', 'EDIT');
  if (error) return error;
  if (!session.user.schoolId) return NextResponse.json({ error: 'School is required' }, { status: 400 });

  try {
    const data = mappingSchema.parse(await request.json());
    const device = await prisma.biometricDevice.findFirst({
      where: { id: data.deviceId, schoolId: session.user.schoolId, archivedAt: null },
    });
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const recordId = data.personType === 'STUDENT' ? data.studentRecordId : data.staffRecordId;
    if (!recordId) return NextResponse.json({ error: 'Target person record is required' }, { status: 400 });

    const deviceEmployeeNo = data.deviceEmployeeNo || employeeNoFor(data.personType, recordId);
    const mapping = await prisma.biometricPersonMapping.upsert({
      where:
        data.personType === 'STUDENT'
          ? { deviceId_studentRecordId: { deviceId: device.id, studentRecordId: recordId } }
          : { deviceId_staffRecordId: { deviceId: device.id, staffRecordId: recordId } },
      update: { deviceEmployeeNo, isActive: true, removedAt: null, lastError: null },
      create: {
        schoolId: session.user.schoolId,
        deviceId: device.id,
        personType: data.personType,
        studentRecordId: data.personType === 'STUDENT' ? recordId : undefined,
        staffRecordId: data.personType === 'STAFF' ? recordId : undefined,
        deviceEmployeeNo,
        enrollmentStatus: 'USER_CREATED',
      },
    });

    if (device.gatewayId) {
      await enqueueDeviceJob({
        schoolId: device.schoolId,
        gatewayId: device.gatewayId,
        deviceId: device.id,
        type: 'SYNC_USERS',
        createdById: session.user.id,
        payload: { mappingId: mapping.id },
      });
    }

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid mapping' }, { status: 400 });
  }
}
