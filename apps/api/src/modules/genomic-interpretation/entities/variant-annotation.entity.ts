export type VariantImpact = 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';

export type VariantConsequence =
  | 'MISSENSE_VARIANT'
  | 'STOP_GAINED'
  | 'FRAMESHIFT_VARIANT'
  | 'SPLICE_SITE_VARIANT'
  | 'SYNONYMOUS_VARIANT'
  | 'INTRONIC_VARIANT'
  | 'INTERGENIC_VARIANT'
  | 'STOP_LOST'
  | 'START_LOST'
  | 'REGULATORY_VARIANT'
  | 'INFRAME_INSERTION'
  | 'INFRAME_DELETION'
  | 'THREE_PRIME_UTR'
  | 'FIVE_PRIME_UTR'
  | 'SPLICE_REGION_VARIANT';

export interface PredictedEffect {
  sift?: 'TOLERATED' | 'DELETERIOUS';
  siftScore?: number;
  polyphen?: 'BENIGN' | 'POSSIBLY_DAMAGING' | 'PROBABLY_DAMAGING';
  polyphenScore?: number;
  cadd?: number;
  revel?: number;
}

export interface AnnotationEvidence {
  source: 'CLINVAR' | 'OMIM' | 'GWAS' | 'LITERATURE' | 'FUNCTIONAL' | 'POPULATION';
  type: string;
  description: string;
  pmid?: string;
}

export class VariantAnnotation {
  readonly id: string;
  readonly variantId: string;
  readonly impact: VariantImpact;
  readonly consequence: VariantConsequence;
  readonly predictedEffect: PredictedEffect;
  readonly associatedConditions: string[];
  readonly evidence: AnnotationEvidence[];
  readonly confidence: number;
  readonly annotatedAt: Date;

  constructor(params: {
    id?: string;
    variantId: string;
    impact: VariantImpact;
    consequence: VariantConsequence;
    predictedEffect?: PredictedEffect;
    associatedConditions?: string[];
    evidence?: AnnotationEvidence[];
    confidence?: number;
  }) {
    this.id = params.id ?? `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.variantId = params.variantId;
    this.impact = params.impact;
    this.consequence = params.consequence;
    this.predictedEffect = params.predictedEffect ?? {};
    this.associatedConditions = params.associatedConditions ?? [];
    this.evidence = params.evidence ?? [];
    this.confidence = Math.min(1, Math.max(0, params.confidence ?? 0.5));
    this.annotatedAt = new Date();
  }

  isHighImpact(): boolean {
    return this.impact === 'HIGH';
  }

  isModeratePlusImpact(): boolean {
    return this.impact === 'HIGH' || this.impact === 'MODERATE';
  }

  hasStrongEvidence(): boolean {
    return this.evidence.some((e) => e.source === 'CLINVAR' || e.source === 'FUNCTIONAL');
  }

  getDeleteriousPredictions(): string[] {
    const result: string[] = [];
    if (this.predictedEffect.sift === 'DELETERIOUS') result.push('SIFT:DELETERIOUS');
    if (this.predictedEffect.polyphen === 'PROBABLY_DAMAGING') result.push('PolyPhen:PROBABLY_DAMAGING');
    if (this.predictedEffect.polyphen === 'POSSIBLY_DAMAGING') result.push('PolyPhen:POSSIBLY_DAMAGING');
    if (this.predictedEffect.cadd && this.predictedEffect.cadd >= 20) result.push(`CADD:${this.predictedEffect.cadd}`);
    if (this.predictedEffect.revel && this.predictedEffect.revel >= 0.75) result.push(`REVEL:${this.predictedEffect.revel}`);
    return result;
  }

  isLikelyDeleterious(): boolean {
    return this.getDeleteriousPredictions().length >= 2;
  }

  getEvidenceCount(): number {
    return this.evidence.length;
  }
}
