/**
 * Wraps every capability of a ClinicalContext uniformly, so a section that has
 * no backing data source yet (ex: Genomics) is structurally identical to one
 * that does (ex: Vitals) — just with `available: false` and `items: []`.
 */
export interface CapabilitySection<T> {
  available: boolean;
  items: T[];
}
