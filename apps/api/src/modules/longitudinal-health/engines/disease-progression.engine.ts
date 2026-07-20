import type { ClinicalEvent } from '../entities/clinical-event.entity.js';
import type { DiseaseProgression } from '../entities/health-timeline.entity.js';

export interface DiseaseStageRule {
  condition: string;
  classifyStage(event: ClinicalEvent): string | null;
}

const HYPERTENSION_RULE: DiseaseStageRule = {
  condition: 'hypertension',
  classifyStage(event) {
    const systolic = event.getBiomarkerValue('bp_systolic');
    const diastolic = event.getBiomarkerValue('bp_diastolic');
    if (systolic === undefined && diastolic === undefined) return null;
    const s = systolic ?? 0;
    const d = diastolic ?? 0;
    if (s < 120 && d < 80) return 'NORMAL';
    if (s < 130 && d < 80) return 'ELEVATED';
    if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return 'STAGE_1';
    if (s >= 140 || d >= 90) return 'STAGE_2';
    return null;
  },
};

const DIABETES_RULE: DiseaseStageRule = {
  condition: 'diabetes',
  classifyStage(event) {
    const hba1c = event.getBiomarkerValue('hba1c');
    const glucose = event.getBiomarkerValue('glucose');
    if (hba1c !== undefined) {
      if (hba1c < 5.7) return 'CONTROLLED';
      if (hba1c < 6.5) return 'PRE_DIABETIC';
      if (hba1c < 7.0) return 'CONTROLLED_DIABETIC';
      if (hba1c < 8.0) return 'POORLY_CONTROLLED';
      return 'UNCONTROLLED';
    }
    if (glucose !== undefined) {
      if (glucose < 100) return 'CONTROLLED';
      if (glucose < 126) return 'PRE_DIABETIC';
      return 'UNCONTROLLED';
    }
    return null;
  },
};

const DYSLIPIDEMIA_RULE: DiseaseStageRule = {
  condition: 'dyslipidemia',
  classifyStage(event) {
    const ldl = event.getBiomarkerValue('ldl');
    if (ldl === undefined) return null;
    if (ldl < 100) return 'OPTIMAL';
    if (ldl < 130) return 'NEAR_OPTIMAL';
    if (ldl < 160) return 'BORDERLINE_HIGH';
    if (ldl < 190) return 'HIGH';
    return 'VERY_HIGH';
  },
};

const OBESITY_RULE: DiseaseStageRule = {
  condition: 'obesity',
  classifyStage(event) {
    const bmi = event.getBiomarkerValue('bmi');
    if (bmi === undefined) return null;
    if (bmi < 18.5) return 'UNDERWEIGHT';
    if (bmi < 25) return 'NORMAL';
    if (bmi < 30) return 'OVERWEIGHT';
    if (bmi < 35) return 'OBESE_CLASS_1';
    if (bmi < 40) return 'OBESE_CLASS_2';
    return 'OBESE_CLASS_3';
  },
};

const CKD_RULE: DiseaseStageRule = {
  condition: 'ckd',
  classifyStage(event) {
    const egfr = event.getBiomarkerValue('egfr');
    if (egfr === undefined) return null;
    if (egfr >= 90) return 'G1';
    if (egfr >= 60) return 'G2';
    if (egfr >= 45) return 'G3A';
    if (egfr >= 30) return 'G3B';
    if (egfr >= 15) return 'G4';
    return 'G5';
  },
};

const BUILT_IN_RULES: DiseaseStageRule[] = [
  HYPERTENSION_RULE,
  DIABETES_RULE,
  DYSLIPIDEMIA_RULE,
  OBESITY_RULE,
  CKD_RULE,
];

const STAGE_SEVERITY: Record<string, number> = {
  // hypertension
  NORMAL: 0, ELEVATED: 1, STAGE_1: 2, STAGE_2: 3,
  // diabetes
  CONTROLLED: 0, PRE_DIABETIC: 1, CONTROLLED_DIABETIC: 1, POORLY_CONTROLLED: 2, UNCONTROLLED: 3,
  // dyslipidemia
  OPTIMAL: 0, NEAR_OPTIMAL: 1, BORDERLINE_HIGH: 2, BORDERLINE: 2, HIGH: 3, VERY_HIGH: 4,
  // obesity / BMI
  UNDERWEIGHT: 1, OVERWEIGHT: 2, OBESE_CLASS_1: 3, OBESE_CLASS_2: 4, OBESE_CLASS_3: 5,
  // CKD
  G1: 0, G2: 1, G3A: 2, G3B: 3, G4: 4, G5: 5,
};

function computeProgressionTrend(
  history: DiseaseProgression['history'],
  _condition: string,
): DiseaseProgression['trend'] {
  if (history.length < 2) return 'UNKNOWN';

  const first = STAGE_SEVERITY[history[0].stage];
  const last = STAGE_SEVERITY[history[history.length - 1].stage];

  if (first === undefined || last === undefined) return 'UNKNOWN';
  if (last < first) return 'IMPROVING';
  if (last > first) return 'WORSENING';
  return 'STABLE';
}

export class DiseaseProgressionEngine {
  private readonly rules: DiseaseStageRule[];

  constructor(customRules: DiseaseStageRule[] = []) {
    this.rules = [...BUILT_IN_RULES, ...customRules];
  }

  analyzeProgression(condition: string, events: ClinicalEvent[]): DiseaseProgression | null {
    const rule = this.findRule(condition);
    if (!rule) return this.buildFromDiagnosisEvents(condition, events);

    const history: DiseaseProgression['history'] = [];
    let onsetDate: Date | undefined;

    for (const event of events.sort((a, b) => a.date.getTime() - b.date.getTime())) {
      const stage = rule.classifyStage(event);
      if (stage) {
        if (!onsetDate) onsetDate = event.date;
        const last = history[history.length - 1];
        if (!last || last.stage !== stage) {
          history.push({ date: event.date, stage });
        }
      }
    }

    if (history.length === 0) return null;

    return {
      condition: rule.condition,
      history,
      currentStage: history[history.length - 1].stage,
      trend: computeProgressionTrend(history, condition),
      onsetDate,
    };
  }

  analyzeAll(conditions: string[], events: ClinicalEvent[]): DiseaseProgression[] {
    const results: DiseaseProgression[] = [];
    for (const condition of conditions) {
      const progression = this.analyzeProgression(condition, events);
      if (progression) results.push(progression);
    }
    return results;
  }

  discoverConditions(events: ClinicalEvent[]): string[] {
    const found = new Set<string>();
    for (const e of events) {
      if (e.eventType === 'DIAGNOSIS' && e.metadata.conditionName) {
        found.add(e.metadata.conditionName.toLowerCase());
      }
    }
    // also try to infer from biomarkers
    for (const rule of this.rules) {
      for (const e of events) {
        if (rule.classifyStage(e)) {
          found.add(rule.condition);
          break;
        }
      }
    }
    return [...found];
  }

  private findRule(condition: string): DiseaseStageRule | undefined {
    return this.rules.find((r) => r.condition.toLowerCase() === condition.toLowerCase());
  }

  private buildFromDiagnosisEvents(condition: string, events: ClinicalEvent[]): DiseaseProgression | null {
    const diagnosisEvents = events.filter(
      (e) =>
        e.eventType === 'DIAGNOSIS' &&
        e.metadata.conditionName?.toLowerCase() === condition.toLowerCase(),
    );

    if (diagnosisEvents.length === 0) return null;

    const sorted = diagnosisEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    const history = sorted.map((e) => ({
      date: e.date,
      stage: e.metadata.stage ?? 'UNKNOWN',
      notes: e.metadata.description,
    }));

    return {
      condition,
      history,
      currentStage: history[history.length - 1].stage,
      trend: computeProgressionTrend(history, condition),
      onsetDate: sorted[0].date,
    };
  }
}
