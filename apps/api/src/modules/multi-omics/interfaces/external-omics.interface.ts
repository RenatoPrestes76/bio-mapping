// Open interfaces for future integration with bioinformatics pipelines and genomic standards.
// No real file parsing in this sprint — these define the contract for future adapters.

export interface IVCFVariant {
  chrom: string;
  pos: number;
  id?: string;
  ref: string;
  alt: string[];
  qual?: number;
  filter: string;
  info: Record<string, string | number | boolean>;
  format?: string[];
  samples?: Record<string, Record<string, string>>;
}

export interface IVCFAdapter {
  parse(content: string): IVCFVariant[];
  toOmicsDataset(variants: IVCFVariant[], patientId: string): unknown;
  validate(content: string): { valid: boolean; errors: string[] };
}

export interface IFASTQRead {
  id: string;
  sequence: string;
  quality: string;
  phredScores: number[];
}

export interface IFASTQAdapter {
  parse(content: string): IFASTQRead[];
  computeQualityStats(reads: IFASTQRead[]): {
    meanQ: number;
    percentAboveQ30: number;
    gcContent: number;
    readCount: number;
  };
}

export interface IBAMAlignment {
  queryName: string;
  flag: number;
  refName: string;
  pos: number;
  mapQ: number;
  cigar: string;
  seq: string;
  qual: string;
  tags: Record<string, string | number>;
}

export interface IBAMAdapter {
  streamAlignments(filePath: string): AsyncIterable<IBAMAlignment>;
  computeCoverageStats(alignments: IBAMAlignment[]): {
    meanDepth: number;
    breadth: number;
    duplicationRate: number;
  };
}

export interface ICRAMAdapter extends IBAMAdapter {
  referenceGenome: string;
}

export interface IFHIRR4GenomicObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary' | 'amended';
  code: { coding: { system: string; code: string; display: string }[] };
  subject: { reference: string };
  component?: Array<{
    code: { coding: { system: string; code: string; display: string }[] };
    valueCodeableConcept?: { coding: { system: string; code: string; display: string }[] };
    valueQuantity?: { value: number; unit: string; system: string };
    valueString?: string;
  }>;
}

export interface IFHIRR4GenomicsAdapter {
  parseObservation(resource: IFHIRR4GenomicObservation): unknown;
  exportToFHIR(patientId: string, data: unknown): IFHIRR4GenomicObservation[];
}

export interface IGA4GHVariant {
  id: string;
  variantSetId: string;
  names?: string[];
  created?: number;
  updated?: number;
  referenceName: string;
  start: string;
  end: string;
  referenceBases: string;
  alternateBases: string[];
  info?: Record<string, { values: { stringValue?: string; numberValue?: number }[] }>;
}

export interface IGA4GHAdapter {
  searchVariants(variantSetId: string, referenceName: string, start: number, end: number): Promise<IGA4GHVariant[]>;
  getVariantSet(variantSetId: string): Promise<unknown>;
}

export interface IEnsemblGene {
  id: string;
  display_name: string;
  biotype: string;
  description?: string;
  seq_region_name: string;
  start: number;
  end: number;
  strand: number;
  canonical_transcript?: string;
  Transcript?: unknown[];
}

export interface IEnsemblAdapter {
  getGeneById(geneId: string): Promise<IEnsemblGene>;
  getGeneBySymbol(symbol: string, species?: string): Promise<IEnsemblGene>;
  getPathwayGenes(pathwayId: string): Promise<IEnsemblGene[]>;
}

export interface INCBIEntry {
  uid: string;
  organism: { taxid: number; scientificname: string };
  genes?: Array<{ geneid: number; symbol: string; description: string }>;
  summary?: string;
}

export interface INCBIAdapter {
  fetchGeneInfo(symbol: string): Promise<INCBIEntry>;
  fetchPathway(pathwayId: string): Promise<unknown>;
}

export interface IMultiOmicsExternalRegistry {
  vcf?: IVCFAdapter;
  fastq?: IFASTQAdapter;
  bam?: IBAMAdapter;
  cram?: ICRAMAdapter;
  fhirGenomics?: IFHIRR4GenomicsAdapter;
  ga4gh?: IGA4GHAdapter;
  ensembl?: IEnsemblAdapter;
  ncbi?: INCBIAdapter;
}
