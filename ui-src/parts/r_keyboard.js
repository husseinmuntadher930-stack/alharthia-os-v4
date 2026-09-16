
/* =====================================================================
   ON-SCREEN KEYBOARD (Gboard style) — Arabic / English / French
   يطلع تلقائياً عند لمس أي خانة كتابة داخل الواجهة
   ===================================================================== */
const OSK_LANGS={
  ar:{n:'العربية',short:'ع',dir:'rtl',rows:[
    ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
    ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
    ['#shift','ذ','ئ','ء','ؤ','ر','ى','ة','و','ز','ظ','د','#back'],
    ['#sym','#lang',{k:'،',alt:['،','؟','!','؛',',']},'#space',{k:'.',alt:['.','…','-','«','»']},'#enter']],
    long:{'ا':['أ','إ','آ','ٱ'],'ي':['ئ','ى','ی'],'و':['ؤ'],'ه':['ة','ۀ'],'ل':['لا','لأ','لإ','لآ'],'ك':['گ','ک'],'ف':['ڤ'],'ج':['چ'],'ب':['پ'],'ز':['ژ'],'ت':['ة'],'ء':['ئ','ؤ','أ','إ'],'د':['ذ'],'ر':['ز'],'ع':['غ'],'ح':['خ','ج'],'ص':['ض'],'س':['ش'],'ط':['ظ']},
    shift:{'ض':'َ','ص':'ً','ث':'ُ','ق':'ٌ','ف':'ِ','غ':'ٍ','ع':'ْ','ه':'ّ','خ':'ـ','ح':'«','ج':'»','ش':'أ','س':'إ','ي':'آ','ب':'ٱ','ل':'لا','ا':'لأ','ت':'لإ','ن':'لآ','م':'(','ك':')','ط':'؛','ذ':'ٰ','ئ':'!','ء':'؟','ؤ':':','ر':'"','ى':'\'','ة':'-','و':'_','ز':'/','ظ':'\\','د':'*'}},
  en:{n:'English',short:'EN',dir:'ltr',rows:[
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['#shift','z','x','c','v','b','n','m','#back'],
    ['#sym','#lang',{k:',',alt:[',','!','?',';',':']},'#space',{k:'.',alt:['.','…','-','\'','"']},'#enter']],
    long:{'a':['à','á','â','ä','æ'],'e':['è','é','ê','ë'],'i':['ì','í','î','ï'],'o':['ò','ó','ô','ö','œ'],'u':['ù','ú','û','ü'],'c':['ç'],'n':['ñ'],'s':['ß','$'],'y':['ÿ']}},
  fr:{n:'Français',short:'FR',dir:'ltr',rows:[
    ['a','z','e','r','t','y','u','i','o','p'],
    ['q','s','d','f','g','h','j','k','l','m'],
    ['#shift','w','x','c','v','b','n',{k:'\'',alt:['\'','’','«','»']},'#back'],
    ['#sym','#lang',{k:',',alt:[',','!','?',';',':']},'#space',{k:'.',alt:['.','…','-','«','»']},'#enter']],
    long:{'e':['é','è','ê','ë','€'],'a':['à','â','æ','ä'],'u':['ù','û','ü'],'i':['î','ï'],'o':['ô','œ','ö'],'c':['ç'],'y':['ÿ'],'n':['ñ']}}
};
const OSK_SYM1=[['1','2','3','4','5','6','7','8','9','0'],['@','#','$','_','&','-','+','(',')','/'],['#sym2','*','"','\'',':',';','!','?','#back'],['#abc','#lang',',','#space','.','#enter']];
const OSK_SYM2=[['~','`','|','•','√','π','÷','×','¶','∆'],['£','€','¥','^','°','=','{','}','\\','%'],['#sym1','©','®','™','✓','[',']','<','>','#back'],['#abc','#lang','<','#space','>','#enter']];
const OSK_EMOJI_CATS=[
  {id:'recent',n:'الأخيرة',i:'🕘',e:[]},
  {id:'smile',n:'وجوه',i:'😀',e:'😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊'.split(' ')},
  {id:'people',n:'أشخاص وأيدي',i:'👋',e:'👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 👃 🧠 👀 👁️ 👅 👄 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 🧑‍🎓 👨‍🎓 👩‍🎓 🧑‍🏫 👨‍🏫 👩‍🏫 🧑‍⚕️ 🧑‍🔬 🧑‍💻 🧑‍🎨 🧑‍🚀 🧑‍🍳 👮 💂 👷 🤴 👸 🦸 🦹 🧙 🧚 🧞 🚶 🏃 🧍 🧎 👪 🗣️ 👤 👥'.split(' ')},
  {id:'nature',n:'حيوانات وطبيعة',i:'🐱',e:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🐐 🦌 🐕 🐈 🐓 🦃 🦚 🦜 🕊️ 🐇 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ ⚡ ☄️ 🔥 🌈 ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌩️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 ☔ 🌊'.split(' ')},
  {id:'food',n:'طعام',i:'🍔',e:'🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🧀 🥚 🍳 🥞 🧇 🥓 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋 🧊 🥄 🍴 🍽️'.split(' ')},
  {id:'activity',n:'أنشطة',i:'⚽',e:'⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🏹 🎣 🥊 🥋 🎽 🛹 🛼 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎗️ 🎫 🎟️ 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩 🎉 🎊 🎈 🎁 🎀 🪅'.split(' ')},
  {id:'travel',n:'سفر وأماكن',i:'🚗',e:'🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕋 🛕 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁'.split(' ')},
  {id:'objects',n:'مدرسة وأدوات',i:'💡',e:'📚 📖 📕 📗 📘 📙 📓 📔 📒 📃 📄 📑 🔖 🏷️ ✏️ ✒️ 🖊️ 🖋️ 🖌️ 🖍️ 📝 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🔧 🔩 ⚙️ 🧰 🧲 ⚖️ 🔗 🧪 🧫 🧬 🔬 🔭 📡 🧮 💻 🖥️ 🖨️ ⌨️ 🖱️ 💽 💾 💿 📀 📱 📲 ☎️ 📞 📟 📠 📺 📻 🎙️ 📷 📸 📹 🎥 📽️ 🔍 🔎 🕯️ 💡 🔦 🏮 🔋 🔌 ⏰ ⏱️ ⏲️ ⌛ ⏳ 📡 💰 💵 💳 🎒 👓 🕶️ 🥼 👔 👕 👖 🧣 🧤 🧥 👗 👟 👞 🎓 🧢 👑 💍 💎 🔔 📢 📣 ✉️ 📧 📨 📩 📤 📥 📦 📫 🗳️ 🧸 🪁 🧵 🧶 🛒 🚪 🪑 🛏️ 🛋️ 🚿 🛁 🧴 🧹 🧺 🧻 🧼 🧽 🧯 💊 🩹 🩺 🌡️'.split(' ')},
  {id:'symbols',n:'رموز',i:'❤️',e:'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ☦️ 🛐 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ ☢️ ☣️ 📴 📳 🆚 💮 🉐 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🚹 🚺 🚼 🚻 🚮 🎦 📶 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ 🔀 🔁 🔂 ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫 🔈 🔇 🔉 🔊 🔕 💬 💭 🗯️ ♠️ ♣️ ♥️ ♦️ 🃏 🎴 🀄 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 🕘 🕙 🕚 🕛'.split(' ')},
  {id:'flags',n:'أعلام',i:'🏳️',e:'🇮🇶 🇸🇦 🇰🇼 🇦🇪 🇶🇦 🇧🇭 🇴🇲 🇾🇪 🇯🇴 🇸🇾 🇱🇧 🇵🇸 🇪🇬 🇸🇩 🇱🇾 🇹🇳 🇩🇿 🇲🇦 🇲🇷 🇮🇷 🇹🇷 🇫🇷 🇬🇧 🇺🇸 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇸🇪 🇳🇴 🇫🇮 🇩🇰 🇷🇺 🇺🇦 🇵🇱 🇬🇷 🇨🇳 🇯🇵 🇰🇷 🇮🇳 🇵🇰 🇮🇩 🇲🇾 🇦🇺 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇳🇬 🇿🇦 🏳️ 🏴 🏁 🚩 🎌 🏴‍☠️ 🇺🇳'.split(' ')},
];
const OSK_TONE_BASE=new Set('👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤳 💪 👂 👃 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵'.split(' '));
const OSK_TONES=['\u{1F3FB}','\u{1F3FC}','\u{1F3FD}','\u{1F3FE}','\u{1F3FF}'];
const oskTones=e=>{ const b=e.replace(/\uFE0F/g,''); return [e,...OSK_TONES.map(t=>b+t)]; };
const OSK_EMOJI=OSK_EMOJI_CATS.slice(1).flatMap(c=>c.e);
const Keyboard={
  el:null, target:null, lang:null, page:'abc', shift:0, lastTouch:0, lastPtr:0, lastHw:0, hideT:0, mods:new Set(),
  enabledLangs(){ const l=(S.kbdLangs||['ar','en','fr']).filter(x=>OSK_LANGS[x]); return l.length?l:['ar']; },
  init(){
    if(!S.kbdLangs) S.kbdLangs=['ar','en','fr'];
    if(!S.oskMode) S.oskMode='auto';
    if(!S.oskSize) S.oskSize='m';
    this.lang=S.kbdLang&&OSK_LANGS[S.kbdLang]?S.kbdLang:this.enabledLangs()[0];
    const el=document.createElement('div'); el.id='osk'; el.hidden=true; el.setAttribute('dir','ltr');
    el.innerHTML='<div class="osk-bar"></div><div class="osk-row osk-xrow"></div><div class="osk-keys"></div><div class="osk-pop" hidden></div><div class="osk-alt" hidden></div>';
    if(window.OSK_SHADOW){
      const host=document.createElement('alh-osk');
      host.style.cssText='all:initial;position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:block';
      const root=host.attachShadow({mode:'closed'});
      const st=document.createElement('style'); st.textContent=OSK_SHADOW.css; root.appendChild(st); root.appendChild(el);
      (document.body||document.documentElement).appendChild(host); this.root=root; this.host=host;
    } else document.body.appendChild(el);
    this.el=el;
    addEventListener('pointerdown',e=>{ this.lastPtr=Date.now(); if(e.pointerType==='touch'||e.pointerType==='pen') this.lastTouch=Date.now(); },true);
    addEventListener('touchstart',()=>{ this.lastPtr=this.lastTouch=Date.now(); },{capture:true,passive:true});
    addEventListener('keydown',e=>{ if(e.isTrusted&&e.key&&e.key.length===1&&!(e.composedPath?e.composedPath():[e.target]).includes(this.el)&&!(this.target&&this.target.alhSink)){ this.lastHw=Date.now(); if(S.oskMode!=='always') this.hide(); } },true);
    document.addEventListener('focusin',e=>this.onFocus(e.composedPath?e.composedPath()[0]:e.target));
    document.addEventListener('focusout',()=>{ clearTimeout(this.hideT); this.hideT=setTimeout(()=>{ if(!this.editable(this.deepActive())) this.hide(); },120); });
    el.addEventListener('pointerdown',e=>this.down(e));
    el.addEventListener('contextmenu',e=>e.preventDefault());
    new ResizeObserver(()=>this.fit()).observe(el);
    this.syncBtn();
  },
  deepActive(){ let a=document.activeElement; while(a&&a.shadowRoot&&a.shadowRoot.activeElement) a=a.shadowRoot.activeElement; return a; },
  sink(){ return window.OSK_EXT||(this.target&&this.target.alhSink)||null; },
  editable(t){
    if(!t||t===document.body) return false;
    if(t.isContentEditable) return true;
    if(t.tagName==='TEXTAREA') return !t.readOnly&&!t.disabled;
    if(t.tagName==='INPUT'){ const ty=(t.type||'text').toLowerCase(); return ['text','search','password','email','url','tel','number'].includes(ty)&&!t.readOnly&&!t.disabled; }
    return false;
  },
  onFocus(t){
    if(!this.editable(t)) return;
    clearTimeout(this.hideT);
    const mode=S.oskMode||'auto';
    if(mode==='off') return;
    if(mode==='auto'){ const now=Date.now(); if(now-this.lastPtr>1500) return; if(now-this.lastHw<60000&&now-this.lastTouch>1500) return; }
    this.target=t;
    if(t.type==='number'||t.type==='tel') this.page='sym1';
    this.show();
  },
  show(){
    const el=this.el; el.className='osk-'+(S.oskSize||'m')+(this.dark?' dk':''); el.hidden=false; this.render();
    requestAnimationFrame(()=>{ this.fit(); try{ this.target&&this.target.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} });
  },
  hide(){ if(window.OSK_EXT) OSK_EXT.hide(); if(this.el.hidden) return; this.el.hidden=true; this.closeAlt(); document.documentElement.style.setProperty('--osk-h','0px'); this.page='abc'; },
  fit(){ const h=this.el.hidden?0:this.el.offsetHeight; if(window.OSK_EXT){ OSK_EXT.height(h); return; } if(window.OSK_SHADOW){ OSK_SHADOW.fit(h); return; } document.documentElement.style.setProperty('--osk-h',h+'px'); },
  rows(){
    if(this.page==='sym1') return OSK_SYM1;
    if(this.page==='sym2') return OSK_SYM2;
    return OSK_LANGS[this.lang].rows;
  },
  label(k){
    const L=OSK_LANGS[this.lang];
    if(typeof k==='object') return k.k;
    if(this.page==='abc'&&this.shift){ if(L.shift&&L.shift[k]) return L.shift[k]; return k.toUpperCase(); }
    if(this.page==='sym1'&&/^\d$/.test(k)&&this.lang==='ar'&&S.ar) return AR_D[k];
    return k;
  },
  render(){
    const L=OSK_LANGS[this.lang], langs=this.enabledLangs();
    this.el.querySelector('.osk-bar').innerHTML=`
      <button class="ob" data-okey="#hide" title="إخفاء">${icon('chevDown')}</button>
      <div class="osk-langs">${langs.map(l=>`<button class="ol${l===this.lang?' on':''}" data-okey="#setlang" data-l="${l}">${OSK_LANGS[l].n}</button>`).join('')}</div>
      <span class="grow"></span>
      <button class="ob${this.page==='emoji'?' on':''}" data-okey="#emoji" title="إيموجي"><span style="font-size:22px">☺</span></button>
      ${window.OSK_EXT||window.OSK_SHADOW||window.OSK_NOSET?'':`<button class="ob" data-okey="#settings" title="إعدادات الكيبورد">${icon('gear')}</button>`}`;
    const xr=this.el.querySelector('.osk-xrow');
    if(xr) xr.innerHTML=this.sink()&&S.oskTermKeys!==false?[['#x-Escape','Esc'],['#x-Tab','Tab ⇥'],['#m-ctrl','Ctrl'],['#m-alt','Alt'],['#x-Home','Home'],['#x-End','End'],['#x-Left','←'],['#x-Up','↑'],['#x-Down','↓'],['#x-Right','→']]
      .map(([k,l])=>`<button class="k fn${k.startsWith('#m-')&&this.mods.has(k.slice(3))?' lock':''}" data-okey="${k}">${l}</button>`).join(''):'';
    const keys=this.el.querySelector('.osk-keys');
    if(this.page==='emoji'){
      const cat=this.emoCat||((S.emojiRecent||[]).length?'recent':'smile');
      const C=OSK_EMOJI_CATS.find(c=>c.id===cat)||OSK_EMOJI_CATS[1];
      const list=cat==='recent'?(S.emojiRecent||[]):C.e;
      keys.innerHTML=`<div class="osk-emo-t">${C.n}${cat==='recent'&&list.length?' <button class="osk-emo-clr" data-okey="#emoclear">مسح</button>':''}</div>
        <div class="osk-emoji">${list.length?list.map(e=>`<button class="k${OSK_TONE_BASE.has(e)?' has-alt':''}" data-okey="${e}" data-emo="1">${e}</button>`).join(''):'<div class="osk-emo-empty">الإيموجي اللي تستخدمها تطلع هنا</div>'}</div>
        <div class="osk-row osk-emo-cats"><button class="k fn" data-okey="#abc">${this.lang==='ar'?'أبج':'ABC'}</button>${OSK_EMOJI_CATS.map(c=>`<button class="k ec${c.id===cat?' on':''}" data-okey="#emocat" data-c="${c.id}" title="${c.n}">${c.i}</button>`).join('')}<button class="k fn" data-okey="#back">${icon('backspace')}</button></div>`;
      const g=keys.querySelector('.osk-emoji'); if(g) g.scrollTop=0;
      return;
    }
    const rtl=this.page==='abc'&&OSK_LANGS[this.lang].dir==='rtl';
    const order=row=>{ if(!rtl||row.includes('#space')) return row; const isFn=k=>typeof k==='string'&&k[0]==='#';
      const lead=[],tail=[],mid=[]; let i=0; while(i<row.length&&isFn(row[i])) lead.push(row[i++]); let j=row.length-1; while(j>=i&&isFn(row[j])) tail.unshift(row[j--]);
      for(let x=i;x<=j;x++) mid.push(row[x]); return [...lead,...mid.reverse(),...tail]; };
    keys.innerHTML=this.rows().map(row=>`<div class="osk-row">${order(row).map(k=>this.keyHTML(k)).join('')}</div>`).join('');
  },
  keyHTML(k){
    const L=OSK_LANGS[this.lang];
    const sp={'#shift':`<button class="k fn w15${this.shift?' on':''}${this.shift===2?' lock':''}" data-okey="#shift">${icon('shiftKey')}</button>`,
      '#back':`<button class="k fn w15" data-okey="#back">${icon('backspace')}</button>`,
      '#sym':`<button class="k fn w15" data-okey="#sym1">${this.lang==='ar'&&S.ar?'١٢٣؟':'?123'}</button>`,
      '#abc':`<button class="k fn w15" data-okey="#abc">${this.lang==='ar'?'أبج':'ABC'}</button>`,
      '#sym1':`<button class="k fn w15" data-okey="#sym1">?123</button>`,
      '#sym2':`<button class="k fn w15" data-okey="#sym2">=\\&lt;</button>`,
      '#lang':`<button class="k fn" data-okey="#lang" title="تبديل اللغة">${icon('globe')}</button>`,
      '#space':`<button class="k space" data-okey="#space">${L.n}</button>`,
      '#enter':`<button class="k fn w15 enter" data-okey="#enter">${icon('enterKey')}</button>`};
    if(typeof k==='string'&&sp[k]) return sp[k];
    const val=typeof k==='object'?k.k:k, lab=this.label(k);
    const hasAlt=(typeof k==='object'&&k.alt)||(L.long&&L.long[val]&&this.page==='abc');
    return `<button class="k${hasAlt?' has-alt':''}" data-okey="${esc(val)}" dir="auto">${esc(lab)}</button>`;
  },
  /* ---------- input ---------- */
  down(e){
    const b=e.target.closest('[data-okey]');
    e.preventDefault();
    if(!b) return;
    const key=b.dataset.okey;
    if(b.closest('.osk-alt')){ this.type(key); this.closeAlt(); return; }
    this.closeAlt();
    if(S.clickSound&&window.tickSound) tickSound();
    b.classList.add('down'); const up=()=>{ b.classList.remove('down'); this.popHide(); clearTimeout(this.lpT); clearInterval(this.rep); clearTimeout(this.repT); removeEventListener('pointerup',up,true); removeEventListener('pointercancel',up,true); };
    addEventListener('pointerup',up,true); addEventListener('pointercancel',up,true);
    if(key==='#back'){ this.back(); this.repT=setTimeout(()=>{ this.rep=setInterval(()=>this.back(),55); },420); return; }
    if(key==='#space') return this.spaceDown(e,b);
    if(key.startsWith('#x-')&&this.sink()){ const k=key.slice(3); this.extKey(k); if(/Left|Right|Up|Down/.test(k)){ this.repT=setTimeout(()=>{ this.rep=setInterval(()=>this.extKey(k),70); },420); } return; }
    if(key.startsWith('#')) return this.fn(key,b);
    // character key: preview + long press alternatives
    const L=OSK_LANGS[this.lang];
    let alts=null;
    if(b.dataset.emo){ if(OSK_TONE_BASE.has(key)) alts=oskTones(key).slice(1); }
    else if(this.page==='abc'){ const obj=L.rows.flat().find(x=>typeof x==='object'&&x.k===key); alts=obj?obj.alt:(L.long&&L.long[key]); }
    this.popShow(b,this.labelFor(key));
    let longDone=false;
    if(alts){ this.lpT=setTimeout(()=>{ longDone=true; this.popHide(); this.openAlt(b,alts); },380); }
    const commit=ev=>{ removeEventListener('pointerup',commit,true); if(!longDone&&ev.type==='pointerup') this.type(this.labelFor(key)); };
    addEventListener('pointerup',commit,true);
  },
  labelFor(key){
    const L=OSK_LANGS[this.lang];
    if(this.page==='abc'&&this.shift){ if(L.shift&&L.shift[key]) return L.shift[key]; return key.toUpperCase(); }
    if(this.page==='sym1'&&/^\d$/.test(key)&&this.lang==='ar'&&S.ar) return AR_D[key];
    return key;
  },
  fn(key,b){
    switch(key){
      case '#hide': this.hide(); if(this.target) this.target.blur(); return;
      case '#shift': { const now=Date.now(); if(!this.shift){ this.shift=1; this.shiftT=now; } else if(this.shift===1&&now-this.shiftT<400) this.shift=2; else this.shift=0; this.render(); return; }
      case '#sym1': this.page='sym1'; this.render(); return;
      case '#sym2': this.page='sym2'; this.render(); return;
      case '#abc': this.page='abc'; this.render(); return;
      case '#emoji': this.page=this.page==='emoji'?'abc':'emoji'; this.emoCat=null; this.render(); return;
      case '#emocat': this.emoCat=b.dataset.c; this.render(); return;
      case '#emoclear': S.emojiRecent=[]; save(); this.render(); return;
      case '#lang': { const l=this.enabledLangs(); this.setLang(l[(l.indexOf(this.lang)+1)%l.length]); return; }
      case '#setlang': this.setLang(b.dataset.l); return;
      case '#enter': return this.enter();
      case '#m-ctrl': case '#m-alt': { const m=key.slice(3); this.mods.has(m)?this.mods.delete(m):this.mods.add(m); this.render(); return; }
      case '#settings': { const t=this.target; this.hide(); if(t) t.blur(); go('settings','time'); return; }
    }
  },
  toggleEnabled(){ S.oskMode=S.oskMode==='off'?'auto':'off'; save(); if(S.oskMode==='off') this.hide(); this.syncBtn(); toast(S.oskMode==='off'?'كيبورد الشاشة: مطفأ':'كيبورد الشاشة: يشتغل'); if(window.Native&&Native.on) Native.pushKbd(); },
  syncBtn(){ const b=document.getElementById('tbKbd'); if(!b) return; b.hidden=S.oskTopBtn===false; b.classList.toggle('off',S.oskMode==='off'); b.innerHTML=icon(S.oskMode==='off'?'keyboardOff':'keyboard'); },
  setLang(l){ this.lang=l; S.kbdLang=l; save(); this.page='abc'; this.shift=0; this.render(); },
  spaceDown(e,b){
    const x0=e.clientX; let moved=false, acc=0;
    const mv=ev=>{ const dx=ev.clientX-x0-acc; if(Math.abs(dx)>=18){ const n=Math.trunc(dx/18); acc+=n*18; moved=true; this.moveCaret(n); } };
    const up=()=>{ removeEventListener('pointermove',mv,true); removeEventListener('pointerup',up,true); if(!moved) this.type(' '); };
    addEventListener('pointermove',mv,true); addEventListener('pointerup',up,true);
  },
  /* ---------- editing primitives ---------- */
  live(){ const t=this.target; if(!t||!t.isConnected) return null; if(document.activeElement!==t) t.focus({preventScroll:true}); return t; },
  type(txt){
    if(this.page==='emoji'&&!/^#/.test(txt)){ S.emojiRecent=[txt,...(S.emojiRecent||[]).filter(x=>x!==txt)].slice(0,32); save(); }
    const sk=this.sink();
    if(sk){
      if(this.target&&this.target.alhSink&&document.activeElement!==this.target) this.target.focus({preventScroll:true});
      if(this.mods.size){ sk.combo([...this.mods],txt.toLowerCase()); this.mods.clear(); this.render(); }
      else sk.text(txt);
      this.extBuf=((this.extBuf||'')+txt).slice(-4);
      if(this.shift===1){ this.shift=0; this.render(); }
      else if(this.page==='abc'&&this.lang!=='ar'&&/[.!?]\s$/.test(this.extBuf)){ this.shift=1; this.render(); }
      return;
    }
    const t=this.live(); if(!t) return;
    if(t.isContentEditable){ document.execCommand('insertText',false,txt); }
    else if(t.type==='number'){ t.value=(t.value||'')+String(txt).replace(/[٠-٩]/g,d=>AR_D.indexOf(d)); t.dispatchEvent(new Event('input',{bubbles:true})); }
    else { const s=t.selectionStart??t.value.length, en=t.selectionEnd??s;
      if(t.maxLength>0&&t.value.length-(en-s)+txt.length>t.maxLength) return;
      t.setRangeText(txt,s,en,'end'); t.dispatchEvent(new InputEvent('input',{bubbles:true,data:txt,inputType:'insertText'})); }
    if(this.shift===1){ this.shift=0; this.render(); }
    else if(this.page==='abc'&&this.lang!=='ar'&&/[.!?]\s$/.test(this.textBefore())) { this.shift=1; this.render(); }
  },
  textBefore(){ const t=this.target; if(!t) return ''; if(t.isContentEditable) return ''; try{ return t.value.slice(0,t.selectionStart||0); }catch(e){ return t.value||''; } },
  extKey(k){ const sk=this.sink(); if(!sk) return; if(this.mods.size){ sk.combo([...this.mods],k,true); this.mods.clear(); this.render(); } else sk.key(k); if(k==='BackSpace') this.extBuf=(this.extBuf||'').slice(0,-1); },
  back(){
    if(this.sink()) return this.extKey('BackSpace');
    const t=this.live(); if(!t) return;
    if(t.isContentEditable){ document.execCommand('delete'); return; }
    if(t.type==='number'){ t.value=String(t.value).slice(0,-1); t.dispatchEvent(new Event('input',{bubbles:true})); return; }
    let s=t.selectionStart, en=t.selectionEnd;
    if(s===en){ if(!s) return; const before=t.value.slice(0,s); const ch=Array.from(before).pop(); s-=ch.length; }
    t.setRangeText('',s,en,'end'); t.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
  },
  enter(){
    if(this.sink()){ this.extBuf=''; return this.extKey('Return'); }
    const t=this.live(); if(!t) return;
    const ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true});
    const ok=t.dispatchEvent(ev);
    if(!ok) return;
    if(t.tagName==='TEXTAREA') return this.type('\n');
    if(t.isContentEditable){ document.execCommand('insertLineBreak'); return; }
    if(t.form){ t.form.requestSubmit?.(); return; }
    this.hide(); t.blur();
  },
  moveCaret(n){
    if(this.sink()){ for(let i=0;i<Math.abs(n);i++) this.sink().key(n>0?'Right':'Left'); return; }
    const t=this.live(); if(!t) return;
    const rtl=getComputedStyle(t).direction==='rtl'||/[\u0600-\u06FF]/.test(t.value||t.textContent||'');
    const step=rtl?-n:n;
    if(t.isContentEditable){ const sel=getSelection(); for(let i=0;i<Math.abs(step);i++) sel.modify('move',step>0?'forward':'backward','character'); return; }
    if(t.type==='number') return;
    const p=clamp((t.selectionStart||0)+step,0,t.value.length); t.setSelectionRange(p,p);
  },
  /* ---------- popups ---------- */
  popShow(b,txt){ if(S.oskPreview===false) return; const p=this.el.querySelector('.osk-pop'), r=b.getBoundingClientRect(), o=this.el.getBoundingClientRect();
    p.textContent=txt; p.hidden=false; p.style.left=(r.left-o.left+r.width/2)+'px'; p.style.top=(r.top-o.top)+'px'; },
  popHide(){ const p=this.el.querySelector('.osk-pop'); if(p) p.hidden=true; },
  openAlt(b,alts){
    const a=this.el.querySelector('.osk-alt'), r=b.getBoundingClientRect(), o=this.el.getBoundingClientRect();
    a.innerHTML=alts.map(x=>`<button class="k" data-okey="${esc(this.shift&&this.lang!=='ar'?x.toUpperCase():x)}">${esc(this.shift&&this.lang!=='ar'?x.toUpperCase():x)}</button>`).join('');
    a.hidden=false; const w=a.offsetWidth;
    a.style.left=clamp(r.left-o.left+r.width/2-w/2,4,o.width-w-4)+'px'; a.style.top=(r.top-o.top-a.offsetHeight-6)+'px';
    // slide finger onto an alternative and release to pick it
    const pick=ev=>{ const el=(this.root||document).elementFromPoint(ev.clientX,ev.clientY); $$('.osk-alt .k',this.el).forEach(k=>k.classList.toggle('hot',k===el)); };
    const rel=ev=>{ removeEventListener('pointermove',pick,true); removeEventListener('pointerup',rel,true); const el=(this.root||document).elementFromPoint(ev.clientX,ev.clientY); if(el&&el.closest('.osk-alt [data-okey]')){ this.type(el.closest('[data-okey]').dataset.okey); this.closeAlt(); } };
    addEventListener('pointermove',pick,true); addEventListener('pointerup',rel,true);
  },
  closeAlt(){ const a=this.el&&this.el.querySelector('.osk-alt'); if(a) a.hidden=true; }
};
ICONS.backspace='<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m12 9 6 6M18 9l-6 6"/>';
ICONS.shiftKey='<path d="M12 3 3 12h5v8h8v-8h5z"/>';
ICONS.enterKey='<path d="M20 5v7a3 3 0 0 1-3 3H5"/><path d="m9 11-4 4 4 4"/>';
ICONS.keyboard='<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>';
ICONS.keyboardOff='<rect x="2" y="6" width="20" height="12" rx="2" opacity=".45"/><path d="M3 3l18 18"/>';
ICONS.terminal='<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>';
