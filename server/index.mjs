import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createApiHandler} from './api.mjs'
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url))),api=createApiHandler()
const PORT=Number(process.env.PORT)||8080
const HOST='0.0.0.0'
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.woff2':'font/woff2','.svg':'image/svg+xml','.txt':'text/plain','.md':'text/plain'}
http.createServer((req,res)=>api(req,res,()=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 let file=path.resolve(root,'.'+pathname)
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end()}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html')
 if(!fs.existsSync(file)){res.writeHead(503);return res.end('Compilez le site avec npm run build.')}
 const extension=path.extname(file),relative=path.relative(root,file).replaceAll(path.sep,'/')
 const cache=/^assets\/.*-[A-Za-z0-9_-]+\.(?:js|css|woff2)$/.test(relative)?'public, max-age=31536000, immutable'
  :['.glb','.woff2','.png','.svg'].includes(extension)?'public, max-age=604800, stale-while-revalidate=2592000'
  :'no-cache'
 res.writeHead(200,{'Content-Type':types[extension]||'application/octet-stream','Content-Length':fs.statSync(file).size,'Cache-Control':cache})
 if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res)
})).listen(PORT,HOST,()=>console.log(`Corpus listening on ${HOST}:${PORT}`))
