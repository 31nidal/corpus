import type {Structure} from './types'
export const systems = [
 {id:'skeletal',name:'Squelette',match:(s:Structure)=>s.group==='skeleton'},
 {id:'muscular',name:'Musculaire',match:(s:Structure)=>s.group==='muscles'},
 {id:'cardiovascular',name:'Cardiovasculaire',match:(s:Structure)=>['arteries','veins'].includes(s.group)||/heart|atrium|(?:left|right) ventricle|wall of ventricle|cardiac|aortic valve|pulmonary valve/.test(s.name)},
 {id:'nervous',name:'Nerveux',match:(s:Structure)=>s.group==='nerves'||/(?:third|fourth|lateral) ventricle|brain|cerebr|cerebell|spinal cord|thalam|gyrus|medulla oblongata|pons|amygdala|fornix/.test(s.name)},
 {id:'digestive',name:'Digestif',match:(s:Structure)=>s.group==='organs'&&/liver|hepati|stomach|pancrea|intestin|colon|ileum|ileal|jejunum|duoden|rectum|esophag|oesophag|gallbladder|appendix|caec|cecum|mesenter/.test(s.name)},
 {id:'respiratory',name:'Respiratoire',match:(s:Structure)=>s.group==='organs'&&/lung|bronch|trachea|laryn|nasal/.test(s.name)},
 {id:'urinary',name:'Urinaire',match:(s:Structure)=>s.group==='organs'&&/kidney|ureter|urethra|urinary bladder/.test(s.name)},
 {id:'reproductive',name:'Reproducteur masculin',match:(s:Structure)=>s.group==='organs'&&/penis|testis|prostat|seminal|deferent|epididym|scrot/.test(s.name)},
 {id:'lymphatic',name:'Lymphatique · éléments disponibles',match:(s:Structure)=>/spleen|thymus|lymph node|lymphatic/.test(s.name)},
] as const
