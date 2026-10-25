import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real filter script with a minimal DOM, without browser automation.
test('combina búsqueda, nivel y especialidad; ordena y restablece resultados',()=>{
  class Element{
    constructor(value=''){this.value=value;this.events={};this.hidden=false;this.children=[];}
    addEventListener(name,fn){this.events[name]=fn;}
    append(card){this.children=this.children.filter(c=>c!==card);this.children.push(card);}
    focus(){this.focused=true;}
  }
  const ids=['catalog-filters','course-grid','course-search','course-category','course-level','course-order','result-count','catalog-empty','clear-filters'];
  const els=Object.fromEntries(ids.map(id=>[id,new Element()]));
  const reset=()=>{els['course-search'].value='';els['course-category'].value='all';els['course-level'].value='all';els['course-order'].value='default';};reset();
  els['catalog-filters'].reset=reset;els['course-category'].options=[{value:'all'},{value:'drones'},{value:'embebidos'},{value:'telemetria'},{value:'cohetes'}];
  const data=JSON.parse(fs.readFileSync(new URL('../data/cursos.json',import.meta.url),'utf8'));
  const cards=data.map((c,i)=>Object.assign(new Element(),{dataset:{search:c.title+' '+c.category+' '+c.description,category:c.categoryId,level:c.level,status:c.status,price:String(c.price),hours:String(c.hours),index:String(i)}}));
  vm.runInNewContext(fs.readFileSync(new URL('../assets/js/catalog.js',import.meta.url),'utf8'),{document:{getElementById:id=>els[id],querySelectorAll:()=>cards},location:{search:''},URLSearchParams});
  assert.equal(els['result-count'].textContent,'4 programas');
  els['course-search'].value='telemetria';els['catalog-filters'].events.input();
  assert.equal(cards[3].hidden,false);
  els['course-level'].value='Principiante';els['catalog-filters'].events.change();
  assert.equal(els['catalog-empty'].hidden,false);
  els['clear-filters'].events.click();assert.equal(cards.filter(c=>!c.hidden).length,4);assert.ok(els['course-search'].focused);
  els['course-order'].value='price-asc';els['catalog-filters'].events.change();
  assert.deepEqual(els['course-grid'].children.map(c=>Number(c.dataset.price)),[79,79,89,380]);
  assert.equal(els['course-grid'].children.at(-1).dataset.status,'coming-soon');
  els['course-category'].value='drones';els['course-level'].value='Intermedio';els['catalog-filters'].events.change();
  assert.equal(els['result-count'].textContent,'1 programa');assert.equal(cards[0].hidden,false);
});
