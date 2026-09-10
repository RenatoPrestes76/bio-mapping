export interface StoredFile {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface EvidenceStorageProvider {
  save(file: Express.Multer.File, subdir: string): Promise<StoredFile>;
  delete(filename: string, subdir: string): Promise<void>;
  /** Caminho absoluto no filesystem local para leitura/stream autenticado.
   * Provedores de nuvem (S3/MinIO) devem, em vez disso, expor uma URL assinada
   * de curta duração — fora do escopo desta interface local por enquanto. */
  getAbsolutePath(filename: string, subdir: string): string;
}

export const EVIDENCE_STORAGE = Symbol('EVIDENCE_STORAGE');
