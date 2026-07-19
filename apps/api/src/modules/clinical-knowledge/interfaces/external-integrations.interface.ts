/** Open interfaces for future integration with clinical terminology standards. */

export interface IWHOAdapter {
  searchICD10(query: string): Promise<IICD10Concept[]>;
  getICDByCode(code: string): Promise<IICD10Concept | null>;
}

export interface INIHAdapter {
  searchMeSH(query: string): Promise<IMeSHTerm[]>;
  getMeSHByDescriptor(id: string): Promise<IMeSHTerm | null>;
}

export interface IPubMedAdapter {
  searchArticles(query: string, maxResults?: number): Promise<IPubMedArticle[]>;
  getArticleById(pmid: string): Promise<IPubMedArticle | null>;
}

export interface ISnomedAdapter {
  searchConcepts(query: string, limit?: number): Promise<ISnomedConcept[]>;
  getConceptById(conceptId: string): Promise<ISnomedConcept | null>;
  getDescendants(conceptId: string): Promise<ISnomedConcept[]>;
}

export interface ILoincAdapter {
  searchTerms(query: string): Promise<ILoincTerm[]>;
  getTermByCode(loincCode: string): Promise<ILoincTerm | null>;
}

export interface IICD10Adapter {
  getByCode(code: string): Promise<IICD10Concept | null>;
  getChildren(code: string): Promise<IICD10Concept[]>;
  search(query: string): Promise<IICD10Concept[]>;
}

export interface IFHIRTerminologyAdapter {
  expandValueSet(url: string, filter?: string): Promise<IFHIRCoding[]>;
  validateCode(system: string, code: string): Promise<boolean>;
  lookup(system: string, code: string): Promise<IFHIRCoding | null>;
}

// ─── Shared Concepts ─────────────────────────────────────────────────────────

export interface IICD10Concept {
  code: string;
  display: string;
  system: 'http://hl7.org/fhir/sid/icd-10';
  category?: string;
  parentCode?: string;
}

export interface IMeSHTerm {
  descriptorId: string;
  name: string;
  treeNumbers: string[];
  scope?: string;
  synonyms?: string[];
}

export interface IPubMedArticle {
  pmid: string;
  title: string;
  abstract?: string;
  authors: string[];
  publicationDate: string;
  journal: string;
  doi?: string;
  meshTerms?: string[];
}

export interface ISnomedConcept {
  conceptId: string;
  fsn: string;
  preferredTerm: string;
  active: boolean;
  definitionStatus: 'PRIMITIVE' | 'FULLY_DEFINED';
}

export interface ILoincTerm {
  loincNum: string;
  longCommonName: string;
  shortName?: string;
  class?: string;
  system?: string;
  property?: string;
  timeAspect?: string;
  scale?: string;
}

export interface IFHIRCoding {
  system: string;
  code: string;
  display: string;
  version?: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

export interface IExternalKnowledgeRegistry {
  who?: IWHOAdapter;
  nih?: INIHAdapter;
  pubmed?: IPubMedAdapter;
  snomed?: ISnomedAdapter;
  loinc?: ILoincAdapter;
  icd10?: IICD10Adapter;
  fhir?: IFHIRTerminologyAdapter;
}
