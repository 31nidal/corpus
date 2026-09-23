// Provenance expansion for flashcards source_course_id queries
// Ensures non-destructive backward compatibility with legacy course IDs and new split chapters.

export const LEGACY_HUBS_MAP = new Map([
  ["anat-neck", ["anat-pharynx-esophagus-cervical", "anat-larynx-trachea-thyroid"]],
  ["organelles", ["cell-membrane-trafficking", "cell-mitochondria-peroxisomes", "cell-nucleus-ribosomes"]],
  ["cell-cycle", ["cell-cycle-phases-control", "cell-mitosis-cytokinesis"]],
  ["cell-junctions", ["cell-cytoskeleton-motors", "cell-junctions-adhesion", "cell-signaling-pathways"]],
  ["histo-epithelia", ["histo-epithelia-covering", "histo-connective-tissues"]],
  ["embryo-development", ["embryo-early-cleavage-blastocyst", "embryo-gastrulation-germ-layers"]],
  ["gene-expression", ["genetics-transcription-rna", "genetics-translation-code"]],
  ["genetics-inheritance", ["genetics-meiosis-recombination", "genetics-mendelian-inheritance"]],
  ["metabolism", ["biochem-enzymes-kinetics", "biochem-atp-energy-coupling"]],
  ["biochem-proteins", ["biochem-amino-acids-properties", "biochem-protein-structure-folding"]],
  ["biochem-fuels", ["biochem-carbohydrate-structure", "biochem-lipid-structure-transport"]],
  ["chem-solutions", ["chem-atomic-structure-periodicity", "chem-chemical-bonds-geometry", "chem-solutions-concentrations"]],
  ["chem-acid-base", ["chem-acid-base-equilibria", "chem-buffers-titration"]],
  ["chem-redox-organic", ["chem-redox-potentials", "chem-organic-functions-isomery"]],
  ["physics-imaging", ["physics-em-waves-xray", "physics-mri-ultrasound-principles"]],
  ["neuronal-signal", ["phys-resting-action-potential", "phys-synaptic-transmission"]],
  ["muscle-contraction", ["phys-neuromuscular-junction", "phys-skeletal-muscle-contraction"]],
  ["blood", ["phys-blood-plasma-erythrocytes", "phys-hemostasis-coagulation"]],
  ["hemodynamics", ["physics-fluid-mechanics-hemodynamics", "phys-cardiovascular-hemodynamics-regulation"]],
  ["ventilation", ["phys-pulmonary-mechanics-volumes", "phys-respiratory-regulation"]],
  ["fluid-balance", ["phys-body-fluid-compartments", "phys-water-electrolyte-balance"]],
  ["endocrine", ["phys-endocrine-hypothalamus-pituitary", "phys-thyroid-adrenal-regulation"]],
  ["immunity", ["immuno-innate-mechanisms", "immuno-adaptive-lymphocytes"]],
  ["stats-foundations", ["stats-descriptive-distributions", "stats-probability-laws"]],
  ["pharma-adme", ["pharma-absorption-distribution", "pharma-metabolism-elimination"]],
  ["public-health", ["public-health-indicators", "public-healthcare-organization"]],
])

export const CHILD_TO_HUB_MAP = new Map()
for (const [hubId, children] of LEGACY_HUBS_MAP.entries()) {
  for (const childId of children) {
    CHILD_TO_HUB_MAP.set(childId, hubId)
  }
}

/**
 * Expands a courseId to include its legacy hub and/or split children for SQL provenance filtering.
 * @param {string|null|undefined} courseId
 * @returns {string[]}
 */
export function expandCourseIdsForProvenance(courseId) {
  if (!courseId || typeof courseId !== 'string') return []
  const trimmed = courseId.trim()
  if (!trimmed) return []

  // If courseId is a legacy hub, return [hubId, ...children]
  const children = LEGACY_HUBS_MAP.get(trimmed)
  if (children) {
    return [trimmed, ...children]
  }

  // If courseId is a child of a legacy hub, include the historical hub
  const parentHub = CHILD_TO_HUB_MAP.get(trimmed)
  if (parentHub) {
    return [trimmed, parentHub]
  }

  // Otherwise, standalone canonical or custom course
  return [trimmed]
}
