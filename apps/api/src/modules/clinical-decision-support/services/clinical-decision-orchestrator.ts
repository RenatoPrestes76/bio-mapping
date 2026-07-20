import { Injectable } from '@nestjs/common';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type {
  ClinicalRecommendationItem,
  EvidenceContribution,
  DecisionType,
  DecisionPriority,
  RecommendationCategory,
} from '../entities/clinical-decision.entity.js';
import type { AnalyzeClinicalDecisionDto } from '../dto/clinical-decision-support.dto.js';
import { ConfidenceScoreEngine } from '../engines/confidence-score.engine.js';
import { ConflictResolverEngine } from '../engines/conflict-resolver.engine.js';
import { ExplanationBuilderEngine } from '../engines/explanation-builder.engine.js';
import { computeDecisionPriority } from '../rules/decision-priority.rules.js';
import type { PrioritySignals } from '../rules/decision-priority.rules.js';
import { PharmacogenomicsService } from '../../pharmacogenomics/pharmacogenomics.service.js';
import { GenomicInterpretationService } from '../../genomic-interpretation/genomic-interpretation.service.js';
import { EvidenceEngineService } from '../../evidence-engine/evidence-engine.service.js';
import { ClinicalReasoningService } from '../../clinical-reasoning/clinical-reasoning.service.js';
import { PersonalizedMedicineService } from '../../personalized-medicine/personalized-medicine.service.js';

const ALL_MODULES = [
  'pharmacogenomics',
  'genomic',
  'evidence',
  'clinical-reasoning',
  'personalized-medicine',
];

function makeRecId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

@Injectable()
export class ClinicalDecisionOrchestrator {
  private readonly confidenceEngine = new ConfidenceScoreEngine();
  private readonly conflictResolver = new ConflictResolverEngine();
  private readonly explanationBuilder = new ExplanationBuilderEngine();

  constructor(
    private readonly pgxService: PharmacogenomicsService,
    private readonly genomicService: GenomicInterpretationService,
    private readonly evidenceService: EvidenceEngineService,
    private readonly clinicalReasoningService: ClinicalReasoningService,
    private readonly personalizedMedicineService: PersonalizedMedicineService,
  ) {}

  async orchestrate(dto: AnalyzeClinicalDecisionDto): Promise<ClinicalDecision> {
    const modulesQueried: string[] = [...ALL_MODULES];
    const modulesWithData: string[] = [];
    const rawRecommendations: ClinicalRecommendationItem[] = [];
    const evidenceContributions: EvidenceContribution[] = [];
    const signals: PrioritySignals = {
      hasContradications: false,
      hasUltraRapidMetabolizer: false,
      hasPoorMetabolizer: false,
      hasPathogenicVariant: false,
      hasLikelyPathogenicVariant: false,
      immediateActionCount: 0,
      highRiskDrugCount: 0,
    };

    // ── Pharmacogenomics ────────────────────────────────────────────────────
    await this.fetchPgx(dto, rawRecommendations, evidenceContributions, signals, modulesWithData);

    // ── Genomic Interpretation ──────────────────────────────────────────────
    await this.fetchGenomic(dto, rawRecommendations, evidenceContributions, signals, modulesWithData);

    // ── Evidence Engine ─────────────────────────────────────────────────────
    await this.fetchEvidence(dto, evidenceContributions, modulesWithData);

    // ── Clinical Reasoning ──────────────────────────────────────────────────
    await this.fetchClinicalReasoning(dto, rawRecommendations, evidenceContributions, modulesWithData);

    // ── Personalized Medicine ───────────────────────────────────────────────
    await this.fetchPersonalizedMedicine(dto, rawRecommendations, evidenceContributions, modulesWithData);

    // ── Conflict Resolution ─────────────────────────────────────────────────
    const { resolvedRecommendations, conflicts } = this.conflictResolver.resolve(rawRecommendations);

    signals.hasContradications = resolvedRecommendations.some(
      (r) => r.contraindications && r.contraindications.length > 0,
    );
    signals.immediateActionCount = resolvedRecommendations.filter((r) => r.urgency === 'IMMEDIATE').length;

    // ── Confidence Score ────────────────────────────────────────────────────
    const confidenceBreakdown = this.confidenceEngine.compute({
      modulesQueried,
      modulesWithData,
      evidenceContributions,
      recommendationCount: resolvedRecommendations.length,
      conflictCount: conflicts.length,
      hasGenomicData: modulesWithData.includes('genomic'),
      hasPgxData: modulesWithData.includes('pharmacogenomics'),
      hasClinicalReasoningData: modulesWithData.includes('clinical-reasoning'),
      hasPersonalizedMedicineData: modulesWithData.includes('personalized-medicine'),
      hasEvidenceData: modulesWithData.includes('evidence'),
    });

    // ── Explanation ─────────────────────────────────────────────────────────
    const explanation = this.explanationBuilder.build({
      recommendations: resolvedRecommendations,
      evidence: evidenceContributions,
      conflicts,
      modulesQueried,
      modulesWithData,
      confidence: confidenceBreakdown.total,
      patientId: dto.patientId,
    });

    // ── Priority ────────────────────────────────────────────────────────────
    const priority: DecisionPriority = computeDecisionPriority(signals);

    return new ClinicalDecision({
      patientId: dto.patientId,
      decisionType: dto.decisionType ?? 'COMPREHENSIVE',
      priority,
      confidence: confidenceBreakdown.total,
      clinicalSummary: explanation.summary,
      recommendations: resolvedRecommendations,
      evidence: evidenceContributions,
      explanation,
      conflictsResolved: conflicts,
      contributingModules: modulesWithData,
    });
  }

  private async fetchPgx(
    dto: AnalyzeClinicalDecisionDto,
    recs: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
    signals: PrioritySignals,
    modulesWithData: string[],
  ): Promise<void> {
    const patientId = dto.pgxPatientId ?? dto.patientId;
    try {
      const pgxRecs = this.pgxService.getRecommendations(patientId);
      if (pgxRecs.length > 0) {
        modulesWithData.push('pharmacogenomics');

        for (const pgxRec of pgxRecs) {
          const isContraindicated = pgxRec.severity === 'CONTRAINDICATED' || pgxRec.severity === 'AVOID';
          const category: RecommendationCategory = 'PHARMACOGENOMICS';

          recs.push({
            id: makeRecId(),
            category,
            action: pgxRec.recommendation,
            rationale: pgxRec.explanation.clinicalRationale,
            urgency: isContraindicated ? 'IMMEDIATE' : pgxRec.isActionable() ? 'SHORT_TERM' : 'ROUTINE',
            confidenceContribution: Math.round((pgxRec.evidence.confidence ?? 0.5) * 100),
            sourceModule: 'pharmacogenomics',
            evidenceLevel: pgxRec.evidence.level,
            contraindications: isContraindicated
              ? [pgxRec.drug]
              : [],
            alternatives: pgxRec.alternativeMedications,
          });

          if (isContraindicated) signals.highRiskDrugCount++;
          if (pgxRec.phenotype === 'POOR_METABOLIZER') signals.hasPoorMetabolizer = true;
          if (pgxRec.phenotype === 'ULTRA_RAPID_METABOLIZER') signals.hasUltraRapidMetabolizer = true;
        }

        evidence.push({
          sourceModule: 'pharmacogenomics',
          evidenceType: 'PHARMACOGENOMIC',
          summary: `PGx analysis: ${pgxRecs.length} drug-gene interaction(s) evaluated`,
          confidenceWeight: 0.9,
          dataCompleteness: 1.0,
        });
      }
    } catch {
      // Patient has no PGx profile — not an error
    }
  }

  private async fetchGenomic(
    dto: AnalyzeClinicalDecisionDto,
    recs: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
    signals: PrioritySignals,
    modulesWithData: string[],
  ): Promise<void> {
    const patientId = dto.genomicPatientId ?? dto.patientId;
    try {
      const report = this.genomicService.generateReport(patientId);
      if (report) {
        modulesWithData.push('genomic');

        const summary = (report.summary as unknown) as Record<string, unknown> | undefined;
        const variants = (summary?.['variantGroups'] as unknown[]) ?? [];

        if (variants.length > 0) {
          recs.push({
            id: makeRecId(),
            category: 'GENOMICS',
            action: `Review genomic report: ${report.variantCount} variant(s) identified`,
            rationale: `Genomic analysis via ACMG framework. ${report.clinicallySignificantCount ?? 0} clinically significant variant(s) found.`,
            urgency: (report.clinicallySignificantCount ?? 0) > 0 ? 'SHORT_TERM' : 'ROUTINE',
            confidenceContribution: 70,
            sourceModule: 'genomic',
            evidenceLevel: 'A',
          });

          if ((report.clinicallySignificantCount ?? 0) > 0) signals.hasPathogenicVariant = true;
        }

        evidence.push({
          sourceModule: 'genomic',
          evidenceType: 'GENOMIC',
          summary: `Genomic report: ${report.variantCount} variant(s), ${report.clinicallySignificantCount ?? 0} clinically significant`,
          confidenceWeight: 0.85,
          dataCompleteness: 0.9,
        });
      }
    } catch {
      // Patient has no genomic data
    }
  }

  private async fetchEvidence(
    dto: AnalyzeClinicalDecisionDto,
    evidence: EvidenceContribution[],
    modulesWithData: string[],
  ): Promise<void> {
    try {
      const topics = dto.evidenceTopics ?? dto.clinicalFindings?.conditions ?? [];
      let evidenceItems: unknown[] = [];

      if (topics.length > 0) {
        for (const topic of topics.slice(0, 3)) {
          const items = this.evidenceService.findByTopic(topic);
          evidenceItems = [...evidenceItems, ...items];
        }
      } else {
        const ranked = this.evidenceService.rank();
        evidenceItems = ranked.slice(0, 5);
      }

      if (evidenceItems.length > 0) {
        modulesWithData.push('evidence');
        evidence.push({
          sourceModule: 'evidence',
          evidenceType: 'CLINICAL_STUDY',
          summary: `${evidenceItems.length} evidence item(s) retrieved from evidence engine`,
          confidenceWeight: 0.7,
          dataCompleteness: Math.min(1, evidenceItems.length / 5),
        });
      }
    } catch {
      // Evidence engine unavailable
    }
  }

  private async fetchClinicalReasoning(
    dto: AnalyzeClinicalDecisionDto,
    recs: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
    modulesWithData: string[],
  ): Promise<void> {
    if (!dto.clinicalReasoningInferenceId) return;

    try {
      const inference = this.clinicalReasoningService.getById(dto.clinicalReasoningInferenceId);
      if (inference) {
        modulesWithData.push('clinical-reasoning');

        const topHypothesis = ((inference as unknown) as Record<string, unknown>)['topHypothesis'] as string | undefined;
        if (topHypothesis) {
          recs.push({
            id: makeRecId(),
            category: 'DIAGNOSTIC',
            action: `Clinical reasoning: ${topHypothesis}`,
            rationale: 'Derived from multi-hypothesis clinical reasoning engine',
            urgency: 'SHORT_TERM',
            confidenceContribution: 65,
            sourceModule: 'clinical-reasoning',
            evidenceLevel: 'B',
          });
        }

        evidence.push({
          sourceModule: 'clinical-reasoning',
          evidenceType: 'CLINICAL_REASONING',
          summary: `Clinical reasoning inference ${dto.clinicalReasoningInferenceId}`,
          confidenceWeight: 0.75,
          dataCompleteness: 0.8,
        });
      }
    } catch {
      // Inference not found
    }
  }

  private async fetchPersonalizedMedicine(
    dto: AnalyzeClinicalDecisionDto,
    recs: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
    modulesWithData: string[],
  ): Promise<void> {
    if (!dto.personalizedMedicineProfileId) return;

    try {
      const profile = this.personalizedMedicineService.getProfile(dto.personalizedMedicineProfileId);
      if (profile) {
        modulesWithData.push('personalized-medicine');

        recs.push({
          id: makeRecId(),
          category: 'MONITORING',
          action: 'Review personalized medicine profile for tailored interventions',
          rationale: 'Profile-based personalized medicine recommendations available',
          urgency: 'ROUTINE',
          confidenceContribution: 60,
          sourceModule: 'personalized-medicine',
          evidenceLevel: 'B',
        });

        evidence.push({
          sourceModule: 'personalized-medicine',
          evidenceType: 'PERSONALIZED',
          summary: `Personalized medicine profile ${dto.personalizedMedicineProfileId} analysed`,
          confidenceWeight: 0.65,
          dataCompleteness: 0.75,
        });
      }
    } catch {
      // Profile not found
    }
  }
}
