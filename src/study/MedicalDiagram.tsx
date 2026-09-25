import AnnotatedDiagram from './AnnotatedDiagram'
import MedicalDrawingContent from './MedicalDrawings'
import {medicalPlates} from './medicalPlates'
export {medicalPlates} from './medicalPlates'

export default function MedicalDiagram({courseId}: {courseId: string}) {
  const plate = medicalPlates[courseId]
  if (!plate) return null

  return (
    <AnnotatedDiagram
      key={courseId}
      plate={plate}
      courseId={courseId}
      renderSvg={MedicalDrawingContent}
    />
  )
}
