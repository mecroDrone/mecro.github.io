import {cleanProgress,filterLessons,materialPath} from './campus-model.js';
import {embedUrl} from './api.js';
const root=document.getElementById('campus');
let account,course,lesson,reading,tab='reading',revision=0,renderVersion=0,content,lessonNav,courseSelect,search,heading,toast,progressLabel,progressBar,notesInput,completionButton;
let memory={},storageOK=true;
const cache=new Map();
function el(tag,cls='',text=''){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function btn(label,fn,cls='campus-button'){const n=el('button',cls,label);n.type='button';n.addEventListener('click',fn);return n;}
function link(label,href,cls=''){const n=el('a',cls,label);n.href=href;return n;}
function material(relative){return materialPath(course.id,relative);}
async function get(url){const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(response.status===401){throw Object.assign(new Error('Tu sesión terminó. Inicia sesión para continuar.'),{expired:true});}if(!response.ok)throw new Error(response.status===403?'Tu matrícula no incluye este recurso.':'No pudimos cargar este material. Vuelve a intentarlo.');return response.json();}
function storageKey(){return `mecro_campus_${account.profileId}_${course.id}_20261021`;}
function progress(){const key=storageKey();if(!memory[key]){try{memory[key]=cleanProgress(course,JSON.parse(localStorage.getItem(key)||'{}'));}catch{memory[key]=cleanProgress(course);storageOK=false;}}return memory[key];}
function save(){try{localStorage.setItem(storageKey(),JSON.stringify(progress()));}catch{storageOK=false;}updateProgress();}
function say(message){if(toast)toast.textContent=message;}
function updateProgress(){const state=progress(),count=state.completed.length;progressLabel.textContent=`${count} de ${course.lessons.length} clases revisadas`;progressBar.max=course.lessons.length;progressBar.value=count;if(completionButton){const done=state.completed.includes(lesson.n);completionButton.textContent=done?'Clase revisada ✓':'Marcar como revisada';completionButton.setAttribute('aria-pressed',String(done));}if(!storageOK)say('Tu avance se conserva en esta visita. El navegador no permite guardarlo para después.');}
function unavailable(error){root.replaceChildren();const box=el('div','campus-loading');box.append(el('span','eyebrow','MECRO / Campus'),el('h1','',error.expired?'Entra a tu aula.':'El aula necesita conexión.'),el('p','',error.expired?error.message:'El campus integrado se entrega desde el servidor de MECRO. Esta vista no puede acceder a los materiales privados en este momento.'),link('Iniciar sesión','login.html?next=aula','btn'),link('Ver mis sesiones y grupo','portal.html','text-link'),link('Consultar a MECRO','contacto.html','text-link'));root.append(box);}
async function init(){
 try{account=await get('api/campus/courses');if(!account.courses?.length){root.replaceChildren();const box=el('div','campus-loading');box.append(el('h1','','Tu programa está por habilitarse.'),el('p','','No hay un programa de este campus asociado a tu matrícula. El equipo puede revisar la asignación.'),link('Contactar a MECRO','contacto.html','btn'));root.append(box);return;}
 buildShell();const requested=new URLSearchParams(location.search).get('curso');selectCourse(account.courses.find(c=>c.id===requested)?.id||account.courses[0].id,true);
 }catch(error){unavailable(error);}
}
function buildShell(){
 root.replaceChildren();
 const top=el('div','campus-top'),identity=el('div');identity.append(el('span','eyebrow','MECRO Academy / Campus'),el('h1','','Aprende. Construye. Comprueba.'));
 const controls=el('div','campus-controls');const field=el('div','field'),label=el('label','','Tu programa');label.htmlFor='campus-course';courseSelect=el('select');courseSelect.id=label.htmlFor;
 for(const c of account.courses){const option=el('option','',c.title);option.value=c.id;courseSelect.append(option);}courseSelect.addEventListener('change',()=>selectCourse(courseSelect.value));field.append(label,courseSelect);
 controls.append(field,btn('Salir',async()=>{try{const response=await fetch('api/campus/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error();sessionStorage.removeItem('mecro_session');location.assign('login.html');}catch{say('No se pudo cerrar la sesión. Vuelve a intentarlo.');}},'campus-button subtle'));
 top.append(identity,controls);root.append(top);
 if(account.preview)root.append(el('p','preview-banner','Vista previa local del propietario · El contenido privado no se publica en GitHub Pages.'));
 const workspace=el('div','campus-workspace'),sidebar=el('aside','campus-sidebar');sidebar.setAttribute('aria-label','Ruta del curso');
 const sidebarTop=el('div','sidebar-top');sidebarTop.append(el('span','eyebrow','Tu ruta de aprendizaje'));progressLabel=el('p','small');progressBar=el('progress');progressBar.setAttribute('aria-label','Clases revisadas');sidebarTop.append(progressLabel,progressBar);
 const searchLabel=el('label','sr-only','Buscar una clase');searchLabel.htmlFor='lesson-search';search=el('input');search.id='lesson-search';search.type='search';search.placeholder='Buscar tema o clase…';search.addEventListener('input',renderNav);
 lessonNav=el('nav');lessonNav.id='campus-navigation';lessonNav.setAttribute('aria-label','Clases del programa');
 const toggle=btn('Contenido del programa ↓',()=>{const open=sidebar.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));},'campus-button campus-mobile-toggle');toggle.setAttribute('aria-controls',lessonNav.id);toggle.setAttribute('aria-expanded','false');
 sidebar.append(sidebarTop,toggle,searchLabel,search,lessonNav);
 const main=el('div','campus-main');heading=el('div','campus-lesson-heading');main.append(heading);
 const tabs=el('div','campus-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Materiales de la clase');
 const types=[['reading','Lección'],['slides','Diapositivas'],['practice','Práctica'],['resources','Recursos']];
 types.forEach(([id,title],index)=>{const b=btn(title,()=>selectTab(id),'');b.id='campus-tab-'+id;b.dataset.tab=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','campus-content');b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(index+1)%types.length;else if(e.key==='ArrowLeft')n=(index+3)%types.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=3;else return;e.preventDefault();selectTab(types[n][0]);tabs.children[n].focus();});tabs.append(b);});
 content=el('div','campus-content');content.id='campus-content';content.setAttribute('role','tabpanel');content.tabIndex=0;
 toast=el('p','campus-toast');toast.setAttribute('role','status');main.append(tabs,content,toast);
 const rail=el('aside','campus-tools');rail.setAttribute('aria-label','Mesa de trabajo');workspace.append(sidebar,main,rail);root.append(workspace);
}
function selectCourse(id,initial=false){course=account.courses.find(c=>c.id===id);if(!course)return;courseSelect.value=id;search.value='';const requested=initial?Number(new URLSearchParams(location.search).get('clase')):0;selectLesson(course.lessons.find(l=>l.n===requested)||course.lessons.find(l=>l.n===progress().last)||course.lessons[0]);}
function renderNav(){
 lessonNav.replaceChildren();const visible=filterLessons(course.lessons,search.value);let week=0;
 for(const l of visible){if(l.week!==week){week=l.week;lessonNav.append(el('h2','week-label',`SEMANA ${String(week).padStart(2,'0')}`));}
 const button=btn('',()=>selectLesson(l),'campus-lesson-link');const copy=el('span');copy.append(el('strong','',l.title),el('small','',`${l.mode} · ${l.hours} h`));button.append(el('span','lesson-number',progress().completed.includes(l.n)?'✓':String(l.n).padStart(2,'0')),copy);button.dataset.lesson=l.n;if(l.n===lesson?.n)button.setAttribute('aria-current','page');lessonNav.append(button);}
 if(!visible.length)lessonNav.append(el('p','small muted','No hay clases con ese término.'));
}
async function selectLesson(value){
 const restoreFocus=lessonNav.contains(document.activeElement);
 lesson=value;reading=null;tab='reading';const generation=++revision;
 progress().last=lesson.n;save();renderNav();
 if(restoreFocus)lessonNav.querySelector('[aria-current]')?.focus();
 const url=new URL(location.href);url.searchParams.set('curso',course.id);url.searchParams.set('clase',lesson.n);history.replaceState(null,'',url);
 heading.replaceChildren(el('span','eyebrow',`SEMANA ${lesson.week} / CLASE ${String(lesson.n).padStart(2,'0')}`),el('h2','',lesson.title),el('p','',lesson.goal));
 const meta=el('div','lesson-meta');meta.append(el('span','',lesson.mode),el('span','',`${lesson.hours} horas`),el('span','','Lectura + práctica'));heading.append(meta);
 renderTools();selectTab('reading');
 try{const key=material(lesson.reading);const loaded=cache.get(key)||await get(key);if(generation!==revision)return;reading=loaded;cache.set(key,reading);renderTools();renderTab();}
 catch(error){if(generation!==revision)return;if(error.expired)return unavailable(error);content.replaceChildren(el('h3','','Material no disponible'),el('p','',error.message),btn('Volver a intentar',()=>selectLesson(lesson)));content.setAttribute('aria-busy','false');}
}
function renderTools(){
 const rail=root.querySelector('.campus-tools');rail.replaceChildren();rail.append(el('span','eyebrow','Mesa de trabajo'),el('h2','','El resultado de esta clase'),el('p','',lesson.delivery));
 completionButton=btn('',()=>{const state=progress();state.completed=state.completed.includes(lesson.n)?state.completed.filter(n=>n!==lesson.n):[...state.completed,lesson.n];save();renderNav();say('Avance personal actualizado. La evaluación académica corresponde al instructor.');},'campus-button complete-button');rail.append(completionButton,el('p','small muted','Marca la clase cuando termines de revisarla. Este registro es personal, no una calificación.'));
 const notes=el('section','campus-notes');const label=el('label','','Tu bitácora');label.htmlFor='lesson-notes';notesInput=el('textarea');notesInput.id=label.htmlFor;notesInput.rows=7;notesInput.maxLength=12000;notesInput.placeholder='Ideas, medidas, dudas y resultados…';notesInput.value=progress().notes[lesson.n]||'';
 const noteStatus=el('p','small muted','Se guarda en este navegador, para esta cuenta.');noteStatus.setAttribute('role','status');notesInput.addEventListener('input',()=>{progress().notes[lesson.n]=notesInput.value;save();noteStatus.textContent=storageOK?'Bitácora guardada en este navegador.':'Solo guardado durante esta visita.';});
 notes.append(label,notesInput,noteStatus,btn('Exportar mis notas ↓',()=>{const text=`# ${course.title}\n\n## Clase ${lesson.n}: ${lesson.title}\n\n${notesInput.value}\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=link('',url);a.download=`MECRO-${course.id}-clase-${lesson.n}-notas.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'campus-button subtle'));rail.append(notes);
 rail.append(el('h3','','Sigue explorando'),btn('Grabaciones de mi grupo',renderRecordings,'campus-button subtle'),link('Sílabo del programa ↗',course.syllabusPdf,'tool-link'),link('Sesiones y enlaces de mi grupo ↗','portal.html','tool-link'));
 const route=course.id==='uav'?'drones':course.id==='cohetes'?'coheteria':'esp32';rail.append(link('Mesa interactiva de hardware ↗',`kits.html?ruta=${route}#explorar`,'tool-link'));
 if(reading?.projects?.length)for(const n of reading.projects)rail.append(link(`Laboratorio ESP32 · Proyecto ${n} ↗`,`laboratorio.html?proyecto=${n}`,'tool-link'));
 updateProgress();
}
async function renderRecordings(){
 const version=++renderVersion;tab='recordings';
 root.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected','false');b.tabIndex=0;});
 content.removeAttribute('aria-labelledby');content.setAttribute('aria-label','Grabaciones de mi grupo');content.setAttribute('aria-busy','true');
 content.replaceChildren(sectionTitle('Grabaciones de tu grupo'),el('p','','Conservamos las sesiones de tu programa original. Los materiales actualizados son una ruta complementaria; su numeración y el hardware pueden ser diferentes.'),el('p','','Buscando tus sesiones…'));
 try{
  const data=await get(`api/campus/recordings?curso=${encodeURIComponent(course.id)}`);if(version!==renderVersion)return;
  content.lastChild.remove();
  if(data.preview){content.append(el('p','notice','La vista previa no representa una matrícula. Inicia sesión con una cuenta de alumno para comprobar sus grabaciones reales.'));return;}
  if(!data.recordings.length)content.append(el('p','','No hay sesiones asociadas a tu curso y grupo. Contacta con MECRO para revisar tu matrícula.'));
  for(const item of data.recordings){
   const row=el('section','reading-case');row.append(el('span','eyebrow',`${item.group} · ${item.code}`),el('h3','',item.title));
   if(!item.video){row.append(el('p','','Grabación pendiente de publicación.'));}
   else {const target=link('Abrir grabación ↗',item.video,'campus-button subtle');target.target='_blank';target.rel='noopener';const embed=embedUrl(item.video);if(embed)row.append(btn('Reproducir aquí',()=>{const frame=el('iframe','presentation-frame');frame.title=item.title;frame.src=embed;frame.allow='fullscreen';row.querySelector('iframe')?.remove();row.append(frame);},'campus-button'));row.append(target);}
   content.append(row);
  }
  content.append(el('p','small muted','El video conserva los permisos de acceso de Google Drive. Si Google solicita acceso, comunícalo al instructor.'));
 }catch(error){if(version===renderVersion){if(error.expired)return unavailable(error);content.append(el('p','notice',error.message),btn('Reintentar',renderRecordings));}}
 finally{if(version===renderVersion)content.setAttribute('aria-busy','false');}
}
function selectTab(id){tab=id;content.removeAttribute('aria-label');root.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});content.setAttribute('aria-labelledby','campus-tab-'+id);renderTab();}
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
 try{const data=await get(material(lesson.presentation));if(viewVersion!==renderVersion||tab!=='slides')return;
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
 try{const library=await get(material('biblioteca.json'));if(viewVersion!==renderVersion||tab!=='resources')return;
 const items=library.files.filter(file=>!/_Clase_|_Semana_|Programa/.test(file));
 for(const file of items){const name=file.split('/').pop();content.append(resourceRow(name.replace(/_/g,' ').replace(/\.[^.]+$/,''),name.split('.').pop().toUpperCase(),file));}
 }catch(error){if(viewVersion===renderVersion&&tab==='resources')content.append(el('p','notice',error.message));}
}
function renderPager(){const index=course.lessons.indexOf(lesson),nav=el('nav','campus-pager');nav.setAttribute('aria-label','Continuar el curso');const previous=btn('← Clase anterior',()=>selectLesson(course.lessons[index-1])),next=btn('Siguiente clase →',()=>selectLesson(course.lessons[index+1]));previous.disabled=index===0;next.disabled=index===course.lessons.length-1;nav.append(previous,next);content.append(nav);}
function renderTab(){if(tab==='recordings'){renderRecordings();return;}const viewVersion=++renderVersion;content.replaceChildren();content.setAttribute('aria-busy',String(!reading));if(!reading){content.append(el('p','campus-loading-inline','Preparando el material de la clase…'));return;}if(tab==='reading')renderReading();else if(tab==='practice')renderPractice();else if(tab==='slides')renderSlides(viewVersion);else renderResources(viewVersion);}
init();
