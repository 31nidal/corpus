import { useState } from 'react'
import type { AtlasDefinition, AtlasQuizQuestion, AtlasStructure } from './types'
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw, Trophy, Sparkles, BookOpen } from 'lucide-react'

interface Props {
  atlas: AtlasDefinition
  onSelectStructure: (structure: AtlasStructure) => void
  onNavigateCourse?: (courseId: string) => void
}

export default function AtlasQuizMode({
  atlas,
  onSelectStructure,
  onNavigateCourse,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [answersHistory, setAnswersHistory] = useState<
    Array<{ questionId: string; selectedIndex: number; correct: boolean }>
  >([])

  const questions: AtlasQuizQuestion[] = atlas.quizQuestions || []
  const currentQuestion: AtlasQuizQuestion | undefined = questions[currentIndex]

  if (!questions || questions.length === 0 || !currentQuestion) {
    return (
      <div className="atlas-quiz-empty">
        <HelpCircle size={40} className="atlas-quiz-empty-icon" />
        <h3>Aucun quiz disponible</h3>
        <p>Les questions de révision pour cet atlas seront bientôt disponibles.</p>
      </div>
    )
  }

  const allStructures = atlas.views.flatMap((v) => v.structures)

  const handleSelectOption = (index: number) => {
    if (isAnswered) return
    setSelectedOptionIndex(index)
    setIsAnswered(true)

    const correctIndex = currentQuestion.correctOptionIndex ?? 0
    const isCorrect = index === correctIndex
    if (isCorrect) {
      setScore((s) => s + 1)
    }

    setAnswersHistory((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedIndex: index,
        correct: isCorrect,
      },
    ])

    // Highlight target structure on diagram if defined
    if (currentQuestion.targetStructureId) {
      const targetStructure = allStructures.find((s) => s.id === currentQuestion.targetStructureId)
      if (targetStructure) {
        onSelectStructure(targetStructure)
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((idx) => idx + 1)
      setSelectedOptionIndex(null)
      setIsAnswered(false)
    } else {
      setShowSummary(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOptionIndex(null)
    setIsAnswered(false)
    setScore(0)
    setShowSummary(false)
    setAnswersHistory([])
  }

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="atlas-quiz-summary" data-testid="atlas-quiz-summary">
        <div className="atlas-quiz-summary-header">
          <div className="atlas-quiz-trophy-badge">
            <Trophy size={48} className="atlas-trophy-icon" />
          </div>
          <h2>Quiz Terminé !</h2>
          <p className="atlas-quiz-score-highlight">
            Score : <span className="score-val">{score}</span> / {questions.length} ({percentage}%)
          </p>
        </div>

        <div className="atlas-quiz-evaluation">
          {percentage >= 80 ? (
            <div className="eval-badge success">
              <Sparkles size={18} />
              <span>Excellente maîtrise neuro/cardio ! Prêt pour les examens.</span>
            </div>
          ) : percentage >= 50 ? (
            <div className="eval-badge warning">
              <HelpCircle size={18} />
              <span>Bonne base. Pensez à réviser les fiches cliniques associées.</span>
            </div>
          ) : (
            <div className="eval-badge alert">
              <RotateCcw size={18} />
              <span>Nécessite une révision approfondie des structures clés.</span>
            </div>
          )}
        </div>

        <div className="atlas-quiz-breakdown">
          <h4>Récapitulatif des questions :</h4>
          <div className="breakdown-list">
            {questions.map((q, idx) => {
              const hist = answersHistory.find((a) => a.questionId === q.id)
              const correct = hist?.correct ?? false
              return (
                <div key={q.id} className={`breakdown-item ${correct ? 'correct' : 'incorrect'}`}>
                  <span className="q-num">Q{idx + 1}</span>
                  <span className="q-text">{q.prompt}</span>
                  {correct ? (
                    <CheckCircle2 size={18} className="icon-correct" />
                  ) : (
                    <XCircle size={18} className="icon-incorrect" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="atlas-quiz-actions">
          <button className="atlas-btn-primary" onClick={handleRestart}>
            <RotateCcw size={16} />
            Recommencer le test
          </button>
          {onNavigateCourse && (
            <button
              className="atlas-btn-secondary"
              onClick={() => onNavigateCourse(atlas.id === 'brain' ? 'physio-neuro' : 'physio-cardio')}
            >
              <BookOpen size={16} />
              Consulter le cours associé
            </button>
          )}
        </div>
      </div>
    )
  }

  const correctIndex = currentQuestion.correctOptionIndex ?? 0
  const isCurrentCorrect = selectedOptionIndex === correctIndex
  const options = currentQuestion.options || ['Option A', 'Option B', 'Option C', 'Option D']

  return (
    <div className="atlas-quiz-panel" data-testid="atlas-quiz-panel">
      <div className="atlas-quiz-header">
        <div className="quiz-meta-row">
          <span className="quiz-progress-badge">
            Question {currentIndex + 1} / {questions.length}
          </span>
          <span className="quiz-score-badge">
            Score : {score} / {questions.length}
          </span>
        </div>
        <div className="quiz-progress-bar-track">
          <div
            className="quiz-progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="atlas-quiz-question-box">
        <h3 className="quiz-prompt">{currentQuestion.prompt}</h3>
      </div>

      <div className="atlas-quiz-options-list" role="group" aria-label="Options du quiz">
        {options.map((optionText, idx) => {
          let btnClass = 'atlas-quiz-option-btn'
          if (isAnswered) {
            if (idx === correctIndex) {
              btnClass += ' option-correct'
            } else if (idx === selectedOptionIndex) {
              btnClass += ' option-incorrect'
            }
          }

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-label">{optionText}</span>
              {isAnswered && idx === correctIndex && (
                <CheckCircle2 size={18} className="option-status-icon icon-correct" />
              )}
              {isAnswered && idx === selectedOptionIndex && idx !== correctIndex && (
                <XCircle size={18} className="option-status-icon icon-incorrect" />
              )}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div
          className={`atlas-quiz-feedback-box ${isCurrentCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}
        >
          <div className="feedback-header">
            {isCurrentCorrect ? (
              <>
                <CheckCircle2 size={20} className="icon-correct" />
                <strong>Bonne réponse !</strong>
              </>
            ) : (
              <>
                <XCircle size={20} className="icon-incorrect" />
                <strong>Réponse incorrecte</strong>
              </>
            )}
          </div>
          <p className="feedback-explanation">{currentQuestion.explanation}</p>
          <button className="atlas-btn-primary next-question-btn" onClick={handleNext}>
            {currentIndex < questions.length - 1 ? (
              <>
                Question suivante <ArrowRight size={16} />
              </>
            ) : (
              <>
                Voir les résultats <Trophy size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
