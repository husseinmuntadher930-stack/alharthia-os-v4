/* ---- new tab page ---- */
document.title='صفحة جديدة';
paintIcons();
$('#ntLogo').src=S.logo||'data:image/webp;base64,__LOGO__';
$('#ntQuick').innerHTML=QUICK_SITES.map(([n,l,c,u])=>`<a class="qk" href="${esc(u)}"><i style="--c:${c}">${esc(l)}</i>${esc(n)}</a>`).join('');
const hist=store.get('brHist',[]).slice(0,6);
if(hist.length) $('#ntRecent').innerHTML='<h3>زرتها مؤخراً</h3>'+hist.map(h=>`<a href="${esc(h.url)}">${icon('globe')}<span>${esc(h.title)}</span></a>`).join('');
$('#ntForm').addEventListener('submit',e=>{ e.preventDefault(); const u=toURL($('#ntQ').value); if(u) location.href=u; });
Keyboard.dark=document.documentElement.dataset.theme==='dark';
Keyboard.init();
