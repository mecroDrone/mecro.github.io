// Run configurarAdministrador_ once from the Apps Script editor, as its owner.
// Functions ending in _ are deliberately unavailable to google.script.run.
function configurarAdministrador(){
 var active=Session.getActiveUser().getEmail(),effective=Session.getEffectiveUser().getEmail();
 if(!active||active!==effective)throw new Error('La configuración debe ejecutarla el propietario desde el editor.');
 configurarAdministrador_();
}
function configurarAdministrador_() {
 var props=PropertiesService.getScriptProperties();
 if(props.getProperty('ADMIN_HASH'))throw new Error('Administrador ya configurado. No se ha cambiado su clave.');
 return emitirClaveAdministrador_(props);
}
function regenerarClaveAdministrador(){
 var active=Session.getActiveUser().getEmail(),effective=Session.getEffectiveUser().getEmail();
 if(!active||active!==effective)throw new Error('La configuración debe ejecutarla el propietario desde el editor.');
 return emitirClaveAdministrador_(PropertiesService.getScriptProperties());
}
function emitirClaveAdministrador_(props){
 var secret=randomToken_();props.setProperty('ADMIN_HASH',hash_(secret));
 props.setProperty('SHEET_ID',SpreadsheetApp.getActiveSpreadsheet().getId());
 if(!props.getProperty('RECORDINGS_FOLDER'))props.setProperty('RECORDINGS_FOLDER','16cgDq8G7eV2F8Jn12z6XHA7K97USkkqV');
 console.log('Usuario administrador sugerido: admin@macro.pe');
 console.log('Guarda esta clave de administrador en tu gestor de contraseñas: '+secret);
 return secret;
}
function randomToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function hash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function verifyStudentPassword_(plain,stored){return stored.indexOf('TOKEN_SHA256:')===0?hash_(plain)===stored.slice(13):stored===plain;}
function db_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){
 if(e&&e.parameter&&e.parameter.page==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('MECRO · Administración');
 // Public catalog: never return recordings, class links or users anonymously.
 var catalog=JSON.parse(legacyGet_().getContent());
 return json_({success:catalog.success===true,cursos:catalog.cursos||[],clases:[],requiresLogin:true});
}
function doPost(e){
 try{
  var data=JSON.parse(e.postData.contents),cache=CacheService.getScriptCache();
  var adminActions={
   adminLogin:function(){return adminLogin(data.secret||data.password);},
   adminLogout:function(){return adminLogout(data.token);},
   adminSnapshot:function(){return adminSnapshot(data.token);},
   adminRecordings:function(){return adminRecordings(data.token,data.cursor);},
   adminPublish:function(){return adminPublish(data.token,data.input);},
   adminEnroll:function(){return adminEnroll(data.token,data.input);},
   adminAssign:function(){return adminAssign(data.token,data.input);},
   adminResetAccess:function(){return adminResetAccess(data.token,data.input);},
   adminCreateClass:function(){return adminCreateClass(data.token,data.input);},
   adminCreateCourse:function(){return adminCreateCourse(data.token,data.input);}
  };
  if(Object.prototype.hasOwnProperty.call(adminActions,data.action)){
   return json_({success:true,result:adminActions[data.action]()});
  }
  if(data.action==='catalog'){
   var user=studentSession_(data.token),catalog=JSON.parse(legacyGet_().getContent());
   if(!catalog.success)throw new Error('No pudimos leer las clases.');
   var enrolled=user.cursosInscritos.slice();
   if(enrolled.indexOf('DRONES_102')>=0&&catalog.cursos.every(function(c){return c.id!=='DRONES_102';})&&enrolled.indexOf('DRONES_101')<0)enrolled.push('DRONES_101');
   return json_({success:true,cursos:catalog.cursos.filter(function(c){return enrolled.indexOf(c.id)>=0;}),clases:catalog.clases.filter(function(c){return enrolled.indexOf(c.cursoId)>=0;}).map(function(c){
    var group=user.grupos[c.cursoId]||user.grupos.DRONES_102||user.grupo,copy=Object.assign({},c,{meetLinks:{},videoLinks:{}});
    if(/^G[1-9][0-9]*$/.test(group)){copy.meetLinks[group]=c.meetLinks[group]||'';copy.videoLinks[group]=c.videoLinks[group]||'';}
    return copy;
   })});
  }
  if(data.action!=='login')return json_({success:false,message:'Operación no disponible.'});
  var email=String(data.email||'').trim().toLowerCase(),key='login:'+hash_(email),attempts=Number(cache.get(key)||0);
  if(attempts>=20)return json_({success:false,message:'Demasiados intentos. Espera 15 minutos.'});
  var result=JSON.parse(legacyPost_(e).getContent());
  if(!result.success){cache.put(key,String(attempts+1),900);return json_(result);}
  cache.remove(key);var row=result._row;delete result._row;
  result.grupos=groupsFor_(result.email,result.cursosInscritos,result.grupo);
  var token=randomToken_(),stored=table_('Usuarios').rows[row-2];
  cache.put('student:'+hash_(token),JSON.stringify({row:row,email:email,credential:hash_(stored[2])}),7200);
  result.catalogToken=token;return json_(result);
 }catch(err){return json_({success:false,message:err.message||'No se pudo completar la operación.'});}
}
function studentSession_(token){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Inicia sesión de nuevo.');
 var raw=CacheService.getScriptCache().get('student:'+hash_(token));if(!raw)throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
 var session=JSON.parse(raw),r=table_('Usuarios').rows[session.row-2];
 if(!r||r[1].trim().toLowerCase()!==session.email||hash_(r[2])!==session.credential||r[3].trim().toUpperCase()!=='ACTIVO')throw new Error('Tu acceso necesita confirmación.');
 var ids=r[4].split(',').map(function(v){return v.trim();}).filter(Boolean);
 return {email:r[1],cursosInscritos:ids,grupo:r[5],grupos:groupsFor_(r[1],ids,r[5])};
}
function groupsFor_(email,courses,defaultGroup,knownRows){
 var result={};courses.forEach(function(c){result[c]=defaultGroup;});
 var sheet=knownRows?null:db_().getSheetByName('Matriculas');if(!knownRows&&!sheet)return result;
 (knownRows||sheet.getDataRange().getDisplayValues().slice(1)).forEach(function(r){if(r[0].trim().toLowerCase()===email.trim().toLowerCase()&&courses.indexOf(r[1])>=0)result[r[1]]=r[2];});
 return result;
}
function adminLogin(secret){
 var lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  var cache=CacheService.getScriptCache(),attempts=Number(cache.get('admin-attempts')||0);
  if(attempts>=10)throw new Error('Espera 15 minutos antes de volver a intentar.');
  var expected=PropertiesService.getScriptProperties().getProperty('ADMIN_HASH');
  if(!expected||typeof secret!=='string'||hash_(secret)!==expected){cache.put('admin-attempts',String(attempts+1),900);throw new Error('Clave de administrador incorrecta o sin configurar.');}
  cache.remove('admin-attempts');var token=randomToken_();cache.put('admin:'+hash_(token),'yes',7200);return {token:token};
 }finally{lock.releaseLock();}
}
function authorize_(token){if(typeof token!=='string'||!CacheService.getScriptCache().get('admin:'+hash_(token)))throw new Error('La sesión terminó. Inicia sesión de nuevo.');}
function adminLogout(token){authorize_(token);CacheService.getScriptCache().remove('admin:'+hash_(token));return true;}
function table_(name){var sheet=db_().getSheetByName(name);if(!sheet)throw new Error('Falta la pestaña '+name);var rows=sheet.getDataRange().getDisplayValues();return {sheet:sheet,headers:rows[0],rows:rows.slice(1)};}
function audit_(action,detail){var sheet=db_().getSheetByName('AuditoriaAdmin')||db_().insertSheet('AuditoriaAdmin');if(!sheet.getLastRow())sheet.appendRow(['Fecha','Accion','Detalle']);sheet.appendRow([new Date(),action,JSON.stringify(detail)]);}
function adminSnapshot(token){
 authorize_(token);var catalog=JSON.parse(legacyGet_().getContent()),users=table_('Usuarios');
 if(!catalog.success)throw new Error('No se pudo leer el catálogo de clases.');
 var enrollmentSheet=db_().getSheetByName('Matriculas'),enrollmentRows=enrollmentSheet?enrollmentSheet.getDataRange().getDisplayValues().slice(1):[];
 return {courses:catalog.cursos,classes:catalog.clases,students:users.rows.filter(function(r){return r[1];}).map(function(r){return {name:r[0],email:r[1],status:r[3],courses:r[4],group:r[5],groups:groupsFor_(r[1],r[4].split(',').map(function(c){return c.trim();}),r[5],enrollmentRows)};})};
}
function adminRecordings(token,cursor){
 authorize_(token);var folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('RECORDINGS_FOLDER'));
 var it=cursor?DriveApp.continueFileIterator(cursor):folder.getFiles(),files=[];var scanned=0;
 while(it.hasNext()&&scanned<100){var f=it.next();scanned++;if(f.getMimeType().indexOf('video/')===0)files.push({id:f.getId(),name:f.getName(),url:f.getUrl(),created:f.getDateCreated().toISOString()});}
 return {files:files,cursor:it.hasNext()?it.getContinuationToken():null};
}
function adminPublish(token,input){
 authorize_(token);if(!input||!/^G[1-9][0-9]*$/.test(input.group))throw new Error('Grupo inválido.');
 var match=String(input.url||'').match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)(?:\/|$)/);if(!match)throw new Error('Selecciona un video de Drive.');
 var file=DriveApp.getFileById(match[1]);if(file.getMimeType().indexOf('video/')!==0)throw new Error('El archivo no es un video.');
 var lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  var t=table_('Clases'),matches=[];t.rows.forEach(function(r,i){if(r[0]===input.course&&r[1]===input.code)matches.push(i+2);});
  if(matches.length!==1)throw new Error('La clase no existe o está duplicada. Revisa la hoja.');
  var header='Video_'+input.group,col=t.headers.findIndex(function(h){return h.toLowerCase().replace(/[\s_]/g,'')===header.toLowerCase().replace(/_/g,'');})+1;
  var old=col?t.sheet.getRange(matches[0],col).getDisplayValue():'';
  if(old!==String(input.previous||''))throw new Error('La grabación cambió mientras editabas. Actualiza el panel.');
  var url='https://drive.google.com/file/d/'+file.getId()+'/preview';
  if(!col){col=t.headers.length+1;t.sheet.getRange(1,col).setValue(header);}
  audit_('publicar-grabacion',{course:input.course,code:input.code,group:input.group,previous:old,next:url});
  t.sheet.getRange(matches[0],col).setValue(url);return {url:url};
 }finally{lock.releaseLock();}
}
function adminEnroll(token,input){
 authorize_(token);if(!input||input.paid!==true)throw new Error('Confirma el pago antes de matricular.');
 var name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();
 if(!name||name.length>150||!/^\S+@\S+\.\S+$/.test(email)||email.length>180||/^[=+@-]/.test(name)||/^[=+@-]/.test(email)||!/^G[1-9][0-9]*$/.test(input.group))throw new Error('Revisa nombre, usuario y grupo.');
 var courses=table_('Cursos').rows.map(function(r){return r[0];});if(courses.indexOf(input.course)<0)throw new Error('Curso inválido.');
 var lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  var t=table_('Usuarios');if(t.rows.some(function(r){return r[1].trim().toLowerCase()===email;}))throw new Error('Este usuario ya existe. No se ha sobrescrito su matrícula.');
  var password=randomToken_();t.sheet.appendRow([name,email,'TOKEN_SHA256:'+hash_(password),'ACTIVO',input.course,input.group]);
  audit_('matricular',{email:email,course:input.course,group:input.group});
  return {email:email,password:password,course:input.course,group:input.group};
 }finally{lock.releaseLock();}
}
function textCell_(value,max){var s=String(value||'').trim();if(!s||s.length>max||/^[=+@-]/.test(s))throw new Error('Texto inválido o demasiado largo.');return s;}
function courseExists_(id){if(table_('Cursos').rows.every(function(r){return r[0]!==id;}))throw new Error('Curso inválido.');}
function uniqueStudent_(email){
 var t=table_('Usuarios'),matches=[];t.rows.forEach(function(r,i){if(r[1].trim().toLowerCase()===email)matches.push({row:i+2,values:r});});
 if(matches.length!==1)throw new Error('Usuario inexistente o duplicado. Revisa su registro antes de modificarlo.');
 return {sheet:t.sheet,row:matches[0].row,values:matches[0].values};
}
function adminAssign(token,input){
 authorize_(token);if(!input||input.paid!==true||!/^G[1-9][0-9]*$/.test(input.group))throw new Error('Confirma pago y grupo.');courseExists_(input.course);
 var email=String(input.email||'').trim().toLowerCase(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  var user=uniqueStudent_(email);if(user.values[3].trim().toUpperCase()!=='ACTIVO')throw new Error('La cuenta no está activa. Revisa su estado en Sheets.');
  var ids=user.values[4].split(',').map(function(c){return c.trim();}).filter(Boolean),groups=groupsFor_(email,ids,user.values[5]),old=groups[input.course]||'';
  if(old!==String(input.previousGroup||''))throw new Error('La matrícula cambió. Actualiza el panel.');
  if(old&&old!==input.group&&!input.confirmChange)throw new Error('Confirma el cambio de grupo.');
  var sheet=db_().getSheetByName('Matriculas')||db_().insertSheet('Matriculas');if(!sheet.getLastRow())sheet.appendRow(['Email','CursoID','Grupo']);
  var matches=[];sheet.getDataRange().getDisplayValues().slice(1).forEach(function(r,i){if(r[0].trim().toLowerCase()===email&&r[1]===input.course)matches.push(i+2);});
  if(matches.length>1)throw new Error('Matrícula duplicada en Matriculas. Revisa la hoja.');
  audit_('asignar-curso',{email:email,course:input.course,previousGroup:old,group:input.group});
  if(matches.length)sheet.getRange(matches[0],3).setValue(input.group);else sheet.appendRow([email,input.course,input.group]);
  if(ids.indexOf(input.course)<0){ids.push(input.course);user.sheet.getRange(user.row,5).setValue(ids.join(','));}
  return {email:email,course:input.course,group:input.group};
 }finally{lock.releaseLock();}
}
function adminResetAccess(token,input){
 authorize_(token);if(!input||input.confirm!==true)throw new Error('Confirma la renovación de acceso.');
 var email=String(input.email||'').trim().toLowerCase(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{var user=uniqueStudent_(email),password=randomToken_();audit_('renovar-acceso',{email:email});user.sheet.getRange(user.row,3).setValue('TOKEN_SHA256:'+hash_(password));return {email:email,password:password,course:user.values[4],group:user.values[5]};}finally{lock.releaseLock();}
}
function adminCreateClass(token,input){
 authorize_(token);courseExists_(input.course);var code=textCell_(input.code,40),title=textCell_(input.title,180),lock=LockService.getScriptLock();
 if(!/^[A-Za-z0-9_-]+$/.test(code))throw new Error('Código inválido. Usa letras, números o guiones.');
 lock.waitLock(10000);try{var t=table_('Clases');if(t.rows.some(function(r){return r[0]===input.course&&r[1]===code;}))throw new Error('Esta clase ya existe.');audit_('crear-clase',{course:input.course,code:code,title:title});t.sheet.appendRow([input.course,code,title,'']);return true;}finally{lock.releaseLock();}
}
function adminCreateCourse(token,input){
 authorize_(token);var id=textCell_(input.id,50),name=textCell_(input.name,180),lock=LockService.getScriptLock();if(!/^[A-Z0-9_-]+$/.test(id))throw new Error('ID inválido. Usa mayúsculas, números o guiones.');
 lock.waitLock(10000);try{var t=table_('Cursos');if(t.rows.some(function(r){return r[0]===id;}))throw new Error('Este curso ya existe.');audit_('crear-curso',{id:id,name:name});t.sheet.appendRow([id,name,'Programa MECRO','','','']);return true;}finally{lock.releaseLock();}
}
