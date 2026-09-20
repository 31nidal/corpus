const html = value => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')
const csv = value => `"${String(value).replaceAll('"', '""')}"`
const slug = value => String(value || '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
export function buildFlashcardAnki(cards, decks) {
  const names = new Map(decks.map(deck => [deck.id, deck.name]))
  const rows = cards.map(card => [html(card.front), html(card.back), [...new Set(['mycorpus', slug(names.get(card.deckId)), slug(card.subject), ...card.tags.map(slug)].filter(Boolean))].join(' '), card.id])
  return '\uFEFF' + ['#separator:Comma', '#html:true', '#columns:Recto,Verso,Tags,NotionId', '#tags column:3', ...rows.map(row => row.map(csv).join(','))].join('\r\n') + '\r\n'
}
