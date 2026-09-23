import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const meta = new Map(canonicalCourses.filter(item => item.subject === 'Anatomie').map(item => [item.id, item]))
const vessel = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways'
type D = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; source: string; glossary: NonNullable<Course['glossary']>; caseStudy: NonNullable<Course['caseStudy']> }
const s = (title: string, text: string) => ({ title, text })
const make = (id: string, d: D): Course => {
  const c = meta.get(id); if (!c) throw new Error(`Identifiant anatomique absent : ${id}`)
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 14, structure: null, objectives: d.objectives,
    sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer, source: d.source,
    sources: [{ label: 'OpenStax · Anatomy & Physiology 2e', url: d.source }], prerequisites: ['Topographie pelvienne et des membres inférieurs', 'Organisation des loges et des réseaux vasculaires'],
    glossary: d.glossary, caseStudy: d.caseStudy, review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}
export const lowerNeurovascularCourses: Course[] = [
  make('anat-femoral-popliteal-arteries', {
    objectives: ['Suivre l’axe iliaque externe-fémoral-poplité', 'Distinguer artère fémorale profonde et artère fémorale', 'Décrire les branches et repères de la fosse poplitée'],
    sections: [
      s('Passage sous le ligament inguinal', 'L’artère iliaque externe devient fémorale en passant sous le ligament inguinal, dans la lacune vasculaire, latéralement à la veine fémorale. Elle descend dans le trigone fémoral puis le canal des adducteurs, accompagnée par la veine et le nerf saphène distalement. Le nerf fémoral reste latéral à la gaine vasculaire.'),
      s('Branches superficielles et profonde', 'Les artères épigastrique superficielle, circonflexe iliaque superficielle et pudendales externes naissent habituellement près de l’origine fémorale. L’artère profonde de la cuisse part plus distalement et vascularise les muscles profonds ; elle donne des circonflexes médiale et latérale ainsi que des perforantes qui gagnent la loge postérieure.'),
      s('Canal des adducteurs', 'Le canal des adducteurs s’étend du sommet du trigone au hiatus du grand adducteur. Il est bordé par sartorius, vaste médial et adducteurs, et transmet artère et veine fémorales ainsi que nerf saphène. Le nerf saphène quitte le canal avant le hiatus, alors que les vaisseaux traversent ce dernier.'),
      s('Artère poplitée et branches', 'Après le hiatus, l’artère fémorale devient poplitée. Elle descend profondément dans la fosse poplitée, donne des branches géniculées supérieures et inférieures et des branches surales, puis se termine classiquement en artères tibiales antérieure et postérieure. La tibiale antérieure traverse la membrane interosseuse vers la loge antérieure.'),
      s('Réseaux anastomotiques et pouls', 'Le réseau géniculé relie branches fémorales, poplitées et récurrentes de jambe autour du genou. Le pouls fémoral se palpe sous le ligament inguinal, à mi-distance entre épine iliaque antérosupérieure et symphyse dans le repère classique. Le pouls poplité est profond et difficile d’accès ; une absence peut relever de technique ou de contexte circulatoire.'),
    ], trap: 'L’artère fémorale profonde vascularise les plans profonds de la cuisse ; elle n’est pas la continuation directe de l’axe vers le genou.', recall: 'À quel niveau l’artère fémorale devient-elle artère poplitée ?', answer: 'Lorsqu’elle traverse le hiatus de l’adducteur.', source: vessel, glossary: [['Artère profonde de la cuisse', 'Branche majeure de la fémorale irriguant surtout les tissus profonds de la cuisse.'], ['Canal des adducteurs', 'Passage fascial conduisant les vaisseaux fémoraux vers le hiatus de l’adducteur.'], ['Artère géniculée', 'Branche participant au réseau anastomotique périarticulaire du genou.']], caseStudy: { prompt: 'Une plaie profonde de la face postérieure de cuisse atteint une artère qui donne des branches perforantes. Quel axe est concerné ?', answer: 'L’artère profonde de la cuisse, dont les branches perforantes irriguent notamment les muscles postérieurs.' }
  }),
  make('anat-lower-limb-veins', {
    objectives: ['Comparer drainage veineux superficiel et profond de jambe', 'Suivre les veines saphènes grande et petite', 'Expliquer valvules, pompe musculaire et perforantes'],
    sections: [
      s('Réseau profond et retour', 'Les veines profondes accompagnent les artères tibiales antérieure et postérieure et fibulaire, puis convergent dans la veine poplitée et la veine fémorale. Elles contiennent des valvules et reçoivent la pression exercée par les muscles lors de la marche. La pompe musculaire et respiratoire facilite le retour vers le cœur contre la gravité.'),
      s('Grande veine saphène', 'La grande saphène naît du réseau veineux dorsal médial du pied, passe en avant de la malléole médiale et remonte sur la face médiale de jambe et de cuisse. Elle rejoint la veine fémorale au hiatus saphène près de la jonction saphéno-fémorale. Des veines perforantes la relient au réseau profond à plusieurs niveaux.'),
      s('Petite veine saphène', 'La petite saphène naît du côté latéral du réseau dorsal, passe derrière la malléole latérale et remonte dans le mollet. Elle se termine habituellement dans la veine poplitée, mais son trajet et ses communications avec la grande saphène sont variables. Le nerf sural accompagne une partie de son trajet superficiel.'),
      s('Valvules et perforantes', 'Les valvules veineuses limitent le reflux, tandis que les contractions des muscles profonds compriment les veines. Les veines perforantes orientent normalement le flux superficiel vers le profond ; une incompétence valvulaire peut inverser le gradient et favoriser hypertension veineuse superficielle. Les veines communicantes relient des réseaux d’un même plan.'),
      s('Anatomie clinique et prudence', 'Varices, thrombose veineuse profonde et insuffisance veineuse concernent des mécanismes distincts. Les repères saphènes sont utiles en chirurgie et pour certains prélèvements, mais les variations sont fréquentes. Un œdème, une douleur ou une asymétrie de jambe nécessitent une évaluation adaptée et ne se diagnostiquent pas par la seule anatomie de surface.'),
    ], trap: 'La grande saphène rejoint la fémorale ; la petite saphène rejoint habituellement la poplitée, avec des variations fréquentes.', recall: 'Quel rapport entre contraction des muscles du mollet et retour veineux profond ?', answer: 'La contraction comprime les veines profondes et propulse le sang vers le haut ; les valvules limitent le reflux.', source: vessel, glossary: [['Veine perforante', 'Veine traversant le fascia et reliant réseaux superficiel et profond.'], ['Jonction saphéno-fémorale', 'Terminaison de la grande saphène dans la veine fémorale.'], ['Pompe musculaire', 'Compression veineuse liée à la contraction musculaire facilitant le retour.']], caseStudy: { prompt: 'Une veine superficielle variqueuse communique par une perforante incompétente avec le réseau profond. Quel sens anormal de flux peut apparaître ?', answer: 'Un reflux du réseau profond vers le superficiel peut augmenter la pression veineuse superficielle.' }
  })
]
const prompts: Record<string, string[]> = {
  'anat-femoral-popliteal-arteries': ['Quelle artère prolonge l’iliaque externe sous le ligament inguinal ?', 'Quelle branche irrigue surtout les plans profonds de cuisse ?', 'Quel nerf quitte le canal des adducteurs avant le hiatus ?', 'Où l’artère fémorale devient-elle poplitée ?', 'Quelle branche poplitée traverse la membrane interosseuse ?'],
  'anat-lower-limb-veins': ['Où se termine habituellement la grande saphène ?', 'Où se termine habituellement la petite saphène ?', 'Quel rôle jouent les valvules veineuses ?', 'Dans quel sens les perforantes orientent-elles normalement le flux ?', 'Comment la pompe musculaire du mollet soutient-elle le retour veineux ?']
}
const answers: Record<string, string[]> = {
  'anat-femoral-popliteal-arteries': ['L’artère fémorale.', 'L’artère profonde de la cuisse.', 'Le nerf saphène.', 'Au hiatus du grand adducteur.', 'L’artère tibiale antérieure.'],
  'anat-lower-limb-veins': ['Dans la veine fémorale au hiatus saphène.', 'Dans la veine poplitée le plus souvent.', 'Elles réduisent le reflux sanguin vers le bas.', 'Du réseau superficiel vers le réseau profond.', 'Les contractions compriment les veines et propulsent le sang, les valvules empêchant le reflux.']
}
const wrong: Record<string, string[][]> = {
  'anat-femoral-popliteal-arteries': [['L’artère fémorale profonde.', 'L’artère poplitée.', 'L’artère obturatrice.'], ['L’artère tibiale antérieure.', 'L’artère pudendale externe.', 'L’artère dorsale du pied.'], ['Le nerf fémoral.', 'Le nerf obturateur.', 'Le nerf tibial.'], ['Au ligament inguinal.', 'Au canal obturateur.', 'Au bord inférieur du grand rond.'], ['L’artère tibiale postérieure.', 'L’artère fibulaire.', 'L’artère géniculée supérieure.']],
  'anat-lower-limb-veins': [['Dans la veine poplitée.', 'Dans la veine iliaque interne.', 'Dans la veine cave inférieure directement.'], ['Dans la veine fémorale.', 'Dans la veine tibiale antérieure.', 'Dans la veine iliaque commune.'], ['Elles accélèrent le flux vers le pied.', 'Elles relient deux plans sans traverser le fascia.', 'Elles assurent les échanges artérioveineux.'], ['Du réseau profond vers le superficiel en permanence.', 'De la veine cave vers les capillaires.', 'De la surface cutanée vers les artères.'], ['Elle bloque toute circulation veineuse pendant la marche.', 'Elle remplace les valvules et les rend inutiles.', 'Elle pousse le sang vers le pied en position debout.']]
}
const rationale: Record<string, string[]> = {
  'anat-femoral-popliteal-arteries': ['La fémorale commence au passage sous le ligament inguinal.', 'La profonde de cuisse donne les perforantes pour les plans profonds.', 'Le saphène sort avant que les vaisseaux traversent le hiatus.', 'Le hiatus marque le passage de la fémorale à la poplitée.', 'La tibiale antérieure traverse la membrane vers le compartiment antérieur.'],
  'anat-lower-limb-veins': ['La grande saphène se jette dans la fémorale à la jonction saphéno-fémorale.', 'La petite saphène rejoint le réseau poplité le plus souvent.', 'Elles limitent la colonne de sang rétrograde lors des changements de posture.', 'Le flux physiologique se dirige du superficiel vers les veines profondes.', 'Les muscles compriment les veines profondes et le système valvulaire limite le reflux.']
}
export const lowerNeurovascularQuestions: Question[] = lowerNeurovascularCourses.flatMap(c => prompts[c.id].map((prompt, i) => {
  const options = [answers[c.id][i], ...wrong[c.id][i]]
  return { id: `${c.id}-q${i + 1}`, course: c.id, topic: 'Anatomie', prompt, options, correct: [0], why: options.map((_, j) => j === 0 ? rationale[c.id][i] : 'Cette structure ou direction de flux ne correspond pas au trajet veineux/artériel décrit.'), difficulty: i < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const }
}))
