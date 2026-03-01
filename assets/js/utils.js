export function qs(sel, el=document){ return el.querySelector(sel); }
export function qsa(sel, el=document){ return Array.from(el.querySelectorAll(sel)); }
export function escapeHtml(str=''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
export function fmtMoneyRub(v){
  const n = Number(v||0);
  if (!isFinite(n)) return '0 ₽';
  return n.toLocaleString('ru-RU') + ' ₽';
}
export function fmtRobux(v){
  const n = Number(v||0);
  if (!isFinite(n)) return '0 R$';
  return n.toLocaleString('ru-RU') + ' R$';
}
export function uid6(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}
export function setLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
export function getLS(key, def=null){
  const raw = localStorage.getItem(key);
  if (!raw) return def;
  try { return JSON.parse(raw); } catch { return def; }
}
export function copyText(text){
  return navigator.clipboard.writeText(text);
}
export function toast(el, msg, kind='success'){
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.remove('success','notice');
  el.classList.add(kind==='notice' ? 'notice' : 'success');
  clearTimeout(el.__t);
  el.__t = setTimeout(()=> el.classList.add('hidden'), 4500);
}
