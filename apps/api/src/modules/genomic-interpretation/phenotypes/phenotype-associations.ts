export type PhenotypeFrequency = 'OBLIGATE' | 'VERY_FREQUENT' | 'FREQUENT' | 'OCCASIONAL' | 'RARE';

export interface PhenotypeAssociation {
  hpoId: string;
  hpoTerm: string;
  frequency: PhenotypeFrequency;
  evidenceSource: string;
}

export interface GenePhenotypeMap {
  geneSymbol: string;
  phenotypes: PhenotypeAssociation[];
  conditions: string[];
  associatedPathways?: string[];
}

export const GENE_PHENOTYPE_MAP: Record<string, GenePhenotypeMap> = {
  BRCA1: {
    geneSymbol: 'BRCA1',
    phenotypes: [
      { hpoId: 'HP:0003002', hpoTerm: 'Breast carcinoma', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:604370' },
      { hpoId: 'HP:0002734', hpoTerm: 'Ovarian carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:604370' },
      { hpoId: 'HP:0003003', hpoTerm: 'Colon cancer', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:604370' },
      { hpoId: 'HP:0006725', hpoTerm: 'Pancreatic carcinoma', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:604370' },
    ],
    conditions: ['Hereditary breast and ovarian cancer', 'Fanconi anemia'],
  },
  BRCA2: {
    geneSymbol: 'BRCA2',
    phenotypes: [
      { hpoId: 'HP:0003002', hpoTerm: 'Breast carcinoma', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:612555' },
      { hpoId: 'HP:0002734', hpoTerm: 'Ovarian carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:612555' },
      { hpoId: 'HP:0006725', hpoTerm: 'Pancreatic carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:612555' },
      { hpoId: 'HP:0010784', hpoTerm: 'Prostate cancer', frequency: 'FREQUENT', evidenceSource: 'OMIM:612555' },
    ],
    conditions: ['Hereditary breast and ovarian cancer', 'Fanconi anemia type D1'],
  },
  TP53: {
    geneSymbol: 'TP53',
    phenotypes: [
      { hpoId: 'HP:0003002', hpoTerm: 'Breast carcinoma', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:151623' },
      { hpoId: 'HP:0009919', hpoTerm: 'Osteosarcoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:151623' },
      { hpoId: 'HP:0001073', hpoTerm: 'Leukemia', frequency: 'FREQUENT', evidenceSource: 'OMIM:151623' },
      { hpoId: 'HP:0002858', hpoTerm: 'Meningioma', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:151623' },
    ],
    conditions: ['Li-Fraumeni syndrome', 'Multiple tumor types'],
  },
  CFTR: {
    geneSymbol: 'CFTR',
    phenotypes: [
      { hpoId: 'HP:0002099', hpoTerm: 'Chronic lung disease', frequency: 'OBLIGATE', evidenceSource: 'OMIM:219700' },
      { hpoId: 'HP:0001508', hpoTerm: 'Failure to thrive', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:219700' },
      { hpoId: 'HP:0001737', hpoTerm: 'Exocrine pancreatic insufficiency', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:219700' },
      { hpoId: 'HP:0002023', hpoTerm: 'Rectal prolapse', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:219700' },
    ],
    conditions: ['Cystic fibrosis', 'CBAVD'],
  },
  LDLR: {
    geneSymbol: 'LDLR',
    phenotypes: [
      { hpoId: 'HP:0003141', hpoTerm: 'Increased LDL cholesterol', frequency: 'OBLIGATE', evidenceSource: 'OMIM:143890' },
      { hpoId: 'HP:0002149', hpoTerm: 'Hyperuricemia', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:143890' },
      { hpoId: 'HP:0001677', hpoTerm: 'Coronary artery disease', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:143890' },
      { hpoId: 'HP:0001974', hpoTerm: 'Tendon xanthoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:143890' },
    ],
    conditions: ['Familial hypercholesterolemia'],
  },
  HBB: {
    geneSymbol: 'HBB',
    phenotypes: [
      { hpoId: 'HP:0001903', hpoTerm: 'Anemia', frequency: 'OBLIGATE', evidenceSource: 'OMIM:603903' },
      { hpoId: 'HP:0001789', hpoTerm: 'Hemolytic anemia', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:603903' },
      { hpoId: 'HP:0002754', hpoTerm: 'Osteomyelitis', frequency: 'FREQUENT', evidenceSource: 'OMIM:603903' },
      { hpoId: 'HP:0001744', hpoTerm: 'Splenomegaly', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:613985' },
    ],
    conditions: ['Sickle cell disease', 'Beta thalassemia'],
  },
  APOE: {
    geneSymbol: 'APOE',
    phenotypes: [
      { hpoId: 'HP:0000726', hpoTerm: 'Dementia', frequency: 'FREQUENT', evidenceSource: 'OMIM:104310' },
      { hpoId: 'HP:0002354', hpoTerm: 'Memory impairment', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:104310' },
      { hpoId: 'HP:0001677', hpoTerm: 'Coronary artery disease', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:104310' },
    ],
    conditions: ["Alzheimer's disease susceptibility", 'Dysbetalipoproteinemia'],
  },
  MLH1: {
    geneSymbol: 'MLH1',
    phenotypes: [
      { hpoId: 'HP:0003003', hpoTerm: 'Colon cancer', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:120436' },
      { hpoId: 'HP:0002734', hpoTerm: 'Endometrial carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:120436' },
      { hpoId: 'HP:0003581', hpoTerm: 'Ovarian carcinoma', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:120436' },
    ],
    conditions: ['Lynch syndrome'],
  },
  MTHFR: {
    geneSymbol: 'MTHFR',
    phenotypes: [
      { hpoId: 'HP:0001943', hpoTerm: 'Hyperhomocysteinemia', frequency: 'FREQUENT', evidenceSource: 'OMIM:607093' },
      { hpoId: 'HP:0002315', hpoTerm: 'Headache', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:607093' },
      { hpoId: 'HP:0001677', hpoTerm: 'Coronary artery disease (susceptibility)', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:607093' },
    ],
    conditions: ['Homocystinuria', 'Neural tube defect susceptibility'],
  },
  PTEN: {
    geneSymbol: 'PTEN',
    phenotypes: [
      { hpoId: 'HP:0001600', hpoTerm: 'Macrocephaly', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:158350' },
      { hpoId: 'HP:0002858', hpoTerm: 'Multiple hamartomas', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:158350' },
      { hpoId: 'HP:0003002', hpoTerm: 'Breast carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:158350' },
      { hpoId: 'HP:0006725', hpoTerm: 'Thyroid carcinoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:158350' },
    ],
    conditions: ['Cowden syndrome', 'PTEN hamartoma tumor syndrome'],
  },
  SCN5A: {
    geneSymbol: 'SCN5A',
    phenotypes: [
      { hpoId: 'HP:0001663', hpoTerm: 'Ventricular fibrillation', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:601144' },
      { hpoId: 'HP:0011710', hpoTerm: 'Bundle branch block', frequency: 'FREQUENT', evidenceSource: 'OMIM:601144' },
      { hpoId: 'HP:0001704', hpoTerm: 'Sudden cardiac death', frequency: 'FREQUENT', evidenceSource: 'OMIM:601144' },
      { hpoId: 'HP:0004755', hpoTerm: 'Supraventricular tachycardia', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:603830' },
    ],
    conditions: ['Brugada syndrome', 'Long QT syndrome 3'],
  },
  CYP2C19: {
    geneSymbol: 'CYP2C19',
    phenotypes: [
      { hpoId: 'HP:0032322', hpoTerm: 'Altered drug metabolism (CYP2C19)', frequency: 'OBLIGATE', evidenceSource: 'PharmGKB' },
    ],
    conditions: ['CYP2C19 poor metabolizer', 'Clopidogrel resistance'],
  },
  CYP2D6: {
    geneSymbol: 'CYP2D6',
    phenotypes: [
      { hpoId: 'HP:0032322', hpoTerm: 'Altered drug metabolism (CYP2D6)', frequency: 'OBLIGATE', evidenceSource: 'PharmGKB' },
    ],
    conditions: ['CYP2D6 poor metabolizer', 'Opioid sensitivity'],
  },
  KCNQ1: {
    geneSymbol: 'KCNQ1',
    phenotypes: [
      { hpoId: 'HP:0001657', hpoTerm: 'Prolonged QT interval', frequency: 'OBLIGATE', evidenceSource: 'OMIM:192500' },
      { hpoId: 'HP:0001704', hpoTerm: 'Sudden cardiac death', frequency: 'FREQUENT', evidenceSource: 'OMIM:192500' },
      { hpoId: 'HP:0001279', hpoTerm: 'Syncope', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:192500' },
    ],
    conditions: ['Long QT syndrome 1', 'Jervell and Lange-Nielsen syndrome'],
  },
  APC: {
    geneSymbol: 'APC',
    phenotypes: [
      { hpoId: 'HP:0002664', hpoTerm: 'Neoplasm', frequency: 'OBLIGATE', evidenceSource: 'OMIM:175100' },
      { hpoId: 'HP:0003003', hpoTerm: 'Colorectal polyposis', frequency: 'OBLIGATE', evidenceSource: 'OMIM:175100' },
      { hpoId: 'HP:0001139', hpoTerm: 'Congenital hypertrophy of RPE', frequency: 'FREQUENT', evidenceSource: 'OMIM:175100' },
    ],
    conditions: ['Familial adenomatous polyposis', 'Colorectal cancer'],
  },
  VHL: {
    geneSymbol: 'VHL',
    phenotypes: [
      { hpoId: 'HP:0007703', hpoTerm: 'Hemangioblastoma', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:193300' },
      { hpoId: 'HP:0002621', hpoTerm: 'Renal cell carcinoma', frequency: 'VERY_FREQUENT', evidenceSource: 'OMIM:193300' },
      { hpoId: 'HP:0005570', hpoTerm: 'Pheochromocytoma', frequency: 'FREQUENT', evidenceSource: 'OMIM:193300' },
    ],
    conditions: ['Von Hippel-Lindau disease'],
  },
  G6PD: {
    geneSymbol: 'G6PD',
    phenotypes: [
      { hpoId: 'HP:0001789', hpoTerm: 'Hemolytic anemia', frequency: 'OBLIGATE', evidenceSource: 'OMIM:300908' },
      { hpoId: 'HP:0005510', hpoTerm: 'Neonatal jaundice', frequency: 'FREQUENT', evidenceSource: 'OMIM:300908' },
      { hpoId: 'HP:0001744', hpoTerm: 'Splenomegaly', frequency: 'OCCASIONAL', evidenceSource: 'OMIM:300908' },
    ],
    conditions: ['G6PD deficiency'],
  },
};

export function getPhenotypeMap(geneSymbol: string): GenePhenotypeMap | undefined {
  return GENE_PHENOTYPE_MAP[geneSymbol.toUpperCase()];
}

export function getAllPhenotypesForGene(geneSymbol: string): PhenotypeAssociation[] {
  return GENE_PHENOTYPE_MAP[geneSymbol.toUpperCase()]?.phenotypes ?? [];
}

export function getConditionsForGene(geneSymbol: string): string[] {
  return GENE_PHENOTYPE_MAP[geneSymbol.toUpperCase()]?.conditions ?? [];
}

export function hasKnownPhenotypes(geneSymbol: string): boolean {
  return geneSymbol.toUpperCase() in GENE_PHENOTYPE_MAP;
}
