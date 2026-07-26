import { Injectable, NotFoundException } from '@nestjs/common';
import { BioBookProvider } from './providers/bio-book.provider.js';
import type { GenerateBioBookDto } from './dto/bio-book.dto.js';
import type { HealthNarrative } from './entities/health-narrative.entity.js';

@Injectable()
export class BioBookService {
  constructor(private readonly provider: BioBookProvider) {}

  generate(dto: GenerateBioBookDto): HealthNarrative {
    return this.provider.generate(dto);
  }

  getNarrative(patientId: string): HealthNarrative {
    const narrative = this.provider.findByPatient(patientId);
    if (!narrative) {
      throw new NotFoundException(`Bio-Book not found for patient ${patientId}`);
    }
    return narrative;
  }

  getTimeline(patientId: string): HealthNarrative {
    return this.getNarrative(patientId);
  }

  getChapters(patientId: string): HealthNarrative {
    return this.getNarrative(patientId);
  }

  getSummary(patientId: string): HealthNarrative {
    return this.getNarrative(patientId);
  }
}
