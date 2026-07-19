import { DigitalTwin, RiskLevel } from '../entities/digital-twin.entity.js';
import {
  SimulationScenario,
  ScenarioInput,
} from '../entities/simulation-scenario.entity.js';
import {
  SimulationResult,
  PredictedOutcome,
  RiskChange,
} from '../entities/simulation-result.entity.js';

interface InputEffect {
  outcomes: PredictedOutcome[];
  riskChanges: RiskChange[];
  recommendations: string[];
}

const BIOMARKER_DEFAULTS: Record<string, number> = {
  fasting_glucose: 90,
  glicemia: 90,
  hba1c: 5.4,
  systolic_bp: 120,
  pas: 120,
  diastolic_bp: 80,
  pad: 80,
  ldl: 130,
  hdl: 50,
  triglycerides: 120,
  triglicerideos: 120,
  crp: 0.5,
  pcr: 0.5,
};

export class ScenarioSimulationEngine {
  simulate(twin: DigitalTwin, scenario: SimulationScenario): SimulationResult {
    const start = Date.now();
    const allOutcomes: PredictedOutcome[] = [];
    const allRiskChanges: RiskChange[] = [];
    const allRecommendations: string[] = [];

    for (const input of scenario.inputs) {
      const effect = this.computeInputEffect(input, twin, scenario.expectedDuration);
      allOutcomes.push(...effect.outcomes);
      allRiskChanges.push(...effect.riskChanges);
      allRecommendations.push(...effect.recommendations);
    }

    const mergedOutcomes = this.mergeOutcomes(allOutcomes);
    const mergedRiskChanges = this.mergeRiskChanges(allRiskChanges, twin);
    const limitations = this.buildLimitations(twin, scenario);
    const confidence = this.computeConfidence(scenario, twin);

    return new SimulationResult({
      scenarioId: scenario.id,
      predictedOutcomes: mergedOutcomes,
      riskChanges: mergedRiskChanges,
      recommendations: [...new Set(allRecommendations)],
      confidence,
      limitations,
      processingTime: Date.now() - start,
    });
  }

  private computeInputEffect(
    input: ScenarioInput,
    twin: DigitalTwin,
    durationWeeks: number,
  ): InputEffect {
    switch (input.type) {
      case 'LIFESTYLE':
        return this.computeLifestyleEffect(input, twin, durationWeeks);
      case 'MEDICATION':
        return this.computeMedicationEffect(input, twin, durationWeeks);
      case 'INTERVENTION':
        return this.computeInterventionEffect(input, twin, durationWeeks);
      case 'BIOMARKER':
        return this.computeBiomarkerEffect(input, twin, durationWeeks);
      default:
        return { outcomes: [], riskChanges: [], recommendations: [] };
    }
  }

  private computeLifestyleEffect(
    input: ScenarioInput,
    twin: DigitalTwin,
    durationWeeks: number,
  ): InputEffect {
    const outcomes: PredictedOutcome[] = [];
    const riskChanges: RiskChange[] = [];
    const recommendations: string[] = [];
    const val = String(input.value);

    if (input.name === 'smoking' && val === 'false') {
      const currentRisk = twin.riskState.riskScore;
      const predictedRisk = currentRisk * 0.55;
      outcomes.push(
        this.makeOutcome('cardiovascular_risk_proxy', currentRisk, predictedRisk, '%', durationWeeks, 0.88),
      );
      outcomes.push(
        this.makePctOutcome('crp', twin, -28, 12, 0.80),
      );
      outcomes.push(
        this.makeAbsOutcome('systolic_bp', twin, -4, Math.min(durationWeeks, 24), 0.75),
      );
      riskChanges.push(
        this.makeRiskChange('cardiovascular', twin, -18, 0.88),
      );
      recommendations.push('Iniciar programa estruturado de cessação do tabagismo com suporte farmacológico');
      recommendations.push('Monitoramento de síntomas de abstinência nas primeiras 4 semanas');
    }

    if (input.name === 'physicalActivity' && (val === 'MODERATE' || val === 'VIGOROUS')) {
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -10, Math.min(durationWeeks, 12), 0.82));
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -5, Math.min(durationWeeks, 8), 0.85));
      outcomes.push(this.makePctOutcome('hdl', twin, +10, Math.min(durationWeeks, 12), 0.78));
      if (twin.clinicalState.biomarkers['bmi'] ?? twin.profileSnapshot['bmi']) {
        outcomes.push(this.makePctOutcome('bmi', twin, -4, Math.min(durationWeeks, 24), 0.70));
      }
      riskChanges.push(this.makeRiskChange('metabolic', twin, -10, 0.82));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -8, 0.80));
      recommendations.push('Programa de exercícios supervisionado: 150 min/semana de atividade aeróbica moderada');
      recommendations.push('Avaliação cardiovascular pré-exercício para identificar contraindicações');
    }

    if (input.name === 'dietType' && (val === 'MEDITERRANEAN' || val === 'DASH')) {
      outcomes.push(this.makePctOutcome('ldl', twin, -8, Math.min(durationWeeks, 12), 0.80));
      outcomes.push(this.makePctOutcome('triglycerides', twin, -15, Math.min(durationWeeks, 8), 0.82));
      outcomes.push(this.makePctOutcome('crp', twin, -22, Math.min(durationWeeks, 16), 0.78));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -8, 0.78));
      recommendations.push('Encaminhar para nutricionista para plano alimentar personalizado');
      recommendations.push('Aumentar consumo de vegetais, legumes, azeite de oliva e peixe');
    }

    if (input.name === 'sleepHours' && Number(val) >= 7) {
      outcomes.push(this.makePctOutcome('crp', twin, -12, Math.min(durationWeeks, 8), 0.72));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -5, Math.min(durationWeeks, 12), 0.68));
      recommendations.push('Higiene do sono: horário regular, ambiente escuro e silencioso, sem telas 1h antes de dormir');
    }

    if (input.name === 'stressLevel' && (val === 'LOW' || val === 'NONE')) {
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -4, Math.min(durationWeeks, 8), 0.70));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -6, Math.min(durationWeeks, 12), 0.65));
      recommendations.push('Técnicas de manejo de estresse: mindfulness, meditação, ou psicoterapia');
    }

    return { outcomes, riskChanges, recommendations };
  }

  private computeMedicationEffect(
    input: ScenarioInput,
    twin: DigitalTwin,
    durationWeeks: number,
  ): InputEffect {
    const outcomes: PredictedOutcome[] = [];
    const riskChanges: RiskChange[] = [];
    const recommendations: string[] = [];
    const name = input.name.toLowerCase();

    if (name.includes('statin') || name === 'atorvastatina' || name === 'rosuvastatina') {
      outcomes.push(this.makePctOutcome('ldl', twin, -40, Math.min(durationWeeks, 6), 0.92));
      outcomes.push(this.makePctOutcome('crp', twin, -15, Math.min(durationWeeks, 12), 0.78));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -18, 0.88));
      recommendations.push('Monitorar enzimas hepáticas (ALT/AST) 3 meses após início da estatina');
      recommendations.push('Verificar sintomas musculares (mialgia) — avaliar CK se necessário');
    }

    if (name.includes('metformin') || name === 'metformina') {
      outcomes.push(this.makeAbsOutcome('hba1c', twin, -1.2, Math.min(durationWeeks, 12), 0.88));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -25, Math.min(durationWeeks, 8), 0.85));
      outcomes.push(this.makePctOutcome('bmi', twin, -2, Math.min(durationWeeks, 24), 0.68));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -12, 0.85));
      riskChanges.push(this.makeRiskChange('diabetes', twin, -15, 0.88));
      recommendations.push('Iniciar metformina com dose baixa e titular gradualmente para minimizar efeitos GI');
      recommendations.push('Monitorar função renal (creatinina) a cada 6 meses');
    }

    if (
      name.includes('ace') ||
      name.includes('enalapril') ||
      name.includes('lisinopril') ||
      name.includes('ramipril')
    ) {
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -15, Math.min(durationWeeks, 4), 0.88));
      outcomes.push(this.makeAbsOutcome('diastolic_bp', twin, -8, Math.min(durationWeeks, 4), 0.85));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -12, 0.85));
      recommendations.push('Monitorar função renal e potássio 2 semanas após início do IECA');
      recommendations.push('Orientar sobre tosse seca — possível efeito adverso; substituir por BRA se necessário');
    }

    if (name.includes('beta') || name.includes('atenolol') || name.includes('metoprolol')) {
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -10, Math.min(durationWeeks, 4), 0.85));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -8, 0.80));
      recommendations.push('Não interromper beta-bloqueador abruptamente — risco de efeito rebote');
    }

    if (name.includes('omega3') || name.includes('fibrate') || name.includes('fibrato')) {
      outcomes.push(this.makePctOutcome('triglycerides', twin, -30, Math.min(durationWeeks, 8), 0.85));
      outcomes.push(this.makePctOutcome('hdl', twin, +5, Math.min(durationWeeks, 12), 0.72));
      recommendations.push('Monitorar perfil lipídico completo após 8 semanas de tratamento');
    }

    if (name.includes('glp1') || name.includes('semaglutida') || name.includes('liraglutida')) {
      outcomes.push(this.makeAbsOutcome('hba1c', twin, -1.5, Math.min(durationWeeks, 12), 0.90));
      outcomes.push(this.makePctOutcome('bmi', twin, -8, Math.min(durationWeeks, 24), 0.85));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -20, Math.min(durationWeeks, 8), 0.88));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -15, 0.85));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -18, 0.88));
      recommendations.push('Monitorar sintomas GI (náusea, vômito) nas primeiras semanas de tratamento');
    }

    return { outcomes, riskChanges, recommendations };
  }

  private computeInterventionEffect(
    input: ScenarioInput,
    twin: DigitalTwin,
    durationWeeks: number,
  ): InputEffect {
    const outcomes: PredictedOutcome[] = [];
    const riskChanges: RiskChange[] = [];
    const recommendations: string[] = [];
    const name = input.name.toLowerCase();

    if (name.includes('weight_loss_5') || name === 'perda_peso_5pct') {
      outcomes.push(this.makePctOutcome('bmi', twin, -5, Math.min(durationWeeks, 24), 0.78));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -8, Math.min(durationWeeks, 12), 0.75));
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -4, Math.min(durationWeeks, 12), 0.72));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -8, 0.75));
      recommendations.push('Programa combinado de dieta e atividade física supervisionado por equipe multidisciplinar');
    }

    if (name.includes('weight_loss_10') || name === 'perda_peso_10pct') {
      outcomes.push(this.makePctOutcome('bmi', twin, -10, Math.min(durationWeeks, 24), 0.80));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -15, Math.min(durationWeeks, 12), 0.80));
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -8, Math.min(durationWeeks, 12), 0.78));
      outcomes.push(this.makePctOutcome('ldl', twin, -5, Math.min(durationWeeks, 16), 0.72));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -15, 0.80));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -10, 0.75));
      recommendations.push('Programa intensivo de perda de peso com dieta hipocalórica e suporte psicológico');
    }

    if (name.includes('bariatric') || name.includes('bariátric') || name.includes('cirurgia')) {
      outcomes.push(this.makePctOutcome('bmi', twin, -30, Math.min(durationWeeks, 52), 0.90));
      outcomes.push(this.makeAbsOutcome('hba1c', twin, -2.5, Math.min(durationWeeks, 24), 0.85));
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -40, Math.min(durationWeeks, 24), 0.88));
      outcomes.push(this.makePctOutcome('triglycerides', twin, -40, Math.min(durationWeeks, 24), 0.82));
      riskChanges.push(this.makeRiskChange('metabolic', twin, -30, 0.88));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -20, 0.82));
      riskChanges.push(this.makeRiskChange('diabetes', twin, -35, 0.85));
      recommendations.push('Avaliação multidisciplinar pré-operatória obrigatória: cardiologia, endocrinologia, psiquiatria');
      recommendations.push('Suplementação vitamínica e mineral vitalícia após cirurgia bariátrica');
    }

    if (name.includes('cardiac_rehab') || name.includes('reabilitação_cardíaca')) {
      outcomes.push(this.makePctOutcome('fasting_glucose', twin, -12, Math.min(durationWeeks, 12), 0.82));
      outcomes.push(this.makeAbsOutcome('systolic_bp', twin, -8, Math.min(durationWeeks, 8), 0.85));
      riskChanges.push(this.makeRiskChange('cardiovascular', twin, -20, 0.88));
      recommendations.push('Programa de reabilitação cardíaca supervisionado 3x/semana por 12 semanas');
    }

    return { outcomes, riskChanges, recommendations };
  }

  private computeBiomarkerEffect(
    input: ScenarioInput,
    twin: DigitalTwin,
    durationWeeks: number,
  ): InputEffect {
    const current = twin.getBiomarker(input.name) ?? BIOMARKER_DEFAULTS[input.name.toLowerCase()] ?? 0;
    const target = Number(input.value);
    const changePercent = current !== 0 ? ((target - current) / current) * 100 : 0;

    return {
      outcomes: [
        {
          metric: input.name.toLowerCase(),
          currentValue: current,
          predictedValue: target,
          timeframeWeeks: durationWeeks,
          confidence: 0.70,
          changePercent,
        },
      ],
      riskChanges: [],
      recommendations: [`Alvo terapêutico para ${input.name}: ${target}`],
    };
  }

  private makePctOutcome(
    metric: string,
    twin: DigitalTwin,
    pctChange: number,
    weeks: number,
    confidence: number,
  ): PredictedOutcome {
    const current = twin.getBiomarker(metric) ?? BIOMARKER_DEFAULTS[metric] ?? 0;
    const predicted = Math.max(0, current * (1 + pctChange / 100));
    return {
      metric,
      currentValue: current,
      predictedValue: Math.round(predicted * 100) / 100,
      timeframeWeeks: weeks,
      confidence,
      changePercent: pctChange,
    };
  }

  private makeAbsOutcome(
    metric: string,
    twin: DigitalTwin,
    absChange: number,
    weeks: number,
    confidence: number,
  ): PredictedOutcome {
    const current = twin.getBiomarker(metric) ?? BIOMARKER_DEFAULTS[metric] ?? 0;
    const predicted = Math.max(0, current + absChange);
    const changePercent = current !== 0 ? (absChange / current) * 100 : 0;
    return {
      metric,
      currentValue: current,
      predictedValue: Math.round(predicted * 100) / 100,
      timeframeWeeks: weeks,
      confidence,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  private makeOutcome(
    metric: string,
    current: number,
    predicted: number,
    unit: string,
    weeks: number,
    confidence: number,
  ): PredictedOutcome {
    const changePercent = current !== 0 ? ((predicted - current) / current) * 100 : 0;
    return {
      metric,
      currentValue: Math.round(current * 100) / 100,
      predictedValue: Math.round(predicted * 100) / 100,
      unit,
      timeframeWeeks: weeks,
      confidence,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  private makeRiskChange(
    riskType: string,
    twin: DigitalTwin,
    scoreDelta: number,
    confidence: number,
  ): RiskChange {
    const toLevel = (s: number): RiskLevel => {
      if (s < 20) return 'VERY_LOW';
      if (s < 40) return 'LOW';
      if (s < 60) return 'MODERATE';
      if (s < 80) return 'HIGH';
      return 'VERY_HIGH';
    };
    const currentScore = twin.riskState.riskScore;
    const predictedScore = Math.max(0, Math.min(100, currentScore + scoreDelta));
    const currentLevel = toLevel(currentScore);
    const predictedLevel = toLevel(predictedScore);
    const direction =
      scoreDelta < -1 ? 'IMPROVED' : scoreDelta > 1 ? 'WORSENED' : 'STABLE';
    return { riskType, currentLevel, predictedLevel, delta: scoreDelta, direction };
  }

  private mergeOutcomes(outcomes: PredictedOutcome[]): PredictedOutcome[] {
    const map = new Map<string, PredictedOutcome[]>();
    for (const o of outcomes) {
      const existing = map.get(o.metric) ?? [];
      existing.push(o);
      map.set(o.metric, existing);
    }

    return [...map.entries()].map(([metric, list]) => {
      if (list.length === 1) return list[0];
      const totalPct = list.reduce((sum, o) => sum + (o.changePercent ?? 0), 0);
      const avgConf = list.reduce((sum, o) => sum + o.confidence, 0) / list.length;
      const base = list[0];
      const current = base.currentValue;
      const predicted = Math.max(0, current * (1 + totalPct / 100));
      return {
        metric,
        currentValue: current,
        predictedValue: Math.round(predicted * 100) / 100,
        unit: base.unit,
        timeframeWeeks: Math.max(...list.map((o) => o.timeframeWeeks)),
        confidence: Math.round(avgConf * 100) / 100,
        changePercent: Math.round(totalPct * 10) / 10,
      };
    });
  }

  private mergeRiskChanges(riskChanges: RiskChange[], twin: DigitalTwin): RiskChange[] {
    const map = new Map<string, number>();
    for (const rc of riskChanges) {
      map.set(rc.riskType, (map.get(rc.riskType) ?? 0) + rc.delta);
    }

    const toLevel = (s: number): RiskLevel => {
      if (s < 20) return 'VERY_LOW';
      if (s < 40) return 'LOW';
      if (s < 60) return 'MODERATE';
      if (s < 80) return 'HIGH';
      return 'VERY_HIGH';
    };

    return [...map.entries()].map(([riskType, totalDelta]) => {
      const currentScore = twin.riskState.riskScore;
      const predictedScore = Math.max(0, Math.min(100, currentScore + totalDelta));
      const direction =
        totalDelta < -1 ? 'IMPROVED' : totalDelta > 1 ? 'WORSENED' : 'STABLE';
      return {
        riskType,
        currentLevel: toLevel(currentScore),
        predictedLevel: toLevel(predictedScore),
        delta: totalDelta,
        direction,
      };
    });
  }

  private buildLimitations(twin: DigitalTwin, scenario: SimulationScenario): string[] {
    const lims: string[] = [
      'Previsões baseadas em médias populacionais — resposta individual pode variar',
      'Modelo não considera interações medicamentosas ou comorbidades não declaradas',
    ];
    if (scenario.inputs.length > 3) {
      lims.push('Múltiplas intervenções simultâneas aumentam a incerteza dos resultados combinados');
    }
    if (twin.riskState.riskScore > 70) {
      lims.push('Paciente de alto risco: acompanhamento especializado é necessário antes de iniciar qualquer intervenção');
    }
    return lims;
  }

  private computeConfidence(scenario: SimulationScenario, twin: DigitalTwin): number {
    let base = 0.80;
    if (scenario.inputs.length > 3) base -= 0.05;
    if (twin.riskState.riskScore > 70) base -= 0.05;
    if (scenario.expectedDuration > 24) base -= 0.05;
    return Math.max(0.50, Math.min(1, base));
  }
}
