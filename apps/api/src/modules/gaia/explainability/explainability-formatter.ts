import { DecisionTrace, Explainability } from '../contracts';

/**
 * Formatação pura, sem efeitos colaterais e sem mutar nenhum dado (Sprint
 * 14.2, T1) — usada para logging/depuração. Nenhum endpoint HTTP consome
 * isso ainda.
 */
export class ExplainabilityFormatter {
  toSummary(explainability: Explainability): string {
    const confidencePct = Math.round(explainability.confidence.score * 100);
    const warningsPart =
      explainability.warnings.length > 0 ? ` | avisos: ${explainability.warnings.join('; ')}` : '';
    return `[${explainability.sourceProvider}] ${explainability.reasoning} (confiança: ${confidencePct}% — ${explainability.confidence.level})${warningsPart}`;
  }

  toAuditLine(trace: DecisionTrace): string {
    const stepsPart = trace.steps.map((s) => `${s.stage}=${s.status}(${s.durationMs}ms)`).join(' → ');
    return `trace=${trace.traceId} patient=${trace.patientId} ${stepsPart}`;
  }
}
