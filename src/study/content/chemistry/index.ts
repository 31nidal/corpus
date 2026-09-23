import { chemistryGeneralCourses, chemistryGeneralQuestions } from './general'
import { chemistryOrganicCourses, chemistryOrganicQuestions } from './organic'

export const chemistryCourses = [...chemistryGeneralCourses, ...chemistryOrganicCourses]
export const chemistryQuestions = [...chemistryGeneralQuestions, ...chemistryOrganicQuestions]
export const curatedChemistryCourseIds = new Set(chemistryQuestions.map(question => question.course))
export const chemistryCourseIds = new Set(chemistryCourses.map(course => course.id))
