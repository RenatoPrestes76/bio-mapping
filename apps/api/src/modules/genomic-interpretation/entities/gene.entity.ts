export interface GeneLocation {
  start: number;
  end: number;
  strand: '+' | '-';
}

export class Gene {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly chromosome: string;
  readonly location: GeneLocation;
  readonly transcripts: string[];
  readonly aliases: string[];
  readonly function: string;
  readonly createdAt: Date;

  constructor(params: {
    id?: string;
    symbol: string;
    name: string;
    chromosome: string;
    location?: GeneLocation;
    transcripts?: string[];
    aliases?: string[];
    function?: string;
  }) {
    this.id = params.id ?? `gene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.symbol = params.symbol.toUpperCase();
    this.name = params.name;
    this.chromosome = params.chromosome.replace(/^chr/i, '');
    this.location = params.location ?? { start: 0, end: 0, strand: '+' };
    this.transcripts = params.transcripts ?? [];
    this.aliases = params.aliases ?? [];
    this.function = params.function ?? '';
    this.createdAt = new Date();
  }

  hasAlias(alias: string): boolean {
    return this.aliases.some((a) => a.toLowerCase() === alias.toLowerCase());
  }

  getTranscriptCount(): number {
    return this.transcripts.length;
  }

  isOnChromosome(chr: string): boolean {
    return this.chromosome.toLowerCase() === chr.replace(/^chr/i, '').toLowerCase();
  }

  getGeneLengthBp(): number {
    return Math.abs(this.location.end - this.location.start);
  }

  matchesSymbol(query: string): boolean {
    return this.symbol.toUpperCase() === query.toUpperCase();
  }
}
