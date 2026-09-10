document.getElementById('contact-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const name=document.getElementById('contact-name').value.trim();
  const message=document.getElementById('contact-message').value.trim();
  const status=document.getElementById('contact-status');
  if(!name||!message){status.dataset.state='error';status.textContent='Escribe tu nombre y una consulta antes de continuar.';return;}
  const topic=document.getElementById('contact-topic').value;
  const url='https://wa.me/51918389333?text='+encodeURIComponent(`Hola MECRO, soy ${name}.\nConsulta: ${topic}.\n\n${message}`);
  // This navigation prepares a draft. The visitor sends it inside WhatsApp.
  location.assign(url);
});
