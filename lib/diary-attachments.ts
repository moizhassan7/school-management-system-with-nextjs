import { randomBytes } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';

const DIARY_ATTACHMENT_DIR = join(process.cwd(), 'storage', 'diaries');
const MAX_SIZE = 8 * 1024 * 1024;
const EXTENSIONS = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
]);

export type StoredDiaryAttachment = {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export async function saveDiaryAttachment(file: File): Promise<StoredDiaryAttachment> {
  const extension = EXTENSIONS.get(file.type);
  if (!extension) {
    throw Object.assign(
      new Error('Attachment must be a PDF, image, Word document, or Excel spreadsheet'),
      { status: 400 }
    );
  }
  if (file.size <= 0 || file.size > MAX_SIZE) {
    throw Object.assign(new Error('Attachment must be smaller than 8 MB'), { status: 400 });
  }

  const storedName = `${randomBytes(20).toString('hex')}.${extension}`;
  await mkdir(DIARY_ATTACHMENT_DIR, { recursive: true });
  await writeFile(join(DIARY_ATTACHMENT_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  return {
    storedName,
    originalName: file.name.slice(0, 255) || `homework.${extension}`,
    mimeType: file.type,
    size: file.size,
  };
}

export async function readDiaryAttachment(storedName: string) {
  if (!storedName || basename(storedName) !== storedName) throw new Error('Invalid attachment path');
  return readFile(join(DIARY_ATTACHMENT_DIR, storedName));
}

export async function deleteDiaryAttachment(storedName: string | null | undefined) {
  if (!storedName || basename(storedName) !== storedName) return;
  try {
    await unlink(join(DIARY_ATTACHMENT_DIR, storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
