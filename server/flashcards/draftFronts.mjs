const normalize = value => String(value ?? '').normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr')
const countDiagnostic = (d,k) => {if(d)d[k]=(d[k]||0)+1}
// This helper never changes answers, proof excerpts or source references.
// Identical facts are deduplicated; distinct answers get an explicit source
// context instead of an invented concatenated proof. Also usable across sections.
export function disambiguateDraftFronts(candidates, diagnostics) {
  const groups = new Map(), result = []
  for (const candidate of candidates) {
    const key = normalize(candidate.front)
    if (!groups.has(key)) groups.set(key, [])
    const group = groups.get(key)
    if (group.some(item => normalize(item.back) === normalize(candidate.back) &&
      normalize(item.excerpt ?? item.source?.excerpt) === normalize(candidate.excerpt ?? candidate.source?.excerpt) &&
      item.source?.sectionId === candidate.source?.sectionId)) {
      countDiagnostic(diagnostics, 'duplicateFacts'); continue
    }
    group.push(candidate); result.push(candidate)
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue
    for (const [index,item] of group.entries()) {
      const context = item.source?.sectionTitle || 'Passage'
      item.front += ` (${context} · ${index+1})`
      if (item.fields && item.noteType !== 'cloze') item.fields = {...item.fields, front:item.front}
      countDiagnostic(diagnostics, 'disambiguatedFronts')
    }
  }
  return result
}
