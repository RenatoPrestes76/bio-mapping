import { PersonalGoal } from '../entities/personal-goal.entity.js';
import type { GoalCategory, GoalStatus } from '../entities/personal-goal.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import type { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';

interface GoalInput {
  category: string;
  title: string;
  targetDescription: string;
}

const CATEGORY_GOAL_MAP: Array<{
  category: GoalCategory;
  title: string;
  description: string;
  targetDescription: string;
  relatedEventTypes: string[];
  relatedMilestoneTypes: string[];
}> = [
  {
    category: 'METABOLIC',
    title: 'Melhorar saúde metabólica',
    description: 'Atingir e manter indicadores metabólicos dentro das faixas ideais.',
    targetDescription: 'HbA1c, glicose e indicadores metabólicos dentro das metas clínicas.',
    relatedEventTypes: ['LAB_RESULT'],
    relatedMilestoneTypes: ['BIOMARKER_IMPROVEMENT'],
  },
  {
    category: 'CARDIOVASCULAR',
    title: 'Saúde cardiovascular',
    description: 'Controlar colesterol, pressão e outros fatores cardiovasculares.',
    targetDescription: 'LDL, HDL e pressão arterial dentro das metas.',
    relatedEventTypes: ['LAB_RESULT', 'CONSULTATION'],
    relatedMilestoneTypes: ['BIOMARKER_IMPROVEMENT', 'RISK_REDUCTION'],
  },
  {
    category: 'LIFESTYLE',
    title: 'Melhora de hábitos e estilo de vida',
    description: 'Melhorar qualidade de vida com acompanhamento contínuo.',
    targetDescription: 'Consultas regulares e exames periódicos mantidos.',
    relatedEventTypes: ['CONSULTATION', 'CLINICAL_RECOMMENDATION'],
    relatedMilestoneTypes: ['HABIT_CONSISTENCY', 'LIFESTYLE_ACHIEVEMENT'],
  },
  {
    category: 'MEDICATION',
    title: 'Adesão terapêutica',
    description: 'Manter adesão ao regime terapêutico prescrito.',
    targetDescription: 'Medicações mantidas sem interrupções não justificadas.',
    relatedEventTypes: ['MEDICATION_START', 'THERAPEUTIC_CHANGE'],
    relatedMilestoneTypes: ['MEDICATION_OPTIMIZATION'],
  },
  {
    category: 'LONGEVITY',
    title: 'Longevidade e saúde preventiva',
    description: 'Investir em saúde preventiva e dados de longo prazo.',
    targetDescription: 'Dados de saúde abrangentes e histórico longitudinal construído.',
    relatedEventTypes: ['GENOMIC_DISCOVERY'],
    relatedMilestoneTypes: ['LONGEVITY_INDICATOR', 'DIAGNOSTIC_INSIGHT'],
  },
];

export class GoalEvolutionEngine {
  buildGoals(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
    goalInputs: GoalInput[],
  ): PersonalGoal[] {
    const goals: PersonalGoal[] = [];
    const eventTypes = new Set<string>(events.map((e) => e.eventType));
    const milestoneTypes = new Set<string>(milestones.map((m) => m.milestoneType));

    const startedAt = events.length
      ? [...events].sort((a, b) => a.date.getTime() - b.date.getTime())[0].date
      : new Date();

    if (goalInputs.length > 0) {
      for (const input of goalInputs) {
        const template = CATEGORY_GOAL_MAP.find(
          (t) => t.category === input.category || t.title.toLowerCase().includes(input.title.toLowerCase()),
        );
        const progress = template
          ? this.computeProgress(template.relatedEventTypes, template.relatedMilestoneTypes, eventTypes, milestoneTypes)
          : 30;
        goals.push(this.makeGoal(patientId, input.category as GoalCategory, input.title, input.title, input.targetDescription, progress, events, milestones, startedAt));
      }
      return goals;
    }

    for (const template of CATEGORY_GOAL_MAP) {
      const hasRelatedEvents = template.relatedEventTypes.some((t) => eventTypes.has(t));
      const hasRelatedMilestones = template.relatedMilestoneTypes.some((t) => milestoneTypes.has(t));
      if (!hasRelatedEvents && !hasRelatedMilestones) continue;

      const progress = this.computeProgress(
        template.relatedEventTypes,
        template.relatedMilestoneTypes,
        eventTypes,
        milestoneTypes,
      );
      const evidences = this.buildEvidences(template.relatedEventTypes, template.relatedMilestoneTypes, events, milestones);

      goals.push(
        new PersonalGoal({
          patientId,
          category: template.category,
          title: template.title,
          description: template.description,
          targetDescription: template.targetDescription,
          progressPercent: progress,
          status: this.progressToStatus(progress),
          evidences,
          startedAt,
        }),
      );
    }

    return goals;
  }

  private makeGoal(
    patientId: string,
    category: GoalCategory,
    title: string,
    description: string,
    targetDescription: string,
    progress: number,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
    startedAt: Date,
  ): PersonalGoal {
    const template = CATEGORY_GOAL_MAP.find((t) => t.category === category);
    const evidences = template
      ? this.buildEvidences(template.relatedEventTypes, template.relatedMilestoneTypes, events, milestones)
      : [];
    return new PersonalGoal({
      patientId, category, title, description, targetDescription,
      progressPercent: progress, status: this.progressToStatus(progress),
      evidences, startedAt,
    });
  }

  private computeProgress(
    relatedEventTypes: string[],
    relatedMilestoneTypes: string[],
    eventTypes: Set<string>,
    milestoneTypes: Set<string>,
  ): number {
    let score = 30;
    const eventMatches = relatedEventTypes.filter((t) => eventTypes.has(t)).length;
    const milestoneMatches = relatedMilestoneTypes.filter((t) => milestoneTypes.has(t)).length;

    score += eventMatches * 15;
    score += milestoneMatches * 20;

    return Math.min(100, score);
  }

  private buildEvidences(
    relatedEventTypes: string[],
    relatedMilestoneTypes: string[],
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): string[] {
    const evidences: string[] = [];

    for (const type of relatedEventTypes) {
      const count = events.filter((e) => e.eventType === type).length;
      if (count > 0) evidences.push(`${count} evento(s) de ${type.toLowerCase().replace(/_/g, ' ')}`);
    }

    for (const type of relatedMilestoneTypes) {
      const ms = milestones.filter((m) => m.milestoneType === type);
      for (const m of ms) evidences.push(m.title);
    }

    return evidences.slice(0, 5);
  }

  private progressToStatus(progress: number): GoalStatus {
    if (progress >= 100) return 'ACHIEVED';
    if (progress >= 60) return 'ON_TRACK';
    if (progress >= 30) return 'ON_TRACK';
    return 'NOT_STARTED';
  }
}
