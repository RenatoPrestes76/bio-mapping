import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus, PrismaClient } from '@bio/database';

export async function seedClinicalKnowledge(prisma: PrismaClient) {
  const entries = [
    {
      category: ClinicalKnowledgeCategory.DISEASE,
      title: 'Hipertensão Arterial Sistêmica',
      description:
        'Condição crônica caracterizada pela elevação persistente da pressão arterial (≥ 140/90 mmHg). Principal fator de risco para doenças cardiovasculares, acidente vascular cerebral e doença renal crônica.',
      clinicalCode: 'I10',
      source: 'CID-10 / Diretrizes Brasileiras de Hipertensão Arterial 2020',
      evidenceLevel: EvidenceLevel.A,
      language: 'pt-BR',
      status: KnowledgeStatus.PUBLISHED,
      tags: ['hipertensão', 'pressão arterial', 'cardiovascular', 'risco'],
      metadata: {
        icdCode: 'I10',
        prevalenceBrazil: '32.5%',
        guideline: 'SBC 2020',
      },
    },
    {
      category: ClinicalKnowledgeCategory.DISEASE,
      title: 'Diabetes Mellitus Tipo 2',
      description:
        'Distúrbio metabólico caracterizado por hiperglicemia decorrente de resistência à insulina e/ou deficiência relativa na secreção de insulina. Diagnóstico por glicemia de jejum ≥ 126 mg/dL ou HbA1c ≥ 6,5%.',
      clinicalCode: 'E11',
      source: 'CID-10 / Diretriz da Sociedade Brasileira de Diabetes 2022-2023',
      evidenceLevel: EvidenceLevel.A,
      language: 'pt-BR',
      status: KnowledgeStatus.PUBLISHED,
      tags: ['diabetes', 'glicemia', 'insulina', 'metabólico', 'HbA1c'],
      metadata: {
        icdCode: 'E11',
        diagnosisCriteria: 'Glicemia jejum ≥ 126 mg/dL ou HbA1c ≥ 6,5%',
        guideline: 'SBD 2022-2023',
      },
    },
    {
      category: ClinicalKnowledgeCategory.DISEASE,
      title: 'Obesidade',
      description:
        'Condição crônica definida pelo excesso de gordura corporal com IMC ≥ 30 kg/m². Associada a comorbidades como hipertensão, diabetes tipo 2, dislipidemia e apneia do sono.',
      clinicalCode: 'E66',
      source: 'CID-10 / ABESO 2016',
      evidenceLevel: EvidenceLevel.A,
      language: 'pt-BR',
      status: KnowledgeStatus.PUBLISHED,
      tags: ['obesidade', 'IMC', 'peso', 'gordura corporal', 'comorbidades'],
      metadata: {
        icdCode: 'E66',
        bmiThreshold: 30,
        classification: { overweight: '25-29.9', obesity1: '30-34.9', obesity2: '35-39.9', obesity3: '>=40' },
      },
    },
    {
      category: ClinicalKnowledgeCategory.DISEASE,
      title: 'Síndrome Metabólica',
      description:
        'Conjunto de alterações metabólicas que inclui obesidade abdominal, hipertensão, hiperglicemia e dislipidemia. Diagnóstico requer presença de ≥ 3 critérios: circunferência abdominal aumentada, TG ≥ 150 mg/dL, HDL baixo, pressão ≥ 130/85 mmHg ou glicemia ≥ 100 mg/dL.',
      clinicalCode: 'E88.8',
      source: 'CID-10 / IDF 2006 / NCEP-ATP III',
      evidenceLevel: EvidenceLevel.A,
      language: 'pt-BR',
      status: KnowledgeStatus.PUBLISHED,
      tags: ['síndrome metabólica', 'obesidade abdominal', 'triglicerídeos', 'HDL', 'resistência insulínica'],
      metadata: {
        icdCode: 'E88.8',
        criteria: ['circunferência abdominal', 'triglicerídeos', 'HDL', 'pressão arterial', 'glicemia'],
        minCriteria: 3,
      },
    },
    {
      category: ClinicalKnowledgeCategory.DISEASE,
      title: 'Dislipidemia',
      description:
        'Alteração nos níveis séricos de lipídeos: colesterol total, LDL, HDL e triglicerídeos. Fator de risco independente para doença arterial coronariana. Diagnóstico por perfil lipídico com LDL ≥ 130 mg/dL, TG ≥ 150 mg/dL ou HDL < 40 mg/dL (homens) / < 50 mg/dL (mulheres).',
      clinicalCode: 'E78',
      source: 'CID-10 / Diretriz Brasileira de Dislipidemia 2017',
      evidenceLevel: EvidenceLevel.A,
      language: 'pt-BR',
      status: KnowledgeStatus.PUBLISHED,
      tags: ['dislipidemia', 'colesterol', 'LDL', 'HDL', 'triglicerídeos', 'lipídeos'],
      metadata: {
        icdCode: 'E78',
        ldlTarget: { lowRisk: '<130', moderateRisk: '<100', highRisk: '<70', veryHighRisk: '<50' },
        guideline: 'SBDC 2017',
      },
    },
  ];

  let created = 0;
  for (const entry of entries) {
    const exists = await prisma.clinicalKnowledge.findFirst({
      where: { clinicalCode: entry.clinicalCode },
    });
    if (!exists) {
      await prisma.clinicalKnowledge.create({ data: { ...entry, metadata: entry.metadata as object } });
      created++;
    }
  }
  return created;
}
