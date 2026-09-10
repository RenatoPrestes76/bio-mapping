import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BioBookProvider } from './providers/bio-book.provider.js';
import type { GenerateBioBookDto } from './dto/bio-book.dto.js';
import type { HealthNarrative } from './entities/health-narrative.entity.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';

@Injectable()
export class BioBookService {
  constructor(private readonly provider: BioBookProvider) {}

  /** PATIENT só pode ver a própria narrativa; ADMIN vê qualquer uma. Achado da Sprint 03:
   * antes desta checagem, qualquer usuário autenticado lia a narrativa de qualquer
   * paciente só sabendo/adivinhando o patientId na URL. */
  private assertOwner(patientId: string, actor: JwtPayload): void {
    if (actor.role === 'ADMIN') return;
    if (actor.sub !== patientId) throw new ForbiddenException('Acesso negado a este Bio-Book');
  }

  generate(dto: GenerateBioBookDto, actor: JwtPayload): HealthNarrative {
    // patientId nunca vem do cliente — só do usuário autenticado.
    return this.provider.generate({ ...dto, patientId: actor.sub });
  }

  getNarrative(patientId: string, actor: JwtPayload): HealthNarrative {
    this.assertOwner(patientId, actor);
    const narrative = this.provider.findByPatient(patientId);
    if (!narrative) {
      throw new NotFoundException(`Bio-Book not found for patient ${patientId}`);
    }
    return narrative;
  }

  getTimeline(patientId: string, actor: JwtPayload): HealthNarrative {
    return this.getNarrative(patientId, actor);
  }

  getChapters(patientId: string, actor: JwtPayload): HealthNarrative {
    return this.getNarrative(patientId, actor);
  }

  getSummary(patientId: string, actor: JwtPayload): HealthNarrative {
    return this.getNarrative(patientId, actor);
  }
}
