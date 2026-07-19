import { DigitalTwin, RiskLevel } from '../entities/digital-twin.entity.js';
import { ScenarioInput } from '../entities/simulation-scenario.entity.js';

export interface RiskEvolutionPoint {
  week: number;
  riskScore: number;
  riskLevel: RiskLevel;
  dominantFactors: string[];
}

export interface RiskEvolution {
  twinId: string;
  initialRiskScore: number;
  finalRiskScore: number;
  netChange: number;
  direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
  trajectory: RiskEvolutionPoint[];
  interventionImpact: string;
}

export class RiskEvolutionEngine {
  evolve(
    twin: DigitalTwin,
    interventions: ScenarioInput[],
    horizonWeeks: number,
  ): RiskEvolution {
    const initialScore = twin.riskState.riskScore;
    const weeklyDelta = this.computeWeeklyDelta(interventions, twin);
    const steps = this.buildTimeSteps(horizonWeeks);
    const trajectory: RiskEvolutionPoint[] = [];

    // Always include week 0
    trajectory.push({
      week: 0,
      riskScore: initialScore,
      riskLevel: this.toLevel(initialScore),
      dominantFactors: this.getDominantFactors(twin),
    });

    for (const week of steps) {
      const score = Math.max(0, Math.min(100, initialScore + weeklyDelta * week));
      trajectory.push({
        week,
        riskScore: Math.round(score * 10) / 10,
        riskLevel: this.toLevel(score),
        dominantFactors: this.getDominantFactors(twin),
      });
    }

    const finalScore = Math.max(
      0,
      Math.min(100, initialScore + weeklyDelta * horizonWeeks),
    );
    const netChange = Math.round((finalScore - initialScore) * 10) / 10;
    const direction =
      netChange < -2 ? 'IMPROVING' : netChange > 2 ? 'WORSENING' : 'STABLE';

    return {
      twinId: twin.id,
      initialRiskScore: initialScore,
      finalRiskScore: Math.round(finalScore * 10) / 10,
      netChange,
      direction,
      trajectory,
      interventionImpact: this.describeImpact(interventions, weeklyDelta, horizonWeeks),
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

  private computeWeeklyDelta(interventions: ScenarioInput[], twin: DigitalTwin): number {
    // Baseline: slight risk increase over time (aging)
    let weeklyDelta = 0.10;

    for (const input of interventions) {
      if (input.type === 'LIFESTYLE') {
        const val = String(input.value);
        if (input.name === 'smoking' && val === 'false') weeklyDelta -= 0.80;
        if (
          input.name === 'physicalActivity' &&
          (val === 'MODERATE' || val === 'VIGOROUS')
        )
          weeklyDelta -= 0.25;
        if (input.name === 'dietType' && (val === 'MEDITERRANEAN' || val === 'DASH'))
          weeklyDelta -= 0.15;
        if (input.name === 'stressLevel' && (val === 'LOW' || val === 'NONE'))
          weeklyDelta -= 0.10;
        if (input.name === 'sleepHours' && Number(val) >= 7) weeklyDelta -= 0.08;
      }

      if (input.type === 'MEDICATION') {
        const name = input.name.toLowerCase();
        if (name.includes('statin') || name.includes('atorvastatina')) weeklyDelta -= 0.35;
        if (name.includes('metformin') || name.includes('metformina')) weeklyDelta -= 0.28;
        if (name.includes('ace') || name.includes('enalapril')) weeklyDelta -= 0.25;
        if (name.includes('beta')) weeklyDelta -= 0.15;
        if (name.includes('glp1') || name.includes('semaglutida')) weeklyDelta -= 0.40;
      }

      if (input.type === 'INTERVENTION') {
        const name = input.name.toLowerCase();
        if (name.includes('bariatric') || name.includes('bariátric')) weeklyDelta -= 0.55;
        else if (name.includes('weight_loss_10')) weeklyDelta -= 0.35;
        else if (name.includes('weight_loss_5')) weeklyDelta -= 0.20;
        else if (name.includes('cardiac_rehab')) weeklyDelta -= 0.30;
        else weeklyDelta -= 0.15;
      }
    }

    // Apply twin-specific multiplier: higher baseline risk = faster reduction with treatment
    if (twin.riskState.riskScore >= 70 && weeklyDelta < 0) {
      weeklyDelta *= 1.20;
    }

    return weeklyDelta;
  }

  private getDominantFactors(twin: DigitalTwin): string[] {
    const factors: string[] = [];
    const risk = twin.riskState;

    if (risk.cardiovascularRisk === 'HIGH' || risk.cardiovascularRisk === 'VERY_HIGH') {
      factors.push('Risco cardiovascular elevado');
    }
    if (risk.metabolicRisk === 'HIGH' || risk.metabolicRisk === 'VERY_HIGH') {
      factors.push('Risco metabólico elevado');
    }
    if (twin.hasCondition('diabetes')) factors.push('Diabetes mellitus');
    if (twin.hasCondition('hipertensão') || twin.hasCondition('hypertension')) {
      factors.push('Hipertensão arterial');
    }

    const lifestyle = twin.profileSnapshot['lifestyle'] as Record<string, unknown> | undefined;
    if (lifestyle?.smoking === true) factors.push('Tabagismo ativo');
    if (lifestyle?.physicalActivity === 'SEDENTARY') factors.push('Sedentarismo');

    return factors.slice(0, 4);
  }

  private describeImpact(
    interventions: ScenarioInput[],
    weeklyDelta: number,
    weeks: number,
  ): string {
    const totalChange = weeklyDelta * weeks;
    if (interventions.length === 0) {
      return 'Sem intervenções — evolução natural com envelhecimento';
    }
    if (totalChange < -10) {
      return `Impacto significativo esperado: redução de ~${Math.abs(Math.round(totalChange))} pontos no escore de risco em ${weeks} semanas`;
    }
    if (totalChange < -2) {
      return `Impacto moderado esperado: redução de ~${Math.abs(Math.round(totalChange))} pontos no escore de risco em ${weeks} semanas`;
    }
    if (totalChange > 5) {
      return `Deterioração esperada sem correção das intervenções em curso`;
    }
    return `Estabilização do risco esperada — manter adesão ao plano atual`;
  }

  private toLevel(score: number): RiskLevel {
    if (score < 20) return 'VERY_LOW';
    if (score < 40) return 'LOW';
    if (score < 60) return 'MODERATE';
    if (score < 80) return 'HIGH';
    return 'VERY_HIGH';
  }
}
