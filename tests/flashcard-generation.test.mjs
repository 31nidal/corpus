import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateLocalDrafts, sanitizeGeneratedDrafts} from '../server/flashcards/generation.mjs'
const generate = (text, options={}) => generateLocalDrafts({text,...options})

test('aucune carte pour du bruit, une liste de mots ou un pronom sans antécédent',()=>{
 for(const level of ['essential','standard','complete']) {
  for(const text of ['xyzabc '.repeat(40)+'.','Bonjour bienvenue dans ce nouveau cours très intéressant.', 'Il transporte le sang vers les organes.', 'Cette structure est située dans le thorax.']) assert.deepEqual(generate(text,{level}),[],text)
 }
})

test('localisation et composition précèdent les définitions générales',()=>{
 for(const [text,question] of [
  ['Le cœur est situé dans le médiastin.','Quelle localisation'],
  ['Les reins sont situés dans le rétropéritoine.','Quelle localisation'],
  ['Le cœur est constitué de quatre cavités.','Quelle est la composition'],
  ['Le fémur s’articule proximalement avec l’os coxal.','Quelle relation anatomique'],
  ['Le rein filtre le plasma sanguin.','Quel rôle'],
  ['Le débit cardiaque dépend de la fréquence cardiaque.','De quoi dépend'],
  ['Le pH artériel vaut 7,40 au repos.','Quelle valeur']
 ]) {const [card]=generate(text);assert.ok(card,text);assert.ok(card.front.startsWith(question),card.front);assert.equal(card.back,text);assert.equal(card.source.excerpt,text)}
})

test('phrases courtes, notes multilignes, décimales, unités et formules sont conservées',()=>{
 const text='Le cœur est un muscle.\nLe pH artériel vaut 7.40 au repos.\nDébit cardiaque = FC × VES.'
 const cards=generate(text,{level:'complete'});assert.equal(cards.length,3);assert.ok(cards.some(c=>c.back.includes('7.40')));assert.ok(cards.some(c=>c.front.startsWith('Quelle formule')))
})

test('dédupliquer avant de limiter et ne pas remplir artificiellement le nombre demandé',()=>{
 const text='Le cœur est un muscle. Le cœur est un muscle. Le rein filtre le plasma sanguin.'
 assert.equal(generate(text,{requestedCount:2}).length,2)
 assert.equal(generate(text,{requestedCount:80}).length,2)
})

test('une négation ne devient jamais une affirmation',()=>{
 assert.deepEqual(generate('Le rein ne produit pas de bile.'),[])
 const cards=generate('La filtration est normalement dépourvue de cellules sanguines.')
 assert.equal(cards[0].back,'La filtration est normalement dépourvue de cellules sanguines.')
})

test('les réponses fournisseur doivent être attestées : citation, longueur, limite et doublons',()=>{
 const text='Le rein filtre le plasma et participe à l’homéostasie du milieu intérieur.'
 const valid={front:'Quel est le rôle du rein ?',back:text,sourceExcerpt:text}
 const fallback={text,level:'standard',requestedCount:1,source:{type:'free_text'},subject:'',chapter:'',tags:[]}
 assert.equal(sanitizeGeneratedDrafts([valid,valid],fallback).length,1)
 for(const invalid of [{...valid,sourceExcerpt:'Une citation inventée assez longue pour sembler crédible.'},{...valid,back:'Le rein produit la bile.'},{...valid,sourceExcerpt:undefined},{...valid,front:'x'.repeat(2001)}]) assert.deepEqual(sanitizeGeneratedDrafts([invalid],fallback),[])
})

test('qualité locale : titres/légendes et sujets tronqués écartés dans les deux générateurs', async()=>{
 const {generateLocalNoteDrafts,questionFor}=await import('../server/flashcards/generation.mjs')
 const phrases=[
  'Chapitre 1 : Le rein',
  'Figure 2 : coupe frontale du rein.',
  "Le débit cardiaque est égal au produit de la fréquence cardiaque par le volume d'éjection systolique.",
  "L'aldostérone agit sur le tube collecteur et augmente la réabsorption de sodium.",
 ]
 for(const phrase of phrases.slice(0,2)) assert.equal(questionFor(phrase),null,phrase)
 for(const phrase of phrases.slice(2)) {const card=questionFor(phrase);assert.ok(card);assert.ok(!/«[^»]*\b(?:et|du|de) »/.test(card.front))}
 for(const prefix of ['Chapitre','Partie','Figure','Tableau','Schéma']) {
  for(const delimiter of [':','']) {
   const phrase=`${prefix} 12 ${delimiter} Le rein filtre le plasma sanguin.`
   assert.equal(questionFor(phrase),null,phrase)
  }
 }
 for(const word of ['et','ou','au','aux','du','des','de','la','le','les','un','une']) {
  assert.equal(questionFor(`Le sujet ${word} augmente la pression arterielle.`),null,word)
  assert.equal(questionFor(`Le sujet ${word} : phrase descriptive suffisamment longue.`),null,word)
 }
 for(const generate of [generateLocalDrafts,generateLocalNoteDrafts]) {
  assert.equal(generate({text:phrases.join('\n')}).length,2)
  assert.ok(generate({text:'Le rein filtre le plasma sanguin.'}).length)
 }
})

test('qualité locale : rectos contextualisés sans concaténer les preuves ou perdre les réponses',async()=>{
 const {generateLocalNoteDrafts,normalize}=await import('../server/flashcards/generation.mjs')
 const text='Le rein filtre le plasma sanguin.\nLE REIN filtre les substances dissoutes.'
 for(const generate of [generateLocalDrafts,generateLocalNoteDrafts]) {
  const diagnostics={}
  const drafts=generate({text,requestedCount:60,source:{type:'study_document'},diagnostics})
  assert.equal(drafts.length,2)
  assert.equal(new Set(drafts.map(d=>normalize(d.front))).size,2)
  assert.equal(diagnostics.disambiguatedFronts,2)
  for(const draft of drafts) {
   assert.ok(text.includes(draft.source.excerpt))
   assert.equal(draft.back,draft.source.excerpt)
   assert.ok(!draft.front.includes(draft.back))
   if(draft.fields)assert.equal(draft.fields.front,draft.front)
  }
 }
 const typed=generateLocalNoteDrafts({text:'Le pH sanguin vaut 7.40 au repos.\nLe pH sanguin vaut 7.35 pendant un effort.'})
 assert.equal(typed.length,2)
 assert.ok(typed.every(d=>d.noteType==='typed'))
 assert.equal(new Set(typed.map(d=>normalize(d.front))).size,2)
})

test('qualité locale : mesure reproductible sur PDF de test',async()=>{
 const {qualityPdf}=await import('./fixtures/local-generation-quality.mjs')
 const {extractPdfPagesAndText}=await import('../server/pdfExtractor.mjs')
 const {generateLocalNoteDrafts}=await import('../server/flashcards/generation.mjs')
 const {totalText}=extractPdfPagesAndText(qualityPdf())
 for(const generate of [generateLocalDrafts,generateLocalNoteDrafts]) {
  const diagnostics={}
  assert.equal(generate({text:totalText,level:'complete',requestedCount:60,diagnostics}).length,6)
  assert.equal(diagnostics.rejectedHeadings,6)
  assert.equal(diagnostics.disambiguatedFronts,2)
 }
})

test('les deux cloze anatomiques pertinentes survivent au filtre des sujets coordonnés',async()=>{
 const {generateLocalNoteDrafts}=await import('../server/flashcards/generation.mjs')
 const phrases=[
 'L’œsophage commence derrière le cricoïde vers C6, descend en arrière de la trachée et traverse le thorax avant l’estomac.',
 'Le nerf obturateur provient des divisions antérieures L2-L4, émerge du bord médial du psoas et traverse le canal obturateur avec les vaisseaux obturateurs.',
 ]
 for(const phrase of phrases){const [card]=generateLocalNoteDrafts({text:phrase});assert.equal(card.noteType,'cloze');assert.equal(card.back,phrase);assert.equal(card.source.excerpt,phrase);assert.match(card.fields.text,/\{\{c1::/)}
 assert.deepEqual(generateLocalNoteDrafts({text:'Le sujet et traverse le canal obturateur.'}),[])
})

test('qualité pédagogique : sujet stable, effet non anatomique et formule avec prose conservée en basic',async()=>{
 const {generateLocalNoteDrafts}=await import('../server/flashcards/generation.mjs')
 const cards=generateLocalNoteDrafts({text:'Le plexus sacré se constitue contre la face antérieure du piriforme par le tronc lombo-sacré L4-L5 et les rameaux antérieurs S1-S4.'})
 assert.ok(cards.length)
 assert.ok(!cards[0].front.includes('plexus sacré se »'))
 const [effect]=generateLocalNoteDrafts({text:'La randomisation protège contre les biais de sélection.'})
 assert.ok(!effect.front.includes('relation anatomique'))
 const [formula]=generateLocalNoteDrafts({text:'PAM = DC X RPTPAM = pression artérielle moyenne.'})
 assert.equal(formula.noteType,'basic')
 assert.equal(formula.back,'PAM = DC X RPTPAM = pression artérielle moyenne.')
})

test('qualité pédagogique : verbes nominaux et quantités sans chiffres ne déforment pas la question',async()=>{
 const {generateLocalNoteDrafts}=await import('../server/flashcards/generation.mjs')
 const examples=[
 ['Les ressources officielles et informations produit décrivent des interactions propres à chaque médicament.','informations produit'],
 ['Le volume décrit ce que contient une cavité, en millilitres.','Le volume'],
 ['Une relation graduelle mesure l’intensité d’un effet chez un sujet ou système.','Une relation graduelle'],
 ]
 for(const [text,subject] of examples){const [card]=generateLocalNoteDrafts({text});assert.ok(card);assert.ok(card.front.includes(subject));assert.ok(!card.front.startsWith('Quelle valeur'));assert.equal(card.source.excerpt,text)}
})

test('les cloze au même recto gardent le contexte jusque dans les champs FSRS',async()=>{
 const {generateLocalNoteDrafts}=await import('../server/flashcards/generation.mjs')
 const text='Le nerf traverse le canal obturateur.\nLe nerf traverse le canal carpien.'
 const cards=generateLocalNoteDrafts({text,requestedCount:60})
 assert.equal(cards.length,2)
 for(const card of cards){assert.equal(card.noteType,'cloze');assert.ok(card.fields.text.includes('Passage'));assert.equal(card.fields.text.replace(/\{\{c1::.*?\}\}/g,'[...]'),card.front);assert.ok(text.includes(card.source.excerpt))}
})
