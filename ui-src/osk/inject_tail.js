
Keyboard.dark=!!ST.dark;
function __alhStart(){
  if(Keyboard.el) return;
  Keyboard.init();
  if(ST.acc) Keyboard.el.style.setProperty('--acc',ST.acc);
}
if(document.body) __alhStart(); else document.addEventListener('DOMContentLoaded',__alhStart);
// the Alharthia host calls this when the keyboard settings change
window.__alhOskApply=function(st){
  if(!st) return;
  if(Array.isArray(st.langs)&&st.langs.length) S.kbdLangs=st.langs;
  if(st.mode) S.oskMode=st.mode;
  if(st.size) S.oskSize=st.size;
  S.oskPreview=st.preview!==false; S.ar=st.ar!==false;
  Keyboard.dark=!!st.dark;
  if(!Keyboard.el) return;
  if(st.acc) Keyboard.el.style.setProperty('--acc',st.acc);
  if(!Keyboard.enabledLangs().includes(Keyboard.lang)) Keyboard.lang=Keyboard.enabledLangs()[0];
  if(S.oskMode==='off') Keyboard.hide();
  else if(!Keyboard.el.hidden) Keyboard.show();
};
// the browser's keyboard button: show / hide on demand
window.__alhOskToggle=function(){
  if(!Keyboard.el) return false;
  if(!Keyboard.el.hidden){ Keyboard.hide(); return false; }
  const a=Keyboard.deepActive();
  if(Keyboard.editable(a)) Keyboard.target=a;
  Keyboard.show(); return true;
};
