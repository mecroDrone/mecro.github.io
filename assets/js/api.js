// Existing Apps Script deployment. Server-side authorization must be audited
// separately; browser-side filtering is presentation, not an access boundary.
export const API_URL='https://script.google.com/macros/s/AKfycbzEdJPv7-0e2qUuU0C2Fo4lpwj0He-cSXPS7azl6742j-yqasn1CkZ9ozI799ojsY-EEg/exec';
const SESSION_KEY='mecro_session';
export function normalizeIds(value){
  if(Array.isArray(value))return [...new Set(value.filter(v=>typeof v==='string'||typeof v==='number').map(v=>String(v).trim()).filter(Boolean))];
  if(typeof value==='string')return [...new Set(value.split(/[,;\n]/).map(v=>v.trim()).filter(Boolean))];
  return [];
}
export function normalizeGroup(value){return typeof value==='string'&&/^G\d+$/i.test(value.trim())?value.trim().toUpperCase():'';}
export function normalizeUser(data,email=''){
  const user=data.user&&typeof data.user==='object'?data.user:data;
  const groups={};
  if(user.grupos&&typeof user.grupos==='object'&&!Array.isArray(user.grupos)){
    for(const [id,group] of Object.entries(user.grupos)){if(normalizeGroup(group))groups[id]=normalizeGroup(group);}
  }
  return {nombre:typeof user.nombre==='string'?user.nombre:'Estudiante',email:typeof user.email==='string'?user.email:email,cursosInscritos:normalizeIds(user.cursosInscritos),grupo:normalizeGroup(user.grupo),grupos:groups};
}
export function saveSession(user){
  // Store a deliberately narrow profile, never the complete login response.
  sessionStorage.setItem(SESSION_KEY,JSON.stringify({user:normalizeUser(user),expiresAt:Date.now()+8*60*60*1000}));
  localStorage.removeItem('mecro_user');
}
export function readSession(){
  try{
    const record=JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if(!record||!Number.isFinite(record.expiresAt)||record.expiresAt<=Date.now()||!record.user||typeof record.user.email!=='string'||!record.user.email)return null;
    return normalizeUser(record.user);
  }catch{return null;}
}
export function clearSession(){try{sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem('mecro_user');}catch{ /* navigation still logs the UI out */ }}
export async function request(action,payload={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const options={signal:controller.signal,cache:'no-store'};
    const url=action==='catalog'?API_URL+'?t='+Date.now():API_URL;
    if(action!=='catalog'){options.method='POST';options.body=JSON.stringify({action,...payload});}
    const response=await fetch(url,options);
    if(!response.ok)throw new Error('No se pudo completar la conexión. Inténtalo de nuevo.');
    let data;
    try{data=await response.json();}catch{throw new Error('El servicio no devolvió una respuesta válida. Inténtalo más tarde.');}
    if(!data||typeof data!=='object')throw new Error('La respuesta del servicio no es válida.');
    return data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('La conexión tardó demasiado. Revisa tu conexión y vuelve a intentarlo.');
    if(error instanceof TypeError)throw new Error('No pudimos conectar con el aula. Revisa tu conexión o contacta a MECRO.');
    throw error;
  }finally{clearTimeout(timer);}
}
export function safeUrl(value){
  if(typeof value!=='string'||!value.trim())return '';
  try{const url=new URL(value.trim());return url.protocol==='https:'?url.href:'';}catch{return '';}
}
export function groupLink(item,type,group){
  const normalized=normalizeGroup(group);if(!normalized)return '';
  const nested=item[type+'Links'];
  if(nested&&typeof nested==='object'){
    for(const [key,value] of Object.entries(nested)){if(normalizeGroup(key)===normalized&&safeUrl(value))return safeUrl(value);}
  }
  const number=normalized.slice(1);
  const candidates=[type+'g'+number,type+'linkg'+number,type+number,type+'g'+number+'link'];
  for(const [key,value] of Object.entries(item)){
    const clean=key.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(candidates.includes(clean)&&safeUrl(value))return safeUrl(value);
  }
  // No unscoped fallback: a G1 student must never receive a G10/common link by accident.
  return '';
}
export function materialLink(item,type){
  const candidates=type==='ppt'?['ppt','pptlink','diapositivas','presentacion','presentacionlink']:['pdf','pdflink','resumen','resumenlink'];
  for(const [key,value] of Object.entries(item))if(candidates.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,''))&&safeUrl(value))return safeUrl(value);
  return '';
}
export function embedUrl(value){
  const safe=safeUrl(value);if(!safe)return '';
  const url=new URL(safe);
  if(url.hostname==='drive.google.com'){
    const file=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/);
    const id=file?.[1]||url.searchParams.get('id');
    return id&&/^[A-Za-z0-9_-]+$/.test(id)?`https://drive.google.com/file/d/${id}/preview`:'';
  }
  if(url.hostname==='docs.google.com'){
    const doc=url.pathname.match(/^\/(presentation|document|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
    if(doc)return `https://docs.google.com/${doc[1]}/d/${doc[2]}/${doc[1]==='presentation'?'embed':'preview'}`;
  }
  if(['www.youtube.com','youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)){
    const id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/^\/embed\/([^/]+)/)?.[1];
    if(id&&/^[A-Za-z0-9_-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  return '';
}
