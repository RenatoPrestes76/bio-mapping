import type { GeneLocation } from '../entities/gene.entity.js';

export type InheritancePattern =
  | 'AUTOSOMAL_DOMINANT'
  | 'AUTOSOMAL_RECESSIVE'
  | 'X_LINKED_DOMINANT'
  | 'X_LINKED_RECESSIVE'
  | 'MITOCHONDRIAL'
  | 'MULTIFACTORIAL';

export interface KnownCondition {
  name: string;
  omimId?: string;
  inheritance: InheritancePattern;
  penetrance: 'HIGH' | 'MODERATE' | 'LOW' | 'VARIABLE';
}

export interface KnownGeneInfo {
  symbol: string;
  name: string;
  chromosome: string;
  location: GeneLocation;
  function: string;
  aliases: string[];
  transcripts: string[];
  conditions: KnownCondition[];
  omimId?: string;
  isLofIntolerant: boolean;
  hasFunctionalDomains: boolean;
}

export const KNOWN_GENES: Record<string, KnownGeneInfo> = {
  BRCA1: {
    symbol: 'BRCA1', name: 'BRCA DNA Repair Associated',
    chromosome: '17', location: { start: 43044295, end: 43125483, strand: '-' },
    function: 'Tumor suppressor involved in DNA double-strand break repair',
    aliases: ['RNF53', 'BRCC1', 'PPP1R53'],
    transcripts: ['ENST00000357654', 'ENST00000471181'],
    conditions: [
      { name: 'Hereditary breast and ovarian cancer syndrome', omimId: '604370', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
      { name: 'Fanconi anemia', omimId: '617883', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '113705', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  BRCA2: {
    symbol: 'BRCA2', name: 'BRCA DNA Repair Associated 2',
    chromosome: '13', location: { start: 32315474, end: 32400266, strand: '+' },
    function: 'Tumor suppressor; mediates RAD51 recruitment to DNA breaks',
    aliases: ['FACD', 'FAD', 'FAD1', 'FANCD1'],
    transcripts: ['ENST00000380152'],
    conditions: [
      { name: 'Hereditary breast and ovarian cancer syndrome', omimId: '612555', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
      { name: 'Fanconi anemia type D1', omimId: '605724', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '600185', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  TP53: {
    symbol: 'TP53', name: 'Tumor Protein P53',
    chromosome: '17', location: { start: 7668421, end: 7687490, strand: '-' },
    function: 'Transcription factor; activates apoptosis and cell cycle arrest',
    aliases: ['P53', 'LFS1', 'TRP53'],
    transcripts: ['ENST00000269305', 'ENST00000359597'],
    conditions: [
      { name: 'Li-Fraumeni syndrome', omimId: '151623', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
      { name: 'Somatic cancers (multiple types)', omimId: '191170', inheritance: 'MULTIFACTORIAL', penetrance: 'VARIABLE' },
    ],
    omimId: '191170', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  CFTR: {
    symbol: 'CFTR', name: 'CF Transmembrane Conductance Regulator',
    chromosome: '7', location: { start: 117480025, end: 117668665, strand: '+' },
    function: 'Chloride ion channel; regulates epithelial fluid transport',
    aliases: ['ABCC7', 'CF', 'MRP7'],
    transcripts: ['ENST00000003084'],
    conditions: [
      { name: 'Cystic fibrosis', omimId: '219700', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
      { name: 'Congenital bilateral absence of vas deferens', omimId: '277180', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '602421', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  LDLR: {
    symbol: 'LDLR', name: 'Low Density Lipoprotein Receptor',
    chromosome: '19', location: { start: 11089362, end: 11133820, strand: '+' },
    function: 'Mediates endocytosis of LDL particles from plasma',
    aliases: ['FH', 'FHC', 'LDLCQ2'],
    transcripts: ['ENST00000558518'],
    conditions: [
      { name: 'Familial hypercholesterolemia', omimId: '143890', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '606945', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  HBB: {
    symbol: 'HBB', name: 'Hemoglobin Subunit Beta',
    chromosome: '11', location: { start: 5225464, end: 5229395, strand: '-' },
    function: 'Oxygen transport as part of hemoglobin A',
    aliases: ['CD113t-C', 'beta-globin'],
    transcripts: ['ENST00000335295'],
    conditions: [
      { name: 'Sickle cell disease', omimId: '603903', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
      { name: 'Beta thalassemia', omimId: '613985', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '141900', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  APOE: {
    symbol: 'APOE', name: 'Apolipoprotein E',
    chromosome: '19', location: { start: 44905754, end: 44909393, strand: '+' },
    function: 'Lipid transport; APOE4 allele is risk factor for Alzheimer disease',
    aliases: ['AD2', 'LPE'],
    transcripts: ['ENST00000252486'],
    conditions: [
      { name: "Alzheimer disease, susceptibility to", omimId: '104310', inheritance: 'MULTIFACTORIAL', penetrance: 'LOW' },
      { name: 'Hyperlipoproteinemia type III', omimId: '617347', inheritance: 'MULTIFACTORIAL', penetrance: 'VARIABLE' },
    ],
    omimId: '107741', isLofIntolerant: false, hasFunctionalDomains: false,
  },
  MLH1: {
    symbol: 'MLH1', name: 'MutL Homolog 1',
    chromosome: '3', location: { start: 36993343, end: 37050845, strand: '+' },
    function: 'DNA mismatch repair; maintains genome stability',
    aliases: ['COCA2', 'FCC2', 'HNPCC'],
    transcripts: ['ENST00000231790'],
    conditions: [
      { name: 'Lynch syndrome I', omimId: '120436', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '120436', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  MTHFR: {
    symbol: 'MTHFR', name: 'Methylenetetrahydrofolate Reductase',
    chromosome: '1', location: { start: 11785730, end: 11806103, strand: '-' },
    function: 'Converts 5,10-methyleneTHF to 5-methylTHF; folate metabolism',
    aliases: [],
    transcripts: ['ENST00000376839'],
    conditions: [
      { name: 'Homocystinuria', omimId: '236250', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
      { name: 'Neural tube defect, susceptibility to', omimId: '601634', inheritance: 'MULTIFACTORIAL', penetrance: 'LOW' },
    ],
    omimId: '607093', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  PTEN: {
    symbol: 'PTEN', name: 'Phosphatase and Tensin Homolog',
    chromosome: '10', location: { start: 89692905, end: 89728532, strand: '+' },
    function: 'Phosphatase tumor suppressor; inhibits PI3K/AKT signaling',
    aliases: ['BZS', 'CWS1', 'DEC', 'GLM2', 'MHAM'],
    transcripts: ['ENST00000371953'],
    conditions: [
      { name: 'Cowden syndrome', omimId: '158350', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
      { name: 'PTEN hamartoma tumor syndrome', omimId: '601728', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '601728', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  VHL: {
    symbol: 'VHL', name: 'Von Hippel-Lindau Tumor Suppressor',
    chromosome: '3', location: { start: 10142086, end: 10153958, strand: '+' },
    function: 'E3 ubiquitin ligase component; regulates HIF-1alpha degradation',
    aliases: ['RCA1', 'HRCA1'],
    transcripts: ['ENST00000256474'],
    conditions: [
      { name: 'Von Hippel-Lindau syndrome', omimId: '193300', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '608537', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  SCN5A: {
    symbol: 'SCN5A', name: 'Sodium Voltage-Gated Channel Alpha Subunit 5',
    chromosome: '3', location: { start: 38548056, end: 38649163, strand: '-' },
    function: 'Cardiac voltage-gated sodium channel; action potential generation',
    aliases: ['HH1', 'ICCD', 'LQT3', 'Nav1.5'],
    transcripts: ['ENST00000423572'],
    conditions: [
      { name: 'Brugada syndrome 1', omimId: '601144', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'VARIABLE' },
      { name: 'Long QT syndrome 3', omimId: '603830', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'VARIABLE' },
    ],
    omimId: '600163', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  CYP2C19: {
    symbol: 'CYP2C19', name: 'Cytochrome P450 Family 2 Subfamily C Member 19',
    chromosome: '10', location: { start: 94762681, end: 94855547, strand: '-' },
    function: 'Drug metabolism; metabolizes clopidogrel, PPIs, antidepressants',
    aliases: ['CPCJ', 'CYP2C', 'P450C2C'],
    transcripts: ['ENST00000371801'],
    conditions: [
      { name: 'CYP2C19 poor metabolizer phenotype', omimId: '609535', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '124020', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  CYP2D6: {
    symbol: 'CYP2D6', name: 'Cytochrome P450 Family 2 Subfamily D Member 6',
    chromosome: '22', location: { start: 42126499, end: 42130881, strand: '+' },
    function: 'Metabolizes ~25% of clinically used drugs including opioids and antidepressants',
    aliases: ['CPD6', 'CYP2D', 'P450-DB1'],
    transcripts: ['ENST00000360610'],
    conditions: [
      { name: 'CYP2D6 poor metabolizer phenotype', omimId: '608902', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '124030', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  G6PD: {
    symbol: 'G6PD', name: 'Glucose-6-Phosphate Dehydrogenase',
    chromosome: 'X', location: { start: 154531391, end: 154547569, strand: '+' },
    function: 'Protects erythrocytes from oxidative damage via pentose phosphate pathway',
    aliases: [],
    transcripts: ['ENST00000393562'],
    conditions: [
      { name: 'G6PD deficiency', omimId: '300908', inheritance: 'X_LINKED_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '305900', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  KCNQ1: {
    symbol: 'KCNQ1', name: 'Potassium Voltage-Gated Channel Subfamily Q Member 1',
    chromosome: '11', location: { start: 2447010, end: 2877869, strand: '+' },
    function: 'Voltage-gated potassium channel; cardiac repolarization',
    aliases: ['JLNS1', 'KVLQT1', 'LQT1', 'RWS', 'SQT2'],
    transcripts: ['ENST00000155840'],
    conditions: [
      { name: 'Long QT syndrome 1', omimId: '192500', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'VARIABLE' },
      { name: 'Jervell and Lange-Nielsen syndrome 1', omimId: '220400', inheritance: 'AUTOSOMAL_RECESSIVE', penetrance: 'HIGH' },
    ],
    omimId: '607542', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  APC: {
    symbol: 'APC', name: 'APC Regulator of WNT Signaling Pathway',
    chromosome: '5', location: { start: 112707498, end: 112846239, strand: '+' },
    function: 'Tumor suppressor; regulates Wnt/beta-catenin pathway',
    aliases: ['DP2', 'DP2.5', 'DP3', 'PPP1R46'],
    transcripts: ['ENST00000257430'],
    conditions: [
      { name: 'Familial adenomatous polyposis', omimId: '175100', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
      { name: 'Colorectal cancer', omimId: '114500', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '611731', isLofIntolerant: true, hasFunctionalDomains: true,
  },
  PKD1: {
    symbol: 'PKD1', name: 'Polycystin 1, Transient Receptor Potential Channel Interacting',
    chromosome: '16', location: { start: 2111488, end: 2138591, strand: '+' },
    function: 'Mechanosensory receptor complex; regulates tubular morphogenesis',
    aliases: ['PBP', 'Pc-1', 'TRPP1'],
    transcripts: ['ENST00000262304'],
    conditions: [
      { name: 'Polycystic kidney disease, autosomal dominant', omimId: '173900', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '601313', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  TTR: {
    symbol: 'TTR', name: 'Transthyretin',
    chromosome: '18', location: { start: 31592985, end: 31600687, strand: '-' },
    function: 'Transport protein for thyroid hormones and retinol',
    aliases: ['HsT2651', 'PALB', 'TBPA'],
    transcripts: ['ENST00000237014'],
    conditions: [
      { name: 'Transthyretin-related hereditary amyloidosis', omimId: '176300', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'VARIABLE' },
    ],
    omimId: '176300', isLofIntolerant: false, hasFunctionalDomains: true,
  },
  MSH2: {
    symbol: 'MSH2', name: 'MutS Homolog 2',
    chromosome: '2', location: { start: 47403067, end: 47709000, strand: '+' },
    function: 'DNA mismatch repair recognition; Lynch syndrome gene',
    aliases: ['COCA1', 'FCC1', 'HNPCC1'],
    transcripts: ['ENST00000233146'],
    conditions: [
      { name: 'Lynch syndrome II', omimId: '609309', inheritance: 'AUTOSOMAL_DOMINANT', penetrance: 'HIGH' },
    ],
    omimId: '609309', isLofIntolerant: true, hasFunctionalDomains: true,
  },
};

export function getKnownGene(symbol: string): KnownGeneInfo | undefined {
  return KNOWN_GENES[symbol.toUpperCase()];
}

export function isKnownDiseaseGene(symbol: string): boolean {
  return symbol.toUpperCase() in KNOWN_GENES;
}

export function getConditionsForGene(symbol: string): KnownCondition[] {
  return KNOWN_GENES[symbol.toUpperCase()]?.conditions ?? [];
}

export function isLofIntolerantGene(symbol: string): boolean {
  return KNOWN_GENES[symbol.toUpperCase()]?.isLofIntolerant ?? false;
}

export function searchGenesByChromosome(chromosome: string): KnownGeneInfo[] {
  const chr = chromosome.replace(/^chr/i, '');
  return Object.values(KNOWN_GENES).filter((g) => g.chromosome === chr);
}
