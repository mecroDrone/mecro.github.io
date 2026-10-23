import {cleanProgress,filterLessons,materialPath} from './campus-model.js';
import {embedUrl,readSession,clearSession,request,groupLink,normalizeGroup} from './api.js';

const COURSE_ALIASES={
  uav:['uav','DRONES_101','DRONES_102'],
  cohetes:['cohetes','COHETES_101'],
  esp32:['esp32','ES32_AUTOMATION','ESP32_AUTOMATION']
};
const SHEET_COURSE_ID={uav:'DRONES_101',cohetes:'COHETES_101',esp32:'ES32_AUTOMATION'};
const root=document.getElementById('campus');
let account,course,lesson,reading,tab='reading',revision=0,renderVersion=0,staticMode=false,previewGroup='G1';
let content,lessonNav,courseSelect,search,heading,toast,progressLabel,progressBar,notesInput,completionButton,scheduleBanner;
let memory={},storageOK=true,adminSnapCache=null,studentCatalogCache=null;
const cache=new Map();

function el(tag,cls='',text=''){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function btn(label,fn,cls='campus-button'){const n=el('button',cls,label);n.type='button';n.addEventListener('click',fn);return n;}
function link(label,href,cls=''){const n=el('a',cls,label);n.href=href;return n;}

function readAdmin(){
  try{
    const raw=JSON.parse(sessionStorage.getItem('mecro_admin_session'));
    if(!raw||!raw.token||!Number.isFinite(raw.expiresAt)||raw.expiresAt<=Date.now())return null;
    return raw;
  }catch{return null;}
}

function material(relative){
  const validated=materialPath(course.id,relative);
  if(!staticMode)return validated;
  return validated.replace(/^api\/campus\//,'');
}

async function get(url){
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(response.status===401)throw Object.assign(new Error('Tu sesión terminó. Inicia sesión para continuar.'),{expired:true});
  if(!response.ok)throw new Error(response.status===403?'Tu matrícula no incluye este recurso.':'No pudimos cargar este material. Vuelve a intentarlo.');
  return response.json();
}

function storageKey(){return `mecro_campus_${account.profileId}_${course.id}_20261021`;}
function progress(){const key=storageKey();if(!memory[key]){try{memory[key]=cleanProgress(course,JSON.parse(localStorage.getItem(key)||'{}'));}catch{memory[key]=cleanProgress(course);storageOK=false;}}return memory[key];}
function save(){try{localStorage.setItem(storageKey(),JSON.stringify(progress()));}catch{storageOK=false;}updateProgress();}
function say(message){if(toast)toast.textContent=message;}

function updateProgress(){
  const state=progress(),count=state.completed.length;
  progressLabel.textContent=`${count} de ${course.lessons.length} clases revisadas`;
  progressBar.max=course.lessons.length;progressBar.value=count;
  if(completionButton){
    const done=state.completed.includes(lesson.n);
    completionButton.textContent=done?'Clase revisada ✓':'Marcar como revisada';
    completionButton.setAttribute('aria-pressed',String(done));
  }
  if(!storageOK)say('Tu avance se conserva en esta visita. El navegador no permite guardarlo para después.');
}

function unavailable(error){
  root.replaceChildren();
  const box=el('div','campus-loading');
  box.append(
    el('span','eyebrow','MECRO / Campus'),
    el('h1','',error.expired?'Entra a tu aula.':'Inicia sesión para entrar al aula.'),
    el('p','',error.message||'Ingresa con tu usuario y contraseña para ver tus cursos, materiales y grabaciones.'),
    link('Iniciar sesión','login.html?next=aula','btn'),
    link('Consultar a MECRO','contacto.html','text-link')
  );
  root.append(box);
}

function activeStudentGroup(courseId){
  if(account?.isAdmin)return previewGroup;
  const user=account?.user;if(!user)return '';
  const aliases=COURSE_ALIASES[courseId]||[courseId];
  for(const id of aliases){
    if(user.grupos&&user.grupos[id])return normalizeGroup(user.grupos[id]);
  }
  return normalizeGroup(user.grupo)||'G1';
}

async function initStaticAccount(){
  const admin=readAdmin();
  const user=readSession();
  if(!admin&&!user)throw Object.assign(new Error('Inicia sesión con tu cuenta de alumno o administrador para acceder al aula.'),{expired:true});
  const catalog=await get('data/campus.json');
  const requestedGroup=normalizeGroup(new URLSearchParams(location.search).get('grupo')||'');
  if(requestedGroup)previewGroup=requestedGroup;
  if(admin){
    return {
      name:'Administrador MECRO (Vista de alumno)',
      profileId:'admin_preview',
      preview:false,
      isAdmin:true,
      adminToken:admin.token,
      user:{nombre:'Administrador MECRO',email:admin.email||'admin@macro.pe',cursosInscritos:['uav','cohetes','esp32'],grupo:previewGroup,grupos:{}},
      courses:catalog.courses
    };
  }
  const enrolled=new Set(user.cursosInscritos||[]);
  const allowed=catalog.courses.filter(c=>(COURSE_ALIASES[c.id]||[c.id]).some(id=>enrolled.has(id)));
  return {
    name:user.nombre||'Estudiante',
    profileId:encodeURIComponent(user.email||'student').slice(0,24),
    preview:false,
    isAdmin:false,
    user,
    courses:allowed
  };
}

async function init(){
  try{
    try{
      account=await get('api/campus/courses');
      staticMode=false;
    }catch{
      staticMode=true;
      account=await initStaticAccount();
    }
    if(!account.courses?.length){
      root.replaceChildren();
      const box=el('div','campus-loading');
      box.append(el('h1','','Tu programa está por habilitarse.'),el('p','','No encontramos un programa asociado a tu matrícula actual. El equipo puede revisar tu inscripción.'),link('Contactar a MECRO','contacto.html','btn'),link('Cambiar de cuenta','login.html','text-link'));
      root.append(box);return;
    }
    buildShell();
    const params=new URLSearchParams(location.search);
    const requested=params.get('curso');
    selectCourse(account.courses.find(c=>c.id===requested)?.id||account.courses[0].id,true);
    if(params.get('tab')==='recordings')selectTab('recordings');
  }catch(error){unavailable(error);}
}

function buildShell(){
  root.replaceChildren();
  if(account.isAdmin){
    const adminBar=el('div','preview-banner');
    adminBar.style.cssText='display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:12px 16px';
    const left=el('div');
    left.append(el('strong','','👁️ Modo Vista de Alumno (Administrador) · '));
    left.append(document.createTextNode('Tienes acceso total a los 3 cursos. Puedes cambiar el grupo para verificar qué grabaciones y horario ve cada grupo.'));
    const right=el('div');
    right.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    const grpLabel=el('label','small','Simular grupo:');grpLabel.htmlFor='admin-preview-group';
    const grpInput=el('select');grpInput.id='admin-preview-group';
    ['G1','G2','G3','G4','G5','G6','G7','G8','G9','G10'].forEach(g=>{const o=el('option','',g);o.value=g;grpInput.append(o);});
    grpInput.value=previewGroup;
    grpInput.addEventListener('change',()=>{
      previewGroup=grpInput.value;
      updateScheduleBanner();
      if(tab==='recordings')renderRecordings();
    });
    const backAdmin=link('← Volver al Panel Admin','admin.html','campus-button subtle');
    right.append(grpLabel,grpInput,backAdmin);
    adminBar.append(left,right);
    root.append(adminBar);
  }
  const top=el('div','campus-top'),identity=el('div');
  identity.append(el('span','eyebrow',`MECRO Academy / Hola, ${account.name}`),el('h1','','Aprende. Construye. Comprueba.'));
  scheduleBanner=el('p','small');
  identity.append(scheduleBanner);
  const controls=el('div','campus-controls');
  const field=el('div','field'),label=el('label','','Tu programa');label.htmlFor='campus-course';
  courseSelect=el('select');courseSelect.id=label.htmlFor;
  for(const c of account.courses){const option=el('option','',c.title);option.value=c.id;courseSelect.append(option);}
  courseSelect.addEventListener('change',()=>selectCourse(courseSelect.value));
  field.append(label,courseSelect);
  controls.append(field,btn('Salir',async()=>{
    try{if(!staticMode)await fetch('api/campus/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}catch{}
    clearSession();location.assign('login.html');
  },'campus-button subtle'));
  top.append(identity,controls);root.append(top);
  if(account.preview)root.append(el('p','preview-banner','Vista previa local del propietario.'));
  const workspace=el('div','campus-workspace'),sidebar=el('aside','campus-sidebar');sidebar.setAttribute('aria-label','Ruta del curso');
  const sidebarTop=el('div','sidebar-top');sidebarTop.append(el('span','eyebrow','Tu ruta de aprendizaje'));
  progressLabel=el('p','small');progressBar=el('progress');progressBar.setAttribute('aria-label','Clases revisadas');
  sidebarTop.append(progressLabel,progressBar);
  const searchLabel=el('label','sr-only','Buscar una clase');searchLabel.htmlFor='lesson-search';
  search=el('input');search.id='lesson-search';search.type='search';search.placeholder='Buscar tema o clase…';search.addEventListener('input',renderNav);
  lessonNav=el('nav');lessonNav.id='campus-navigation';lessonNav.setAttribute('aria-label','Clases del programa');
  const toggle=btn('Contenido del programa ↓',()=>{const open=sidebar.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));},'campus-button campus-mobile-toggle');
  toggle.setAttribute('aria-controls',lessonNav.id);toggle.setAttribute('aria-expanded','false');
  sidebar.append(sidebarTop,toggle,searchLabel,search,lessonNav);
  const main=el('div','campus-main');heading=el('div','campus-lesson-heading');main.append(heading);
  const tabs=el('div','campus-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Materiales de la clase');
  const types=[['reading','Lección'],['slides','Diapositivas'],['practice','Práctica'],['resources','Recursos'],['recordings','Grabaciones de mi grupo']];
  types.forEach(([id,title],index)=>{
    const b=btn(title,()=>selectTab(id),'');b.id='campus-tab-'+id;b.dataset.tab=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','campus-content');
    b.addEventListener('keydown',e=>{
      let n;
      if(e.key==='ArrowRight')n=(index+1)%types.length;
      else if(e.key==='ArrowLeft')n=(index+types.length-1)%types.length;
      else if(e.key==='Home')n=0;
      else if(e.key==='End')n=types.length-1;
      else return;
      e.preventDefault();selectTab(types[n][0]);tabs.children[n].focus();
    });
    tabs.append(b);
  });
  content=el('div','campus-content');content.id='campus-content';content.setAttribute('role','tabpanel');content.tabIndex=0;
  toast=el('p','campus-toast');toast.setAttribute('role','status');main.append(tabs,content,toast);
  const rail=el('aside','campus-tools');rail.setAttribute('aria-label','Mesa de trabajo');
  workspace.append(sidebar,main,rail);root.append(workspace);
}

async function fetchGroupData(courseId){
  const sheetId=SHEET_COURSE_ID[courseId]||courseId;
  const grp=activeStudentGroup(courseId);
  if(!staticMode){
    const data=await get(`api/campus/recordings?curso=${encodeURIComponent(courseId)}`);
    return {preview:data.preview,group:grp,schedule:'',recordings:data.recordings||[]};
  }
  if(account.isAdmin&&account.adminToken){
    if(!adminSnapCache){
      const res=await request('adminSnapshot',{token:account.adminToken});
      if(res?.success)adminSnapCache=res.result;
    }
    const classes=(adminSnapCache?.classes||[]).filter(c=>c.cursoId===sheetId);
    const schedule=adminSnapCache?.schedules?.[`${sheetId}:${grp}`]||'';
    return {
      preview:false,
      group:grp,
      schedule,
      recordings:classes.map(c=>({courseId:sheetId,group:grp,code:c.code,title:c.title,video:groupLink(c,'video',grp),meet:groupLink(c,'meet',grp)}))
    };
  }
  if(!studentCatalogCache){
    studentCatalogCache=await request('catalog');
  }
  if(!studentCatalogCache||studentCatalogCache.success!==true)throw new Error('No pudimos consultar las grabaciones de tu grupo.');
  const aliases=COURSE_ALIASES[courseId]||[courseId];
  const classes=(studentCatalogCache.clases||[]).filter(c=>aliases.includes(String(c.cursoId||'')));
  const schedule=studentCatalogCache.horarios?.[sheetId]||'';
  return {
    preview:false,
    group:grp,
    schedule,
    recordings:classes.map(c=>({courseId:c.cursoId,group:grp,code:c.code,title:c.title,video:groupLink(c,'video',grp),meet:groupLink(c,'meet',grp)}))
  };
}

async function updateScheduleBanner(){
  if(!scheduleBanner||!course)return;
  const grp=activeStudentGroup(course.id);
  scheduleBanner.textContent=grp?`Grupo asignado: ${grp} · Consultando horario…`:'';
  try{
    const info=await fetchGroupData(course.id);
    scheduleBanner.textContent=info.schedule
      ?`📌 Grupo ${info.group} · 🕒 Horario de clases en vivo: ${info.schedule}`
      :`📌 Grupo ${info.group} · Revisa tu material actualizado y las grabaciones de tus sesiones.`;
  }catch{
    scheduleBanner.textContent=grp?`📌 Grupo ${grp}`:'';
  }
}

function selectCourse(id,initial=false){
  course=account.courses.find(c=>c.id===id);if(!course)return;
  courseSelect.value=id;search.value='';
  updateScheduleBanner();
  const requested=initial?Number(new URLSearchParams(location.search).get('clase')):0;
  selectLesson(course.lessons.find(l=>l.n===requested)||course.lessons.find(l=>l.n===progress().last)||course.lessons[0]);
}

function renderNav(){
  lessonNav.replaceChildren();const visible=filterLessons(course.lessons,search.value);let week=0;
  for(const l of visible){
    if(l.week!==week){week=l.week;lessonNav.append(el('h2','week-label',`SEMANA ${String(week).padStart(2,'0')}`));}
    const button=btn('',()=>selectLesson(l),'campus-lesson-link');const copy=el('span');
    copy.append(el('strong','',l.title),el('small','',`${l.mode} · ${l.hours} h`));
    button.append(el('span','lesson-number',progress().completed.includes(l.n)?'✓':String(l.n).padStart(2,'0')),copy);
    button.dataset.lesson=l.n;if(l.n===lesson?.n)button.setAttribute('aria-current','page');lessonNav.append(button);
  }
  if(!visible.length)lessonNav.append(el('p','small muted','No hay clases con ese término.'));
}

async function selectLesson(value){
  const restoreFocus=lessonNav.contains(document.activeElement);
  lesson=value;reading=null;if(tab==='recordings')tab='reading';const generation=++revision;
  progress().last=lesson.n;save();renderNav();
  if(restoreFocus)lessonNav.querySelector('[aria-current]')?.focus();
  const url=new URL(location.href);url.searchParams.set('curso',course.id);url.searchParams.set('clase',lesson.n);history.replaceState(null,'',url);
  heading.replaceChildren(el('span','eyebrow',`SEMANA ${lesson.week} / CLASE ${String(lesson.n).padStart(2,'0')}`),el('h2','',lesson.title),el('p','',lesson.goal));
  const meta=el('div','lesson-meta');meta.append(el('span','',lesson.mode),el('span','',`${lesson.hours} horas`),el('span','','Lectura + diapositivas + práctica'));heading.append(meta);
  renderTools();selectTab(tab);
  try{
    const key=material(lesson.reading);const loaded=cache.get(key)||await get(key);
    if(generation!==revision)return;reading=loaded;cache.set(key,reading);renderTools();renderTab();
  }catch(error){
    if(generation!==revision)return;if(error.expired)return unavailable(error);
    content.replaceChildren(el('h3','','Material no disponible'),el('p','',error.message),btn('Volver a intentar',()=>selectLesson(lesson)));
    content.setAttribute('aria-busy','false');
  }
}

function renderTools(){
  const rail=root.querySelector('.campus-tools');rail.replaceChildren();
  rail.append(el('span','eyebrow','Mesa de trabajo'),el('h2','','El resultado de esta clase'),el('p','',lesson.delivery));
  completionButton=btn('',()=>{
    const state=progress();
    state.completed=state.completed.includes(lesson.n)?state.completed.filter(n=>n!==lesson.n):[...state.completed,lesson.n];
    save();renderNav();say('Avance personal actualizado. La evaluación académica corresponde al instructor.');
  },'campus-button complete-button');
  rail.append(completionButton,el('p','small muted','Marca la clase cuando termines de revisarla. Este registro es personal, no una calificación.'));
  const notes=el('section','campus-notes');const label=el('label','','Tu bitácora');label.htmlFor='lesson-notes';
  notesInput=el('textarea');notesInput.id=label.htmlFor;notesInput.rows=7;notesInput.maxLength=12000;notesInput.placeholder='Ideas, medidas, dudas y resultados…';notesInput.value=progress().notes[lesson.n]||'';
  const noteStatus=el('p','small muted','Se guarda en este navegador, para esta cuenta.');noteStatus.setAttribute('role','status');
  notesInput.addEventListener('input',()=>{progress().notes[lesson.n]=notesInput.value;save();noteStatus.textContent=storageOK?'Bitácora guardada en este navegador.':'Solo guardado durante esta visita.';});
  notes.append(label,notesInput,noteStatus,btn('Exportar mis notas ↓',()=>{
    const text=`# ${course.title}\n\n## Clase ${lesson.n}: ${lesson.title}\n\n${notesInput.value}\n`;
    const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
    const a=link('',url);a.download=`MECRO-${course.id}-clase-${lesson.n}-notas.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'campus-button subtle'));
  rail.append(notes);
  rail.append(el('h3','','Sigue explorando'),btn('🎥 Ver grabaciones de mi grupo',()=>selectTab('recordings'),'campus-button subtle'),link('Sílabo oficial en PDF ↗',course.syllabusPdf,'tool-link'));
  const route=course.id==='uav'?'drones':course.id==='cohetes'?'coheteria':'esp32';
  rail.append(link('Mesa interactiva de hardware ↗',`kits.html?ruta=${route}#explorar`,'tool-link'));
  if(reading?.projects?.length)for(const n of reading.projects)rail.append(link(`Laboratorio ESP32 · Proyecto ${n} ↗`,`laboratorio.html?proyecto=${n}`,'tool-link'));
  updateProgress();
}

async function renderRecordings(){
  const version=++renderVersion;tab='recordings';
  content.setAttribute('aria-busy','true');
  content.replaceChildren(
    sectionTitle('Grabaciones y sesiones de tu grupo'),
    el('p','','Aquí se publican las grabaciones de las clases en vivo de tu grupo conforme avanzan las sesiones, además de las grabaciones históricas de tu edición.'),
    el('p','','Consultando las grabaciones de tu grupo…')
  );
  try{
    const data=await fetchGroupData(course.id);if(version!==renderVersion)return;
    content.lastChild.remove();
    if(data.preview){content.append(el('p','notice','La vista previa local no representa una matrícula. Inicia sesión con una cuenta de alumno o administrador para comprobar las grabaciones reales.'));return;}
    const groupInfo=el('section','reading-case');
    groupInfo.append(
      el('span','eyebrow',`TU GRUPO ASIGNADO: ${data.group||'G1'}`),
      el('h4','',data.schedule?`🕒 Horario de clases: ${data.schedule}`:'Horario de clases en coordinación con tu instructor'),
      el('p','small muted','Las grabaciones se habilitan para tu grupo después de cada sesión en Google Meet.')
    );
    content.append(groupInfo);
    if(!data.recordings.length)content.append(el('p','','Aún no hay sesiones registradas para este curso en la hoja de control.'));
    for(const item of data.recordings){
      const row=el('section','reading-case');
      row.append(el('span','eyebrow',`${item.group} · ${item.code}`),el('h3','',item.title));
      if(item.meet){
        const meetBtn=link('Unirse a Google Meet ↗',item.meet,'campus-button subtle');
        meetBtn.target='_blank';meetBtn.rel='noopener noreferrer';
        row.append(meetBtn,document.createTextNode(' '));
      }
      if(!item.video){
        row.append(el('p','small muted','⏳ Grabación pendiente de subida para este grupo.'));
      }else{
        const target=link('Abrir grabación en Drive ↗',item.video,'campus-button subtle');target.target='_blank';target.rel='noopener';
        const embed=embedUrl(item.video);
        if(embed)row.append(btn('▶ Reproducir aquí',()=>{const frame=el('iframe','presentation-frame');frame.title=item.title;frame.src=embed;frame.allow='fullscreen';row.querySelector('iframe')?.remove();row.append(frame);},'campus-button'));
        row.append(target);
      }
      content.append(row);
    }
    content.append(el('p','small muted','El video conserva los permisos de acceso de Google Drive. Si Google solicita acceso, comunícalo al instructor.'));
  }catch(error){
    if(version===renderVersion){
      if(error.expired)return unavailable(error);
      content.append(el('p','notice',error.message),btn('Reintentar',renderRecordings));
    }
  }finally{if(version===renderVersion)content.setAttribute('aria-busy','false');}
}

function selectTab(id){
  tab=id;content.removeAttribute('aria-label');
  root.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  content.setAttribute('aria-labelledby','campus-tab-'+id);renderTab();
}
function sectionTitle(text){return el('h3','',text);}
function disclosure(title,answer){const d=el('details','practice-answer');d.append(el('summary','',title),el('p','',answer));return d;}
function renderBlock(block,parent){
  switch(block.type){
  case 'p':parent.append(el('p','',block.text));break;
  case 'h':parent.append(el('h4','',block.text));break;
  case 'note':parent.append(el('aside','reading-note',block.text));break;
  case 'steps':{const list=el('ol','reading-steps');block.items.forEach(item=>list.append(el('li','',item)));parent.append(list);break;}
  case 'image':{const src=reading.assetMap[block.name];if(!src)break;const figure=el('figure');const img=el('img');img.src=material(src);img.alt=block.caption||block.name;img.loading='lazy';figure.append(img,el('figcaption','',block.caption||''));parent.append(figure);break;}
  case 'equation':{const box=el('div','reading-equation');if(block.image){const img=el('img');img.src=material(block.image);img.alt=block.tex;img.loading='lazy';box.append(img);}else box.append(el('code','',block.tex));box.append(el('p','',block.text));parent.append(box);break;}
  case 'table':{const wrap=el('div','reading-table');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',block.title||'Tabla del curso');const table=el('table');if(block.title)table.append(el('caption','',block.title));const head=el('thead'),row=el('tr');block.headers.forEach(text=>{const th=el('th','',text);th.scope='col';row.append(th);});head.append(row);const body=el('tbody');block.rows.forEach(values=>{const tr=el('tr');values.forEach(text=>tr.append(el('td','',String(text))));body.append(tr);});table.append(head,body);wrap.append(table);parent.append(wrap);break;}
  case 'case':{const box=el('section','reading-case');box.append(el('span','eyebrow','Caso de estudio'),el('h4','',block.title),el('p','',block.problem),disclosure('Comparar con la respuesta razonada',block.answer));parent.append(box);break;}
  case 'code':{const box=el('div','reading-code');box.append(el('h4','',block.title||'Código de ejemplo'));const pre=el('pre');pre.tabIndex=0;pre.append(el('code','',block.text));box.append(pre,btn('Copiar código',async()=>{try{await navigator.clipboard.writeText(block.text);say('Código copiado.');}catch{say('Selecciona el código y cópialo manualmente.');}},'campus-button subtle'));parent.append(box);break;}
  default:parent.append(el('p','',block.text||''));
  }
}
function renderReading(){
  const toc=el('details','reading-toc');toc.append(el('summary','',`En esta clase · ${reading.pages.length} secciones`));const links=el('nav');links.setAttribute('aria-label','Secciones de la lectura');reading.pages.forEach((p,i)=>links.append(link(`${String(i+1).padStart(2,'0')} ${p.title}`,`#reading-${i}`)));toc.append(links);content.append(toc);
  const article=el('article','lesson-article');reading.pages.forEach((page,index)=>{const section=el('section');section.id='reading-'+index;section.append(el('span','section-number',String(index+1).padStart(2,'0')),sectionTitle(page.title));page.blocks.forEach(block=>renderBlock(block,section));article.append(section);});content.append(article);renderReferences();renderPager();
}
function renderReferences(){const refs=el('details','reading-toc');refs.append(el('summary','','Referencias del material'));const list=el('ul');for(const [id,source] of Object.entries(reading.references||{})){const item=el('li');if(/^https:\/\//.test(source[2])){const a=link(`[${id}] ${source[0]} · ${source[1]} ↗`,source[2]);a.target='_blank';a.rel='noopener noreferrer';item.append(a);}else item.textContent=`[${id}] ${source[0]} · ${source[1]}`;list.append(item);}refs.append(list);content.append(refs);}
function renderPractice(){
  content.append(el('span','eyebrow','Del concepto al banco'),sectionTitle('Tu práctica de esta clase'),el('p','practice-delivery',lesson.delivery));
  if(reading.mission)content.append(el('p','reading-note',reading.mission));
  if(Array.isArray(reading.lab)&&reading.lab.length){const list=el('ol','reading-steps');reading.lab.forEach(step=>list.append(el('li','',step)));content.append(list);}
  else{const instructions=reading.pages.flatMap(p=>p.blocks).filter(b=>b.type==='steps');instructions.forEach(b=>renderBlock(b,content));}
  content.append(sectionTitle('Comprueba tu comprensión'));
  (reading.qas||[]).forEach(([question,answer],i)=>{const box=el('section','reading-case');box.append(el('span','eyebrow',`Pregunta ${i+1}`),el('h4','',question),disclosure('Ver explicación',answer));content.append(box);});
  content.append(el('p','small muted','Las preguntas son de autoevaluación. Documenta tu trabajo en la bitácora; la entrega y revisión se coordinan con tu instructor.'));renderPager();
}
async function renderSlides(viewVersion){
  content.append(sectionTitle(`Presentación · Semana ${lesson.week}`),el('p','muted','Presentación original del curso. Usa los controles del visor para avanzar, ampliar o buscar.'));
  const tools=el('div','resource-actions');tools.append(link('Descargar PPT original ↓',material(lesson.ppt),'campus-button'));content.append(tools);
  try{
    const data=await get(material(lesson.presentation));if(viewVersion!==renderVersion||tab!=='slides')return;
    const pdf=material(data.pdf),a=link('Abrir presentación en otra pestaña ↗',pdf,'campus-button subtle');a.target='_blank';a.rel='noopener';tools.append(a);
    content.append(el('p','small muted',`${data.slides.length} diapositivas · Semana ${data.week}`));
    if(data.slides.every(slide=>slide.image)){
      let index=0;const viewer=el('section','slide-viewer');viewer.setAttribute('aria-label','Visor de diapositivas');viewer.tabIndex=0;
      const picture=el('img'),bar=el('div','slide-controls'),counter=el('span');counter.setAttribute('role','status');
      const previous=btn('← Anterior',()=>show(index-1),'campus-button subtle'),next=btn('Siguiente →',()=>show(index+1),'campus-button subtle');
      const choose=el('select');choose.setAttribute('aria-label','Ir a diapositiva');data.slides.forEach((slide,i)=>{const option=el('option','',`${i+1} · ${slide.text[0]||'Diapositiva'}`);option.value=i;choose.append(option);});choose.addEventListener('change',()=>show(Number(choose.value)));
      function show(value){index=Math.max(0,Math.min(value,data.slides.length-1));const slide=data.slides[index];picture.src=material(slide.image);picture.alt=`Diapositiva ${index+1}: ${slide.text.join(' · ')}`;counter.textContent=`${index+1} / ${data.slides.length}`;choose.value=index;previous.disabled=index===0;next.disabled=index===data.slides.length-1;}
      viewer.addEventListener('keydown',event=>{if(event.target===choose)return;if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}else if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}});
      bar.append(previous,counter,next);viewer.append(picture,bar,choose);content.append(viewer);show(0);
    }else{
      const frame=el('iframe','presentation-frame');frame.src=pdf+'#view=FitH';frame.title=`Diapositivas de ${course.title}, semana ${lesson.week}`;content.append(frame);
      content.append(el('p','small muted','Si tu navegador no muestra el PDF, utiliza «Abrir presentación en otra pestaña» o consulta el texto de las diapositivas.'));
    }
    const transcript=el('details','slide-transcript');transcript.append(el('summary','','Leer texto de las diapositivas'));
    data.slides.forEach(slide=>{const page=el('section');page.append(el('h4','',`Diapositiva ${slide.n}`));slide.text.forEach(text=>page.append(el('p','',text)));transcript.append(page);});content.append(transcript);
  }catch(error){if(viewVersion===renderVersion&&tab==='slides')content.append(el('p','notice',error.message));}
}
function resourceRow(title,description,relative){const row=el('div','campus-resource'),text=el('div');text.append(el('h4','',title),el('p','',description));row.append(text,link('Abrir ↗',material(relative),'campus-button subtle'));return row;}
async function renderResources(viewVersion){
  content.append(sectionTitle('Material de la clase'),resourceRow('Lectura en PDF',`Clase ${lesson.n} · Para consultar o conservar.`,lesson.pdf),resourceRow('Presentación editable',`Semana ${lesson.week} · Archivo PowerPoint original.`,lesson.ppt),sectionTitle('Biblioteca del programa'));
  try{
    const library=await get(material('biblioteca.json'));if(viewVersion!==renderVersion||tab!=='resources')return;
    const items=library.files.filter(file=>!/_Clase_|_Semana_|Programa/.test(file));
    for(const file of items){const name=file.split('/').pop();content.append(resourceRow(name.replace(/_/g,' ').replace(/\.[^.]+$/,''),name.split('.').pop().toUpperCase(),file));}
  }catch(error){if(viewVersion===renderVersion&&tab==='resources')content.append(el('p','notice',error.message));}
}
function renderPager(){const index=course.lessons.indexOf(lesson),nav=el('nav','campus-pager');nav.setAttribute('aria-label','Continuar el curso');const previous=btn('← Clase anterior',()=>selectLesson(course.lessons[index-1])),next=btn('Siguiente clase →',()=>selectLesson(course.lessons[index+1]));previous.disabled=index===0;next.disabled=index===course.lessons.length-1;nav.append(previous,next);content.append(nav);}
function renderTab(){if(tab==='recordings'){renderRecordings();return;}const viewVersion=++renderVersion;content.replaceChildren();content.setAttribute('aria-busy',String(!reading));if(!reading){content.append(el('p','campus-loading-inline','Preparando el material de la clase…'));return;}if(tab==='reading')renderReading();else if(tab==='practice')renderPractice();else if(tab==='slides')renderSlides(viewVersion);else renderResources(viewVersion);}
init();
