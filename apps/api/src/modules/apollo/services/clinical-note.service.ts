import { Injectable } from '@nestjs/common';
import { ClinicalNoteRepository } from '../repositories/clinical-note.repository.js';

@Injectable()
export class ClinicalNoteService {
  constructor(private readonly repo: ClinicalNoteRepository) {}

  async createNote(data: {
    enrollmentId: string;
    patientId: string;
    professionalId: string;
    title: string;
    content: string;
    noteType?: string;
    attachments?: Record<string, unknown>[];
    isPrivate?: boolean;
  }) {
    return this.repo.create(data);
  }

  async getNotesByEnrollment(enrollmentId: string, includePrivate = false) {
    return this.repo.findByEnrollment(enrollmentId, includePrivate);
  }

  async getNotesByPatient(patientId: string) {
    return this.repo.findByPatient(patientId);
  }

  async updateNote(id: string, data: { title?: string; content?: string; noteType?: string; isPrivate?: boolean }) {
    return this.repo.update(id, data);
  }

  async deleteNote(id: string) {
    return this.repo.softDelete(id);
  }
}
