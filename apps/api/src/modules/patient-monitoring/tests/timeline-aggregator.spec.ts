import { InsightPriority, PathwayStatus, RecommendationStatus, TimelineEventSeverity, TimelineEventType } from '@bio/database';
import { TimelineAggregator } from '../aggregators/timeline-aggregator.js';

const now = new Date('2024-01-15T12:00:00Z');
const earlier = new Date('2024-01-14T12:00:00Z');

const decision = {
  id: 'dec-1', patientId: 'p-1', title: 'Hipertensão não controlada',
  description: 'PA elevada', priority: 'CRITICAL', status: 'OPEN', ruleId: 'HYPERTENSION_UNCONTROLLED',
  createdAt: now,
};

const pathway = {
  id: 'pw-1', patientId: 'p-1', name: 'Jornada Hipertensão',
  description: 'Controle de PA', status: PathwayStatus.ACTIVE, templateId: 'HYPERTENSION_UNCONTROLLED',
  startedAt: earlier,
};

const insight = {
  id: 'ins-1', patientId: 'p-1', title: 'Risco cardiovascular elevado',
  message: 'Índices fora do padrão', priority: InsightPriority.ALTA_PRIORIDADE,
  category: 'CARDIOVASCULAR', isRead: false, generatedAt: earlier,
};

const recommendation = {
  id: 'rec-1', patientId: 'p-1', title: 'Reduzir sódio',
  description: 'Consumo máximo 2g/dia', priority: InsightPriority.IMPORTANTE,
  status: RecommendationStatus.PENDING, action: 'DIET_CHANGE', generatedAt: earlier,
};

const prediction = {
  id: 'pred-1', patientId: 'p-1', metric: 'blood_pressure',
  riskLevel: 'HIGH', explanation: 'Tendência de alta', trend: 'INCREASING',
  confidence: 0.87, generatedAt: earlier,
};

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  clinicalDecision: { findMany: jest.fn().mockResolvedValue([decision]) },
  clinicalPathway: { findMany: jest.fn().mockResolvedValue([pathway]) },
  healthInsight: { findMany: jest.fn().mockResolvedValue([insight]) },
  recommendation: { findMany: jest.fn().mockResolvedValue([recommendation]) },
  healthPrediction: { findMany: jest.fn().mockResolvedValue([prediction]) },
  ...overrides,
});

describe('TimelineAggregator', () => {
  describe('aggregate', () => {
    it('returns events from all 5 source tables', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      expect(events.length).toBe(5);
    });

    it('sorts events by occurredAt descending', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].occurredAt.getTime()).toBeGreaterThanOrEqual(events[i].occurredAt.getTime());
      }
    });

    it('maps CRITICAL decision priority to CRITICAL severity', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      const decisionEvent = events.find((e) => e.sourceTable === 'clinical_decisions')!;
      expect(decisionEvent.eventType).toBe(TimelineEventType.DECISION_CREATED);
      expect(decisionEvent.severity).toBe(TimelineEventSeverity.CRITICAL);
    });

    it('maps ALTA_PRIORIDADE insight priority to CRITICAL severity', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      const insightEvent = events.find((e) => e.sourceTable === 'health_insights')!;
      expect(insightEvent.eventType).toBe(TimelineEventType.INSIGHT_GENERATED);
      expect(insightEvent.severity).toBe(TimelineEventSeverity.CRITICAL);
    });

    it('maps IMPORTANTE recommendation priority to HIGH severity', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      const recEvent = events.find((e) => e.sourceTable === 'recommendations')!;
      expect(recEvent.severity).toBe(TimelineEventSeverity.HIGH);
    });

    it('maps HIGH prediction riskLevel to HIGH severity', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      const predEvent = events.find((e) => e.sourceTable === 'health_predictions')!;
      expect(predEvent.eventType).toBe(TimelineEventType.PREDICTION_GENERATED);
      expect(predEvent.severity).toBe(TimelineEventSeverity.HIGH);
    });

    it('maps COMPLETED pathway status to PATHWAY_COMPLETED event type', async () => {
      const completedPathway = { ...pathway, status: PathwayStatus.COMPLETED };
      const prisma = makePrisma();
      (prisma.clinicalPathway.findMany as jest.Mock).mockResolvedValue([completedPathway]);
      const aggregator = new TimelineAggregator(prisma as never);
      const events = await aggregator.aggregate('p-1');
      const pathwayEvent = events.find((e) => e.sourceTable === 'clinical_pathways')!;
      expect(pathwayEvent.eventType).toBe(TimelineEventType.PATHWAY_COMPLETED);
    });

    it('maps ACCEPTED recommendation status to RECOMMENDATION_ACCEPTED event type', async () => {
      const accepted = { ...recommendation, status: RecommendationStatus.ACCEPTED };
      const prisma = makePrisma();
      (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([accepted]);
      const aggregator = new TimelineAggregator(prisma as never);
      const events = await aggregator.aggregate('p-1');
      const recEvent = events.find((e) => e.sourceTable === 'recommendations')!;
      expect(recEvent.eventType).toBe(TimelineEventType.RECOMMENDATION_ACCEPTED);
    });

    it('returns empty array when all tables are empty', async () => {
      const prisma = {
        clinicalDecision: { findMany: jest.fn().mockResolvedValue([]) },
        clinicalPathway: { findMany: jest.fn().mockResolvedValue([]) },
        healthInsight: { findMany: jest.fn().mockResolvedValue([]) },
        recommendation: { findMany: jest.fn().mockResolvedValue([]) },
        healthPrediction: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const aggregator = new TimelineAggregator(prisma as never);
      const events = await aggregator.aggregate('p-1');
      expect(events).toHaveLength(0);
    });

    it('includes sourceId and sourceTable on each event', async () => {
      const aggregator = new TimelineAggregator(makePrisma() as never);
      const events = await aggregator.aggregate('p-1');
      for (const event of events) {
        expect(event.sourceId).toBeTruthy();
        expect(event.sourceTable).toBeTruthy();
      }
    });

    it('respects limit parameter', async () => {
      const manyDecisions = Array.from({ length: 10 }, (_, i) => ({
        ...decision, id: `dec-${i}`, createdAt: new Date(now.getTime() - i * 1000),
      }));
      const prisma = makePrisma();
      (prisma.clinicalDecision.findMany as jest.Mock).mockResolvedValue(manyDecisions);
      (prisma.clinicalPathway.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.healthInsight.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.healthPrediction.findMany as jest.Mock).mockResolvedValue([]);
      const aggregator = new TimelineAggregator(prisma as never);
      const events = await aggregator.aggregate('p-1', 5);
      expect(events).toHaveLength(5);
    });
  });
});
