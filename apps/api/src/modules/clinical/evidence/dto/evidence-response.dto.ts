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
    url: e.url,
    uploadedBy: e.uploadedBy,
    createdAt: e.createdAt,
  };
}
