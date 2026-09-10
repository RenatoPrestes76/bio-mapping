import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BioBookJourneyProvider } from './providers/bio-book-journey.provider.js';
import type { AnalyzeBioBookJourneyDto } from './dto/bio-book-journey.dto.js';
import type { JourneyReport } from './entities/journey-report.entity.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';

@Injectable()
export class BioBookJourneyService {
  constructor(private readonly provider: BioBookJourneyProvider) {}

  /** PATIENT só pode ver a própria jornada; ADMIN vê qualquer uma. Achado da Sprint 03:
   * antes desta checagem, qualquer usuário autenticado lia a jornada de qualquer
   * paciente só sabendo/adivinhando o patientId na URL. */
  private assertOwner(patientId: string, actor: JwtPayload): void {
    if (actor.role === 'ADMIN') return;
    if (actor.sub !== patientId) throw new ForbiddenException('Acesso negado a esta jornada');
  }

  analyze(dto: AnalyzeBioBookJourneyDto, actor: JwtPayload): JourneyReport {
    // patientId nunca vem do cliente — só do usuário autenticado.
    return this.provider.analyze({ ...dto, patientId: actor.sub });
  }

  getReport(patientId: string, actor: JwtPayload): JourneyReport {
    this.assertOwner(patientId, actor);
    const report = this.provider.findByPatient(patientId);
    if (!report) {
      throw new NotFoundException(`Bio-Book Journey report not found for patient ${patientId}`);
    }
    return report;
  }

  getPath(patientId: string, actor: JwtPayload): JourneyReport {
    return this.getReport(patientId, actor);
  }

  getNextSteps(patientId: string, actor: JwtPayload): JourneyReport {
    return this.getReport(patientId, actor);
  }

  getMilestones(patientId: string, actor: JwtPayload): JourneyReport {
    return this.getReport(patientId, actor);
  }
}
