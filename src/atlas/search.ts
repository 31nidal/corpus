import { describeStructure } from '../data/anatomy'
import type { Structure } from '../types'

export const normalizeAtlasSearch = (text: string) => text.toLocaleLowerCase('fr')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .replace(/[^a-z0-9]+/g, ' ').trim()

const cache = new WeakMap<Structure, { name: string; original: string; text: string }>()
function searchText(structure: Structure) {
  let entry = cache.get(structure)
  if (!entry) {
    const description = describeStructure(structure.name, structure.group)
    entry = {
      name: normalizeAtlasSearch(description.name),
      original: normalizeAtlasSearch(structure.name),
      text: normalizeAtlasSearch([description.name, structure.name, description.system, ...description.keywords].join(' ')),
    }
    cache.set(structure, entry)
  }
  return entry
}

/** Rank existing labels only. Never derive or replace anatomical identifiers. */
export function searchAtlas(structures: Structure[], query: string, limit = 35) {
  const normalized = normalizeAtlasSearch(query)
  if (!normalized) return [...structures].sort((a, b) => Number(Boolean(b.aggregate)) - Number(Boolean(a.aggregate))).slice(0, 8)
  const words = normalized.split(' ')
  return structures.map(structure => {
    const entry = searchText(structure)
    const score = entry.name === normalized ? 0 : entry.original === normalized ? 1
      : entry.name.startsWith(normalized) ? 2 : entry.name.includes(normalized) ? 3
      : words.every(word => entry.name.includes(word)) ? 4
      : words.every(word => entry.text.includes(word)) ? 5 : Infinity
    return { structure, score }
  }).filter(result => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || Number(Boolean(b.structure.aggregate)) - Number(Boolean(a.structure.aggregate)) || searchText(a.structure).name.localeCompare(searchText(b.structure).name, 'fr'))
    .slice(0, limit).map(result => result.structure)
}
