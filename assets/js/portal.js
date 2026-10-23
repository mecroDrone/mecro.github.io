import {readSession,clearSession,request,safeUrl,embedUrl,groupLink,materialLink,normalizeGroup} from './api.js';

const user=readSession();
const view=document.getElementById('classroom-view');
const nav=document.getElementById('lesson-navigation');
const selector=document.getElementById('course-selector');
const menu=document.getElementById('classroom-menu');
let courses=[],lessons=[],activeCourse=null,activeLessons=[];

function el(tag,className='',text=''){
  const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}
function link(text,href,className='text-link',external=false){
  const node=el('a',className,text);node.href=href;
  if(external){node.target='_blank';node.rel='noopener noreferrer';}return node;
}
function button(text,callback,className='btn btn-secondary'){
  const node=el('button',className,text);node.type='button';node.addEventListener('click',callback);return node;
}
function leave(){clearSession();location.replace('login.html');}
document.getElementById('logout').addEventListener('click',leave);
menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.focus();}});
window.addEventListener('pageshow',()=>{if(!readSession())leave();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!readSession())leave();});

function state(title,description,retry=false){
  view.replaceChildren();view.setAttribute('aria-busy','false');
  const box=el('div','classroom-state');box.append(el('h2','',title),el('p','',description));
  if(retry)box.append(button('Volver a intentar',init));
  box.append(link('Contactar al equipo','contacto.html','text-link'));
  view.append(box);
}
function group(){return normalizeGroup(user.grupos[activeCourse.id]||user.grupo);}
function consult(text){return 'https://wa.me/51918389333?text='+encodeURIComponent(text);}
function supportText(topic=''){
  return `Hola MECRO, necesito ayuda con ${activeCourse?.nombre||'mi programa'}${group()?' (grupo '+group()+')':''}.${topic?' '+topic:''}`;
}

async function init(){
  if(!readSession()){leave();return;}
  selector.disabled=true;nav.replaceChildren();view.setAttribute('aria-busy','true');
  view.replaceChildren(el('div','classroom-state','Consultando tus programas…'));
  try{
    const data=await request('catalog');
    if(!readSession()){leave();return;}
    if(data.success!==true)throw new Error('El material no está disponible en este momento. Inténtalo de nuevo o contacta al equipo.');
    const assigned=new Set(user.cursosInscritos);
    courses=(Array.isArray(data.cursos)?data.cursos:[])
      .filter(c=>c&&typeof c==='object'&&c.id!=null&&assigned.has(String(c.id).trim()))
      .map(c=>({...c,id:String(c.id).trim(),nombre:typeof c.nombre==='string'?c.nombre:'Programa MECRO'}));
    lessons=(Array.isArray(data.clases)?data.clases:Array.isArray(data.syllabus)?data.syllabus:[]).filter(c=>c&&typeof c==='object');
    selector.replaceChildren();
    if(!courses.length){
      selector.append(el('option','','Sin programas asignados'));
      state('Tu matrícula necesita confirmación.','No encontramos programas asignados a tu cuenta. El equipo puede revisar tu inscripción y habilitar el contenido correspondiente.');return;
    }
    for(const course of courses){const option=el('option','',course.nombre);option.value=course.id;selector.append(option);}
    selector.disabled=false;selectCourse(courses[0].id);
  }catch(error){
    selector.replaceChildren(el('option','','Programas no disponibles'));
    state('No pudimos cargar tu aula.',error.message,true);
  }finally{view.setAttribute('aria-busy','false');}
}
function selectCourse(id){
  activeCourse=courses.find(course=>course.id===id);if(!activeCourse)return;
  // Missing course IDs never grant material from other programs.
  activeLessons=lessons.filter(lesson=>lesson.cursoId!=null&&String(lesson.cursoId).trim()===id);
  renderNav('overview');overview();
}
selector.addEventListener('change',()=>selectCourse(selector.value));

function renderNav(selected){
  nav.replaceChildren();
  const items=[['overview','Resumen del programa',overview],...activeLessons.map((lesson,index)=>[String(index),lesson.title||`Sesión ${index+1}`,()=>lessonView(index)]),['library','Biblioteca y software',library],['certificate','Certificación',certificate]];
  for(const [id,label,action] of items){
    const b=button('',()=>{
      if(!readSession()){leave();return;}
      renderNav(id);action();nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');
      const heading=view.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'nearest'});}
    },'lesson-link');
    b.append(el('span','mono',/^\d+$/.test(id)?String(Number(id)+1).padStart(2,'0'):'—'),el('span','',String(label)));
    if(id===selected)b.setAttribute('aria-current','page');nav.append(b);
  }
}
function heading(title,subtitle=''){
  view.replaceChildren();const box=el('div','lesson-header');
  box.append(el('span','eyebrow',activeCourse.nombre),el('h2','',title));
  if(subtitle)box.append(el('p','',subtitle));
  view.append(box);return box;
}
function overview(){
  heading('Todo tu programa, en un lugar.','Consulta el material y las sesiones disponibles para tu matrícula.');
  const campus=el('section','resource-card');campus.append(el('h3','','Tu mesa de trabajo MECRO'),el('p','','Lecturas completas, presentaciones, prácticas y bitácora personal, dentro del aula.'),link('Abrir el campus integrado ↗','aula.html','btn'));view.append(campus);
  const grid=el('div','course-overview');const copy=el('div');
  copy.append(el('h3','',activeCourse.nombre));
  if(typeof activeCourse.instructor==='string')copy.append(el('p','',`Instructor: ${activeCourse.instructor}`));
  copy.append(el('span','badge',group()?`Grupo ${group()}`:'Grupo pendiente de asignación'));
  copy.append(el('p','',`${activeLessons.length} ${activeLessons.length===1?'sesión disponible':'sesiones disponibles'}.`));
  if(activeLessons.length)copy.append(button('Ir a la primera sesión',()=>{renderNav('0');lessonView(0);},'btn'));
  else copy.append(el('p','notice','El contenido de este curso todavía no está asignado. Consulta con tu instructor para confirmar cuándo estará disponible.'));
  grid.append(copy);
  const photo=typeof activeCourse.foto==='string'?activeCourse.foto:'';
  const local=/^(\.\/)?images\/[a-zA-Z0-9_.-]+$/.test(photo)?photo:'';
  const safePhoto=local||safeUrl(photo);
  if(safePhoto){const img=el('img');img.src=safePhoto;img.alt=activeCourse.nombre;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});grid.append(img);}
  view.append(grid);
  const syllabus=safeUrl(activeCourse.silaboLink);
  if(syllabus)view.append(material('Sílabo del programa',syllabus));
  else view.append(el('p','notice','El sílabo aún no está disponible en el aula. Puedes solicitarlo al equipo.'));
  const follow=el('div','classroom-progress');follow.append(el('h3','','Seguimiento de tu aprendizaje'),el('p','','La asistencia, las evaluaciones y la entrega del proyecto se coordinan con tu instructor. Consulta tu avance académico con el equipo.'));view.append(follow);
}
function resource(title,description,url,label){
  const card=el('section','resource-card');card.append(el('h3','',title),el('p','',description));
  if(url)card.append(link(label,url,'btn btn-secondary',true));
  else card.append(el('span','badge','Pendiente de publicación'));return card;
}
function material(title,url,video=false){
  const section=el('section','material-section'+(video?' video':''));
  const top=el('div','material-heading');top.append(el('h3','',title),link('Abrir en otra pestaña ↗',url,'',true));section.append(top);
  const embed=embedUrl(url);
  if(embed){
    const frame=el('iframe');frame.title=title;frame.loading='lazy';frame.src=embed;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;
    frame.setAttribute('allow','fullscreen; encrypted-media');section.append(frame);
    section.append(el('p','small muted','Si el visor solicita acceso o no carga, abre el material en otra pestaña.'));
  }else section.append(el('p','notice','Este recurso se abre en su plataforma original. Utiliza el enlace de arriba para verlo.'));
  return section;
}
function lessonView(index){
  const lesson=activeLessons[index];if(!lesson)return;
  const title=typeof lesson.title==='string'?lesson.title:`Sesión ${index+1}`;
  const head=heading(title,typeof lesson.focus==='string'?lesson.focus:'Material de estudio y recursos de esta sesión.');
  head.append(el('span','badge',group()?`Grupo ${group()}`:'Tu grupo está pendiente de asignación'));
  const meet=groupLink(lesson,'meet',group());const video=groupLink(lesson,'video',group());
  const slides=materialLink(lesson,'ppt');const pdf=materialLink(lesson,'pdf');
  if(!group())view.append(el('p','notice','Para mostrarte los enlaces de clase y grabación, el equipo debe asignar un grupo a tu matrícula.'));
  const resources=el('div','resource-grid');
  resources.append(resource('Clase en vivo','Accede a la sesión asignada a tu grupo.',meet,'Unirse a la clase ↗'),resource('Presentación','Diapositivas y material visual de esta sesión.',slides,'Abrir presentación ↗'));view.append(resources);
  if(video)view.append(material('Grabación de la sesión',video,true));
  else view.append(el('p','notice','La grabación de esta sesión todavía no está disponible para tu grupo.'));
  if(pdf)view.append(material('Resumen y guía de estudio',pdf));
  const help=el('section','consultation');help.append(el('h3','','Consultas técnicas'),el('p','','Envía tu pregunta al equipo con la referencia de esta sesión. Podrás revisar el mensaje en WhatsApp antes de enviarlo.'));
  const form=el('form');const field=el('div','field');const label=el('label','','Tu consulta');label.htmlFor='lesson-question';
  const textarea=el('textarea');textarea.id='lesson-question';textarea.rows=3;textarea.required=true;textarea.maxLength=1500;field.append(label,textarea);
  const submit=el('button','btn','Consultar por WhatsApp ↗');submit.type='submit';form.append(field,submit);
  form.addEventListener('submit',e=>{e.preventDefault();if(!textarea.value.trim()){textarea.setCustomValidity('Escribe una consulta.');textarea.reportValidity();return;}location.assign(consult(supportText(`Sesión: ${title}.\n\n${textarea.value.trim()}`)));});
  textarea.addEventListener('input',()=>textarea.setCustomValidity(''));help.append(form);view.append(help);
}
function library(){
  heading('Biblioteca y software.','Herramientas oficiales y documentación para tus proyectos.');
  const list=el('div','library-list');
  const items=[['Betaflight Configurator','Configuración de controladores de vuelo.','https://github.com/betaflight/betaflight-configurator/releases'],['ExpressLRS Configurator','Herramientas para sistemas de radio ExpressLRS.','https://github.com/ExpressLRS/ExpressLRS-Configurator/releases'],['Laboratorio ESP32','Teoría, diagramas y código de proyectos MECRO.','laboratorio.html']];
  for(const [title,description,url] of items){const row=el('div','resource-card');const text=el('div');text.append(el('h3','',title),el('p','',description));row.append(text,link('Abrir ↗',url,'btn btn-secondary btn-small',url.startsWith('https:')));list.append(row);}view.append(list);
}
function certificate(){
  heading('Tu certificación.','El equipo confirma el cumplimiento de los requisitos de tu programa.');
  const box=el('section','resource-card');box.append(el('h3','','Consulta el estado de tu certificado'),el('p','','Confirma con tu instructor las sesiones, evaluaciones y el proyecto requeridos para tu edición. Si ya cumpliste los requisitos, solicita la revisión y emisión de tu certificado.'),link('Consultar certificación ↗',consult(supportText('Quiero consultar los requisitos y el estado de mi certificado.')),'btn',true));view.append(box);
}

if(!user){leave();}else{
  document.getElementById('student-name').textContent=`Hola, ${user.nombre}.`;
  init();
}
