# MECRO · Sitio web

Sitio estático compatible con GitHub Pages. No necesita servidor Node en producción.

## Edición y construcción

- `content/`: contenido de las páginas públicas, acceso y aula.
- `data/cursos.json`: fuente única de precios, duración, temarios y fichas.
- `data/hardware-guides.js`: rutas, componentes, conexiones, pasos, código y preguntas de Hardware & Kits. Consulta [cómo agregar guías](docs/hardware-guides.md).
- `scripts/build.mjs`: genera el HTML final y comparte navegación y pie.
- `assets/css/site.css`: identidad visual y estilos adaptables.
- `assets/js/`: navegación, catálogo, portafolio, acceso y aula.
- `laboratorio.html`: contenido original de los 20 proyectos ESP32, conservado con mejoras de navegación móvil y accesibilidad.
- `prueba.html`: archivo previo del usuario, sin cambios.

```sh
npm ci
npm run build
npm run check
npm test
```

Publicar los archivos HTML finales y las carpetas `assets/`, `images/` y **`data/`**, conservando sus rutas. Hardware & Kits importa `data/hardware-guides.js` directamente en el navegador como módulo ES; omitir esa carpeta impide cargar las guías. GitHub Pages puede servir estos archivos desde la raíz del repositorio, como antes. Las plantillas generan contenido HTML que sigue siendo legible sin JavaScript; los filtros, el aula y las guías interactivas sí lo necesitan.

Los cambios en `content/`, `data/cursos.json` o el generador requieren `npm run build`. El contenido de `data/hardware-guides.js` se lee directamente; para agregar una guía a una ruta existente no hace falta regenerar HTML. Para cambiar únicamente el estilo general, editar `assets/css/site.css`. El laboratorio usa Tailwind 3 compilado en `assets/css/lab-utilities.css`, sin compilación en el navegador.

Para revisar los módulos ES localmente, sirve la carpeta por HTTP; no abras `kits.html` con `file://`. Por ejemplo, ejecuta `python -m http.server 8765 --bind 127.0.0.1` desde esta carpeta y visita `http://127.0.0.1:8765/kits.html`.

Las copias optimizadas se entregan en el repositorio; los originales se conservaron. `scripts/optimize-images.mjs` es una utilidad opcional y requiere Sharp (o la ruta del módulo en `SHARP_PATH`), pero no forma parte de la construcción normal.

## Conexión con el aula existente

Se conserva el endpoint de Apps Script en `assets/js/api.js` y el protocolo anterior:

- Inicio de sesión: POST JSON con `action: login`, `email`, `password`.
- Respuesta esperada: `success: true`, `nombre`, `email`, `cursosInscritos` (array o lista separada por comas), `grupo`. También se admite un objeto `user` y un mapa `grupos` por ID de curso.
- Catálogo del aula: GET devuelve `success`, `cursos` y `clases` (o `syllabus`).
- Cada clase necesita `cursoId` explícito para asociarse al curso.
- Se aceptan enlaces anidados como `videoLinks.G1` o columnas exactas como `Video_G1`, `Video Link G1`, `Meet_G1`. No se reutilizan enlaces sin grupo ni coincidencias parciales G1/G10.
- Materiales: `ppt`, `pptLink`, `presentacion`, `pdf`, `pdfLink`, `resumen`, entre las variantes documentadas en `materialLink`.

La sesión del navegador se guarda por pestaña durante un máximo de ocho horas. Se eliminó el acceso de demostración, el almacenamiento indiscriminado de la respuesta del login y la sesión permanente anterior. Es necesario iniciar sesión nuevamente tras este cambio.

## Pendientes que requieren acceso al servidor de MECRO

**El servidor Apps Script y los permisos de Sheets/Drive no se modificaron ni se auditaron con credenciales reales.** El filtrado y la caducidad del navegador son mejoras de interfaz y minimización de datos, no autorización de servidor. El GET heredado no transmite una prueba de sesión. Antes de considerar protegido el material de pago, el backend debe autenticar cada consulta y devolver únicamente los recursos autorizados para el usuario, curso y grupo.

1. Revisar el Apps Script real: almacenamiento seguro de contraseñas, sesiones verificadas por el servidor con expiración/revocación y control de matrícula y grupo en cada petición.
2. Impedir que un GET anónimo exponga clases o enlaces privados; adaptar el cliente al contrato autenticado acordado (sin poner secretos en URLs).
3. Revisar permisos reales de Drive y quién puede abrir los archivos. Un enlace oculto por el navegador no protege el archivo.
4. El foro anterior solo insertaba elementos temporales en la pantalla. Ahora se ofrece una consulta contextual por WhatsApp, sin simular publicaciones guardadas. Un foro multiusuario requiere almacenamiento y autorización en servidor.
5. Se retiró el progreso fijo de tres sesiones y la descarga de certificado permanentemente bloqueada. La página explica la coordinación con el instructor y ofrece una consulta de certificación. El progreso académico real y la emisión automática requieren registros y validación en servidor.

## Contenido comercial a confirmar

Se conservaron los precios existentes y se unificó UAV a la ficha detallada: S/349, 36 horas, 12 sesiones y 6 semanas. Confirmar estas condiciones con el equipo antes de publicar. Se retiraron estadísticas sin respaldo, rebajas, promesas de disponibilidad y enlaces de ejemplo. No se inventaron fechas, testimonios ni resultados de vuelo. Las imágenes conceptuales se identifican como tales.

La página de privacidad describe el comportamiento de los formularios y del navegador implementado. El responsable debe completarla con su política real de tratamiento de datos y las condiciones comerciales correspondientes.

## Validación

`npm run check` verifica rutas, anclas, recursos, sintaxis JavaScript y coherencia de cursos. `npm test` cubre filtros, ordenamiento, separación de grupos, URLs de materiales, minimización/caducidad de sesión y respuestas inválidas. No sustituye una prueba autenticada con cuentas de distintos grupos ni la revisión de los permisos del backend.
