import { Injectable, NotFoundException } from '@nestjs/common';
import { BioBookJourneyProvider } from './providers/bio-book-journey.provider.js';
import type { AnalyzeBioBookJourneyDto } from './dto/bio-book-journey.dto.js';
import type { JourneyReport } from './entities/journey-report.entity.js';

@Injectable()
export class BioBookJourneyService {
  constructor(private readonly provider: BioBookJourneyProvider) {}

  analyze(dto: AnalyzeBioBookJourneyDto): JourneyReport {
    return this.provider.analyze(dto);
  }

  getReport(patientId: string): JourneyReport {
    const report = this.provider.findByPatient(patientId);
    if (!report) {
      throw new NotFoundException(`Bio-Book Journey report not found for patient ${patientId}`);
    }
    return report;
  }

  getPath(patientId: string): JourneyReport {
    return this.getReport(patientId);
  }

  getNextSteps(patientId: string): JourneyReport {
    return this.getReport(patientId);
  }

  getMilestones(patientId: string): JourneyReport {
    return this.getReport(patientId);
  }
}
