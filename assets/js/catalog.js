(() => {
  const form=document.getElementById('catalog-filters');
  const cards=[...document.querySelectorAll('[data-course]')];
  const grid=document.getElementById('course-grid');
  const search=document.getElementById('course-search');
  const category=document.getElementById('course-category');
  const level=document.getElementById('course-level');
  const order=document.getElementById('course-order');
  const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function update(){
    const query=normalize(search.value.trim());
    let count=0;
    cards.forEach(card=>{
      const match=normalize(card.dataset.search).includes(query)&&(category.value==='all'||card.dataset.category===category.value)&&(level.value==='all'||card.dataset.level===level.value);
      card.hidden=!match;if(match)count++;
    });
    [...cards].sort((a,b)=>order.value==='price-asc'?Number(a.dataset.price)-Number(b.dataset.price):order.value==='price-desc'?Number(b.dataset.price)-Number(a.dataset.price):order.value==='hours'?Number(a.dataset.hours)-Number(b.dataset.hours):Number(a.dataset.index)-Number(b.dataset.index)).forEach(card=>grid.append(card));
    document.getElementById('result-count').textContent=`${count} ${count===1?'programa':'programas'}`;
    document.getElementById('catalog-empty').hidden=count>0;
  }
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',update);form.addEventListener('change',update);
  document.getElementById('clear-filters').addEventListener('click',()=>{form.reset();update();search.focus();});
  const initial=new URLSearchParams(location.search).get('categoria');
  if([...category.options].some(o=>o.value===initial))category.value=initial;
  update();
})();
