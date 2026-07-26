import { DecisionEvidence } from '../entities/decision-evidence.entity.js';
import type { ClinicalRecommendationItem } from '../entities/clinical-decision.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

interface EvidenceTemplate {
  topic: string;
  conditions: string[];
  markers?: string[];
  sourceType: DecisionEvidence['sourceType'];
  gradeLevel: DecisionEvidence['gradeLevel'];
  gradeStrength: DecisionEvidence['gradeStrength'];
  title: string;
  summary: string;
  guidelineId?: string;
  year?: number;
}

const EVIDENCE_TEMPLATES: EvidenceTemplate[] = [
  {
    topic: 'diabetes',
    conditions: ['diabetes', 'hyperglycemia'],
    markers: ['hba1c', 'glucose'],
    sourceType: 'GUIDELINE',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'ADA Standards of Medical Care in Diabetes',
    summary: 'HbA1c target <7% for most non-pregnant adults. Individualize goals based on comorbidities.',
    guidelineId: 'ADA-2024',
    year: 2024,
  },
  {
    topic: 'hypertension',
    conditions: ['hypertension', 'high blood pressure'],
    markers: ['bp_systolic', 'bp_diastolic'],
    sourceType: 'GUIDELINE',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'JNC8 / ESC/ESH Hypertension Guidelines',
    summary: 'Blood pressure target <130/80 mmHg for most adults. First-line: ACE inhibitor, ARB, CCB, or thiazide.',
    guidelineId: 'ESC-HTN-2023',
    year: 2023,
  },
  {
    topic: 'dyslipidemia',
    conditions: ['dyslipidemia', 'hypercholesterolemia', 'hyperlipidemia'],
    markers: ['ldl', 'hdl', 'triglycerides'],
    sourceType: 'GUIDELINE',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'ACC/AHA Cholesterol Clinical Practice Guidelines',
    summary: 'High-intensity statin for ASCVD risk ≥7.5%. LDL-C targets guided by risk category.',
    guidelineId: 'ACC-AHA-CHOL-2023',
    year: 2023,
  },
  {
    topic: 'ckd',
    conditions: ['ckd', 'renal failure', 'renal insufficiency'],
    markers: ['egfr', 'creatinine'],
    sourceType: 'GUIDELINE',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'KDIGO CKD Clinical Practice Guidelines',
    summary: 'Classify CKD by GFR and albuminuria. Avoid nephrotoxic agents. Nephrology referral for eGFR <30.',
    guidelineId: 'KDIGO-CKD-2022',
    year: 2022,
  },
  {
    topic: 'cardiovascular',
    conditions: ['coronary artery disease', 'heart failure', 'atrial fibrillation', 'cardiac'],
    sourceType: 'GUIDELINE',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'ESC Cardiovascular Guidelines',
    summary: 'Comprehensive cardiovascular risk management including antiplatelet, anticoagulation, and secondary prevention.',
    guidelineId: 'ESC-CVD-2023',
    year: 2023,
  },
  {
    topic: 'pharmacogenomics',
    conditions: [],
    markers: [],
    sourceType: 'CPIC',
    gradeLevel: 'A',
    gradeStrength: 'STRONG',
    title: 'CPIC Guidelines for Pharmacogenomics-Based Prescribing',
    summary: 'Gene-drug dosing recommendations for CYP2D6, CYP2C19, CYP2C9, TPMT, DPYD, and other pharmacogenes.',
    guidelineId: 'CPIC-2024',
    year: 2024,
  },
];

export class EvidenceLinkEngine {
  link(recommendations: ClinicalRecommendationItem[], context: DecisionContext): DecisionEvidence[] {
    const evidenceList: DecisionEvidence[] = [];
    const attachedTopics = new Set<string>();

    for (const rec of recommendations) {
      const templates = this.matchTemplates(rec, context);
      for (const template of templates) {
        if (attachedTopics.has(template.topic)) continue;
        attachedTopics.add(template.topic);

        evidenceList.push(
          new DecisionEvidence({
            topic: template.topic,
            sourceType: template.sourceType,
            guidelineId: template.guidelineId,
            gradeLevel: template.gradeLevel,
            gradeStrength: template.gradeStrength,
            title: template.title,
            summary: template.summary,
            relevanceScore: this.computeRelevance(template, context),
            year: template.year,
            linkedRecommendationIds: [rec.id],
          }),
        );
      }
    }

    // add pharmacogenomics evidence if genetic profile present
    if (context.geneticProfile && !attachedTopics.has('pharmacogenomics')) {
      const pgxTemplate = EVIDENCE_TEMPLATES.find((t) => t.topic === 'pharmacogenomics')!;
      evidenceList.push(
        new DecisionEvidence({
          topic: 'pharmacogenomics',
          sourceType: pgxTemplate.sourceType,
          guidelineId: pgxTemplate.guidelineId,
          gradeLevel: pgxTemplate.gradeLevel,
          gradeStrength: pgxTemplate.gradeStrength,
          title: pgxTemplate.title,
          summary: pgxTemplate.summary,
          relevanceScore: 90,
          year: pgxTemplate.year,
          linkedRecommendationIds: recommendations.map((r) => r.id),
        }),
      );
    }

    return evidenceList;
  }

  private matchTemplates(rec: ClinicalRecommendationItem, context: DecisionContext): EvidenceTemplate[] {
    return EVIDENCE_TEMPLATES.filter((t) => {
      if (t.conditions.some((c) => context.hasCondition(c))) return true;
      if (t.markers?.some((m) => context.getBiomarkerValue(m) !== undefined)) return true;
      if (rec.category === 'PHARMACOGENOMICS' && t.topic === 'pharmacogenomics') return true;
      return false;
    });
  }

  private computeRelevance(template: EvidenceTemplate, context: DecisionContext): number {
    let score = 50;
    if (template.conditions.some((c) => context.hasCondition(c))) score += 30;
    if (template.markers?.some((m) => context.getBiomarkerValue(m) !== undefined)) score += 20;
    if (template.gradeLevel === 'A') score += 10;
    return Math.min(100, score);
  }
}
