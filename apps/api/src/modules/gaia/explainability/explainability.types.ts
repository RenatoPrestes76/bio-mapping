/**
 * Tipos internos do domínio explainability (Sprint 14.2, T1) — não fazem
 * parte do contrato público que os providers implementam (isso fica em
 * gaia/contracts), só da API interna do Builder/Engine.
 */
export interface ConfidenceHints {
  factors?: string[];
  missingInformation?: string[];
}
