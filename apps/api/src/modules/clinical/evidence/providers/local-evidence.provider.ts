import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { EvidenceStorageProvider, StoredFile } from './storage.interface';

// MinIO / S3 providers can implement EvidenceStorageProvider and be swapped here via DI.
@Injectable()
export class LocalEvidenceProvider implements EvidenceStorageProvider {
  private readonly baseDir = path.join(process.cwd(), 'uploads', 'evidence');

  async save(file: Express.Multer.File, subdir: string): Promise<StoredFile> {
    const dir = path.join(this.baseDir, subdir);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const dest = path.join(dir, filename);

    await fs.writeFile(dest, file.buffer);

    return {
      filename,
      url: `/uploads/evidence/${subdir}/${filename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(filename: string, subdir: string): Promise<void> {
    const filePath = path.join(this.baseDir, subdir, filename);
    await fs.unlink(filePath).catch(() => undefined); // silent if already gone
  }
}
