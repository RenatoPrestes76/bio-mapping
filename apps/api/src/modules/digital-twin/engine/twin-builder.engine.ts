import {
  DigitalTwin,
  ClinicalState,
  RiskState,
  RiskLevel,
  TimelineEntry,
} from '../entities/digital-twin.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { CreateTwinDto } from '../dto/twin.dto.js';

export class TwinBuilderEngine {
  build(dto: CreateTwinDto): { twin: DigitalTwin; snapshot: TwinSnapshot } {
    const biomarkersMap: Record<string, number> = {};
    for (const bm of dto.biomarkers ?? []) {
      biomarkersMap[bm.name.toLowerCase()] = bm.value;
    }

    const clinicalState: ClinicalState = {
      conditions: dto.conditions ?? [],
      biomarkers: biomarkersMap,
      medications: dto.medications ?? [],
      symptoms: dto.symptoms ?? [],
      lastUpdated: new Date(),
    };

    const riskState = this.computeInitialRisk(dto, biomarkersMap);

    const profileSnapshot: Record<string, unknown> = {
      demographics: dto.demographics,
      conditions: dto.conditions ?? [],
      medications: dto.medications ?? [],
      biomarkers: dto.biomarkers ?? [],
      lifestyle: dto.lifestyle ?? {},
      familyHistory: dto.familyHistory ?? [],
    };

    const rawTwin = new DigitalTwin({
      patientId: dto.patientId,
      profileSnapshot,
      clinicalState,
      riskState,
      timeline: [],
    });

    const snapshot = this.buildSnapshot(rawTwin, dto);

    const initEntry: TimelineEntry = {
      id: `entry-init-${Date.now()}`,
      snapshotId: snapshot.id,
      timestamp: new Date(),
      event: 'Digital Twin criado com estado clínico inicial',
      type: 'CLINICAL',
      metadata: {
        conditionCount: clinicalState.conditions.length,
        medicationCount: clinicalState.medications.length,
        riskScore: riskState.riskScore,
      },
    };

    const twin = rawTwin.addTimelineEntry(initEntry);
    return { twin, snapshot };
  }

  private buildSnapshot(twin: DigitalTwin, dto: CreateTwinDto): TwinSnapshot {
    return new TwinSnapshot({
      twinId: twin.id,
      clinicalIndicators: {
        age: dto.demographics.age,
        sex: dto.demographics.sex,
        bmi: dto.demographics.bmi ?? 0,
        conditionCount: (dto.conditions ?? []).length,
        medicationCount: (dto.medications ?? []).length,
        version: twin.version,
      },
      biomarkers: { ...twin.clinicalState.biomarkers },
      riskScores: {
        cardiovascular: twin.riskState.riskScore,
        metabolic: Math.max(0, twin.riskState.riskScore - 5),
        overall: twin.riskState.riskScore,
      },
      lifestyleMetrics: {
        smoking: dto.lifestyle?.smoking ?? false,
        physicalActivity: dto.lifestyle?.physicalActivity ?? 'UNKNOWN',
        sleepHours: dto.lifestyle?.sleepHours ?? null,
        dietType: dto.lifestyle?.dietType ?? null,
      },
    });
  }

  private computeInitialRisk(
    dto: CreateTwinDto,
    biomarkers: Record<string, number>,
  ): RiskState {
    let score = 0;

    const age = dto.demographics.age;
    if (age >= 65) score += 15;
    else if (age >= 55) score += 8;
    else if (age >= 45) score += 4;

    if (dto.lifestyle?.smoking) score += 20;

    const bmi = dto.demographics.bmi;
    if (bmi && bmi >= 35) score += 18;
    else if (bmi && bmi >= 30) score += 12;
    else if (bmi && bmi >= 25) score += 5;

    const glucose = biomarkers['fasting_glucose'] ?? biomarkers['glicemia'];
    if (glucose && glucose >= 126) score += 20;
    else if (glucose && glucose >= 100) score += 10;

    const sbp = biomarkers['systolic_bp'] ?? biomarkers['pas'];
    if (sbp && sbp >= 160) score += 20;
    else if (sbp && sbp >= 140) score += 12;

    const ldl = biomarkers['ldl'];
    if (ldl && ldl >= 190) score += 15;
    else if (ldl && ldl >= 160) score += 8;

    const hba1c = biomarkers['hba1c'];
    if (hba1c && hba1c >= 8) score += 15;
    else if (hba1c && hba1c >= 6.5) score += 10;

    const conditions = (dto.conditions ?? []).map((c) => c.toLowerCase());
    if (conditions.some((c) => c.includes('diabetes'))) score += 15;
    if (
      conditions.some(
        (c) => c.includes('hipertensão') || c.includes('hypertension'),
      )
    )
      score += 10;
    if (
      conditions.some(
        (c) => c.includes('coronar') || c.includes('infarto') || c.includes('avc'),
      )
    )
      score += 20;

    const fh = (dto.familyHistory ?? []).map((h) => h.toLowerCase());
    if (fh.some((h) => h.includes('infarto') || h.includes('cardiac'))) score += 12;
    if (fh.some((h) => h.includes('diabetes'))) score += 5;

    score = Math.min(100, score);

    const toLevel = (s: number): RiskLevel => {
      if (s < 20) return 'VERY_LOW';
      if (s < 40) return 'LOW';
      if (s < 60) return 'MODERATE';
      if (s < 80) return 'HIGH';
      return 'VERY_HIGH';
    };

    const diabetesRiskBase =
      glucose && glucose >= 100 ? 50 : hba1c && hba1c >= 5.7 ? 35 : 10;

    return {
      cardiovascularRisk: toLevel(Math.min(100, score + 5)),
      metabolicRisk: toLevel(Math.max(0, score - 5)),
      diabetesRisk: toLevel(diabetesRiskBase),
      overallRisk: toLevel(score),
      riskScore: score,
      lastUpdated: new Date(),
    };
  }
}
