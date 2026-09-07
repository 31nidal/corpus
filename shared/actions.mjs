export const actionNames = ['focus_structure','hide_structure','show_structure','isolate_structure','show_system','hide_system','reset_camera','start_animation']
export function validateAction(value, structureIds, systemIds, animationIds=[]) {
 if(!value || typeof value!=='object' || !actionNames.includes(value.action))return null
 if(value.action==='reset_camera')return {action:value.action}
 if(value.action==='start_animation')return animationIds.includes(value.animation)?{action:value.action,animation:value.animation}:null
 if(value.action.endsWith('_system'))return systemIds.includes(value.system)?{action:value.action,system:value.system}:null
 return structureIds.includes(value.structure)?{action:value.action,structure:value.structure}:null
}
