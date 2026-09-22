import test from 'node:test'
import assert from 'node:assert/strict'
import {deriveCardsFromNote} from '../server/flashcards/derivation.mjs'
import {normalizeTypedAnswer, checkTypedAnswer} from '../server/flashcards/typedAnswer.mjs'

test('dérivation : basic, reverse, bidirectional, cloze, typed', () => {
  // Basic
  const basic = deriveCardsFromNote('basic', {front: 'Question', back: 'Réponse'})
  assert.equal(basic.length, 1)
  assert.equal(basic[0].derivationKey, 'forward')
  assert.equal(basic[0].cardType, 'basic')
  assert.equal(basic[0].front, 'Question')
  assert.equal(basic[0].back, 'Réponse')

  // Reverse
  const reverse = deriveCardsFromNote('reverse', {front: 'Question', back: 'Réponse'})
  assert.equal(reverse.length, 1)
  assert.equal(reverse[0].derivationKey, 'reverse')
  assert.equal(reverse[0].cardType, 'basic')
  assert.equal(reverse[0].front, 'Réponse')
  assert.equal(reverse[0].back, 'Question')

  // Bidirectional
  const bidi = deriveCardsFromNote('bidirectional', {front: 'A', back: 'B'})
  assert.equal(bidi.length, 2)
  assert.equal(bidi[0].derivationKey, 'forward')
  assert.equal(bidi[0].front, 'A')
  assert.equal(bidi[0].back, 'B')
  assert.equal(bidi[1].derivationKey, 'reverse')
  assert.equal(bidi[1].front, 'B')
  assert.equal(bidi[1].back, 'A')

  // Cloze
  const cloze = deriveCardsFromNote('cloze', {text: '{{c1::alpha}} et {{c2::beta}}', extra: 'Note additionnelle'})
  assert.equal(cloze.length, 2)
  assert.equal(cloze[0].derivationKey, 'c1')
  assert.equal(cloze[0].cardType, 'cloze')
  assert.match(cloze[0].front, /\[\.\.\.\] et beta/)
  assert.match(cloze[0].back, /data-cloze="c1">alpha<\/span> et beta\n\nNote additionnelle/)
  assert.equal(cloze[1].derivationKey, 'c2')
  assert.match(cloze[1].front, /alpha et \[\.\.\.\]/)

  // Typed
  const typed = deriveCardsFromNote('typed', {front: 'Capitale ?', answer: 'Paris', acceptedAnswers: ['Lutèce'], extra: 'France'})
  assert.equal(typed.length, 1)
  assert.equal(typed[0].derivationKey, 'typed')
  assert.equal(typed[0].cardType, 'typed')
  assert.equal(typed[0].typedTarget, 'Paris')
  assert.deepEqual(typed[0].acceptedAnswers, ['Lutèce'])
  assert.equal(typed[0].back, 'Paris\n\nFrance')
})

test('dérivation : respect des suppressions', () => {
  const bidi = deriveCardsFromNote('bidirectional', {front: 'A', back: 'B'}, ['reverse'])
  assert.equal(bidi.length, 1)
  assert.equal(bidi[0].derivationKey, 'forward')

  const cloze = deriveCardsFromNote('cloze', {text: '{{c1::un}} {{c2::deux}} {{c3::trois}}'}, ['c2'])
  assert.equal(cloze.length, 2)
  assert.equal(cloze[0].derivationKey, 'c1')
  assert.equal(cloze[1].derivationKey, 'c3')
})

test('réponse tapée : normalisation et validation rigoureuse', () => {
  assert.equal(normalizeTypedAnswer('  HÉMOGLOBINE  \n'), 'hémoglobine')
  assert.equal(normalizeTypedAnswer('Ca2+'), 'ca2+')

  // Match strict
  const check1 = checkTypedAnswer('Paris', 'Paris')
  assert.equal(check1.matched, true)
  assert.equal(check1.matchedAnswer, 'Paris')

  // Case insensitive & whitespace collapsed
  const check2 = checkTypedAnswer('  paris  ', 'Paris')
  assert.equal(check2.matched, true)

  // Accepted alternate answers
  const check3 = checkTypedAnswer('lutèce', 'Paris', ['Lutèce', 'Lutece'])
  assert.equal(check3.matched, true)
  assert.equal(check3.matchedAnswer, 'Lutèce')

  // Incorrect
  const check4 = checkTypedAnswer('Lyon', 'Paris', ['Lutèce'])
  assert.equal(check4.matched, false)

  // Accents preserved (no stripping)
  const check5 = checkTypedAnswer('hemoglobine', 'hémoglobine')
  assert.equal(check5.matched, false) // accents are preserved, so hemoglobine != hémoglobine
})

