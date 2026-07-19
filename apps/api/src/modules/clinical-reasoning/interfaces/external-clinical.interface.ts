export interface IFHIRCondition {
  resourceType: 'Condition';
  id: string;
  code: { coding: { system: string; code: string; display: string }[] };
  subject: { reference: string };
  onsetDateTime?: string;
  clinicalStatus?: { coding: { code: string }[] };
}

export interface IFHIRObservation {
  resourceType: 'Observation';
  id: string;
  code: { coding: { system: string; code: string; display: string }[] };
  valueQuantity?: { value: number; unit: string };
  subject: { reference: string };
  effectiveDateTime?: string;
}

export interface IFHIRPatient {
  resourceType: 'Patient';
  id: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  name?: { family?: string; given?: string[] }[];
}

export interface ICDSHooksCard {
  summary: string;
  detail?: string;
  indicator: 'info' | 'warning' | 'critical';
  source: { label: string; url?: string };
  suggestions?: { label: string; actions?: { type: string; resource?: unknown }[] }[];
}

export interface ICDSHooksRequest {
  hookInstance: string;
  hook: string;
  context: {
    patientId: string;
    encounterId?: string;
    draftOrders?: unknown;
  };
  prefetch?: Record<string, unknown>;
}

export interface ICDSHooksResponse {
  cards: ICDSHooksCard[];
  systemActions?: unknown[];
}

export interface ISMARTOnFHIRLaunchContext {
  iss: string;
  launch: string;
  clientId: string;
  scope: string;
}

export interface IOpenEHRComposition {
  archetype_id: { value: string };
  uid: { value: string };
  language: { code_string: string };
  territory: { code_string: string };
  content: unknown[];
}

export interface IOpenClinicalRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  evidenceGrade: string;
}

export interface IFHIRReasoningAdapter {
  importPatient(fhirPatient: IFHIRPatient): Promise<unknown>;
  exportClinicalConcept(hypothesisId: string): Promise<IFHIRCondition>;
  buildCDSCard(hypothesisId: string): Promise<ICDSHooksCard>;
}

export interface ICDSHooksAdapter {
  handleRequest(request: ICDSHooksRequest): Promise<ICDSHooksResponse>;
  buildCardsFromInference(inferenceId: string): Promise<ICDSHooksCard[]>;
}

export interface IOpenEHRAdapter {
  importComposition(composition: IOpenEHRComposition): Promise<unknown>;
  exportToEHR(inferenceId: string): Promise<IOpenEHRComposition>;
}

export interface IExternalClinicalRegistry {
  fhir?: IFHIRReasoningAdapter;
  cdsHooks?: ICDSHooksAdapter;
  openEHR?: IOpenEHRAdapter;
}
