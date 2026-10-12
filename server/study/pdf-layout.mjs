import {extractPdfPagesAndText} from '../pdfExtractor.mjs'

const clean = text => text.normalize('NFC').replace(/\u00ad/g, '').replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/\u0000/g, '')

// Coordinates, not PDF drawing-command order, determine reading order.
export function layoutText(items, pageWidth) {
  const runs = items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => ({
    text: clean(item.str), x: item.transform[4], y: item.transform[5],
    width: item.width, height: Math.max(item.height || Math.abs(item.transform[3]), 1),
  })).sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  let ambiguous = false
  for (const run of runs) {
    const row = rows.find(row => Math.abs(row.y - run.y) <= Math.min(row.height, run.height) * .3)
    if (row) row.runs.push(run)
    else rows.push({y: run.y, height: run.height, runs: [run]})
  }
  for (const row of rows) row.runs.sort((a, b) => a.x - b.x)
  const split = row => {
    const cells = []
    for (const run of row.runs) {
      const previous = cells.at(-1)
      const gap = previous ? run.x - previous.end : 0
      if (previous && gap < -run.height && previous.text.length > 15 && run.text.length > 15) ambiguous = true
      if (!previous || gap > Math.max(18, run.height * 2)) cells.push({text: run.text, x: run.x, end: run.x + run.width})
      else {
        previous.text += gap > run.height * .12 && !/\s$/.test(previous.text) && !/^\s/.test(run.text) ? ' ' + run.text : run.text
        previous.end = Math.max(previous.end, run.x + run.width)
      }
    }
    return cells
  }
  const paired = rows.map(row => ({...row, cells: split(row)}))
  const columns = paired.filter(row => row.cells.length === 2 && row.cells[0].end < pageWidth * .56 && row.cells[1].x > pageWidth * .4)
  // Long, recurring parallel text blocks are columns; short aligned cells stay tables.
  const twoColumns = columns.length >= 4 && columns.filter(row => row.cells.every(cell => cell.text.length >= 30)).length >= columns.length * .5
  const blocks = []
  let band = []
  const flush = () => {
    if (!band.length) return
    for (let col = 0; col < 2; col++) for (const row of band) blocks.push({text: row.cells[col].text.trim(), height: row.height, y: row.y, column: col})
    band = []
  }
  for (const row of paired) {
    if (twoColumns && columns.includes(row)) band.push(row)
    else {flush(); blocks.push({text: row.cells.map(cell => cell.text.trim()).join(' | '), height: row.height, y: row.y, table: row.cells.length > 1})}
  }
  flush()
  const typicalHeight = runs.map(r => r.height).sort((a, b) => a - b)[Math.floor(runs.length / 2)] || 12
  const paragraphs = []
  let previous
  for (const block of blocks) {
    const heading = block.height > typicalHeight * 1.2
    const newParagraph = !previous || heading || previous.heading || block.table || previous.table || block.column !== previous.column || previous.y - block.y > typicalHeight * 1.8 || /^(?:[•●▪\-–]|\d+[.)])\s/.test(block.text)
    if (newParagraph) paragraphs.push(block.text)
    else paragraphs[paragraphs.length - 1] += ' ' + block.text
    previous = {...block, heading}
  }
  const headings=blocks.filter(block=>block.height>typicalHeight*1.2&&block.text.length<=120&&!/[=∫Σ]/.test(block.text)).map(block=>block.text)
  return {text: paragraphs.join('\n\n'), blocks, headings, columns: twoColumns ? 2 : 1, ambiguous}
}

export async function extractStudyPdf(buffer) {
  // The native parser remains the compatibility path for legacy/synthetic PDFs.
  let native, nativeError
  try {native = extractPdfPagesAndText(buffer)} catch (error) {nativeError = error}
  let task
  try {
    const {getDocument} = await import('pdfjs-dist/legacy/build/pdf.mjs')
    task = getDocument({data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true, verbosity: 0})
    const pdf = await task.promise
    if (pdf.numPages > 600) throw Object.assign(new Error('Ce PDF dépasse 600 pages. Importez-le en plusieurs parties.'), {code: 'ERR_PDF_PAGE_LIMIT', status: 413})
    const pages = [], warnings = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const layout = layoutText((await page.getTextContent()).items, page.getViewport({scale: 1}).width)
      const compatibilityPage = native?.pages.find(p => p.pageNumber === pageNumber)
      pages.push({pageNumber, text: layout.ambiguous && compatibilityPage ? compatibilityPage.text : layout.text,headings:layout.headings})
      if (layout.ambiguous) warnings.push(`Page ${pageNumber} : positions de texte superposées ; ordre de compatibilité utilisé, à vérifier.`)
      if (!layout.text.trim()) warnings.push(`Page ${pageNumber} : aucun texte sélectionnable.`)
      if (layout.columns > 1) warnings.push(`Page ${pageNumber} : lecture en colonnes reconstruite, à vérifier dans le PDF.`)
      page.cleanup()
    }
    const totalText = pages.map(p => p.text).join('\n')
    if (totalText.replace(/\s/g, '').length < 50) {
      if (native) return {...native, extraction: {method: 'native', warnings: ['Lecture structurée insuffisante ; extraction de compatibilité utilisée.']}}
      if (nativeError && nativeError.code !== 'ERR_NO_EXTRACTABLE_TEXT') throw nativeError
      throw Object.assign(new Error('PDF scanné ou sans texte sélectionnable. Une transcription OCR est nécessaire.'), {code: 'ERR_NO_EXTRACTABLE_TEXT', pageCount: pdf.numPages})
    }
    return {pages, pageCount: pdf.numPages, totalText, extraction: {method: 'pdfjs', warnings}}
  } catch (error) {
    if (['ERR_NO_EXTRACTABLE_TEXT', 'ERR_PDF_PAGE_LIMIT'].includes(error.code)) throw error
    if (native) return {...native, extraction: {method: 'native', warnings: ['La mise en page a été extraite en mode de compatibilité. Vérifiez le texte avant génération.']}}
    throw nativeError || Object.assign(new Error('PDF illisible ou corrompu.'), {code: 'ERR_INVALID_PDF_STREAM'})
  } finally {await task?.destroy().catch(() => {})}
}
