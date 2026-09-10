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
    const data=await request('login',{email,password:password.value});
    if(data.success!==true)throw new Error(typeof data.message==='string'?data.message:'No pudimos validar tu acceso. Revisa tus credenciales o contacta al equipo.');
    try{saveSession(normalizeUser(data,email));}catch{throw new Error('Permite el almacenamiento de sesión en tu navegador para entrar al aula.');}
    password.value='';location.assign('portal.html');
  }catch(error){status.dataset.state='error';status.textContent=error.message;}
  finally{submit.disabled=false;submit.textContent='Ingresar al aula ↗';}
});
