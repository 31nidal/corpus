import {extractPdfPagesAndText} from '../pdfExtractor.mjs'

import {layoutText, recoverMathText} from './pdf-text.mjs'
export {layoutText} from './pdf-text.mjs'

export async function extractStudyPdf(buffer) {
  // The native parser remains the compatibility path for legacy/synthetic PDFs.
  let native, nativeError
  try {native = extractPdfPagesAndText(buffer)} catch (error) {nativeError = error}
  let task
  try {
    const {getDocument} = await import('pdfjs-dist/legacy/build/pdf.mjs')
    task = getDocument({data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true, fontExtraProperties: true, verbosity: 0})
    const pdf = await task.promise
    if (pdf.numPages > 600) throw Object.assign(new Error('Ce PDF dépasse 600 pages. Importez-le en plusieurs parties.'), {code: 'ERR_PDF_PAGE_LIMIT', status: 413})
    const pages = [], warnings = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      await page.getOperatorList()
      for (const [id, style] of Object.entries(content.styles)) {
        try {style.name = page.commonObjs.get(id).name} catch { /* Font metadata is optional. */ }
      }
      const items = content.items.map(item => ({...item, str: typeof item.str === 'string' ? recoverMathText(item.str, content.styles[item.fontName]?.name) : item.str}))
      const layout = layoutText(items, page.getViewport({scale: 1}).width, content.styles)
      const compatibilityPage = native?.pages.find(p => p.pageNumber === pageNumber)
      pages.push({pageNumber, text: layout.ambiguous && compatibilityPage ? compatibilityPage.text : layout.text,headings:layout.headings})
      if (layout.ambiguous) warnings.push(`Page ${pageNumber} : positions de texte superposées ; ordre de compatibilité utilisé, à vérifier.`)
      if (!layout.text.trim()) warnings.push(`Page ${pageNumber} : aucun texte sélectionnable.`)
      if (layout.columns > 1) warnings.push(`Page ${pageNumber} : lecture en colonnes reconstruite, à vérifier dans le PDF.`)
      if (items.filter(item => /(?:Math|MSAM|MSBM|CMSY|CMMI|CMEX)/i.test(content.styles[item.fontName]?.name || '')).length > 10) {
        warnings.push(`Page ${pageNumber} : formules composées ; vérifiez les fractions et valeurs absolues dans le PDF original avant de valider un support.`)
      }
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
