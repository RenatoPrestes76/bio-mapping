export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<string>;
  delete(filePath: string): Promise<void>;
  /** Caminho absoluto no filesystem local para leitura/stream autenticado.
   * Provedores de nuvem (S3/MinIO) devem, em vez disso, expor uma URL
   * assinada de curta duração — mesmo padrão de `EvidenceStorageProvider`
   * (Sprint 03). */
  getAbsolutePath(filePath: string): string;
}
