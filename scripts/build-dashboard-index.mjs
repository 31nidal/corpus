import {writeFileSync} from 'node:fs'
import {courses} from '../src/study/curriculum.ts'
import {questions} from '../src/study/questions.ts'
writeFileSync(new URL('../src/dashboard/catalog.json',import.meta.url),JSON.stringify({courses:courses.map(({id,title,category})=>({id,title,subject:category})),questions:questions.map(({id,course})=>({id,course}))}))
writeFileSync(new URL('../src/study/courseIndex.json',import.meta.url),JSON.stringify(courses.map(({id,title,category,structure,sections})=>({id,title,category,structure,sections:sections.map(({title})=>({title}))}))))
console.log(`Dashboard index: ${courses.length} chapters, ${questions.length} question identities.`)
