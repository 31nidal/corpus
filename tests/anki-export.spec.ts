import {test,expect} from '@playwright/test'
import {courses} from '../src/study/curriculum'
import {questions,type Question} from '../src/study/questions'
import {ankiFilename,buildAnkiCsv,parseReviewRecords,selectAnkiQuestions} from '../src/study/ankiExport'

function parseCsv(input:string){
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false
 for(let i=0;i<input.length;i++){const char=input[i];if(quoted){if(char==='"'&&input[i+1]==='"'){field+='"';i++}else if(char==='"')quoted=false;else field+=char}else if(char==='"')quoted=true;else if(char===','){row.push(field);field=''}else if(char==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=char}
 if(field||row.length){row.push(field);rows.push(row)}return rows
}

test('le CSV Anki est UTF-8, échappé, balisé et sans doublon',()=>{
 const course=courses.find(item=>item.id==='phys-cardiac-cycle')!
 const sample:Question={id:'stable-1',course:course.id,topic:'Biologie, cellulaire',prompt:'Que signifie "RER" ?\nRépondez précisément.',options:['Réticulum <rugueux>','Autre'],correct:[0],why:['Synthèse & maturation, avec ribosomes.','Non.'],difficulty:'essentiel'}
 const content=buildAnkiCsv(course,[sample,sample],new Date('2026-09-14T10:00:00Z'))
 expect(content.startsWith('\uFEFF#separator:Comma\r\n#html:true')).toBeTruthy()
 expect(content).toContain('#tags column:3')
 const rows=parseCsv(content.replace(/^\uFEFF(?:#[^\n]*\r?\n)+/,''))
 expect(rows).toHaveLength(2)
 expect(rows.every(row=>row.length===4)).toBeTruthy()
 expect(rows[1][0]).toContain('&quot;RER&quot; ?<br>')
 expect(rows[1][1]).toContain('&lt;rugueux&gt;')
 expect(rows[1][1]).toContain('Synthèse &amp; maturation')
 expect(rows[1][2]).toContain('niveau_1 mycorpus')
 expect(rows[1][3]).toBe('stable-1')
 expect(rows[0][1]).toContain('Contenu pédagogique — ne remplace pas les supports officiels de votre faculté.')
 expect(rows[1][1]).not.toContain('ne remplace pas les supports officiels')
})

test('les filtres utilisent les erreurs et difficultés enregistrées',()=>{
 const courseQuestions=questions.filter(question=>question.course==='phys-cardiac-cycle'),[wrong,difficult]=courseQuestions
 const records=parseReviewRecords(JSON.stringify({[wrong.id]:{seen:1,correct:0,wrong:true},[difficult.id]:{seen:4,correct:2,wrong:false}}),courseQuestions)
 expect(selectAnkiQuestions(courseQuestions,records,'errors').map(question=>question.id)).toEqual([wrong.id])
 expect(selectAnkiQuestions(courseQuestions,records,'difficult').map(question=>question.id)).toEqual([difficult.id])
 expect(ankiFilename(courses.find(course=>course.id==='phys-cardiac-cycle')!,'errors')).toMatch(/^mycorpus-mes-erreurs-physiologie-/)
})

for(const width of [1440,390])test(`L’export Anki est retiré des cours à ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:852})
 await page.goto('/#tab=cours&cours=phys-cardiac-cycle')
 await expect(page.getByRole('button',{name:'Exporter en PDF'})).toBeVisible()
 await expect(page.getByRole('button',{name:/Anki/})).toHaveCount(0)
})
