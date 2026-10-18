import {readFile,writeFile} from 'node:fs/promises'
import {systems} from '../src/systems.ts'
import {assemblyComponents,vertebraCode} from '../src/atlas/anatomicalGraph.ts'
const root = new URL('../',import.meta.url)
const male=JSON.parse(await readFile(new URL('public/models/manifest.json',root),'utf8'))
const female=JSON.parse(await readFile(new URL('public/models/female-regions/manifest.json',root),'utf8'))
const femaleDetailed=JSON.parse(await readFile(new URL('public/models/female-detailed/manifest.json',root),'utf8'))
const report={
  description:'Inventory of shipped source-labelled meshes. Classification uses the navigation predicates, is not exhaustive anatomical coverage and does not imply individual scientific validation. Counts overlap between systems.',
  revisions:{male:male.atlasRevision,female:female.atlasRevision,femaleDetailed:femaleDetailed.atlasRevision},
  systems:systems.map(system=>({id:system.id,name:system.name,...Object.fromEntries([['male',male],['female',female],['femaleDetailed',femaleDetailed]].map(([body,manifest])=>{const available=manifest.structures.filter(s=>!s.aggregate&&system.match(s));return [body,{count:available.length,examples:available.slice(0,3).map(s=>({id:s.id,sourceName:s.name}))}]}))})),
  pilots:{heart:{id:'FMA7088',meshComponents:assemblyComponents(male.structures,'FMA7088').map(s=>s.id)},stomach:{id:'FMA7148',meshComponents:assemblyComponents(male.structures,'FMA7148').map(s=>s.id),limitation:'Single global mesh; no separately modelled pylorus, fundus or antrum.'},spine:{id:'FMA13478',meshComponents:assemblyComponents(male.structures,'FMA13478').map(s=>s.id),numberedVertebrae:male.structures.filter(s=>vertebraCode(s.name)).map(s=>({id:s.id,number:vertebraCode(s.name)}))}},
}
await writeFile(new URL('docs/atlas/coverage.json',root),JSON.stringify(report,null,2)+'\n')
for(const system of report.systems)console.log(`${system.name}: male=${system.male.count}, female=${system.female.count}, femaleDetailed=${system.femaleDetailed.count}`)
