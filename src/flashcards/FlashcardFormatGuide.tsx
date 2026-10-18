import type {NoteType} from './flashcardsTypes'

export const flashcardFormats = [
 {id:'basic',name:'Question / réponse',use:'Pour comprendre et retenir une notion.',description:'Une question au recto, sa réponse au verso. Vous cherchez la réponse avant de la dévoiler.',front:'Que signifie ce terme ?',back:'Sa définition et les points à retenir.'},
 {id:'reverse',name:'Carte inversée',use:'Pour retrouver un terme à partir de sa définition.',description:'La carte est présentée dans le sens inverse de votre saisie : le verso devient la question.',front:'Une définition',back:'Le terme correspondant'},
 {id:'bidirectional',name:'Dans les deux sens',use:'Pour associer un terme et sa définition.',description:'Une seule saisie crée deux cartes : question → réponse et réponse → question. Vous révisez chaque sens séparément.',front:'Terme ⇄ définition',back:'Deux cartes avec des révisions distinctes'},
 {id:'cloze',name:'Texte à trous',use:'Pour mémoriser un mot précis dans son contexte.',description:'Vous masquez un ou plusieurs passages d’une phrase. Chaque numéro de trou crée une carte.',front:'Le […] est le terme à retrouver.',back:'La phrase complète avec le mot révélé.'},
 {id:'typed',name:'Réponse à saisir',use:'Pour vérifier que vous retrouvez un terme sans indice.',description:'Vous tapez votre réponse avant de la comparer à la réponse attendue. Vous pouvez définir des variantes acceptées.',front:'Quel est le nom de cette structure ?',back:'Votre saisie comparée au terme attendu'},
 {id:'image_occlusion',name:'Image à masquer',use:'Pour apprendre un schéma ou une illustration.',description:'Importez une image et placez des masques sur les éléments à identifier. La correction révèle la zone cachée.',front:'Une légende masquée sur un schéma',back:'La légende révélée sur la même image'},
 {id:'atlas_3d',name:'Repérage en 3D',use:'Pour reconnaître une structure dans son contexte anatomique.',description:'Dans l’atlas, sélectionnez une structure puis choisissez « Créer une flashcard 3D ». La carte conserve votre scène.',front:'Une structure à identifier dans la scène 3D',back:'Son nom et sa position dans le modèle'},
] as const
export type FlashcardFormatId = typeof flashcardFormats[number]['id']
export function FlashcardFormatExplanation({type}:{type:NoteType}) {
 const format=flashcardFormats.find(format=>format.id===type)
 return format?<div className="flash-format-explanation" role="note"><strong>{format.use}</strong><p>{format.description}</p></div>:null
}
export default function FlashcardFormatGuide({choose,needsDeck=false,guest=false}:{choose:(id:FlashcardFormatId)=>void;needsDeck?:boolean;guest?:boolean}) {
 return <section className="flash-format-guide" aria-label="Choisir un type de flashcard">
  <div className="flash-format-heading"><span className="study-eyebrow">CRÉER À VOTRE FAÇON</span><h2>Quel type de carte choisir ?</h2><p>Commencez par une question / réponse. Choisissez un autre format selon ce que vous voulez mémoriser.</p></div>
  {needsDeck&&<p className="flash-format-notice">Créez d’abord un deck : c’est le dossier dans lequel vous rangerez vos cartes.</p>}
  <div className="flash-format-grid">{flashcardFormats.map((format,index)=><article key={format.id}>
   <span className="flash-format-number">0{index+1}{index===0?' · POUR COMMENCER':''}</span><h3>{format.name}</h3><p className="flash-format-use">{format.use}</p><p>{format.description}</p>
   <div className="flash-format-example"><small>EXEMPLE DE RECTO</small><p>{format.front}</p><small>APRÈS CORRECTION</small><p>{format.back}</p></div>
   <button className="study-secondary" onClick={()=>choose(format.id)}>{guest?'Se connecter pour créer':format.id==='atlas_3d'?'Choisir dans l’atlas':needsDeck?'Créer mon premier deck':format.id==='image_occlusion'?'Importer une image':'Créer ce type de carte'}</button>
  </article>)}</div>
 </section>
}
