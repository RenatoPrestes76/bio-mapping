import { Injectable, NotFoundException } from '@nestjs/common';
import { LongitudinalHealthProvider } from './providers/longitudinal-health.provider.js';
import type { AnalyzeLongitudinalDto } from './dto/longitudinal-health.dto.js';
import type { HealthTimeline } from './entities/health-timeline.entity.js';

@Injectable()
export class LongitudinalHealthService {
  constructor(private readonly provider: LongitudinalHealthProvider) {}

  analyze(dto: AnalyzeLongitudinalDto): HealthTimeline {
    return this.provider.analyze(dto);
  }

  getTimeline(patientId: string): HealthTimeline {
    const timeline = this.provider.getTimeline(patientId);
    if (!timeline) throw new NotFoundException(`Timeline not found for patient ${patientId}`);
    return timeline;
  }

  getTrends(patientId: string): HealthTimeline['biomarkerTrends'] {
    const trends = this.provider.getTrends(patientId);
    if (trends.length === 0) {
      const timeline = this.provider.getTimeline(patientId);
      if (!timeline) throw new NotFoundException(`No data found for patient ${patientId}`);
    }
    return trends;
  }

  getReport(patientId: string): ReturnType<LongitudinalHealthProvider['getReport']> {
    const report = this.provider.getReport(patientId);
    if (!report) throw new NotFoundException(`Report not found for patient ${patientId}`);
    return report;
  }
}
