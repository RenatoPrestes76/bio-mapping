export interface EvidenceResponseDto {
  id: string;
  assessmentId: string;
  type: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: Date;
}

export function toEvidenceResponse(e: any): EvidenceResponseDto {
  return {
    id: e.id,
    assessmentId: e.assessmentId,
    type: e.type,
    filename: e.filename,
    originalName: e.originalName,
    mimeType: e.mimeType,
    size: e.size,
    // Achado da Sprint 03: `e.url` (persistido em `upload()`) apontava para o
    // static path público `/uploads/...`, sem autenticação. Substituído pela
    // rota autenticada que reaplica ownership antes de servir o arquivo.
    url: `/api/v1/assessments/${e.assessmentId}/evidence/${e.id}/download`,
    uploadedBy: e.uploadedBy,
    createdAt: e.createdAt,
  };
}
