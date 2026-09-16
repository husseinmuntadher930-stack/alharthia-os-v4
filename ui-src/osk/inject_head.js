/* ---- keyboard inside web pages (Alharthia browser) ---- */
const ST=window.__ALH_OSK||{};
const S={kbdLangs:ST.langs||['ar','en','fr'],kbdLang:ST.lang||'ar',oskMode:ST.mode||'auto',oskSize:ST.size||'m',
  oskPreview:ST.preview!==false,oskTermKeys:false,ar:ST.ar!==false,clickSound:false,emojiRecent:ST.emojiRecent||[]};
function save(){} function toast(){} function go(){}
const OSK_SHADOW={
  css:OSK_CSS,
  fit(h){
    let sp=document.getElementById('__alh_osk_space');
    if(!h){ if(sp) sp.remove(); return; }
    if(!sp){ sp=document.createElement('div'); sp.id='__alh_osk_space'; sp.setAttribute('aria-hidden','true'); }
    sp.style.cssText='display:block!important;width:1px!important;height:'+h+'px!important;pointer-events:none!important;visibility:hidden!important;clear:both!important';
    (document.body||document.documentElement).appendChild(sp);
  }
};
window.OSK_SHADOW=OSK_SHADOW;
