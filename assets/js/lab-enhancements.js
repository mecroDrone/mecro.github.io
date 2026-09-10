(() => {
  const select=document.getElementById('lab-project');
  for (const [id,project] of Object.entries(projectDB)) {
    const option=document.createElement('option');option.value=id;option.textContent=project.title;select.append(option);
  }
  select.value=String(currentProjectId);
  select.addEventListener('change',()=>loadProject(Number(select.value)));
  const ids=['theory','circuit','code','sim'];
  const tabs=ids.map(id=>document.getElementById('tab-'+id));
  tabs[0].parentElement.setAttribute('role','tablist');
  tabs[0].parentElement.setAttribute('aria-label','Materiales del proyecto');
  tabs.forEach((tab,i)=>{
    tab.setAttribute('role','tab');tab.setAttribute('aria-controls','content-'+ids[i]);
    const panel=document.getElementById('content-'+ids[i]);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
    tab.addEventListener('keydown',e=>{
      let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
      e.preventDefault();switchTab(ids[next]);tabs[next].focus();
    });
  });
  const codeStatus=document.createElement('p');codeStatus.className='lab-copy-status';codeStatus.setAttribute('role','status');document.getElementById('content-code').prepend(codeStatus);
  window.copyCode=async()=>{
    try{await navigator.clipboard.writeText(projectDB[currentProjectId].code);codeStatus.textContent='Código copiado.';}
    catch{codeStatus.textContent='No pudimos acceder al portapapeles. Selecciona el código y cópialo manualmente.';}
  };
})();
