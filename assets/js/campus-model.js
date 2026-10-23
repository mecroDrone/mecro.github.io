export const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function cleanProgress(course,raw={}){
 const ids=new Set(course.lessons.map(l=>l.n));
 const completed=Array.isArray(raw?.completed)?[...new Set(raw.completed.filter(n=>ids.has(n)))]:[];
 const notes={};if(raw?.notes&&typeof raw.notes==='object')for(const [key,value] of Object.entries(raw.notes))if(ids.has(Number(key))&&typeof value==='string')notes[key]=value.slice(0,12000);
 return {completed,notes,last:ids.has(raw?.last)?raw.last:course.lessons[0].n};
}
export function filterLessons(lessons,query){const q=normalize(query.trim());return lessons.filter(l=>normalize(`${l.n} ${l.title} ${l.goal} ${l.topics.join(' ')}`).includes(q));}
export function materialPath(course,path){
 if(!/^[a-z0-9-]+$/.test(course)||typeof path!=='string'||!path||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\?#%]/.test(path))throw new Error('Ruta de material no válida');
 return `api/campus/materiales/${course}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
