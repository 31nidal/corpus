import { canonicalCourses } from './canonicalCourses.ts'
import type { CanonicalCourseMetadata } from './taxonomyTypes.ts'

export interface ToulouseUEDefinition {
  code: string
  name: string
  subjects: string[]
  description: string
}

export const TOULOUSE_UES: Record<string, ToulouseUEDefinition> = {
  UE1: {
    code: 'UE1',
    name: 'Chimie, Génome, Biochimie',
    subjects: ['Chimie', 'Génétique & Biologie moléculaire', 'Biochimie'],
    description: 'Atomes, liaisons, biomolécules, bioénergétique, génome et biologie moléculaire.',
  },
  UE2: {
    code: 'UE2',
    name: 'Biologie cellulaire, Histologie, Embryologie',
    subjects: ['Biologie cellulaire', 'Histologie', 'Embryologie & Reproduction', 'Immunologie'],
    description: 'Structure cellulaire, tissus fondamentaux, développement embryonnaire et bases immunitaires.',
  },
  UE3: {
    code: 'UE3',
    name: 'Biophysique & Physiologie',
    subjects: ['Biophysique', 'Physiologie'],
    description: 'États de la matière, rayonnements, imagerie, hémodynamique et grandes régulations physiologiques.',
  },
  UE4: {
    code: 'UE4',
    name: 'Biostatistiques & Épidémiologie quantitative',
    subjects: ['Biostatistiques'],
    description: 'Statistique descriptive, probabilités, tests d’hypothèse et évaluation diagnostique.',
  },
  UE5: {
    code: 'UE5',
    name: 'Anatomie générale & descriptive',
    subjects: ['Anatomie'],
    description: 'Appareil locomoteur, thorax, abdomen, pelvis, tête, cou et système nerveux central.',
  },
  UE6: {
    code: 'UE6',
    name: 'Initiation à la Connaissance du Médicament (ICM)',
    subjects: ['Pharmacologie'],
    description: 'Cibles moléculaires, pharmacocinétique ADME, pharmacodynamie et cycle de vie du médicament.',
  },
  UE7: {
    code: 'UE7',
    name: 'Santé Publique, Société, Humanité (SSH)',
    subjects: ['Santé publique', 'Santé, Société, Humanité'],
    description: 'Épidémiologie, prévention, organisation des soins, éthique médicale, droit et histoire de la médecine.',
  },
  UE8: {
    code: 'UE8',
    name: 'Médicament & Société / Spécifiques Filières',
    subjects: ['Médicament & Société', 'Odontologie'],
    description: 'Régulation économique du médicament, crises sanitaires, odontologie et enseignements de filière.',
  },
  'UE8/11': {
    code: 'UE8/11',
    name: 'Recherche biomédicale',
    subjects: ['Recherche biomédicale'],
    description: 'Méthodologie des essais cliniques, lecture critique d’articles (LCA), réglementation Jardé et méta-analyses.',
  },
  UE13: {
    code: 'UE13',
    name: 'Anglais médical',
    subjects: ['Anglais médical'],
    description: 'Vocabulaire anatomoclinique anglophone, analyse d’abstracts et communication médicale internationale.',
  },
}

export function getCoursesForToulouseUE(ueCode: string): CanonicalCourseMetadata[] {
  return canonicalCourses.filter(c => c.universityMappings.toulouse.ue === ueCode)
}

export function getToulouseMapping(courseId: string): { ue: string; topic: string } | undefined {
  const course = canonicalCourses.find(c => c.id === courseId)
  return course?.universityMappings.toulouse
}
