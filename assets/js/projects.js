(() => {
  const projects={
    vtol:{title:'Arquitectura VTOL',category:'Sistemas UAV',image:'images/hero-vtol.jpg',alt:'Visualización conceptual de una aeronave VTOL',description:'Exploramos la arquitectura de una aeronave híbrida que combina rotores para despegue vertical con un ala fija para el vuelo de avance. El trabajo integra diseño estructural, aerodinámica y control de transición.',tags:['Ala fija','Despegue vertical','Control de vuelo'],note:'Imagen conceptual. Consulta al equipo sobre el estado del desarrollo, la documentación disponible y los resultados de pruebas.'},
    cohete:{title:'Cohetería experimental',category:'Simulación, aviónica y recuperación',image:'images/laboratorio.webp',alt:'Prototipo de cohete MECRO ABY-01 sobre el banco de trabajo',description:'El banco de trabajo reúne el modelo digital y el prototipo físico. Esta línea aborda la integración de estructura, adquisición de datos, aviónica y recuperación en un sistema experimental.',tags:['Simulación','Integración','Telemetría'],note:'La fotografía muestra el prototipo ABY-01 en el laboratorio. Las prestaciones y los resultados de vuelo se consultan directamente con el equipo.'},
    pid:{title:'Balance-Bar PID',category:'Sistemas de control',image:'assets/proyecto-balancebar.jpg',alt:'Banco de pruebas Balance-Bar PID',description:'Una plataforma didáctica para estudiar cómo una medición inercial se transforma en una acción de control. Permite relacionar sensores, procesamiento y motores con la respuesta del sistema ante una perturbación.',tags:['Control PID','Sensores inerciales','Motores'],note:'Consulta la configuración del banco y los recursos técnicos disponibles. La documentación de cada proyecto se coordina con MECRO.'}
  };
  const dialog=document.getElementById('project-dialog');
  let trigger;
  document.querySelectorAll('[data-open-project]').forEach(button=>button.addEventListener('click',()=>{
    const p=projects[button.dataset.openProject];trigger=button;
    document.getElementById('dialog-title').textContent=p.title;
    document.getElementById('dialog-category').textContent=p.category;
    document.getElementById('dialog-description').textContent=p.description;
    document.getElementById('dialog-note').textContent=p.note;
    const img=document.getElementById('dialog-image');img.src=p.image;img.alt=p.alt;
    document.getElementById('dialog-tags').replaceChildren(...p.tags.map(tag=>{const el=document.createElement('span');el.textContent=tag;return el;}));
    dialog.showModal();
  }));
  document.getElementById('close-project').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>trigger?.focus());
  const cards=[...document.querySelectorAll('[data-project]')];
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    let count=0;cards.forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)count++;});
    document.getElementById('project-count').textContent=`${count} ${count===1?'línea de trabajo':'líneas de trabajo'}`;
  }));
})();
