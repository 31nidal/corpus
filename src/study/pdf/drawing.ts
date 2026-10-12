/** Freeze the SVG in a light, legible print palette, independent of zoom and theme. */
export async function drawingImage(svg:SVGSVGElement) {
  const copy=svg.cloneNode(true) as SVGSVGElement
  const ns='http://www.w3.org/2000/svg'
  copy.setAttribute('xmlns',ns)
  const originals=[svg,...svg.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')]
  const box=svg.viewBox.baseVal,width=box.width||640,height=box.height||410
  const measure=document.createElement('canvas').getContext('2d')!
  const wrap=(text:string,max:number,size:number)=>{
    measure.font=`${size}px Arial`;const lines:string[]=[];let line=''
    for(const word of text.trim().split(/\s+/)) {const next=line?line+' '+word:word;if(line&&measure.measureText(next).width>max){lines.push(line);line=word}else line=next}
    if(line)lines.push(line);return lines
  }
  const labels=[...svg.querySelectorAll<SVGTextElement>('text')]
  originals.forEach((element,index)=>{
    const clone=copies[index],style=getComputedStyle(element)
    for(const property of ['fill','stroke','stroke-width','opacity','paint-order','stroke-linecap','stroke-linejoin','stroke-dasharray','text-anchor'])clone.setAttribute(property,style.getPropertyValue(property))
    const fill=element.getAttribute('fill')||''
    if(fill.includes('--med-wash'))clone.setAttribute('fill','#eaf4f7')
    if(element.tagName.toLowerCase()==='text'){
      const label=element as SVGTextElement
      const x=Number(label.getAttribute('x')||0),y=Number(label.getAttribute('y')||0)
      const size=Math.min(12.5,Math.max(10,parseFloat(style.fontSize)||12))
      const next=labels.filter(other=>other!==element&&Math.abs(Number(other.getAttribute('y'))-y)<size*0.5&&Number(other.getAttribute('x'))>x).map(other=>Number(other.getAttribute('x')))
      const available=Math.max(65,Math.min(width-8,...next)-x-8)
      clone.setAttribute('font-family','Arial, sans-serif');clone.setAttribute('font-size',String(size));clone.setAttribute('font-weight','500')
      clone.setAttribute('fill','#234b5a');clone.setAttribute('stroke','#fff');clone.setAttribute('stroke-width','1.5');clone.setAttribute('paint-order','stroke fill')
      if(!element.children.length&&label.getAttribute('text-anchor')!=='middle'&&label.getAttribute('text-anchor')!=='end'){
        const lines=wrap(label.textContent||'',available,size)
        if(lines.length>1){
          clone.textContent=''
          lines.forEach((line,i)=>{const span=document.createElementNS(ns,'tspan');span.setAttribute('x',String(x));span.setAttribute('y',String(y+(i-(lines.length-1)/2)*size*1.15));span.textContent=line;clone.append(span)})
        }
      }
    }
  })
  copy.removeAttribute('class');copy.removeAttribute('style')
  const bounds:{x:number;y:number;w:number;h:number}[]=[]
  // HTML diagram nodes use percentages in the original viewBox: do not depend on the viewport.
  for(const button of svg.closest('.diagram-canvas')?.querySelectorAll<HTMLButtonElement>('button')||[]){
    const x=parseFloat(button.style.left)/100*width,y=parseFloat(button.style.top)/100*height
    const w=parseFloat(button.style.width)/100*width,h=parseFloat(button.style.height)/100*height
    if(![x,y,w,h].every(Number.isFinite))continue
    bounds.push({x,y,w,h})
    const group=document.createElementNS(ns,'g'),rect=document.createElementNS(ns,'rect')
    for(const [key,value] of Object.entries({x,y,width:w,height:h,rx:8,fill:'#edf6f6',stroke:'#bdd8da'}))rect.setAttribute(key,String(value))
    group.append(rect)
    const label=button.getAttribute('aria-label')||button.querySelector('strong')?.textContent||button.textContent||''
    const lines=wrap(label,w-16,12)
    lines.forEach((line,i)=>{
      const text=document.createElementNS(ns,'text');text.setAttribute('x',String(x+w/2));text.setAttribute('y',String(y+h/2+(i-(lines.length-1)/2)*15+4))
      text.setAttribute('text-anchor','middle');text.setAttribute('font-family','Arial, sans-serif');text.setAttribute('font-size','12');text.setAttribute('fill','#234b5a');text.textContent=line;group.append(text)
    });copy.append(group)
  }
  let renderedWidth=width,renderedHeight=height
  if(bounds.length){
    const edges=svg.getBBox()
    const x=Math.min(edges.x,...bounds.map(b=>b.x))-12,y=Math.min(edges.y,...bounds.map(b=>b.y))-12
    renderedWidth=Math.max(edges.x+edges.width,...bounds.map(b=>b.x+b.w))-x+12
    renderedHeight=Math.max(edges.y+edges.height,...bounds.map(b=>b.y+b.h))-y+12
    copy.setAttribute('viewBox',`${x} ${y} ${renderedWidth} ${renderedHeight}`)
  }
  copy.setAttribute('width',String(renderedWidth));copy.setAttribute('height',String(renderedHeight))
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}))
  try{
    const image=new Image();image.src=url;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(renderedWidth*3);canvas.height=Math.ceil(renderedHeight*3)
    const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height)
    return {data:canvas.toDataURL('PNG'),ratio:renderedHeight/renderedWidth}
  }finally{URL.revokeObjectURL(url)}
}
