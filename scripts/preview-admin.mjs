// Isolated UI preview. Uses in-memory test data; never connects to Google.
import http from 'node:http';
import fs from 'node:fs';
import {createRuntime} from '../tests/helpers/apps-script.mjs';
const runtime=createRuntime();
runtime.properties.set('ADMIN_HASH',runtime.context.hash_('local-preview-only'));
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('apps-script/Admin.html',root),'utf8');
const combined=fs.readFileSync(new URL('apps-script/Original.gs',root),'utf8')+'\n'+fs.readFileSync(new URL('apps-script/Admin.gs',root),'utf8').replace("HtmlService.createHtmlOutputFromFile('Admin')","HtmlService.createHtmlOutput(ADMIN_PAGE_HTML_)")+'\nvar ADMIN_PAGE_HTML_ = '+JSON.stringify(html)+';\n';
fs.mkdirSync(new URL('.course-work/deploy/',root),{recursive:true});fs.writeFileSync(new URL('.course-work/deploy/Code.gs',root),combined);
const allowed=new Set(['adminLogin','adminLogout','adminSnapshot','adminRecordings','adminPublish','adminEnroll','adminAssign','adminResetAccess','adminCreateClass','adminCreateCourse']);
const shim=`<script>function runner(ok=()=>{},fail=()=>{}){return new Proxy({},{get:(o,key)=>key==='withSuccessHandler'?fn=>runner(fn,fail):key==='withFailureHandler'?fn=>runner(ok,fn):(...args)=>fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:key,args})}).then(r=>r.json()).then(v=>{if(v.error)throw new Error(v.error);ok(v.result);}).catch(fail)});}window.google={script:{run:runner()}};</script>`;
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/install'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Paquete de instalación MECRO</h1><p>Código generado; no contiene claves ni datos de alumnos.</p><label>Código del servidor<textarea aria-label="Código del servidor" style="width:100%;height:80vh">'+escape(combined)+'</textarea></label>');return;}
 if(req.url==='/rpc'&&req.method==='POST'){
  if(req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>10000){res.writeHead(413);res.end();return;}}
  res.setHeader('Content-Type','application/json');try{const {name,args}=JSON.parse(body);if(!allowed.has(name))throw new Error('Operación no permitida');res.end(JSON.stringify({result:runtime.context[name](...args)}));}catch(e){res.end(JSON.stringify({error:e.message}));}return;
 }
 if(req.url!=='/'){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html.replace('<script>',shim+'<script>').replace('<main>','<main><p style="background:#503e16;padding:16px">VISTA PREVIA LOCAL · Datos ficticios. Ningún cambio se envía a Google.</p>').replace('id="secret" type="password"','id="secret" value="local-preview-only" type="password"'));
}).listen(8790,'127.0.0.1',()=>console.log('Admin preview: http://127.0.0.1:8790/'));
