import {useEffect} from 'react'

/** Reserve the occupied viewport area of the existing mobile navigation. */
export function useNavigationInset(documentId?: string | null) {
  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>('.sv2-workspace')
    const navigation = document.querySelector<HTMLElement>('.mobile-study-nav')
    if (!workspace || !navigation) return
    const update = () => {
      const rect = navigation.getBoundingClientRect()
      const inset = rect.height > 0 ? Math.max(0, window.innerHeight - rect.top) : 0
      workspace.style.setProperty('--sv2-nav-inset', `${inset}px`)
    }
    const observer = new ResizeObserver(update)
    observer.observe(navigation)
    window.addEventListener('resize', update)
    update()
    return () => {observer.disconnect(); window.removeEventListener('resize', update)}
  }, [documentId])
}
