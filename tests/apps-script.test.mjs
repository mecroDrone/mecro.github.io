import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from './helpers/apps-script.mjs';
function setup(){const r=createRuntime();r.properties.set('ADMIN_HASH',r.context.hash_('local-test-secret'));r.token=r.context.adminLogin('local-test-secret').token;return r;}
test('admin rejects forged sessions, limits attempts and revokes logout',()=>{
 const {context:c,token}=setup();
 for(const fn of ['adminSnapshot','adminRecordings','adminPublish','adminEnroll','adminAssign','adminResetAccess','adminCreateClass','adminCreateCourse'])assert.throws(()=>c[fn]('forged',{}),/sesión/);
 c.adminLogout(token);assert.throws(()=>c.authorize_(token));
 for(let i=0;i<10;i++)assert.throws(()=>c.adminLogin('wrong'));
 assert.throws(()=>c.adminLogin('local-test-secret'),/15 minutos/);
});
test('new enrollment requires payment, rejects duplicates and stores only a password hash',()=>{
 const {context:c,token,sheets,post}=setup(),input={name:'Nueva alumna',email:'nueva@example.invalid',course:'DRONES_101',group:'G11',paid:true};
 assert.throws(()=>c.adminEnroll(token,{...input,paid:false}),/pago/);
 assert.throws(()=>c.adminEnroll(token,{...input,name:'=IMPORTXML("x")'}));
 const result=c.adminEnroll(token,input),stored=sheets.get('Usuarios').rows.at(-1)[2];
 assert.match(result.password,/^[a-f0-9]{64}$/);assert.equal(stored,'TOKEN_SHA256:'+c.hash_(result.password));
 assert.equal(post({action:'login',email:input.email,password:result.password}).success,true);
 assert.throws(()=>c.adminEnroll(token,input),/existe/);
 assert.ok(!JSON.stringify(c.adminSnapshot(token)).includes(result.password));
 assert.ok(!JSON.stringify(sheets.get('AuditoriaAdmin').rows).includes(result.password));
});
test('publish preserves other groups, adds G11, audits replacement and rejects stale writes',()=>{
 const {context:c,token,sheets}=setup();
 const initial=sheets.get('Clases').rows[1][8];
 const value={course:'DRONES_101',code:'S1',group:'G11',url:'https://drive.google.com/file/d/video-one/view',previous:''};
 const result=c.adminPublish(token,value);assert.match(result.url,/video-one/);
 assert.equal(sheets.get('Clases').rows[1][8],initial);
 assert.throws(()=>c.adminPublish(token,value),/cambió/);
 c.adminPublish(token,{...value,previous:result.url,url:'https://drive.google.com/file/d/video-two/view'});
 const snapshot=c.adminSnapshot(token);assert.match(snapshot.classes[0].videoLinks.G11,/video-two/);
 assert.match(sheets.get('AuditoriaAdmin').rows.at(-1)[2],/video-one/);
 assert.throws(()=>c.adminPublish(token,{...value,url:'https://drive.google.com.evil/file/d/x/view'}));
});
test('existing students retain credentials and can have different groups per course',()=>{
 const {context:c,token,post,sheets}=setup();
 c.adminAssign(token,{email:'alumno@example.invalid',course:'ES32_AUTOMATION',group:'G2',paid:true,previousGroup:''});
 const login=post({action:'login',email:'alumno@example.invalid',password:'original-password'});
 assert.equal(login.success,true);assert.equal(login.grupos.DRONES_101,'G1');assert.equal(login.grupos.ES32_AUTOMATION,'G2');
 assert.equal(sheets.get('Usuarios').rows[1][2],'original-password');
 assert.throws(()=>c.adminAssign(token,{email:'alumno@example.invalid',course:'DRONES_101',group:'G2',paid:true,previousGroup:'G1'}),/Confirma/);
 sheets.get('Usuarios').appendRow(['Duplicado','alumno@example.invalid','other','ACTIVO','DRONES_101','G2']);
 assert.throws(()=>c.adminAssign(token,{email:'alumno@example.invalid',course:'DRONES_101',group:'G1',paid:true}),/duplicado/);
});
test('public catalog contains no recordings; student tokens filter groups and revoke on reset',()=>{
 const {context:c,token,post}=setup();
 assert.deepEqual(JSON.parse(c.doGet({}).getContent()).clases,[]);
 assert.equal(post({action:'catalog',token:'forged'}).success,false);
 const login=post({action:'login',email:'alumno@example.invalid',password:'original-password'});
 assert.equal(login._row,undefined);
 const catalog=post({action:'catalog',token:login.catalogToken});
 assert.equal(catalog.clases.length,2);assert.deepEqual(Object.keys(catalog.clases[0].videoLinks),['G1']);
 const reset=c.adminResetAccess(token,{email:'alumno@example.invalid',confirm:true});
 assert.equal(post({action:'catalog',token:login.catalogToken}).success,false);
 assert.equal(post({action:'login',email:reset.email,password:'original-password'}).success,false);
 assert.equal(post({action:'login',email:reset.email,password:reset.password}).success,true);
});
test('new courses/classes are validated and student login is rate limited',()=>{
 const {context:c,token,post,sheets}=setup();
 c.adminCreateCourse(token,{id:'COHETES_101',name:'Cohetería'});
 c.adminCreateClass(token,{course:'COHETES_101',code:'S1',title:'Tu primer cohete'});
 assert.equal(sheets.get('Clases').rows.at(-1)[2],'Tu primer cohete');
 assert.throws(()=>c.adminCreateClass(token,{course:'COHETES_101',code:'S1',title:'Duplicada'}),/existe/);
 for(let i=0;i<20;i++)assert.equal(post({action:'login',email:'alumno@example.invalid',password:'wrong'}).success,false);
 assert.match(post({action:'login',email:'alumno@example.invalid',password:'original-password'}).message,/15 minutos/);
});
test('doPost supports web admin actions and DRONES_102 legacy enrollment receives DRONES_101 classes',()=>{
 const {post,sheets}=setup();
 assert.equal(post({action:'adminSnapshot',token:'forged'}).success,false);
 const admin=post({action:'adminLogin',secret:'local-test-secret'});
 assert.equal(admin.success,true);assert.match(admin.result.token,/^[a-f0-9]{64}$/);
 const snap=post({action:'adminSnapshot',token:admin.result.token});
 assert.equal(snap.success,true);assert.equal(snap.result.courses.length,2);
 sheets.get('Usuarios').appendRow(['Alumno Drones 102','d102@example.invalid','pass102','ACTIVO','DRONES_102','G2']);
 const login=post({action:'login',email:'d102@example.invalid',password:'pass102'});
 assert.equal(login.success,true);
 const catalog=post({action:'catalog',token:login.catalogToken});
 assert.equal(catalog.success,true);assert.equal(catalog.cursos[0].id,'DRONES_101');
 assert.match(catalog.clases[0].videoLinks.G2,/other/);
 const sched=post({action:'adminSaveSchedule',token:admin.result.token,input:{course:'DRONES_101',group:'G2',schedule:'Martes y Jueves 7:00 pm'}});
 assert.equal(sched.success,true);
 const catalogWithSched=post({action:'catalog',token:login.catalogToken});
 assert.equal(catalogWithSched.horarios.DRONES_101,'Martes y Jueves 7:00 pm');
 const sync=post({action:'adminSyncCatalog',token:admin.result.token});
 assert.equal(sync.success,true);assert.equal(sync.result.addedCourses,1);assert.equal(sync.result.addedClasses,16);
});
