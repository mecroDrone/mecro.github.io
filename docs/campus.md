# Campus MECRO

## Contenido integrado

Los seis ZIP entregados alimentan tres programas: Drones (8 clases / 20 h), Cohetería (16 clases / 42 h) y ESP32 (16 clases / 36 h). Los 20 PPT originales contienen 961 diapositivas. Se conservan los originales y se crean PDF para visualizarlos en el navegador, además de una transcripción accesible.

`Ver programa` abre el temario semanal público; cada programa ofrece el sílabo PDF original. Telemetría permanece como próximamente. `aula.html` ofrece lecciones, tablas, imágenes, ecuaciones, prácticas, respuestas razonadas, biblioteca y presentaciones para los cursos autorizados.

La bitácora y las clases marcadas como revisadas se guardan en ese navegador, separadas por cuenta, curso y edición. No son calificaciones ni se sincronizan entre dispositivos. La entrega de trabajos se coordina con el instructor. Los enlaces al laboratorio existente no ejecutan un entorno remoto de simulación. No se ha implementado emisión de certificados ni subida de tareas.

## Vista previa local

Requiere Node con soporte de `fetch` y módulos ES (Node 22 o posterior).

```powershell
npm ci
npm run build
npm run check
npm test
npm run preview:campus
```

Abre la URL que imprime el último comando. Crea una sesión de propietario para revisar los tres cursos. Solo escucha en `127.0.0.1`; el acceso requiere un token aleatorio que cambia al reiniciar. Esta vista previa se desactiva en producción. No representa una prueba de matrícula real.

## Actualizar los paquetes

```powershell
python scripts/import-courses.py "C:\ruta\a\los\seis\zip"
powershell -File scripts/convert-presentations.ps1
python scripts/render-presentations.py --pdftoppm "C:\ruta\a\poppler\pdftoppm.exe"
npm run build
```

La conversión requiere PowerPoint instalado en Windows. Abre los PPT en modo de solo lectura, sin macros, y conserva los archivos originales. Omite PDF que ya existen: si reemplazas una presentación, retira únicamente su PDF convertido antes de volver a convertirla. El informe `.course-work/import-report.json` registra archivos, rutas y hashes de los ZIP.

El último script usa Poppler para producir imágenes privadas de las 961 diapositivas y comprobar su cantidad contra las transcripciones. El visor las muestra con botones, selector y flechas del teclado, sin depender del lector PDF del navegador. Ejecuta ese paso después de cada importación: el importador reconstruye los manifiestos de las presentaciones. PDF y PPT continúan disponibles para descarga.

## Qué se puede publicar

- **Público:** HTML generados, `assets/`, `images/`, `data/cursos.json`, `data/campus.json` y `data/hardware-guides.js`. El manifiesto del campus contiene títulos y objetivos; no incluye el cuerpo de las lecciones.
- **Privado:** `materiales/` contiene clases, presentaciones y biblioteca. `.course-work/` conserva fuentes y documentación docente. Ambos directorios están excluidos de Git.
- Los documentos docentes y diagnósticos se excluyen de las rutas de descarga del alumno.

No uses un servidor estático genérico para compartir la raíz local ni copies los materiales a GitHub Pages. `.gitignore` evita su incorporación normal a Git; no constituye control de acceso en un hosting.

## Activación con alumnos reales

`npm run campus` usa el endpoint Apps Script actual, o el definido en `MECRO_AUTH_URL`. La contraseña se transmite al backend de autenticación; este servidor no la guarda. El contrato esperado es `success: true` con nombre, email y `cursosInscritos`, conforme a `assets/js/api.js`.

Antes de activar el acceso comercial, comprueba con cuentas de prueba que Apps Script verifica la contraseña y matrícula ACTIVA en el servidor y no devuelve cursos de alumnos inactivos. Su código, almacenamiento de contraseñas y permisos de Sheets/Drive no se han auditado ni modificado. Las pruebas automatizadas usan autenticación simulada.

En `server/course-access.json`, relaciona cada programa con los ID exactos que usa Sheets. Por defecto son `uav`, `cohetes`, `esp32`. No se hacen coincidencias parciales. Prueba una cuenta de cada curso, una cuenta inactiva y acceso a un curso ajeno.

El servidor crea una cookie HttpOnly y SameSite=Strict; en producción también Secure. La sesión dura dos horas y cada descarga comprueba la sesión y el curso autorizado. Las matrículas se capturan al iniciar sesión: un cambio en Sheets se aplica en el siguiente inicio de sesión o tras caducar la sesión, no de forma inmediata. Las sesiones están en memoria y se invalidan al reiniciar; usa una sola instancia mientras no se implemente un almacén compartido.

## Despliegue

El campus necesita un proceso Node persistente con acceso privado a `materiales/`, detrás de HTTPS. Sirve la web y `/api/campus/` bajo el mismo origen; actualmente el cliente usa rutas relativas. El servidor espera las rutas desde la raíz del dominio. Si el catálogo continúa en GitHub Pages, cambia sus enlaces de acceso para dirigir al dominio del campus.

Ejemplo de variables en PowerShell, sustituyendo el dominio por el real:

```powershell
$env:NODE_ENV='production'
$env:SITE_ORIGIN='https://campus.tu-dominio.example'
$env:HOST='127.0.0.1'
$env:PORT='8787'
npm run campus
```

Configura el proxy HTTPS para ese origen y puerto, sin exponer directamente las carpetas privadas. `SITE_ORIGIN` es el origen exacto (sin ruta ni barra final). Protege y respalda el volumen de materiales; no depende de un repositorio público. Mantén el proceso con el gestor del hosting. Los PDF admiten peticiones Range para el visor.

La integración heredada de `portal.html` conserva los enlaces de grupos. Su GET de Apps Script no demuestra una sesión: revisar ese backend y los permisos de Drive sigue pendiente. El nuevo control de descargas no convierte automáticamente esos enlaces heredados en privados.

**Estado:** implementación y materiales disponibles localmente. Falta seleccionar/configurar el hosting, comprobar los ID reales de matrícula y validar el login real antes de habilitar alumnos en producción.
