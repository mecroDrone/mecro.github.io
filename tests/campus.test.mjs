import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {createCampusServer,allowedMaterial,allowedCourses} from '../server/campus.mjs';
import {cleanProgress,materialPath,filterLessons} from '../assets/js/campus-model.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/campus.json',import.meta.url),'utf8'));

test('campus: syllabus hours match every supplied session',()=>{
 const expected={uav:[8,20,4],cohetes:[16,42,8],esp32:[16,36,8]};
 for(const c of catalog.courses){assert.deepEqual([c.lessons.length,c.hours,c.weeks],expected[c.id]);assert.equal(c.hours,c.lessons.reduce((sum,l)=>sum+l.hours,0));assert.equal(new Set(c.lessons.map(l=>l.n)).size,c.lessons.length);}
});
test('campus: progress drops obsolete classes and isolates valid notes',()=>{
 const c=catalog.courses[0];assert.deepEqual(cleanProgress(c,{completed:[1,1,500,'2'],notes:{1:'medidas',500:'obsoleto'},last:500}),{completed:[1],notes:{1:'medidas'},last:1});
 assert.ok(filterLessons(c.lessons,'bateria').some(l=>l.n===2));
 for(const p of ['../secret','assets/../../secret','assets\\secret','https://a.test','assets/a?x=1','assets/%2e%2e/a'])assert.throws(()=>materialPath('uav',p));
});
test('campus: instructor files and source archives never pass the resource policy',()=>{
 assert.deepEqual(allowedCourses({cursosInscritos:['DRONES_101','ES32_AUTOMATION']},catalog.courses).map(c=>c.id),['uav','esp32']);
 assert.deepEqual(allowedCourses({cursosInscritos:['DRONES_102']},catalog.courses).map(c=>c.id),['uav']);
 assert.deepEqual(allowedCourses({cursosInscritos:['COHETES_101']},catalog.courses).map(c=>c.id),['cohetes']);
 for(const p of ['descargas/MECRO_Guia_Docente_Drones.pdf','descargas/MECRO_Diagnostico_y_Rediseno_Drones.pdf','fuentes/curso.json','../data/cursos.json','assets/a.html','presentaciones/../secreto.pdf'])assert.equal(allowedMaterial(p),false,p);
 assert.equal(allowedMaterial('presentaciones/semana-01.pdf'),true);
 assert.deepEqual(allowedCourses({cursosInscritos:['uav-otro']},catalog.courses),[]);
 assert.deepEqual(allowedCourses({cursosInscritos:['esp32']},catalog.courses).map(c=>c.id),['esp32']);
});
test('campus: server enforces real cookie sessions, course boundary and logout',async t=>{
 const {server}=createCampusServer({authenticate:async(email,password)=>password==='test-only'?{nombre:'Prueba',email,cursosInscritos:['uav']}:null});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(p,options={})=>fetch(base+p,options);
 assert.equal((await request('/api/campus/courses')).status,401);
 assert.equal((await request('/materiales/uav/lecciones/01.json')).status,404);
 assert.equal((await request('/.course-work/import-report.json')).status,404);
 assert.equal((await request('/server/course-access.json')).status,404);
 assert.equal((await request('/api/campus/preview?token=anything')).status,404);
 const body=JSON.stringify({email:'test@example.invalid',password:'test-only'});
 assert.equal((await request('/api/campus/login',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body})).status,403);
 const login=await request('/api/campus/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
 const headers={Cookie:cookie.split(';')[0]};const enrolled=await (await request('/api/campus/courses',{headers})).json();assert.deepEqual(enrolled.courses.map(c=>c.id),['uav']);assert.equal(enrolled.preview,false);
 assert.equal((await request('/api/campus/materiales/esp32/lecciones/01.json',{headers})).status,403);
 assert.equal((await request('/api/campus/materiales/uav/descargas/MECRO_Guia_Docente_Drones.pdf',{headers})).status,403);
 assert.equal((await request('/api/campus/materiales/uav/assets/..%5c..%5cdata/cursos.json',{headers})).status,403);
 assert.equal((await request('/api/campus/courses',{headers:{Cookie:'mecro_campus='+'0'.repeat(64)}})).status,401);
 const out=await request('/api/campus/logout',{method:'POST',headers:{...headers,Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(out.status,200);
 assert.equal((await request('/api/campus/courses',{headers})).status,401);
});
