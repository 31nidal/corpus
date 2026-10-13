const clean = text => text.normalize('NFC').replace(/\u00ad/g, '').replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/\u0000/g, '')
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] || 12

function makeRows(runs) {
  const rows = []
  // Attach smaller raised/lowered glyphs to their main baseline, rather than
  // turning indices into independent lines (and subsequently section titles).
  for (const run of [...runs].sort((a, b) => b.height - a.height || b.y - a.y)) {
    const row = rows.find(row => Math.abs(row.y - run.y) <= Math.min(row.height, run.height) * .3)
      || rows.find(row => run.height < row.height * .85 && Math.abs(row.y - run.y) <= row.height * .65
        && row.runs.some(base => Math.abs(base.x + base.width - run.x) < row.height || (run.x >= base.x && run.x <= base.x + base.width)))
    if (row) row.runs.push(run)
    else rows.push({y: run.y, height: run.height, runs: [run]})
  }
  for (const row of rows) row.runs.sort((a, b) => a.x - b.x)
  return rows.sort((a, b) => b.y - a.y)
}

function cellsFor(row) {
  const cells = []
  for (const run of row.runs) {
    const previous = cells.at(-1)
    const gap = previous ? run.x - previous.end : 0
    const script = run.height < row.height * .85 && Math.abs(run.y - row.y) > row.height * .18
    let text = run.text
    if (script) text = `${run.y > row.y ? '^' : '_'}{${text}}`
    if (!previous || gap > Math.max(18, row.height * 2)) cells.push({text, x: run.x, end: run.x + run.width})
    else {
      previous.text += !script && gap > row.height * .12 && !/\s$/.test(previous.text) && !/^\s/.test(text) ? ' ' + text : text
      previous.end = Math.max(previous.end, run.x + run.width)
    }
  }
  return cells
}

function paragraphsFor(rows, typicalHeight, column) {
  const blocks = [], paragraphs = [], headings = []
  let previous, code = []
  const flushCode = () => {
    if (!code.length) return
    const left = Math.min(...code.map(line => line.x))
    const unit = median(code.flatMap(line => line.runs.filter(run => run.text.length > 0).map(run => run.width / run.text.length)))
    const lines = code.map(line => ' '.repeat(Math.max(0, Math.round((line.x - left) / unit))) + line.text.replace(/␣/g, ' '))
    paragraphs.push('```\n' + lines.join('\n') + '\n```')
    code = []
  }
  for (const row of rows) {
    const cells = cellsFor(row)
    const text = cells.map(cell => cell.text.trim()).join(' | ')
    const isCode = row.runs.filter(run => run.monospace).reduce((n, run) => n + run.text.length, 0) > text.length * .6
    const mathematical = row.runs.some(run => run.math) || /[=∫∑Σ≤≥⩽⩾]|[_^]\{/.test(text)
    const heading = !isCode && !mathematical && row.height > typicalHeight * 1.2 && text.length <= 120
      && /\p{L}{3}/u.test(text) && !/^\s*[|\d\W]+$/u.test(text)
    const table = cells.length > 1 && !mathematical && !isCode
    const block = {text, height: row.height, y: row.y, column, heading, table, code: isCode}
    blocks.push(block)
    if (heading) headings.push(text)
    if (isCode) {
      if (previous && !previous.code) flushCode()
      let codeText = '', previousRun
      const unit = median(row.runs.map(run => run.width / run.text.length))
      for (const run of row.runs) {
        const gap = previousRun ? run.x - previousRun.x - previousRun.width : 0
        if (gap > unit * .35 && !/\s$/.test(codeText)) codeText += ' '.repeat(Math.min(80, Math.round(gap / unit)))
        codeText += run.text.replace(/␣/g, ' ')
        previousRun = run
      }
      code.push({text: codeText, x: row.runs[0].x, runs: row.runs})
      previous = block
      continue
    }
    flushCode()
    const newParagraph = !previous || previous.code || heading || previous.heading || table || previous.table
      || mathematical || previous.mathematical || previous.column !== column || previous.y - row.y > typicalHeight * 1.8
      || /^(?:[•●▪\-–]|\d+[.)])\s/.test(text)
    if (newParagraph) paragraphs.push(text)
    else paragraphs[paragraphs.length - 1] += ' ' + text
    previous = {...block, mathematical}
  }
  flushCode()
  return {paragraphs, blocks, headings}
}

export function layoutText(items, pageWidth, styles = {}) {
  const runs = items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => ({
    text: clean(item.str), x: item.transform[4], y: item.transform[5], width: item.width,
    height: Math.max(item.height || Math.abs(item.transform[3]), 1),
    monospace: styles[item.fontName]?.fontFamily === 'monospace',
    math: /(?:Math|MSAM|MSBM|CMSY|CMMI|CMEX)/i.test(styles[item.fontName]?.name || ''),
  }))
  const rows = makeRows(runs)
  const typicalHeight = median(runs.filter(run => run.text.length >= 15).map(run => run.height))
  const pairs = rows.map(row => cellsFor(row)).filter(cells => cells.length === 2 && cells[0].end < pageWidth * .56 && cells[1].x > pageWidth * .4)
  const prosePairs = pairs.filter(cells => cells.every(cell => cell.text.length >= 30))
  const twoColumns = prosePairs.length >= 4 && prosePairs.length >= pairs.length * .5
  const gutter = twoColumns ? median(prosePairs.map(cells => (cells[0].end + cells[1].x) / 2)) : null
  const segments = []
  let band = []
  const flush = () => {
    if (!band.length) return
    if (!twoColumns) segments.push({runs: band, column: 0})
    else {
      // Include short and unpaired lines too. A paragraph continuing in only
      // one column must not flush the band and interleave the other column.
      for (const column of [0, 1]) segments.push({runs: band.filter(run => (run.x + run.width / 2 < gutter ? 0 : 1) === column), column})
    }
    band = []
  }
  for (const row of rows) {
    const fullWidth = twoColumns && row.runs.some(run => run.x < gutter - 15 && run.x + run.width > gutter + 15)
    if (fullWidth) {flush(); segments.push({runs: row.runs, column: -1})}
    else band.push(...row.runs)
  }
  flush()
  const result = segments.filter(segment => segment.runs.length).map(segment => paragraphsFor(makeRows(segment.runs), typicalHeight, segment.column))
  const ambiguous = rows.some(row => row.runs.some((run, i) => i && row.runs[i - 1].x + row.runs[i - 1].width - run.x > run.height && run.text.length > 15 && row.runs[i - 1].text.length > 15))
  return {
    text: result.flatMap(part => part.paragraphs).join('\n\n'),
    blocks: result.flatMap(part => part.blocks), headings: result.flatMap(part => part.headings),
    columns: twoColumns ? 2 : 1, ambiguous,
  }
}

// AMSFonts encoding: MSAM slot 0x36 is leqslant, 0x3E is geqslant.
// https://ctan.net/fonts/amsfonts/doc/amsfndoc.pdf
// Restrict recovery to this named font and digit aliases; never reinterpret
// ordinary digits or infer a formula from the subject of the document.
export function recoverMathText(text, fontName) {
  if (!/(?:^|\+)MSAM(?:5|6|7|8|9|10)$/.test(fontName || '')) return text
  return text.replace(/6/g, '⩽').replace(/>/g, '⩾')
}
