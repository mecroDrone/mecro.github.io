import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
export function createRuntime(){
 const properties=new Map(),cache=new Map(),sheets=new Map();
 function sheet(name,initial=[]){
  const rows=initial.map(r=>r.slice());
  const width=()=>Math.max(0,...rows.map(r=>r.length));
  const obj={rows,getId:()=>name,getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows.map(r=>Array.from({length:width()},(_,i)=>r[i]??'')),getDisplayValues:()=>rows.map(r=>Array.from({length:width()},(_,i)=>String(r[i]??'')))}),appendRow:r=>{rows.push([...r]);return obj;},getRange:(row,col)=>({getDisplayValue:()=>String(rows[row-1]?.[col-1]??''),setValue:v=>{while(rows.length<row)rows.push([]);rows[row-1][col-1]=v;return obj;}})};
  sheets.set(name,obj);return obj;
 }
 sheet('Cursos',[['CursoID','NombreCurso','Categoria','Instructor','FotoCurso','SilaboLink'],['DRONES_101','Ingeniería y Ensamblaje de Drones','Drones','MECRO','',''],['ES32_AUTOMATION','Automatización con ESP32','Electrónica','MECRO','','']]);
 sheet('Usuarios',[['Nombre','Email','Password','Estado','CursosInscritos','Grupo'],['Alumno de prueba','alumno@example.invalid','original-password','ACTIVO','DRONES_101','G1']]);
 sheet('Clases',[['CursoID','SemanaCode','Titulo','Enfoque','PPT','PDFResumen','Meet_G1','Video_G1','Video_G2'],['DRONES_101','S1','Arquitectura UAV','','','','','https://drive.google.com/file/d/old/preview','https://drive.google.com/file/d/other/preview'],['DRONES_101','S2','Selección de componentes','','','','','',''],['ES32_AUTOMATION','S1','Conociendo el ESP32-S3','','','','','','']]);
 const db={getId:()=> 'test-sheet',getSheetByName:name=>sheets.get(name)||null,getSheets:()=>[...sheets.values()],insertSheet:name=>sheet(name)};
 const props={getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>{properties.set(k,v);return props;}};
 const cacheApi={get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)};
 const files=new Map(['video-one','video-two','old','other'].map((id,i)=>[id,{getId:()=>id,getName:()=>i?'ESP32 · sesión de prueba':'Drones · grabación de prueba',getMimeType:()=> 'video/mp4',getUrl:()=>`https://drive.google.com/file/d/${id}/view`,getDateCreated:()=>new Date('2026-10-20T20:00:00Z')}]));
 const iterator=()=>{let i=0;const all=[...files.values()];return {hasNext:()=>i<all.length,next:()=>all[i++],getContinuationToken:()=> 'cursor'};};
 const output=value=>({getContent:()=>value,setMimeType(){return this;}});
 const context=vm.createContext({console:{log(){}},PropertiesService:{getScriptProperties:()=>props},CacheService:{getScriptCache:()=>cacheApi},Utilities:{getUuid:randomUUID,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(algorithm,text)=>[...createHash('sha256').update(text).digest()]},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{getActiveSpreadsheet:()=>db,openById:()=>db},ContentService:{createTextOutput:output,MimeType:{JSON:'json'}},DriveApp:{getFolderById:()=>({getFiles:iterator}),continueFileIterator:iterator,getFileById:id=>{if(!files.has(id))throw new Error('Archivo no encontrado');return files.get(id);}}});
 for(const file of ['Original.gs','Admin.gs'])vm.runInContext(fs.readFileSync(new URL('../../apps-script/'+file,import.meta.url),'utf8'),context,{filename:file});
 const post=value=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(value)}}).getContent());
 return {context,properties,cache,sheets,post,files};
}
