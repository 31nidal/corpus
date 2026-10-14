import {useEffect, useRef, type KeyboardEvent} from 'react'
export function useOcclusionDialog(onCancel: () => void, saving: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => previous?.focus()
  }, [])
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !saving) {event.preventDefault(); event.stopPropagation(); onCancel(); return}
    if (event.key !== 'Tab') return
    const nodes = [...ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')]
    const first = nodes[0], last = nodes.at(-1)
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus()}
  }
  return {ref, keyDown}
}
