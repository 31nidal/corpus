import test from 'node:test'
import assert from 'node:assert/strict'
import {extractClozeKeys, validateClozeText, renderClozeCard} from '../server/flashcards/cloze.mjs'

test('cloze extraction : indices numériques ordonnés et dédupliqués', () => {
  assert.deepEqual(extractClozeKeys(''), [])
  assert.deepEqual(extractClozeKeys('Simple text sans trou'), [])
  assert.deepEqual(extractClozeKeys('{{c1::hypertension}} artérielle'), ['c1'])
  assert.deepEqual(extractClozeKeys('{{c2::infarctus}} et {{c1::ischémie}}'), ['c1', 'c2'])
  assert.deepEqual(extractClozeKeys('{{c1::terme 1}} et {{c1::terme 2}} et {{c3::terme 3}}'), ['c1', 'c3'])
  assert.deepEqual(extractClozeKeys('{{c1::mot::indice}}'), ['c1'])
})

test('cloze validation : détection des erreurs de syntaxe', () => {
  assert.equal(validateClozeText('').valid, false)
  assert.equal(validateClozeText('Texte sans trou').valid, false)
  assert.equal(validateClozeText('{{c1::correct}}').valid, true)
  assert.equal(validateClozeText('{{c1::correct::avec indice}}').valid, true)
  assert.equal(validateClozeText('{{c1::non fermé').valid, false)
})

test('cloze rendu recto / verso avec indices et masques multiples', () => {
  const text = 'Le {{c1::cœur::organe}} pompe le sang vers le {{c2::poumon}}.'
  
  // Rendu pour c1
  const c1 = renderClozeCard(text, 'c1')
  assert.equal(c1.front, 'Le [... organe] pompe le sang vers le poumon.')
  assert.equal(c1.back, 'Le <span class="cloze-revealed" data-cloze="c1">cœur</span> pompe le sang vers le poumon.')

  // Rendu pour c2 (sans indice)
  const c2 = renderClozeCard(text, 'c2')
  assert.equal(c2.front, 'Le cœur pompe le sang vers le [...].')
  assert.equal(c2.back, 'Le cœur pompe le sang vers le <span class="cloze-revealed" data-cloze="c2">poumon</span>.')

  // Deux clozes partageant le même index c1
  const shared = '{{c1::A}} et {{c1::B}} sont masqués ensemble, pas {{c2::C}}.'
  const s1 = renderClozeCard(shared, 'c1')
  assert.equal(s1.front, '[...] et [...] sont masqués ensemble, pas C.')
  assert.equal(s1.back, '<span class="cloze-revealed" data-cloze="c1">A</span> et <span class="cloze-revealed" data-cloze="c1">B</span> sont masqués ensemble, pas C.')
})

