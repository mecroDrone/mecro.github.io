import {request,normalizeUser,saveSession,clearSession} from './api.js';
const form=document.getElementById('login-form');
const password=document.getElementById('login-password');
const status=document.getElementById('login-status');
const submit=document.getElementById('login-submit');
document.getElementById('show-password').addEventListener('click',event=>{
  const show=password.type==='password';password.type=show?'text':'password';
  event.currentTarget.textContent=show?'Ocultar':'Mostrar';
  event.currentTarget.setAttribute('aria-pressed',String(show));
  event.currentTarget.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled||!form.reportValidity())return;
  submit.disabled=true;submit.textContent='Verificando acceso…';status.textContent='';status.dataset.state='';
  try{
    clearSession();
    const email=document.getElementById('login-email').value.trim();
    let integrated=false;
    try{const status=await fetch('api/campus/status',{signal:AbortSignal.timeout(3000)});integrated=status.ok&&(await status.json()).available===true;}catch{}
    if(!integrated&&new URLSearchParams(location.search).get('next')==='aula')throw new Error('El campus privado todavía no está conectado en esta dirección. Contacta a MECRO para obtener el acceso al aula.');
    let data;
    if(integrated){const response=await fetch('api/campus/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:password.value})});data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos validar tu acceso.');}
    else data=await request('login',{email,password:password.value});
    if(data.success!==true)throw new Error(typeof data.message==='string'?data.message:'No pudimos validar tu acceso. Revisa tus credenciales o contacta al equipo.');
    try{saveSession(normalizeUser(data,email));}catch{throw new Error('Permite el almacenamiento de sesión en tu navegador para entrar al aula.');}
    password.value='';location.assign(integrated?'aula.html':'portal.html');
  }catch(error){status.dataset.state='error';status.textContent=error.message;}
  finally{submit.disabled=false;submit.textContent='Ingresar al aula ↗';}
});
