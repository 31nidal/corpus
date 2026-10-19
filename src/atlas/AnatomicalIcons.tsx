import type {SVGProps} from 'react'

type IconProps=SVGProps<SVGSVGElement>&{size?:number;strokeWidth?:number}
function Icon({size=28,strokeWidth=1.45,children,...props}:IconProps){
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>
}
/** Original vector drawings: simplified anatomical silhouettes, not diagnostic illustrations. */
export function AnatomicalHeartIcon(props:IconProps){return <Icon {...props} data-anatomy-icon="heart">
 <path d="M20 18c-5-5-10-2-11 4-2 10 8 17 19 20 5 1 9-8 9-16 0-6-3-10-7-11"/>
 <path d="M14 17V9h5v8M22 15V7h4v7M27 14V8h4v7M19 23c1-8 7-12 15-11v5c-6-1-9 2-10 7-1 6-7 5-11 11"/>
 <path d="m34 19 6-1 1 5-5 2M26 23c0 7 5 7 4 15M27 28l-4 5M18 13l-1-6"/>
 </Icon>}
export function AnatomicalBrainIcon(props:IconProps){return <Icon {...props} data-anatomy-icon="brain">
 <path d="M24 10c-3-7-11-5-13 1-5 0-8 5-6 10-5 4-3 10 1 12-1 7 6 11 11 8 3 3 7 0 7-4V10Z"/>
 <path d="M24 10c3-7 11-5 13 1 5 0 8 5 6 10 5 4 3 10-1 12 1 7-6 11-11 8-3 3-7 0-7-4V10Z"/>
 <path d="M11 11c-1 4 2 6 4 7M5 21c3-2 6-1 7 2M6 33c3 0 6-2 7-5M17 41c-3-3-1-6 1-7M24 25c-2-5-5-6-8-5M37 11c1 4-2 6-4 7M43 21c-3-2-6-1-7 2M42 33c-3 0-6-2-7-5M31 41c3-3 1-6-1-7M24 25c2-5 5-6 8-5"/>
 </Icon>}
export function SkullProfileIcon(props:IconProps){return <Icon {...props} data-anatomy-icon="skull">
 <path d="M12 35C4 29 5 17 11 11c7-7 19-6 25 1 3 4 3 9 2 12l4 6-4 2 1 4-3 2v5c-7 2-14-1-17-6l-5-2-2 8"/>
 <path d="M30 22c-5-3-9 0-8 4 1 4 5 4 8 2l1-6ZM35 27l-2 5 4-1M18 30l8 3 1 6M27 35h11M30 34v4M33 34v4M36 34v4M17 19c1 3 0 6-2 8M20 37l4 5"/>
 </Icon>}
export function VertebralColumnIcon(props:IconProps){
 const levels=[{x:25,y:5},{x:24,y:10},{x:22,y:15},{x:21,y:20},{x:22,y:25},{x:24,y:30},{x:26,y:35}]
 return <Icon {...props} data-anatomy-icon="spine"><path d="M28 3c3 7-6 14-3 23 1 5 6 9 5 15"/>
 {levels.map(({x,y},i)=><g key={y}><path d={`M${x-3} ${y}q3 1 7 0l1 4q-4 2-8 0Z`}/><path d={`M${x-3} ${y+1}l-5 1-1 2 6-1M${x-1} ${y+5}l5 .3`}/>{i===6&&<path d="m24 40 3 5 4-4"/>}</g>)}
 </Icon>
}
