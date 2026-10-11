import './printCourse.css'

export async function printCourse(article: HTMLElement, title: string) {
  document.getElementById('course-print-document')?.remove()
  const previousTitle = document.title
  const copy = article.cloneNode(true) as HTMLElement
  copy.id = 'course-print-document'
  copy.className = 'course-print-document'
  if(!copy.querySelector('h1')){const heading=document.createElement('h1');heading.textContent=title;copy.prepend(heading)}
  copy.querySelectorAll('button,textarea,input,.course-document-actions,.course-feedback-panel,.course-notebook,.course-completion,.next-chapter,.reading-progress,.diagram-header-controls,.diagram-pan-hint,.diagram-navigation,.diagram-view-controls,.medical-toolbar,.medical-scroll-bar-hint').forEach(node => node.remove())
  copy.querySelectorAll('details').forEach(node => {node.open = true})
  document.body.append(copy)
  document.body.dataset.coursePrint = 'true'
  document.title = `MyCorpus — ${title}`
  let timer: ReturnType<typeof setTimeout>
  const cleanup = () => {
    clearTimeout(timer)
    copy.remove()
    delete document.body.dataset.coursePrint
    document.title = previousTitle
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup, {once: true})
  timer = setTimeout(cleanup, 300000)
  try {
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))])
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    window.print()
  } catch (error) {cleanup(); throw error}
}
