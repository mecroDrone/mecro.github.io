import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=fs.readdirSync(root).filter(name=>name.endsWith('.html')&&name!=='prueba.html');
const failures=[];
const fail=text=>failures.push(text);
function localTarget(value,origin){
  if(!value||/^(https?:|mailto:|tel:|data:)/i.test(value)||value.startsWith('//'))return;
  const [raw,hash]=value.split('#');
  const clean=decodeURIComponent(raw.split('?')[0]);
  const target=path.resolve(path.dirname(origin),clean||path.basename(origin));
  if(!fs.existsSync(target)){fail(`${path.basename(origin)}: ruta inexistente ${value}`);return;}
  if(hash&&target.endsWith('.html')){
    const text=fs.readFileSync(target,'utf8');
    if(!text.includes(`id="${hash}"`)&&!text.includes(`id='${hash}'`))fail(`${path.basename(origin)}: ancla inexistente ${value}`);
  }
}
for(const name of pages){
  const file=path.join(root,name),source=fs.readFileSync(file,'utf8');
  const markup=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  if(!source.includes('lang="es"'))fail(`${name}: idioma ausente`);
  if(!/<title>.+?<\/title>/.test(source))fail(`${name}: título ausente`);
  if(!source.includes('name="viewport"'))fail(`${name}: viewport ausente`);
  if(/href=["']#["']/.test(markup))fail(`${name}: enlace vacío`);
  if(source.includes('cdn.tailwindcss.com'))fail(`${name}: Tailwind CDN en producción`);
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(ids.length!==new Set(ids).size)fail(`${name}: IDs duplicados`);
  for(const match of markup.matchAll(/\b(?:src|href)=["']([^"']*)["']/g))localTarget(match[1],file);
  for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc=/.test(match[1])){const src=match[1].match(/src=["']([^"']+)/)?.[1];if(src)localTarget(src,file);}
    else if(match[2].trim()&&!/application\/ld\+json/.test(match[1])){
      try{new vm.Script(match[2],{filename:name});}catch(e){fail(`${name}: JavaScript inválido: ${e.message}`);}
    }
  }
}
for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(n=>n.endsWith('.js'))){
  const file=path.join(root,'assets/js',name);
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)fail(result.stderr);
  for(const match of fs.readFileSync(file,'utf8').matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g))localTarget(match[1],file);
}
const courses=JSON.parse(fs.readFileSync(path.join(root,'data/cursos.json'),'utf8'));
for(const course of courses){
  localTarget(course.image,path.join(root,'index.html'));localTarget(course.file,path.join(root,'index.html'));
  const detail=fs.readFileSync(path.join(root,course.file),'utf8');
  const catalog=fs.readFileSync(path.join(root,'cursos.html'),'utf8');
  for(const text of [course.title,`${course.hours} horas`,`S/ ${course.price.toFixed(2)}`]){
    if(!detail.toLowerCase().includes(text.toLowerCase()))fail(`${course.id}: detalle no coincide con los datos (${text})`);
    if(!catalog.includes(text))fail(`${course.id}: catálogo no coincide con los datos (${text})`);
  }
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`OK: ${pages.length} páginas, rutas y anclas locales, scripts, recursos y coherencia de ${courses.length} cursos.`);
