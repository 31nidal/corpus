import type {Structure} from './types'
export const systems = [
 {id:'skeletal',name:'Squelette',match:(s:Structure)=>s.group==='skeleton'},
 {id:'articular',name:'Articulations et cartilages disponibles',match:(s:Structure)=>s.group==='joints'},
 {id:'integumentary',name:'Tégumentaire · éléments disponibles',match:(s:Structure)=>s.group==='skin'},
 {id:'endocrine',name:'Endocrinien · éléments disponibles',match:(s:Structure)=>s.group==='organs'&&/thyroid|parathyroid|adrenal|suprarenal|pituitary|hypophysis/.test(s.name)},
 {id:'sensory',name:'Organes des sens · éléments disponibles',match:(s:Structure)=>s.group==='organs'&&/eyeball|retina|sclera|cornea|lens|cochlea|vestibul|tympan|external ear|middle ear|inner ear/.test(s.name)},
 {id:'reproductive-female',name:'Reproducteur féminin · éléments disponibles',match:(s:Structure)=>/uterus|uterine|ovary|ovarian|vagina|vulva|clitoris|labium|fallopian/.test(s.name)},
 {id:'muscular',name:'Musculaire',match:(s:Structure)=>s.group==='muscles'},
 {id:'cardiovascular',name:'Cardiovasculaire',match:(s:Structure)=>['arteries','veins'].includes(s.group)||/heart|atrium|(?:left|right) ventricle|wall of ventricle|cardiac|aortic valve|pulmonary valve|mitral valve|tricuspid valve|interatrial septum|interventricular septum/.test(s.name)},
 {id:'nervous',name:'Nerveux',match:(s:Structure)=>s.group==='nerves'||/(?:third|fourth|lateral) ventricle|brain|cerebr|cerebell|spinal cord|thalam|gyrus|medulla oblongata|pons|amygdala|fornix/.test(s.name)},
 {id:'digestive',name:'Digestif',match:(s:Structure)=>s.group==='organs'&&/liver|hepati|stomach|pancrea|intestin|colon|ileum|ileal|jejunum|duoden|rectum|esophag|oesophag|gallbladder|appendix|caec|cecum|mesenter/.test(s.name)},
 {id:'respiratory',name:'Respiratoire',match:(s:Structure)=>s.group==='organs'&&/lung|bronch|trachea|laryn|nasal/.test(s.name)},
 {id:'urinary',name:'Urinaire',match:(s:Structure)=>s.group==='organs'&&/kidney|ureter|urethra|urinary bladder|renal papilla|renal pyramid|renal column|renal pelvis/.test(s.name)},
 {id:'reproductive',name:'Reproducteur masculin',match:(s:Structure)=>s.group==='organs'&&/penis|testis|prostat|seminal|deferent|epididym|scrot/.test(s.name)},
 {id:'lymphatic',name:'Lymphatique · éléments disponibles',match:(s:Structure)=>/spleen|thymus|lymph node|lymphatic/.test(s.name)},
] as const
