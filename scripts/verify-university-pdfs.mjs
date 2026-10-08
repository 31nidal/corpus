import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {extractPdfPagesAndText} from '../server/pdfExtractor.mjs'
const directory=process.argv[2]
if(!directory)throw new Error('Usage : node scripts/verify-university-pdfs.mjs <dossier des quatre PDF>')
export const corpus=[
  {
    "name": "cardiologie-uness",
    "url": "https://archives.uness.fr/sites/campus-unf3s-2014/semiologie-cardiologique/enseignement/cardiologie/site/html/cours.pdf",
    "bytes": 1304520,
    "status": "downloaded",
    "sha256": "6871cb0b189e0a99baf26c8d99be7d06cb5037692ef790cb10cc37938ebb3050",
    "pages": 18
  },
  {
    "name": "physiologie-grenoble",
    "url": "https://archives.uness.fr/sites/unf3s/media/paces/Grenoble_1112/ribuot_christophe/ribuot_christophe_p07/ribuot_christophe_p07.pdf",
    "bytes": 1365226,
    "status": "downloaded",
    "sha256": "7e81b2060d74374bf46b0500d9ed1ad85bd350a300b9c8843d0e9066abee13ed",
    "pages": 29
  },
  {
    "name": "pharmacologie-lyon",
    "url": "https://clarolineconnect.univ-lyon1.fr/clarolinepdfplayerbundle/pdf/4466446",
    "bytes": 1592121,
    "status": "downloaded",
    "sha256": "698fdb0bd16e660900399a1717513f2887e735435d1da7e36529539f9b76ae65",
    "pages": 70
  },
  {
    "name": "cardiologie-college",
    "url": "https://archives.uness.fr/sites/campus-unf3s-2015/UNF3Smiroir/campus-numeriques/cardiologie-et-maladies-vasculaires/poly-cardiologie-et-maladies-vasculaires1.pdf",
    "bytes": 5233127,
    "status": "downloaded",
    "sha256": "b99ed323d1f8120ad92c7e5b9303075559702327280b16f7994754ec9b73f51a",
    "pages": 125
  }
]
for(const item of corpus){
 const bytes=readFileSync(path.join(directory,item.name+'.pdf'))
 assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.name+' : document différent du benchmark')
 const result=extractPdfPagesAndText(bytes)
 assert.equal(result.pageCount,item.pages,item.name+' : pages manquantes')
 assert.ok(result.totalText.length>1000,item.name+' : texte insuffisant')
 console.log(JSON.stringify({name:item.name,pages:result.pageCount,characters:result.totalText.length}))
}
