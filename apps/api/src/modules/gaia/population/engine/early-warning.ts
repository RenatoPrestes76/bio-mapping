export type CohortAlertType = 'RISK_INCREASE' | 'DISEASE_GROWTH' | 'ADHERENCE_DROP' | 'BIOMARKER_CHANGE' | 'TREND_SHIFT';
export type CohortAlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface AlertDefinition {
  alertType: CohortAlertType;
  severity: CohortAlertSeverity;
  title: string;
  description: string;
  metricKey: string;
  currentValue: number;
  previousValue: number;
}

export interface PopulationSnapshot {
  meanRisk: number;
  prevalences: Record<string, number>;
  adherenceRate: number;
  biomarkers?: Record<string, number>;
}

export function classifyAlertSeverity(deltaPercent: number): CohortAlertSeverity {
  const abs = Math.abs(deltaPercent);
  if (abs >= 30) return 'CRITICAL';
  if (abs >= 20) return 'HIGH';
  if (abs >= 10) return 'MODERATE';
  return 'LOW';
}

export function checkRiskIncrease(
  currentMeanRisk: number,
  previousMeanRisk: number,
  threshold = 0.03,
): AlertDefinition | null {
  const delta = currentMeanRisk - previousMeanRisk;
  if (delta < threshold) return null;
  const deltaPercent = previousMeanRisk > 0 ? delta / previousMeanRisk * 100 : 100;
  return {
    alertType: 'RISK_INCREASE',
    severity: classifyAlertSeverity(deltaPercent),
    title: 'Aumento de risco médio detectado',
    description: `O risco médio da população aumentou ${deltaPercent.toFixed(1)}% em relação ao período anterior.`,
    metricKey: 'mean_risk',
    currentValue: currentMeanRisk,
    previousValue: previousMeanRisk,
  };
}

export function checkPrevalenceGrowth(
  condition: string,
  currentPrevalence: number,
  previousPrevalence: number,
  threshold = 0.05,
): AlertDefinition | null {
  const delta = currentPrevalence - previousPrevalence;
  if (delta < threshold) return null;
  const deltaPercent = previousPrevalence > 0 ? delta / previousPrevalence * 100 : 100;
  return {
    alertType: 'DISEASE_GROWTH',
    severity: classifyAlertSeverity(deltaPercent),
    title: `Crescimento na prevalência: ${condition}`,
    description: `A prevalência de "${condition}" aumentou ${deltaPercent.toFixed(1)}% em relação ao período anterior.`,
    metricKey: `prevalence_${condition}`,
    currentValue: currentPrevalence,
    previousValue: previousPrevalence,
  };
}

export function checkAdherenceDrop(
  currentRate: number,
  previousRate: number,
  threshold = 0.03,
): AlertDefinition | null {
  const delta = previousRate - currentRate;
  if (delta < threshold) return null;
  const deltaPercent = previousRate > 0 ? delta / previousRate * 100 : 0;
  return {
    alertType: 'ADHERENCE_DROP',
    severity: classifyAlertSeverity(deltaPercent),
    title: 'Queda na adesão detectada',
    description: `A taxa de adesão caiu ${deltaPercent.toFixed(1)}% em relação ao período anterior.`,
    metricKey: 'adherence_rate',
    currentValue: currentRate,
    previousValue: previousRate,
  };
}

export function checkBiomarkerChange(
  biomarkerKey: string,
  currentValue: number,
  previousValue: number,
  threshold = 0.10,
): AlertDefinition | null {
  if (previousValue === 0) return null;
  const deltaPercent = Math.abs((currentValue - previousValue) / previousValue * 100);
  if (deltaPercent < threshold * 100) return null;
  return {
    alertType: 'BIOMARKER_CHANGE',
    severity: classifyAlertSeverity(deltaPercent),
    title: `Variação significativa em biomarcador: ${biomarkerKey}`,
    description: `O biomarcador "${biomarkerKey}" variou ${deltaPercent.toFixed(1)}% na população.`,
    metricKey: `biomarker_${biomarkerKey}`,
    currentValue,
    previousValue,
  };
}

export function detectAlerts(
  current: PopulationSnapshot,
  previous: PopulationSnapshot,
): AlertDefinition[] {
  const alerts: AlertDefinition[] = [];

  const riskAlert = checkRiskIncrease(current.meanRisk, previous.meanRisk);
  if (riskAlert) alerts.push(riskAlert);

  for (const [condition, prev] of Object.entries(previous.prevalences)) {
    const curr = current.prevalences[condition] ?? 0;
    const alert = checkPrevalenceGrowth(condition, curr, prev);
    if (alert) alerts.push(alert);
  }

  const adherenceAlert = checkAdherenceDrop(current.adherenceRate, previous.adherenceRate);
  if (adherenceAlert) alerts.push(adherenceAlert);

  if (current.biomarkers && previous.biomarkers) {
    for (const [key, prev] of Object.entries(previous.biomarkers)) {
      const curr = current.biomarkers[key] ?? 0;
      const alert = checkBiomarkerChange(key, curr, prev);
      if (alert) alerts.push(alert);
    }
  }

  return alerts.sort((a, b) => {
    const order: Record<CohortAlertSeverity, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
}
