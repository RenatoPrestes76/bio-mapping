import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StorageProvider } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const uploadDir = join(process.cwd(), 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });
    const ext = extname(file.originalname) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    await writeFile(join(uploadDir, filename), file.buffer);
    return `/uploads/${folder}/${filename}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = join(process.cwd(), filePath);
    await unlink(fullPath).catch(() => {});
  }
}
