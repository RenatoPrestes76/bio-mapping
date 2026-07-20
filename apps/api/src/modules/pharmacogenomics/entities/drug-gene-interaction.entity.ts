export type MetabolicPhenotype =
  | 'POOR_METABOLIZER'
  | 'INTERMEDIATE_METABOLIZER'
  | 'NORMAL_METABOLIZER'
  | 'RAPID_METABOLIZER'
  | 'ULTRA_RAPID_METABOLIZER'
  | 'UNKNOWN';

export type RecommendationSeverity =
  | 'CONTRAINDICATED'
  | 'AVOID'
  | 'USE_WITH_CAUTION'
  | 'DOSE_REDUCTION'
  | 'DOSE_INCREASE'
  | 'MONITOR'
  | 'NO_ACTION_NEEDED';

export type PGxEvidenceLevel = 'A' | 'B' | 'C' | 'D';

export interface DoseAdjustment {
  factor: number;
  description: string;
}

export class DrugGeneInteraction {
  readonly id: string;
  readonly drugName: string;
  readonly gene: string;
  readonly phenotype: MetabolicPhenotype;
  readonly severity: RecommendationSeverity;
  readonly recommendation: string;
  readonly alternativeMedications: string[];
  readonly evidenceLevel: PGxEvidenceLevel;
  readonly source: string;
  readonly clinicalRationale: string;
  readonly doseAdjustment?: DoseAdjustment;
  readonly notes?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: string;
    drugName: string;
    gene: string;
    phenotype: MetabolicPhenotype;
    severity: RecommendationSeverity;
    recommendation: string;
    alternativeMedications?: string[];
    evidenceLevel?: PGxEvidenceLevel;
    source?: string;
    clinicalRationale?: string;
    doseAdjustment?: DoseAdjustment;
    notes?: string;
  }) {
    this.id = params.id ?? `dgi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.drugName = params.drugName.toLowerCase();
    this.gene = params.gene.toUpperCase();
    this.phenotype = params.phenotype;
    this.severity = params.severity;
    this.recommendation = params.recommendation;
    this.alternativeMedications = params.alternativeMedications ?? [];
    this.evidenceLevel = params.evidenceLevel ?? 'C';
    this.source = params.source ?? 'CPIC';
    this.clinicalRationale = params.clinicalRationale ?? '';
    this.doseAdjustment = params.doseAdjustment;
    this.notes = params.notes;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  isHighEvidence(): boolean {
    return this.evidenceLevel === 'A' || this.evidenceLevel === 'B';
  }

  isContraindicated(): boolean {
    return this.severity === 'CONTRAINDICATED';
  }

  requiresDoseAdjustment(): boolean {
    return this.severity === 'DOSE_REDUCTION' || this.severity === 'DOSE_INCREASE' || this.doseAdjustment !== undefined;
  }

  requiresClinicalAction(): boolean {
    return this.severity !== 'NO_ACTION_NEEDED' && this.severity !== 'MONITOR';
  }
}
