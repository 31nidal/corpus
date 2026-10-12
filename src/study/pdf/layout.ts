import {jsPDF} from 'jspdf'

type TextStyle = {size?:number;bold?:boolean;color?:[number,number,number];indent?:number;gap?:number;width?:number}
const INK:[number,number,number]=[30,49,58],MUTED:[number,number,number]=[89,110,121],TEAL:[number,number,number]=[15,112,117]
export const cleanText=(value:string)=>value.replace(/\s+/g,' ').trim()

export class PdfLayout {
  readonly left=18
  readonly width=174
  readonly bottom=276
  y=29
  constructor(readonly pdf:jsPDF,readonly title:string) {}
  newPage(){this.pdf.addPage();this.y=27}
  ensure(height:number){if(this.y+height>this.bottom)this.newPage()}
  private style(style:TextStyle){this.pdf.setFont('NotoSans',style.bold?'bold':'normal');this.pdf.setFontSize(style.size??10);this.pdf.setTextColor(...(style.color??INK))}
  lines(value:string,style:TextStyle={}){this.style(style);return this.pdf.splitTextToSize(cleanText(value),style.width??this.width-(style.indent??0)) as string[]}
  height(value:string,style:TextStyle={}){return this.lines(value,style).length*(style.size??10)*0.3528*1.45+(style.gap??3)}
  text(value:string,style:TextStyle={}) {
    if(!cleanText(value))return
    const lines=this.lines(value,style),lineHeight=(style.size??10)*0.3528*1.45
    // Avoid leaving a single line of a paragraph at the foot of a page.
    this.ensure(Math.min(lines.length,2)*lineHeight)
    for(let index=0;index<lines.length;index++){
      if(lines.length-index===2&&this.y+2*lineHeight>this.bottom)this.newPage()
      this.ensure(lineHeight);this.style(style)
      this.pdf.text(lines[index],this.left+(style.indent??0),this.y+lineHeight*0.76)
      this.y+=lineHeight
    }
    this.y+=style.gap??3
  }
  heading(value:string,level=2){
    const style={size:level===2?13:10.5,bold:true,color:level===2?TEAL:INK,gap:3} satisfies TextStyle
    const top=level===2?6:3
    this.ensure(this.height(value,style)+top+12);this.y+=top;this.text(value,style)
  }
  muted(value:string){this.text(value,{size:8,color:MUTED,gap:2})}
  panel(title:string,paragraphs:string[],bullet=false){
    const total=this.height(title,{size:10,bold:true,width:this.width-12,gap:3})+paragraphs.reduce((sum,p)=>sum+this.height((bullet?'• ':'')+p,{size:9,width:this.width-12,gap:2}),0)+10
    if(total>this.bottom-27){this.heading(title,3);paragraphs.forEach(p=>this.text((bullet?'• ':'')+p,{size:9}));return}
    this.ensure(total+4)
    this.pdf.setFillColor(241,247,247);this.pdf.setDrawColor(214,230,231)
    this.pdf.roundedRect(this.left,this.y,this.width,total,2,2,'FD')
    this.y+=5;this.text(title,{size:10,bold:true,color:TEAL,indent:6,width:this.width-12,gap:3})
    paragraphs.forEach(p=>this.text((bullet?'• ':'')+p,{size:9,indent:6,width:this.width-12,gap:2}))
    this.y+=9
  }
  table(table:Element){
    const rows=[...table.querySelectorAll('tr')].filter(row=>row.closest('table')===table)
    const count=Math.max(1,...rows.map(row=>row.children.length))
    const widths=Array.from({length:count},()=>this.width/count)
    const header=rows[0]?.querySelector('th')?rows[0]:undefined
    const measure=(row:Element)=>[...row.children].map((cell,i)=>this.lines(cell.textContent||'',{size:8.5,bold:cell.tagName==='TH',width:widths[i]-6}))
    const draw=(row:Element,lines:string[][],offset:number,length:number)=>{
      const h=length*4.4+5
      let x=this.left
      lines.forEach((cell,index)=>{
        this.pdf.setFillColor(...(row===header?[231,241,242]:[255,255,255]) as [number,number,number]);this.pdf.setDrawColor(212,224,228)
        this.pdf.rect(x,this.y,widths[index],h,'FD');this.style({size:8.5,bold:row===header})
        cell.slice(offset,offset+length).forEach((line,i)=>this.pdf.text(line,x+3,this.y+5+i*4.4));x+=widths[index]
      });this.y+=h
    }
    for(const row of rows){
      const lines=measure(row),length=Math.max(1,...lines.map(cell=>cell.length))
      let offset=0
      while(offset<length){
        const remaining=(length-offset)*4.4+5
        if(this.y+Math.min(remaining,55)>this.bottom){
          this.newPage()
          if(header&&row!==header){const cells=measure(header);draw(header,cells,0,Math.max(...cells.map(cell=>cell.length)))}
        }
        const take=Math.min(length-offset,Math.max(1,Math.floor((this.bottom-this.y-5)/4.4)))
        draw(row,lines,offset,take);offset+=take
      }
    }
    this.y+=6
  }
  finish(){
    const pages=this.pdf.getNumberOfPages()
    for(let page=1;page<=pages;page++){
      this.pdf.setPage(page);this.pdf.setDrawColor(203,220,224);this.pdf.setLineWidth(0.25)
      this.pdf.line(this.left,20,192,20);this.pdf.line(this.left,283,192,283)
      this.style({size:9,bold:true,color:TEAL});this.pdf.text('MyCorpus',this.left,15)
      this.style({size:7.5,color:MUTED});this.pdf.text('COURS · DOCUMENT DE LECTURE',192,15,{align:'right'})
      let label=this.title
      while(this.pdf.getTextWidth(label)>140)label=label.slice(0,-2)
      if(label!==this.title)label+='…'
      this.pdf.text(label,this.left,289);this.pdf.text(`${page} / ${pages}`,192,289,{align:'right'})
    }
  }
}
