export enum RelationType {
  CAUSES = 'CAUSES',
  ASSOCIATED_WITH = 'ASSOCIATED_WITH',
  INCREASES_RISK = 'INCREASES_RISK',
  DECREASES_RISK = 'DECREASES_RISK',
  INDICATES = 'INDICATES',
  CONTRAINDICATES = 'CONTRAINDICATES',
  TREATED_BY = 'TREATED_BY',
  PREVENTED_BY = 'PREVENTED_BY',
  RELATED_TO = 'RELATED_TO',
  PART_OF = 'PART_OF',
}

export class ConceptRelation {
  readonly id: string;
  readonly sourceConcept: string;
  readonly targetConcept: string;
  readonly relationType: RelationType;
  readonly weight: number;
  readonly confidence: number;

  constructor(data: {
    id: string;
    sourceConcept: string;
    targetConcept: string;
    relationType: RelationType;
    weight?: number;
    confidence?: number;
  }) {
    this.id = data.id;
    this.sourceConcept = data.sourceConcept;
    this.targetConcept = data.targetConcept;
    this.relationType = data.relationType;
    this.weight = Math.min(1, Math.max(0, data.weight ?? 0.5));
    this.confidence = Math.min(1, Math.max(0, data.confidence ?? 0.5));
  }

  isStrong(): boolean {
    return this.weight >= 0.7;
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  score(): number {
    return (this.weight + this.confidence) / 2;
  }
}
