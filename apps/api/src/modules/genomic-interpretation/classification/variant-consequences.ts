import type { VariantConsequence, VariantImpact } from '../entities/variant-annotation.entity.js';

export const CONSEQUENCE_IMPACT: Record<VariantConsequence, VariantImpact> = {
  STOP_GAINED: 'HIGH',
  FRAMESHIFT_VARIANT: 'HIGH',
  SPLICE_SITE_VARIANT: 'HIGH',
  STOP_LOST: 'HIGH',
  START_LOST: 'HIGH',
  MISSENSE_VARIANT: 'MODERATE',
  INFRAME_INSERTION: 'MODERATE',
  INFRAME_DELETION: 'MODERATE',
  SPLICE_REGION_VARIANT: 'LOW',
  SYNONYMOUS_VARIANT: 'LOW',
  THREE_PRIME_UTR: 'MODIFIER',
  FIVE_PRIME_UTR: 'MODIFIER',
  INTRONIC_VARIANT: 'MODIFIER',
  INTERGENIC_VARIANT: 'MODIFIER',
  REGULATORY_VARIANT: 'MODIFIER',
};

export const HIGH_IMPACT_CONSEQUENCES: VariantConsequence[] = [
  'STOP_GAINED',
  'FRAMESHIFT_VARIANT',
  'SPLICE_SITE_VARIANT',
  'STOP_LOST',
  'START_LOST',
];

export function getImpactForConsequence(consequence: VariantConsequence): VariantImpact {
  return CONSEQUENCE_IMPACT[consequence] ?? 'MODIFIER';
}

export function predictConsequenceFromHGVS(hgvsCoding?: string, hgvsProtein?: string): VariantConsequence {
  if (!hgvsCoding && !hgvsProtein) return 'MISSENSE_VARIANT';

  const protein = hgvsProtein?.toLowerCase() ?? '';
  const coding = hgvsCoding?.toLowerCase() ?? '';

  // Check frameshift BEFORE stop — 'ProfsTer' notation contains 'ter' but is a frameshift
  if (protein.includes('fs') || (coding.includes('dup') && !coding.includes('inframe'))) {
    return 'FRAMESHIFT_VARIANT';
  }
  if (protein.includes('ter') || protein.includes('*') || protein.match(/p\.[a-z]+\d+\*/)) {
    return 'STOP_GAINED';
  }
  if (protein.includes('ext') || protein.includes('xterminus')) {
    return 'STOP_LOST';
  }
  if (protein.includes('p.met1') || protein.includes('p.m1')) {
    return 'START_LOST';
  }
  if (coding.match(/[+-]\d+[acgt>]/i) && coding.includes('+1') || coding.includes('+2') || coding.includes('-1') || coding.includes('-2')) {
    return 'SPLICE_SITE_VARIANT';
  }
  if (coding.includes('inframe') || (protein.includes('ins') && !protein.includes('fs'))) {
    return coding.includes('del') ? 'INFRAME_DELETION' : 'INFRAME_INSERTION';
  }
  if (coding.includes('intronic') || coding.match(/c\.\d+[+-]\d+[acgt]/i)) {
    return 'INTRONIC_VARIANT';
  }
  if (protein.includes('=') || protein.match(/p\.[a-z]+\d+\1/)) {
    return 'SYNONYMOUS_VARIANT';
  }
  if (!hgvsCoding && !hgvsProtein) {
    return 'INTERGENIC_VARIANT';
  }

  return 'MISSENSE_VARIANT';
}

export function isLossOfFunctionConsequence(consequence: VariantConsequence): boolean {
  return ['STOP_GAINED', 'FRAMESHIFT_VARIANT', 'SPLICE_SITE_VARIANT', 'START_LOST'].includes(consequence);
}

export function CONSEQUENCE_SO_TERM(consequence: VariantConsequence): string {
  const soMap: Record<VariantConsequence, string> = {
    MISSENSE_VARIANT: 'SO:0001583',
    STOP_GAINED: 'SO:0001587',
    FRAMESHIFT_VARIANT: 'SO:0001589',
    SPLICE_SITE_VARIANT: 'SO:0001629',
    SYNONYMOUS_VARIANT: 'SO:0001819',
    INTRONIC_VARIANT: 'SO:0001627',
    INTERGENIC_VARIANT: 'SO:0001628',
    STOP_LOST: 'SO:0001578',
    START_LOST: 'SO:0002012',
    REGULATORY_VARIANT: 'SO:0001566',
    INFRAME_INSERTION: 'SO:0001821',
    INFRAME_DELETION: 'SO:0001822',
    THREE_PRIME_UTR: 'SO:0001624',
    FIVE_PRIME_UTR: 'SO:0001623',
    SPLICE_REGION_VARIANT: 'SO:0001630',
  };
  return soMap[consequence] ?? 'SO:0001060';
}
