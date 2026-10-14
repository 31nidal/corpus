import {useEffect, useRef, useState} from 'react'
import type {QuestionSet, QuestionSetHeader, TrainingHeader} from './questionTypes'
import {getQuestionSet, listQuestionSets, listTraining} from './questionApi'

export function useQuestionSets(documentId: string) {
  const [sets, setSets] = useState<QuestionSetHeader[]>([]), [history, setHistory] = useState<TrainingHeader[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null), [selected, setSelected] = useState<QuestionSet | null>(null)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    async function load() {
      try {
        const [{sets}, {attempts}] = await Promise.all([listQuestionSets(documentId, controller.signal), listTraining(documentId, controller.signal)])
        if (controller.signal.aborted) return
        setSets(sets); setHistory(attempts); setError('')
        if (!selectedRef.current && sets.length) setSelectedId(sets[0].id)
      } catch (problem) {if (!controller.signal.aborted) setError((problem as Error).message)}
      finally {if (!controller.signal.aborted) setLoading(false)}
    }
    void load()
    return () => controller.abort()
  }, [documentId, revision])
  useEffect(() => {
    if (!selectedId) {setSelected(null); return}
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const {set} = await getQuestionSet(documentId, selectedId!, controller.signal)
        if (controller.signal.aborted) return
        setSelected(set); setError('')
        if (set.jobs.some(job => ['queued', 'running'].includes(job.state))) timer = setTimeout(load, 2000)
      } catch (problem) {if (!controller.signal.aborted) setError((problem as Error).message)}
    }
    void load()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [documentId, selectedId, revision])
  function choose(id: string) {if (id !== selectedId) {setSelected(null); setSelectedId(id)}}
  return {sets, history, selected, loading, error, choose, setSelected,
    reload: () => setRevision(value => value + 1), created: (set: QuestionSet) => {setSelected(set); setSelectedId(set.id); setRevision(value => value + 1)}}
}
