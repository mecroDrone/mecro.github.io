import {tracks,guides} from '../../data/hardware-guides.js';
import {connectionKey,portKey,findConnection,freshProgress,sanitizeProgress,guideComplete,portsFor} from './hardware-state.js';
import {partIllustration} from './hardware-art.js';

const storageKey='mecro_hardware_v1';
const workbench=document.getElementById('guide-workbench');
const list=document.getElementById('guide-list');
const trackButtons=[...document.querySelectorAll('[data-track]')];
const storageLabel=document.getElementById('hardware-storage');
let records={},current,mode='parts',selectedPart='',selectedPort='',reference=false;
let pane,board,wireLayer,detail,status,progressOutput,resizeObserver;
let partButtons=new Map(),portButtons=new Map();
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))records=saved;}catch{storageLabel.textContent='El avance se conserva durante esta visita; el almacenamiento no está disponible.';}

function element(tag,className='',text=''){
  const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}
function button(label,action,className='btn btn-secondary btn-small'){
  const node=element('button',className,label);node.type='button';node.addEventListener('click',action);return node;
}
function progress(guide=current){return sanitizeProgress(guide,records[guide.id]);}
function save(value){
  records[current.id]=sanitizeProgress(current,value);
  try{localStorage.setItem(storageKey,JSON.stringify(records));}catch{storageLabel.textContent='El avance se conserva durante esta visita; el almacenamiento no está disponible.';}
  refreshProgress();
}
function refreshProgress(){
  const value=progress();
  if(progressOutput)progressOutput.textContent=guideComplete(current,value)?'Guía revisada ✓':`${value.steps.length}/${current.steps.length} pasos revisados`;
  list.querySelectorAll('[data-guide-status]').forEach(node=>{
    const guide=guides.find(g=>g.id===node.dataset.guideStatus);
    node.textContent=guideComplete(guide,progress(guide))?'Revisada ✓':`${guide.level} · ${guide.parts.length} piezas`;
  });
}
function announce(message,tone='neutral'){
  if(status){status.textContent=message;status.dataset.tone=tone;}
}
function bindTabKeys(buttons,activate){
  buttons.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight')next=(index+1)%buttons.length;
    else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else return;
    event.preventDefault();activate(buttons[next]);buttons[next].focus();
  }));
}
function selectGuide(id,updateUrl=true){
  const restoreGuideFocus=list.contains(document.activeElement);
  current=guides.find(g=>g.id===id)||guides[0];
  const track=tracks.find(t=>t.id===current.track);
  selectedPart=current.parts[0].id;selectedPort='';reference=false;mode='parts';
  trackButtons.forEach(tab=>{const active=tab.dataset.track===track.id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  document.getElementById('track-panel').setAttribute('aria-labelledby','track-'+track.id);
  document.getElementById('track-title').textContent=track.title;
  document.getElementById('track-description').textContent=track.description;
  list.replaceChildren();
  guides.filter(g=>g.track===track.id).forEach((guide,index)=>{
    const choice=button('',()=>selectGuide(guide.id),'guide-choice');choice.setAttribute('aria-current',String(guide.id===current.id));
    const label=element('span','',guide.title),info=element('small');info.dataset.guideStatus=guide.id;label.append(info);
    choice.append(element('span','mono',String(index+1).padStart(2,'0')),label);list.append(choice);
  });
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('ruta',track.id);url.searchParams.set('guia',current.id);history.replaceState(null,'',url);}
  renderWorkbench();
  if(restoreGuideFocus)list.querySelector('[aria-current="true"]')?.focus();
}
trackButtons.forEach(tab=>tab.addEventListener('click',()=>selectGuide(guides.find(g=>g.track===tab.dataset.track).id)));
bindTabKeys(trackButtons,tab=>selectGuide(guides.find(g=>g.track===tab.dataset.track).id));

function renderWorkbench(){
  resizeObserver?.disconnect();workbench.replaceChildren();
  const heading=element('div','workbench-heading'),copy=element('div');
  copy.append(element('span','eyebrow',`${current.kind} / ${current.level}`),element('h2','',current.title),element('p','',current.description));
  progressOutput=element('span','guide-counter');progressOutput.setAttribute('aria-live','polite');heading.append(copy,progressOutput);workbench.append(heading);
  const tabs=element('div','workbench-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Explorar la guía');
  const sections=[['parts','Componentes'],['connections','Conexiones'],['steps','Paso a paso']];
  if(current.code?.text)sections.push(['code','Código']);
  const buttons=sections.map(([id,label])=>{
    const tab=button(label,()=>activate(id),'');tab.id='bench-tab-'+id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','bench-content');tab.dataset.mode=id;tabs.append(tab);return tab;
  });
  pane=element('div','workbench-tab-panel');pane.id='bench-content';pane.setAttribute('role','tabpanel');
  workbench.append(tabs,pane);
  function activate(id){mode=id;selectedPort='';buttons.forEach(b=>{const active=b.dataset.mode===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});pane.setAttribute('aria-labelledby','bench-tab-'+id);renderMode();}
  bindTabKeys(buttons,tab=>activate(tab.dataset.mode));activate(mode);refreshProgress();
}
function renderMode(){
  resizeObserver?.disconnect();pane.replaceChildren();board=null;wireLayer=null;status=null;partButtons=new Map();portButtons=new Map();
  if(mode==='parts'||mode==='connections')renderDiagram();
  else if(mode==='steps')renderSteps();
  else renderCode();
  renderSources();
}
function renderDiagram(){
  if(mode==='connections'){
    status=element('p','connection-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');pane.append(status);
    announce('Selecciona un puerto y después el puerto que le corresponde. Puedes empezar por cualquiera de los dos.');
  }else pane.append(element('p','bench-tip','Selecciona una pieza para conocer su función y lo que debes revisar antes del montaje.'));
  const layout=element('div','bench-layout'),shell=element('div','diagram-shell');
  const toolbar=element('div','diagram-toolbar');toolbar.append(element('span','','MESA DE TRABAJO'),element('span','',`${current.parts.length} PIEZAS`));shell.append(toolbar);
  board=element('div','diagram-board');board.setAttribute('role','group');board.setAttribute('aria-label','Componentes de '+current.title);
  wireLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');wireLayer.classList.add('diagram-wires');wireLayer.setAttribute('aria-hidden','true');board.append(wireLayer);
  current.parts.forEach((part,index)=>{
    const node=element('div','component-node');node.dataset.part=part.id;
    const select=button('',()=>selectPart(part.id),'component-button');select.setAttribute('aria-pressed',String(part.id===selectedPart));
    select.append(element('span','component-number',`PIEZA ${String(index+1).padStart(2,'0')}`));
    if(mode==='parts')select.append(partIllustration(part,current.track));
    select.append(element('strong','',part.name));
    if(mode==='parts')select.append(element('span','node-hint','Explorar componente ↗'));
    node.append(select);partButtons.set(part.id,{button:select,node});
    if(mode==='connections'){
      const ports=element('div','port-list');
      for(const label of portsFor(current,part.id)){
        const key=portKey(part.id,label),port=button(label,()=>choosePort(key),'port-button');
        port.setAttribute('aria-label',`${part.name}: ${label}`);port.setAttribute('aria-pressed','false');
        portButtons.set(key,port);ports.append(port);
      }
      node.append(ports);
    }
    board.append(node);
  });
  shell.append(board,element('p','diagram-caption','Esquema educativo. No es una simulación eléctrica ni un plano de fabricación.'));
  detail=element('aside','part-detail');detail.setAttribute('aria-label','Detalle del componente');detail.setAttribute('aria-live','polite');
  layout.append(shell,detail);pane.append(layout);selectPart(selectedPart);
  if(mode==='connections'){
    const controls=element('div','connection-tools');
    const show=button(reference?'Ocultar referencia':'Ver esquema de referencia',()=>{
      reference=!reference;show.textContent=reference?'Ocultar referencia':'Ver esquema de referencia';show.setAttribute('aria-pressed',String(reference));
      drawWires();renderConnectionLegend();
      announce(reference?'Mostrando la referencia. Verla no completa el ejercicio; empareja los puertos para practicar.':'Referencia oculta. Selecciona dos puertos para seguir practicando.');
    });show.setAttribute('aria-pressed',String(reference));
    controls.append(show,button('Reiniciar conexiones',()=>{
      const value=progress();value.connections=[];save(value);selectedPort='';reference=false;show.textContent='Ver esquema de referencia';show.setAttribute('aria-pressed','false');
      updatePorts();renderConnectionLegend();drawWires();announce('Conexiones reiniciadas. Empieza por un puerto.');
    },'filter-reset'));
    pane.append(controls,element('div','connection-legend'));updatePorts();renderConnectionLegend();
    if('ResizeObserver' in window){resizeObserver=new ResizeObserver(()=>drawWires());resizeObserver.observe(board);}
    requestAnimationFrame(drawWires);
  }
}
function selectPart(id){
  const part=current.parts.find(p=>p.id===id)||current.parts[0];selectedPart=part.id;
  partButtons.forEach(({button,node},key)=>{button.setAttribute('aria-pressed',String(key===selectedPart));node.classList.toggle('is-selected',key===selectedPart);});
  detail.replaceChildren(element('span','eyebrow','Conoce la pieza'),element('h3','',part.name),element('p','',part.role),element('p','part-note',part.note));
}
function choosePort(key){
  if(selectedPort===key){selectedPort='';updatePorts();announce('Selección cancelada. Elige un puerto.');return;}
  if(!selectedPort){selectedPort=key;updatePorts();const [part,port]=JSON.parse(key);selectPart(part);announce(`${port} seleccionado. Elige el puerto que le corresponde.`);return;}
  const match=findConnection(current,selectedPort,key);
  if(match<0){selectedPort='';updatePorts();announce('Estos dos puertos no forman una conexión en esta guía. Revisa la función de las piezas o consulta la referencia.','error');return;}
  const connection=current.connections[match],value=progress(),id=connectionKey(connection);
  const existed=value.connections.includes(id);if(!existed)value.connections.push(id);save(value);selectedPort='';
  updatePorts();renderConnectionLegend();drawWires();
  announce(existed?'Esa conexión ya está registrada.':`Conexión correcta. ${connection.explanation}${value.connections.length===current.connections.length?' Completaste el esquema de esta guía.':''}`,'success');
}
function updatePorts(){
  const completed=new Set(progress().connections);
  portButtons.forEach((button,key)=>{
    button.setAttribute('aria-pressed',String(key===selectedPort));
    const linked=current.connections.some(c=>completed.has(connectionKey(c))&&[portKey(c.from,c.fromPort),portKey(c.to,c.toPort)].includes(key));
    button.classList.toggle('is-connected',linked);
  });
}
function renderConnectionLegend(){
  const legend=pane.querySelector('.connection-legend');if(!legend)return;legend.replaceChildren();
  const completed=new Set(progress().connections);
  const count=element('p','small muted',`${completed.size} de ${current.connections.length} conexiones practicadas`);legend.append(count);
  current.connections.forEach((connection,index)=>{
    if(!reference&&!completed.has(connectionKey(connection)))return;
    const from=current.parts.find(p=>p.id===connection.from),to=current.parts.find(p=>p.id===connection.to);
    const line=element('div','connection-item');line.append(element('span','',completed.has(connectionKey(connection))?'✓':String(index+1).padStart(2,'0')),element('span','',`${from.name} (${connection.fromPort}) ↔ ${to.name} (${connection.toPort}) · ${connection.label}`));legend.append(line);
  });
}
function drawWires(){
  if(!board?.isConnected||!wireLayer||mode!=='connections')return;
  wireLayer.replaceChildren();const bounds=board.getBoundingClientRect(),completed=new Set(progress().connections);
  wireLayer.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
  current.connections.forEach((connection,index)=>{
    const done=completed.has(connectionKey(connection));if(!done&&!reference)return;
    const from=portButtons.get(portKey(connection.from,connection.fromPort)),to=portButtons.get(portKey(connection.to,connection.toPort));if(!from||!to)return;
    const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    const ax=a.left-bounds.left+a.width/2,bx=b.left-bounds.left+b.width/2;
    const ay=a.top-bounds.top+a.height/2,by=b.top-bounds.top+b.height/2;
    const d=Math.abs(ax-bx)<30?`M ${a.right-bounds.left} ${ay} C ${Math.min(bounds.width-6,a.right-bounds.left+25+index*4)} ${ay}, ${Math.min(bounds.width-6,b.right-bounds.left+25+index*4)} ${by}, ${b.right-bounds.left} ${by}`:`M ${ax<bx?a.right-bounds.left:a.left-bounds.left} ${ay} C ${(ax+bx)/2} ${ay}, ${(ax+bx)/2} ${by}, ${ax<bx?b.left-bounds.left:b.right-bounds.left} ${by}`;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);if(!done){path.setAttribute('stroke-dasharray','4 5');path.style.opacity='.35';}wireLayer.append(path);
  });
}
function renderSteps(){
  pane.append(element('p','bench-tip','Revisa cada paso y marca lo que ya entendiste. Este avance es personal y se guarda en este navegador.'));
  const summary=element('div','guide-progress'),bar=element('progress'),label=element('span');bar.max=current.steps.length;bar.setAttribute('aria-label','Pasos revisados');
  function update(){const count=progress().steps.length;bar.value=count;label.textContent=`${count} de ${current.steps.length} pasos revisados`;}
  update();summary.append(bar,label);pane.append(summary);
  current.steps.forEach((step,index)=>{
    const box=element('details','guide-step');box.open=index===0;box.classList.toggle('is-reviewed',progress().steps.includes(index));
    const title=element('summary');title.append(element('span','mono',String(index+1).padStart(2,'0')),element('span','',step.title));
    const body=element('div','guide-step-body');body.append(element('p','',step.body));
    const check=element('label','step-checkbox'),input=element('input');input.type='checkbox';input.checked=progress().steps.includes(index);
    check.append(input,element('span','',step.check));body.append(check);box.append(title,body);pane.append(box);
    input.addEventListener('change',()=>{const value=progress();value.steps=input.checked?[...value.steps,index]:value.steps.filter(i=>i!==index);save(value);box.classList.toggle('is-reviewed',input.checked);update();});
  });
  if(current.takeaway)pane.append(element('p','notice',current.takeaway));
  renderQuestion();
  pane.append(button('Reiniciar mi avance en esta guía',()=>{save(freshProgress());renderMode();pane.querySelector('.filter-reset')?.focus();},'filter-reset'));
}
function renderQuestion(){
  const q=current.question,section=element('section','guide-question');section.append(element('span','eyebrow','Comprueba lo aprendido'),element('h3','',q.prompt));
  const options=element('div','quiz-options'),feedback=element('p','quiz-result');feedback.setAttribute('role','status');
  q.options.forEach((option,index)=>{
    const b=button(option,()=>{
      options.querySelectorAll('button').forEach(button=>delete button.dataset.result);
      const correct=index===q.answer;b.dataset.result=correct?'correct':'incorrect';
      const value=progress();value.quiz=correct;save(value);
      feedback.textContent=correct?'Correcto. '+q.explanation:'Revisa tu respuesta. '+q.explanation;
    },'');
    if(progress().quiz&&index===q.answer){b.dataset.result='correct';feedback.textContent='Ya respondiste correctamente. '+q.explanation;}
    options.append(b);
  });section.append(options,feedback);pane.append(section);
}
function renderCode(){
  const header=element('div','guide-code-head');header.append(element('p','','Código de ejemplo para el modelo y las conexiones indicados en esta guía. Revisa las referencias antes de cargarlo.'));
  const note=element('p','code-status');note.setAttribute('role','status');
  header.append(button('Copiar código',async()=>{try{await navigator.clipboard.writeText(current.code.text);note.textContent='Código copiado.';}catch{note.textContent='Selecciona el código y cópialo manualmente; el navegador no permitió acceder al portapapeles.';}}));
  const pre=element('pre','guide-code'),code=element('code','',current.code.text);pre.tabIndex=0;pre.setAttribute('aria-label','Código de ejemplo');pre.append(code);pane.append(header,pre,note);
}
function renderSources(){
  const section=element('details','guide-resources');section.append(element('summary','','Referencias y documentación de los componentes'));
  const sources=element('ul');current.sources.forEach(source=>{
    if(!source.url.startsWith('https://'))return;
    const item=element('li'),a=element('a','',source.title+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';item.append(a);sources.append(item);
  });section.append(sources);pane.append(section);
}
function loadFromUrl(){
  const params=new URLSearchParams(location.search),guide=guides.find(g=>g.id===params.get('guia'))||guides.find(g=>g.track===params.get('ruta'))||guides[0];selectGuide(guide.id,false);
}
window.addEventListener('popstate',loadFromUrl);window.addEventListener('resize',()=>requestAnimationFrame(drawWires));
loadFromUrl();
