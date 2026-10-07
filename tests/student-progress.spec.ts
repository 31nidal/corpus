import {test,expect} from '@playwright/test'
import {summarize,buildDailySession,type Catalog} from '../src/dashboard/progress'
import {nextReview} from '../src/study/reviewSchedule'
import catalog from '../src/dashboard/catalog.json' with {type:'json'}
import courseIndex from '../src/study/courseIndex.json' with {type:'json'}
import {courses} from '../src/study/curriculum'
import {questions} from '../src/study/questions'
import {examBreakdown,restoreExam,serializeExam,type Session} from '../src/study/examSession'
import {questionView} from '../src/study/questionView'
const now=Date.UTC(2026,9,7,12)
const fixture:Catalog={courses:[{id:'a',title:'Chapitre A',subject:'Matière'},{id:'b',title:'Chapitre B',subject:'Matière'}],questions:[{id:'q1',course:'a'},{id:'q2',course:'a'},{id:'q3',course:'b'}]}
test('index dashboard : IDs et métadonnées correspondent au catalogue existant',()=>{
 expect(catalog.courses).toEqual(courses.map(({id,title,category})=>({id,title,subject:category})))
 expect(courseIndex).toEqual(courses.map(({id,title,category,structure,sections})=>({id,title,category,structure,sections:sections.map(({title})=>({title}))})))
 expect(catalog.questions).toEqual(questions.map(({id,course})=>({id,course})))
})
test('maîtrise : aucune observation donne aucun score et aucune session inventée',()=>{
 const s=summarize(fixture,{}, {},[],now)
 expect(s.subjects[0].score).toBeNull();expect(s.chapters[0].score).toBeNull();expect(buildDailySession(s,0)).toEqual([])
})
test('maîtrise : score par observation unique, pas moyenne opaque des chapitres',()=>{
 const s=summarize(fixture,{q1:nextReview(undefined,true,now),q2:nextReview(undefined,true,now),q3:nextReview(undefined,false,now)}, {},[],now)
 expect(s.chapters[0].score).toBe(100);expect(s.chapters[1].score).toBe(0);expect(s.subjects[0].score).toBe(67)
})
test('maîtrise : erreur récente baisse le score ; historique expiré ne crée pas de maîtrise',()=>{
 const old=nextReview(undefined,true,now-31*86400000)
 const s=summarize(fixture,{q1:old,q2:nextReview(undefined,false,now)}, {},[],now)
 expect(s.chapters[0].score).toBe(0);expect(s.chapters[0].observed).toBe(1)
})
test('carnet : regroupement, tentatives et disparition des erreurs après réussite existante',()=>{
 const r=nextReview(undefined,false,now-86400000)
 let s=summarize(fixture,{q1:r,q2:r}, {},[],now)
 expect(s.chapters[0].errors).toBe(2);expect(s.chapters[0].attempts).toBe(2);expect(s.errorsDue).toBe(2)
 s=summarize(fixture,{q1:nextReview(r,true,now),q2:r}, {},[],now)
 expect(s.chapters[0].errors).toBe(1);expect(s.chapters[0].attempts).toBe(3);expect(s.chapters[0].correct).toBe(1)
})
test('session du jour : FSRS puis erreurs puis faiblesse puis lecture réelle',()=>{
 const s=summarize(fixture,{q1:nextReview(undefined,false,now-86400000)}, {b:{percent:62,updatedAt:now}},[],now)
 expect(buildDailySession(s,23).map(step=>step.kind)).toEqual(['flashcards','errors','quiz','course'])
 expect(s.started[0].reading!.percent).toBe(62)
 expect(buildDailySession(s,0)[0].count).toBe(1)
})
test('session : QCM dus sans erreur ; cours terminés exclus ; progression du jour exacte',()=>{
 const r=nextReview(undefined,true,now-2*86400000)
 const s=summarize(fixture,{q1:r,q2:nextReview(undefined,true,now)},{a:{percent:100,updatedAt:now}},['a'],now)
 expect(s.due).toBe(1);expect(s.reviewedToday).toBe(1);expect(s.started).toHaveLength(0);expect(buildDailySession(s,0)[0].kind).toBe('quiz')
})
test('examen : restauration des réponses et ordre, scoring du bilan et rejet des IDs invalides',()=>{
 const q=questions[0],item=questionView(q,'test-exam')
 const s:Session={items:[item],seed:'test-exam',index:0,answers:{[q.id]:item.correct},validated:[],done:false,mode:'exam',started:now,seconds:75}
 const restored=restoreExam(serializeExam(s),questions)!
 expect(restored.items[0]).toEqual(item);expect(restored.answers).toEqual(s.answers)
 const result=examBreakdown(restored.items,restored.answers,{[q.course]:'Chapitre'})
 expect(result.subjects[0].correct).toBe(1);expect(result.chapters[0].name).toBe('Chapitre')
 expect(restoreExam(JSON.stringify({...JSON.parse(serializeExam(s)),ids:['invalid-id']}),questions)).toBeNull()
 expect(restoreExam('{"mode":"exam"}',questions)).toBeNull()
})
