import { chemistryCourses, chemistryQuestions, curatedChemistryCourseIds } from './chemistry'
import { cellBiologyCourses, cellBiologyQuestions, cellBiologyQuestionCourseIds } from './cellBiology'
import { biochemistryCourses, biochemistryQuestions } from './biochemistry'
import { geneticsCourses, geneticsQuestions } from './genetics'
import { embryologyCourses, embryologyQuestions } from './embryology'
import { histologyCourses, histologyQuestions } from './histology'
import { biophysicsCourses, biophysicsQuestions } from './biophysics'
import { physiologyCourses, physiologyQuestions } from './physiology'
import { immunologyCourses, immunologyQuestions } from './immunology'
import { statisticsCourses, statisticsQuestions } from './statistics'
import { pharmacologyCourses, pharmacologyQuestions } from './pharmacology'
import { publicHealthCourses, publicHealthQuestions } from './publicHealth'
import { shsCourses, shsQuestions } from './shs'

export const authoredCanonicalCourses = [...chemistryCourses, ...cellBiologyCourses, ...biochemistryCourses, ...geneticsCourses, ...embryologyCourses, ...histologyCourses, ...biophysicsCourses, ...physiologyCourses, ...immunologyCourses, ...statisticsCourses, ...pharmacologyCourses, ...publicHealthCourses, ...shsCourses]
export const authoredCanonicalQuestions = [...chemistryQuestions, ...cellBiologyQuestions, ...biochemistryQuestions, ...geneticsQuestions, ...embryologyQuestions, ...histologyQuestions, ...biophysicsQuestions, ...physiologyQuestions, ...immunologyQuestions, ...statisticsQuestions, ...pharmacologyQuestions, ...publicHealthQuestions, ...shsQuestions]
export const authoredCanonicalCourseIds = new Set(authoredCanonicalCourses.map(course => course.id))
export const authoredQuestionCourseIds = new Set([...curatedChemistryCourseIds, ...cellBiologyQuestionCourseIds, ...biochemistryQuestions.map(question => question.course), ...geneticsQuestions.map(question => question.course), ...embryologyQuestions.map(question => question.course), ...histologyQuestions.map(question => question.course), ...biophysicsQuestions.map(question => question.course), ...physiologyQuestions.map(question => question.course), ...immunologyQuestions.map(question => question.course), ...statisticsQuestions.map(question => question.course), ...pharmacologyQuestions.map(question => question.course), ...publicHealthQuestions.map(question => question.course), ...shsQuestions.map(question => question.course)])
