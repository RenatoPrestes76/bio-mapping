export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<string>;
  delete(filePath: string): Promise<void>;
}
