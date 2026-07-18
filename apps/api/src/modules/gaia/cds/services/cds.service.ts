import { Injectable, NotFoundException } from '@nestjs/common';
import type { CdsEvaluation, CdsFeedback } from '@bio/database';
import { CdsRepository } from '../repositories/cds.repository.js';
import { AlertManagerService } from './alert-manager.service.js';
import { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import { applyRules, DEFAULT_RULES, type CdsRuleDefinition, type ClinicalVariables } from '../engine/rule-engine.js';
import { calculatePriorityScore, determinePriority, requiresMedicalReview } from '../engine/priority-calculator.js';
import { calculateConfidence, calculateDataQuality, evidenceQualityScore } from '../engine/confidence-calculator.js';
import {
  aggregateRecommendation,
  buildReasons,
  buildWeightsMap,
  determineEvidenceLevel,
  resolveHighestPriority,
} from '../engine/recommendation-aggregator.js';
import type { EvaluateCdsDto } from '../dto/evaluate-cds.dto.js';
import type { DecisionFeedbackDto } from '../dto/decision-feedback.dto.js';

const CDS_VERSION = '1.0';
const MODELS_USED = ['rule-engine', 'priority-calculator', 'confidence-calculator', 'recommendation-aggregator'];

export interface CdsExplanation {
  evaluation: CdsEvaluation;
  reasons: string[];
  variables: Record<string, unknown>;
  weights: Record<string, unknown>;
  rulesTriggered: unknown[];
  modelsUsed: string[];
  confidenceInterpretation: string;
  slaHours: number;
  priorityColor: string;
}

@Injectable()
export class CdsService {
  constructor(
    private readonly repository: CdsRepository,
    private readonly alertManager: AlertManagerService,
    private readonly audit: AuditLogService,
  ) {}

  async evaluate(dto: EvaluateCdsDto, evaluatedBy: string): Promise<CdsEvaluation> {
    const start = Date.now();

    // 1. Load custom DB rules and merge with built-in defaults
    const dbRules = await this.repository.findActiveRules();
    const allRules: CdsRuleDefinition[] = [
      ...DEFAULT_RULES,
      ...dbRules.map((r) => ({
        id: r.id,
        name: r.name,
        conditions: r.conditions as unknown as CdsRuleDefinition['conditions'],
        conjunction: (r.conjunction as 'AND' | 'OR') ?? 'AND',
        priority: r.priority as CdsRuleDefinition['priority'],
        recommendation: r.recommendation,
        evidenceLevel: r.evidenceLevel as string,
      })),
    ];

    // 2. Apply rule engine
    const variables = dto.variables as ClinicalVariables;
    const matchedRules = applyRules(allRules, variables);

    // 3. Calculate priority
    const score = calculatePriorityScore(matchedRules);
    const priority = determinePriority(score);

    // 4. Calculate confidence
    const dataQuality = calculateDataQuality(variables as Record<string, unknown>);
    const topEvidenceLevel = determineEvidenceLevel(matchedRules);
    const confidence = calculateConfidence({
      examCount: dto.examCount ?? 1,
      evidenceQuality: evidenceQualityScore(topEvidenceLevel),
      clinicalConsistency: matchedRules.length > 0 ? 0.85 : 0.5,
      biomarkerCount: dto.biomarkerCount ?? 0,
      hasLongitudinalHistory: dto.hasLongitudinalHistory ?? false,
      dataQuality,
    });

    // 5. Aggregate recommendation + reasons
    const recommendation = aggregateRecommendation({
      matchedRules,
      predictionRecommendations: dto.predictionData ? Object.values(dto.predictionData).filter((v): v is string => typeof v === 'string') : [],
      riskRecommendations: dto.riskData ? Object.values(dto.riskData).filter((v): v is string => typeof v === 'string') : [],
      resolvedPriority: priority,
    });

    const reasons = buildReasons({
      matchedRules,
      predictionRecommendations: dto.predictionData ? Object.values(dto.predictionData).filter((v): v is string => typeof v === 'string') : [],
      riskRecommendations: dto.riskData ? Object.values(dto.riskData).filter((v): v is string => typeof v === 'string') : [],
      resolvedPriority: priority,
    });

    const weights = buildWeightsMap(matchedRules);
    const evidenceLevel = (topEvidenceLevel === 'EXPERT_OPINION' ? 'D' : topEvidenceLevel) as Parameters<typeof this.repository.createEvaluation>[0]['evidenceLevel'];

    const processingTimeMs = Date.now() - start;

    // 6. Persist evaluation
    const evaluation = await this.repository.createEvaluation({
      patientId: dto.patientId,
      evaluatedBy,
      priority,
      confidence,
      recommendation,
      reasons,
      evidenceLevel,
      requiresMedicalReview: requiresMedicalReview(priority),
      variables: variables as Record<string, unknown>,
      weights,
      rulesTriggered: matchedRules.map((r) => ({ id: r.ruleId, name: r.ruleName, priority: r.priority })),
      modelsUsed: MODELS_USED,
      inputData: { ...dto },
      processingTimeMs,
      version: CDS_VERSION,
    });

    // 7. Generate alert if needed
    if (this.alertManager.shouldAlert(priority)) {
      await this.alertManager.createAlert({
        patientId: dto.patientId,
        evaluationId: evaluation.id,
        priority,
        reason: recommendation,
        origin: 'CDS Engine v' + CDS_VERSION,
      });
    }

    // 8. Audit
    await this.audit.log('CDS_EVALUATED', {
      userId: evaluatedBy,
      metadata: { evaluationId: evaluation.id, patientId: dto.patientId, priority, confidence, processingTimeMs },
    });

    return evaluation;
  }

  async findById(id: string): Promise<CdsEvaluation> {
    const evaluation = await this.repository.findEvaluationById(id);
    if (!evaluation) throw new NotFoundException('CDS evaluation not found');
    return evaluation;
  }

  async findHistory(patientId: string, limit?: number): Promise<CdsEvaluation[]> {
    return this.repository.findHistory(patientId, limit);
  }

  async recalculate(id: string, userId: string): Promise<CdsEvaluation> {
    const existing = await this.findById(id);
    const inputData = existing.inputData as EvaluateCdsDto | null;
    if (!inputData) throw new NotFoundException('Original input data not available for recalculation');

    await this.audit.log('CDS_RECALCULATED', { userId, metadata: { originalId: id, patientId: existing.patientId } });
    return this.evaluate(inputData, userId);
  }

  async getExplanation(id: string): Promise<CdsExplanation> {
    const evaluation = await this.findById(id);

    const { getPriorityBand } = await import('../engine/priority-calculator.js');
    const { interpretConfidence } = await import('../engine/confidence-calculator.js');

    const band = getPriorityBand(evaluation.priority);

    return {
      evaluation,
      reasons: (evaluation.reasons as string[]) ?? [],
      variables: (evaluation.variables as Record<string, unknown>) ?? {},
      weights: (evaluation.weights as Record<string, unknown>) ?? {},
      rulesTriggered: (evaluation.rulesTriggered as unknown[]) ?? [],
      modelsUsed: (evaluation.modelsUsed as string[]) ?? [],
      confidenceInterpretation: interpretConfidence(evaluation.confidence),
      slaHours: band.slaHours,
      priorityColor: band.color,
    };
  }

  async addFeedback(evaluationId: string, dto: DecisionFeedbackDto, userId: string): Promise<CdsFeedback> {
    await this.findById(evaluationId);
    const feedback = await this.repository.createFeedback({ evaluationId, userId, ...dto });
    await this.audit.log('CDS_FEEDBACK_ADDED', { userId, metadata: { evaluationId, rating: dto.rating } });
    return feedback;
  }

  async getAlerts(patientId: string, unreadOnly?: boolean) {
    return this.alertManager.getAlerts(patientId, unreadOnly);
  }

  async markAlertRead(alertId: string) {
    return this.alertManager.markRead(alertId);
  }

  async createRule(data: Parameters<CdsRepository['createRule']>[0], userId: string) {
    const rule = await this.repository.createRule(data);
    await this.audit.log('CDS_RULE_CREATED', { userId, metadata: { ruleId: rule.id, name: rule.name } });
    return rule;
  }
}
