export function validReading(value) {
  return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length<=500&&Object.entries(value).every(([id,r])=>id.length>0&&id.length<=100&&r&&Number.isInteger(r.percent)&&r.percent>=0&&r.percent<=100&&Number.isSafeInteger(r.updatedAt)&&r.updatedAt>=0&&r.updatedAt<=8640000000000000&&(r.section===undefined||typeof r.section==='string'&&r.section.length<=200))
}
export function mergeReading(incoming,current) {
  const result=Object.assign(Object.create(null),current)
  for(const [id,r] of Object.entries(incoming)) {
    const old=result[id]
    result[id]=old?{...(r.updatedAt>=old.updatedAt?r:old),percent:Math.max(r.percent,old.percent)}:r
  }
  return Object.fromEntries(Object.entries(result).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,500))
}
