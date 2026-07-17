import { Injectable } from '@nestjs/common';
import { ClinicalRecordType } from '@bio/database';
import { BaseInteropAdapter } from './base.adapter.js';
import {
  AdapterContext,
  CanonicalAllergy,
  CanonicalClinicalRecord,
  CanonicalMedication,
  CanonicalProcedure,
  InteropImportPayload,
} from '../models/canonical.types.js';

interface FhirCoding { system?: string; code?: string; display?: string }
interface FhirCodeableConcept { coding?: FhirCoding[]; text?: string }
interface FhirQuantity { value?: number; unit?: string }

interface FhirResource {
  resourceType: string;
  id?: string;
  status?: string;
  code?: FhirCodeableConcept;
  subject?: { reference?: string };
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  onsetDateTime?: string;
  authoredOn?: string;
  performedDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  referenceRange?: Array<{ text?: string }>;
  interpretation?: FhirCodeableConcept[];
  clinicalStatus?: FhirCodeableConcept;
  criticality?: string;
  reaction?: Array<{ manifestation?: FhirCodeableConcept[] }>;
  medicationCodeableConcept?: FhirCodeableConcept;
  dosageInstruction?: Array<{ text?: string; route?: FhirCodeableConcept; timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } } }>;
  requester?: { display?: string };
  outcome?: FhirCodeableConcept;
  location?: { display?: string };
}

interface FhirBundle { resourceType: string; entry?: Array<{ resource?: FhirResource }> }

const FHIR_CRITICALITY_MAP: Record<string, string> = {
  'low': 'mild',
  'high': 'severe',
  'unable-to-assess': 'unknown',
};

@Injectable()
export class FhirR4Adapter extends BaseInteropAdapter {
  readonly name = 'FHIR_R4';
  readonly description = 'HL7 FHIR R4 adapter for importing and exporting clinical data';

  async import(rawData: unknown, _context: AdapterContext): Promise<InteropImportPayload> {
    const payload = this.emptyPayload();
    const bundle = rawData as FhirBundle;

    if (!bundle?.entry?.length) return payload;

    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource) continue;

      switch (resource.resourceType) {
        case 'Observation':
          payload.records.push(this.parseObservation(resource));
          break;
        case 'Condition':
          payload.records.push(this.parseCondition(resource));
          break;
        case 'MedicationRequest':
          payload.medications.push(this.parseMedicationRequest(resource));
          break;
        case 'AllergyIntolerance':
          payload.allergies.push(this.parseAllergyIntolerance(resource));
          break;
        case 'Procedure':
          payload.procedures.push(this.parseProcedure(resource));
          break;
      }
    }

    return payload;
  }

  async export(records: unknown[], _context: AdapterContext): Promise<unknown> {
    const entries = records.map((r) => ({
      fullUrl: `urn:uuid:${(r as { id: string }).id}`,
      resource: this.toFhirObservation(r as Record<string, unknown>),
    }));
    return { resourceType: 'Bundle', type: 'collection', entry: entries };
  }

  private firstCoding(concept?: FhirCodeableConcept): FhirCoding | undefined {
    return concept?.coding?.[0];
  }

  private parseObservation(r: FhirResource): CanonicalClinicalRecord {
    const coding = this.firstCoding(r.code);
    const obs = {
      code: coding?.code,
      codeSystem: coding?.system,
      displayName: coding?.display ?? r.code?.text,
      numericValue: r.valueQuantity?.value,
      value: r.valueString ?? (r.valueQuantity?.value != null ? String(r.valueQuantity.value) : undefined),
      unit: r.valueQuantity?.unit,
      referenceRange: r.referenceRange?.[0]?.text,
      interpretation: this.firstCoding(r.interpretation?.[0])?.code,
      effectiveDate: r.effectiveDateTime ? new Date(r.effectiveDateTime) : undefined,
    };
    return {
      recordType: ClinicalRecordType.OBSERVATION,
      code: coding?.code,
      codeSystem: coding?.system,
      displayName: coding?.display ?? r.code?.text,
      effectiveDate: obs.effectiveDate,
      sourceId: r.id,
      observations: [obs],
      payload: r as unknown as Record<string, unknown>,
    };
  }

  private parseCondition(r: FhirResource): CanonicalClinicalRecord {
    const coding = this.firstCoding(r.code);
    const clinical = this.firstCoding(r.clinicalStatus)?.code;
    return {
      recordType: ClinicalRecordType.DIAGNOSIS,
      code: coding?.code,
      codeSystem: coding?.system,
      displayName: coding?.display ?? r.code?.text,
      effectiveDate: r.onsetDateTime ? new Date(r.onsetDateTime) : undefined,
      sourceId: r.id,
      status: clinical,
      payload: r as unknown as Record<string, unknown>,
    };
  }

  private parseMedicationRequest(r: FhirResource): CanonicalMedication {
    const coding = this.firstCoding(r.medicationCodeableConcept);
    const dosage = r.dosageInstruction?.[0];
    return {
      name: r.medicationCodeableConcept?.text ?? coding?.display ?? 'Unknown',
      code: coding?.code,
      codeSystem: coding?.system,
      dosage: dosage?.text,
      route: dosage?.route?.text,
      startDate: r.authoredOn ? new Date(r.authoredOn) : undefined,
      prescribedBy: r.requester?.display,
      sourceId: r.id,
    };
  }

  private parseAllergyIntolerance(r: FhirResource): CanonicalAllergy {
    const coding = this.firstCoding(r.code);
    const manifestation = r.reaction?.[0]?.manifestation?.[0];
    return {
      allergen: r.code?.text ?? coding?.display ?? 'Unknown',
      code: coding?.code,
      codeSystem: coding?.system,
      reaction: manifestation?.text ?? this.firstCoding(manifestation)?.display,
      severity: r.criticality ? (FHIR_CRITICALITY_MAP[r.criticality] ?? r.criticality) : undefined,
      onsetDate: r.onsetDateTime ? new Date(r.onsetDateTime) : undefined,
      sourceId: r.id,
    };
  }

  private parseProcedure(r: FhirResource): CanonicalProcedure {
    const coding = this.firstCoding(r.code);
    return {
      name: r.code?.text ?? coding?.display ?? 'Unknown',
      code: coding?.code,
      codeSystem: coding?.system,
      performedDate: r.performedDateTime ? new Date(r.performedDateTime) : undefined,
      location: r.location?.display,
      outcome: r.outcome?.text,
      sourceId: r.id,
    };
  }

  private toFhirObservation(record: Record<string, unknown>): unknown {
    return {
      resourceType: 'Observation',
      id: record['id'],
      status: 'final',
      code: {
        coding: [{ system: record['codeSystem'], code: record['code'], display: record['displayName'] }],
        text: record['displayName'],
      },
      effectiveDateTime: record['effectiveDate'],
    };
  }
}
