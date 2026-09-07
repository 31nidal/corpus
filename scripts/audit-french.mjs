import fs from 'node:fs';import ts from 'typescript';
const src=fs.readFileSync('src/data/anatomy.ts','utf8').replace("import frenchLabels from './french-labels.json'",`const frenchLabels = ${fs.readFileSync('src/data/french-labels.json','utf8')}`);
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const rows=JSON.parse(fs.readFileSync('public/models/manifest.json')).structures;
const missing=rows.filter(s=>!mod.translateAnatomyName(s.name));
fs.writeFileSync('/private/tmp/corpus-untranslated.json',JSON.stringify(missing.map(s=>({id:s.id,name:s.name,group:s.group,current:mod.describeStructure(s.name,s.group).name})),null,2));console.log('Missing',missing.length);console.log(missing.map(s=>s.name).join('\n'));
