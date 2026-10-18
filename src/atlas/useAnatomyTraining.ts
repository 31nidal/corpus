import { useEffect, useState } from 'react'
import type { Manifest, Structure } from '../types'
import { translateAnatomyName } from '../data/anatomy'
import { acceptsAnatomicalAnswer, eligibleAnatomyTargets, makeAnatomyQuestions, readAnatomyProgress } from './anatomyLearning'
import type { AnatomyExerciseMode, AnatomyQuestion, AnatomyAnswer, AnatomyQuizAttempt } from './anatomyLearning'

type Storage = { getItem: (key:string)=>string|null; setItem:(key:string,value:string)=>void }
type Session = { id:string; revision:string; mode:AnatomyExerciseMode; questions:AnatomyQuestion[]; index:number; answers:AnatomyAnswer[]; started:number; duration:number|null }
const progressKey = 'corpus-anatomy-progress-v1'
export function useAnatomyTraining(manifest: Manifest | null, storage: Storage) {
  const [session, setSession] = useState<Session|null>(null)
  const [history, setHistory] = useState<AnatomyQuizAttempt[]>(() => { try { return readAnatomyProgress(storage.getItem(progressKey)).attempts } catch { return [] } })
  const [saveError,setSaveError] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => { setSession(null) }, [manifest])
  const question = session?.questions[session.index]
  const answer = session?.answers[session.index]
  const done = Boolean(session && session.index >= session.questions.length)
  const remaining = session?.duration === null || !session ? null : Math.max(0, session.duration - Math.floor((now-session.started)/1000))
  useEffect(() => {
    if (!session || done || session.duration === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session?.id, done])
  useEffect(() => {
    if (remaining !== 0 || !session || done) return
    setSession(current => current ? {...current, index:current.questions.length, answers:current.questions.map((q,i)=>current.answers[i] ?? {structureId:q.id,given:'Temps écoulé',correct:false})} : current)
  }, [remaining, session, done])
  useEffect(() => {
    if (!session || !done) return
    const attempt: AnatomyQuizAttempt = {id:session.id,revision:session.revision,mode:session.mode,startedAt:new Date(session.started).toISOString(),completedAt:new Date().toISOString(),answers:session.answers,durationSeconds:Math.min(864000,Math.max(0,Math.floor((Date.now()-session.started)/1000)))}
    try {
      const previous = readAnatomyProgress(storage.getItem(progressKey))
      const attempts = [...previous.attempts.filter(a=>a.id!==attempt.id),attempt].slice(-100)
      storage.setItem(progressKey,JSON.stringify({version:1,attempts})); setHistory(attempts);setSaveError('')
    } catch { setSaveError('La progression n’a pas pu être enregistrée. Le résultat reste affiché pour cette session.') }
  }, [done, session?.id])
  const start = (scope: Structure[], mode: AnatomyExerciseMode, timed: boolean) => {
    if (!manifest?.atlasRevision) return
    const questions = makeAnatomyQuestions(eligibleAnatomyTargets(scope,mode,s=>translateAnatomyName(s.name)??s.name), s => translateAnatomyName(s.name) ?? s.name)
    if (!questions.length) return
    const started = Date.now();setNow(started);setSaveError('')
    setSession({id:crypto.randomUUID(),revision:manifest.atlasRevision,mode,questions,index:0,answers:[],started,duration:timed?questions.length*30:null})
  }
  const submit = (given: string, pickedId?: string) => {
    setSession(current => {
      if (!current || current.answers[current.index] || !current.questions[current.index]) return current
      const question = current.questions[current.index]
      const correct = pickedId !== undefined ? pickedId === question.id : acceptsAnatomicalAnswer(question,given)
      return {...current,answers:[...current.answers,{structureId:question.id,given:given.slice(0,200),correct}]}
    })
  }
  return {session,question,answer,done,remaining,history,saveError,start,submit,
    pick:(id:string)=> { if(session?.mode === 'click' && !done) submit(translateAnatomyName(manifest?.structures.find(s=>s.id===id)?.name ?? id) ?? id,id) },
    next:()=>setSession(current=>current && current.answers[current.index] ? {...current,index:current.index+1}:current),
    stop:()=>setSession(null),
    retryErrors:()=> { if (!session || !manifest) return; const ids = new Set(session.answers.filter(a=>!a.correct).map(a=>a.structureId)); start(manifest.structures.filter(s=>ids.has(s.id)),session.mode,false) },
  }
}
export type AnatomyTraining = ReturnType<typeof useAnatomyTraining>
