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
