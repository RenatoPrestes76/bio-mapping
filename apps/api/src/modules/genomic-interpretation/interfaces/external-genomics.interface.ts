import type { Gene } from '../entities/gene.entity.js';
import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { VariantAnnotation } from '../entities/variant-annotation.entity.js';

export interface IClinVarRecord {
  variationId: string;
  clinicalSignificance: string;
  reviewStatus: string;
  conditions: string[];
  lastEvaluated?: string;
}

export interface IDbSNPRecord {
  rsid: string;
  alleles: string[];
  maf: number;
  clinicalSignificance?: string;
  gene?: string;
}

export interface IEnsemblTranscript {
  transcriptId: string;
  biotype: string;
  isCanonical: boolean;
  codingSequenceLength?: number;
}

export interface IGnomADRecord {
  variantId: string;
  alleleFrequency: number;
  alleleCount: number;
  alleleNumber: number;
  homozygoteCount: number;
  populationFrequencies: Record<string, number>;
}

export interface IOMIMEntry {
  mimNumber: string;
  title: string;
  type: 'GENE' | 'PHENOTYPE' | 'GENE_PHENOTYPE';
  phenotypeMimNumber?: string;
  inheritance?: string;
}

export interface IHGNCEntry {
  hgncId: string;
  symbol: string;
  name: string;
  locusGroup: string;
  previousSymbols: string[];
  aliasSymbols: string[];
}

export interface INCBIGeneRecord {
  geneId: string;
  symbol: string;
  description: string;
  chromosome: string;
  mapLocation: string;
  summary?: string;
}

export interface IClinVarAdapter {
  fetchByRsId(rsid: string): Promise<IClinVarRecord | null>;
  fetchByHGVS(hgvs: string): Promise<IClinVarRecord | null>;
  fetchByVariantId(variantId: string): Promise<IClinVarRecord | null>;
}

export interface IDbSNPAdapter {
  fetchRsId(rsid: string): Promise<IDbSNPRecord | null>;
  fetchByPosition(chr: string, pos: number): Promise<IDbSNPRecord[]>;
}

export interface IEnsemblAdapter {
  fetchGene(ensemblId: string): Promise<Gene | null>;
  fetchTranscripts(geneId: string): Promise<IEnsemblTranscript[]>;
  annotateVariant(hgvs: string): Promise<Partial<VariantAnnotation> | null>;
}

export interface IGnomADAdapter {
  fetchVariantFrequency(variantId: string): Promise<IGnomADRecord | null>;
  fetchGeneVariants(geneSymbol: string): Promise<IGnomADRecord[]>;
}

export interface IOMIMAdapter {
  fetchGeneEntry(geneSymbol: string): Promise<IOMIMEntry[]>;
  fetchPhenotypeEntry(mimNumber: string): Promise<IOMIMEntry | null>;
}

export interface IHGNCAdapter {
  lookupSymbol(symbol: string): Promise<IHGNCEntry | null>;
  lookupPreviousSymbol(oldSymbol: string): Promise<IHGNCEntry | null>;
}

export interface INCBIGeneAdapter {
  fetchGene(symbol: string): Promise<INCBIGeneRecord | null>;
  searchGenes(query: string): Promise<INCBIGeneRecord[]>;
}

export interface IGenomicExternalRegistry {
  clinvar?: IClinVarAdapter;
  dbsnp?: IDbSNPAdapter;
  ensembl?: IEnsemblAdapter;
  gnomad?: IGnomADAdapter;
  omim?: IOMIMAdapter;
  hgnc?: IHGNCAdapter;
  ncbiGene?: INCBIGeneAdapter;
}
