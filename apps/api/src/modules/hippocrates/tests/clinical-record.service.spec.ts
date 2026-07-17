import { NotFoundException } from '@nestjs/common';
import { ClinicalRecordService } from '../services/clinical-record.service.js';
import { ClinicalRecordType, ClinicalStatus } from '@bio/database';

const record = { id: 'rec-1', patientId: 'patient-1', recordType: ClinicalRecordType.OBSERVATION };
const medication = { id: 'med-1', name: 'Metformin', status: ClinicalStatus.ACTIVE };
const allergy = { id: 'all-1', allergen: 'Penicillin', status: ClinicalStatus.ACTIVE };
const procedure = { id: 'proc-1', name: 'Appendectomy' };

const makeRecordRepo = (overrides: Record<string, unknown> = {}) => ({
  findByPatient: jest.fn().mockResolvedValue([record]),
  findById: jest.fn().mockResolvedValue(record),
  countByPatient: jest.fn().mockResolvedValue(1),
  ...overrides,
});

const makeMedRepo = (overrides: Record<string, unknown> = {}) => ({
  findByPatient: jest.fn().mockResolvedValue([medication]),
  ...overrides,
});

const makeAllergyRepo = (overrides: Record<string, unknown> = {}) => ({
  findByPatient: jest.fn().mockResolvedValue([allergy]),
  ...overrides,
});

const makeProcedureRepo = (overrides: Record<string, unknown> = {}) => ({
  findByPatient: jest.fn().mockResolvedValue([procedure]),
  ...overrides,
});

const makeService = (overrides: {
  recordRepo?: Record<string, unknown>;
  medRepo?: Record<string, unknown>;
  allergyRepo?: Record<string, unknown>;
  procedureRepo?: Record<string, unknown>;
} = {}) =>
  new ClinicalRecordService(
    makeRecordRepo(overrides.recordRepo ?? {}) as never,
    makeMedRepo(overrides.medRepo ?? {}) as never,
    makeAllergyRepo(overrides.allergyRepo ?? {}) as never,
    makeProcedureRepo(overrides.procedureRepo ?? {}) as never,
  );

describe('ClinicalRecordService', () => {
  describe('getRecords', () => {
    it('returns all records for a patient', async () => {
      const service = makeService();
      const result = await service.getRecords('patient-1');
      expect(result).toEqual([record]);
    });

    it('filters by recordType when provided', async () => {
      const recordRepo = makeRecordRepo();
      const service = new ClinicalRecordService(recordRepo as never, makeMedRepo() as never, makeAllergyRepo() as never, makeProcedureRepo() as never);
      await service.getRecords('patient-1', ClinicalRecordType.DIAGNOSIS);
      expect(recordRepo.findByPatient).toHaveBeenCalledWith('patient-1', { recordType: ClinicalRecordType.DIAGNOSIS });
    });
  });

  describe('getRecord', () => {
    it('returns a record by id', async () => {
      const service = makeService();
      const result = await service.getRecord('rec-1');
      expect(result).toBe(record);
    });

    it('throws NotFoundException when record not found', async () => {
      const service = makeService({ recordRepo: { findById: jest.fn().mockResolvedValue(null) } });
      await expect(service.getRecord('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getMedications', () => {
    it('returns medications for a patient', async () => {
      const service = makeService();
      const result = await service.getMedications('patient-1');
      expect(result).toEqual([medication]);
    });

    it('passes status filter when provided', async () => {
      const medRepo = makeMedRepo();
      const service = new ClinicalRecordService(makeRecordRepo() as never, medRepo as never, makeAllergyRepo() as never, makeProcedureRepo() as never);
      await service.getMedications('patient-1', ClinicalStatus.INACTIVE);
      expect(medRepo.findByPatient).toHaveBeenCalledWith('patient-1', ClinicalStatus.INACTIVE);
    });
  });

  describe('getAllergies', () => {
    it('returns allergies for a patient', async () => {
      const service = makeService();
      const result = await service.getAllergies('patient-1');
      expect(result).toEqual([allergy]);
    });
  });

  describe('getProcedures', () => {
    it('returns procedures for a patient', async () => {
      const service = makeService();
      const result = await service.getProcedures('patient-1');
      expect(result).toEqual([procedure]);
    });
  });

  describe('getSummary', () => {
    it('returns aggregated summary', async () => {
      const service = makeService();
      const result = await service.getSummary('patient-1');
      expect(result.totalRecords).toBe(1);
      expect(result.activeMedications).toBe(1);
      expect(result.activeAllergies).toBe(1);
      expect(result.totalProcedures).toBe(1);
      expect(result.medications).toEqual([medication]);
      expect(result.allergies).toEqual([allergy]);
    });

    it('limits medications and allergies to 5 items in summary', async () => {
      const meds = Array.from({ length: 10 }, (_, i) => ({ id: `med-${i}`, name: `Med ${i}` }));
      const allergies = Array.from({ length: 8 }, (_, i) => ({ id: `all-${i}`, allergen: `Allergen ${i}` }));
      const service = makeService({
        medRepo: { findByPatient: jest.fn().mockResolvedValue(meds) },
        allergyRepo: { findByPatient: jest.fn().mockResolvedValue(allergies) },
      });
      const result = await service.getSummary('patient-1');
      expect(result.medications).toHaveLength(5);
      expect(result.allergies).toHaveLength(5);
      expect(result.activeMedications).toBe(10);
      expect(result.activeAllergies).toBe(8);
    });
  });
});
