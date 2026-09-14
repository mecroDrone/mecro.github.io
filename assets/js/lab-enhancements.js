(() => {
  const select = document.getElementById('lab-project');
  const projectIds = Object.keys(projectDB).map(Number);
  const previous = document.getElementById('lab-previous-project');
  const next = document.getElementById('lab-next-project');
  const scrollArea = document.getElementById('main-scroll');
  const codeStatus = document.createElement('p');
  codeStatus.className = 'lab-copy-status';
  codeStatus.setAttribute('role', 'status');
  document.querySelector('.lab-code-toolbar').after(codeStatus);

  navStructure.forEach(level => {
    const group = document.createElement('optgroup');
    group.label = level.title;
    level.projects.filter(id => projectDB[id]).forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = projectDB[id].title;
      group.append(option);
    });
    select.append(group);
  });
  select.addEventListener('change', () => loadProject(Number(select.value)));
  previous.addEventListener('click', () => loadProject(projectIds[projectIds.indexOf(currentProjectId) - 1]));
  next.addEventListener('click', () => loadProject(projectIds[projectIds.indexOf(currentProjectId) + 1]));

  const ids = ['theory', 'circuit', 'code', 'sim'];
  const tabs = ids.map(id => document.getElementById('tab-' + id));
  tabs[0].parentElement.setAttribute('role', 'tablist');
  tabs[0].parentElement.setAttribute('aria-label', 'Materiales del proyecto');
  tabs.forEach((tab, i) => {
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'content-' + ids[i]);
    const panel = document.getElementById('content-' + ids[i]);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('keydown', event => {
      let nextTab;
      if (event.key === 'ArrowRight') nextTab = (i + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextTab = (i + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') nextTab = 0;
      else if (event.key === 'End') nextTab = tabs.length - 1;
      else return;
      event.preventDefault();
      switchTab(ids[nextTab]);
      tabs[nextTab].focus();
      tabs[nextTab].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });

  const simHelp = document.createElement('div');
  simHelp.className = 'lab-sim-help';
  simHelp.hidden = true;
  simHelp.innerHTML = '<span>Simulación externa en Wokwi. Si no carga, ábrela en una pestaña.</span><a target="_blank" rel="noopener noreferrer">Abrir simulación ↗</a>';
  document.querySelector('.lab-workspace').append(simHelp);
  document.querySelector('[role="tablist"]').addEventListener('click', updateSimHelp);
  document.querySelector('[role="tablist"]').addEventListener('keydown', updateSimHelp);

  function updateSimHelp() {
    const isSim = document.getElementById('tab-sim').getAttribute('aria-selected') === 'true';
    simHelp.hidden = !isSim || !projectDB[currentProjectId].sim;
    if (!simHelp.hidden) simHelp.querySelector('a').href = projectDB[currentProjectId].sim;
  }

  function prepareAccordions() {
    document.querySelectorAll('#content-theory button[onclick^="toggleAccordion"]').forEach(button => {
      const match = button.getAttribute('onclick').match(/toggleAccordion\('([^']+)'\)/);
      const panel = match && document.getElementById(match[1]);
      if (!panel) return;
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-expanded', String(panel.classList.contains('open')));
      panel.inert = !panel.classList.contains('open');
    });
    document.querySelectorAll('#content-theory button[onclick="toggleAcc(this)"]').forEach((button, index) => {
      const panel = button.nextElementSibling;
      if (!panel) return;
      panel.id = 'lab-basic-accordion-' + index;
      panel.hidden = true;
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-expanded', 'false');
    });
  }

  window.toggleAcc = button => {
    const panel = button.nextElementSibling;
    if (!panel) return;
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  };

  function updateProjectUI(shouldScroll = false) {
    const index = projectIds.indexOf(currentProjectId);
    select.value = String(currentProjectId);
    previous.disabled = index === 0;
    next.disabled = index === projectIds.length - 1;
    document.getElementById('lab-project-position').textContent = `Proyecto ${String(index + 1).padStart(2, '0')} / ${projectIds.length}`;
    document.getElementById('lab-project-count').textContent = `Proyecto ${index + 1} de ${projectIds.length}`;
    document.title = `${projectDB[currentProjectId].title} · Laboratorio ESP32 | MECRO`;
    document.getElementById('sim-frame').title = 'Simulación en Wokwi: ' + projectDB[currentProjectId].title;
    codeStatus.textContent = '';
    updateSimHelp();
    prepareAccordions();
    if (shouldScroll) {
      const url = new URL(window.location.href);
      url.searchParams.set('proyecto', currentProjectId);
      history.replaceState(null, '', url);
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  document.addEventListener('mecro:project-change', () => updateProjectUI(true));
  updateProjectUI();

  window.copyCode = async () => {
    const projectId = currentProjectId;
    try {
      await navigator.clipboard.writeText(projectDB[projectId].code);
      if (currentProjectId === projectId) codeStatus.textContent = 'Código copiado. Ya puedes pegarlo en tu editor.';
    } catch {
      if (currentProjectId === projectId) codeStatus.textContent = 'No pudimos acceder al portapapeles. Selecciona el código y cópialo manualmente.';
    }
  };

  const menu = document.querySelector('.lab-menu-toggle');
  const navigation = document.getElementById('lab-site-nav');
  const setMenu = isOpen => {
    menu.setAttribute('aria-expanded', String(isOpen));
    navigation.classList.toggle('is-open', isOpen);
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.lab-header')) setMenu(false); });
})();
