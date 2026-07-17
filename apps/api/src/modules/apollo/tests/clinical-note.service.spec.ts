import { ClinicalNoteService } from '../services/clinical-note.service.js';

const note = {
  id: 'note-1',
  enrollmentId: 'enroll-1',
  patientId: 'patient-1',
  professionalId: 'prof-1',
  title: 'Consulta inicial',
  content: 'Paciente em bom estado geral.',
  noteType: 'CONSULTATION',
  isPrivate: false,
  deletedAt: null,
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(note),
  findByEnrollment: jest.fn().mockResolvedValue([note]),
  findByPatient: jest.fn().mockResolvedValue([note]),
  update: jest.fn().mockResolvedValue({ ...note, title: 'Updated' }),
  softDelete: jest.fn().mockResolvedValue({ ...note, deletedAt: new Date() }),
  ...overrides,
});

describe('ClinicalNoteService', () => {
  let service: ClinicalNoteService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new ClinicalNoteService(repo as never);
  });

  describe('createNote', () => {
    it('creates and returns note', async () => {
      const result = await service.createNote({
        enrollmentId: 'enroll-1',
        patientId: 'patient-1',
        professionalId: 'prof-1',
        title: 'Consulta inicial',
        content: 'Paciente em bom estado geral.',
      });
      expect(result).toBe(note);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Consulta inicial' }));
    });
  });

  describe('getNotesByEnrollment', () => {
    it('returns notes for enrollment', async () => {
      const result = await service.getNotesByEnrollment('enroll-1');
      expect(result).toEqual([note]);
      expect(repo.findByEnrollment).toHaveBeenCalledWith('enroll-1', false);
    });

    it('passes includePrivate flag', async () => {
      await service.getNotesByEnrollment('enroll-1', true);
      expect(repo.findByEnrollment).toHaveBeenCalledWith('enroll-1', true);
    });
  });

  describe('getNotesByPatient', () => {
    it('returns all patient notes', async () => {
      const result = await service.getNotesByPatient('patient-1');
      expect(result).toEqual([note]);
    });
  });

  describe('updateNote', () => {
    it('updates note', async () => {
      const result = await service.updateNote('note-1', { title: 'Updated' });
      expect(repo.update).toHaveBeenCalledWith('note-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteNote', () => {
    it('soft deletes note', async () => {
      const result = await service.deleteNote('note-1');
      expect(repo.softDelete).toHaveBeenCalledWith('note-1');
      expect(result.deletedAt).not.toBeNull();
    });
  });
});
