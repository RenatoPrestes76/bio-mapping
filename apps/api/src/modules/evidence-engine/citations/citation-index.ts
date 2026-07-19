import { ClinicalCitation } from '../entities/clinical-citation.entity.js';

export class CitationIndex {
  private readonly byEvidence = new Map<string, ClinicalCitation[]>();
  private readonly byRule = new Map<string, ClinicalCitation[]>();
  private readonly byGuideline = new Map<string, ClinicalCitation[]>();
  private readonly all: ClinicalCitation[] = [];

  addCitation(citation: ClinicalCitation): void {
    this.all.push(citation);

    const ev = this.byEvidence.get(citation.evidenceId) ?? [];
    ev.push(citation);
    this.byEvidence.set(citation.evidenceId, ev);

    if (citation.clinicalRuleId) {
      const rule = this.byRule.get(citation.clinicalRuleId) ?? [];
      rule.push(citation);
      this.byRule.set(citation.clinicalRuleId, rule);
    }

    if (citation.guidelineId) {
      const gl = this.byGuideline.get(citation.guidelineId) ?? [];
      gl.push(citation);
      this.byGuideline.set(citation.guidelineId, gl);
    }
  }

  findByEvidenceId(evidenceId: string): ClinicalCitation[] {
    return this.byEvidence.get(evidenceId) ?? [];
  }

  findByRuleId(ruleId: string): ClinicalCitation[] {
    return this.byRule.get(ruleId) ?? [];
  }

  findByGuidelineId(guidelineId: string): ClinicalCitation[] {
    return this.byGuideline.get(guidelineId) ?? [];
  }

  getAllCitations(): ClinicalCitation[] {
    return [...this.all];
  }

  size(): number {
    return this.all.length;
  }

  clear(): void {
    this.byEvidence.clear();
    this.byRule.clear();
    this.byGuideline.clear();
    this.all.length = 0;
  }
}
