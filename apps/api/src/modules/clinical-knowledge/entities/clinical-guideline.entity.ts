export class ClinicalGuideline {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly version: string;
  readonly publishedAt: Date;
  readonly url?: string;
  readonly metadata?: Record<string, unknown>;
  readonly tags: string[];

  constructor(data: {
    id: string;
    title: string;
    organization: string;
    version: string;
    publishedAt: Date | string;
    url?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) {
    this.id = data.id;
    this.title = data.title;
    this.organization = data.organization;
    this.version = data.version;
    this.publishedAt = data.publishedAt instanceof Date ? data.publishedAt : new Date(data.publishedAt);
    this.url = data.url;
    this.metadata = data.metadata;
    this.tags = data.tags ?? [];
  }

  matchesQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(q) ||
      this.organization.toLowerCase().includes(q) ||
      this.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
}
