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
    const next=new URLSearchParams(location.search).get('next');
    if(['admin@macro.pe','admin@mecro.pe','admin@mecro.com'].includes(email.toLowerCase())){
      const adminData=await request('adminLogin',{secret:password.value});
      if(adminData.success!==true||!adminData.result?.token)throw new Error(typeof adminData.message==='string'?adminData.message:'Clave de administrador incorrecta o pendiente de activación en Apps Script.');
      try{
        sessionStorage.setItem('mecro_admin_session',JSON.stringify({token:adminData.result.token,email:email.toLowerCase(),expiresAt:Date.now()+2*60*60*1000}));
        saveSession({nombre:'Administrador MECRO',email:email.toLowerCase(),cursosInscritos:['uav','cohetes','esp32','DRONES_101','COHETES_101','ES32_AUTOMATION'],grupo:'G1'});
      }catch{throw new Error('Permite el almacenamiento de sesión en tu navegador.');}
      password.value='';location.assign(next==='aula'?'aula.html':'admin.html');return;
    }
    let integrated=false;
    try{const res=await fetch('api/campus/status',{signal:AbortSignal.timeout(2500)});integrated=res.ok&&(await res.json()).available===true;}catch{}
    let data;
    if(integrated){const response=await fetch('api/campus/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:password.value})});data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos validar tu acceso.');}
    else data=await request('login',{email,password:password.value});
    if(data.success!==true)throw new Error(typeof data.message==='string'?data.message:'No pudimos validar tu acceso. Revisa tus credenciales o contacta al equipo.');
    try{saveSession(normalizeUser(data,email));}catch{throw new Error('Permite el almacenamiento de sesión en tu navegador para entrar al aula.');}
    password.value='';location.assign(next==='portal'?'portal.html':'aula.html');
  }catch(error){status.dataset.state='error';status.textContent=error.message;}
  finally{submit.disabled=false;submit.textContent='Ingresar al aula ↗';}
});
