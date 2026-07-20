import type { MetabolicPhenotype, PGxEvidenceLevel } from '../entities/drug-gene-interaction.entity.js';

export interface ICPICGuideline {
  gene: string;
  drug: string;
  version: string;
  date: string;
  phenotypeRecommendations: Record<MetabolicPhenotype, string>;
  evidenceLevel: PGxEvidenceLevel;
}

export interface IDPWGGuideline {
  gene: string;
  drug: string;
  phenotypeTherapyRecommendations: Record<MetabolicPhenotype, { recommendation: string; classLabel: string }>;
}

export interface IPharmGKBVariantAnnotation {
  variantId: string;
  gene: string;
  drug: string;
  phenotypeCategory: string;
  significance: string;
  evidenceLevel: string;
}

export interface IFDABiomarkerTable {
  biomarker: string;
  drug: string;
  therapeuticArea: string;
  labelSection: string;
  labelingActionType: string;
}

export interface IClinVarPGxRecord {
  variantId: string;
  gene: string;
  drug: string;
  phenotype: string;
  reviewStatus: string;
}

export interface ICPICAdapter {
  fetchGuideline(gene: string, drug: string): Promise<ICPICGuideline | null>;
  fetchAllGuidelinesForGene(gene: string): Promise<ICPICGuideline[]>;
  fetchAllGuidelinesForDrug(drug: string): Promise<ICPICGuideline[]>;
}

export interface IDPWGAdapter {
  fetchGuideline(gene: string, drug: string): Promise<IDPWGGuideline | null>;
}

export interface IPharmGKBAdapter {
  fetchAnnotations(gene: string): Promise<IPharmGKBVariantAnnotation[]>;
  fetchDrugAnnotations(drug: string): Promise<IPharmGKBVariantAnnotation[]>;
}

export interface IFDAAdapter {
  fetchBiomarkerTable(biomarker: string): Promise<IFDABiomarkerTable[]>;
}

export interface IPGxExternalRegistry {
  cpic?: ICPICAdapter;
  dpwg?: IDPWGAdapter;
  pharmgkb?: IPharmGKBAdapter;
  fda?: IFDAAdapter;
}
