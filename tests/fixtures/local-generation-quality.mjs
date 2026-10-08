export const qualityLines = [
  'Chapitre 1 : Le rein',
  'Chapitre 2 : Physiologie renale et filtration.',
  'Partie 2 Fonctionnement du systeme cardiovasculaire.',
  'Figure 2 : coupe frontale du rein.',
  'Tableau 3 Valeurs de la pression arterielle.',
  'Schema 4 : organisation du tube collecteur.',
  "Le debit cardiaque est egal au produit de la frequence cardiaque par le volume d'ejection systolique.",
  "L'aldosterone agit sur le tube collecteur et augmente la reabsorption de sodium.",
  'Le rein filtre le plasma sanguin.',
  'Le rein filtre les substances dissoutes.',
  'Le coeur est situe dans le mediastin thoracique.',
  'Le pH sanguin vaut 7.40 au repos.',
]

// One-page selectable-text PDF, without compression; no external PDF dependency.
export function qualityPdf() {
  const content = 'BT /F1 12 Tf 72 740 Td 18 TL ' + qualityLines.map(line =>
    `(${line.replace(/[\\()]/g, value => '\\' + value)}) Tj T*`).join(' ') + ' ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n', offsets = [0]
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf)
}
