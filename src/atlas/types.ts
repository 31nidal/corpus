export type AtlasId = 'brain' | 'heart' | 'body3d'

export type AtlasMode = 'explore' | 'learn' | 'test' | 'clinical' | 'pathway' | 'neuro'

export interface AtlasStructure {
  id: string
  name: string
  latinName?: string
  category: string
  system?: string
  viewId: string // Which view/plane contains this structure primarily
  coordinates: { x: number; y: number } // Percentage or SVG coordinate
  svgSelector?: string // ID or class of the SVG element
  description: string
  location?: string
  anatomicalRelations?: string
  vascularization?: string
  innervation?: string
  function?: string
  clinicalPearl?: string
  examHighYield?: string
  relatedCourseId?: string
  relatedCourseTitle?: string
  relatedStructures?: string[] // IDs of linked structures
}

export interface AtlasView {
  id: string
  name: string
  shortName: string
  description: string
  structures: AtlasStructure[]
}

export interface PathwayStep {
  index: number
  title: string
  structureId: string
  viewId: string
  description: string
  clinicalNote?: string
  physiologicalRole?: string
}

export interface AtlasPathway {
  id: string
  name: string
  shortDescription: string
  category: string
  steps: PathwayStep[]
}

export interface ClinicalScenario {
  id: string
  title: string
  subtitle: string
  badge: string
  severity: 'high' | 'medium' | 'critical'
  vignette: string
  affectedStructureIds: string[]
  primaryViewId: string
  pathophysiology: string
  clinicalSigns: string[]
  ecgOrImagingFindings?: string
  managementKey: string
  quizQuestion?: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }
}

export interface NeuroFunctionalDomain {
  id: string
  name: string
  icon: string
  description: string
  associatedStructureIds: string[]
  primaryViewId: string
  circuits: {
    name: string
    mechanism: string
    pathologies: string
  }[]
}

export interface AtlasQuizQuestion {
  id: string
  type: 'identify' | 'mcq'
  viewId: string
  targetStructureId?: string
  prompt: string
  options?: string[]
  correctOptionIndex?: number
  explanation: string
  hint?: string
}

export interface AtlasDefinition {
  id: AtlasId
  title: string
  subtitle: string
  category: string
  description: string
  iconName: string
  defaultViewId: string
  views: AtlasView[]
  pathways: AtlasPathway[]
  clinicalScenarios: ClinicalScenario[]
  neuroDomains?: NeuroFunctionalDomain[]
  quizQuestions: AtlasQuizQuestion[]
  modes: AtlasMode[]
}
