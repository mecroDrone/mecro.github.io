import {courseCard as card,courseBody} from './course-page.mjs';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const courses=JSON.parse(readFileSync(path.join(root,'data/cursos.json'),'utf8'));
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const navItems=[['cursos.html','Cursos'],['kits.html','Hardware & Kits'],['proyectos.html','I+D'],['nosotros.html','Nosotros'],['contacto.html','Contacto']];
const brand='<a class="brand" href="index.html" aria-label="MECRO, inicio"><img class="brand-symbol" src="images/brand-mark.png" width="34" height="42" alt=""><span><span class="brand-name">MECRO</span><span class="brand-caption">TECNOLOGÍA AEROESPACIAL</span></span></a>';
export function page(title,description,body,active='',scripts=''){
 return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0a0d10"><title>${escapeHtml(title)} | MECRO</title><meta name="description" content="${escapeHtml(description)}"><link rel="icon" href="images/favicon.png" type="image/png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="assets/css/site.css"><script src="assets/js/site.js" defer></script>${scripts}</head>
<body><a class="skip" href="#contenido">Saltar al contenido</a><header class="site-header"><div class="wrap header-row">${brand}<button type="button" class="menu-toggle" aria-label="Abrir o cerrar navegación" aria-controls="navegacion" aria-expanded="false">Menú <span aria-hidden="true">☰</span></button><nav class="site-nav" id="navegacion" aria-label="Navegación principal">${navItems.map(([href,label])=>`<a href="${href}"${active===href?' aria-current="page"':''}>${label}</a>`).join('')}<a class="nav-portal" href="login.html"${active==='login.html'?' aria-current="page"':''}>Aula virtual <span aria-hidden="true">↗</span></a></nav></div></header>
<main id="contenido">${body}</main>
<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div class="footer-brand">${brand}<p>Diseña, construye y vuela.<br>Laboratorio de I+D y academia de hardware aeroespacial.</p></div><div><h2 class="footer-title">Explora MECRO</h2><div class="footer-links"><a href="cursos.html">Programas de formación</a><a href="kits.html">Hardware & guías</a><a href="proyectos.html">Investigación y desarrollo</a><a href="laboratorio.html">Laboratorio ESP32</a></div></div><div><h2 class="footer-title">Conversemos</h2><div class="footer-links"><a href="contacto.html">Admisiones y soporte</a><a href="mailto:contacto@mecro.com">contacto@mecro.com</a><a href="nosotros.html">Conoce al equipo</a><span>Lima, Perú</span></div></div></div><div class="footer-bottom"><span>© <span data-year>${new Date().getFullYear()}</span> MECRO. Diseñado y ensamblado en Perú.</span><a href="privacidad.html">Privacidad y uso del sitio</a></div></div></footer></body></html>`;
}
for(const name of readdirSync(path.join(root,'content')).filter(n=>n.endsWith('.html'))){
 const source=readFileSync(path.join(root,'content',name),'utf8');
 const match=source.match(/^<!--\s*({[^\n]+})\s*-->\r?\n/);
 if(!match)throw new Error('Faltan metadatos en '+name);
 const meta=JSON.parse(match[1]);
 const body=source.slice(match[0].length).replace('<!-- FEATURED_COURSES -->',`<div class="cards">${courses.filter(c=>c.featured).map(card).join('')}</div>`).replace('<!-- ALL_COURSES -->',`<div class="cards catalog-grid" id="course-grid">${courses.map(card).join('')}</div>`);
 writeFileSync(path.join(root,name),page(meta.title,meta.description,body,meta.active||name,meta.scripts||''));
}
for(const c of courses){writeFileSync(path.join(root,c.file),page(c.title,c.description,courseBody(c),'cursos.html'));}
console.log('Páginas estáticas generadas.');
