import { ConflictResolverService } from '../services/conflict-resolver.service.js';
import { ClinicalRecordType } from '@bio/database';
import { CanonicalClinicalRecord } from '../models/canonical.types.js';

const payload = { code: '8867-4', value: 72, unit: 'bpm' };

const existingRecord = {
  id: 'rec-1',
  patientId: 'patient-1',
  recordType: ClinicalRecordType.OBSERVATION,
  version: 1,
  checksum: null as string | null,
  observations: [],
  externalIds: [{ system: 'hospital-a', value: 'obs-ext-1' }],
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue({ id: 'new-rec-1' }),
  findByExternalId: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({}),
  addObservation: jest.fn().mockResolvedValue({}),
  addExternalId: jest.fn().mockResolvedValue({}),
  findByPatient: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  countByPatient: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const canonicalRecord: CanonicalClinicalRecord = {
  recordType: ClinicalRecordType.OBSERVATION,
  code: '8867-4',
  codeSystem: 'http://loinc.org',
  displayName: 'Heart rate',
  sourceId: 'obs-ext-1',
  effectiveDate: new Date('2025-01-10'),
  payload,
};

describe('ConflictResolverService', () => {
  describe('computeChecksum', () => {
    it('returns a 64-char SHA-256 hex string', () => {
      const service = new ConflictResolverService(makeRepo() as never);
      const checksum = service.computeChecksum(payload);
      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic for the same payload', () => {
      const service = new ConflictResolverService(makeRepo() as never);
      expect(service.computeChecksum(payload)).toBe(service.computeChecksum(payload));
    });

    it('differs for different payloads', () => {
      const service = new ConflictResolverService(makeRepo() as never);
      expect(service.computeChecksum(payload)).not.toBe(service.computeChecksum({ ...payload, value: 80 }));
    });
  });

  describe('resolveAndSave', () => {
    it('creates new record when no existing external ID', async () => {
      const repo = makeRepo({ findByExternalId: jest.fn().mockResolvedValue(null) });
      const service = new ConflictResolverService(repo as never);
      const result = await service.resolveAndSave('patient-1', canonicalRecord, { sourceSystem: 'hospital-a' });
      expect(result.resolution).toBe('CREATED');
      expect(repo.create).toHaveBeenCalled();
      expect(repo.addExternalId).toHaveBeenCalledWith('new-rec-1', 'hospital-a', 'obs-ext-1');
    });

    it('skips when existing record has same checksum', async () => {
      const service = new ConflictResolverService(makeRepo() as never);
      const checksum = service.computeChecksum(payload);
      const repo = makeRepo({ findByExternalId: jest.fn().mockResolvedValue({ ...existingRecord, checksum }) });
      const svc2 = new ConflictResolverService(repo as never);
      const result = await svc2.resolveAndSave('patient-1', canonicalRecord, { sourceSystem: 'hospital-a' });
      expect(result.resolution).toBe('SKIPPED');
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('detects conflict when checksum differs', async () => {
      const oldChecksum = 'old-checksum-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const repo = makeRepo({ findByExternalId: jest.fn().mockResolvedValue({ ...existingRecord, checksum: oldChecksum }) });
      const service = new ConflictResolverService(repo as never);
      const result = await service.resolveAndSave('patient-1', canonicalRecord, { sourceSystem: 'hospital-a' });
      expect(result.resolution).toBe('CONFLICT');
      expect(result.conflictDetails?.previousChecksum).toBe(oldChecksum);
      expect(repo.update).toHaveBeenCalledWith('rec-1', expect.objectContaining({ version: 2 }));
    });

    it('creates without external ID when sourceId is missing', async () => {
      const repo = makeRepo();
      const service = new ConflictResolverService(repo as never);
      const record = { ...canonicalRecord, sourceId: undefined };
      const result = await service.resolveAndSave('patient-1', record, { sourceSystem: 'hospital-a' });
      expect(result.resolution).toBe('CREATED');
      expect(repo.addExternalId).not.toHaveBeenCalled();
    });

    it('adds observations when record has observations', async () => {
      const repo = makeRepo();
      const service = new ConflictResolverService(repo as never);
      const record: CanonicalClinicalRecord = {
        ...canonicalRecord,
        observations: [{ code: '8867-4', numericValue: 72, unit: 'bpm' }],
      };
      await service.resolveAndSave('patient-1', record, {});
      expect(repo.addObservation).toHaveBeenCalled();
    });
  });
});
