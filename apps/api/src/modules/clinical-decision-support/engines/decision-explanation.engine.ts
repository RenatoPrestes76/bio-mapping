import type { ClinicalRecommendationItem, EvidenceContribution, ConflictRecord } from '../entities/clinical-decision.entity.js';
import type { DecisionEvidence } from '../entities/decision-evidence.entity.js';
import type { ClinicalAlert } from '../entities/clinical-alert.entity.js';
import type { Contraindication } from '../entities/contraindication.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface AthenaClinicalExplanation {
  why: string;
  how: string;
  whichEvidences: string[];
  confidenceLevel: string;
  confidenceScore: number;
  keyAlerts: string[];
  contraindicationsDetected: string[];
  modulesContributed: string[];
  reasoning: string[];
  limitations: string[];
  dataCompleteness: number;
}

function confidenceLabel(score: number): string {
  if (score >= 85) return 'Very High (A-Grade Evidence)';
  if (score >= 70) return 'High (B-Grade Evidence)';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Low — Additional Data Recommended';
  return 'Very Low — Clinical Review Required';
}

export class DecisionExplanationEngine {
  explain(params: {
    context: DecisionContext;
    recommendations: ClinicalRecommendationItem[];
    evidence: EvidenceContribution[];
    linkedEvidence: DecisionEvidence[];
    alerts: ClinicalAlert[];
    contraindications: Contraindication[];
    conflicts: ConflictRecord[];
    modulesWithData: string[];
    modulesQueried: string[];
    confidenceScore: number;
  }): AthenaClinicalExplanation {
    return {
      why: this.buildWhy(params),
      how: this.buildHow(params),
      whichEvidences: this.buildEvidenceList(params.linkedEvidence),
      confidenceLevel: confidenceLabel(params.confidenceScore),
      confidenceScore: params.confidenceScore,
      keyAlerts: params.alerts
        .filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH')
        .map((a) => `[${a.severity}] ${a.title}: ${a.message}`),
      contraindicationsDetected: params.contraindications.map(
        (c) => `${c.medication} — ${c.reason} (${c.severity})`,
      ),
      modulesContributed: params.modulesWithData,
      reasoning: this.buildReasoning(params),
      limitations: this.buildLimitations(params),
      dataCompleteness: Math.round(
        (params.modulesWithData.length / Math.max(params.modulesQueried.length, 1)) * 100,
      ),
    };
  }

  private buildWhy(params: { context: DecisionContext; recommendations: ClinicalRecommendationItem[]; alerts: ClinicalAlert[] }): string {
    const criticalAlerts = params.alerts.filter((a) => a.severity === 'CRITICAL').length;
    const immediateRecs = params.recommendations.filter((r) => r.urgency === 'IMMEDIATE').length;
    const conditions = params.context.conditions.join(', ') || 'general patient evaluation';

    if (criticalAlerts > 0) {
      return `Clinical decision triggered by ${criticalAlerts} critical alert(s) requiring immediate action for patient with ${conditions}.`;
    }
    if (immediateRecs > 0) {
      return `${immediateRecs} immediate action(s) identified during clinical evaluation. Context: ${conditions}.`;
    }
    return `Routine clinical decision support evaluation for patient with ${conditions}.`;
  }

  private buildHow(params: { modulesWithData: string[]; recommendations: ClinicalRecommendationItem[]; contraindications: Contraindication[] }): string {
    const steps = [
      `Data aggregated from ${params.modulesWithData.length} clinical module(s): ${params.modulesWithData.join(', ')}.`,
      `${params.recommendations.length} recommendation(s) generated and ranked by clinical priority.`,
    ];
    if (params.contraindications.length > 0) {
      steps.push(`${params.contraindications.length} contraindication(s) detected and applied to filter recommendations.`);
    }
    steps.push('Evidence linked to recommendations from clinical guidelines and scientific literature.');
    return steps.join(' ');
  }

  private buildEvidenceList(evidence: DecisionEvidence[]): string[] {
    return evidence.map((e) => e.getCitationLabel());
  }

  private buildReasoning(params: {
    context: DecisionContext;
    recommendations: ClinicalRecommendationItem[];
    conflicts: ConflictRecord[];
    alerts: ClinicalAlert[];
    modulesWithData: string[];
    confidenceScore: number;
  }): string[] {
    const chain: string[] = [];
    chain.push(`Patient ${params.context.patientId} clinical evaluation — ATHENA-CDSS analysis initiated`);
    chain.push(`Active conditions: ${params.context.conditions.join(', ') || 'none specified'}`);
    chain.push(`Current medications: ${params.context.getCurrentMedications().map((m) => m.name).join(', ') || 'none'}`);

    if (params.context.geneticProfile) {
      chain.push(`Genetic profile present: ${params.context.geneticProfile.variants.length} variant(s) analyzed`);
    }

    chain.push(`Data sourced from ${params.modulesWithData.length} module(s)`);

    if (params.alerts.length > 0) {
      chain.push(`${params.alerts.filter((a) => a.severity === 'CRITICAL').length} critical and ${params.alerts.filter((a) => a.severity === 'HIGH').length} high-severity alerts generated`);
    }

    if (params.conflicts.length > 0) {
      chain.push(`${params.conflicts.length} recommendation conflict(s) resolved`);
    }

    chain.push(`${params.recommendations.length} final recommendations produced with overall confidence ${params.confidenceScore}%`);
    return chain;
  }

  private buildLimitations(params: {
    modulesWithData: string[];
    modulesQueried: string[];
    confidenceScore: number;
    recommendations: ClinicalRecommendationItem[];
  }): string[] {
    const limitations: string[] = [];
    const missing = params.modulesQueried.filter((m) => !params.modulesWithData.includes(m));

    if (missing.length > 0) {
      limitations.push(`Missing data from: ${missing.join(', ')}`);
    }
    if (params.confidenceScore < 50) {
      limitations.push('Low confidence — insufficient data to generate high-quality recommendations');
    }
    if (params.recommendations.length === 0) {
      limitations.push('No actionable recommendations produced');
    }
    if (limitations.length === 0) {
      limitations.push('No significant limitations identified');
    }
    return limitations;
  }
}
