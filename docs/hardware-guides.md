# Agregar guías a Hardware & Kits

Las guías de `kits.html` se editan en [data/hardware-guides.js](../data/hardware-guides.js). La interfaz genera las fichas de componentes, los puertos, el ejercicio de conexiones, los pasos y la pregunta a partir de ese archivo. Agregar una guía a una ruta existente no requiere copiar una página HTML ni cambiar la lógica de la interfaz.

Este archivo es JavaScript con módulos ES, no JSON: admite comentarios, constantes reutilizables y cadenas de código entre acentos graves. La edición se hace en el repositorio; no hay un formulario administrativo para subir guías desde la web.

## Rutas actuales

`tracks` define las rutas y `guides` contiene sus actividades. La propiedad `track` de cada guía debe coincidir exactamente con un `id` de `tracks`.

| Ruta | `track` | Guías actuales |
| --- | --- | --- |
| ESP32 | `esp32` | `esp32-led`, `esp32-boton` |
| Arduino | `arduino` | `arduino-led`, `arduino-analogico` |
| Drones | `drones` | `drones-sistema`, `drones-uart` |
| Cohetería | `coheteria` | `cohete-estructura`, `cohete-sensor` |

Las actividades de ESP32 y Arduino especifican un modelo de placa. Las de drones explican bloques y señales; sus mapas no constituyen un pinout universal. La cohetería actual comprende una maqueta educativa y una bahía de sensores de mesa. Conserva esa distinción al describir cada proyecto.

El laboratorio original de veinte proyectos sigue separado en `laboratorio.html`. Añadir una guía aquí no modifica su base de proyectos.

## Agregar una guía

1. Duplica dentro de `guides` el objeto de una actividad de la misma ruta que se parezca al nuevo proyecto.
2. Asigna un `id` nuevo y estable, por ejemplo `arduino-mi-proyecto`. Conserva el `track` apropiado.
3. Actualiza la presentación, la lista completa de piezas y los pasos. Especifica el modelo y revisión de las placas cuando afecten al montaje.
4. Define cada conexión usando los identificadores de las piezas y las etiquetas exactas de sus puertos.
5. Incluye código solo si la actividad lo necesita, añade documentación del fabricante y redacta una pregunta con una única respuesta correcta.
6. Revisa el resultado por HTTP, practica todas las conexiones y comprueba los pasos y la respuesta. Ejecuta las verificaciones descritas al final antes de publicar.

El orden de los objetos dentro de `guides` determina el orden de las actividades en cada ruta. El orden de `parts` determina la colocación y numeración de las piezas; el primer componente se selecciona al abrir la guía. Mantén al menos una guía disponible por cada ruta visible.

## Campos de una guía

| Campo | Formato y uso |
| --- | --- |
| `id` | Texto único en todo `guides`. Se utiliza en la URL y para guardar el avance. Usa minúsculas, números y guiones. |
| `track` | Uno de los cuatro identificadores de ruta. |
| `title` | Título breve orientado al resultado de la actividad. |
| `description` | Explica qué construirá o comprenderá el alumno. |
| `level` | Actualmente `Inicial` o `Intermedio`. |
| `duration` | Tiempo orientativo, como `20 min`. Es metadato editorial; la mesa actual no lo muestra como cronómetro. |
| `kind` | Actualmente `Montaje de mesa`, `Mapa de sistema` o `Maqueta educativa`. |
| `parts` | Lista de componentes: identificador, nombre, función y nota de revisión. |
| `steps` | Lista ordenada de pasos con título, explicación y comprobación personal. |
| `connections` | Pares exactos de componentes y puertos que debe relacionar el alumno. |
| `code` | Opcional. Objeto con `language` y `text`. Si no hay código, omite el objeto. |
| `sources` | Lista de referencias con título y URL HTTPS. |
| `takeaway` | Conclusión breve que aparece después de los pasos. |
| `question` | Pregunta, opciones, índice de respuesta correcta y explicación. Es obligatoria en la interfaz actual. |

Los textos se muestran como texto, no como HTML. Para párrafos nuevos utiliza cadenas de texto; no introduzcas etiquetas esperando que creen imágenes, botones o enlaces. Los enlaces de documentación van en `sources`.

### Componentes: `parts`

Cada componente tiene esta forma:

```js
{
  id: 'board',
  name: 'Arduino UNO R3',
  role: 'Ejecuta el programa y conecta el circuito.',
  note: 'Modelo UNO R3 con ATmega328P y lógica de 5 V. Alimentación USB para esta práctica.'
}
```

`id` debe ser único dentro de la guía. Puede repetirse en otra guía: varias actividades usan `board`, por ejemplo. `name` es el nombre visible; `role` explica la función y `note` recoge los detalles que hay que revisar. Incluye también materiales auxiliares, como protoboard, cable de datos o computadora, aunque no todos tengan puertos en el diagrama.

El campo opcional `illustration` permite elegir una silueta de la biblioteca SVG en [assets/js/hardware-art.js](../assets/js/hardware-art.js), por ejemplo `illustration: 'sensor'`. Si se omite, se busca por `part.id`; `board` en la ruta Arduino selecciona la silueta de UNO. Un identificador nuevo sin dibujo asociado utiliza una ilustración genérica. Este campo es el nombre de una ilustración existente, no una URL ni código SVG. Las siluetas ayudan a reconocer piezas y no representan sus pines físicos.

La mesa está diseñada actualmente para actividades pequeñas de tres o cuatro componentes. Si necesitas un sistema más complejo, considera dividirlo en varias guías y revisar el diseño móvil antes de aumentar la cantidad de piezas.

### Pasos: `steps`

```js
{
  title: 'Ubica la salida',
  body: 'Con la placa desconectada, identifica D8 y GND en el UNO R3.',
  check: 'He localizado D8 y GND.'
}
```

`check` es el texto de la casilla que marca el alumno. Redáctalo como algo concreto que pueda observar o explicar. Marcarlo registra una revisión personal; no verifica eléctricamente el montaje.

### Conexiones e identificadores de puertos

```js
{
  from: 'board',
  fromPort: 'D8',
  to: 'resistor',
  toPort: 'Terminal A',
  label: 'Control',
  explanation: 'D8 es la salida elegida; debe coincidir con el número 8 del programa.'
}
```

`from` y `to` deben existir como `parts[].id` en la misma guía. Los puertos se generan automáticamente a partir de `fromPort` y `toPort`; no hay otra lista que mantener. `label` resume el enlace y `explanation` explica por qué es correcto.

La identidad de un puerto es el par **identificador de componente + etiqueta exacta del puerto**. Por eso `board / GND` y `sensor / GND` son puertos diferentes, mientras que dos conexiones a `board / GND` comparten el mismo botón. `GPIO1` y `GPIO10` también son distintos. Respeta mayúsculas, espacios y signos de una misma etiqueta en todos sus usos.

El alumno puede seleccionar los dos extremos en cualquier orden: la coincidencia funciona de ida o vuelta. No dupliques una conexión invirtiendo `from` y `to`. Tampoco conectes un puerto consigo mismo. Cada pareja debe ser única.

En un mapa conceptual, utiliza etiquetas de función y explica su alcance. Si una actividad representa un montaje físico, las etiquetas deben corresponder al modelo documentado y al código. La mesa dibuja relaciones y valida las parejas definidas aquí; no simula voltaje, corriente ni compatibilidad eléctrica.

### Código: `code`

```js
code: {
  language: 'cpp',
  text: `// Pega aquí el programa completo y revisado para esta guía.`
}
```

El ejemplo anterior muestra la estructura; reemplaza el comentario por un programa completo antes de publicar. Las guías actuales usan C++ de Arduino. La pestaña aparece solo cuando existe `code.text`; el contenido se presenta y se copia como texto sin compilarse ni ejecutarse en el navegador.

Conserva saltos de línea reales. Dentro de una cadena entre acentos graves, escapa los acentos graves literales y las secuencias `${...}` que no deban interpretarse como JavaScript. Mantén pines, velocidades del monitor serie y nombres de constantes coherentes con los pasos y las conexiones.

### Referencias: `sources`

```js
sources: [
  {
    title: 'Arduino · UNO R3, documentación y pinout',
    url: 'https://docs.arduino.cc/hardware/uno-rev3'
  }
]
```

Incluye al menos una referencia real y específica. Prioriza manuales y ejemplos oficiales del modelo usado. La interfaz únicamente publica enlaces que comienzan por `https://`; se abren en una pestaña nueva. Comprueba que los enlaces sigan disponibles y que respalden las conexiones descritas.

### Pregunta final: `question`

```js
question: {
  prompt: '¿Qué bloque gestiona la potencia del motor?',
  options: ['El ESC.', 'El receptor de radio.', 'El puerto de señal de la FC directamente.'],
  answer: 0,
  explanation: 'La FC calcula órdenes y el ESC las convierte en control eléctrico del motor.'
}
```

`answer` es un índice que **empieza en cero**: `0` selecciona la primera opción, `1` la segunda. Debe apuntar a una opción existente. Incluye al menos dos alternativas y una sola respuesta correcta. La explicación se muestra tanto al acertar como al equivocarse.

## Enlaces directos

- A una ruta: `kits.html?ruta=arduino#explorar`.
- A una guía: `kits.html?ruta=arduino&guia=arduino-analogico#explorar`.
- Al laboratorio ESP32 original: `laboratorio.html?proyecto=1`.

`guia` tiene prioridad sobre `ruta` si ambas existen y la guía es válida. Una guía inexistente hace que se abra la primera actividad de la ruta indicada; si tampoco existe esa ruta, se abre la primera guía del catálogo. Al cambiar de actividad, la página actualiza ambos parámetros con `history.replaceState`, sin recargarla ni añadir una entrada al historial por cada clic.

## Avance local y cambios editoriales

El avance se guarda en `localStorage` con la clave `mecro_hardware_v1`, separado por `guide.id`. Contiene las parejas de puertos resueltas, los índices de los pasos marcados y si la última respuesta fue correcta. Si el navegador bloquea el almacenamiento, el avance solo se conserva durante la visita.

Una guía se considera **revisada** cuando el alumno completa todas las conexiones, marca todos los pasos y responde correctamente la pregunta. Ver el esquema de referencia no resuelve conexiones. Una respuesta incorrecta posterior vuelve a dejar la pregunta pendiente. Los controles de reinicio permiten borrar solo las conexiones o todo el avance de esa guía.

No existe sincronización entre dispositivos o cuentas ni conexión con calificaciones, certificados o el progreso del aula virtual. El almacenamiento pertenece al navegador y al origen de la página: una vista local y GitHub Pages no comparten ese avance.

Para correcciones de redacción, conserva el identificador. Al reordenar o sustituir pasos, o al cambiar lo que evalúa la pregunta, utiliza un nuevo `id` de guía o implementa una migración explícita: los pasos se guardan por posición y la pregunta como un booleano, por lo que mantener el mismo `id` podría conservar una revisión anterior que ya no corresponde. Las conexiones antiguas que dejan de coincidir se descartan al leer el avance; las coincidencias que sigan siendo válidas se conservan.

## Agregar una ruta nueva

Para ampliar una de las cuatro rutas actuales basta con agregar objetos a `guides`. Crear una quinta ruta también requiere:

1. Añadir un objeto a `tracks` con `id`, `title`, `eyebrow` y `description`, y al menos una guía asociada.
2. Añadir su botón en [content/kits.html](../content/kits.html), con `data-track` igual al nuevo identificador e `id="track-NUEVO_ID"`. Conserva los atributos de pestaña y la referencia a `track-panel` de los botones existentes.
3. Revisar el diseño de pestañas en [assets/css/hardware.css](../assets/css/hardware.css), especialmente en móvil.
4. Ejecutar `npm run build` para generar `kits.html` y revisar la nueva ruta con las verificaciones indicadas a continuación.

`tracks[].eyebrow` es metadato editorial; la presentación de las pestañas actuales está definida en la plantilla HTML.

## Verificación y publicación

Desde la raíz de `mecro.github.io`, ejecuta:

```sh
node --check data/hardware-guides.js
npm run build
npm run check
npm test
```

[tests/hardware.test.mjs](../tests/hardware.test.mjs) comprueba pares exactos, recuperación de avance e integridad del contenido: identificadores únicos, al menos una guía por ruta, componentes de destino existentes, referencias válidas y respuestas coherentes. Estas comprobaciones permiten ampliar el catálogo sin fijar una cantidad exacta de guías o conexiones.

Abre el sitio desde un servidor HTTP, por ejemplo `python -m http.server 8765 --bind 127.0.0.1`, y visita `http://127.0.0.1:8765/kits.html`. Los módulos ES no deben verificarse abriendo el HTML mediante `file://`.

Comprueba la guía en escritorio y móvil: selección de componentes, cada pareja de puertos en ambos órdenes, una pareja incorrecta, pestañas por teclado, pasos, pregunta, copia de código y referencias. Recarga para comprobar la persistencia y usa el reinicio para comenzar de nuevo. Las comprobaciones automáticas no sustituyen la revisión técnica del montaje ni las pruebas reales del código en el modelo indicado.

Publica los HTML finales y las carpetas `assets/`, `images/` y **`data/`**, respetando sus rutas. `assets/js/hardware.js` importa `../../data/hardware-guides.js` directamente desde el navegador: omitir `data/` rompe la carga de las guías. GitHub Pages sirve estos módulos sin necesitar un servidor Node en producción.
