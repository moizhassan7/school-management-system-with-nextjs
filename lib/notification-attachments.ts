import { randomBytes } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';

const ATTACHMENT_DIR = join(process.cwd(), 'storage', 'notifications');
export const MAX_NOTIFICATION_ATTACHMENT_SIZE = 8 * 1024 * 1024;

const EXTENSION_BY_MIME = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
]);

export const NOTIFICATION_ATTACHMENT_ACCEPT = [...EXTENSION_BY_MIME.keys()].join(',');

export type StoredNotificationAttachment = {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export async function saveNotificationAttachment(
  file: File
): Promise<StoredNotificationAttachment> {
  const extension = EXTENSION_BY_MIME.get(file.type);
  if (!extension) {
    throw Object.assign(
      new Error('Attachment must be a PDF, image, Word document, or Excel spreadsheet'),
      { status: 400 }
    );
  }
  if (file.size <= 0 || file.size > MAX_NOTIFICATION_ATTACHMENT_SIZE) {
    throw Object.assign(new Error('Attachment must be smaller than 8 MB'), { status: 400 });
  }

  const storedName = `${randomBytes(20).toString('hex')}.${extension}`;
  await mkdir(ATTACHMENT_DIR, { recursive: true });
  await writeFile(join(ATTACHMENT_DIR, storedName), Buffer.from(await file.arrayBuffer()));

  return {
    storedName,
    originalName: file.name.slice(0, 255) || `attachment.${extension}`,
    mimeType: file.type,
    size: file.size,
  };
}

export async function readNotificationAttachment(storedName: string) {
  if (!storedName || basename(storedName) !== storedName) {
    throw new Error('Invalid attachment path');
  }
  return readFile(join(ATTACHMENT_DIR, storedName));
}

export async function deleteNotificationAttachment(storedName: string | null | undefined) {
  if (!storedName || basename(storedName) !== storedName) return;
  try {
    await unlink(join(ATTACHMENT_DIR, storedName));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}
