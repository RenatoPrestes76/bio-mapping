import { JourneyPath } from '../entities/journey-path.entity.js';
import { JourneyPhase } from '../entities/journey-phase.entity.js';
import type { PhaseType, PhaseStatus } from '../entities/journey-phase.entity.js';
import type { JourneyDirection } from '../entities/journey-path.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import type { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';
import type { PersonalGoal } from '../../bio-book-insight/entities/personal-goal.entity.js';
import type { HealthScorePoint } from '../../bio-book-insight/entities/health-score-point.entity.js';

const PHASE_ORDER: PhaseType[] = [
  'INITIAL_ASSESSMENT',
  'BASELINE_ESTABLISHMENT',
  'HABIT_FORMATION',
  'METABOLIC_CONTROL',
  'CONSOLIDATION',
  'OPTIMIZATION',
  'LONGEVITY_FOCUS',
  'PERFORMANCE',
];

const PHASE_ACTIONS: Record<PhaseType, string[]> = {
  INITIAL_ASSESSMENT: ['Registrar primeiros dados de saúde', 'Realizar avaliação médica inicial'],
  BASELINE_ESTABLISHMENT: ['Completar exames laboratoriais de referência', 'Mapear histórico familiar'],
  HABIT_FORMATION: ['Manter consistência de consultas', 'Estabelecer rotina de exames periódicos'],
  METABOLIC_CONTROL: ['Monitorar biomarcadores mensalmente', 'Ajustar terapia conforme orientação médica'],
  CONSOLIDATION: ['Manter indicadores dentro das metas', 'Registrar todas as intervenções'],
  OPTIMIZATION: ['Refinar metas individuais', 'Explorar saúde preditiva e genômica'],
  LONGEVITY_FOCUS: ['Implementar estratégias preventivas de longo prazo', 'Integrar dados genômicos'],
  PERFORMANCE: ['Manter acompanhamento de excelência', 'Compartilhar dados com equipe multidisciplinar'],
};

const PHASE_CRITERIA: Record<PhaseType, string[]> = {
  INITIAL_ASSESSMENT: ['Pelo menos um registro clínico', 'Avaliação médica realizada'],
  BASELINE_ESTABLISHMENT: ['3+ exames laboratoriais registrados', 'Diagnósticos identificados'],
  HABIT_FORMATION: ['Consultas regulares por 3 meses', 'Exames periódicos em dia'],
  METABOLIC_CONTROL: ['Pelo menos 1 biomarcador melhorado', 'Regime terapêutico estabelecido'],
  CONSOLIDATION: ['Metas mantidas por 6+ meses', '2+ marcos de saúde alcançados'],
  OPTIMIZATION: ['Todos os indicadores dentro das metas', 'Score de saúde acima de 75'],
  LONGEVITY_FOCUS: ['Dados genômicos integrados', 'Plano preventivo de longo prazo ativo'],
  PERFORMANCE: ['Score de saúde acima de 85', 'Zero hospitalizations no último ano'],
};

export class JourneyPathEngine {
  compute(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
    goals: PersonalGoal[],
    scoreEvolution: HealthScorePoint[],
  ): JourneyPath {
    const currentPhaseType = this.determineCurrentPhase(events, milestones, goals, scoreEvolution);
    const currentIdx = PHASE_ORDER.indexOf(currentPhaseType);
    const phases = this.buildPhases(currentIdx);
    const direction = this.computeDirection(scoreEvolution, milestones, events);
    const progress = this.computeProgress(currentIdx, phases.length);
    const narrative = this.buildNarrative(currentPhaseType, direction, events, milestones);

    return new JourneyPath({
      patientId,
      phases,
      currentPhaseIndex: currentIdx,
      progressPercentage: progress,
      overallDirection: direction,
      narrative,
    });
  }

  private determineCurrentPhase(
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
    goals: PersonalGoal[],
    scoreEvolution: HealthScorePoint[],
  ): PhaseType {
    if (!events.length) return 'INITIAL_ASSESSMENT';

    const landmarkMs = milestones.filter((m) => m.isLandmark()).length;
    const biomarkerMs = milestones.filter((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT').length;
    const consistencyMs = milestones.filter((m) => m.milestoneType === 'HABIT_CONSISTENCY').length;
    const genomicEvents = events.filter((e) => e.eventType === 'GENOMIC_DISCOVERY').length;
    const labEvents = events.filter((e) => e.eventType === 'LAB_RESULT').length;

    const latestScore = scoreEvolution[scoreEvolution.length - 1]?.score ?? 0;
    const achievedGoals = goals.filter((g) => g.isCompleted()).length;
    const spanDays = this.computeSpanDays(events);

    if (latestScore >= 85 && landmarkMs >= 3 && achievedGoals >= 2) return 'PERFORMANCE';
    if (genomicEvents > 0 && latestScore >= 70 && spanDays > 365) return 'LONGEVITY_FOCUS';
    if (latestScore >= 75 && landmarkMs >= 2 && spanDays > 180) return 'OPTIMIZATION';
    if (landmarkMs >= 1 && consistencyMs >= 1 && spanDays > 90) return 'CONSOLIDATION';
    if (biomarkerMs >= 1 || labEvents >= 4) return 'METABOLIC_CONTROL';
    if (consistencyMs >= 1 || spanDays > 60) return 'HABIT_FORMATION';
    if (labEvents >= 2 || events.length >= 3) return 'BASELINE_ESTABLISHMENT';
    return 'INITIAL_ASSESSMENT';
  }

  private buildPhases(currentIdx: number): JourneyPhase[] {
    return PHASE_ORDER.map((type, idx) => {
      let status: PhaseStatus;
      if (idx < currentIdx) status = 'COMPLETED';
      else if (idx === currentIdx) status = 'CURRENT';
      else if (idx === currentIdx + 1) status = 'UPCOMING';
      else status = 'FUTURE';

      return new JourneyPhase({
        type,
        status,
        order: idx + 1,
        keyActions: PHASE_ACTIONS[type],
        successCriteria: PHASE_CRITERIA[type],
      });
    });
  }

  private computeDirection(
    scoreEvolution: HealthScorePoint[],
    milestones: HealthMilestone[],
    events: NarrativeEvent[],
  ): JourneyDirection {
    const hasHospitalization = events.some((e) => e.eventType === 'HOSPITALIZATION');
    if (hasHospitalization) return 'NEEDS_ATTENTION';

    if (scoreEvolution.length >= 3) {
      const last3 = scoreEvolution.slice(-3);
      const allUp = last3.every((p, i) => i === 0 || p.score >= last3[i - 1].score);
      if (allUp && last3[2].score > last3[0].score) return 'ADVANCING';
      const allDown = last3.every((p, i) => i === 0 || p.score < last3[i - 1].score);
      if (allDown) return 'NEEDS_ATTENTION';
    }

    const landmarkMs = milestones.filter((m) => m.isLandmark()).length;
    if (landmarkMs > 0) return 'ADVANCING';

    return 'STABLE';
  }

  private computeProgress(currentIdx: number, totalPhases: number): number {
    return Math.round((currentIdx / (totalPhases - 1)) * 100);
  }

  private buildNarrative(
    phase: PhaseType,
    direction: JourneyDirection,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): string {
    const directionText =
      direction === 'ADVANCING' ? 'em evolução positiva' :
      direction === 'NEEDS_ATTENTION' ? 'com pontos de atenção' : 'em acompanhamento estável';

    const phaseLabels: Record<PhaseType, string> = {
      INITIAL_ASSESSMENT: 'avaliação inicial',
      BASELINE_ESTABLISHMENT: 'estabelecimento de linha de base',
      HABIT_FORMATION: 'formação de hábitos',
      METABOLIC_CONTROL: 'controle metabólico',
      CONSOLIDATION: 'consolidação de hábitos',
      OPTIMIZATION: 'otimização de indicadores',
      LONGEVITY_FOCUS: 'foco em longevidade',
      PERFORMANCE: 'performance e bem-estar avançado',
    };

    return `Sua jornada está ${directionText}, na fase de ${phaseLabels[phase]}. ` +
      `Com ${events.length} evento(s) registrado(s) e ${milestones.length} marco(s) conquistado(s), ` +
      `você está construindo um histórico de saúde consistente e personalizado.`;
  }

  private computeSpanDays(events: NarrativeEvent[]): number {
    if (events.length < 2) return 0;
    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    return Math.ceil((sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / 86_400_000);
  }
}
