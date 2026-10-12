import {jsPDF} from 'jspdf'
import {PdfLayout,cleanText} from './pdf/layout'
import {drawingImage} from './pdf/drawing'

const EXCLUDED='button,input,textarea,select,.course-document-actions,.course-feedback-panel,.course-notebook,.course-completion,.next-chapter,.reading-progress,.medical-toolbar,.medical-legend,.medical-scroll-bar-hint,.diagram-header-controls,.diagram-top-bar,.diagram-navigation,.diagram-pan-hint,.diagram-modal-overlay,.section-number,.flash-selection-action'
const fonts=new Map<string,Promise<string>>()
function loadFont(weight:string) {
  if(!fonts.has(weight))fonts.set(weight,fetch(`/fonts/NotoSans-${weight}.ttf`).then(async response=>{
    if(!response.ok)throw new Error('Police PDF indisponible')
    const bytes=new Uint8Array(await response.arrayBuffer());let binary=''
    for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192))
    return btoa(binary)
  }).catch(error=>{fonts.delete(weight);throw error}))
  return fonts.get(weight)!
}
const content=(node:Element|null)=>cleanText(node?.textContent||'')

export async function downloadCoursePdf(article:HTMLElement,title:string) {
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true,putOnlyUsedFonts:true})
  const [regular,bold]=await Promise.all([loadFont('Regular'),loadFont('Bold')])
  for(const [name,data,style] of [['Regular',regular,'normal'],['Bold',bold,'bold']]) {
    pdf.addFileToVFS(`NotoSans-${name}.ttf`,data);pdf.addFont(`NotoSans-${name}.ttf`,'NotoSans',style)
  }
  pdf.setProperties({title,author:'MyCorpus',subject:'Cours'})
  const layout=new PdfLayout(pdf,title)
  const eyebrow=article.querySelector(':scope > .study-eyebrow'),meta=article.querySelector(':scope > .course-meta')
  if(eyebrow)layout.muted(content(eyebrow))
  layout.text(title,{size:23,bold:true,gap:5})
  if(meta)layout.muted([...meta.children].map(content).join(' · '))
  layout.y+=3

  async function figure(element:Element,svg:SVGSVGElement) {
    const heading=content(element.querySelector('h2,h3')),caption=content(element.querySelector('figcaption p'))
    const image=await drawingImage(svg)
    const maxHeight=image.ratio>1.2?160:96
    let imageWidth=Math.min(164,maxHeight/image.ratio),imageHeight=imageWidth*image.ratio
    const prefix=(heading?layout.height(heading,{size:12,bold:true}):0)+(caption?layout.height(caption,{size:8.5}):0)
    const available=layout.bottom-layout.y-prefix-15
    if(available>=maxHeight*0.84&&available<imageHeight){imageHeight=available;imageWidth=imageHeight/image.ratio}
    // When a large figure needs its own page, use the introduction's remaining
    // space for a useful outline rather than shrinking labels below legible size.
    if(pdf.getNumberOfPages()===1&&layout.y+prefix+imageHeight+15>layout.bottom){
      const sections=[...article.querySelectorAll('.course-section h2')].map(content)
      const outlineHeight=sections.reduce((sum,section)=>sum+layout.height(section,{size:8.5,gap:2}),0)+16
      if(sections.length>=3&&layout.y+outlineHeight<layout.bottom){
        layout.heading('Dans ce cours',3)
        sections.forEach((section,index)=>layout.text(`${String(index+1).padStart(2,'0')}  ${section}`,{size:8.5,gap:2}))
      }
    }
    layout.ensure(prefix+imageHeight+15)
    if(heading)layout.text(heading,{size:12,bold:true,gap:3})
    if(caption)layout.text(caption,{size:8.5,color:[89,110,121],gap:4})
    pdf.setDrawColor(217,230,233);pdf.setLineWidth(0.25)
    pdf.roundedRect(layout.left,layout.y,layout.width,imageHeight+8,2,2)
    pdf.addImage(image.data,'PNG',layout.left+(layout.width-imageWidth)/2,layout.y+4,imageWidth,imageHeight)
    layout.y+=imageHeight+12
    const details=element.querySelector('.medical-viewer-footer,.diagram-explanation')
    if(details)await visit(details)
  }
  async function visit(element:Element):Promise<void> {
    if(element.matches(EXCLUDED)||element===eyebrow||element===meta)return
    const tag=element.tagName.toLowerCase()
    if(tag==='svg'||tag==='h1')return
    const svg=element.matches('.medical-plate,.interactive-diagram')?element.querySelector<SVGSVGElement>('.medical-svg-root,.diagram-canvas>svg'):null
    if(svg){await figure(element,svg);return}
    if(element.matches('.course-review')){
      layout.text(content(element.querySelector('strong')),{size:8,bold:true,gap:1})
      for(const p of element.querySelectorAll('p,small'))layout.muted(content(p))
      layout.y+=3;return
    }
    if(element.matches('.objectives')){layout.panel(content(element.querySelector('h2')),[...element.querySelectorAll('p')].map(content),true);return}
    if(element.matches('.course-prerequisites')){
      layout.text(content(element.querySelector('strong')),{size:9,bold:true,gap:1})
      for(const p of element.querySelectorAll('p,small'))layout.muted(content(p))
      layout.y+=3;return
    }
    if(element.matches('.exam-trap')){layout.panel(content(element.querySelector('h2')),[...element.querySelectorAll('p')].map(content));return}
    if(element.matches('.medical-point-title')){layout.heading([...element.children].map(child=>[...child.childNodes].map(node=>node.textContent||'').join(' ')).join(' · '),3);return}
    if(element.matches('.diagram-explanation')){layout.heading(content(element.querySelector('h3')),3);for(const p of element.querySelectorAll('p'))layout.text(content(p));return}
    if(element.matches('.medical-attribution')){layout.muted(content(element));return}
    if(element.matches('.mycourses-summary-card')){
      const heading=element.querySelector('h3')
      if(heading){layout.heading(content(heading.firstElementChild)||content(heading));if(heading.children[1])layout.muted(content(heading.children[1]))}
      for(const child of element.children)if(child!==heading)await visit(child)
      return
    }
    if(/^h[2-6]$/.test(tag)){
      const number=element.closest('.course-section')?.querySelector('.section-number')
      layout.heading((number?`${content(number)}  `:'')+content(element),tag==='h2'?2:3);return
    }
    if(tag==='table'){layout.table(element);return}
    if(tag==='a'){
      const href=element.getAttribute('href')||''
      layout.text(content(element),{size:9,bold:true,gap:1})
      if(/^https?:\/\//.test(href))layout.text(href,{size:7.5,color:[15,112,117],gap:3})
      return
    }
    if(tag==='ul'||tag==='ol'){
      const items=[...element.children].filter(child=>child.tagName==='LI')
      for(let i=0;i<items.length;i++){
        const copy=items[i].cloneNode(true) as Element
        if(element.closest('.course-flow'))copy.querySelector('span')?.remove()
        const nested=[...copy.querySelectorAll('ul,ol')];nested.forEach(node=>node.remove())
        layout.text(`${tag==='ol'?`${i+1}.`:'•'} ${content(copy)}`,{indent:3,width:layout.width-3,gap:2})
        for(const list of items[i].querySelectorAll(':scope > ul,:scope > ol'))await visit(list)
      }
      layout.y+=2;return
    }
    if(tag==='dt'){layout.text(content(element),{bold:true,gap:1});return}
    if(tag==='dd'){layout.text(content(element),{indent:3,gap:4});return}
    if(tag==='p'||tag==='blockquote'){layout.text(content(element));return}
    if(tag==='summary'){layout.text(content(element),{size:9,bold:true,gap:2});return}
    if(tag==='strong'){layout.text(content(element),{bold:true});return}
    if(tag==='small'||element.matches('.study-eyebrow,.medical-category-tag')){layout.muted(content(element));return}
    const hasBlocks=element.querySelector(':scope > p,:scope > div,:scope > section,:scope > article,:scope > aside,:scope > figure,:scope > ul,:scope > ol,:scope > dl,:scope > h2,:scope > h3,:scope > h4,:scope > details,:scope > footer,:scope > table,:scope > dt,:scope > dd')
    if(!hasBlocks&&!element.querySelector('svg')&&content(element)){layout.text([...element.childNodes].map(node=>node.textContent||'').join(' '),{size:9});return}
    for(const node of element.childNodes){
      if(node.nodeType===Node.ELEMENT_NODE)await visit(node as Element)
      else if(node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())layout.text(node.textContent)
    }
  }
  await visit(article)
  layout.finish()
  const filename='mycorpus-'+title.replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,100)+'.pdf'
  const url=URL.createObjectURL(pdf.output('blob'))
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}
