export interface StoredFile {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface EvidenceStorageProvider {
  save(file: Express.Multer.File, subdir: string): Promise<StoredFile>;
  delete(filename: string, subdir: string): Promise<void>;
}

export const EVIDENCE_STORAGE = Symbol('EVIDENCE_STORAGE');
