// Contenido editorial de MECRO. Tiempos orientativos para la actividad guiada.
// Cada conexión es un enlace de aprendizaje; los mapas UAV no son un pinout de montaje.
export const tracks = [
  { id: 'esp32', title: 'ESP32', eyebrow: '01 / SISTEMAS EMBEBIDOS', description: 'De tu primer LED a una entrada digital: entiende lo que ocurre en cada pin.' },
  { id: 'arduino', title: 'Arduino', eyebrow: '02 / ELECTRÓNICA ESENCIAL', description: 'Construye una base sólida con circuitos sencillos, código y lecturas en tiempo real.' },
  { id: 'drones', title: 'Drones', eyebrow: '03 / ARQUITECTURA UAV', description: 'Reconoce los bloques de un multirrotor y aprende a leer sus conexiones de señal.' },
  { id: 'coheteria', title: 'Cohetería', eyebrow: '04 / ESTRUCTURA Y AVIÓNICA', description: 'Explora una maqueta de cohete y prepara su bahía de sensores en el banco de trabajo.' }
];

const esp32Board = {
  id: 'board', name: 'ESP32-DevKitC V4', role: 'Ejecuta el programa y conecta el circuito.',
  note: 'Modelo de referencia: módulo ESP32-WROOM-32E. GPIO de 3,3 V; no aplicar 5 V a las señales. Otras variantes requieren su propio pinout.'
};
const unoBoard = {
  id: 'board', name: 'Arduino UNO R3', role: 'Ejecuta el programa y conecta el circuito.',
  note: 'Modelo de referencia: UNO R3 con ATmega328P y lógica de 5 V. Para esta práctica se alimenta únicamente por USB.'
};
const esp32Sources = [
  { title: 'Espressif · ESP32-DevKitC V4 y disposición de pines', url: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html' },
  { title: 'Espressif · GPIO en Arduino-ESP32', url: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html' },
  { title: 'Espressif · Compatibilidad eléctrica de GPIO', url: 'https://docs.espressif.com/projects/esp-faq/en/latest/hardware-related/hardware-design.html' }
];
const unoSource = { title: 'Arduino · UNO R3, documentación y pinout', url: 'https://docs.arduino.cc/hardware/uno-rev3' };

export const guides = [
  {
    id: 'esp32-led', track: 'esp32', title: 'Tu primera señal de vida',
    description: 'Un LED externo, una resistencia y un GPIO. Sigue el recorrido de la corriente y programa tu primer parpadeo.',
    level: 'Inicial', duration: '15 min', kind: 'Montaje de mesa',
    parts: [
      { ...esp32Board },
      { id: 'resistor', name: 'Resistencia de 330 Ω', role: 'Limita la corriente que atraviesa el LED.', note: 'Una resistencia de 1/4 W sirve para esta práctica. Sus terminales no tienen polaridad.' },
      { id: 'led', name: 'LED rojo de 5 mm', role: 'Convierte la salida digital en una señal visible.', note: 'Identifica ánodo y cátodo en la ficha del LED. Habitualmente, la cara plana del encapsulado marca el cátodo.' },
      { id: 'breadboard', name: 'Protoboard y jumpers', role: 'Sujeta y conecta las piezas sin soldar.', note: 'Usa filas distintas para las patas del LED. Necesitarás también computadora y cable Micro-USB de datos.' }
    ],
    steps: [
      { title: 'Reconoce la placa', body: 'Con el USB desconectado, localiza IO23 y GND en la DevKitC V4. IO23 es la etiqueta de GPIO23. Comprueba que tu módulo sea el modelo indicado.', check: 'He identificado IO23 y GND en mi placa.' },
      { title: 'Completa el circuito', body: 'Monta GPIO23 → resistencia de 330 Ω → ánodo del LED. Lleva el cátodo a GND. Sigue los tres enlaces del panel y revisa que ninguna pata comparta una fila por error.', check: 'El LED tiene resistencia en serie y la polaridad está revisada.' },
      { title: 'Carga el programa', body: 'Conecta solo el Micro-USB. En Arduino IDE, instala el soporte oficial Arduino-ESP32, selecciona la placa ESP32 Dev Module y su puerto, y carga el ejemplo de esta guía.', check: 'El programa se cargó en el puerto de mi ESP32.' },
      { title: 'Observa y cambia', body: 'El LED permanece encendido medio segundo y apagado medio segundo. Cambia ambos tiempos de 500 a 200, vuelve a cargar y compara el ritmo.', check: 'Puedo explicar qué cambió al reducir los tiempos.' }
    ],
    connections: [
      { from: 'board', fromPort: 'IO23 / GPIO23', to: 'resistor', toPort: 'Terminal A', label: 'Salida digital', explanation: 'GPIO23 controla la corriente del LED a través de la resistencia.' },
      { from: 'resistor', fromPort: 'Terminal B', to: 'led', toPort: 'Ánodo (+)', label: 'Corriente limitada', explanation: 'La resistencia forma parte del mismo recorrido en serie.' },
      { from: 'led', fromPort: 'Cátodo (−)', to: 'board', toPort: 'GND', label: 'Retorno', explanation: 'GND cierra el circuito y establece su referencia.' }
    ],
    code: { language: 'cpp', text: `// ESP32-DevKitC V4 con ESP32-WROOM-32E
constexpr int ledPin = 23;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(500);
  digitalWrite(ledPin, LOW);
  delay(500);
}` },
    sources: [...esp32Sources, { title: 'Arduino · Concepto de circuito LED y resistencia', url: 'https://docs.arduino.cc/built-in-examples/basics/Blink/' }],
    takeaway: 'Una salida digital permite controlar una señal visible. La resistencia protege el recorrido de corriente y GND lo completa.',
    question: { prompt: '¿Dónde debe estar la resistencia del LED?', options: ['En serie con el LED.', 'En paralelo entre sus dos patas.', 'No hace falta si el programa tiene delay().'], answer: 0, explanation: 'La corriente que pasa por el LED debe atravesar la resistencia. Cambiar los tiempos del programa no sustituye esa protección.' }
  },
  {
    id: 'esp32-boton', track: 'esp32', title: 'Una entrada que responde',
    description: 'Haz que el ESP32 detecte un pulsador y descubre por qué pulsado puede significar LOW.',
    level: 'Inicial', duration: '15 min', kind: 'Montaje de mesa',
    parts: [
      { ...esp32Board },
      { id: 'button', name: 'Pulsador normalmente abierto', role: 'Une la entrada a GND mientras lo presionas.', note: 'Si tiene cuatro patas, identifica con su ficha o continuidad los dos contactos distintos; dos patas del mismo contacto ya están unidas.' },
      { id: 'computer', name: 'Computadora y Micro-USB', role: 'Carga el programa y muestra los estados.', note: 'Cable USB de datos. Completa el montaje con una protoboard y dos jumpers; no necesitas alimentación externa.' }
    ],
    steps: [
      { title: 'Encuentra los contactos', body: 'Con el USB desconectado, elige dos contactos del pulsador que solo se unan al presionarlo. En pulsadores de cuatro patas, usar dos del mismo contacto dejaría la entrada permanentemente a GND.', check: 'Los contactos elegidos se unen únicamente al presionar.' },
      { title: 'Conecta la entrada', body: 'Lleva IO23 a un contacto del pulsador y el otro a GND. El programa activa INPUT_PULLUP: una resistencia interna mantiene la entrada alta cuando el botón está suelto.', check: 'El pulsador está conectado entre IO23 y GND.' },
      { title: 'Lee la respuesta', body: 'Alimenta por Micro-USB, carga el ejemplo con Arduino-ESP32 y abre el monitor serie a 115200 baudios. Observa LIBRE al soltar y PULSADO al presionar. Esta práctica lee estados; todavía no cuenta pulsaciones.', check: 'He comprobado ambos mensajes en el monitor serie.' }
    ],
    connections: [
      { from: 'board', fromPort: 'IO23 / GPIO23', to: 'button', toPort: 'Contacto A', label: 'Entrada', explanation: 'La resistencia interna pull-up mantiene GPIO23 en HIGH cuando el circuito está abierto.' },
      { from: 'button', fromPort: 'Contacto B', to: 'board', toPort: 'GND', label: 'Pulsación', explanation: 'Al presionar se conecta la entrada a GND y su lectura pasa a LOW.' },
      { from: 'computer', fromPort: 'USB', to: 'board', toPort: 'Micro-USB', label: 'Programa y datos', explanation: 'El cable suministra alimentación y permite observar el monitor serie.' }
    ],
    code: { language: 'cpp', text: `// Lectura de estado; no es un contador de pulsaciones.
constexpr int buttonPin = 23;

void setup() {
  Serial.begin(115200);
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  const bool pressed = digitalRead(buttonPin) == LOW;
  Serial.println(pressed ? "PULSADO" : "LIBRE");
  delay(100);
}` },
    sources: esp32Sources,
    takeaway: 'Una entrada debe tener un estado definido. Con pull-up, el botón conecta a tierra y se interpreta como activo en LOW.',
    question: { prompt: 'Con INPUT_PULLUP, ¿qué lee el programa al presionar?', options: ['HIGH, porque el botón está activo.', 'LOW, porque el botón conecta la entrada a GND.', 'Un valor analógico de 1023.'], answer: 1, explanation: 'La lógica eléctrica y la palabra “activo” no son lo mismo: aquí LOW representa el estado pulsado.' }
  },
  {
    id: 'arduino-led', track: 'arduino', title: 'Del código al circuito',
    description: 'Construye un indicador con Arduino UNO R3 y relaciona cada instrucción con una conexión física.',
    level: 'Inicial', duration: '15 min', kind: 'Montaje de mesa',
    parts: [
      { ...unoBoard },
      { id: 'resistor', name: 'Resistencia de 330 Ω', role: 'Limita la corriente del indicador.', note: 'De 1/4 W; se instala en serie con el LED.' },
      { id: 'led', name: 'LED rojo de 5 mm', role: 'Muestra el estado de la salida D8.', note: 'Comprueba ánodo y cátodo. Este ejemplo usa un LED externo, separado del LED integrado de la placa.' },
      { id: 'breadboard', name: 'Protoboard y jumpers', role: 'Permite montar y revisar el recorrido.', note: 'Necesitarás computadora con Arduino IDE y cable USB-B de datos.' }
    ],
    steps: [
      { title: 'Ubica la salida', body: 'Con la placa desconectada, identifica D8 y GND. Selecciona Arduino UNO como placa de destino en Arduino IDE; esta guía está preparada para UNO R3.', check: 'He localizado D8 y GND.' },
      { title: 'Monta el indicador', body: 'Une D8 con una resistencia de 330 Ω, la resistencia con el ánodo y el cátodo con GND. Revisa la continuidad de las filas de protoboard antes de conectar el USB.', check: 'La resistencia está en serie y no hay puente directo de D8 a GND.' },
      { title: 'Programa una secuencia', body: 'Conecta el cable USB-B y carga el código. El pulso corto y la pausa larga producen una señal reconocible. Cambia el tiempo encendido y describe la nueva secuencia.', check: 'La secuencia del LED coincide con los tiempos del código.' }
    ],
    connections: [
      { from: 'board', fromPort: 'D8', to: 'resistor', toPort: 'Terminal A', label: 'Control', explanation: 'D8 es la salida elegida; debe coincidir con el número 8 del programa.' },
      { from: 'resistor', fromPort: 'Terminal B', to: 'led', toPort: 'Ánodo (+)', label: 'Limitación', explanation: 'La resistencia reduce la corriente del LED.' },
      { from: 'led', fromPort: 'Cátodo (−)', to: 'board', toPort: 'GND', label: 'Referencia', explanation: 'El recorrido termina en la tierra de la misma placa.' }
    ],
    code: { language: 'cpp', text: `// Arduino UNO R3. LED externo en D8 con 330 ohmios.
constexpr int indicator = 8;

void setup() {
  pinMode(indicator, OUTPUT);
}

void loop() {
  digitalWrite(indicator, HIGH);
  delay(150);
  digitalWrite(indicator, LOW);
  delay(850);
}` },
    sources: [unoSource, { title: 'Arduino · Blink y conexión del LED', url: 'https://docs.arduino.cc/built-in-examples/basics/Blink/' }],
    takeaway: 'El programa y el circuito comparten una referencia: el pin elegido. Nombrarlo con una constante hace más fácil revisar ambos.',
    question: { prompt: 'Mueves la resistencia de D8 a D7. ¿Qué más debe cambiar?', options: ['La conexión GND debe ir a 5V.', 'El LED debe ir sin resistencia.', 'La constante indicator debe valer 7.'], answer: 2, explanation: 'El software debe controlar el mismo pin que has cableado. Cambiar físicamente el cable no modifica el programa.' }
  },
  {
    id: 'arduino-analogico', track: 'arduino', title: 'Convierte un giro en datos',
    description: 'Lee un potenciómetro con A0 y observa cómo una señal continua se convierte en números.',
    level: 'Inicial', duration: '20 min', kind: 'Montaje de mesa',
    parts: [
      { ...unoBoard },
      { id: 'pot', name: 'Potenciómetro lineal de 10 kΩ', role: 'Genera una tensión variable en su cursor.', note: 'Identifica el cursor en la ficha de tu pieza; suele ser el terminal central.' },
      { id: 'computer', name: 'Computadora y cable USB-B', role: 'Muestra las muestras del conversor analógico.', note: 'Usa el monitor o graficador serie de Arduino IDE, a 9600 baudios.' },
      { id: 'breadboard', name: 'Protoboard y tres jumpers', role: 'Mantiene separadas las tres conexiones.', note: 'La guía usa únicamente las referencias 5V, GND y A0 del UNO R3.' }
    ],
    steps: [
      { title: 'Identifica el cursor', body: 'Desconecta el USB. Localiza los extremos de la pista resistiva y el cursor del potenciómetro. Evita elegir los terminales únicamente por su posición si la pieza tiene otro formato.', check: 'Sé cuál es el cursor y cuáles son los extremos.' },
      { title: 'Crea un divisor ajustable', body: 'Conecta un extremo a 5V del UNO R3 y el otro a GND. Lleva el cursor a A0. Esta conexión es para el UNO R3 de 5 V; no la copies a un GPIO del ESP32.', check: 'A0 recibe únicamente el cursor del potenciómetro.' },
      { title: 'Observa los valores', body: 'Conecta el USB, carga el ejemplo y abre el monitor o graficador a 9600 baudios. Gira lentamente: la lectura del UNO R3 recorre aproximadamente de 0 a 1023. Los extremos reales pueden variar un poco.', check: 'La lectura cambia gradualmente al girar.' },
      { title: 'Interpreta la lectura', body: 'Coloca el mando cerca de la mitad del recorrido. El número es una cuenta del conversor, no una tensión en voltios. Anota el valor y compáralo con los extremos que obtuviste.', check: 'Distingo una lectura ADC de una tensión en voltios.' }
    ],
    connections: [
      { from: 'board', fromPort: '5V', to: 'pot', toPort: 'Extremo A', label: 'Referencia superior', explanation: 'Este extremo toma los 5 V de la propia placa UNO R3.' },
      { from: 'pot', fromPort: 'Extremo B', to: 'board', toPort: 'GND', label: 'Referencia inferior', explanation: 'El otro extremo completa la pista resistiva entre 5V y GND.' },
      { from: 'pot', fromPort: 'Cursor', to: 'board', toPort: 'A0', label: 'Señal variable', explanation: 'El cursor entrega una fracción de la tensión, según su posición.' },
      { from: 'board', fromPort: 'USB-B', to: 'computer', toPort: 'USB', label: 'Lecturas', explanation: 'El monitor serie permite observar las muestras del programa.' }
    ],
    code: { language: 'cpp', text: `// Arduino UNO R3. Cursor del potenciómetro en A0.
constexpr int sensorInput = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  const int sample = analogRead(sensorInput);
  Serial.println(sample);
  delay(100);
}` },
    sources: [unoSource, { title: 'Arduino · Ejemplo oficial AnalogReadSerial', url: 'https://github.com/arduino/arduino-examples/blob/main/examples/01.Basics/AnalogReadSerial/AnalogReadSerial.ino' }],
    takeaway: 'El ADC representa una tensión mediante un número. La placa, su referencia y su resolución determinan cómo interpretar ese número.',
    question: { prompt: '¿Qué representa el número que imprime este programa?', options: ['La temperatura en grados.', 'Una cuenta del conversor analógico a digital.', 'Una tensión ya expresada en voltios.'], answer: 1, explanation: 'analogRead() devuelve una cuenta del ADC. Para obtener voltios necesitarías una conversión y conocer la referencia real.' }
  },
  {
    id: 'drones-sistema', track: 'drones', title: 'Lee el sistema de un multirrotor',
    description: 'Ordena receptor, controladora, ESC y motor para entender qué información circula entre ellos.',
    level: 'Inicial', duration: '15 min', kind: 'Mapa de sistema',
    parts: [
      { id: 'receiver', name: 'Receptor de radio', role: 'Entrega las órdenes del piloto a la controladora.', note: 'Bloque conceptual. El protocolo y los pines dependen del receptor elegido.' },
      { id: 'fc', name: 'Controladora de vuelo', role: 'Procesa las entradas y calcula órdenes de control.', note: 'FC es la abreviatura de flight controller. Un nombre como F405 identifica el procesador, no un pinout universal.' },
      { id: 'esc', name: 'Controlador ESC', role: 'Gestiona la energía suministrada al motor.', note: 'En este mapa se representa un canal. Los conectores entre FC y ESC cambian según fabricante y revisión.' },
      { id: 'motor', name: 'Motor sin hélice', role: 'Representa el actuador del sistema.', note: 'Actividad con tarjetas o piezas desconectadas, sin batería ni USB. No se realiza un ensayo de motor.' }
    ],
    steps: [
      { title: 'Ordena las funciones', body: 'Coloca las cuatro piezas sobre la mesa o trabaja con los bloques digitales. Empieza por la orden del piloto y termina en el motor. Mantén toda la aeronave desconectada.', check: 'Puedo identificar las cuatro funciones sin alimentar el sistema.' },
      { title: 'Distingue señal y potencia', body: 'Empareja receptor con FC y FC con ESC: ambos enlaces representan información. El enlace ESC–motor representa potencia controlada. Este mapa omite batería y distribución de alimentación.', check: 'Distingo los enlaces de señal del enlace de potencia.' },
      { title: 'Prepara una ficha real', body: 'Anota marca y revisión de tu FC, ESC y receptor. Busca sus manuales y registra protocolo, pinout y compatibilidad eléctrica. Los enlaces del ejercicio no indican pads físicos ni autorizan a intercambiar arneses.', check: 'Sé qué datos del fabricante necesito para pasar del mapa a un montaje supervisado.' }
    ],
    connections: [
      { from: 'receiver', fromPort: 'Órdenes del piloto', to: 'fc', toPort: 'Entrada de receptor', label: 'Información', explanation: 'El receptor comunica comandos mediante el protocolo compatible con esa FC.' },
      { from: 'fc', fromPort: 'Orden de motor', to: 'esc', toPort: 'Entrada de control', label: 'Control', explanation: 'La FC envía órdenes; esa señal no alimenta el motor.' },
      { from: 'esc', fromPort: 'Salida al motor', to: 'motor', toPort: 'Entrada de potencia', label: 'Potencia controlada', explanation: 'El ESC gobierna las fases del motor. Es una relación de bloques, no una instrucción de cableado.' }
    ],
    sources: [
      { title: 'Betaflight · Componentes de la controladora', url: 'https://betaflight.com/docs/wiki/getting-started/hardware' },
      { title: 'Betaflight · Receptores y protocolos', url: 'https://betaflight.com/docs/wiki/guides/current/Rx' },
      { title: 'Betaflight · Conectores y compatibilidad', url: 'https://betaflight.com/docs/development/manufacturer/connector-standard' }
    ],
    takeaway: 'Separar información, control y potencia ayuda a leer cualquier arquitectura UAV antes de tocar un conector.',
    question: { prompt: '¿Qué bloque gestiona la potencia del motor?', options: ['El ESC.', 'El receptor de radio.', 'El puerto de señal de la FC directamente.'], answer: 0, explanation: 'La FC calcula órdenes y el ESC las convierte en control eléctrico del motor.' }
  },
  {
    id: 'drones-uart', track: 'drones', title: 'Sigue una conversación UART',
    description: 'Empareja transmisión y recepción entre un GPS y una controladora, con un mapa de señal sin energizar.',
    level: 'Intermedio', duration: '20 min', kind: 'Mapa de sistema',
    parts: [
      { id: 'gps', name: 'Módulo GPS con UART', role: 'Representa el periférico que intercambia datos.', note: 'El ejercicio supone UART compatible. Un GPS con brújula puede tener además SDA/SCL: son otra interfaz.' },
      { id: 'fc', name: 'Controladora con UART libre', role: 'Representa el equipo que recibe los datos GPS.', note: 'TXn y RXn indican el mismo UART n. El número y los pads reales se consultan en el manual de tu FC.' },
      { id: 'manual', name: 'Manuales de ambas placas', role: 'Relacionan etiquetas con señales y niveles reales.', note: 'Comprueba modelo y revisión, pinout, niveles lógicos y alimentación. El color del cable no identifica una función por sí solo.' }
    ],
    steps: [
      { title: 'Lee las etiquetas', body: 'Trabaja solo sobre el diagrama, con el equipo desconectado de batería y USB. Encuentra en los manuales TX, RX y GND. En la FC, TXn y RXn deben pertenecer al mismo UART.', check: 'Puedo diferenciar un nombre de señal de un número de pin físico.' },
      { title: 'Cruza transmisión y recepción', body: 'Empareja TX del GPS con RXn de la FC, y TXn de la FC con RX del GPS. Completa GND con GND. Son relaciones conceptuales; el panel omite la alimentación porque depende de los modelos.', check: 'Cada transmisor apunta al receptor del otro equipo.' },
      { title: 'Relaciona hardware y función', body: 'Identifica qué UART correspondería a GPS en la configuración de Betaflight. No cambies una aeronave con esta actividad: deja anotados el puerto candidato y los datos que faltan comprobar con los manuales.', check: 'Entiendo que seleccionar GPS debe corresponder al UART cableado.' }
    ],
    connections: [
      { from: 'gps', fromPort: 'TX', to: 'fc', toPort: 'RXn', label: 'Datos del GPS', explanation: 'El transmisor del GPS conversa con el receptor del UART elegido.' },
      { from: 'fc', fromPort: 'TXn', to: 'gps', toPort: 'RX', label: 'Datos hacia el GPS', explanation: 'La transmisión de la FC llega a la recepción del módulo; n es el mismo UART.' },
      { from: 'gps', fromPort: 'GND', to: 'fc', toPort: 'GND', label: 'Referencia común', explanation: 'Ambos equipos necesitan una referencia de señal común. La alimentación se verifica aparte.' }
    ],
    sources: [
      { title: 'Betaflight · Puertos serie y UART', url: 'https://betaflight.com/docs/wiki/guides/current/Serial' },
      { title: 'Betaflight · Configuración de GPS', url: 'https://betaflight.com/docs/wiki/guides/current/Gps' },
      { title: 'Betaflight · Funciones de la pestaña Ports', url: 'https://betaflight.com/docs/wiki/app/ports-tab' }
    ],
    takeaway: 'TX transmite y RX recibe. El esquema de señales, el pinout y la configuración del puerto deben describir la misma conexión.',
    question: { prompt: '¿A dónde apunta conceptualmente TX del GPS?', options: ['A TX de cualquier UART.', 'Al pin de alimentación de la FC.', 'A RX del UART elegido en la FC.'], answer: 2, explanation: 'Una conversación UART une transmisión con recepción. Después hay que verificar compatibilidad eléctrica y pads con ambos manuales.' }
  },
  {
    id: 'cohete-estructura', track: 'coheteria', title: 'Construye una maqueta por capas',
    description: 'Organiza cuerpo, nariz, aletas y una bahía de instrumentos en una maqueta de exposición de cartón.',
    level: 'Inicial', duration: '25 min', kind: 'Maqueta educativa',
    parts: [
      { id: 'body', name: 'Cuerpo de cartón', role: 'Sostiene los elementos de la maqueta.', note: 'Usa un tubo de cartón ligero y una base de exposición. Es un modelo inerte, sin motor ni sistema de ignición.' },
      { id: 'nose', name: 'Nariz de papel', role: 'Representa el cierre frontal y su forma exterior.', note: 'Forma un cono con cartulina y cinta. Mantén el montaje desmontable para mostrar el interior.' },
      { id: 'fins', name: 'Aletas de cartulina', role: 'Representan superficies de estabilización.', note: 'Recorta piezas iguales y distribúyelas visualmente alrededor del cuerpo; esta maqueta no valida estabilidad de vuelo.' },
      { id: 'payload', name: 'Bahía de instrumentos', role: 'Reserva un espacio para la carga educativa.', note: 'Una bandeja de cartón extraíble sirve para representar el sensor y su electrónica, sin mecanismos de despliegue.' }
    ],
    steps: [
      { title: 'Dibuja la arquitectura', body: 'En una hoja, dibuja el cuerpo y reserva un espacio para la bahía de instrumentos. Identifica qué piezas son estructura y cuáles representan la carga educativa.', check: 'Mi dibujo distingue estructura y espacio de instrumentos.' },
      { title: 'Ensambla la forma', body: 'Prepara un cono de papel y aletas iguales de cartulina. Únelos al tubo con cinta y conserva la nariz desmontable. El modelo permanecerá en una base de exposición.', check: 'Puedo retirar la nariz y señalar las uniones sin deformar el cuerpo.' },
      { title: 'Muestra el interior', body: 'Introduce una bandeja de cartón con etiquetas para sensor y placa. Retírala para explicar la función de cada bloque. Fotografía una vista exterior y otra con la bandeja extraída.', check: 'Puedo mostrar la carga educativa y explicar cómo accedo a ella.' }
    ],
    connections: [
      { from: 'nose', fromPort: 'Base del cono', to: 'body', toPort: 'Extremo superior', label: 'Cierre desmontable', explanation: 'La unión permite reconocer la forma exterior y acceder al interior de la maqueta.' },
      { from: 'fins', fromPort: 'Raíz de las aletas', to: 'body', toPort: 'Zona inferior exterior', label: 'Unión estructural', explanation: 'Las aletas representan superficies estabilizadoras; su presencia no demuestra que un diseño pueda volar.' },
      { from: 'payload', fromPort: 'Bandeja extraíble', to: 'body', toPort: 'Bahía interior', label: 'Integración', explanation: 'La bandeja separa los instrumentos de la estructura y permite inspeccionarlos.' }
    ],
    sources: [{ title: 'NASA Glenn · Partes y sistemas de un cohete', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-parts/' }],
    takeaway: 'Una maqueta desmontable permite explicar sistemas y accesos antes de trabajar con electrónica. Es una pieza educativa de exposición.',
    question: { prompt: '¿Para qué sirve una bahía de instrumentos desmontable?', options: ['Para sustituir una validación de estabilidad.', 'Para acceder a la carga educativa e inspeccionarla.', 'Para convertir la maqueta en un vehículo de vuelo.'], answer: 1, explanation: 'La separación entre estructura e instrumentos facilita observar, explicar y revisar cada parte del modelo.' }
  },
  {
    id: 'cohete-sensor', track: 'coheteria', title: 'Prepara una bahía de sensores',
    description: 'Conecta un BMP280 a un ESP32 y detecta su dirección I2C en una práctica de aviónica de mesa.',
    level: 'Intermedio', duration: '25 min', kind: 'Montaje de mesa',
    parts: [
      { ...esp32Board },
      { id: 'sensor', name: 'Adafruit BMP280 · producto 2651', role: 'Representa un instrumento de presión y temperatura.', note: 'Usa la placa breakout Adafruit documentada, con Vin, GND, SDI y SCK. No equivale al chip suelto ni a cualquier módulo BMP280.' },
      { id: 'breadboard', name: 'Protoboard y cuatro jumpers', role: 'Permite revisar las cuatro líneas del sensor.', note: 'Monta primero sobre la mesa. Deja accesible el sensor y evita tapar su abertura de presión.' },
      { id: 'computer', name: 'Computadora y Micro-USB', role: 'Muestra si un dispositivo responde en el bus.', note: 'La prueba identifica una dirección I2C; todavía no mide presión ni estima altura. La maqueta permanece inerte.' }
    ],
    steps: [
      { title: 'Comprueba la referencia', body: 'Verifica el modelo del ESP32 y la placa Adafruit BMP280. Con el USB desconectado, localiza las etiquetas Vin, GND, SDI y SCK del breakout. Su pin 3Vo es una salida y no sustituye a Vin en este montaje.', check: 'Mi placa de sensor coincide con el pinout de referencia.' },
      { title: 'Conecta las cuatro líneas', body: 'Une 3V3 del ESP32 a Vin, GND a GND, IO21 a SDI y IO22 a SCK. Aquí SDI funciona como SDA y SCK como SCL. Deja CS, SDO y 3Vo sin conectar, siguiendo la guía de este breakout.', check: 'He distinguido alimentación, tierra, datos y reloj.' },
      { title: 'Busca el dispositivo', body: 'Alimenta únicamente por Micro-USB y carga el ejemplo con Arduino-ESP32. Abre el monitor serie a 115200 baudios. La búsqueda revisa 0x76 y 0x77; la placa Adafruit usa 0x77 por defecto. Una respuesta confirma comunicación, no una medición válida.', check: 'He leído el resultado del bus o revisado el cableado con el USB desconectado.' },
      { title: 'Documenta el instrumento', body: 'Anota placa, pines y dirección detectada en la bandeja de tu maqueta. Para el siguiente experimento de presión, consulta el ejemplo del fabricante enlazado abajo. Mantén esta práctica como instrumento de mesa.', check: 'La ficha de mi bahía incluye pines, dirección y función del sensor.' }
    ],
    connections: [
      { from: 'board', fromPort: '3V3', to: 'sensor', toPort: 'Vin', label: 'Alimentación de 3,3 V', explanation: 'El breakout Adafruit se alimenta desde 3V3 en este montaje para usar lógica compatible con el ESP32.' },
      { from: 'board', fromPort: 'GND', to: 'sensor', toPort: 'GND', label: 'Referencia común', explanation: 'La tierra compartida es necesaria para alimentación y comunicación.' },
      { from: 'board', fromPort: 'IO21 / SDA', to: 'sensor', toPort: 'SDI / SDA', label: 'Datos I2C', explanation: 'El programa asigna SDA a GPIO21; SDI es la etiqueta del mismo papel en este breakout.' },
      { from: 'board', fromPort: 'IO22 / SCL', to: 'sensor', toPort: 'SCK / SCL', label: 'Reloj I2C', explanation: 'El programa asigna SCL a GPIO22 para sincronizar la conversación.' }
    ],
    code: { language: 'cpp', text: `// Detecta respuesta I2C. No lee presión ni altitud.
// ESP32-DevKitC V4 + breakout Adafruit BMP280.
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // SDA, SCL
  delay(1000);
}

void loop() {
  bool found = false;
  for (int address = 0x76; address <= 0x77; ++address) {
    Wire.beginTransmission(address);
    const byte result = Wire.endTransmission();
    if (result == 0) {
      Serial.print("Respuesta I2C en 0x");
      Serial.println(address, HEX);
      found = true;
    }
  }
  if (!found) {
    Serial.println("Sin respuesta: desconecta USB y revisa las cuatro lineas.");
  }
  delay(2000);
}` },
    sources: [
      { title: 'Adafruit · Pinout del breakout BMP280', url: 'https://learn.adafruit.com/adafruit-bmp280-barometric-pressure-plus-temperature-sensor-breakout/pinouts' },
      { title: 'Adafruit · Ejemplo de lectura del BMP280', url: 'https://learn.adafruit.com/adafruit-bmp280-barometric-pressure-plus-temperature-sensor-breakout/arduino-test' },
      { title: 'Adafruit · Direcciones I2C del BMP280', url: 'https://adafruit.github.io/Adafruit_BMP280_Library/html/_adafruit___b_m_p280_8h.html' },
      { title: 'Espressif · I2C con Arduino-ESP32', url: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/api/i2c.html' },
      esp32Sources[0]
    ],
    takeaway: 'Antes de interpretar una medición, confirma modelo, conexiones y comunicación. Un dispositivo que responde aún necesita su controlador y una lectura validada.',
    question: { prompt: '¿Qué demuestra que el escáner encuentre 0x77?', options: ['Que un dispositivo respondió en esa dirección I2C.', 'Que la maqueta ya mide una altura exacta.', 'Que cualquier otro BMP280 usa el mismo pinout.'], answer: 0, explanation: 'El escáner solo confirma una respuesta en el bus. No identifica por sí solo el chip ni valida una medición de presión o altura.' }
  }
];
