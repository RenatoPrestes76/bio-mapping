import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';
import { ClinicalAlert, AlertSeverity } from '../entities/inference-result.entity.js';

export class RiskStrategy implements IReasoningStrategy {
  readonly name = 'RISK';
  readonly weight = 0.90;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const candidates: HypothesisCandidate[] = [];
    const alerts: ClinicalAlert[] = [];

    const criticalAlerts = this.detectCriticalBiomarkers(context);
    alerts.push(...criticalAlerts);

    if (context.clinicalCase.isElderly() && context.clinicalCase.medications.length >= 5) {
      alerts.push({
        id: `alert-polypharmacy-${Date.now()}`,
        severity: AlertSeverity.HIGH,
        condition: 'Polifarmácia',
        message: `Paciente idoso com ${context.clinicalCase.medications.length} medicamentos — risco de interações`,
        action: 'Revisar regime medicamentoso; considerar deprescrição',
      });
    }

    if (criticalAlerts.some((a) => a.severity === AlertSeverity.CRITICAL)) {
      candidates.push({
        condition: 'Emergência Metabólica',
        rawProbability: 0.85,
        rawConfidence: 0.90,
        supportingEvidence: criticalAlerts.map((a) => a.message),
        contradictingEvidence: [],
        recommendedActions: ['Avaliação médica imediata', 'Monitoramento contínuo dos parâmetros vitais'],
        strategyName: this.name,
      });
    }

    context.setMeta('riskAlerts', alerts);

    const step = new ReasoningStep({
      id: `step-risk-${Date.now()}`,
      strategyName: this.name,
      description: `Risk assessment: ${alerts.length} alerts generated (${criticalAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length} critical)`,
      confidence: 0.88,
      duration: Date.now() - start,
      input: { medications: context.clinicalCase.medications.length, age: context.clinicalCase.age },
      output: { alertCount: alerts.length, candidateCount: candidates.length },
    });

    return { candidates, steps: [step], strategyName: this.name, confidence: 0.88 };
  }

  private detectCriticalBiomarkers(context: ReasoningContext): ClinicalAlert[] {
    const { clinicalCase } = context;
    const alerts: ClinicalAlert[] = [];

    const glucose = clinicalCase.getBiomarker('fasting_glucose') ?? clinicalCase.getBiomarker('glicemia');
    if (glucose) {
      if (glucose.value >= 400) {
        alerts.push({
          id: `alert-hyperglycemia-critical-${Date.now()}`,
          severity: AlertSeverity.CRITICAL,
          condition: 'Hiperglicemia Grave',
          message: `Glicemia criticamente elevada: ${glucose.value} mg/dL (≥ 400)`,
          action: 'Avaliação de emergência — possível cetoacidose ou estado hiperosmolar',
        });
      } else if (glucose.value >= 300) {
        alerts.push({
          id: `alert-hyperglycemia-high-${Date.now()}`,
          severity: AlertSeverity.HIGH,
          condition: 'Hiperglicemia Severa',
          message: `Glicemia severamente elevada: ${glucose.value} mg/dL (≥ 300)`,
          action: 'Ajuste imediato de terapia; monitorar sinais de descompensação',
        });
      }
    }

    const sbp = clinicalCase.getBiomarker('systolic_bp') ?? clinicalCase.getBiomarker('pas');
    if (sbp) {
      if (sbp.value >= 180) {
        alerts.push({
          id: `alert-hypertensive-crisis-${Date.now()}`,
          severity: AlertSeverity.CRITICAL,
          condition: 'Crise Hipertensiva',
          message: `PA sistólica criticamente elevada: ${sbp.value} mmHg (≥ 180)`,
          action: 'Avaliação de emergência — crise hipertensiva; descartar lesão de órgão-alvo aguda',
        });
      } else if (sbp.value >= 160) {
        alerts.push({
          id: `alert-hypertension-severe-${Date.now()}`,
          severity: AlertSeverity.HIGH,
          condition: 'Hipertensão Severa',
          message: `PA sistólica severamente elevada: ${sbp.value} mmHg (≥ 160)`,
          action: 'Intensificação imediata da terapia anti-hipertensiva',
        });
      }
    }

    const hba1c = clinicalCase.getBiomarker('hba1c');
    if (hba1c && hba1c.value >= 10) {
      alerts.push({
        id: `alert-hba1c-${Date.now()}`,
        severity: AlertSeverity.HIGH,
        condition: 'HbA1c Criticamente Elevada',
        message: `HbA1c de ${hba1c.value}% indica controle glicêmico muito precário`,
        action: 'Revisão urgente do plano terapêutico antidiabético',
      });
    }

    const ldl = clinicalCase.getBiomarker('ldl');
    if (ldl && ldl.value >= 250) {
      alerts.push({
        id: `alert-ldl-${Date.now()}`,
        severity: AlertSeverity.HIGH,
        condition: 'Hipercolesterolemia Grave',
        message: `LDL de ${ldl.value} mg/dL — hiperlipidemia familiar possível`,
        action: 'Iniciar estatina de alta intensidade; avaliar teste genético para hiperlipidemia familiar',
      });
    }

    return alerts;
  }
}
