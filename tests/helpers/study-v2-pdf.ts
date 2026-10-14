import {deflateSync} from 'node:zlib'

export function referencePdf({width=612,height=792}: {width?:number;height?:number} = {}) {
  const objects: Buffer[] = []
  const put = (id: number, value: string | Buffer) => objects[id - 1] = Buffer.concat([Buffer.from(`${id} 0 obj\n`), Buffer.isBuffer(value) ? value : Buffer.from(value), Buffer.from('\nendobj\n')])
  put(1, '<< /Type /Catalog /Pages 2 0 R >>')
  put(2, '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>')
  put(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>`)
  put(4, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>`)
  put(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const pages = [
    ['Chapitre 1 : Anatomie renale', 'Le rein filtre le plasma sanguin.', 'Le cortex renal contient les glomerules.', 'Le rein assure la filtration glomerulaire.'],
    ['Chapitre 2 : Physiologie renale', 'La filtration glomerulaire depend de la pression sanguine.', 'Le rein maintient la composition du milieu interieur.', 'Le debit sanguin renal contribue a la fonction renale.'],
  ]
  pages.forEach((lines, index) => {
    const bytes = deflateSync(Buffer.from('BT /F1 12 Tf 18 TL 72 712 Td ' + lines.map((line, index) => `${index === 0 ? '/F1 18 Tf' : '/F1 12 Tf'} (${line}) Tj T*`).join(' ') + ' ET'))
    put(index + 6, Buffer.concat([Buffer.from(`<< /Length ${bytes.length} /Filter /FlateDecode >>\nstream\n`), bytes, Buffer.from('\nendstream')]))
  })
  const parts = [Buffer.from('%PDF-1.4\n')], offsets = [0]
  for (const object of objects) {offsets.push(parts.reduce((sum, part) => sum + part.length, 0)); parts.push(object)}
  const start = parts.reduce((sum, part) => sum + part.length, 0)
  parts.push(Buffer.from(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`))
  return Buffer.concat(parts)
}
