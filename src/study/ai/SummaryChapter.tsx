import type {StudySummaryChapter} from '../myCoursesTypes'

export function SummaryChapter({chapter,index,paragraphs}:{chapter:StudySummaryChapter;index:number;paragraphs:boolean}) {
  const content=(items:string[])=>paragraphs
    ? items.map((text,i)=><p key={i}>{text}</p>)
    : <ul className="mycourses-summary-list">{items.map((text,i)=><li key={i}>{text}</li>)}</ul>
  return <article className="mycourses-summary-card">
    <h3><span>{index+1}. {chapter.title}</span><span>{chapter.pages}</span></h3>
    {chapter.categories?.length
      ? <div className="mycourses-summary-categories">{chapter.categories.map(category=><section key={category.id} className="mycourses-summary-category"><h4>{category.label}</h4>{content(category.items)}</section>)}</div>
      : content(chapter.keyPoints)}
  </article>
}
