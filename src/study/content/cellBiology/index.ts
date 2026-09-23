import { membraneCourses, membraneQuestions } from './membranes'
import { architectureDivisionCourses, architectureDivisionQuestions } from './architectureDivision'

export const cellBiologyCourses = [...membraneCourses, ...architectureDivisionCourses]
export const cellBiologyQuestions = [...membraneQuestions, ...architectureDivisionQuestions]
export const cellBiologyQuestionCourseIds = new Set(cellBiologyQuestions.map(question => question.course))
