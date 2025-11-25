import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'logos');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadResult {
    success: boolean;
    path?: string;
    error?: string;
}

/**
 * Validates if the file type is allowed
 */
export function isValidFileType(type: string): boolean {
    return ALLOWED_TYPES.includes(type);
}

/**
 * Validates if the file size is within limits
 */
export function isValidFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
}

/**
 * Generates a unique filename with the original extension
 */
export function generateUniqueFilename(originalName: string): string {
    const extension = originalName.split('.').pop();
    const randomName = randomBytes(16).toString('hex');
    return `${randomName}.${extension}`;
}

/**
 * Saves an uploaded file to the uploads directory
 * @param file - The file to upload
 * @returns UploadResult with success status and path or error
 */
export async function saveUploadedFile(file: File): Promise<UploadResult> {
    try {
        // Validate file type
        if (!isValidFileType(file.type)) {
            return {
                success: false,
                error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            };
        }

        // Validate file size
        if (!isValidFileSize(file.size)) {
            return {
                success: false,
                error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
            };
        }

        // Generate unique filename
        const filename = generateUniqueFilename(file.name);
        const filepath = join(UPLOAD_DIR, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return the public path (relative to /public)
        const publicPath = `/uploads/logos/${filename}`;

        return {
            success: true,
            path: publicPath,
        };
    } catch (error) {
        console.error('Error saving file:', error);
        return {
            success: false,
            error: 'Failed to save file. Please try again.',
        };
    }
}
