import type { LegacyHub } from './taxonomyTypes.ts'

export const legacyHubs: LegacyHub[] = [
  {
    id: "anat-neck",
    title: "Cou : pharynx, larynx et r\u00e9gion thyro\u00efdienne",
    subject: "Anatomie",
    module: "T\u00eate et cou",
    childrenIds: ["anat-pharynx-esophagus-cervical", "anat-larynx-trachea-thyroid"],
    reason: "Scind\u00e9 en deux chapitres d\u00e9di\u00e9s (Pharynx/\u0153sophage et Larynx/trach\u00e9e/thyro\u00efde) pour une meilleure clart\u00e9 topographique."
  },
  {
    id: "organelles",
    title: "La cellule : organites et trafic des prot\u00e9ines",
    subject: "Biologie cellulaire",
    module: "Organites",
    childrenIds: ["cell-membrane-trafficking", "cell-mitochondria-peroxisomes", "cell-nucleus-ribosomes"],
    reason: "Scind\u00e9 en trois unit\u00e9s d'apprentissage cibl\u00e9es (Membrane/trafic, Mitochondries/peroxysomes, Noyau/ribosomes)."
  },
  {
    id: "cell-cycle",
    title: "Cycle cellulaire et mitose",
    subject: "Biologie cellulaire",
    module: "Cycle cellulaire",
    childrenIds: ["cell-cycle-phases-control", "cell-mitosis-cytokinesis"],
    reason: "Scind\u00e9 en phases et points de contr\u00f4le d'une part, et dynamique mitotique de l'autre."
  },
  {
    id: "cell-junctions",
    title: "Cytosquelette, jonctions et signalisation",
    subject: "Biologie cellulaire",
    module: "Architecture cellulaire",
    childrenIds: ["cell-cytoskeleton-motors", "cell-junctions-adhesion", "cell-signaling-pathways"],
    reason: "Scind\u00e9 en cytosquelette/moteurs, jonctions/adh\u00e9rence et signalisation intracellulaire."
  },
  {
    id: "histo-epithelia",
    title: "\u00c9pith\u00e9liums et tissus conjonctifs",
    subject: "Histologie",
    module: "Tissus fondamentaux",
    childrenIds: ["histo-epithelia-covering", "histo-connective-tissues"],
    reason: "Scind\u00e9 en \u00e9pith\u00e9liums de rev\u00eatement d'une part et tissus conjonctifs de l'autre."
  },
  {
    id: "embryo-development",
    title: "D\u00e9veloppement embryonnaire pr\u00e9coce",
    subject: "Embryologie & Reproduction",
    module: "D\u00e9veloppement pr\u00e9coce",
    childrenIds: ["embryo-early-cleavage-blastocyst", "embryo-gastrulation-germ-layers"],
    reason: "Scind\u00e9 en premi\u00e8re semaine (segmentation/blastocyste) et troisi\u00e8me semaine (gastrulation)."
  },
  {
    id: "gene-expression",
    title: "De l\u2019ADN \u00e0 la prot\u00e9ine",
    subject: "G\u00e9n\u00e9tique & Biologie mol\u00e9culaire",
    module: "Expression g\u00e9nique",
    childrenIds: ["genetics-transcription-rna", "genetics-translation-code"],
    reason: "Scind\u00e9 en transcription des ARN et traduction ribosomale."
  },
  {
    id: "genetics-inheritance",
    title: "M\u00e9iose et h\u00e9r\u00e9dit\u00e9",
    subject: "G\u00e9n\u00e9tique & Biologie mol\u00e9culaire",
    module: "Transmission g\u00e9n\u00e9tique",
    childrenIds: ["genetics-meiosis-recombination", "genetics-mendelian-inheritance"],
    reason: "Scind\u00e9 en m\u00e9iose/recombinaison chromosomique et g\u00e9n\u00e9tique formelle mend\u00e9lienne."
  },
  {
    id: "metabolism",
    title: "Enzymes, ATP et m\u00e9tabolisme",
    subject: "Biochimie",
    module: "Bio\u00e9nerg\u00e9tique & Enzymes",
    childrenIds: ["biochem-enzymes-kinetics", "biochem-atp-energy-coupling"],
    reason: "Scind\u00e9 en cin\u00e9tique enzymatique micha\u00e9lienne et couplage bio\u00e9nerg\u00e9tique par l'ATP."
  },
  {
    id: "biochem-proteins",
    title: "Acides amin\u00e9s, prot\u00e9ines et enzymes",
    subject: "Biochimie",
    module: "Prot\u00e9ines",
    childrenIds: ["biochem-amino-acids-properties", "biochem-protein-structure-folding"],
    reason: "Scind\u00e9 en propri\u00e9t\u00e9s physico-chimiques des acides amin\u00e9s et repliement spatial des prot\u00e9ines."
  },
  {
    id: "biochem-fuels",
    title: "Glucides et lipides",
    subject: "Biochimie",
    module: "Macromol\u00e9cules \u00e9nerg\u00e9tiques",
    childrenIds: ["biochem-carbohydrate-structure", "biochem-lipid-structure-transport"],
    reason: "Scind\u00e9 en structure des glucides et structure/transport des lipides."
  },
  {
    id: "chem-solutions",
    title: "Atomes, liaisons et concentrations",
    subject: "Chimie",
    module: "Structure de la mati\u00e8re",
    childrenIds: ["chem-atomic-structure-periodicity", "chem-chemical-bonds-geometry", "chem-solutions-concentrations"],
    reason: "Scind\u00e9 en structure atomique/p\u00e9riodicit\u00e9, liaisons chimiques/VSEPR et calculs de concentrations."
  },
  {
    id: "chem-acid-base",
    title: "Acides, bases et tampons",
    subject: "Chimie",
    module: "Solutions & \u00c9quilibres",
    childrenIds: ["chem-acid-base-equilibria", "chem-buffers-titration"],
    reason: "Scind\u00e9 en \u00e9quilibres acido-basiques/pH et solutions tampons/titrages."
  },
  {
    id: "chem-redox-organic",
    title: "Oxydor\u00e9duction et fonctions organiques",
    subject: "Chimie",
    module: "R\u00e9activit\u00e9 & Fonctions",
    childrenIds: ["chem-redox-potentials", "chem-organic-functions-isomery"],
    reason: "Scind\u00e9 en r\u00e9actions d'oxydor\u00e9duction/Nernst et grandes fonctions organiques/isom\u00e9rie."
  },
  {
    id: "physics-imaging",
    title: "Ondes et imagerie",
    subject: "Biophysique",
    module: "Ondes & Imagerie",
    childrenIds: ["physics-em-waves-xray", "physics-mri-ultrasound-principles"],
    reason: "Scind\u00e9 en ondes \u00e9lectromagn\u00e9tiques/rayons X et principes physiques de l'IRM/\u00e9chographie."
  },
  {
    id: "neuronal-signal",
    title: "Potentiel d\u2019action et synapse",
    subject: "Physiologie",
    module: "Excitabilit\u00e9 neuromusculaire",
    childrenIds: ["phys-resting-action-potential", "phys-synaptic-transmission"],
    reason: "Scind\u00e9 en potentiel d'action neuronal et transmission synaptique."
  },
  {
    id: "muscle-contraction",
    title: "Contraction musculaire",
    subject: "Physiologie",
    module: "Excitabilit\u00e9 neuromusculaire",
    childrenIds: ["phys-neuromuscular-junction", "phys-skeletal-muscle-contraction"],
    reason: "Scind\u00e9 en jonction neuromusculaire et glissement mol\u00e9culaire des myofilaments."
  },
  {
    id: "blood",
    title: "Le sang : plasma et \u00e9l\u00e9ments figur\u00e9s",
    subject: "Physiologie",
    module: "H\u00e9matologie",
    childrenIds: ["phys-blood-plasma-erythrocytes", "phys-hemostasis-coagulation"],
    reason: "Scind\u00e9 en physiologie \u00e9rythrocytaire et cascade de l'h\u00e9mostase/coagulation."
  },
  {
    id: "hemodynamics",
    title: "D\u00e9bit, pression et r\u00e9sistance",
    subject: "Physiologie",
    module: "Syst\u00e8me cardiovasculaire",
    childrenIds: ["physics-fluid-mechanics-hemodynamics", "phys-cardiovascular-hemodynamics-regulation"],
    reason: "Scind\u00e9 en m\u00e9canique des fluides physique et r\u00e9gulation h\u00e9modynamique syst\u00e9mique."
  },
  {
    id: "ventilation",
    title: "Ventilation et \u00e9changes respiratoires",
    subject: "Physiologie",
    module: "Syst\u00e8me respiratoire",
    childrenIds: ["phys-pulmonary-mechanics-volumes", "phys-respiratory-regulation"],
    reason: "Scind\u00e9 en m\u00e9canique ventilatoire/volumes et r\u00e9gulation centrale de la respiration."
  },
  {
    id: "fluid-balance",
    title: "Compartiments hydriques",
    subject: "Physiologie",
    module: "Milieu int\u00e9rieur",
    childrenIds: ["phys-body-fluid-compartments", "phys-water-electrolyte-balance"],
    reason: "Scind\u00e9 en compartiments hydriques corporels et r\u00e9gulation hydrosod\u00e9e r\u00e9nale."
  },
  {
    id: "endocrine",
    title: "Hormones, r\u00e9cepteurs et r\u00e9trocontr\u00f4les",
    subject: "Physiologie",
    module: "Syst\u00e8me endocrinien",
    childrenIds: ["phys-endocrine-hypothalamus-pituitary", "phys-thyroid-adrenal-regulation"],
    reason: "Scind\u00e9 en axe hypothalamo-hypophysaire et r\u00e9gulations hormonales p\u00e9riph\u00e9riques."
  },
  {
    id: "immunity",
    title: "Immunit\u00e9 inn\u00e9e et adaptative",
    subject: "Immunologie",
    module: "R\u00e9ponse immunitaire",
    childrenIds: ["immuno-innate-mechanisms", "immuno-adaptive-lymphocytes"],
    reason: "Scind\u00e9 en m\u00e9canismes de l'immunit\u00e9 inn\u00e9e et s\u00e9lection/diff\u00e9renciation adaptative."
  },
  {
    id: "stats-foundations",
    title: "Biostatistiques et probabilit\u00e9s",
    subject: "Biostatistiques",
    module: "Fondamentaux statistiques",
    childrenIds: ["stats-descriptive-distributions", "stats-probability-laws"],
    reason: "Scind\u00e9 en statistique descriptive/param\u00e8tres et lois de probabilit\u00e9."
  },
  {
    id: "pharma-adme",
    title: "Devenir du m\u00e9dicament dans l'organisme",
    subject: "Pharmacologie",
    module: "Pharmacocin\u00e9tique",
    childrenIds: ["pharma-absorption-distribution", "pharma-metabolism-elimination"],
    reason: "Scind\u00e9 en absorption/distribution corporelle et m\u00e9tabolisme h\u00e9patique/\u00e9limination."
  },
  {
    id: "public-health",
    title: "Sant\u00e9 publique et pr\u00e9vention",
    subject: "Sant\u00e9 publique",
    module: "Sant\u00e9 publique g\u00e9n\u00e9rale",
    childrenIds: ["public-health-indicators", "public-healthcare-organization"],
    reason: "Scind\u00e9 en indicateurs/d\u00e9terminants de sant\u00e9 et organisation du syst\u00e8me de soins."
  },
]

export function getLegacyHub(id: string): LegacyHub | undefined {
  return legacyHubs.find(h => h.id === id)
}

export function isLegacyHub(id: string): boolean {
  return legacyHubs.some(h => h.id === id)
}

export function findHubForChild(childId: string): LegacyHub | undefined {
  return legacyHubs.find(h => h.childrenIds.includes(childId))
}

export function expandCourseIdsForProvenance(id: string): string[] {
  const hub = legacyHubs.find(h => h.id === id)
  if (hub) {
    return [hub.id, ...hub.childrenIds]
  }
  const parent = legacyHubs.find(h => h.childrenIds.includes(id))
  if (parent) {
    return [id, parent.id]
  }
  return [id]
}
