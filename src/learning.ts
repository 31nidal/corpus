import lessons from './data/learning.json' with {type:'json'}
import profiles from './data/profiles.json' with {type:'json'}
import type {Structure} from './types'
export type LearningLevel='discovery'|'student'|'advanced'
export {lessons}
export function lessonFor(s:Structure|null|undefined){
 if(!s)return null
 const exact=lessons.find(l=>l.id===s.id);if(exact)return exact
 const aliases:[RegExp,string][]=[[/third ventricle|fourth ventricle|lateral ventricle/,'FMA50801'],[/lung|bronch|trachea/,'FMA7309'],[/kidney|renal/,'FMA7204'],[/heart|atrium|ventric|coronary/,'FMA7088'],[/liver|hepati/,'FMA7197'],[/pancrea/,'FMA7198'],[/stomach/,'FMA7148'],[/brain|cerebr/,'FMA50801'],[/intestin|ileum|jejunum|duoden/,'FMA7200'],[/femur/,'FMA24474']]
 return lessons.find(l=>l.id===aliases.find(([re])=>re.test(s.name))?.[1])??null
}
export function profileFor(s:Structure){
 const kind=s.group==='muscles'?'muscle':['arteries','veins'].includes(s.group)?'vessel':null
 return profiles.find(p=>p.kind===kind&&new RegExp(p.pattern).test(s.name))??null
}
