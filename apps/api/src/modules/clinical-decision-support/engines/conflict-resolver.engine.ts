import type { ClinicalRecommendationItem, ConflictRecord } from '../entities/clinical-decision.entity.js';

export interface ConflictResolutionResult {
  resolvedRecommendations: ClinicalRecommendationItem[];
  conflicts: ConflictRecord[];
}

export class ConflictResolverEngine {
  resolve(recommendations: ClinicalRecommendationItem[]): ConflictResolutionResult {
    const conflicts: ConflictRecord[] = [];
    let active = [...recommendations];

    active = this.resolveContraindications(active, conflicts);
    active = this.resolveDuplicates(active, conflicts);
    active = this.resolveEvidenceConflicts(active, conflicts);

    return { resolvedRecommendations: active, conflicts };
  }

  private resolveContraindications(
    recs: ClinicalRecommendationItem[],
    conflicts: ConflictRecord[],
  ): ClinicalRecommendationItem[] {
    const contraindicated = recs.filter(
      (r) => r.contraindications && r.contraindications.length > 0,
    );

    if (contraindicated.length === 0) return recs;

    const contraindicatedTargets = new Set<string>();
    for (const rec of contraindicated) {
      for (const ci of rec.contraindications ?? []) {
        contraindicatedTargets.add(ci.toLowerCase());
      }
    }

    const suppressed: ClinicalRecommendationItem[] = [];
    const kept: ClinicalRecommendationItem[] = [];

    for (const rec of recs) {
      const isContraindicated = contraindicatedTargets.has(rec.action.toLowerCase()) ||
        [...contraindicatedTargets].some((ci) => rec.action.toLowerCase().includes(ci));

      // A recommendation that lists itself as contraindicated is a "do not use" warning — keep it
      if (isContraindicated && !contraindicated.includes(rec)) {
        suppressed.push(rec);
      } else {
        kept.push(rec);
      }
    }

    if (suppressed.length > 0) {
      conflicts.push({
        id: `conflict-ci-${Date.now()}`,
        conflictType: 'DRUG_CONTRAINDICATION',
        description: `${suppressed.length} recommendation(s) suppressed due to contraindication flags from pharmacogenomics or genomic analysis.`,
        resolution: 'Contraindicated recommendations removed; warning recommendations retained.',
        resolutionStrategy: 'CONTRAINDICATION_WINS',
        affectedRecommendations: suppressed.map((r) => r.id),
        resolvedAt: new Date(),
      });
    }

    return kept;
  }

  private resolveDuplicates(
    recs: ClinicalRecommendationItem[],
    conflicts: ConflictRecord[],
  ): ClinicalRecommendationItem[] {
    const seen = new Map<string, ClinicalRecommendationItem>();
    const removed: ClinicalRecommendationItem[] = [];

    for (const rec of recs) {
      const key = rec.action.toLowerCase().trim();
      const existing = seen.get(key);

      if (existing) {
        if (rec.confidenceContribution > existing.confidenceContribution) {
          removed.push(existing);
          seen.set(key, rec);
        } else {
          removed.push(rec);
        }
      } else {
        seen.set(key, rec);
      }
    }

    if (removed.length > 0) {
      conflicts.push({
        id: `conflict-dup-${Date.now()}`,
        conflictType: 'DUPLICATE_THERAPY',
        description: `${removed.length} duplicate recommendation(s) identified and de-duplicated.`,
        resolution: 'Highest-confidence version of each duplicate retained.',
        resolutionStrategy: 'EVIDENCE_HIERARCHY',
        affectedRecommendations: removed.map((r) => r.id),
        resolvedAt: new Date(),
      });
    }

    return [...seen.values()];
  }

  private resolveEvidenceConflicts(
    recs: ClinicalRecommendationItem[],
    conflicts: ConflictRecord[],
  ): ClinicalRecommendationItem[] {
    const evidenceLevelOrder: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
    const byCategory = new Map<string, ClinicalRecommendationItem[]>();

    for (const rec of recs) {
      const key = `${rec.category}`;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(rec);
    }

    const result: ClinicalRecommendationItem[] = [];

    for (const [, group] of byCategory) {
      if (group.length <= 1) {
        result.push(...group);
        continue;
      }

      // Sort by evidence level then by confidence
      const sorted = group.sort((a, b) => {
        const aLevel = evidenceLevelOrder[a.evidenceLevel ?? 'D'] ?? 1;
        const bLevel = evidenceLevelOrder[b.evidenceLevel ?? 'D'] ?? 1;
        if (bLevel !== aLevel) return bLevel - aLevel;
        return b.confidenceContribution - a.confidenceContribution;
      });

      result.push(...sorted);
    }

    return result;
  }

  detectConflicts(recommendations: ClinicalRecommendationItem[]): string[] {
    const issues: string[] = [];

    const contraindicationRecs = recommendations.filter(
      (r) => r.contraindications && r.contraindications.length > 0,
    );
    if (contraindicationRecs.length > 0) {
      issues.push(`${contraindicationRecs.length} recommendation(s) with active contraindications`);
    }

    const byAction = new Map<string, number>();
    for (const r of recommendations) {
      const key = r.action.toLowerCase();
      byAction.set(key, (byAction.get(key) ?? 0) + 1);
    }
    const dups = [...byAction.entries()].filter(([, n]) => n > 1);
    if (dups.length > 0) {
      issues.push(`${dups.length} duplicate action(s) detected`);
    }

    return issues;
  }
}
