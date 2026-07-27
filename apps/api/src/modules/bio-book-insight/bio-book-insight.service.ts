import { Injectable, NotFoundException } from '@nestjs/common';
import { BioBookInsightProvider } from './providers/bio-book-insight.provider.js';
import type { AnalyzeBioBookInsightDto } from './dto/bio-book-insight.dto.js';
import type { BioBookInsightReport } from './entities/bio-book-insight-report.entity.js';

@Injectable()
export class BioBookInsightService {
  constructor(private readonly provider: BioBookInsightProvider) {}

  analyze(dto: AnalyzeBioBookInsightDto): BioBookInsightReport {
    return this.provider.analyze(dto);
  }

  getReport(patientId: string): BioBookInsightReport {
    const report = this.provider.findByPatient(patientId);
    if (!report) {
      throw new NotFoundException(`Bio-Book Insight report not found for patient ${patientId}`);
    }
    return report;
  }

  getInsights(patientId: string): BioBookInsightReport {
    return this.getReport(patientId);
  }

  getReflection(patientId: string): BioBookInsightReport {
    return this.getReport(patientId);
  }

  getGoals(patientId: string): BioBookInsightReport {
    return this.getReport(patientId);
  }

  getScoreEvolution(patientId: string): BioBookInsightReport {
    return this.getReport(patientId);
  }

  getCurrentChapter(patientId: string): BioBookInsightReport {
    return this.getReport(patientId);
  }
}
