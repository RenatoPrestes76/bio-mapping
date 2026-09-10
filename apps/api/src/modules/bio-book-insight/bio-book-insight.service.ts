import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BioBookInsightProvider } from './providers/bio-book-insight.provider.js';
import type { AnalyzeBioBookInsightDto } from './dto/bio-book-insight.dto.js';
import type { BioBookInsightReport } from './entities/bio-book-insight-report.entity.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';

@Injectable()
export class BioBookInsightService {
  constructor(private readonly provider: BioBookInsightProvider) {}

  /** PATIENT só pode ver o próprio report; ADMIN vê qualquer um. Achado da Sprint 03:
   * antes desta checagem, qualquer usuário autenticado lia o insight report de qualquer
   * paciente só sabendo/adivinhando o patientId na URL. */
  private assertOwner(patientId: string, actor: JwtPayload): void {
    if (actor.role === 'ADMIN') return;
    if (actor.sub !== patientId) throw new ForbiddenException('Acesso negado a este relatório');
  }

  analyze(dto: AnalyzeBioBookInsightDto, actor: JwtPayload): BioBookInsightReport {
    // patientId nunca vem do cliente — só do usuário autenticado. Antes, um usuário
    // podia gerar/sobrescrever o report de outro patientId arbitrário no body.
    return this.provider.analyze({ ...dto, patientId: actor.sub });
  }

  getReport(patientId: string, actor: JwtPayload): BioBookInsightReport {
    this.assertOwner(patientId, actor);
    const report = this.provider.findByPatient(patientId);
    if (!report) {
      throw new NotFoundException(`Bio-Book Insight report not found for patient ${patientId}`);
    }
    return report;
  }

  getInsights(patientId: string, actor: JwtPayload): BioBookInsightReport {
    return this.getReport(patientId, actor);
  }

  getReflection(patientId: string, actor: JwtPayload): BioBookInsightReport {
    return this.getReport(patientId, actor);
  }

  getGoals(patientId: string, actor: JwtPayload): BioBookInsightReport {
    return this.getReport(patientId, actor);
  }

  getScoreEvolution(patientId: string, actor: JwtPayload): BioBookInsightReport {
    return this.getReport(patientId, actor);
  }

  getCurrentChapter(patientId: string, actor: JwtPayload): BioBookInsightReport {
    return this.getReport(patientId, actor);
  }
}
