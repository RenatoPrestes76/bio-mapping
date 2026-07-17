import { Injectable, NotFoundException } from '@nestjs/common';
import { OracleMetricType } from '@bio/database';
import { PatientsService } from '../patients/patients.service';
import { VitalsRepository } from '../vitals/repositories/vitals.repository';
import { ClinicalRecordService } from '../hippocrates/services/clinical-record.service.js';
import { EnrollmentService } from '../apollo/services/enrollment.service.js';
import { OracleService } from '../oracle/services/oracle.service.js';
import { AssessmentsRepository } from '../clinical/assessments/repositories/assessments.repository';
import {
  AssessmentSummary,
  BiomarkerSummary,
  CapabilitySection,
  ClinicalContext,
  ConditionSummary,
  LifestyleRecordSummary,
  MedicationSummary,
  PatientSummary,
  VitalRecordSummary,
  WearableMetricSummary,
} from './contracts';

const DEFAULT_WINDOW_DAYS = 30;

function empty<T>(): CapabilitySection<T> {
  return { available: false, items: [] };
}

function ready<T>(items: T[]): CapabilitySection<T> {
  return { available: true, items };
}

/**
 * Agrega dado dos módulos existentes (vitals, biomarkers, hippocrates, apollo,
 * oracle, assessments) num ClinicalContext único por paciente. Só leitura,
 * nenhum cálculo clínico — é puramente uma camada de agregação (Sprint 14.1).
 */
@Injectable()
export class ClinicalContextBuilder {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly vitalsRepository: VitalsRepository,
    private readonly clinicalRecordService: ClinicalRecordService,
    private readonly enrollmentService: EnrollmentService,
    private readonly oracleService: OracleService,
    private readonly assessmentsRepository: AssessmentsRepository,
  ) {}

  async build(patientId: string, windowDays = DEFAULT_WINDOW_DAYS): Promise<ClinicalContext> {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - windowDays);

    const sourcesQueried: string[] = [];

    const [patient, vitals, medications, allergies, lifestyle, wearables, assessments] =
      await Promise.all([
        this.fetchPatient(patientId, sourcesQueried),
        this.fetchVitals(patientId, sourcesQueried),
        this.fetchMedications(patientId, sourcesQueried),
        this.fetchAllergies(patientId, sourcesQueried),
        this.fetchLifestyle(patientId, sourcesQueried),
        this.fetchWearables(patientId, from, now, sourcesQueried),
        this.fetchAssessments(patientId, sourcesQueried),
      ]);

    return {
      patientId,
      metadata: {
        generatedAt: now,
        window: { from, to: now },
        sourcesQueried,
      },
      patient,
      vitals: vitals.section,
      laboratory: vitals.laboratory,
      lifestyle,
      nutrition: empty(),
      medication: medications,
      conditions: allergies,
      assessments,
      wearables,
      familyHistory: empty(),
      genomics: empty(),
      imaging: empty(),
      fhirResources: empty(),
    };
  }

  private async fetchPatient(patientId: string, sources: string[]): Promise<PatientSummary | null> {
    try {
      const patient = await this.patientsService.findById(patientId);
      sources.push('patients');
      return {
        patientId: patient.id,
        birthDate: null,
        gender: null,
        bloodType: patient.bloodType ?? null,
      };
    } catch (e) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }

  private async fetchVitals(
    patientId: string,
    sources: string[],
  ): Promise<{ section: CapabilitySection<VitalRecordSummary>; laboratory: CapabilitySection<BiomarkerSummary> }> {
    const [records] = await this.vitalsRepository.findAll(patientId, { page: 1, limit: 30 });
    sources.push('vitals');

    const vitalItems: VitalRecordSummary[] = records.map((v: any) => ({
      id: v.id,
      recordedAt: v.recordedAt,
      weight: v.weight ?? null,
      height: v.height ?? null,
      bmi: v.bmi ?? null,
      heartRate: v.heartRate ?? null,
      bloodPressureSystolic: v.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: v.bloodPressureDiastolic ?? null,
    }));

    const laboratoryItems: BiomarkerSummary[] = records.flatMap((v: any) =>
      (v.biomarkers ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        value: b.value,
        unit: b.unit,
        status: b.status,
        recordedAt: v.recordedAt,
      })),
    );

    return {
      section: ready(vitalItems),
      laboratory: ready(laboratoryItems),
    };
  }

  private async fetchMedications(
    patientId: string,
    sources: string[],
  ): Promise<CapabilitySection<MedicationSummary>> {
    const medications = await this.clinicalRecordService.getMedications(patientId);
    sources.push('hippocrates.medications');

    const items: MedicationSummary[] = medications.map((m: any) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage ?? null,
      frequency: m.frequency ?? null,
      status: m.status,
      startDate: m.startDate ?? null,
      endDate: m.endDate ?? null,
    }));

    return ready(items);
  }

  private async fetchAllergies(
    patientId: string,
    sources: string[],
  ): Promise<CapabilitySection<ConditionSummary>> {
    const allergies = await this.clinicalRecordService.getAllergies(patientId);
    sources.push('hippocrates.allergies');

    const items: ConditionSummary[] = allergies.map((a: any) => ({
      id: a.id,
      type: 'ALLERGY',
      description: a.reaction ? `${a.allergen} — ${a.reaction}` : a.allergen,
      status: a.status,
      recordedAt: a.onsetDate ?? null,
    }));

    return ready(items);
  }

  private async fetchLifestyle(
    patientId: string,
    sources: string[],
  ): Promise<CapabilitySection<LifestyleRecordSummary>> {
    const enrollments = await this.enrollmentService.getEnrollments(patientId);
    sources.push('apollo.enrollments');

    const items: LifestyleRecordSummary[] = enrollments.map((e: any) => ({
      id: e.id,
      type: 'PROGRAM_ADHERENCE',
      value: e.adherencePct ?? null,
      recordedAt: e.updatedAt ?? e.createdAt,
    }));

    return ready(items);
  }

  private async fetchWearables(
    patientId: string,
    from: Date,
    to: Date,
    sources: string[],
  ): Promise<CapabilitySection<WearableMetricSummary>> {
    const data = await this.oracleService.getTimeline(patientId, {
      metrics: Object.values(OracleMetricType),
      since: from.toISOString(),
      until: to.toISOString(),
    });
    sources.push('oracle.normalizedHealthData');

    const items: WearableMetricSummary[] = data.map((d: any) => ({
      metricType: d.metricType,
      value: d.value,
      unit: d.unit ?? null,
      recordedAt: d.recordedAt,
      source: d.source,
    }));

    return ready(items);
  }

  private async fetchAssessments(
    patientId: string,
    sources: string[],
  ): Promise<CapabilitySection<AssessmentSummary>> {
    const [records] = await this.assessmentsRepository.findAll(patientId, { page: 1, limit: 30 });
    sources.push('clinical.assessments');

    const items: AssessmentSummary[] = records.map((a: any) => ({
      id: a.id,
      templateId: a.templateId,
      status: a.status,
      completedAt: a.performedAt ?? null,
    }));

    return ready(items);
  }
}
