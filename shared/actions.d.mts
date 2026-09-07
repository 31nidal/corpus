export type SceneAction={action:'focus_structure'|'hide_structure'|'show_structure'|'isolate_structure';structure:string}|{action:'show_system'|'hide_system';system:string}|{action:'reset_camera'}|{action:'start_animation';animation:string}
export const actionNames:string[]
export function validateAction(value:unknown,structureIds:string[],systemIds:string[],animationIds?:string[]):SceneAction|null
