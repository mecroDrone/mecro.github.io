// Illustrative silhouettes, not physical pinouts or manufacturing drawings.
const drawings = {
  board: '<rect x="30" y="8" width="60" height="64" rx="5"/><rect x="43" y="18" width="34" height="28" rx="2"/><path d="M48 23h24v7H53v7h19M43 54h9m16 0h9M49 72v-9h22v9M23 18h7m-7 10h7m-7 10h7m-7 10h7m-7 10h7m60-40h7m-7 10h7m-7 10h7m-7 10h7m-7 10h7"/>',
  uno: '<rect x="16" y="15" width="88" height="52" rx="5"/><rect x="11" y="27" width="20" height="17" rx="2"/><rect x="45" y="35" width="42" height="13" rx="2"/><path d="M37 22h54M37 60h54M49 31v4m8-4v4m8-4v4m8-4v4m8-4v4M49 48v4m8-4v4m8-4v4m8-4v4m8-4v4"/><circle cx="30" cy="56" r="4"/>',
  resistor: '<path d="M9 41h27m48 0h27"/><rect x="36" y="30" width="48" height="22" rx="6"/><path d="M47 31v20m8-20v20m10-20v20m10-20v20"/>',
  led: '<path d="M43 47V33a17 17 0 0 1 34 0v14M39 48h42v7H39zM51 55v19m18-19v15M60 26v18m0-11h8M83 19l11-9m-3 0h3v3M88 31l13-5m-3-1l3 1-1 3"/>',
  breadboard: '<rect x="17" y="10" width="86" height="62" rx="4"/><path d="M25 18h70M25 63h70M25 40h70"/><path stroke-dasharray="1 8" stroke-width="3" d="M28 27h64M28 33h64M28 48h64M28 54h64"/>',
  button: '<path d="M34 22h52v41H34zM23 30h11m-11 25h11m52-25h11M86 55h11"/><circle cx="60" cy="42" r="13"/><circle cx="60" cy="42" r="8"/>',
  computer: '<rect x="26" y="12" width="68" height="43" rx="3"/><path d="M26 55L14 67h92L94 55M51 62h18M35 21h50v25H35z"/>',
  pot: '<circle cx="60" cy="36" r="22"/><path d="M60 36l12-13M46 55v18m14-15v15m14-18v18"/><circle cx="60" cy="36" r="5"/>',
  receiver: '<rect x="35" y="32" width="50" height="33" rx="3"/><path d="M48 32L29 9m43 23L91 9M47 43h26m-26 9h16M45 65v8m10-8v8m10-8v8m10-8v8"/>',
  fc: '<rect x="32" y="12" width="56" height="56" rx="4"/><rect x="46" y="26" width="28" height="28" rx="2"/><path d="M52 20v6m8-6v6m8-6v6M52 54v6m8-6v6m8-6v6M40 32h6m-6 8h6m-6 8h6m28-16h6m-6 8h6m-6 8h6"/><circle cx="39" cy="19" r="2"/><circle cx="81" cy="61" r="2"/>',
  esc: '<rect x="29" y="25" width="62" height="32" rx="4"/><path d="M12 32h17M12 50h17M91 30h17M91 41h17M91 52h17M39 32v18m10-18v18m10-18v18m10-18v18m10-18v18"/>',
  motor: '<ellipse cx="60" cy="27" rx="25" ry="13"/><path d="M35 27v27c0 18 50 18 50 0V27M60 27V8M42 38v17m12-15v18m12-18v18m12-20v17M48 67v9m12-7v7m12-9v9"/>',
  gps: '<rect x="31" y="19" width="58" height="46" rx="4"/><rect x="40" y="27" width="40" height="28" rx="3"/><path d="M46 65v10m9-10v10m9-10v10m9-10v10M47 9q13-9 26 0m-21 5q8-6 16 0"/>',
  manual: '<path d="M60 21Q39 10 17 18v47q22-7 43 4 21-11 43-4V18q-22-8-43 3v48M26 30q13-3 24 3m-24 9q13-3 24 3m-24 9q13-3 24 3m20-24q11-6 24-3m-24 15q11-6 24-3m-24 15q11-6 24-3"/>',
  body: '<ellipse cx="60" cy="15" rx="17" ry="6"/><path d="M43 15v50c0 8 34 8 34 0V15M43 27c0 8 34 8 34 0M43 55c0 8 34 8 34 0"/>',
  nose: '<path d="M60 9Q48 27 36 62c6 12 42 12 48 0Q72 27 60 9zM36 62q24-10 48 0"/>',
  fins: '<path d="M27 64V20L55 64zM63 64V20L91 64zM27 58l5 6m31-6 5 6"/>',
  payload: '<path d="M42 17h36v49H42zM37 17h46M37 66h46"/><rect x="49" y="28" width="22" height="27" rx="2"/><circle cx="60" cy="38" r="4"/><path d="M54 48h12M60 17v11M60 55v11"/>',
  sensor: '<rect x="30" y="17" width="60" height="47" rx="5"/><rect x="44" y="26" width="24" height="21" rx="2"/><circle cx="56" cy="35" r="3"/><path d="M39 58v15m10-15v15m10-15v15m10-15v15m10-15v15M76 27h6m-6 8h6m-6 8h6"/>'
};

export function partIllustration(part, track) {
  const key=part.illustration || (part.id==='board'&&track==='arduino'?'uno':part.id);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 120 82');svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');svg.classList.add('part-illustration');
  // Only the fixed, author-owned drawing library is inserted as markup.
  svg.innerHTML=drawings[key]||drawings.fc;
  return svg;
}
