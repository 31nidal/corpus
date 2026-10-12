import {jsPDF} from 'jspdf'

const EXCLUDED='button,input,textarea,select,.course-document-actions,.course-feedback-panel,.course-notebook,.course-completion,.next-chapter,.reading-progress,.medical-toolbar,.medical-legend,.medical-scroll-bar-hint,.diagram-header-controls,.diagram-top-bar,.diagram-navigation,.diagram-pan-hint,.diagram-modal-overlay'
let fontPromise:Promise<string>|undefined
function loadFont() {
  return fontPromise??=fetch('/fonts/NotoSans-Regular.ttf').then(async response=>{
    if(!response.ok)throw new Error('Police PDF indisponible')
    const bytes=new Uint8Array(await response.arrayBuffer())
    let binary=''
    for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192))
    return btoa(binary)
  }).catch(error=>{fontPromise=undefined;throw error})
}

async function drawingImage(svg:SVGSVGElement) {
  const copy=svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg')
  const originals=[svg,...svg.querySelectorAll('*')]
  const copies=[copy,...copy.querySelectorAll('*')]
  originals.forEach((element,index)=>{
    const style=getComputedStyle(element)
    for(const property of ['fill','stroke','stroke-width','font-size','font-family','font-weight','opacity','paint-order'])copies[index].setAttribute(property,style.getPropertyValue(property))
    if(element.tagName.toLowerCase()==='text') {copies[index].setAttribute('fill','#234b5a');copies[index].setAttribute('stroke','#fff')}
  })
  copy.removeAttribute('class');copy.removeAttribute('style')
  const box=svg.viewBox.baseVal
  const width=box.width||640,height=box.height||410
  const svgRect=svg.getBoundingClientRect()
  for(const button of svg.closest('.diagram-canvas')?.querySelectorAll('button')||[]) {
    const bounds=button.getBoundingClientRect()
    const x=(bounds.x-svgRect.x)/svgRect.width*width,y=(bounds.y-svgRect.y)/svgRect.height*height
    const group=document.createElementNS('http://www.w3.org/2000/svg','g')
    const rect=document.createElementNS(group.namespaceURI,'rect')
    for(const [key,value] of Object.entries({x,y,width:bounds.width/svgRect.width*width,height:bounds.height/svgRect.height*height,rx:5,fill:'#eaf4f7',stroke:'#bbd3dc'}))rect.setAttribute(key,String(value))
    group.append(rect)
    const label=document.createElementNS(group.namespaceURI,'text')
    label.setAttribute('x',String(x+6));label.setAttribute('y',String(y+17));label.setAttribute('fill','#234b5a');label.setAttribute('font-size','11')
    label.textContent=(button.textContent||'').replace(/\s+/g,' ').trim()
    group.append(label);copy.append(group)
  }
  copy.setAttribute('width',String(width));copy.setAttribute('height',String(height))
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}))
  try {
    const image=new Image()
    image.src=url
    await image.decode()
    const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2
    const context=canvas.getContext('2d')!
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height)
    context.drawImage(image,0,0,canvas.width,canvas.height)
    return {data:canvas.toDataURL('PNG'),ratio:height/width}
  } finally {URL.revokeObjectURL(url)}
}

export async function downloadCoursePdf(article:HTMLElement,title:string) {
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true,putOnlyUsedFonts:true})
  pdf.addFileToVFS('NotoSans.ttf',await loadFont())
  pdf.addFont('NotoSans.ttf','NotoSans','normal');pdf.setFont('NotoSans')
  pdf.setProperties({title,author:'MyCorpus',subject:'Cours'})
  const margin=17,width=176,bottom=278
  let y=21
  function space(height:number) {if(y+height>bottom){pdf.addPage();y=21}}
  function text(value:string,size=10,gap=3) {
    const clean=value.replace(/\s+/g,' ').trim()
    if(!clean)return
    pdf.setFontSize(size);pdf.setTextColor(23,44,53)
    const lines=pdf.splitTextToSize(clean,width) as string[]
    const lineHeight=size*0.3528*1.5
    for(const line of lines){space(lineHeight);pdf.text(line,margin,y);y+=lineHeight}
    y+=gap
  }
  text(title,21,7)
  async function visit(element:Element):Promise<void> {
    if(element.matches(EXCLUDED))return
    const tag=element.tagName.toLowerCase()
    if(tag==='svg') {
      if(!element.matches('.medical-svg-root,.diagram-canvas>svg'))return
      const image=await drawingImage(element as SVGSVGElement)
      const height=Math.min(width*image.ratio,190),imageWidth=height/image.ratio
      space(height+6);pdf.addImage(image.data,'PNG',margin+(width-imageWidth)/2,y,imageWidth,height);y+=height+6;return
    }
    if(tag==='h1')return
    if(tag==='a') {const href=(element as HTMLAnchorElement).getAttribute('href')||'';text((element.textContent||'')+(/^https?:\/\//.test(href)?` (${href})`:''),9,2);return}
    if(/^h[2-6]$/.test(tag)){space(20);text(element.textContent||'',tag==='h2'?14:12,4);return}
    if(tag==='table') {
      const rows=[...element.querySelectorAll('tr')].filter(row=>row.closest('table')===element)
      const columns=Math.max(1,...rows.map(row=>row.children.length)),cellWidth=width/columns
      pdf.setFontSize(9);pdf.setTextColor(23,44,53)
      const renderRow=(row:Element)=>{
        const cells=[...row.children].map(cell=>pdf.splitTextToSize((cell.textContent||'').replace(/\s+/g,' ').trim(),cellWidth-4) as string[])
        const lineCount=Math.max(1,...cells.map(cell=>cell.length))
        let offset=0
        while(offset<lineCount) {
          space(9)
          const count=Math.min(lineCount-offset,Math.max(1,Math.floor((bottom-y-4)/4.8)))
          const height=count*4.8+4
          cells.forEach((lines,index)=>{
            const x=margin+index*cellWidth
            pdf.setDrawColor(203,213,220)
            pdf.setFillColor(...(row.querySelector('th')?[234,244,247]:[255,255,255]) as [number,number,number])
            pdf.rect(x,y,cellWidth,height,'FD')
            lines.slice(offset,offset+count).forEach((line,lineIndex)=>pdf.text(line,x+2,y+5+lineIndex*4.8))
          })
          y+=height;offset+=count
        }
      }
      rows.forEach(renderRow)
      y+=3;return
    }
    if(['p','li','summary','blockquote','textarea'].includes(tag)) {text((tag==='li'?'• ':'')+(element.textContent||''));return}
    for(const node of element.childNodes) {
      if(node.nodeType===Node.ELEMENT_NODE)await visit(node as Element)
      else if(node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())text(node.textContent,9,2)
    }
  }
  await visit(article)
  const pages=pdf.getNumberOfPages()
  for(let page=1;page<=pages;page++) {
    pdf.setPage(page);pdf.setFontSize(8);pdf.setTextColor(100,116,125)
    pdf.text('MyCorpus',margin,289);pdf.text(`${page} / ${pages}`,193,289,{align:'right'})
  }
  const filename='mycorpus-'+title.replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,100)+'.pdf'
  const url=URL.createObjectURL(pdf.output('blob'))
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}
