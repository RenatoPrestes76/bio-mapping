export enum EvidenceSource {
  PUBMED = 'PUBMED',
  COCHRANE = 'COCHRANE',
  WHO = 'WHO',
  NIH = 'NIH',
  CLINICAL_TRIALS = 'CLINICAL_TRIALS',
  JOURNAL = 'JOURNAL',
  GUIDELINE = 'GUIDELINE',
  META_ANALYSIS = 'META_ANALYSIS',
  SYSTEMATIC_REVIEW = 'SYSTEMATIC_REVIEW',
}

export enum EvidenceLanguage {
  EN = 'EN',
  PT = 'PT',
  ES = 'ES',
  FR = 'FR',
}

export interface EvidenceData {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: Date | string;
  doi?: string;
  pmid?: string;
  source: EvidenceSource;
  language?: EvidenceLanguage;
  keywords?: string[];
  metadata?: Record<string, unknown>;
}

export class Evidence {
  readonly id: string;
  readonly title: string;
  readonly abstract: string;
  readonly authors: string[];
  readonly journal: string;
  readonly publicationDate: Date;
  readonly doi?: string;
  readonly pmid?: string;
  readonly source: EvidenceSource;
  readonly language: EvidenceLanguage;
  readonly keywords: string[];
  readonly metadata?: Record<string, unknown>;

  constructor(data: EvidenceData) {
    this.id = data.id;
    this.title = data.title;
    this.abstract = data.abstract;
    this.authors = data.authors;
    this.journal = data.journal;
    this.publicationDate =
      data.publicationDate instanceof Date
        ? data.publicationDate
        : new Date(data.publicationDate);
    this.doi = data.doi;
    this.pmid = data.pmid;
    this.source = data.source;
    this.language = data.language ?? EvidenceLanguage.EN;
    this.keywords = data.keywords ?? [];
    this.metadata = data.metadata;
  }

  matchesQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(q) ||
      this.abstract.toLowerCase().includes(q) ||
      this.journal.toLowerCase().includes(q) ||
      this.authors.some((a) => a.toLowerCase().includes(q)) ||
      this.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }

  matchesKeywords(keywords: string[]): boolean {
    return keywords.some((kw) =>
      this.keywords.some((k) => k.toLowerCase().includes(kw.toLowerCase())),
    );
  }

  isRecent(years: number): boolean {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    return this.publicationDate >= cutoff;
  }
}
