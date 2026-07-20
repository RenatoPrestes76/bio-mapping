import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';

export type GenotypeString = string;

function makeGenotype(h1: string, h2: string): string {
  return [h1, h2].sort().join('/');
}

function buildGenotypePairs(haplotypes1: string[], haplotypes2: string[], phenotype: MetabolicPhenotype): Record<string, MetabolicPhenotype> {
  const result: Record<string, MetabolicPhenotype> = {};
  for (const h1 of haplotypes1) {
    for (const h2 of haplotypes2) {
      result[makeGenotype(h1, h2)] = phenotype;
    }
  }
  return result;
}

// CYP2D6 — affects codeine, tramadol, fluoxetine, tricyclics
export const CYP2D6_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  ...buildGenotypePairs(['*1', '*2', '*9', '*10', '*17', '*35', '*41'], ['*1', '*2', '*9', '*10', '*17', '*35', '*41'], 'NORMAL_METABOLIZER'),
  ...buildGenotypePairs(['*1xN', '*2xN'], ['*1', '*2'], 'ULTRA_RAPID_METABOLIZER'),
  '*1xN/*1xN': 'ULTRA_RAPID_METABOLIZER',
  '*1xN/*2xN': 'ULTRA_RAPID_METABOLIZER',
  ...buildGenotypePairs(['*1', '*2'], ['*3', '*4', '*5', '*6', '*7', '*8'], 'INTERMEDIATE_METABOLIZER'),
  ...buildGenotypePairs(['*9', '*10', '*17', '*41'], ['*3', '*4', '*5', '*6'], 'INTERMEDIATE_METABOLIZER'),
  ...buildGenotypePairs(['*3', '*4', '*5', '*6', '*7', '*8'], ['*3', '*4', '*5', '*6', '*7', '*8'], 'POOR_METABOLIZER'),
};

// CYP2C19 — affects clopidogrel, omeprazole, SSRIs, tricyclics
export const CYP2C19_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1/*1': 'NORMAL_METABOLIZER',
  '*1/*17': 'RAPID_METABOLIZER',
  '*17/*17': 'ULTRA_RAPID_METABOLIZER',
  '*1/*2': 'INTERMEDIATE_METABOLIZER',
  '*1/*3': 'INTERMEDIATE_METABOLIZER',
  '*2/*17': 'INTERMEDIATE_METABOLIZER',
  '*3/*17': 'INTERMEDIATE_METABOLIZER',
  '*2/*2': 'POOR_METABOLIZER',
  '*2/*3': 'POOR_METABOLIZER',
  '*3/*3': 'POOR_METABOLIZER',
};

// CYP2C9 — affects warfarin, NSAIDs, phenytoin
export const CYP2C9_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1/*1': 'NORMAL_METABOLIZER',
  '*1/*2': 'INTERMEDIATE_METABOLIZER',
  '*1/*3': 'INTERMEDIATE_METABOLIZER',
  '*2/*2': 'POOR_METABOLIZER',
  '*2/*3': 'POOR_METABOLIZER',
  '*3/*3': 'POOR_METABOLIZER',
};

// SLCO1B1 — affects statins (transporter, not metabolizer — mapped to phenotype equivalent)
export const SLCO1B1_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1a/*1a': 'NORMAL_METABOLIZER',
  '*1a/*1b': 'NORMAL_METABOLIZER',
  '*1b/*1b': 'NORMAL_METABOLIZER',
  '*1a/*5': 'INTERMEDIATE_METABOLIZER',
  '*1b/*5': 'INTERMEDIATE_METABOLIZER',
  '*1a/*15': 'INTERMEDIATE_METABOLIZER',
  '*1b/*15': 'INTERMEDIATE_METABOLIZER',
  '*5/*5': 'POOR_METABOLIZER',
  '*5/*15': 'POOR_METABOLIZER',
  '*15/*15': 'POOR_METABOLIZER',
};

// VKORC1 — affects warfarin sensitivity (enzyme, not metabolizer)
export const VKORC1_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  'GG/GG': 'NORMAL_METABOLIZER',
  '-1639G/-1639G': 'NORMAL_METABOLIZER',
  'rs9923231_GG': 'NORMAL_METABOLIZER',
  'GA/GA': 'INTERMEDIATE_METABOLIZER',
  '-1639G/-1639A': 'INTERMEDIATE_METABOLIZER',
  'rs9923231_GA': 'INTERMEDIATE_METABOLIZER',
  'AA/AA': 'POOR_METABOLIZER',
  '-1639A/-1639A': 'POOR_METABOLIZER',
  'rs9923231_AA': 'POOR_METABOLIZER',
};

// TPMT — affects azathioprine, 6-MP, thioguanine
export const TPMT_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1/*1': 'NORMAL_METABOLIZER',
  '*1/*2': 'INTERMEDIATE_METABOLIZER',
  '*1/*3A': 'INTERMEDIATE_METABOLIZER',
  '*1/*3B': 'INTERMEDIATE_METABOLIZER',
  '*1/*3C': 'INTERMEDIATE_METABOLIZER',
  '*1/*4': 'INTERMEDIATE_METABOLIZER',
  '*2/*3A': 'POOR_METABOLIZER',
  '*2/*3C': 'POOR_METABOLIZER',
  '*3A/*3A': 'POOR_METABOLIZER',
  '*3A/*3C': 'POOR_METABOLIZER',
  '*3C/*3C': 'POOR_METABOLIZER',
};

// DPYD — affects 5-fluorouracil, capecitabine
export const DPYD_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1/*1': 'NORMAL_METABOLIZER',
  '*1/*2A': 'INTERMEDIATE_METABOLIZER',
  '*1/*13': 'INTERMEDIATE_METABOLIZER',
  '*1/HapB3': 'INTERMEDIATE_METABOLIZER',
  '*2A/*2A': 'POOR_METABOLIZER',
  '*2A/*13': 'POOR_METABOLIZER',
  '*13/*13': 'POOR_METABOLIZER',
};

// UGT1A1 — affects irinotecan, atazanavir, belinostat
export const UGT1A1_PHENOTYPE_MAP: Record<GenotypeString, MetabolicPhenotype> = {
  '*1/*1': 'NORMAL_METABOLIZER',
  '*1/*28': 'INTERMEDIATE_METABOLIZER',
  '*1/*6': 'INTERMEDIATE_METABOLIZER',
  '*28/*28': 'POOR_METABOLIZER',
  '*6/*6': 'POOR_METABOLIZER',
  '*6/*28': 'POOR_METABOLIZER',
};

export const GENE_PHENOTYPE_MAPS: Record<string, Record<GenotypeString, MetabolicPhenotype>> = {
  CYP2D6: CYP2D6_PHENOTYPE_MAP,
  CYP2C19: CYP2C19_PHENOTYPE_MAP,
  CYP2C9: CYP2C9_PHENOTYPE_MAP,
  SLCO1B1: SLCO1B1_PHENOTYPE_MAP,
  VKORC1: VKORC1_PHENOTYPE_MAP,
  TPMT: TPMT_PHENOTYPE_MAP,
  DPYD: DPYD_PHENOTYPE_MAP,
  UGT1A1: UGT1A1_PHENOTYPE_MAP,
};

export function lookupPhenotype(gene: string, haplotype1: string, haplotype2?: string): MetabolicPhenotype {
  const map = GENE_PHENOTYPE_MAPS[gene.toUpperCase()];
  if (!map) return 'UNKNOWN';

  const h2 = haplotype2 ?? haplotype1;
  const sortedKey = [haplotype1, h2].sort().join('/');
  const directKey = `${haplotype1}/${h2}`;

  return map[sortedKey] ?? map[directKey] ?? 'UNKNOWN';
}

export const SUPPORTED_GENES = new Set(['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'VKORC1', 'TPMT', 'DPYD', 'UGT1A1']);

export function isSupportedGene(gene: string): boolean {
  return SUPPORTED_GENES.has(gene.toUpperCase());
}
