import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {API_URL,normalizeUser} from '../assets/js/api.js';
import {loadLegacyClasses,recordingsFor} from './recordings.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.pdf':'application/pdf','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8','.zip':'application/zip','.md':'text/plain; charset=utf-8','.cpp':'text/plain; charset=utf-8','.ico':'image/x-icon'};
export const aliases=JSON.parse(fs.readFileSync(path.join(root,'server/course-access.json'),'utf8'));
export function allowedCourses(user,known){
 const ids=new Set(user.cursosInscritos);
 return known.filter(course=>(aliases[course.id]||[course.id]).some(id=>ids.has(id)));
}
export function allowedMaterial(relative){
 if(relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'))return false;
 if(/(Guia_Docente|Diagnostico)/i.test(relative))return false;
 if(/^lecciones\/\d{2}\.json$/.test(relative)||relative==='biblioteca.json')return true;
 if(/^presentaciones\/semana-\d{2}\.(pdf|json)$/.test(relative))return true;
 if(/^assets\/[\w.-]+\.(png|jpe?g|webp)$/i.test(relative))return true;
 return /^descargas\/[\w.-]+\.(pdf|pptx|csv|zip)$/i.test(relative);
}
export async function authenticateWithMecro(email,password){
 const response=await fetch(process.env.MECRO_AUTH_URL||API_URL,{method:'POST',body:JSON.stringify({action:'login',email,password}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('authentication unavailable');
 const data=await response.json();
 if(data.success!==true)return null;
 const user=normalizeUser(data,email);
 return user.email&&user.cursosInscritos.length?user:null;
}
export function createCampusServer({directory=root,authenticate=authenticateWithMecro,loadRecordings=loadLegacyClasses,preview=false,previewToken=randomBytes(32).toString('hex'),secure=false,origin=''}={}){
 const catalog=JSON.parse(fs.readFileSync(path.join(directory,'data/campus.json'),'utf8'));
 const sessions=new Map(),attempts=new Map();
 const json=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const cookie=(token,maxAge=7200)=>`mecro_campus=${token}; HttpOnly; SameSite=Strict; Path=/api/campus; Max-Age=${maxAge}${secure?'; Secure':''}`;
 const sessionFor=req=>{
   const token=(req.headers.cookie||'').match(/(?:^|;\s*)mecro_campus=([a-f0-9]{64})(?:;|$)/)?.[1];
   const session=sessions.get(token);
   if(session?.expiresAt>Date.now())return {...session,token};
   if(token)sessions.delete(token);return null;
 };
 function issue(res,user,isPreview=false){
   for(const [key,value] of sessions)if(value.expiresAt<=Date.now())sessions.delete(key);
   const token=randomBytes(32).toString('hex');
   const courseIds=isPreview?catalog.courses.map(c=>c.id):allowedCourses(user,catalog.courses).map(c=>c.id);
   sessions.set(token,{user,courseIds,preview:isPreview,expiresAt:Date.now()+2*60*60*1000});res.setHeader('Set-Cookie',cookie(token));
 }
 function sendFile(req,res,file,privateFile=false){
   let stat;try{stat=fs.statSync(file);}catch{return json(res,404,{error:'Recurso no disponible.'});}
   if(!stat.isFile())return json(res,404,{error:'Recurso no disponible.'});
   const type=mime[path.extname(file).toLowerCase()]||'application/octet-stream';
   const headers={'Content-Type':type,'Cache-Control':privateFile?'private, no-store':'no-cache','Accept-Ranges':'bytes'};
   if(['.pptx','.csv','.zip'].includes(path.extname(file)))headers['Content-Disposition']=`attachment; filename="${path.basename(file)}"`;
   let start=0,end=stat.size-1,status=200;
   if(req.headers.range){
     const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
     if(!match)return json(res,416,{error:'Rango no válido.'});
     start=Number(match[1]);end=match[2]?Number(match[2]):end;
     if(start>end||end>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
     status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
   }
   headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
   if(req.method==='HEAD')return res.end();
   const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }
 const server=http.createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
   res.setHeader('X-Frame-Options','SAMEORIGIN');
   let url;try{url=new URL(req.url,'http://localhost');}catch{return json(res,400,{error:'Solicitud no válida.'});}
   const pathname=url.pathname;
   const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
   if(req.method==='POST'){
     const expected=origin||`${secure?'https':'http'}://${req.headers.host}`;
     if(req.headers.origin!==expected)return json(res,403,{error:'Origen no permitido.'});
     if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'Se requiere JSON.'});
   }
   try{
     if(pathname==='/api/campus/status'&&req.method==='GET')return json(res,200,{available:true});
     if(pathname==='/api/campus/preview'&&req.method==='GET'){
       const supplied=url.searchParams.get('token')||'';
       if(!preview||!local||supplied.length!==previewToken.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(previewToken)))return json(res,404,{error:'No disponible.'});
       issue(res,{nombre:'Vista previa MECRO',email:'owner-preview',cursosInscritos:[]},true);
       res.writeHead(303,{Location:'/aula.html','Cache-Control':'no-store'});return res.end();
     }
     if(pathname==='/api/campus/login'&&req.method==='POST'){
       // Rate limit is bounded, does not retain credentials, and runs before the upstream call.
       const ip=req.socket.remoteAddress;const now=Date.now();
       for(const [key,v] of attempts)if(v.until<now)attempts.delete(key);
       const limit=attempts.get(ip)||{count:0,until:now+15*60*1000};
       if(limit.count>=10)return json(res,429,{error:'Demasiados intentos. Vuelve a intentarlo en 15 minutos.'});
       limit.count++;attempts.set(ip,limit);
       let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return json(res,413,{error:'Solicitud demasiado grande.'});}
       let value;try{value=JSON.parse(body);}catch{return json(res,400,{error:'Solicitud no válida.'});}
       if(typeof value.email!=='string'||typeof value.password!=='string'||!value.email.trim()||!value.password)return json(res,400,{error:'Escribe tu correo y contraseña.'});
       const user=await authenticate(value.email.trim(),value.password);
       if(!user)return json(res,401,{error:'No pudimos validar una matrícula activa con esos datos.'});
       const old=sessionFor(req);if(old)sessions.delete(old.token);
       issue(res,user);return json(res,200,{success:true,user});
     }
     if(pathname==='/api/campus/logout'&&req.method==='POST'){
       const session=sessionFor(req);if(session)sessions.delete(session.token);
       res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{success:true});
     }
     if(pathname.startsWith('/api/campus/')){
       const session=sessionFor(req);if(!session)return json(res,401,{error:'Inicia sesión para acceder a tus materiales.'});
       if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
       if(pathname==='/api/campus/recordings'){
         const courseId=url.searchParams.get('curso');
         if(!session.courseIds.includes(courseId))return json(res,403,{error:'Curso no autorizado.'});
         if(session.preview)return json(res,200,{preview:true,recordings:[]});
         return json(res,200,{preview:false,recordings:recordingsFor(session.user,courseId,aliases,await loadRecordings(session.user))});
       }
       if(pathname==='/api/campus/courses')return json(res,200,{name:session.user.nombre,profileId:createHash('sha256').update(session.user.email).digest('hex').slice(0,20),preview:session.preview,courses:catalog.courses.filter(c=>session.courseIds.includes(c.id))});
       const match=pathname.match(/^\/api\/campus\/materiales\/([a-z0-9-]+)\/(.+)$/);
       if(match){
         if(!session.courseIds.includes(match[1]))return json(res,403,{error:'Este material no pertenece a tu matrícula.'});
         let relative;try{relative=decodeURIComponent(match[2]);}catch{return json(res,400,{error:'Ruta no válida.'});}
         if(!allowedMaterial(relative))return json(res,403,{error:'Recurso no autorizado.'});
         const base=path.resolve(directory,'materiales',match[1]);const file=path.resolve(base,relative);
         if(!file.startsWith(base+path.sep))return json(res,403,{error:'Recurso no autorizado.'});
         if(fs.existsSync(file)&&!fs.realpathSync(file).startsWith(fs.realpathSync(base)+path.sep))return json(res,403,{error:'Recurso no autorizado.'});
         return sendFile(req,res,file,true);
       }
       return json(res,404,{error:'Recurso no disponible.'});
     }
     if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
     let relative;try{relative=decodeURIComponent(pathname).slice(1)||'index.html';}catch{return json(res,400,{error:'Ruta no válida.'});}
     // Explicit public roots. Never serve source, hidden directories or private archives.
     const publicPath=/^[\w-]+\.html$/.test(relative)||/^(assets|images)\/[\w./-]+$/.test(relative)||/^data\/(cursos|campus)\.json$/.test(relative)||/^data\/hardware-guides\.js$/.test(relative);
     if(!publicPath||relative.split('/').some(p=>p==='..'||p.startsWith('.')))return json(res,404,{error:'Recurso no disponible.'});
     const file=path.resolve(directory,relative);
     if(!file.startsWith(path.resolve(directory)+path.sep))return json(res,404,{error:'Recurso no disponible.'});
     return sendFile(req,res,file);
   }catch{return json(res,503,{error:'No pudimos conectar con el servicio del aula. Inténtalo de nuevo.'});}
 });
 return {server,previewToken};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const preview=process.argv.includes('--preview'),port=Number(process.env.PORT||8787);
 const production=process.env.NODE_ENV==='production';
 if(production&&preview)throw new Error('Preview is disabled in production');
 if(production&&!/^https:\/\//.test(process.env.SITE_ORIGIN||''))throw new Error('SITE_ORIGIN must be the HTTPS origin in production');
 const {server,previewToken}=createCampusServer({preview,secure:production,origin:process.env.SITE_ORIGIN||''});
 const host=preview?'127.0.0.1':process.env.HOST||'127.0.0.1';
 server.listen(port,host,()=>console.log(preview?`Vista previa local: http://127.0.0.1:${port}/api/campus/preview?token=${previewToken}`:`MECRO campus: http://${host}:${port}`));
}
