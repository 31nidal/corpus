export const MAX_SOURCE_SELECTION_CHARACTERS=10000
export const canonicalSource = text => String(text).normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
const invalid=message=>Object.assign(new Error(message),{status:400})

/** The client supplies a locator, never trusted generation text. */
export function selectSourcePassage(db,userId,document,sections,selection,{minCharacters=35}={}) {
  const pageCount=document.pageCount??document.page_count
  if(!selection||typeof selection!=='object'||Array.isArray(selection)||Object.keys(selection).some(key=>!['page','text'].includes(key))||!Number.isSafeInteger(selection.page)||selection.page<1||selection.page>pageCount||typeof selection.text!=='string'||selection.text.trim().length<minCharacters||selection.text.length>MAX_SOURCE_SELECTION_CHARACTERS)throw invalid('Passage sélectionné invalide.')
  const page=db.prepare('SELECT text FROM study_pdf_pages WHERE document_id=? AND user_id=? AND page_number=?').get(document.id,userId,selection.page)
  const text=canonicalSource(selection.text)
  if(!text||!page||!canonicalSource(page.text).includes(text))throw invalid('Le passage ne correspond pas au texte source de cette page.')
  const section=sections.find(section=>section.startPage<=selection.page&&section.endPage>=selection.page&&canonicalSource(section.content).includes(text))
  if(!section)throw invalid('Sélectionnez un passage à l’intérieur d’une seule section du cours.')
  return {...section,content:text,startPage:selection.page,endPage:selection.page}
}
