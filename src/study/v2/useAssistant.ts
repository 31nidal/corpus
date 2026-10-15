import {useEffect, useState} from 'react'
import {getConversation, listConversations, type AssistantThread, type AssistantThreadHeader} from './assistantApi'
export function useAssistant(documentId: string) {
  const [threads, setThreads] = useState<AssistantThreadHeader[]>([]), [thread, setThread] = useState<AssistantThread | null>(null)
  const [id, setId] = useState<string | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    listConversations(documentId, controller.signal).then(({threads}) => {
      if (!controller.signal.aborted) {setThreads(threads); setId(value => value || threads[0]?.id || null); setError(''); setLoading(false)}
    }).catch(problem => {if (!controller.signal.aborted) {setError(problem.message); setLoading(false)}})
    return () => controller.abort()
  }, [documentId, revision])
  useEffect(() => {
    if (!id) {setThread(null); return}
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const {thread} = await getConversation(documentId, id!, controller.signal)
        if (controller.signal.aborted) return
        setThread(thread); setError('')
        if (thread.messages.some(message => ['queued', 'running'].includes(message.state))) timer = setTimeout(load, 2000)
      } catch (problem) {if (!controller.signal.aborted) setError((problem as Error).message)}
    }
    void load()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [documentId, id, revision])
  function choose(value: string | null) {setThread(null); setId(value)}
  return {threads, thread, error, loading, choose, reload: () => setRevision(value => value + 1),
    created: (thread: AssistantThread) => {setThread(thread); setId(thread.id); setRevision(value => value + 1)}}
}
