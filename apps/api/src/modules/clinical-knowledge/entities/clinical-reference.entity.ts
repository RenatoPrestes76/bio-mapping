export class ClinicalReference {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
  readonly confidence: number;
  readonly language: string;

  constructor(data: {
    id: string;
    title: string;
    description: string;
    tags?: string[];
    confidence?: number;
    language?: string;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.tags = data.tags ?? [];
    this.confidence = Math.min(1, Math.max(0, data.confidence ?? 1));
    this.language = data.language ?? 'pt-BR';
  }

  matchesQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(q) ||
      this.description.toLowerCase().includes(q) ||
      this.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  sharedTagCount(other: ClinicalReference): number {
    return this.tags.filter((t) => other.tags.includes(t)).length;
  }
}
