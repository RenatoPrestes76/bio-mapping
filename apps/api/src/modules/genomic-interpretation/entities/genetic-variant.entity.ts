export type Zygosity = 'HOMOZYGOUS' | 'HETEROZYGOUS' | 'HEMIZYGOUS' | 'UNKNOWN';

export type ClinicalSignificance =
  | 'PATHOGENIC'
  | 'LIKELY_PATHOGENIC'
  | 'UNCERTAIN_SIGNIFICANCE'
  | 'LIKELY_BENIGN'
  | 'BENIGN';

export interface HGVSNotation {
  coding?: string;
  protein?: string;
  genomic?: string;
}

export interface PopulationFrequency {
  gnomadAF?: number;
  thousandGenomesAF?: number;
  clinvarAF?: number;
}

export class GeneticVariant {
  readonly id: string;
  readonly geneId: string;
  readonly geneSymbol: string;
  readonly reference: string;
  readonly alternate: string;
  readonly hgvs: HGVSNotation;
  readonly rsid?: string;
  readonly zygosity: Zygosity;
  readonly clinicalSignificance: ClinicalSignificance;
  readonly populationFrequency: PopulationFrequency;
  readonly qualityScore: number;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;

  constructor(params: {
    id?: string;
    geneId: string;
    geneSymbol: string;
    reference: string;
    alternate: string;
    hgvs?: HGVSNotation;
    rsid?: string;
    zygosity?: Zygosity;
    clinicalSignificance?: ClinicalSignificance;
    populationFrequency?: PopulationFrequency;
    qualityScore?: number;
    metadata?: Record<string, unknown>;
  }) {
    this.id = params.id ?? `variant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.geneId = params.geneId;
    this.geneSymbol = params.geneSymbol.toUpperCase();
    this.reference = params.reference;
    this.alternate = params.alternate;
    this.hgvs = params.hgvs ?? {};
    this.rsid = params.rsid;
    this.zygosity = params.zygosity ?? 'UNKNOWN';
    this.clinicalSignificance = params.clinicalSignificance ?? 'UNCERTAIN_SIGNIFICANCE';
    this.populationFrequency = params.populationFrequency ?? {};
    this.qualityScore = Math.min(100, Math.max(0, params.qualityScore ?? 0));
    this.metadata = params.metadata ?? {};
    this.createdAt = new Date();
  }

  isPathogenic(): boolean {
    return this.clinicalSignificance === 'PATHOGENIC';
  }

  isLikelyPathogenic(): boolean {
    return this.clinicalSignificance === 'LIKELY_PATHOGENIC';
  }

  isLikelyClinicallySignificant(): boolean {
    return this.clinicalSignificance === 'PATHOGENIC' || this.clinicalSignificance === 'LIKELY_PATHOGENIC';
  }

  isLikelyBenignOrBenign(): boolean {
    return this.clinicalSignificance === 'BENIGN' || this.clinicalSignificance === 'LIKELY_BENIGN';
  }

  isRare(): boolean {
    return this.getMaxPopulationFrequency() < 0.01;
  }

  isVeryRare(): boolean {
    return this.getMaxPopulationFrequency() < 0.001;
  }

  isHighQuality(): boolean {
    return this.qualityScore >= 80;
  }

  getMaxPopulationFrequency(): number {
    const { gnomadAF, thousandGenomesAF, clinvarAF } = this.populationFrequency;
    const freqs = [gnomadAF, thousandGenomesAF, clinvarAF].filter((f): f is number => f !== undefined);
    return freqs.length > 0 ? Math.max(...freqs) : 0;
  }

  isSnv(): boolean {
    return this.reference.length === 1 && this.alternate.length === 1;
  }

  isIndel(): boolean {
    return this.reference.length !== this.alternate.length;
  }

  withClinicalSignificance(sig: ClinicalSignificance): GeneticVariant {
    return new GeneticVariant({
      id: this.id,
      geneId: this.geneId,
      geneSymbol: this.geneSymbol,
      reference: this.reference,
      alternate: this.alternate,
      hgvs: this.hgvs,
      rsid: this.rsid,
      zygosity: this.zygosity,
      clinicalSignificance: sig,
      populationFrequency: this.populationFrequency,
      qualityScore: this.qualityScore,
      metadata: this.metadata,
    });
  }
}
