export interface IPubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  doi?: string;
  keywords?: string[];
  meshTerms?: string[];
  citationCount?: number;
}

export interface ICochraneReview {
  id: string;
  title: string;
  abstract: string;
  reviewGroup: string;
  publicationDate: string;
  doi: string;
  conclusions: string;
  lastUpdated?: string;
  picos?: {
    population: string;
    intervention: string;
    comparison: string;
    outcome: string;
  };
}

export interface IWHOGuidelineDocument {
  id: string;
  title: string;
  publicationDate: string;
  url: string;
  recommendations: string[];
  evidenceBase?: string;
  targetPopulation?: string;
}

export interface INIHStudy {
  grantNumber: string;
  title: string;
  abstract: string;
  principalInvestigator: string;
  institution: string;
  startDate: string;
  endDate?: string;
  fundingAmount?: number;
}

export interface IClinicalTrial {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  conditions: string[];
  interventions: string[];
  startDate: string;
  primaryCompletionDate?: string;
  resultsAvailable: boolean;
  enrollmentCount?: number;
  sponsor?: string;
}

export interface IPubMedAdapter {
  search(query: string, maxResults?: number): Promise<IPubMedArticle[]>;
  findByPmid(pmid: string): Promise<IPubMedArticle | null>;
  findRelated(pmid: string, maxResults?: number): Promise<IPubMedArticle[]>;
  fetchCitations(pmid: string): Promise<number>;
}

export interface ICochraneAdapter {
  search(query: string, maxResults?: number): Promise<ICochraneReview[]>;
  findById(id: string): Promise<ICochraneReview | null>;
  getByReviewGroup(group: string): Promise<ICochraneReview[]>;
}

export interface IWHOAdapter {
  searchGuidelines(query: string): Promise<IWHOGuidelineDocument[]>;
  findByTopic(topic: string): Promise<IWHOGuidelineDocument[]>;
  getLatestGuidelines(): Promise<IWHOGuidelineDocument[]>;
}

export interface INIHAdapter {
  searchStudies(query: string): Promise<INIHStudy[]>;
  findByGrant(grantNumber: string): Promise<INIHStudy | null>;
  findByPrincipalInvestigator(name: string): Promise<INIHStudy[]>;
}

export interface IClinicalTrialsAdapter {
  search(query: string, maxResults?: number): Promise<IClinicalTrial[]>;
  findByNctId(nctId: string): Promise<IClinicalTrial | null>;
  findByCondition(condition: string): Promise<IClinicalTrial[]>;
  findByStatus(status: string): Promise<IClinicalTrial[]>;
}

export interface IExternalEvidenceRegistry {
  pubmed?: IPubMedAdapter;
  cochrane?: ICochraneAdapter;
  who?: IWHOAdapter;
  nih?: INIHAdapter;
  clinicalTrials?: IClinicalTrialsAdapter;
}
