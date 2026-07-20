import type { HGVSNotation } from '../entities/genetic-variant.entity.js';

export type ClinVarReviewStatus =
  | 'PRACTICE_GUIDELINE'
  | 'REVIEWED_BY_EXPERT_PANEL'
  | 'CRITERIA_PROVIDED_MULTIPLE_SUBMITTERS'
  | 'CRITERIA_PROVIDED_SINGLE_SUBMITTER'
  | 'NO_ASSERTION_CRITERIA_PROVIDED'
  | 'NO_CLASSIFICATION_PROVIDED';

export const CLINVAR_STAR_RATING: Record<ClinVarReviewStatus, number> = {
  PRACTICE_GUIDELINE: 4,
  REVIEWED_BY_EXPERT_PANEL: 3,
  CRITERIA_PROVIDED_MULTIPLE_SUBMITTERS: 2,
  CRITERIA_PROVIDED_SINGLE_SUBMITTER: 1,
  NO_ASSERTION_CRITERIA_PROVIDED: 0,
  NO_CLASSIFICATION_PROVIDED: 0,
};

export interface ParsedHGVSCoding {
  transcript?: string;
  position: number;
  refAllele: string;
  altAllele: string;
  type: 'SNV' | 'INDEL' | 'SPLICE';
}

export interface ParsedHGVSProtein {
  refAminoAcid: string;
  position: number;
  altAminoAcid: string;
  isStop: boolean;
  isFrameshift: boolean;
  isSilent: boolean;
}

export function parseHGVSCoding(hgvs: string): ParsedHGVSCoding | null {
  try {
    const match = hgvs.match(/(?:([A-Z_0-9.]+):)?c\.(\d+)([ACGT]?>?[ACGT]+)/i);
    if (!match) return null;
    const [, transcript, pos, change] = match;
    const position = parseInt(pos, 10);
    const [ref, alt] = change.includes('>') ? change.split('>') : [change, change];
    const type = hgvs.includes('+') || hgvs.includes('-') ? 'SPLICE' :
      ref.length !== alt.length ? 'INDEL' : 'SNV';
    return { transcript, position, refAllele: ref, altAllele: alt, type };
  } catch {
    return null;
  }
}

export function formatHGVSNotation(variant: {
  geneSymbol?: string;
  reference: string;
  alternate: string;
  position?: number;
}): HGVSNotation {
  const pos = variant.position ?? 1;
  const ref = variant.reference;
  const alt = variant.alternate;

  if (ref.length === 1 && alt.length === 1) {
    return { coding: `c.${pos}${ref}>${alt}`, genomic: `g.${pos}${ref}>${alt}` };
  }
  if (ref.length > alt.length) {
    const del = ref.slice(alt.length);
    return { coding: `c.${pos}_${pos + del.length - 1}del`, genomic: `g.${pos}_${pos + del.length - 1}del` };
  }
  if (alt.length > ref.length) {
    const ins = alt.slice(ref.length);
    return { coding: `c.${pos}_${pos + 1}ins${ins}`, genomic: `g.${pos}_${pos + 1}ins${ins}` };
  }
  return { coding: `c.${pos}${ref}>${alt}`, genomic: `g.${pos}${ref}>${alt}` };
}

export function isSameAminoAcidChange(hgvs1: string, hgvs2: string): boolean {
  const extract = (h: string): string | null => {
    const m = h.match(/p\.([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2}|\*|Ter)/);
    return m ? `${m[1]}${m[2]}${m[3]}` : null;
  };
  const aa1 = extract(hgvs1);
  const aa2 = extract(hgvs2);
  return aa1 !== null && aa1 === aa2;
}

export function formatClinVarUrl(variantId: string): string {
  return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
}
