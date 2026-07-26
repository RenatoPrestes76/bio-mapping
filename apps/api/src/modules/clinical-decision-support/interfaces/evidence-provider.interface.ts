import type { DecisionEvidence } from '../entities/decision-evidence.entity.js';

export interface EvidenceProvider {
  findByTopic(topic: string): DecisionEvidence[];
  findByGrade(grade: 'A' | 'B' | 'C' | 'D'): DecisionEvidence[];
  attach(evidence: DecisionEvidence): void;
}
