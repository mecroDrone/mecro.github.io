// Estado de aprendizaje independiente de la interfaz y del almacenamiento.
// Los identificadores representan pares exactos para no confundir pines similares.
export function connectionKey(connection) {
  return JSON.stringify([
    connection.from,
    connection.fromPort,
    connection.to,
    connection.toPort
  ]);
}

export function portKey(partId, portLabel) {
  return JSON.stringify([partId, portLabel]);
}

export function findConnection(guide, firstPortKey, secondPortKey) {
  return guide.connections.findIndex(connection => {
    const from = portKey(connection.from, connection.fromPort);
    const to = portKey(connection.to, connection.toPort);
    return (firstPortKey === from && secondPortKey === to)
      || (firstPortKey === to && secondPortKey === from);
  });
}

export function freshProgress() {
  return { connections: [], steps: [], quiz: false };
}

export function sanitizeProgress(guide, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return freshProgress();
  }

  const allowedConnections = new Set(guide.connections.map(connectionKey));
  const connections = Array.isArray(raw.connections)
    ? [...new Set(raw.connections.filter(key => allowedConnections.has(key)))]
    : [];
  const steps = Array.isArray(raw.steps)
    ? [...new Set(raw.steps.filter(index => Number.isInteger(index)
      && index >= 0 && index < guide.steps.length))]
    : [];

  return { connections, steps, quiz: raw.quiz === true };
}

export function guideComplete(guide, progress) {
  const clean = sanitizeProgress(guide, progress);
  return clean.connections.length === guide.connections.length
    && clean.steps.length === guide.steps.length
    && clean.quiz;
}

export function portsFor(guide, partId) {
  const ports = new Set();
  for (const connection of guide.connections) {
    if (connection.from === partId) ports.add(connection.fromPort);
    if (connection.to === partId) ports.add(connection.toPort);
  }
  return [...ports];
}
