// PDF.js' standard build assumes APIs absent from Safari 18.5 (notably
// Map.getOrInsertComputed and Math.sumPrecise). Use the official compatible
// build and matching worker already shipped in the installed dependency.
import {GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs'
import type {PDFPageProxy} from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl
export * from 'pdfjs-dist/legacy/build/pdf.mjs'

/** Safari 18 lacks async iteration on streams, including with PDF.js legacy.
 * Aggregate its public text stream with a reader, preserving items/styles/lang.
 * Modern browsers retain PDF.js' own implementation; no global stream patch.
 */
export async function readPageText(page: PDFPageProxy) {
  if (typeof Reflect.get(ReadableStream.prototype, Symbol.asyncIterator) === 'function') return page.getTextContent()
  const reader = page.streamTextContent().getReader()
  const text: Awaited<ReturnType<PDFPageProxy['getTextContent']>> = {
    items: [], styles: Object.create(null), lang: null,
  }
  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) return text
      text.lang ??= value.lang
      Object.assign(text.styles, value.styles)
      text.items.push(...value.items)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {reader.releaseLock()}
}
