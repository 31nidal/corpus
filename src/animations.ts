/** Extensible presentation animations. These are illustrative deformations, not physiological simulations. */
export const animationRegistry = [
 {id:'heartbeat',name:'Battement illustratif',targets:['FMA7088'],period:1,amplitude:.025},
 {id:'breathing',name:'Respiration illustrative',targets:['FMA7309','FMA7310'],period:4,amplitude:.035},
] as const
export type AnimationState={id:string;playing:boolean}|null
