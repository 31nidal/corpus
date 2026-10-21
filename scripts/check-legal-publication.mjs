import {readFileSync} from 'node:fs'
import {TERMS_VERSION} from '../shared/legal.mjs'
const pages=['mentions-legales','confidentialite','cgu','cookies','propriete-intellectuelle']
const pending=pages.filter(name=>/\[À (?:COMPLÉTER|VALIDER)|Document préparatoire/.test(readFileSync(`public/${name}.html`,'utf8')))
const review=JSON.parse(readFileSync('docs/legal/publication-status.json','utf8'))
const unresolved=Object.entries(review).filter(([,entry])=>entry.status!=='verified'||!entry.evidence?.trim()).map(([name])=>name)
if(pending.length||TERMS_VERSION.includes('draft')||unresolved.length){
 console.error('Publication bloquée. Documents préparatoires : '+pending.join(', '))
 console.error('Vérifications factuelles/contractuelles non résolues : '+unresolved.join(', '))
 process.exitCode=1
}else console.log('Contrôles documentaires satisfaits ; les justificatifs doivent correspondre à la production avant publication.')
