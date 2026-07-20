import { Injectable } from '@nestjs/common';
import { ClinicalEvent } from '../entities/clinical-event.entity.js';
import { HealthTimeline } from '../entities/health-timeline.entity.js';
import type { AnalyzeLongitudinalDto } from '../dto/longitudinal-health.dto.js';
import { TimelineBuilderEngine } from '../engines/timeline-builder.engine.js';
import { TrendAnalysisEngine } from '../engines/trend-analysis.engine.js';
import { DiseaseProgressionEngine } from '../engines/disease-progression.engine.js';
import { TherapeuticResponseEngine } from '../engines/therapeutic-response.engine.js';
import { LongitudinalRiskEngine } from '../engines/longitudinal-risk.engine.js';
import { TimelineAnalyticsComputer } from '../analytics/timeline-analytics.js';

@Injectable()
export class LongitudinalHealthProvider {
  private readonly timelines = new Map<string, HealthTimeline>();
  private readonly eventStore = new Map<string, ClinicalEvent[]>();

  private readonly timelineBuilder = new TimelineBuilderEngine();
  private readonly trendAnalysis = new TrendAnalysisEngine();
  private readonly diseaseProgression = new DiseaseProgressionEngine();
  private readonly therapeuticResponse = new TherapeuticResponseEngine();
  private readonly riskEngine = new LongitudinalRiskEngine();
  private readonly analyticsComputer = new TimelineAnalyticsComputer();

  analyze(dto: AnalyzeLongitudinalDto): HealthTimeline {
    const newEvents = this.timelineBuilder.buildEvents(dto.patientId, dto.events);

    const existing = this.eventStore.get(dto.patientId) ?? [];
    const allEvents = this.timelineBuilder.mergeEventLists(existing, newEvents);
    this.eventStore.set(dto.patientId, allEvents);

    let filteredEvents = allEvents;
    let startDate: Date;
    let endDate: Date;

    if (dto.period) {
      startDate = new Date(dto.period.start);
      endDate = new Date(dto.period.end);
      filteredEvents = this.timelineBuilder.filterByPeriod(allEvents, startDate, endDate);
    } else {
      const range = this.timelineBuilder.computeDateRange(allEvents);
      startDate = range.start;
      endDate = range.end;
    }

    const markersToTrack = dto.biomarkersToTrack?.length
      ? dto.biomarkersToTrack
      : this.trendAnalysis.discoverTrackedMarkers(filteredEvents);

    const trends = this.trendAnalysis.analyzeAll(markersToTrack, filteredEvents);

    const conditionsToTrack = dto.diseasesToTrack?.length
      ? dto.diseasesToTrack
      : this.diseaseProgression.discoverConditions(filteredEvents);

    const progressions = this.diseaseProgression.analyzeAll(conditionsToTrack, filteredEvents);

    const therapeuticResponses = this.therapeuticResponse.analyzeAllMedications(filteredEvents);

    const spanDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) || 1;
    const analytics = this.analyticsComputer.compute(filteredEvents, trends, spanDays);

    const riskEvolution =
      dto.includeRiskEvolution !== false
        ? this.riskEngine.buildRiskEvolution(filteredEvents, trends, progressions)
        : [];

    const timeline = new HealthTimeline({
      patientId: dto.patientId,
      startDate,
      endDate,
      events: filteredEvents,
      biomarkerTrends: trends,
      diseaseProgressions: progressions,
      therapeuticResponses,
      riskEvolution,
      analytics,
    });

    this.timelines.set(dto.patientId, timeline);
    return timeline;
  }

  getTimeline(patientId: string): HealthTimeline | undefined {
    return this.timelines.get(patientId);
  }

  getTrends(patientId: string): HealthTimeline['biomarkerTrends'] {
    const timeline = this.timelines.get(patientId);
    if (!timeline) return [];
    const allEvents = this.eventStore.get(patientId) ?? [];
    const markers = this.trendAnalysis.discoverTrackedMarkers(allEvents);
    return this.trendAnalysis.analyzeAll(markers, allEvents);
  }

  getReport(patientId: string): {
    timeline: HealthTimeline;
    summary: ReturnType<HealthTimeline['getLatestRiskScore']> & {
      totalEvents: number;
      worseningBiomarkers: string[];
      improvingBiomarkers: string[];
      worseningConditions: string[];
    };
  } | undefined {
    const timeline = this.timelines.get(patientId);
    if (!timeline) return undefined;

    return {
      timeline,
      summary: {
        ...timeline.getLatestRiskScore(),
        totalEvents: timeline.events.length,
        worseningBiomarkers: timeline.biomarkerTrends
          .filter((t) => t.isWorsening())
          .map((t) => t.marker),
        improvingBiomarkers: timeline.biomarkerTrends
          .filter((t) => t.isImproving())
          .map((t) => t.marker),
        worseningConditions: timeline.diseaseProgressions
          .filter((p) => p.trend === 'WORSENING')
          .map((p) => p.condition),
      } as any,
    };
  }

  patientCount(): number {
    return this.timelines.size;
  }

  listPatients(): string[] {
    return [...this.timelines.keys()];
  }
}
