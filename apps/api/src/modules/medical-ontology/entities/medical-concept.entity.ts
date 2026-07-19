export enum ConceptCategory {
  DISEASE = 'DISEASE',
  SYMPTOM = 'SYMPTOM',
  BIOMARKER = 'BIOMARKER',
  LABORATORY_TEST = 'LABORATORY_TEST',
  MEDICATION = 'MEDICATION',
  SUPPLEMENT = 'SUPPLEMENT',
  NUTRIENT = 'NUTRIENT',
  LIFESTYLE = 'LIFESTYLE',
  EXERCISE = 'EXERCISE',
  SLEEP = 'SLEEP',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  GENETICS = 'GENETICS',
  ORGAN = 'ORGAN',
  SYSTEM = 'SYSTEM',
}

export class MedicalConcept {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly category: ConceptCategory;
  readonly synonyms: string[];
  readonly metadata?: Record<string, unknown>;

  constructor(data: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: ConceptCategory;
    synonyms?: string[];
    metadata?: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.synonyms = data.synonyms ?? [];
    this.metadata = data.metadata;
  }

  matchesQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this.name.toLowerCase().includes(q) ||
      this.code.toLowerCase().includes(q) ||
      this.description.toLowerCase().includes(q) ||
      this.synonyms.some((s) => s.toLowerCase().includes(q))
    );
  }

  hasSynonym(term: string): boolean {
    const t = term.toLowerCase();
    return this.synonyms.some((s) => s.toLowerCase() === t);
  }
}
