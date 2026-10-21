import {V1_POLICY} from '../shared/v1-policy.mjs'
import {readFileSync} from 'node:fs'
import {TERMS_VERSION} from '../shared/legal.mjs'
const pages=['mentions-legales','confidentialite','cgu','cookies','propriete-intellectuelle']
const pending=pages.filter(name=>/\[À (?:COMPLÉTER|VALIDER)|Document préparatoire/.test(readFileSync(`public/${name}.html`,'utf8')))
const geminiSelected=V1_POLICY.externalGeneration&&process.env.AI_GENERATION_PROVIDER!=='local'&&Boolean(process.env.GEMINI_API_KEY||process.env.AI_GENERATION_PROVIDER==='gemini')
if(geminiSelected){console.error('Publication bloquée : Gemini sélectionné, public mineur autorisé, compatibilité contractuelle non établie. Aucun secret affiché.');process.exitCode=1}
if(pending.length||TERMS_VERSION.includes('draft')){
 console.error('Publication bloquée : documents non finalisés : '+pending.join(', '));process.exitCode=1
}else if(!geminiSelected) console.log('Champs préparatoires absents ; ce contrôle ne remplace pas la validation des faits et contrats.')
