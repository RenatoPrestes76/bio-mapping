/** Open interfaces for future integration with medical terminology systems. */

export interface ISnomedCTAdapter {
  searchConcepts(query: string, limit?: number): Promise<ISnomedConcept[]>;
  getConceptById(sctid: string): Promise<ISnomedConcept | null>;
  getDescendants(sctid: string): Promise<ISnomedConcept[]>;
  getAncestors(sctid: string): Promise<ISnomedConcept[]>;
}

export interface IICD10Adapter {
  getByCode(code: string): Promise<IICD10Entry | null>;
  getChildren(code: string): Promise<IICD10Entry[]>;
  search(query: string): Promise<IICD10Entry[]>;
}

export interface IICD11Adapter {
  searchEntities(query: string): Promise<IICD11Entity[]>;
  getEntityById(id: string): Promise<IICD11Entity | null>;
  getLinearizationView(entityId: string): Promise<IICD11Entity | null>;
}

export interface ILOINCAdapter {
  searchTerms(query: string): Promise<ILoincTerm[]>;
  getTermByCode(loincNum: string): Promise<ILoincTerm | null>;
  getRelatedTerms(loincNum: string): Promise<ILoincTerm[]>;
}

export interface IRxNormAdapter {
  searchDrugs(query: string): Promise<IRxNormDrug[]>;
  getDrugById(rxcui: string): Promise<IRxNormDrug | null>;
  getInteractions(rxcui: string): Promise<IDrugInteraction[]>;
}

export interface IUMLSAdapter {
  searchConcepts(query: string, sabs?: string[]): Promise<IUMLSConcept[]>;
  getConceptById(cui: string): Promise<IUMLSConcept | null>;
  getRelations(cui: string): Promise<IUMLSRelation[]>;
}

export interface IFHIRTerminologyAdapter {
  expandValueSet(url: string, filter?: string): Promise<IFHIRCoding[]>;
  validateCode(system: string, code: string): Promise<boolean>;
  lookup(system: string, code: string): Promise<IFHIRCoding | null>;
  translate(system: string, code: string, targetSystem: string): Promise<IFHIRCoding | null>;
}

// ─── Shared Terminology Concepts ─────────────────────────────────────────────

export interface ISnomedConcept {
  conceptId: string;
  fsn: string;
  preferredTerm: string;
  active: boolean;
  definitionStatus: 'PRIMITIVE' | 'FULLY_DEFINED';
  parents?: string[];
}

export interface IICD10Entry {
  code: string;
  display: string;
  definition?: string;
  parentCode?: string;
  isLeaf: boolean;
}

export interface IICD11Entity {
  id: string;
  title: string;
  definition?: string;
  synonyms?: string[];
  codeRange?: string;
}

export interface ILoincTerm {
  loincNum: string;
  longCommonName: string;
  shortName?: string;
  class?: string;
  system?: string;
  scale?: string;
  method?: string;
}

export interface IRxNormDrug {
  rxcui: string;
  name: string;
  tty: string;
  language?: string;
  suppress?: string;
}

export interface IDrugInteraction {
  minConcept1: IRxNormDrug;
  minConcept2: IRxNormDrug;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
}

export interface IUMLSConcept {
  cui: string;
  name: string;
  semanticTypes: string[];
  sources: string[];
}

export interface IUMLSRelation {
  cui1: string;
  cui2: string;
  rel: string;
  rela?: string;
  src: string;
}

export interface IFHIRCoding {
  system: string;
  code: string;
  display: string;
  version?: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

export interface IExternalOntologyRegistry {
  snomed?: ISnomedCTAdapter;
  icd10?: IICD10Adapter;
  icd11?: IICD11Adapter;
  loinc?: ILOINCAdapter;
  rxnorm?: IRxNormAdapter;
  umls?: IUMLSAdapter;
  fhir?: IFHIRTerminologyAdapter;
}
