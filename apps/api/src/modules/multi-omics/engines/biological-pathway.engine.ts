import { IntegratedFeature } from '../entities/omics-integration.entity.js';

export interface PathwayMapping {
  pathwayId: string;
  pathwayName: string;
  category: string;
  matchedFeatures: string[];
  enrichmentScore: number;
  significance: 'HIGH' | 'MODERATE' | 'LOW';
  clinicalRelevance: string;
}

export interface PathwayEnrichment {
  pathwayId: string;
  pathwayName: string;
  matchCount: number;
  totalMarkers: number;
  enrichmentRatio: number;
  category: string;
  clinicalRelevance: string;
}

interface PathwayDefinition {
  id: string;
  name: string;
  markers: string[];
  category: 'METABOLISM' | 'SIGNALING' | 'IMMUNE' | 'LIPID_METABOLISM' | 'EPIGENETIC' | 'MICROBIOME' | 'STRUCTURAL';
  clinicalRelevance: string;
}

const PATHWAYS: PathwayDefinition[] = [
  {
    id: 'hsa00010',
    name: 'Glycolysis / Gluconeogenesis',
    markers: ['hk1', 'hk2', 'pfk1', 'pfkm', 'aldoa', 'gapdh', 'pgk1', 'eno1', 'pkm', 'ldha', 'glucose', 'pyruvate', 'lactate', 'fructose-6-phosphate'],
    category: 'METABOLISM',
    clinicalRelevance: 'Diabetes, Cancer, Metabolic syndrome',
  },
  {
    id: 'hsa00020',
    name: 'TCA Cycle (Krebs Cycle)',
    markers: ['cs', 'aco2', 'idh3a', 'idh2', 'ogdh', 'sucla2', 'fh', 'mdh2', 'citrate', 'succinate', 'fumarate', 'malate', 'isocitrate', 'oxaloacetate'],
    category: 'METABOLISM',
    clinicalRelevance: 'Mitochondrial disorders, Metabolic syndrome, Cancer',
  },
  {
    id: 'hsa04910',
    name: 'Insulin Signaling Pathway',
    markers: ['insr', 'irs1', 'irs2', 'pik3r1', 'pik3ca', 'pdpk1', 'akt1', 'akt2', 'foxo1', 'gsk3b', 'mtor', 'glucose', 'insulin', 'glycogen'],
    category: 'SIGNALING',
    clinicalRelevance: 'Diabetes, Obesity, Metabolic syndrome',
  },
  {
    id: 'hsa04151',
    name: 'PI3K-Akt Signaling Pathway',
    markers: ['pik3ca', 'pik3cb', 'pten', 'akt1', 'akt2', 'akt3', 'mtor', 'igf1r', 'insr', 'egfr', 'erbb2', 'bad', 'bcl2'],
    category: 'SIGNALING',
    clinicalRelevance: 'Cancer, Diabetes, Cardiovascular disease',
  },
  {
    id: 'hsa04060',
    name: 'Cytokine-Cytokine Receptor Interaction',
    markers: ['il6', 'tnf', 'tnfa', 'il1b', 'il1a', 'ifng', 'il10', 'tgfb1', 'vegfa', 'il2', 'il4', 'il12a', 'cxcl8', 'ccl2'],
    category: 'IMMUNE',
    clinicalRelevance: 'Inflammation, Autoimmune disease, Sepsis, COVID-19',
  },
  {
    id: 'hsa04010',
    name: 'MAPK Signaling Pathway',
    markers: ['hras', 'kras', 'nras', 'raf1', 'braf', 'map2k1', 'map2k2', 'mapk1', 'mapk3', 'mapk8', 'egfr', 'erbb2', 'fgfr1'],
    category: 'SIGNALING',
    clinicalRelevance: 'Cancer, Cardiovascular disease, Inflammatory disease',
  },
  {
    id: 'hsa00061',
    name: 'Fatty Acid Biosynthesis',
    markers: ['acaca', 'acacb', 'fasn', 'scd1', 'elovl6', 'elovl5', 'palmitate', 'stearate', 'oleate', 'malonyl-coa', 'acetyl-coa'],
    category: 'LIPID_METABOLISM',
    clinicalRelevance: 'Obesity, Metabolic syndrome, Non-alcoholic fatty liver disease',
  },
  {
    id: 'hsa04920',
    name: 'Adipocytokine Signaling Pathway',
    markers: ['adipoq', 'adipor1', 'adipor2', 'lep', 'lepr', 'retn', 'ppara', 'pparg', 'rxra', 'cpt1a', 'acsl1'],
    category: 'METABOLISM',
    clinicalRelevance: 'Obesity, Diabetes, Metabolic syndrome, Cardiovascular disease',
  },
  {
    id: 'hsa05010',
    name: 'Alzheimer Disease',
    markers: ['app', 'psen1', 'psen2', 'apoe', 'mapt', 'bace1', 'ace', 'adam10', 'amyloid-beta', 'tau'],
    category: 'SIGNALING',
    clinicalRelevance: 'Neurodegenerative disease, Cognitive decline',
  },
  {
    id: 'hsa04210',
    name: 'Apoptosis',
    markers: ['tp53', 'bax', 'bcl2', 'casp3', 'casp8', 'casp9', 'cyc', 'cytochrome-c', 'bad', 'bid', 'bcl2l1', 'xiap'],
    category: 'SIGNALING',
    clinicalRelevance: 'Cancer, Neurodegeneration, Heart failure',
  },
  {
    id: 'hsa00590',
    name: 'Arachidonic Acid Metabolism',
    markers: ['ptgs1', 'ptgs2', 'cox2', 'alox5', 'alox12', 'cyp4f3', 'pla2g4a', 'arachidonic-acid', 'prostaglandin', 'leukotriene', 'thromboxane'],
    category: 'LIPID_METABOLISM',
    clinicalRelevance: 'Inflammation, Asthma, Cardiovascular disease',
  },
  {
    id: 'hsa04330',
    name: 'Notch Signaling Pathway',
    markers: ['notch1', 'notch2', 'notch3', 'dll1', 'dll3', 'dll4', 'jag1', 'jag2', 'hes1', 'hey1', 'rbpj', 'maml1'],
    category: 'SIGNALING',
    clinicalRelevance: 'Cancer, Cardiac development, T-cell differentiation',
  },
  {
    id: 'hsa04062',
    name: 'Chemokine Signaling Pathway',
    markers: ['ccr2', 'ccr5', 'cxcr4', 'cxcl12', 'ccl5', 'ccl2', 'ccl3', 'il8', 'cxcl8', 'gi', 'rac1', 'rho'],
    category: 'IMMUNE',
    clinicalRelevance: 'HIV infection, Cancer metastasis, Autoimmune disease',
  },
  {
    id: 'hsa00140',
    name: 'Steroid Hormone Biosynthesis',
    markers: ['cyp11a1', 'cyp17a1', 'cyp19a1', 'hsd3b1', 'hsd11b1', 'hsd11b2', 'cortisol', 'testosterone', 'estradiol', 'progesterone', 'aldosterone'],
    category: 'METABOLISM',
    clinicalRelevance: 'Adrenal disorders, Hormonal cancers, Metabolic syndrome',
  },
];

const PATHWAY_MARKER_INDEX: Map<string, PathwayDefinition[]> = new Map();
for (const pw of PATHWAYS) {
  for (const marker of pw.markers) {
    const key = marker.toLowerCase();
    const existing = PATHWAY_MARKER_INDEX.get(key) ?? [];
    existing.push(pw);
    PATHWAY_MARKER_INDEX.set(key, existing);
  }
}

export class BiologicalPathwayEngine {
  mapToPathways(features: IntegratedFeature[]): PathwayMapping[] {
    const pathwayCounts = new Map<string, { def: PathwayDefinition; matched: string[] }>();

    for (const feature of features) {
      const shortName = feature.name.includes(':')
        ? feature.name.split(':').slice(1).join(':').toLowerCase()
        : feature.name.toLowerCase();

      const matchedPathways = PATHWAY_MARKER_INDEX.get(shortName) ?? [];
      for (const pw of matchedPathways) {
        const existing = pathwayCounts.get(pw.id);
        if (existing) {
          if (!existing.matched.includes(feature.name)) {
            existing.matched.push(feature.name);
          }
        } else {
          pathwayCounts.set(pw.id, { def: pw, matched: [feature.name] });
        }
      }
    }

    return [...pathwayCounts.values()].map(({ def, matched }) => {
      const enrichmentScore = Math.round((matched.length / def.markers.length) * 100);
      const significance: PathwayMapping['significance'] =
        enrichmentScore >= 30 ? 'HIGH' : enrichmentScore >= 15 ? 'MODERATE' : 'LOW';
      return {
        pathwayId: def.id,
        pathwayName: def.name,
        category: def.category,
        matchedFeatures: matched,
        enrichmentScore,
        significance,
        clinicalRelevance: def.clinicalRelevance,
      };
    }).sort((a, b) => b.enrichmentScore - a.enrichmentScore);
  }

  enrichmentAnalysis(features: IntegratedFeature[]): PathwayEnrichment[] {
    const enrichments: PathwayEnrichment[] = [];

    for (const pw of PATHWAYS) {
      const matchedNames = features.filter((f) => {
        const shortName = f.name.includes(':')
          ? f.name.split(':').slice(1).join(':').toLowerCase()
          : f.name.toLowerCase();
        return pw.markers.includes(shortName);
      });

      if (matchedNames.length === 0) continue;

      const enrichmentRatio = Math.round((matchedNames.length / pw.markers.length) * 1e4) / 1e4;
      enrichments.push({
        pathwayId: pw.id,
        pathwayName: pw.name,
        matchCount: matchedNames.length,
        totalMarkers: pw.markers.length,
        enrichmentRatio,
        category: pw.category,
        clinicalRelevance: pw.clinicalRelevance,
      });
    }

    return enrichments.sort((a, b) => b.enrichmentRatio - a.enrichmentRatio);
  }

  annotateFeatures(features: IntegratedFeature[]): IntegratedFeature[] {
    return features.map((feature) => {
      const shortName = feature.name.includes(':')
        ? feature.name.split(':').slice(1).join(':').toLowerCase()
        : feature.name.toLowerCase();

      const pathways = PATHWAY_MARKER_INDEX.get(shortName) ?? [];
      if (pathways.length === 0) return feature;

      const topPathway = pathways[0];
      return {
        ...feature,
        pathway: topPathway.name,
        clinicalRelevance: topPathway.clinicalRelevance,
        biologicalRelevance: 'HIGH' as const,
      };
    });
  }

  getAllPathways(): PathwayDefinition[] {
    return [...PATHWAYS];
  }

  getPathwayById(id: string): PathwayDefinition | undefined {
    return PATHWAYS.find((p) => p.id === id);
  }

  getClinicalImpact(mappings: PathwayMapping[]): string {
    const highSig = mappings.filter((m) => m.significance === 'HIGH');
    if (highSig.length === 0) return 'No high-significance pathways identified';

    const topics = [...new Set(highSig.map((m) => m.clinicalRelevance))].slice(0, 3);
    return `High-significance pathways detected: ${highSig.map((m) => m.pathwayName).slice(0, 3).join(', ')}. Clinical relevance: ${topics.join('; ')}`;
  }
}
