export enum ClinicalDomain {
  CARDIOLOGY = 'CARDIOLOGY',
  ENDOCRINOLOGY = 'ENDOCRINOLOGY',
  NUTRITION = 'NUTRITION',
  EXERCISE = 'EXERCISE',
  SLEEP = 'SLEEP',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  LONGEVITY = 'LONGEVITY',
  WOMENS_HEALTH = 'WOMENS_HEALTH',
  MENS_HEALTH = 'MENS_HEALTH',
  PEDIATRICS = 'PEDIATRICS',
  GERIATRICS = 'GERIATRICS',
  METABOLISM = 'METABOLISM',
  INFLAMMATION = 'INFLAMMATION',
  IMMUNOLOGY = 'IMMUNOLOGY',
}

export interface DomainDefinition {
  domain: ClinicalDomain;
  label: string;
  labelEn: string;
  description: string;
  keywords: string[];
}

export const CLINICAL_DOMAINS: DomainDefinition[] = [
  {
    domain: ClinicalDomain.CARDIOLOGY,
    label: 'Cardiologia',
    labelEn: 'Cardiology',
    description: 'Diagnóstico e tratamento de doenças do coração e sistema cardiovascular.',
    keywords: ['coração', 'cardiovascular', 'hipertensão', 'infarto', 'arritmia', 'coronária', 'aterosclerose'],
  },
  {
    domain: ClinicalDomain.ENDOCRINOLOGY,
    label: 'Endocrinologia',
    labelEn: 'Endocrinology',
    description: 'Hormônios, glândulas endócrinas, diabetes, tireoide e distúrbios metabólicos hormonais.',
    keywords: ['diabetes', 'tireoide', 'insulina', 'hormônio', 'hipoglicemia', 'HbA1c', 'glicemia'],
  },
  {
    domain: ClinicalDomain.NUTRITION,
    label: 'Nutrição',
    labelEn: 'Nutrition',
    description: 'Alimentação saudável, macronutrientes, micronutrientes, suplementação e dietas terapêuticas.',
    keywords: ['dieta', 'alimentação', 'nutrição', 'vitaminas', 'minerais', 'calorias', 'proteínas', 'fibras'],
  },
  {
    domain: ClinicalDomain.EXERCISE,
    label: 'Exercício Físico',
    labelEn: 'Exercise',
    description: 'Atividade física, exercício aeróbico, resistência muscular, sedentarismo e condicionamento.',
    keywords: ['exercício', 'atividade física', 'sedentarismo', 'aeróbico', 'resistência', 'caminhada', 'musculação'],
  },
  {
    domain: ClinicalDomain.SLEEP,
    label: 'Sono',
    labelEn: 'Sleep',
    description: 'Qualidade do sono, apneia, insônia, higiene do sono e impacto na saúde geral.',
    keywords: ['sono', 'apneia', 'insônia', 'privação de sono', 'higiene do sono', 'ciclo circadiano'],
  },
  {
    domain: ClinicalDomain.MENTAL_HEALTH,
    label: 'Saúde Mental',
    labelEn: 'Mental Health',
    description: 'Saúde emocional, transtornos mentais, ansiedade, depressão e bem-estar psicológico.',
    keywords: ['ansiedade', 'depressão', 'estresse', 'burnout', 'bem-estar', 'mental', 'psicológico'],
  },
  {
    domain: ClinicalDomain.LONGEVITY,
    label: 'Longevidade',
    labelEn: 'Longevity',
    description: 'Envelhecimento saudável, biomarcadores de longevidade, senescência celular e longevidade funcional.',
    keywords: ['longevidade', 'envelhecimento', 'telômeros', 'senescência', 'healthspan', 'lifespan'],
  },
  {
    domain: ClinicalDomain.WOMENS_HEALTH,
    label: 'Saúde da Mulher',
    labelEn: "Women's Health",
    description: 'Saúde feminina, ciclo menstrual, gravidez, menopausa e ginecologia preventiva.',
    keywords: ['menopausa', 'gravidez', 'menstruação', 'hormônios femininos', 'osteoporose', 'mama'],
  },
  {
    domain: ClinicalDomain.MENS_HEALTH,
    label: 'Saúde do Homem',
    labelEn: "Men's Health",
    description: 'Saúde masculina, próstata, testosterona, andropausa e urologia preventiva.',
    keywords: ['próstata', 'testosterona', 'andropausa', 'PSA', 'disfunção erétil', 'urologista'],
  },
  {
    domain: ClinicalDomain.PEDIATRICS,
    label: 'Pediatria',
    labelEn: 'Pediatrics',
    description: 'Saúde infantil, desenvolvimento, vacinação, nutrição pediátrica e doenças da infância.',
    keywords: ['criança', 'infância', 'desenvolvimento', 'vacina', 'pediatria', 'crescimento', 'pediátrico'],
  },
  {
    domain: ClinicalDomain.GERIATRICS,
    label: 'Geriatria',
    labelEn: 'Geriatrics',
    description: 'Cuidados com idosos, fragilidade, polifarmácia, quedas, demência e envelhecimento patológico.',
    keywords: ['idoso', 'fragilidade', 'demência', 'Alzheimer', 'quedas', 'polifarmácia', 'geriatria'],
  },
  {
    domain: ClinicalDomain.METABOLISM,
    label: 'Metabolismo',
    labelEn: 'Metabolism',
    description: 'Processos metabólicos, síndrome metabólica, resistência insulínica, lipídeos e dislipidemia.',
    keywords: ['metabolismo', 'síndrome metabólica', 'lipídeos', 'colesterol', 'triglicerídeos', 'resistência insulínica'],
  },
  {
    domain: ClinicalDomain.INFLAMMATION,
    label: 'Inflamação',
    labelEn: 'Inflammation',
    description: 'Inflamação sistêmica, marcadores inflamatórios (PCR, IL-6), inflamação crônica de baixo grau.',
    keywords: ['inflamação', 'PCR', 'IL-6', 'citocinas', 'inflamatório', 'artrite', 'autoimune'],
  },
  {
    domain: ClinicalDomain.IMMUNOLOGY,
    label: 'Imunologia',
    labelEn: 'Immunology',
    description: 'Sistema imunológico, imunidade, vacinação, alergias, autoimunidade e imunodeficiências.',
    keywords: ['imunidade', 'imunológico', 'alergia', 'autoimune', 'anticorpos', 'vacina', 'imunodeficiência'],
  },
];

export function getDomainByName(name: string): DomainDefinition | undefined {
  return CLINICAL_DOMAINS.find(
    (d) => d.domain === name.toUpperCase() || d.label.toLowerCase() === name.toLowerCase(),
  );
}
