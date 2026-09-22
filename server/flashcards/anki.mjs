const html = value => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')
const escapeTab = value => `"${String(value ?? '').replaceAll('"', '""')}"`
const slug = value => String(value || '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export function buildFlashcardAnki(cards, decks, notesMap = new Map(), isFiltered = false) {
  const names = new Map(decks.map(deck => [deck.id, deck.name]))
  const processedNoteIds = new Set()
  const rows = []

  for (const card of cards) {
    const note = (!isFiltered && card.noteId) ? notesMap.get(card.noteId) : null
    const deckName = names.get(card.deckId) || ''
    const tags = [...new Set(['mycorpus', slug(deckName), slug(card.subject), ...card.tags.map(slug)].filter(Boolean))].join(' ')

    if (note) {
      if (note.noteType === 'cloze') {
        if (!processedNoteIds.has(note.id)) {
          processedNoteIds.add(note.id)
          rows.push([
            'Cloze',
            html(note.fields.text),
            html(note.fields.extra || ''),
            note.id,
            tags,
          ])
        }
        continue
      } else if (note.noteType === 'bidirectional') {
        if (!processedNoteIds.has(note.id)) {
          processedNoteIds.add(note.id)
          rows.push([
            'Basic (and reversed card)',
            html(note.fields.front),
            html(note.fields.back),
            note.id,
            tags,
          ])
        }
        continue
      }
    }

    if (card.cardType === 'image_occlusion' || note?.noteType === 'image_occlusion') {
      const prompt = card.front || note?.fields?.prompt || 'Identifier la structure'
      rows.push([
        'Basic',
        `[Image Occlusion : ${html(prompt)}]<br><i>(Consulter l’image dans MyCorpus)</i>`,
        html(card.back),
        card.id,
        tags,
      ])
      continue
    }

    rows.push([
      'Basic',
      html(card.front),
      html(card.back),
      card.id,
      tags,
    ])
  }

  const headers = [
    '#separator:Tab',
    '#html:true',
    '#notetype column:1',
    '#tags column:5',
  ]

  return '\uFEFF' + [...headers, ...rows.map(row => row.map(escapeTab).join('\t'))].join('\r\n') + '\r\n'
}
