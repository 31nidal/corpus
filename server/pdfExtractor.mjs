import { inflateSync, inflateRawSync } from 'node:zlib'

/**
 * Pure-Node PDF text extractor for MyCorpus Study.
 *
 * Architecture (pipeline) :
 *   1. parseObjects()                   — Parse tous les objets PDF indirects.
 *                                         Utilise /Length pour sauter les bytes binaires
 *                                         et éviter les faux positifs de type "N G obj"
 *                                         dans les streams compressés.
 *                                         Résolution indirect /Length en deux passes.
 *   2. getPageOrder() / walkPageTree()  — Détermine l'ordre des pages via
 *                                         /Catalog → /Pages → /Kids (correct même pour
 *                                         les PDFs avec objets réordonnés).
 *   3. decompressStream()               — FlateDecode (zlib) avec fallback raw-inflate.
 *   4. extractTextFromContentStream()   — Parser BT…ET : opérateurs Tj/TJ/Td/TD/Tm/T*,
 *                                         lookup CMap hex, fallback Win-1252 / TeX-OT1.
 *   5. normalizeFrenchText()            — Reconstruit les diacritiques TeX fragmentés.
 *   6. chunkIntoSections()              — Segmentation heuristique en sections d'étude.
 *
 * Supporté   : FlateDecode, ToUnicode CMap, ligatures TeX OT1, Win-1252, /Length indirect.
 * Non supporté: PDFs chiffrés, scannés/image-only (pas d'OCR), LZW/JBIG2/CCITT,
 *               XObject forms, fontes Type 3, CID composite sans ToUnicode.
 */

// ─── 1. Tables d'encodage des caractères ──────────────────────────────────────

const WIN1252_MAP = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ',  0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š',  0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D',
  0x95: '•',      0x96: '–',      0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š',  0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ'
}

// Encodage TeX OT1 — ligatures et caractères spéciaux
const TEX_OT1_MAP = {
  0x0B: 'ff',  0x0C: 'fi',  0x0D: 'fl',  0x0E: 'ffi', 0x0F: 'ffl',
  0x10: 'i',   0x11: 'j',
  0x12: '\u0060', // grave `
  0x13: '\u00B4', // acute ´
  0x14: '\u02C7', // caron ˇ
  0x15: '\u02D8', // breve ˘
  0x16: '\u00AF', // macron ¯
  0x17: '\u02DA', // ring ˚
  0x18: '\u00B8', // cedilla ¸
  0x19: 'ß',  0x1A: 'æ',  0x1B: 'œ',  0x1C: 'ø',
  0x1D: 'Æ',  0x1E: 'Œ',  0x1F: 'Ø'
}

function decodeChar(code) {
  if (code in TEX_OT1_MAP) return TEX_OT1_MAP[code]
  return WIN1252_MAP[code] ?? String.fromCharCode(code)
}

/**
 * Décode une chaîne littérale PDF (entre parenthèses) en appliquant les séquences
 * d'échappement octales et le mapping TeX OT1 / Win-1252.
 *
 * FIX : \f est un saut de page (form-feed U+000C), PAS la ligature fi du TeX OT1.
 */
function decodeLiteralString(str) {
  const ESCAPES = {
    n: '\n', r: '\r', t: '\t', b: '\b', f: '\f',
    '(': '(', ')': ')', '\\': '\\'
  }
  const unescaped = str.replace(/\\([0-7]{1,3}|[\\()nrtbf])/g, (_, seq) => {
    if (/^[0-7]+$/.test(seq)) return decodeChar(parseInt(seq, 8))
    return seq in ESCAPES ? ESCAPES[seq] : seq
  })
  let out = ''
  for (let i = 0; i < unescaped.length; i++) out += decodeChar(unescaped.charCodeAt(i))
  return out
}

/**
 * Décode une chaîne hexadécimale PDF en utilisant la CMap pour le mapping CID→Unicode.
 * Essaie d'abord les chunks de 4 hex (CID 2 octets), puis 2 hex (1 octet).
 */
function decodeHexString(hex, cmap = null) {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '')
  if (!clean) return ''

  if (cmap && cmap.size > 0) {
    let result = '', i = 0
    while (i < clean.length) {
      const c4 = clean.slice(i, i + 4).toUpperCase().padStart(4, '0')
      const c2 = clean.slice(i, i + 2).toUpperCase().padStart(2, '0')
      if (cmap.has(c4)) {
        result += cmap.get(c4); i += 4
      } else if (cmap.has(c2)) {
        result += cmap.get(c2); i += 2
      } else {
        const code = parseInt(c2, 16)
        if (!isNaN(code) && code > 0) result += decodeChar(code)
        i += 2
      }
    }
    if (result.trim()) return result
  }

  // BOM UTF-16 (FEFF) — utilisé par de nombreux générateurs PDF modernes
  if (clean.length >= 4 && clean.slice(0, 4).toUpperCase() === 'FEFF') {
    let result = ''
    for (let i = 4; i < clean.length; i += 4) {
      const code = parseInt(clean.slice(i, i + 4).padEnd(4, '0'), 16)
      if (!isNaN(code)) result += String.fromCharCode(code)
    }
    return result
  }

  // Fallback octet par octet
  let s = ''
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2).padEnd(2, '0'), 16)
    if (!isNaN(code)) s += decodeChar(code)
  }
  return s
}

// ─── 2. Parsing CMap (ToUnicode) ──────────────────────────────────────────────

export function parseCMap(text) {
  const map = new Map()
  if (!text || typeof text !== 'string') return map

  const putEntry = (srcHex, dstHex) => {
    let dst = ''
    for (let j = 0; j < dstHex.length; j += 4) {
      const code = parseInt(dstHex.slice(j, j + 4), 16)
      if (!isNaN(code)) dst += String.fromCharCode(code)
    }
    const src = srcHex.toUpperCase()
    map.set(src, dst)
    map.set(src.padStart(4, '0'), dst)
    if (src.length <= 2) map.set(src.padStart(2, '0'), dst)
  }

  // beginbfchar … endbfchar : mappings individuels
  for (const m of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const line of m[1].trim().split(/\r?\n/)) {
      const lm = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/)
      if (lm) putEntry(lm[1], lm[2])
    }
  }

  // beginbfrange … endbfrange : mappings de plages contiguës
  for (const m of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const line of m[1].trim().split(/\r?\n/)) {
      const lm = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/)
      if (!lm) continue
      let cid = parseInt(lm[1], 16), end = parseInt(lm[2], 16), dst = parseInt(lm[3], 16)
      for (; cid <= end; cid++, dst++) {
        const hex = cid.toString(16).toUpperCase()
        const char = String.fromCharCode(dst)
        map.set(hex, char)
        map.set(hex.padStart(4, '0'), char)
        map.set(hex.padStart(2, '0'), char)
      }
    }
  }

  return map
}

// ─── 3. Normalisation du français ─────────────────────────────────────────────

/**
 * Reconstruit les diacritiques français fragmentés par le rendu TeX OT1.
 * TeX OT1 émet le caractère de base + l'accent combinatoire en appels séparés.
 */
export function normalizeFrenchText(text) {
  const ACUTE = { e: 'é', E: 'É', a: 'á', o: 'ó', u: 'ú', c: 'ç', C: 'Ç' }
  const GRAVE = { e: 'è', E: 'È', a: 'à', A: 'À', u: 'ù', i: 'ì', I: 'Ì' }
  const CIRC  = { e: 'ê', E: 'Ê', a: 'â', A: 'Â', i: 'î', I: 'Î', o: 'ô', O: 'Ô', u: 'û', U: 'Û' }
  const TREMA = { e: 'ë', E: 'Ë', i: 'ï', I: 'Ï', u: 'ü', U: 'Ü', a: 'ä' }

  return text
    // Accent aigu ´
    .replace(/\u00B4\s*([eEaAoOuUcC])/g, (_, v) => ACUTE[v] || v)
    .replace(/([eEaAoOuU])\s*\u00B4/g,   (_, v) => ACUTE[v] || v)
    // Accent grave ` ou \u0060
    .replace(/[`\u0060]\s*([eEaAuUiI])/g, (_, v) => GRAVE[v] || v)
    .replace(/([eEaAuU])\s*[`\u0060]/g,   (_, v) => GRAVE[v] || v)
    // Accent circonflexe ^ ou ˆ
    .replace(/[\^\u02C6]\s*([eEaAiIoOuU])/g, (_, v) => CIRC[v] || v)
    .replace(/([eEaAiIoOuU])\s*[\^\u02C6]/g, (_, v) => CIRC[v] || v)
    // Tréma ¨
    .replace(/[\u00A8¨]\s*([eEiIuUaA])/g, (_, v) => TREMA[v] || v)
    // Cédille ¸
    .replace(/[\u00B8¸]\s*([cC])/g, (_, v) => v === 'C' ? 'Ç' : 'ç')
    // Artefacts TeX français courants
    .replace(/\bc\s*-\s*a\s*-\s*d\b/gi, 'c-à-d')
    .replace(/\bd\s*ej\s*a\b/gi, 'déjà')
    // Chiffre immédiatement suivi d'une majuscule (ex : 2Réalisation → 2 Réalisation)
    .replace(/([0-9]+)\s*([A-ZÀ-ÖØ-ß][a-zà-öø-ÿ])/g, '$1 $2')
    // Trait d'union de coupure sur changement de ligne
    .replace(/([a-zà-öø-ÿ])-(?:\r?\n|\s+)([a-zà-öø-ÿ])/gi, '$1$2')
}

// ─── 4. Parseur d'objets PDF ──────────────────────────────────────────────────

/**
 * Parse tous les objets indirects d'un PDF.
 *
 * Propriétés clés :
 *  - Utilise l'entrée /Length du dictionnaire pour sauter précisément les bytes
 *    compressés du stream, évitant les faux positifs "N G obj" dans les données binaires.
 *  - Avance le lastIndex du regex après chaque endobj pour éviter le re-scan.
 *  - Résout les références /Length indirectes (/Length N G R) en deux passes.
 *
 * @param {Buffer} buffer   Bytes bruts du PDF
 * @param {string} raw      buffer.toString('latin1') — précalculé pour performance
 * @returns {Map<string, object>}  id → { num, gen, dict, streamData?, isStream }
 */
function parseObjects(buffer, raw) {
  const objects = new Map()
  const objRe = /(\d+)\s+(\d+)\s+obj/g
  let m

  while ((m = objRe.exec(raw)) !== null) {
    const num       = parseInt(m[1], 10)
    const gen       = parseInt(m[2], 10)
    const id        = `${num}_${gen}`
    const bodyStart = m.index + m[0].length

    // Fenêtre de recherche bornée (≤ 8 Ko) pour 'stream' ou 'endobj'.
    // Les vrais dictionnaires PDF tiennent largement dedans.
    const WINDOW    = 8192
    const win       = raw.slice(bodyStart, bodyStart + WINDOW)
    const streamOff = win.indexOf('stream')
    const endobjOff = win.indexOf('endobj')

    if (streamOff !== -1 && (endobjOff === -1 || streamOff < endobjOff)) {
      // ── Objet stream ─────────────────────────────────────────────────────
      const dict = win.slice(0, streamOff)

      // Les données stream commencent après 'stream' + EOL (\r\n ou \n)
      let dataStart = bodyStart + streamOff + 6
      if      (buffer[dataStart] === 0x0D && buffer[dataStart + 1] === 0x0A) dataStart += 2
      else if (buffer[dataStart] === 0x0A || buffer[dataStart] === 0x0D)     dataStart += 1

      // Cas 1 : /Length direct — le plus fiable
      const lenDirect = dict.match(/\/Length\s+(\d+)\b/)
      if (lenDirect) {
        const dataEnd = Math.min(dataStart + parseInt(lenDirect[1], 10), buffer.length)
        objects.set(id, { num, gen, id, dict, streamData: buffer.subarray(dataStart, dataEnd), isStream: true })
        // Avancer le regex après endobj pour ne pas re-scanner le stream binaire
        const esOff = raw.indexOf('endstream', dataStart)
        if (esOff !== -1) {
          const eoOff = raw.indexOf('endobj', esOff)
          if (eoOff !== -1) objRe.lastIndex = eoOff + 6
        }
        continue
      }

      // Cas 2 : /Length indirect (/Length N G R) — résolution en 2ème passe
      const lenIndirect = dict.match(/\/Length\s+(\d+)\s+(\d+)\s+R/)
      if (lenIndirect) {
        objects.set(id, {
          num, gen, id, dict,
          streamDataStart: dataStart,
          indirectLength: `${lenIndirect[1]}_${lenIndirect[2]}`,
          isStream: true, pending: true
        })
        const esOff = raw.indexOf('endstream', dataStart)
        if (esOff !== -1) {
          const eoOff = raw.indexOf('endobj', esOff)
          if (eoOff !== -1) objRe.lastIndex = eoOff + 6
        }
        continue
      }

      // Cas 3 : pas de /Length — recherche de 'endstream' dans le raw
      const esOff   = raw.indexOf('endstream', dataStart)
      const dataEnd = esOff !== -1 ? esOff : dataStart
      objects.set(id, { num, gen, id, dict, streamData: buffer.subarray(dataStart, dataEnd), isStream: true })
      if (esOff !== -1) {
        const eoOff = raw.indexOf('endobj', esOff)
        if (eoOff !== -1) objRe.lastIndex = eoOff + 6
      }
    } else {
      // ── Objet non-stream ─────────────────────────────────────────────────
      const dictEnd = endobjOff !== -1 ? bodyStart + endobjOff : bodyStart + WINDOW
      objects.set(id, { num, gen, id, dict: raw.slice(bodyStart, dictEnd), isStream: false })
    }
  }

  // 2ème passe : résolution des /Length indirects
  for (const obj of objects.values()) {
    if (!obj.pending) continue
    const lenObj   = objects.get(obj.indirectLength)
    const lenMatch = lenObj?.dict?.match(/(\d+)/)
    const len      = lenMatch ? parseInt(lenMatch[1], 10) : -1

    if (len > 0) {
      obj.streamData = buffer.subarray(obj.streamDataStart, Math.min(obj.streamDataStart + len, buffer.length))
    } else {
      // Dernier recours : chercher endstream
      const esOff = raw.indexOf('endstream', obj.streamDataStart)
      obj.streamData = buffer.subarray(obj.streamDataStart, esOff !== -1 ? esOff : obj.streamDataStart)
    }
    delete obj.streamDataStart
    delete obj.indirectLength
    delete obj.pending
  }

  return objects
}

/**
 * Retourne les objets page dans l'ordre du document en parcourant l'arbre /Pages.
 * Revient à l'ordre d'insertion si le catalog ou l'arbre est absent ou malformé.
 */
function getPageOrder(objects) {
  // Localiser l'objet /Catalog
  let catalog = null
  for (const obj of objects.values()) {
    if (!obj.isStream && /\/Type\s*\/Catalog\b/.test(obj.dict)) { catalog = obj; break }
  }

  if (catalog) {
    const pagesM = catalog.dict.match(/\/Pages\s+(\d+)\s+(\d+)\s+R/)
    if (pagesM) {
      const root = objects.get(`${pagesM[1]}_${pagesM[2]}`)
      if (root) {
        const ordered = []
        walkPageTree(root, objects, ordered, 0)
        if (ordered.length > 0) return ordered
      }
    }
  }

  // Fallback : ordre d'apparition dans la Map
  return [...objects.values()].filter(
    o => /\/Type\s*\/Page\b/.test(o.dict) && !/\/Type\s*\/Pages\b/.test(o.dict)
  )
}

/**
 * Parcourt récursivement l'arbre de noeuds /Pages en ajoutant les feuilles /Page à `pages`.
 */
function walkPageTree(node, objects, pages, depth) {
  if (depth > 64) return  // protection contre les arbres circulaires malformés

  if (/\/Type\s*\/Page\b/.test(node.dict) && !/\/Type\s*\/Pages\b/.test(node.dict)) {
    pages.push(node)
    return
  }

  // Noeud intermédiaire /Pages — itérer /Kids
  const kidsM = node.dict.match(/\/Kids\s*\[([^\]]+)\]/)
  if (!kidsM) return

  for (const ref of kidsM[1].matchAll(/(\d+)\s+(\d+)\s+R/g)) {
    const kid = objects.get(`${ref[1]}_${ref[2]}`)
    if (kid) walkPageTree(kid, objects, pages, depth + 1)
  }
}

// ─── 5. Décompression de stream ───────────────────────────────────────────────

/**
 * Décompresse un buffer de stream en FlateDecode (zlib inflate),
 * avec fallback raw-inflate pour les streams sans en-tête zlib.
 * Retourne une chaîne latin1.
 */
function decompressStream(streamData, dict) {
  if (!streamData || streamData.length === 0) return ''
  if (!/\/Filter/.test(dict)) return streamData.toString('latin1')

  let data = streamData
  if (/\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[[^\]]*\/FlateDecode/.test(dict)) {
    try         { data = inflateSync(data) }
    catch       { try { data = inflateRawSync(data) } catch { return data.toString('latin1') } }
  }
  return data.toString('latin1')
}

// ─── 6. Extraction du texte depuis un content stream ──────────────────────────

/**
 * Extrait le texte lisible d'un content stream PDF décompressé.
 *
 * Opérateurs gérés :
 *   Tj, ', "  — écriture d'une chaîne unique
 *   TJ        — tableau de chaînes avec ajustements de crénage
 *   Td, TD    — déplacement relatif du texte (détection de ligne)
 *   Tm        — matrice de texte absolue (suivi du y pour détecter les lignes)
 *   T*        — passage à la ligne suivante
 *
 * Groupes de capture dans opRe :
 *   [1]    = contenu du tableau TJ
 *   [2][3] = Td/TD dx, dy
 *   [4..9] = paramètres Tm : a b c d e f  (f = translation y)
 */
export function extractTextFromContentStream(content, cmap = null) {
  const pieces = []
  const btRe = /BT([\s\S]*?)ET/g
  let btM

  while ((btM = btRe.exec(content)) !== null) {
    const block  = btM[1]
    let lineText = ''
    let lastTy   = null   // Dernière position y absolue connue (Tm)

    // Regex combiné (l'ordre compte : Tj avant TJ avant Td avant Tm avant T*)
    const opRe = /(?:\((?:[^\\()]|\\.)*\)|<[0-9A-Fa-f\s]+>)\s*(?:Tj|'|")|(\[(?:[^\[\]]|\((?:[^\\()]|\\.)*\)|<[0-9A-Fa-f\s]+>)*\])\s*TJ|(-?[0-9.]+)\s+(-?[0-9.]+)\s+(?:Td|TD)|(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+Tm|T\*/g
    let opM

    while ((opM = opRe.exec(block)) !== null) {
      const token = opM[0]

      // T* — retour à la ligne explicite
      if (token === 'T*') {
        if (lineText.trim()) { pieces.push(lineText.trim()); lineText = '' }
        continue
      }

      // Tm — matrice de texte absolue : détecte les sauts verticaux de ligne
      // opM[4..9] = a b c d e f ; f (opM[9]) = translation y
      if (opM[4] !== undefined) {
        const ty = parseFloat(opM[9])
        if (lastTy !== null && Math.abs(ty - lastTy) >= 3) {
          if (lineText.trim()) { pieces.push(lineText.trim()); lineText = '' }
        }
        lastTy = ty
        continue
      }

      // Td / TD — déplacement relatif
      if (opM[2] !== undefined) {
        const dx = parseFloat(opM[2])
        const dy = parseFloat(opM[3])
        if (Math.abs(dy) >= 3) {
          // Grand déplacement vertical → nouvelle ligne
          if (lineText.trim()) { pieces.push(lineText.trim()); lineText = '' }
        } else if (dx >= 10 && lineText && !lineText.endsWith(' ') && /[a-zA-Z0-9À-ÿ]$/.test(lineText)) {
          // Grand décalage horizontal sans mouvement vertical → espace entre mots
          // Sauf si le prochain token est un accent combinatoire
          const rest     = block.slice(opRe.lastIndex)
          const isAccent = /^\s*(?:\/\w+\s+[\d.]+\s+Tf\s*)?\[?\s*(?:\(\\[0-7]{3}\)|\([`'^´¨]\)|<[0-9A-Fa-f]+>)/.test(rest)
          if (!isAccent) lineText += ' '
        }
        continue
      }

      // TJ — tableau de chaînes et valeurs de crénage
      if (opM[1] !== undefined) {
        const elemRe = /\((?:[^\\()]|\\.)*\)|<[0-9A-Fa-f\s]+>|(-?[0-9.]+)/g
        let el, word = ''
        while ((el = elemRe.exec(opM[1])) !== null) {
          const item = el[0]
          if (item.startsWith('(') && item.endsWith(')')) {
            word += decodeLiteralString(item.slice(1, -1))
          } else if (item.startsWith('<') && item.endsWith('>')) {
            word += decodeHexString(item.slice(1, -1), cmap)
          } else if (el[1] !== undefined && parseFloat(el[1]) < -200) {
            // Crénage très négatif = coupure de mot
            if (!word.endsWith(' ')) word += ' '
          }
        }
        lineText += word
        continue
      }

      // Tj / ' / " — chaîne unique (littérale ou hexadécimale)
      const rawStr = token.replace(/\s*(?:Tj|'|")$/, '')
      if (rawStr.startsWith('(') && rawStr.endsWith(')')) {
        lineText += decodeLiteralString(rawStr.slice(1, -1))
      } else if (rawStr.startsWith('<') && rawStr.endsWith('>')) {
        lineText += decodeHexString(rawStr.slice(1, -1), cmap)
      }
    }

    if (lineText.trim()) pieces.push(lineText.trim())
  }

  return normalizeFrenchText(
    pieces.join('\n')
      .replace(/[\u0000-\u0008\u000E-\u0011\u0015-\u0017\u001F]/g, ' ')
      .replace(/[ \t]+/g, ' ')
  )
}

// ─── 7. Point d'entrée principal ──────────────────────────────────────────────

/**
 * Extrait le texte d'un buffer PDF, retourne un tableau d'objets page avec
 * le texte par page et un totalText combiné.
 *
 * @throws {Error} code=ERR_NO_EXTRACTABLE_TEXT  si le PDF semble scanné/image-only
 * @throws {Error}                               si le buffer n'est pas un PDF valide
 */
export function extractPdfPagesAndText(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer)

  if (!buffer.subarray(0, 10).toString('latin1').startsWith('%PDF-')) {
    throw new Error('Format de fichier invalide. Le document fourni n\u2019est pas un PDF valide.')
  }

  const raw     = buffer.toString('latin1')
  const objects = parseObjects(buffer, raw)

  // Collecter toutes les entrées CMap (ToUnicode) depuis chaque stream.
  // Fusionnées dans une map globale — suffisant pour les documents à encodage unique.
  const globalCmap = new Map()
  for (const obj of objects.values()) {
    if (!obj.isStream) continue
    const text = decompressStream(obj.streamData, obj.dict)
    if (text.includes('beginbfchar') || text.includes('beginbfrange')) {
      for (const [k, v] of parseCMap(text)) globalCmap.set(k, v)
    }
  }

  // Récupérer les pages dans l'ordre correct via l'arbre /Pages
  const pageObjects = getPageOrder(objects)
  const pages       = []

  for (let i = 0; i < pageObjects.length; i++) {
    const pageObj = pageObjects[i]
    let pageText  = ''

    // Résoudre /Contents — référence unique ou tableau de références
    const cm = pageObj.dict.match(/\/Contents\s*(?:(\d+)\s+(\d+)\s+R|\[([^\]]+)\])/)
    if (cm) {
      if (cm[1]) {
        // Stream de contenu unique
        const cObj = objects.get(`${cm[1]}_${cm[2]}`)
        if (cObj?.streamData) {
          pageText = extractTextFromContentStream(
            decompressStream(cObj.streamData, cObj.dict), globalCmap
          )
        }
      } else if (cm[3]) {
        // Tableau de streams de contenu (concaténés)
        const parts = []
        for (const ref of cm[3].matchAll(/(\d+)\s+(\d+)\s+R/g)) {
          const cObj = objects.get(`${ref[1]}_${ref[2]}`)
          if (cObj?.streamData) {
            parts.push(extractTextFromContentStream(
              decompressStream(cObj.streamData, cObj.dict), globalCmap
            ))
          }
        }
        pageText = parts.join('\n')
      }
    }

    pages.push({ pageNumber: i + 1, text: pageText.trim() })
  }

  // Fallback pour les PDFs sans arbre /Pages correct : scanner tous les streams BT…ET
  if (pages.length === 0) {
    let n = 1
    for (const obj of objects.values()) {
      if (!obj.isStream) continue
      const text = decompressStream(obj.streamData, obj.dict)
      if (text.includes('BT') && text.includes('ET')) {
        const extracted = extractTextFromContentStream(text, globalCmap)
        if (extracted.trim().length > 10) pages.push({ pageNumber: n++, text: extracted.trim() })
      }
    }
  }

  // Rejeter les PDFs scannés / sans texte extractible
  const totalChars = pages.map(p => p.text).join('\n').replace(/\s+/g, '').length
  if (totalChars < 50) {
    const err = new Error(
      'Ce document PDF contient trop peu de texte extractible. MyCorpus Study V1 ne prend pas ' +
      'en charge les documents scannés ou images (pas d\'OCR en V1). ' +
      'Veuillez utiliser un cours PDF avec texte sélectionnable.'
    )
    err.code   = 'ERR_NO_EXTRACTABLE_TEXT'
    err.status = 422
    throw err
  }

  const totalText = pages.map(p => p.text).join('\n')
  return { pageCount: pages.length || 1, pages, totalText }
}

// ─── 8. Segmentation en sections ──────────────────────────────────────────────

/**
 * Segmente automatiquement les pages extraites en chapitres/sections structurées.
 * Utilise une détection heuristique des titres : chiffres romains, mots-clés explicites
 * (Chapitre, Section…), lignes courtes en majuscules — avec seuils de contenu minimum
 * avant rupture.
 */
export function chunkIntoSections(pages) {
  const sections = []
  let currentSection = {
    title: 'Introduction et repères généraux',
    startPage: 1, endPage: 1, paragraphs: []
  }

  // Titres chiffres romains : I, II, III… strictement en majuscules, suivis d'un séparateur
  const romanHeadingRe  = /^[IVXLCDM]+(?:\s*[.\-–:]\s*|\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ])/
  // En-têtes et pieds de page à ignorer
  const headerFooterRe  = /^(?:\d+[A-Z]\s+[A-Z]+|\d+\s*\/\s*\d+|.+?\s+\d+\s*\/\s*\d+)$/i
  // Titres explicites de chapitre/partie
  const explicitRe      = /^(?:(?:chapitre|partie|section|module|axe|cours|thème|étape|etape)\s*[:\d\-IVXLCDM]|(?:\d{1,2}(?:\.\d{1,2})*\s*[.\-–\s]))\s*(.+)$/i
  // Débuts de phrases ordinaires (non-titres)
  const nonHeadingRe    = /^(?:pour|dans|il|elle|ils|elles|on|vous|nous|les|des|le|la|ce|cette|ces|un|une|en|au|aux|avec|sans|par|sous|sur|selon|afin|chaque|tous|tout|toute|toutes|donc|puis|mais|ou|et|or|ni|car|si|comme|suite|après|avant|attention)\b/i
  // Préfixes de liste/puce
  const bulletRe        = /^[\s*•\-–—|·]|^(?:I|l)\s+(?:le|la|les|un|une|des|du|de|ce|ces)\b/i

  // Titres en un seul mot qui sont valides comme section
  const VALID_SINGLE = new Set([
    'introduction','contexte','planning','contraintes','conclusion',
    'annexes','annexe','glossaire','bibliographie','résumé','resume',
    'objectifs','consignes','méthodes','résultats','discussion'
  ])

  for (const page of pages) {
    const lines = page.text.split('\n').map(l => l.trim()).filter(Boolean)

    for (const line of lines) {
      const isBullet       = bulletRe.test(line)
      const isHeaderFooter = headerFooterRe.test(line)
      const isRoman        = !isBullet && !isHeaderFooter && romanHeadingRe.test(line)
      const isExplicit     = !isBullet && !isHeaderFooter && explicitRe.test(line)

      const hasSpaces      = line.includes(' ')
      const isSingleValid  = !hasSpaces && VALID_SINGLE.has(line.toLowerCase())
      const isShort        = !isBullet && !isHeaderFooter &&
        line.length >= 4 && line.length <= 50 &&
        !/[.;!?:]$/.test(line) &&
        !nonHeadingRe.test(line) &&
        (hasSpaces || isSingleValid) &&
        (
          /^[A-Z0-9\sÀÂÉÈÊËÎÏÔÙÛÜÇ''\-:]{4,45}$/.test(line) ||
          (/^[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]/.test(line) && line.split(' ').length <= 5)
        )

      const accumulated = currentSection.paragraphs.reduce((a, p) => a + p.length, 0)
      const shouldBreak =
        isRoman ||
        (isExplicit && accumulated >= 200) ||
        (isShort    && accumulated >= 400)

      if (shouldBreak && (accumulated >= 50 || isRoman)) {
        if (currentSection.paragraphs.length > 0) {
          sections.push({
            id:        `sec-${sections.length + 1}`,
            title:     currentSection.title,
            startPage: currentSection.startPage,
            endPage:   currentSection.endPage,
            content:   currentSection.paragraphs.join('\n\n')
          })
        }

        // Supprimer le préfixe de section (chapitre/chiffre romain) du titre
        // Note : les remplacements utilisent des \b pour ne jamais tronquer un mot
        // (ex : 'C' de 'Contexte', 'M' de 'Matériel' ne sont pas supprimés)
        let cleanTitle = line
          .replace(/^(?:(?:chapitre|partie|section|module|axe|cours|thème)\s*[:\d\-]*|[IVXLCDM]+\b|[0-9]+(?:\.[0-9]+)*)[\s.\-–:]*/i, '')
          .trim()
        if (!cleanTitle || cleanTitle.length < 3) cleanTitle = line
        cleanTitle = cleanTitle.split(/[:.]/)[0].trim()

        currentSection = {
          title:      cleanTitle.slice(0, 80),
          startPage:  page.pageNumber,
          endPage:    page.pageNumber,
          paragraphs: []
        }
      } else {
        currentSection.paragraphs.push(line)
        currentSection.endPage = page.pageNumber
      }
    }
  }

  // Pousser la dernière section ouverte
  if (currentSection.paragraphs.length > 0 || sections.length === 0) {
    sections.push({
      id:        `sec-${sections.length + 1}`,
      title:     currentSection.title,
      startPage: currentSection.startPage,
      endPage:   currentSection.endPage,
      content:   currentSection.paragraphs.join('\n\n') || 'Contenu extrait du document.'
    })
  }

  // Fusionner les micro-sections (< 200 chars) avec la précédente
  const merged = []
  for (const sec of sections) {
    const isMicro =
      sec.content.length < 200 &&
      !sec.title.toLowerCase().startsWith('contexte') &&
      !sec.title.toLowerCase().startsWith('planning')
    if (
      merged.length > 0 && isMicro &&
      (sec.content.length < 150 || sec.title.startsWith('Section') || sec.title.length < 5)
    ) {
      const prev = merged[merged.length - 1]
      prev.content += '\n\n' + sec.content
      prev.endPage  = Math.max(prev.endPage, sec.endPage)
    } else {
      merged.push(sec)
    }
  }

  return merged.map((sec, idx) => ({
    id:         `sec-${idx + 1}`,
    title:      sec.title || `Section ${idx + 1}`,
    startPage:  sec.startPage,
    endPage:    Math.max(sec.startPage, sec.endPage),
    content:    sec.content,
    tokenCount: Math.ceil(sec.content.length / 4)
  }))
}
