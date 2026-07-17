import { FhirR4Adapter } from '../adapters/fhir-r4.adapter.js';
import { ClinicalRecordType } from '@bio/database';

const ctx = { patientId: 'patient-1' };

const makeFhirBundle = (resources: unknown[]) => ({
  resourceType: 'Bundle',
  type: 'collection',
  entry: resources.map((r) => ({ resource: r })),
});

const observation = {
  resourceType: 'Observation',
  id: 'obs-1',
  status: 'final',
  code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
  valueQuantity: { value: 72, unit: 'bpm' },
  effectiveDateTime: '2025-01-10T08:00:00Z',
  referenceRange: [{ text: '60-100 bpm' }],
  interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }],
};

const condition = {
  resourceType: 'Condition',
  id: 'cond-1',
  code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Diabetes mellitus type 2' }], text: 'Diabetes tipo 2' },
  clinicalStatus: { coding: [{ code: 'active' }] },
  onsetDateTime: '2020-03-01',
};

const medicationRequest = {
  resourceType: 'MedicationRequest',
  id: 'med-1',
  medicationCodeableConcept: {
    coding: [{ code: 'A10BA02', system: 'http://www.whocc.no/atc', display: 'Metformin' }],
    text: 'Metformin 500mg',
  },
  dosageInstruction: [{ text: '500mg twice daily', route: { text: 'oral' } }],
  authoredOn: '2025-01-01',
  requester: { display: 'Dr. Silva' },
};

const allergyIntolerance = {
  resourceType: 'AllergyIntolerance',
  id: 'allergy-1',
  code: { coding: [{ code: '372687004', system: 'http://snomed.info/sct', display: 'Amoxicillin' }], text: 'Amoxicillin' },
  criticality: 'high',
  onsetDateTime: '2015-06-01',
  reaction: [{ manifestation: [{ text: 'Rash generalizado' }] }],
};

const procedure = {
  resourceType: 'Procedure',
  id: 'proc-1',
  code: { coding: [{ code: '80146002', system: 'http://snomed.info/sct', display: 'Appendectomy' }], text: 'Appendectomy' },
  status: 'completed',
  performedDateTime: '2019-09-15',
  outcome: { text: 'Successful procedure' },
  location: { display: 'Hospital São Lucas' },
};

describe('FhirR4Adapter', () => {
  let adapter: FhirR4Adapter;

  beforeEach(() => { adapter = new FhirR4Adapter(); });

  describe('import', () => {
    it('returns empty payload for empty bundle', async () => {
      const result = await adapter.import(makeFhirBundle([]), ctx);
      expect(result.records).toHaveLength(0);
      expect(result.medications).toHaveLength(0);
      expect(result.allergies).toHaveLength(0);
      expect(result.procedures).toHaveLength(0);
    });

    it('parses Observation resource', async () => {
      const result = await adapter.import(makeFhirBundle([observation]), ctx);
      expect(result.records).toHaveLength(1);
      const r = result.records[0];
      expect(r.recordType).toBe(ClinicalRecordType.OBSERVATION);
      expect(r.code).toBe('8867-4');
      expect(r.codeSystem).toBe('http://loinc.org');
      expect(r.displayName).toBe('Heart rate');
      expect(r.sourceId).toBe('obs-1');
      expect(r.observations).toHaveLength(1);
      expect(r.observations![0].numericValue).toBe(72);
      expect(r.observations![0].unit).toBe('bpm');
      expect(r.observations![0].referenceRange).toBe('60-100 bpm');
      expect(r.observations![0].interpretation).toBe('N');
    });

    it('parses Condition resource', async () => {
      const result = await adapter.import(makeFhirBundle([condition]), ctx);
      expect(result.records).toHaveLength(1);
      const r = result.records[0];
      expect(r.recordType).toBe(ClinicalRecordType.DIAGNOSIS);
      expect(r.code).toBe('44054006');
      expect(r.status).toBe('active');
      expect(r.sourceId).toBe('cond-1');
    });

    it('parses MedicationRequest resource', async () => {
      const result = await adapter.import(makeFhirBundle([medicationRequest]), ctx);
      expect(result.medications).toHaveLength(1);
      const m = result.medications[0];
      expect(m.name).toBe('Metformin 500mg');
      expect(m.code).toBe('A10BA02');
      expect(m.dosage).toBe('500mg twice daily');
      expect(m.route).toBe('oral');
      expect(m.prescribedBy).toBe('Dr. Silva');
      expect(m.sourceId).toBe('med-1');
    });

    it('parses AllergyIntolerance resource and maps criticality', async () => {
      const result = await adapter.import(makeFhirBundle([allergyIntolerance]), ctx);
      expect(result.allergies).toHaveLength(1);
      const a = result.allergies[0];
      expect(a.allergen).toBe('Amoxicillin');
      expect(a.severity).toBe('severe');
      expect(a.reaction).toBe('Rash generalizado');
      expect(a.sourceId).toBe('allergy-1');
    });

    it('parses Procedure resource', async () => {
      const result = await adapter.import(makeFhirBundle([procedure]), ctx);
      expect(result.procedures).toHaveLength(1);
      const p = result.procedures[0];
      expect(p.name).toBe('Appendectomy');
      expect(p.outcome).toBe('Successful procedure');
      expect(p.location).toBe('Hospital São Lucas');
      expect(p.sourceId).toBe('proc-1');
    });

    it('parses a mixed bundle with all resource types', async () => {
      const result = await adapter.import(
        makeFhirBundle([observation, condition, medicationRequest, allergyIntolerance, procedure]),
        ctx,
      );
      expect(result.records).toHaveLength(2);
      expect(result.medications).toHaveLength(1);
      expect(result.allergies).toHaveLength(1);
      expect(result.procedures).toHaveLength(1);
    });

    it('skips unknown resource types', async () => {
      const unknown = { resourceType: 'Patient', id: 'p-1' };
      const result = await adapter.import(makeFhirBundle([unknown, observation]), ctx);
      expect(result.records).toHaveLength(1);
    });
  });

  describe('export', () => {
    it('returns a FHIR Bundle', async () => {
      const records = [{ id: 'r-1', code: '8867-4', codeSystem: 'http://loinc.org', displayName: 'Heart rate', effectiveDate: new Date() }];
      const result = await adapter.export(records, ctx) as { resourceType: string; type: string; entry: unknown[] };
      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('collection');
      expect(result.entry).toHaveLength(1);
    });
  });
});
