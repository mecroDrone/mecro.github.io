import {API_URL,groupLink,normalizeGroup} from '../assets/js/api.js';

export async function loadLegacyClasses(user){
 if(!user?.catalogToken)throw new Error('Sign in again after updating Apps Script');
 const response=await fetch(process.env.MECRO_AUTH_URL||API_URL,{method:'POST',body:JSON.stringify({action:'catalog',token:user.catalogToken}),signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!response.ok)throw new Error('Catalog unavailable');
 const data=await response.json();
 const rows=data.clases||data.syllabus;
 if(data.success!==true||!Array.isArray(rows))throw new Error('Invalid catalog');
 return rows;
}
export function recordingsFor(user,courseId,aliases,rows){
 const enrolled=new Set(user.cursosInscritos||[]);
 const known=aliases[courseId]||[courseId];
 const ids=known.filter(id=>enrolled.has(id));
 if(!ids.length)return [];
 const hasExact=rows.some(r=>ids.includes(String(r.cursoId||r.CursoID||'')));
 return rows.flatMap(row=>{
  const id=String(row.cursoId||row.CursoID||'');
  if(hasExact?!ids.includes(id):!known.includes(id))return [];
  const key=ids.includes(id)?id:ids[0];
  // A course-specific assignment takes precedence, including an invalid/empty assignment.
  const group=normalizeGroup(Object.hasOwn(user.grupos||{},key)?user.grupos[key]:user.grupo);
  if(!group)return [];
  const code=String(row.code||row.semanaCode||row.SemanaCode||row.semana||'');
  return [{courseId:id,group,code,title:String(row.title||row.titulo||row.Titulo||'Sesión grabada'),video:groupLink(row,'video',group)}];
 });
}
