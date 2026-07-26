import type { DecisionEvidence } from '../entities/decision-evidence.entity.js';

export class EvidenceRegistry {
  private readonly byTopic = new Map<string, DecisionEvidence[]>();
  private readonly byId = new Map<string, DecisionEvidence>();

  attach(evidence: DecisionEvidence): void {
    const topicKey = evidence.topic.toLowerCase();
    const existing = this.byTopic.get(topicKey) ?? [];
    const isDuplicate = evidence.guidelineId
      ? existing.some((e) => e.guidelineId === evidence.guidelineId)
      : false;

    if (!isDuplicate) {
      this.byId.set(evidence.id, evidence);
      this.byTopic.set(topicKey, [...existing, evidence]);
    }
  }

  attachAll(evidenceList: DecisionEvidence[]): void {
    for (const e of evidenceList) this.attach(e);
  }

  findByTopic(topic: string): DecisionEvidence[] {
    return this.byTopic.get(topic.toLowerCase()) ?? [];
  }

  findByGrade(grade: 'A' | 'B' | 'C' | 'D'): DecisionEvidence[] {
    return [...this.byId.values()].filter((e) => e.gradeLevel === grade);
  }

  getById(id: string): DecisionEvidence | undefined {
    return this.byId.get(id);
  }

  getHighQuality(): DecisionEvidence[] {
    return [...this.byId.values()].filter((e) => e.isHighQuality());
  }

  getAllTopics(): string[] {
    return [...this.byTopic.keys()];
  }

  totalCount(): number {
    return this.byId.size;
  }
}
