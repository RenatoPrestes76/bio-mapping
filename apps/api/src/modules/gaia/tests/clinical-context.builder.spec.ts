import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicalContextBuilder } from '../clinical-context.builder';
import { PatientsService } from '../../patients/patients.service';
import { VitalsRepository } from '../../vitals/repositories/vitals.repository';
import { ClinicalRecordService } from '../../hippocrates/services/clinical-record.service';
import { EnrollmentService } from '../../apollo/services/enrollment.service';
import { OracleService } from '../../oracle/services/oracle.service';
import { AssessmentsRepository } from '../../clinical/assessments/repositories/assessments.repository';

describe('ClinicalContextBuilder', () => {
  let builder: ClinicalContextBuilder;
  let patientsService: { findById: jest.Mock };
  let vitalsRepository: { findAll: jest.Mock };
  let clinicalRecordService: { getMedications: jest.Mock; getAllergies: jest.Mock };
  let enrollmentService: { getEnrollments: jest.Mock };
  let oracleService: { getTimeline: jest.Mock };
  let assessmentsRepository: { findAll: jest.Mock };

  const patientId = 'patient-1';

  beforeEach(async () => {
    patientsService = { findById: jest.fn() };
    vitalsRepository = { findAll: jest.fn().mockResolvedValue([[], 0]) };
    clinicalRecordService = { getMedications: jest.fn().mockResolvedValue([]), getAllergies: jest.fn().mockResolvedValue([]) };
    enrollmentService = { getEnrollments: jest.fn().mockResolvedValue([]) };
    oracleService = { getTimeline: jest.fn().mockResolvedValue([]) };
    assessmentsRepository = { findAll: jest.fn().mockResolvedValue([[], 0]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalContextBuilder,
        { provide: PatientsService, useValue: patientsService },
        { provide: VitalsRepository, useValue: vitalsRepository },
        { provide: ClinicalRecordService, useValue: clinicalRecordService },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: OracleService, useValue: oracleService },
        { provide: AssessmentsRepository, useValue: assessmentsRepository },
      ],
    }).compile();

    builder = module.get(ClinicalContextBuilder);
  });

  it('sets patient to null when the patient does not exist, without throwing', async () => {
    patientsService.findById.mockRejectedValue(new NotFoundException('Paciente não encontrado'));

    const context = await builder.build(patientId);

    expect(context.patient).toBeNull();
  });

  it('re-throws non-NotFoundException errors from the patient lookup', async () => {
    patientsService.findById.mockRejectedValue(new Error('boom'));

    await expect(builder.build(patientId)).rejects.toThrow('boom');
  });

  it('marks a section as available once its source has been queried, even with zero records', async () => {
    patientsService.findById.mockResolvedValue({ id: patientId, bloodType: null });

    const context = await builder.build(patientId);

    expect(context.vitals).toEqual({ available: true, items: [] });
    expect(context.medication).toEqual({ available: true, items: [] });
    expect(context.conditions).toEqual({ available: true, items: [] });
    expect(context.lifestyle).toEqual({ available: true, items: [] });
    expect(context.wearables).toEqual({ available: true, items: [] });
    expect(context.assessments).toEqual({ available: true, items: [] });
  });

  it('leaves unimplemented capabilities unavailable and empty', async () => {
    patientsService.findById.mockResolvedValue({ id: patientId, bloodType: null });

    const context = await builder.build(patientId);

    expect(context.nutrition).toEqual({ available: false, items: [] });
    expect(context.familyHistory).toEqual({ available: false, items: [] });
    expect(context.genomics).toEqual({ available: false, items: [] });
    expect(context.imaging).toEqual({ available: false, items: [] });
    expect(context.fhirResources).toEqual({ available: false, items: [] });
  });

  it('maps vitals and their nested biomarkers into vitals + laboratory sections', async () => {
    patientsService.findById.mockResolvedValue({ id: patientId, bloodType: 'O_POSITIVE' });
    const recordedAt = new Date('2026-01-01T00:00:00.000Z');
    vitalsRepository.findAll.mockResolvedValue([
      [
        {
          id: 'vital-1',
          recordedAt,
          weight: 74.5,
          height: 178,
          bmi: 23.5,
          heartRate: 60,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          biomarkers: [
            { id: 'bio-1', name: 'Glucose', value: 90, unit: 'mg/dL', status: 'NORMAL' },
          ],
        },
      ],
      1,
    ]);

    const context = await builder.build(patientId);

    expect(context.vitals.items).toEqual([
      {
        id: 'vital-1',
        recordedAt,
        weight: 74.5,
        height: 178,
        bmi: 23.5,
        heartRate: 60,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
      },
    ]);
    expect(context.laboratory.items).toEqual([
      { id: 'bio-1', name: 'Glucose', value: 90, unit: 'mg/dL', status: 'NORMAL', recordedAt },
    ]);
    expect(context.patient).toEqual({ patientId, birthDate: null, gender: null, bloodType: 'O_POSITIVE' });
  });

  it('records which sources were queried in metadata', async () => {
    patientsService.findById.mockResolvedValue({ id: patientId, bloodType: null });

    const context = await builder.build(patientId);

    expect(context.metadata.sourcesQueried).toEqual(
      expect.arrayContaining([
        'patients',
        'vitals',
        'hippocrates.medications',
        'hippocrates.allergies',
        'apollo.enrollments',
        'oracle.normalizedHealthData',
        'clinical.assessments',
      ]),
    );
  });

  it('uses windowDays to compute the metadata window', async () => {
    patientsService.findById.mockResolvedValue({ id: patientId, bloodType: null });

    const context = await builder.build(patientId, 7);

    const diffDays =
      (context.metadata.window.to.getTime() - context.metadata.window.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 5);
  });
});
