import test from 'node:test';
import assert from 'node:assert/strict';
import { tracks, guides } from '../data/hardware-guides.js';
import {
  connectionKey, portKey, findConnection, freshProgress,
  sanitizeProgress, guideComplete, portsFor
} from '../assets/js/hardware-state.js';

const guide = guides.find(item => item.id === 'esp32-led');

test('hardware: exact endpoint pairs work in either selection order', () => {
  const connection = guide.connections[0];
  const from = portKey(connection.from, connection.fromPort);
  const to = portKey(connection.to, connection.toPort);
  assert.equal(findConnection(guide, from, to), 0);
  assert.equal(findConnection(guide, to, from), 0);
  assert.equal(findConnection(guide, from, from), -1);
  assert.equal(findConnection(guide, from, portKey('another-board', connection.toPort)), -1);
  assert.deepEqual(JSON.parse(connectionKey(connection)), [
    connection.from, connection.fromPort, connection.to, connection.toPort
  ]);
});

test('hardware: similar names and separators never create a matching port', () => {
  const fixture = { connections: [
    { from: 'board', fromPort: 'GPIO10', to: 'sensor', toPort: 'IN' },
    { from: 'board:GPIO', fromPort: '1', to: 'sensor', toPort: 'OTHER' }
  ] };
  assert.equal(findConnection(fixture, portKey('board', 'GPIO1'), portKey('sensor', 'IN')), -1);
  assert.equal(findConnection(fixture, portKey('board', 'GPIO10'), portKey('sensor', 'IN')), 0);
  assert.notEqual(portKey('board:GPIO', '1'), portKey('board', 'GPIO:1'));
  assert.equal(findConnection(fixture, null, undefined), -1);
});

test('hardware: progress recovery removes obsolete, duplicate and malformed values', () => {
  const validConnection = connectionKey(guide.connections[0]);
  const saved = {
    connections: [validConnection, 'old-connection', validConnection, {}, null],
    steps: [0, 0, '1', -1, 1.5, 1, guide.steps.length, null],
    quiz: 'true',
    unrelated: 'old field'
  };
  const clean = sanitizeProgress(guide, saved);
  assert.deepEqual(clean, { connections: [validConnection], steps: [0, 1], quiz: false });
  assert.equal(saved.connections.length, 5, 'does not mutate stored input');
  assert.notEqual(clean.connections, saved.connections);
  assert.notEqual(clean.steps, saved.steps);

  for (const invalid of [null, undefined, [], 'saved', 3]) {
    assert.deepEqual(sanitizeProgress(guide, invalid), freshProgress());
  }
  assert.deepEqual(sanitizeProgress(guide, { connections: {}, steps: '0', quiz: 1 }), freshProgress());
  assert.equal(sanitizeProgress(guide, { quiz: true }).quiz, true);
});

test('hardware: a guide completes only after every connection, step and quiz', () => {
  const complete = {
    connections: guide.connections.map(connectionKey),
    steps: guide.steps.map((_, index) => index),
    quiz: true
  };
  assert.equal(guideComplete(guide, complete), true);
  assert.equal(guideComplete(guide, freshProgress()), false);
  assert.equal(guideComplete(guide, { ...complete, quiz: false }), false);
  assert.equal(guideComplete(guide, { ...complete, quiz: 'true' }), false);
  assert.equal(guideComplete(guide, { ...complete, connections: complete.connections.slice(1) }), false);
  assert.equal(guideComplete(guide, { ...complete, steps: complete.steps.slice(1) }), false);
  assert.equal(guideComplete(guide, {
    ...complete,
    connections: guide.connections.map(() => complete.connections[0])
  }), false, 'duplicates cannot replace missing connections');
});

test('hardware: fresh state is independent and ports include both ends once', () => {
  const first = freshProgress();
  const second = freshProgress();
  first.steps.push(0);
  first.connections.push('example');
  assert.deepEqual(second, { connections: [], steps: [], quiz: false });

  const fixture = { connections: [
    { from: 'board', fromPort: 'GND', to: 'sensor', toPort: 'GND' },
    { from: 'led', fromPort: 'Cathode', to: 'board', toPort: 'GND' },
    { from: 'sensor', fromPort: 'OUT', to: 'board', toPort: 'GPIO1' }
  ] };
  assert.deepEqual(portsFor(fixture, 'board'), ['GND', 'GPIO1']);
  assert.deepEqual(portsFor(fixture, 'sensor'), ['GND', 'OUT']);
  assert.deepEqual(portsFor(fixture, 'unknown'), []);
});

test('hardware: published tracks and guides have consistent, usable content', () => {
  assert.ok(tracks.length > 0);
  assert.ok(guides.length > 0);
  assert.equal(new Set(tracks.map(track => track.id)).size, tracks.length);
  assert.equal(new Set(guides.map(item => item.id)).size, guides.length);

  const trackIds = new Set(tracks.map(track => track.id));
  for (const track of tracks) {
    assert.ok(guides.some(item => item.track === track.id), track.id);
  }
  for (const item of guides) {
    assert.ok(trackIds.has(item.track), item.id);
    assert.ok(['Inicial', 'Intermedio'].includes(item.level), item.id);
    assert.ok(['Montaje de mesa', 'Mapa de sistema', 'Maqueta educativa'].includes(item.kind), item.id);
    assert.match(item.duration, /^\d+ min$/);
    assert.ok(item.parts.length >= 2, item.id);
    assert.ok(item.steps.length > 0, item.id);
    assert.ok(item.connections.length > 0, item.id);

    const partIds = new Set(item.parts.map(part => part.id));
    assert.equal(partIds.size, item.parts.length, item.id);
    const pairs = new Set();
    for (const connection of item.connections) {
      assert.ok(partIds.has(connection.from) && partIds.has(connection.to), item.id);
      assert.ok(connection.fromPort && connection.toPort && connection.explanation, item.id);
      const first = portKey(connection.from, connection.fromPort);
      const second = portKey(connection.to, connection.toPort);
      assert.notEqual(first, second, item.id);
      pairs.add(JSON.stringify([first, second].sort()));
    }
    assert.equal(pairs.size, item.connections.length, item.id);
    assert.ok(item.steps.every(step => step.title && step.body && step.check), item.id);
    assert.ok(item.question.options.length >= 2, item.id);
    assert.ok(Number.isInteger(item.question.answer), item.id);
    assert.ok(item.question.answer >= 0 && item.question.answer < item.question.options.length, item.id);
    assert.ok(item.question.explanation && item.takeaway, item.id);
    assert.ok(item.sources.length > 0, item.id);
    for (const source of item.sources) {
      assert.ok(source.title, item.id);
      assert.equal(new URL(source.url).protocol, 'https:', item.id);
    }
    if (item.code) {
      assert.equal(item.code.language, 'cpp', item.id);
      assert.ok(item.code.text.trim(), item.id);
    }
  }
});
