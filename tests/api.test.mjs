import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIds,normalizeGroup,normalizeUser,groupLink,materialLink,embedUrl,safeUrl,readSession,saveSession,clearSession,request} from '../assets/js/api.js';

test('normaliza matrículas sin conceder cursos por defecto',()=>{
  assert.deepEqual(normalizeIds('UAV, ESP32; UAV'),['UAV','ESP32']);
  assert.deepEqual(normalizeIds(null),[]);
  assert.deepEqual(normalizeIds([1,'2','',{}]),['1','2']);
  assert.equal(normalizeGroup(' g10 '),'G10');
  assert.equal(normalizeGroup(undefined),'');
  assert.equal(normalizeGroup('administrador'),'');
});
test('G1 nunca recibe G10 ni enlaces sin grupo',()=>{
  const item={Video_G10:'https://drive.google.com/file/d/ten/view',Video:'https://example.com/shared'};
  assert.equal(groupLink(item,'video','G1'),'');
  assert.equal(groupLink(item,'video','G10'),'https://drive.google.com/file/d/ten/view');
  assert.equal(groupLink({...item,'Video Link G1':'https://example.com/one'},'video','g1'),'https://example.com/one');
  assert.equal(groupLink({meetLinks:{'g2':'https://meet.google.com/abc'}},'meet','G2'),'https://meet.google.com/abc');
  assert.equal(groupLink({meetLinks:{G2:'javascript:alert(1)'}},'meet','G2'),'');
});
test('valida recursos y limita los visores a proveedores admitidos',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),'');
  assert.equal(safeUrl('data:text/html,test'),'');
  assert.equal(safeUrl('http://example.com'),'');
  assert.equal(materialLink({'presentación':'https://docs.google.com/presentation/d/abc/edit'},'ppt'),'https://docs.google.com/presentation/d/abc/edit');
  assert.equal(embedUrl('https://drive.google.com/file/d/ABC_123/view?usp=sharing'),'https://drive.google.com/file/d/ABC_123/preview');
  assert.equal(embedUrl('https://docs.google.com/presentation/d/ABC_123/edit'),'https://docs.google.com/presentation/d/ABC_123/embed');
  assert.equal(embedUrl('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(embedUrl('https://drive.google.com.evil.example/file/d/abc/view'),'');
});
test('la sesión guarda solo el perfil y caduca',()=>{
  const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
  globalThis.sessionStorage=storage();globalThis.localStorage=storage();
  const profile=normalizeUser({success:true,nombre:'Ana',email:'ana@example.com',password:'NO-GUARDAR',cursosInscritos:['UAV'],grupo:'G1',grupos:{ESP32:'G2'}});
  saveSession(profile);
  assert.equal(readSession().nombre,'Ana');assert.equal(readSession().grupos.ESP32,'G2');
  assert.ok(!sessionStorage.getItem('mecro_session').includes('NO-GUARDAR'));
  sessionStorage.setItem('mecro_session',JSON.stringify({user:profile,expiresAt:1}));assert.equal(readSession(),null);
  sessionStorage.setItem('mecro_session','invalid');assert.equal(readSession(),null);
  clearSession();assert.equal(readSession(),null);
});
test('no interpreta HTML del servidor como respuesta de autenticación',async()=>{
  const original=globalThis.fetch;
  try{globalThis.fetch=async()=>({ok:true,json:async()=>{throw new SyntaxError('HTML');}});
    await assert.rejects(request('login',{email:'test@example.com',password:'test'}),/respuesta válida/);
  }finally{globalThis.fetch=original;}
});
