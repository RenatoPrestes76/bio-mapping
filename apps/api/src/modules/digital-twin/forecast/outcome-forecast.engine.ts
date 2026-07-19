import { DigitalTwin, RiskLevel } from '../entities/digital-twin.entity.js';

export interface ForecastPoint {
  week: number;
  metric: string;
  predictedValue: number;
  confidence: number;
  unit?: string;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
}

export interface RiskTrajectoryPoint {
  week: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface ForecastResult {
  twinId: string;
  horizonWeeks: number;
  trajectory: ForecastPoint[];
  riskTrajectory: RiskTrajectoryPoint[];
  summary: string;
  assumptions: string[];
  generatedAt: Date;
}

const METRICS_TO_FORECAST = [
  { name: 'fasting_glucose', unit: 'mg/dL', alias: ['glicemia', 'glucose'] },
  { name: 'hba1c', unit: '%', alias: [] },
  { name: 'systolic_bp', unit: 'mmHg', alias: ['pas'] },
  { name: 'ldl', unit: 'mg/dL', alias: [] },
  { name: 'crp', unit: 'mg/L', alias: ['pcr'] },
];

export class OutcomeForecastEngine {
  forecast(twin: DigitalTwin, horizonWeeks: number): ForecastResult {
    const trajectory: ForecastPoint[] = [];
    const steps = this.buildTimeSteps(horizonWeeks);

    for (const metaDef of METRICS_TO_FORECAST) {
      const current =
        twin.getBiomarker(metaDef.name) ??
        metaDef.alias.reduce<number | undefined>(
          (acc, alias) => acc ?? twin.getBiomarker(alias),
          undefined,
        );

      if (current === undefined) continue;

      for (const week of steps) {
        const projected = this.projectMetric(metaDef.name, current, week, twin);
        trajectory.push({
          week,
          metric: metaDef.name,
          predictedValue: projected.value,
          confidence: projected.confidence,
          unit: metaDef.unit,
          trend: projected.trend,
        });
      }
    }

    const riskTrajectory = this.projectRisk(twin, steps);
    const assumptions = this.buildAssumptions(twin);
    const summary = this.buildSummary(twin, riskTrajectory, horizonWeeks);

    return {
      twinId: twin.id,
      horizonWeeks,
      trajectory,
      riskTrajectory,
      summary,
      assumptions,
      generatedAt: new Date(),
    };
  }

  private buildTimeSteps(horizonWeeks: number): number[] {
    const steps: number[] = [];
    const interval = horizonWeeks >= 52 ? 13 : horizonWeeks >= 24 ? 8 : 4;
    for (let w = interval; w <= horizonWeeks; w += interval) {
      steps.push(w);
    }
    return steps;
  }

  private projectMetric(
    metric: string,
    current: number,
    week: number,
    twin: DigitalTwin,
  ): { value: number; confidence: number; trend: ForecastPoint['trend'] } {
    const yearFraction = week / 52;

    switch (metric) {
      case 'hba1c': {
        const isDiabetic = twin.hasCondition('diabetes');
        const isPreDiabetic = twin.hasCondition('pré-diabetes') || twin.hasCondition('prediabetes');
        if (isDiabetic && current >= 7) {
          const worsening = 0.5 * yearFraction;
          return { value: Math.round(Math.min(14, current + worsening) * 100) / 100, confidence: 0.65, trend: 'WORSENING' };
        }
        if (isPreDiabetic) {
          const worsening = 0.2 * yearFraction;
          return { value: Math.round((current + worsening) * 100) / 100, confidence: 0.62, trend: 'WORSENING' };
        }
        return { value: Math.round((current + 0.05 * yearFraction) * 100) / 100, confidence: 0.75, trend: 'STABLE' };
      }

      case 'fasting_glucose': {
        if (current >= 126) {
          const worsening = 6 * yearFraction;
          return { value: Math.round(current + worsening), confidence: 0.62, trend: 'WORSENING' };
        }
        if (current >= 100) {
          const worsening = 3 * yearFraction;
          return { value: Math.round(current + worsening), confidence: 0.65, trend: 'WORSENING' };
        }
        return { value: Math.round(current + yearFraction), confidence: 0.78, trend: 'STABLE' };
      }

      case 'systolic_bp': {
        const ageFactor = 1.2 * yearFraction;
        const trend: ForecastPoint['trend'] = current >= 140 ? 'WORSENING' : 'STABLE';
        return { value: Math.round(current + ageFactor), confidence: 0.70, trend };
      }

      case 'ldl': {
        if (current >= 160) {
          const worsening = 4 * yearFraction;
          return { value: Math.round(current + worsening), confidence: 0.65, trend: 'WORSENING' };
        }
        return { value: Math.round(current + yearFraction), confidence: 0.72, trend: 'STABLE' };
      }

      case 'crp': {
        const isSedentary =
          twin.profileSnapshot['lifestyle'] &&
          typeof twin.profileSnapshot['lifestyle'] === 'object' &&
          (twin.profileSnapshot['lifestyle'] as Record<string, unknown>)['physicalActivity'] === 'SEDENTARY';
        if (isSedentary && current >= 1) {
          const worsening = 0.3 * yearFraction;
          return { value: Math.round((current + worsening) * 100) / 100, confidence: 0.60, trend: 'WORSENING' };
        }
        return { value: Math.round(current * 100) / 100, confidence: 0.65, trend: 'STABLE' };
      }

      default:
        return { value: current, confidence: 0.50, trend: 'STABLE' };
    }
  }

  private projectRisk(twin: DigitalTwin, steps: number[]): RiskTrajectoryPoint[] {
    const toLevel = (s: number): RiskLevel => {
      if (s < 20) return 'VERY_LOW';
      if (s < 40) return 'LOW';
      if (s < 60) return 'MODERATE';
      if (s < 80) return 'HIGH';
      return 'VERY_HIGH';
    };

    return steps.map((week) => {
      const agingIncrease = (week / 52) * 1.5;
      const score = Math.min(100, twin.riskState.riskScore + agingIncrease);
      return {
        week,
        riskScore: Math.round(score * 10) / 10,
        riskLevel: toLevel(score),
      };
    });
  }

  private buildAssumptions(twin: DigitalTwin): string[] {
    const assumptions = [
      'Projeção basal sem novas intervenções terapêuticas',
      'Aderência ao tratamento atual mantida durante todo o período',
      'Parâmetros evoluem de acordo com trajetórias populacionais médias',
      'Sem eventos agudos ou hospitalizações no período projetado',
    ];
    if (twin.riskState.riskScore >= 60) {
      assumptions.push('Paciente de alto risco — variação individual pode ser significativamente maior');
    }
    return assumptions;
  }

  private buildSummary(
    twin: DigitalTwin,
    riskTrajectory: RiskTrajectoryPoint[],
    weeks: number,
  ): string {
    const finalRisk = riskTrajectory[riskTrajectory.length - 1];
    const worsened =
      finalRisk && finalRisk.riskScore > twin.riskState.riskScore + 5;

    if (worsened && twin.riskState.riskScore >= 50) {
      return `Projeção de ${weeks} semanas indica tendência de deterioração sem intervenção. Risco atual: ${twin.riskState.overallRisk}. Recomenda-se revisão e intensificação do tratamento.`;
    }
    if (twin.riskState.riskScore >= 60) {
      return `Projeção de ${weeks} semanas indica risco elevado com tendência estável, mas intervenção ativa é necessária para reverter o quadro. Risco atual: ${twin.riskState.overallRisk}.`;
    }
    return `Projeção de ${weeks} semanas indica evolução estável com risco controlado. Risco atual: ${twin.riskState.overallRisk}. Manter adesão ao plano terapêutico vigente.`;
  }
}
