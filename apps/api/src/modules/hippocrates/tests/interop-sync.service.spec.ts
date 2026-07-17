import { InteropSyncService } from '../services/interop-sync.service.js';
import { InteropAdapter, InteropDirection, ClinicalRecordType } from '@bio/database';
import { CanonicalClinicalRecord } from '../models/canonical.types.js';

const record: CanonicalClinicalRecord = {
  recordType: ClinicalRecordType.OBSERVATION,
  code: '8867-4',
  sourceId: 'obs-1',
  payload: { code: '8867-4', value: 72 },
};

const makeRegistry = (importPayload = { records: [record], medications: [], allergies: [], procedures: [] }) => ({
  get: jest.fn().mockReturnValue({
    import: jest.fn().mockResolvedValue(importPayload),
    export: jest.fn().mockResolvedValue({ resourceType: 'Bundle', entry: [] }),
  }),
  list: jest.fn().mockReturnValue([]),
});

const makeJobRepo = () => ({
  create: jest.fn().mockResolvedValue({ id: 'job-1' }),
  start: jest.fn().mockResolvedValue({}),
  complete: jest.fn().mockResolvedValue({}),
  fail: jest.fn().mockResolvedValue({}),
  addLog: jest.fn().mockResolvedValue({}),
  findById: jest.fn().mockResolvedValue({ id: 'job-1', logs: [] }),
  findByPatient: jest.fn().mockResolvedValue([]),
  findByOrganization: jest.fn().mockResolvedValue([]),
});

const makeConflictResolver = (resolution = 'CREATED') => ({
  resolveAndSave: jest.fn().mockResolvedValue({ resolution, recordId: 'rec-1' }),
  computeChecksum: jest.fn().mockReturnValue('abc123'),
});

const makeMedRepo = () => ({ upsertBySource: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) });
const makeAllergyRepo = () => ({ upsertBySource: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) });
const makeProcedureRepo = () => ({ upsertBySource: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) });
const makeRecordRepo = () => ({ findByPatient: jest.fn().mockResolvedValue([]) });

describe('InteropSyncService', () => {
  describe('import', () => {
    it('creates a job and returns stats', async () => {
      const registry = makeRegistry();
      const jobRepo = makeJobRepo();
      const service = new InteropSyncService(
        registry as never, makeConflictResolver() as never, jobRepo as never,
        makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never, makeRecordRepo() as never,
      );
      const result = await service.import({
        adapter: InteropAdapter.FHIR_R4,
        patientId: 'patient-1',
        data: {},
      });
      expect(result.jobId).toBe('job-1');
      expect(result.processedRecords).toBe(1);
      expect(result.failedRecords).toBe(0);
      expect(jobRepo.complete).toHaveBeenCalled();
    });

    it('counts conflicts when resolver returns CONFLICT', async () => {
      const registry = makeRegistry();
      const conflictResolver = makeConflictResolver('CONFLICT');
      (conflictResolver.resolveAndSave as jest.Mock).mockResolvedValue({
        resolution: 'CONFLICT',
        recordId: 'rec-1',
        conflictDetails: { previousChecksum: 'old', newChecksum: 'new' },
      });
      const jobRepo = makeJobRepo();
      const service = new InteropSyncService(
        registry as never, conflictResolver as never, jobRepo as never,
        makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never, makeRecordRepo() as never,
      );
      const result = await service.import({ adapter: InteropAdapter.FHIR_R4, patientId: 'patient-1', data: {} });
      expect(result.conflictsFound).toBe(1);
    });

    it('handles failed records gracefully', async () => {
      const registry = makeRegistry();
      const conflictResolver = makeConflictResolver();
      (conflictResolver.resolveAndSave as jest.Mock).mockRejectedValue(new Error('DB error'));
      const jobRepo = makeJobRepo();
      const service = new InteropSyncService(
        registry as never, conflictResolver as never, jobRepo as never,
        makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never, makeRecordRepo() as never,
      );
      const result = await service.import({ adapter: InteropAdapter.FHIR_R4, patientId: 'patient-1', data: {} });
      expect(result.failedRecords).toBe(1);
      expect(result.processedRecords).toBe(0);
      expect(jobRepo.addLog).toHaveBeenCalledWith('job-1', 'error', expect.stringContaining('DB error'));
    });

    it('processes medications from import payload', async () => {
      const medPayload = { records: [], medications: [{ name: 'Metformin', sourceId: 'med-1' }], allergies: [], procedures: [] };
      const registry = makeRegistry(medPayload);
      const medRepo = makeMedRepo();
      const service = new InteropSyncService(
        registry as never, makeConflictResolver() as never, makeJobRepo() as never,
        medRepo as never, makeAllergyRepo() as never, makeProcedureRepo() as never, makeRecordRepo() as never,
      );
      const result = await service.import({
        adapter: InteropAdapter.FHIR_R4,
        patientId: 'patient-1',
        sourceSystem: 'hospital-a',
        data: {},
      });
      expect(medRepo.upsertBySource).toHaveBeenCalledWith('patient-1', 'hospital-a', 'med-1', expect.objectContaining({ name: 'Metformin' }));
      expect(result.processedRecords).toBe(1);
    });

    it('fails the job when adapter throws', async () => {
      const registry = { get: jest.fn().mockReturnValue({ import: jest.fn().mockRejectedValue(new Error('Adapter error')) }) };
      const jobRepo = makeJobRepo();
      const service = new InteropSyncService(
        registry as never, makeConflictResolver() as never, jobRepo as never,
        makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never, makeRecordRepo() as never,
      );
      await expect(service.import({ adapter: InteropAdapter.FHIR_R4, patientId: 'patient-1', data: {} }))
        .rejects.toThrow('Adapter error');
      expect(jobRepo.fail).toHaveBeenCalledWith('job-1', 'Adapter error');
    });
  });

  describe('export', () => {
    it('exports records and returns FHIR bundle', async () => {
      const records = [{ id: 'rec-1', code: '8867-4' }];
      const recordRepo = { findByPatient: jest.fn().mockResolvedValue(records) };
      const registry = makeRegistry();
      const jobRepo = makeJobRepo();
      const service = new InteropSyncService(
        registry as never, makeConflictResolver() as never, jobRepo as never,
        makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never, recordRepo as never,
      );
      const result = await service.export({ adapter: InteropAdapter.FHIR_R4, patientId: 'patient-1' });
      expect(result.jobId).toBe('job-1');
      expect(jobRepo.complete).toHaveBeenCalledWith('job-1', expect.objectContaining({ totalRecords: 1 }));
    });
  });
});
