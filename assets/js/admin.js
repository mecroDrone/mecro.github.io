import {request,saveSession} from './api.js';

const ADMIN_SESSION_KEY='mecro_admin_session';
const $=id=>document.getElementById(id);
let token='',snapshot=null,cursor=null,previous='',loadedFiles=[],emailTouched=false;

function text(tag,value,cls=''){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;return e;}
function saveAdminSession(newToken,email){
  try{
    sessionStorage.setItem(ADMIN_SESSION_KEY,JSON.stringify({token:newToken,email,expiresAt:Date.now()+2*60*60*1000}));
    saveSession({nombre:'Administrador MECRO',email:email||'admin@macro.pe',cursosInscritos:['uav','cohetes','esp32','DRONES_101','COHETES_101','ES32_AUTOMATION'],grupo:'G1'});
  }catch{}
}
function readAdminSession(){
  try{
    const raw=JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY));
    if(!raw||!raw.token||!Number.isFinite(raw.expiresAt)||raw.expiresAt<=Date.now())return null;
    return raw;
  }catch{return null;}
}
function clearAdminSession(){try{sessionStorage.removeItem(ADMIN_SESSION_KEY);}catch{}}

async function rpc(name,...args){
  if(window.google?.script?.run){
    return new Promise((resolve,reject)=>window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](...args));
  }
  const payload=
    name==='adminLogin'?{secret:args[0]}:
    name==='adminRecordings'?{token:args[0],cursor:args[1]}:
    name==='adminSnapshot'||name==='adminLogout'||name==='adminSyncCatalog'?{token:args[0]}:
    {token:args[0],input:args[1]};
  const res=await request(name,payload);
  if(!res||res.success!==true){
    throw new Error(typeof res?.message==='string'?res.message:'Operación no disponible. Asegúrate de actualizar el código en Google Apps Script.');
  }
  return res.result;
}

async function work(fn){
  document.querySelectorAll('#contenido button').forEach(b=>b.disabled=true);
  try{await fn();}
  catch(e){$('status').textContent='⚠️ '+(e.message||String(e));}
  finally{document.querySelectorAll('#contenido button').forEach(b=>b.disabled=false);}
}

function table(target,headers,rows){
  const t=text('table','','admin-table'),head=document.createElement('tr');
  headers.forEach(h=>head.append(text('th',h)));t.append(head);
  rows.forEach(row=>{
    const tr=document.createElement('tr');
    row.forEach(value=>{const td=document.createElement('td');td.append(value instanceof Node?value:document.createTextNode(String(value)));tr.append(td);});
    t.append(tr);
  });
  $(target).replaceChildren(t);
}

function slugifyName(name,domain){
  const parts=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return '';
  const user=parts.length===1?parts[0]:`${parts[0]}.${parts[parts.length-1]}`;
  return `${user}@${domain||'macro.pe'}`;
}
function updateSuggestedEmail(){
  if(emailTouched&&$('email').value.trim())return;
  const suggested=slugifyName($('name').value,$('emailDomain').value);
  if(suggested)$('email').value=suggested;
}
$('name').addEventListener('input',updateSuggestedEmail);
$('emailDomain').addEventListener('change',()=>{emailTouched=false;updateSuggestedEmail();});
$('email').addEventListener('input',()=>{emailTouched=Boolean($('email').value.trim());});

function campusIdForSheetCourse(courseId){
  const id=String(courseId||'').toUpperCase();
  if(id.includes('COHETE'))return 'cohetes';
  if(id.includes('ES32')||id.includes('ESP32'))return 'esp32';
  return 'uav';
}

function scheduleFor(courseId,group){
  return snapshot?.schedules?.[`${courseId}:${String(group||'G1').trim().toUpperCase()}`]||'';
}

function updateEnrollScheduleField(){
  if(!$('enrollSchedule'))return;
  $('enrollSchedule').value=scheduleFor($('enrollCourse').value,$('enrollGroup').value);
}
$('enrollCourse').addEventListener('change',updateEnrollScheduleField);
$('enrollGroup').addEventListener('input',updateEnrollScheduleField);

function selected(){return (snapshot?.classes||[]).filter(c=>c.cursoId===$('course').value);}
function courseGroups(){
  const set=new Set(['G1','G2','G3','G4']);
  const current=($('group').value||'').trim().toUpperCase();
  if(/^G[1-9][0-9]*$/.test(current))set.add(current);
  for(const c of selected()){
    Object.keys(c.videoLinks||{}).forEach(g=>{if(/^G[1-9][0-9]*$/.test(g))set.add(g);});
    Object.keys(c.meetLinks||{}).forEach(g=>{if(/^G[1-9][0-9]*$/.test(g))set.add(g);});
  }
  for(const s of snapshot?.students||[]){
    const g=s.groups?.[$('course').value];
    if(g&&/^G[1-9][0-9]*$/.test(g))set.add(g);
  }
  for(const key of Object.keys(snapshot?.schedules||{})){
    const [cid,g]=key.split(':');
    if(cid===$('course').value&&/^G[1-9][0-9]*$/.test(g))set.add(g);
  }
  return [...set].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
}

function selectTargetForUpload(group,code){
  $('group').value=group;
  $('lesson').value=code;
  showCurrent();
  $('videoUrl').focus();
  $('status').textContent=`Listo para publicar en ${$('course').value} · ${group} · ${code}. Pega el enlace o selecciona un video de Drive.`;
}

function showCurrent(){
  const classes=selected(),activeGroup=($('group').value||'G1').trim().toUpperCase();
  const item=classes.find(c=>c.code===$('lesson').value);
  previous=item?.videoLinks?.[activeGroup]||'';
  $('current').textContent=previous
    ?`Estado actual (${activeGroup} · ${item.code}): ✅ Ya tiene grabación publicada. Marca la casilla de reemplazo si deseas actualizarla.`
    :`Estado actual (${activeGroup} · ${item?.code||''}): ⏳ Grabación pendiente de subir.`;
  $('replace').checked=false;
  if($('groupSchedule'))$('groupSchedule').value=scheduleFor($('course').value,activeGroup);
  if($('previewSelectedBtn')){
    const cid=campusIdForSheetCourse($('course').value);
    $('previewSelectedBtn').href=`aula.html?curso=${cid}&grupo=${encodeURIComponent(activeGroup)}`;
    $('previewSelectedBtn').textContent=`👁️ Ver aula como alumno (${$('course').value} · ${activeGroup}) ↗`;
  }
  const groups=courseGroups();
  const summary=$('groupSummary');summary.replaceChildren();
  for(const g of groups){
    const done=classes.filter(c=>Boolean(c.videoLinks?.[g])).length;
    const pending=classes.length-done;
    const sched=scheduleFor($('course').value,g);
    const card=document.createElement('button');card.type='button';
    card.className='admin-stat'+(g===activeGroup?' is-active':'');
    card.append(
      text('strong',`${g}: ${done}/${classes.length} subidas`),
      text('small',pending?`⏳ ${pending} pendiente${pending===1?'':'s'}`:'✅ Grupo al día'),
      text('small',sched?` · 🕒 ${sched}`:'')
    );
    card.onclick=()=>{$('group').value=g;showCurrent();};
    summary.append(card);
  }
  const onlyPending=$('sessionFilter').value==='pending';
  const visible=onlyPending?classes.filter(c=>!c.videoLinks?.[activeGroup]):classes;
  table('sessions',['Código','Título de la sesión',`Estado en ${activeGroup}`,'Otros grupos','Acción'],visible.map(c=>{
    const url=c.videoLinks?.[activeGroup]||'';
    const stateCell=document.createElement('span');
    if(url){
      stateCell.append(text('span','✓ Subida','pill-ok'));
      const a=text('a',' Ver video ↗','text-link small');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
      stateCell.append(a);
    }else{
      stateCell.append(text('span','⏳ Falta subir','pill-pending'));
    }
    const other=document.createElement('span');
    groups.filter(g=>g!==activeGroup).forEach(g=>{
      const has=Boolean(c.videoLinks?.[g]);
      const pill=text('button',`${g}:${has?'✓':'⏳'}`,'btn-xs');
      pill.type='button';
      pill.onclick=()=>selectTargetForUpload(g,c.code);
      other.append(pill);
    });
    const act=text('button',url?'Cambiar':'Subir aquí','btn-xs'+(url?'':' primary'));
    act.type='button';
    act.onclick=()=>selectTargetForUpload(activeGroup,c.code);
    return [c.code,c.title,stateCell,other,act];
  }));
}

function showClasses(){
  const select=$('lesson');select.replaceChildren();
  selected().forEach(c=>{const o=text('option',c.code+' · '+c.title);o.value=c.code;select.append(o);});
  showCurrent();
}

function showStudents(){
  const q=$('search').value.toLowerCase();
  const list=(snapshot?.students||[]).filter(s=>(s.name+' '+s.email+' '+Object.entries(s.groups||{}).map(([id,g])=>id+' '+g).join(' ')).toLowerCase().includes(q));
  $('studentCount').textContent=String((snapshot?.students||[]).length);
  table('students',['Nombre','Usuario / Correo','Cursos, grupos y horarios','Estado'],list.map(s=>[
    s.name,
    s.email,
    Object.entries(s.groups||{}).map(([id,g])=>{
      const sc=scheduleFor(id,g);
      return `${id} · ${g}${sc?' ('+sc+')':''}`;
    }).join(' / '),
    s.status
  ]));
}

function selectedStudent(){
  const email=$('assignEmail').value.trim().toLowerCase();
  const matches=(snapshot?.students||[]).filter(s=>s.email.trim().toLowerCase()===email);
  return matches.length===1?matches[0]:null;
}

function showAssignment(){
  const s=selectedStudent(),group=s?.groups?.[$('assignCourse').value]||'';
  $('assignment').textContent=s?(group?'Grupo actual en este curso: '+group:'El alumno aún no tiene este curso asignado.'):'Selecciona un usuario único existente.';
  $('assignChange').checked=false;
}

function assignedVideoMap(){
  const map=new Map();
  for(const c of snapshot?.classes||[]){
    for(const [g,url] of Object.entries(c.videoLinks||{})){
      const m=String(url||'').match(/\/file\/d\/([\w-]+)/);
      if(m){const list=map.get(m[1])||[];list.push(`${c.cursoId}·${c.code}·${g}`);map.set(m[1],list);}
    }
  }
  return map;
}

function renderVideos(){
  const container=$('videos');container.replaceChildren();
  const used=assignedVideoMap(),onlyNew=$('onlyUnassigned').checked;
  const visible=loadedFiles.filter(f=>!onlyNew||!used.has(f.id));
  for(const file of visible){
    const row=document.createElement('div');
    row.style.cssText='padding:8px 0;border-bottom:1px solid #1f2b33;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap';
    const info=document.createElement('div');
    const a=text('a',file.name,'text-link');a.href=file.url;a.target='_blank';a.rel='noopener noreferrer';
    const where=used.get(file.id);
    const badge=where?text('span','Ya en '+where.join(', '),'pill-ok'):text('span','🟢 Nuevo · Sin publicar','pill-pending');
    info.append(badge,document.createTextNode(' '),a,document.createTextNode(' · '+file.created.slice(0,10)));
    const b=text('button','Usar este video','btn-xs primary');b.type='button';
    b.onclick=()=>{$('videoUrl').value=file.url;$('videoUrl').focus();$('status').textContent=`Video "${file.name}" cargado en el formulario.`;};
    row.append(info,b);container.append(row);
  }
  if(!visible.length)container.append(text('p',loadedFiles.length?'Todos los videos cargados ya están publicados.':'No se encontraron videos en esta carpeta.','small'));
}

async function refresh(autoSync=false){
  const controls=['course','enrollCourse','assignCourse','classCourse'],old=Object.fromEntries(controls.map(id=>[id,$(id).value]));
  snapshot=await rpc('adminSnapshot',token);
  if(autoSync&&snapshot.courses.every(c=>c.id!=='COHETES_101')){
    try{
      await rpc('adminSyncCatalog',token);
      snapshot=await rpc('adminSnapshot',token);
    }catch{}
  }
  for(const id of controls){
    $(id).replaceChildren();
    snapshot.courses.forEach(c=>{const o=text('option',`${c.nombre} (${c.id})`);o.value=c.id;$(id).append(o);});
    if(snapshot.courses.some(c=>c.id===old[id]))$(id).value=old[id];
  }
  const oldLesson=$('lesson').value;showClasses();
  if(selected().some(c=>c.code===oldLesson)){$('lesson').value=oldLesson;showCurrent();}
  updateEnrollScheduleField();
  showStudents();showAssignment();
  if(loadedFiles.length)renderVideos();
  $('studentEmails').replaceChildren();
  [...new Set(snapshot.students.map(s=>s.email.trim()))].forEach(email=>{const o=document.createElement('option');o.value=email;$('studentEmails').append(o);});
  $('status').textContent='✅ Información sincronizada con Google Sheets.';
}

$('loginForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    const result=await rpc('adminLogin',$('secret').value);
    token=result.token;saveAdminSession(token,$('adminUser').value.trim());
    $('secret').value='';await refresh(true);$('login').hidden=true;$('panel').hidden=false;
  });
};

$('logout').onclick=()=>work(async()=>{
  try{await rpc('adminLogout',token);}catch{}
  clearAdminSession();token='';snapshot=null;loadedFiles=[];
  $('message').value='';$('videos').replaceChildren();$('students').replaceChildren();
  $('panel').hidden=true;$('login').hidden=false;$('status').textContent='Sesión cerrada.';
});

$('refresh').onclick=()=>work(()=>refresh(false));
if($('syncCatalog')){
  $('syncCatalog').onclick=()=>work(async()=>{
    const r=await rpc('adminSyncCatalog',token);
    await refresh(false);
    $('status').textContent=`✅ Catálogo verificado (${r.addedCourses||0} cursos y ${r.addedClasses||0} clases añadidas).`;
  });
}
$('course').onchange=showClasses;$('lesson').onchange=showCurrent;$('group').oninput=showCurrent;$('sessionFilter').onchange=showCurrent;$('search').oninput=showStudents;$('onlyUnassigned').onchange=renderVideos;

if($('scheduleForm')){
  $('scheduleForm').onsubmit=e=>{
    e.preventDefault();
    work(async()=>{
      const grp=$('group').value.trim().toUpperCase(),sched=$('groupSchedule').value.trim();
      if(!sched)throw new Error('Escribe el horario del grupo (ej. Martes y Jueves 7:00 pm - 9:00 pm).');
      await rpc('adminSaveSchedule',token,{course:$('course').value,group:grp,schedule:sched});
      await refresh(false);
      $('status').textContent=`✅ Horario guardado para ${$('course').value} · ${grp}: "${sched}".`;
    });
  };
}

async function videos(more){
  const result=await rpc('adminRecordings',token,more?cursor:null);
  if(!more)loadedFiles=[];
  loadedFiles.push(...(result.files||[]));
  cursor=result.cursor;$('more').hidden=!cursor;
  renderVideos();
}
$('loadVideos').onclick=()=>work(()=>videos(false));$('more').onclick=()=>work(()=>videos(true));

$('publishForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    if(previous&&!$('replace').checked)throw new Error('Marca la casilla para confirmar el reemplazo de la grabación existente.');
    await rpc('adminPublish',token,{course:$('course').value,group:$('group').value.trim().toUpperCase(),code:$('lesson').value,url:$('videoUrl').value,previous});
    $('videoUrl').value='';await refresh(false);
    $('status').textContent=`✅ Grabación publicada en ${$('course').value} · ${$('group').value.trim().toUpperCase()} · ${$('lesson').value}.`;
  });
};

function showCredentials(result,studentName='',phone=''){
  const greeting=studentName?`¡Hola, ${studentName}!`:'¡Hola!';
  const sched=result.schedule||scheduleFor(result.course,result.group);
  const schedLine=sched?`\n🕒 Horario: ${sched}`:'';
  const msg=`${greeting} Bienvenido(a) a MECRO 🚀\nTu matrícula ha sido confirmada.\n\n📚 Curso: ${result.course} · Grupo: ${result.group}${schedLine}\n👤 Usuario: ${result.email}\n🔑 Contraseña: ${result.password}\n🔗 Aula virtual: https://mecrodrone.github.io/mecro.github.io/login.html\n\nTienes acceso a todo el material actualizado del curso (lecturas, diapositivas y prácticas) y a las grabaciones de tu grupo.`;
  $('message').value=msg;
  const cleanPhone=String(phone||'').replace(/\D/g,'');
  const waNumber=cleanPhone?(cleanPhone.length===9?'51'+cleanPhone:cleanPhone):'';
  $('waLink').href=`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  $('credentials').hidden=false;
}

$('enrollForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    const studentName=$('name').value.trim(),phone=$('studentPhone').value.trim(),schedule=$('enrollSchedule')?.value.trim()||'';
    const result=await rpc('adminEnroll',token,{name:studentName,email:$('email').value,course:$('enrollCourse').value,group:$('enrollGroup').value.trim().toUpperCase(),schedule,paid:$('paid').checked});
    showCredentials(result,studentName,phone);$('enrollForm').reset();emailTouched=false;await refresh(false);
    $('status').textContent='✅ Matrícula creada. Envía el acceso por WhatsApp con el botón correspondiente.';
  });
};

$('assignEmail').oninput=showAssignment;$('assignCourse').onchange=showAssignment;
$('assignForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    const student=selectedStudent();if(!student)throw new Error('Selecciona un alumno sin registros duplicados.');
    await rpc('adminAssign',token,{email:$('assignEmail').value,course:$('assignCourse').value,group:$('assignGroup').value.trim().toUpperCase(),paid:$('assignPaid').checked,confirmChange:$('assignChange').checked,previousGroup:student.groups?.[$('assignCourse').value]||''});
    await refresh(false);$('status').textContent='✅ Curso y grupo asignados. La contraseña se conserva.';
  });
};

$('resetForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    const result=await rpc('adminResetAccess',token,{email:$('resetEmail').value,confirm:$('resetConfirm').checked});
    showCredentials(result);$('message').focus();$('resetForm').reset();
    $('status').textContent='✅ Acceso renovado. Copia o envía los datos nuevos por WhatsApp.';
  });
};

$('classForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    await rpc('adminCreateClass',token,{course:$('classCourse').value,code:$('classCode').value,title:$('classTitle').value});
    await refresh(false);$('classForm').reset();$('status').textContent='✅ Clase creada, pendiente de grabación.';
  });
};

$('courseForm').onsubmit=e=>{
  e.preventDefault();
  work(async()=>{
    await rpc('adminCreateCourse',token,{id:$('newCourseId').value,name:$('newCourseName').value});
    await refresh(false);$('courseForm').reset();$('status').textContent='✅ Curso creado en el portal de sesiones.';
  });
};

$('copy').onclick=()=>work(async()=>{await navigator.clipboard.writeText($('message').value);$('status').textContent='📋 Mensaje copiado al portapapeles.';});
$('hideCredentials').onclick=()=>{$('message').value='';$('credentials').hidden=true;};

const saved=readAdminSession();
if(saved){
  token=saved.token;
  saveAdminSession(token,saved.email);
  if(saved.email)$('adminUser').value=saved.email;
  work(async()=>{
    try{await refresh(true);$('login').hidden=true;$('panel').hidden=false;}
    catch(e){clearAdminSession();token='';throw e;}
  });
}
