import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';

export const BUILT_IN_RELATIONS: ConceptRelation[] = [
  // ── Obesity chain ────────────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-001', sourceConcept: 'concept-obesity', targetConcept: 'concept-dm2', relationType: RelationType.CAUSES, weight: 0.75, confidence: 0.92 }),
  new ConceptRelation({ id: 'rel-002', sourceConcept: 'concept-obesity', targetConcept: 'concept-hypertension', relationType: RelationType.CAUSES, weight: 0.65, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-003', sourceConcept: 'concept-obesity', targetConcept: 'concept-dyslipidemia', relationType: RelationType.CAUSES, weight: 0.60, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-004', sourceConcept: 'concept-obesity', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.PART_OF, weight: 0.85, confidence: 0.95 }),

  // ── Metabolic syndrome ──────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-005', sourceConcept: 'concept-metabolic-syndrome', targetConcept: 'concept-cad', relationType: RelationType.INCREASES_RISK, weight: 0.80, confidence: 0.90 }),
  new ConceptRelation({ id: 'rel-006', sourceConcept: 'concept-metabolic-syndrome', targetConcept: 'concept-dm2', relationType: RelationType.INCREASES_RISK, weight: 0.85, confidence: 0.92 }),
  new ConceptRelation({ id: 'rel-007', sourceConcept: 'concept-hypertension', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.ASSOCIATED_WITH, weight: 0.75, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-008', sourceConcept: 'concept-dm2', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.ASSOCIATED_WITH, weight: 0.85, confidence: 0.92 }),
  new ConceptRelation({ id: 'rel-009', sourceConcept: 'concept-dyslipidemia', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.PART_OF, weight: 0.80, confidence: 0.90 }),

  // ── Cardiovascular cascade ──────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-010', sourceConcept: 'concept-hypertension', targetConcept: 'concept-heart-failure', relationType: RelationType.CAUSES, weight: 0.80, confidence: 0.92 }),
  new ConceptRelation({ id: 'rel-011', sourceConcept: 'concept-hypertension', targetConcept: 'concept-ckd', relationType: RelationType.CAUSES, weight: 0.72, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-012', sourceConcept: 'concept-hypertension', targetConcept: 'concept-cad', relationType: RelationType.INCREASES_RISK, weight: 0.78, confidence: 0.90 }),
  new ConceptRelation({ id: 'rel-013', sourceConcept: 'concept-dyslipidemia', targetConcept: 'concept-atherosclerosis', relationType: RelationType.CAUSES, weight: 0.88, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-014', sourceConcept: 'concept-atherosclerosis', targetConcept: 'concept-cad', relationType: RelationType.CAUSES, weight: 0.90, confidence: 0.96 }),
  new ConceptRelation({ id: 'rel-015', sourceConcept: 'concept-cad', targetConcept: 'concept-heart-failure', relationType: RelationType.CAUSES, weight: 0.70, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-016', sourceConcept: 'concept-dm2', targetConcept: 'concept-ckd', relationType: RelationType.CAUSES, weight: 0.68, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-017', sourceConcept: 'concept-dm2', targetConcept: 'concept-cad', relationType: RelationType.INCREASES_RISK, weight: 0.80, confidence: 0.90 }),

  // ── Biomarker → Disease ──────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-018', sourceConcept: 'concept-ldl', targetConcept: 'concept-atherosclerosis', relationType: RelationType.INCREASES_RISK, weight: 0.90, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-019', sourceConcept: 'concept-hba1c', targetConcept: 'concept-dm2', relationType: RelationType.INDICATES, weight: 0.95, confidence: 0.98 }),
  new ConceptRelation({ id: 'rel-020', sourceConcept: 'concept-fasting-glucose', targetConcept: 'concept-dm2', relationType: RelationType.INDICATES, weight: 0.90, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-021', sourceConcept: 'concept-crp', targetConcept: 'concept-atherosclerosis', relationType: RelationType.INDICATES, weight: 0.72, confidence: 0.82 }),
  new ConceptRelation({ id: 'rel-022', sourceConcept: 'concept-crp', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.ASSOCIATED_WITH, weight: 0.65, confidence: 0.78 }),
  new ConceptRelation({ id: 'rel-023', sourceConcept: 'concept-bmi', targetConcept: 'concept-obesity', relationType: RelationType.INDICATES, weight: 0.95, confidence: 0.98 }),
  new ConceptRelation({ id: 'rel-024', sourceConcept: 'concept-systolic-bp', targetConcept: 'concept-hypertension', relationType: RelationType.INDICATES, weight: 0.95, confidence: 0.98 }),
  new ConceptRelation({ id: 'rel-025', sourceConcept: 'concept-tsh', targetConcept: 'concept-hypothyroidism', relationType: RelationType.INDICATES, weight: 0.90, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-026', sourceConcept: 'concept-triglycerides', targetConcept: 'concept-dyslipidemia', relationType: RelationType.INDICATES, weight: 0.88, confidence: 0.93 }),
  new ConceptRelation({ id: 'rel-027', sourceConcept: 'concept-hdl', targetConcept: 'concept-cad', relationType: RelationType.DECREASES_RISK, weight: 0.72, confidence: 0.85 }),

  // ── Symptoms → Disease ───────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-028', sourceConcept: 'concept-polyuria', targetConcept: 'concept-dm2', relationType: RelationType.INDICATES, weight: 0.85, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-029', sourceConcept: 'concept-polydipsia', targetConcept: 'concept-dm2', relationType: RelationType.INDICATES, weight: 0.80, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-030', sourceConcept: 'concept-fatigue', targetConcept: 'concept-hypothyroidism', relationType: RelationType.INDICATES, weight: 0.60, confidence: 0.70 }),
  new ConceptRelation({ id: 'rel-031', sourceConcept: 'concept-fatigue', targetConcept: 'concept-dm2', relationType: RelationType.INDICATES, weight: 0.50, confidence: 0.65 }),
  new ConceptRelation({ id: 'rel-032', sourceConcept: 'concept-chest-pain', targetConcept: 'concept-cad', relationType: RelationType.INDICATES, weight: 0.82, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-033', sourceConcept: 'concept-dyspnea', targetConcept: 'concept-heart-failure', relationType: RelationType.INDICATES, weight: 0.78, confidence: 0.82 }),

  // ── Medications → Disease ────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-034', sourceConcept: 'concept-dm2', targetConcept: 'concept-metformin', relationType: RelationType.TREATED_BY, weight: 0.90, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-035', sourceConcept: 'concept-dyslipidemia', targetConcept: 'concept-statins', relationType: RelationType.TREATED_BY, weight: 0.92, confidence: 0.96 }),
  new ConceptRelation({ id: 'rel-036', sourceConcept: 'concept-hypertension', targetConcept: 'concept-ace-inhibitors', relationType: RelationType.TREATED_BY, weight: 0.85, confidence: 0.92 }),
  new ConceptRelation({ id: 'rel-037', sourceConcept: 'concept-dm2', targetConcept: 'concept-ace-inhibitors', relationType: RelationType.TREATED_BY, weight: 0.70, confidence: 0.85 }),

  // ── Nutrients → Disease prevention ──────────────────────────────────────────
  new ConceptRelation({ id: 'rel-038', sourceConcept: 'concept-omega3', targetConcept: 'concept-dyslipidemia', relationType: RelationType.DECREASES_RISK, weight: 0.65, confidence: 0.80 }),
  new ConceptRelation({ id: 'rel-039', sourceConcept: 'concept-omega3', targetConcept: 'concept-atherosclerosis', relationType: RelationType.DECREASES_RISK, weight: 0.60, confidence: 0.78 }),
  new ConceptRelation({ id: 'rel-040', sourceConcept: 'concept-dietary-fiber', targetConcept: 'concept-dm2', relationType: RelationType.DECREASES_RISK, weight: 0.55, confidence: 0.78 }),
  new ConceptRelation({ id: 'rel-041', sourceConcept: 'concept-dietary-fiber', targetConcept: 'concept-dyslipidemia', relationType: RelationType.DECREASES_RISK, weight: 0.58, confidence: 0.80 }),

  // ── Lifestyle → Disease ──────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-042', sourceConcept: 'concept-sedentary', targetConcept: 'concept-obesity', relationType: RelationType.INCREASES_RISK, weight: 0.72, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-043', sourceConcept: 'concept-sedentary', targetConcept: 'concept-metabolic-syndrome', relationType: RelationType.INCREASES_RISK, weight: 0.68, confidence: 0.82 }),
  new ConceptRelation({ id: 'rel-044', sourceConcept: 'concept-sedentary', targetConcept: 'concept-dm2', relationType: RelationType.INCREASES_RISK, weight: 0.65, confidence: 0.82 }),
  new ConceptRelation({ id: 'rel-045', sourceConcept: 'concept-smoking', targetConcept: 'concept-cad', relationType: RelationType.INCREASES_RISK, weight: 0.90, confidence: 0.96 }),
  new ConceptRelation({ id: 'rel-046', sourceConcept: 'concept-smoking', targetConcept: 'concept-atherosclerosis', relationType: RelationType.INCREASES_RISK, weight: 0.88, confidence: 0.95 }),
  new ConceptRelation({ id: 'rel-047', sourceConcept: 'concept-high-sodium', targetConcept: 'concept-hypertension', relationType: RelationType.INCREASES_RISK, weight: 0.72, confidence: 0.86 }),

  // ── Exercise → Disease prevention ───────────────────────────────────────────
  new ConceptRelation({ id: 'rel-048', sourceConcept: 'concept-aerobic', targetConcept: 'concept-hypertension', relationType: RelationType.DECREASES_RISK, weight: 0.72, confidence: 0.86 }),
  new ConceptRelation({ id: 'rel-049', sourceConcept: 'concept-aerobic', targetConcept: 'concept-dm2', relationType: RelationType.DECREASES_RISK, weight: 0.68, confidence: 0.85 }),
  new ConceptRelation({ id: 'rel-050', sourceConcept: 'concept-aerobic', targetConcept: 'concept-cad', relationType: RelationType.DECREASES_RISK, weight: 0.75, confidence: 0.88 }),
  new ConceptRelation({ id: 'rel-051', sourceConcept: 'concept-resistance', targetConcept: 'concept-obesity', relationType: RelationType.DECREASES_RISK, weight: 0.62, confidence: 0.80 }),
  new ConceptRelation({ id: 'rel-052', sourceConcept: 'concept-resistance', targetConcept: 'concept-dm2', relationType: RelationType.DECREASES_RISK, weight: 0.60, confidence: 0.80 }),

  // ── Contraindications ────────────────────────────────────────────────────────
  new ConceptRelation({ id: 'rel-053', sourceConcept: 'concept-metformin', targetConcept: 'concept-ckd', relationType: RelationType.CONTRAINDICATES, weight: 0.80, confidence: 0.90 }),
];
