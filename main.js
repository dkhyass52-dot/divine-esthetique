(function(){
"use strict";
document.documentElement.classList.add("js");
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>n.toLocaleString("fr-FR").replace(/ | /g," ");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const WA="2290159080987";
const SPA=!!window.DE_SPA;

/* ---------- Carte des soins (source unique des prix) ---------- */
const CATS=[
 {t:"Nos soins essentiels",items:[["Soin de visage classique",6000],["Soin de visage anti taches / acné",8000],["Massage relaxant",8000],["Gommage",8000],["Pédicure",6000],["Manucure",2000],["Épilation crème",2500],["Épilation cire",5000]]},
 {t:"Nos soins prestige",items:[["Pédicure prestige",10000],["Massage à la pierre chaude",12000],["Vagacial",10000]]},
 {t:"Nos rituels beauté",items:[["Pédicure + Manucure",7000],["Soin de visage + Gommage + Massage + Pédicure Manucure",26000],["Soin de visage + Pédicure Manucure + Gommage",20000],["Soin de visage + Pédicure Manucure + Massage",20000],["Soin de visage + Pédicure prestige + Gommage + Massage + Vagacial",35000],["Soin de visage + Pédicure prestige + Gommage + Massage",30000]]}
];
const PRICE={};CATS.forEach(c=>c.items.forEach(([n,p])=>PRICE[n]=p));

function current(){
  if(!SPA)return document.body.dataset.page||"accueil";
  const id=location.hash.slice(1);
  return $$("[data-page]").some(p=>p.dataset.page===id)?id:"accueil";
}

/* ---------- Notification ---------- */
let tt;
function toast(m){const el=$("#toast");$("span",el).textContent=m;el.hidden=false;requestAnimationFrame(()=>el.classList.add("show"));clearTimeout(tt);tt=setTimeout(()=>{el.classList.remove("show");setTimeout(()=>el.hidden=true,400)},1900)}

/* ---------- Séance (partagée entre les pages) ---------- */
let picked=[];
try{picked=JSON.parse(localStorage.getItem("de-picked")||"[]").filter(n=>PRICE[n])}catch(e){}
function save(){try{localStorage.setItem("de-picked",JSON.stringify(picked))}catch(e){}}
function toggle(n){
  if(!PRICE[n])return;
  const i=picked.indexOf(n);
  if(i>-1){picked.splice(i,1);toast("Soin retiré de votre séance")}else{picked.push(n);toast("Ajouté à votre séance")}
  save();sync();
}
function sync(){
  const tot=picked.reduce((s,n)=>s+PRICE[n],0),cnt=picked.length;
  const list=$("#selList");
  if(list)list.innerHTML=cnt?picked.map(n=>`<li><span class="n">${esc(n)}</span><span class="p">${fmt(PRICE[n])} F</span><button type="button" data-remove="${esc(n)}" aria-label="Retirer ${esc(n)}">×</button></li>`).join(""):`<li><span class="empty">Aucun soin choisi pour l'instant. Ajoutez-en depuis la liste ou la carte des soins.</span></li>`;
  const t=$("#total");if(t)t.innerHTML=`${fmt(tot)}<small>FCFA</small>`;
  const dock=$("#dock"),onBook=current()==="reserver";
  $("#dockCnt").textContent=cnt;
  $("#dockLbl").textContent=cnt?(cnt>1?"soins choisis":"soin choisi"):"";
  $("#dockTot").textContent=cnt?fmt(tot)+" F":"Réserver un soin";
  dock.classList.toggle("show",cnt>0&&!onBook);
  dock.classList.toggle("empty",!cnt);
  document.body.classList.toggle("has-dock",cnt>0&&!onBook);
  $$("button[data-n]").forEach(b=>{
    const on=picked.includes(b.dataset.n);
    b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);
    const l=$(".lbl",b);if(l)l.textContent=on?(b.dataset.on||"Ajouté"):(b.dataset.off||"Ajouter");
  });
}
document.addEventListener("click",e=>{
  const b=e.target.closest("button[data-n]");if(b){toggle(b.dataset.n);return}
  const r=e.target.closest("button[data-remove]");if(r)toggle(r.dataset.remove);
});

/* ---------- Formulaire de réservation ---------- */
const pad=n=>String(n).padStart(2,"0");
const localISO=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
const sel=$("#f-add");
if(sel){
  CATS.forEach(c=>{const g=document.createElement("optgroup");g.label=c.t;c.items.forEach(([n,p])=>g.appendChild(new Option(`${n} — ${fmt(p)} F`,n)));sel.appendChild(g)});
  sel.addEventListener("change",()=>{if(sel.value&&!picked.includes(sel.value))toggle(sel.value);sel.value=""});
}
const d=$("#f-date");
if(d){const today=new Date(),tm=new Date();tm.setDate(tm.getDate()+1);d.min=localISO(today);if(!d.value)d.value=localISO(tm)}
const form=$("#form");
if(form)form.addEventListener("submit",e=>{
  e.preventDefault();
  const err=$("#err"),nm=$("#f-name"),name=nm.value.trim(),time=$("#f-time").value;
  const fail=(m,el)=>{err.textContent=m;err.hidden=false;if(el){el.setAttribute("aria-invalid","true");el.focus()}};
  $$("[aria-invalid]",form).forEach(x=>x.removeAttribute("aria-invalid"));
  if(!picked.length)return fail("Ajoutez au moins un soin à votre séance.",sel);
  if(!name)return fail("Indiquez votre nom pour que l'institut sache qui réserve.",nm);
  if(!d.value||d.value<d.min)return fail("Choisissez une date à partir d'aujourd'hui.",d);
  if(!time)return fail("Indiquez l'heure souhaitée.",$("#f-time"));
  if(time<"08:00"||time>"19:30")return fail("Nous sommes ouverts de 8h00 à 19h30 : choisissez une heure dans ce créneau.",$("#f-time"));
  err.hidden=true;
  const tot=picked.reduce((s,n)=>s+PRICE[n],0);
  const [y,m,dd]=d.value.split("-").map(Number);
  const dt=new Date(y,m-1,dd).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  const note=$("#f-note").value.trim();
  const msg=`Bonjour Divine Esthétique, je suis ${name}.\nJe souhaite réserver :\n${picked.map(n=>`• ${n} (${fmt(PRICE[n])} F)`).join("\n")}\nTotal estimé : ${fmt(tot)} FCFA\nLe ${dt} à ${time.replace(":","h")}.${note?"\nPrécision : "+note:""}\nMerci !`;
  const a=document.createElement("a");a.href=`https://wa.me/${WA}?text=`+encodeURIComponent(msg);a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();a.remove();
  toast("Ouverture de WhatsApp…");
});

/* ---------- Copier un numéro ---------- */
$$("[data-copy]").forEach(b=>b.addEventListener("click",()=>{
  const done=()=>toast("Copié dans le presse-papiers");
  const fallback=()=>{const s=b.closest("[data-copy-scope]")?.querySelector("strong");if(s){const r=document.createRange();r.selectNodeContents(s);const g=getSelection();g.removeAllRanges();g.addRange(r)}toast("Texte sélectionné")};
  try{navigator.clipboard.writeText(b.dataset.copy).then(done,fallback)}catch(e){fallback()}
}));

/* ---------- FAQ ---------- */
$$(".qa button").forEach(b=>b.addEventListener("click",()=>{
  const q=b.closest(".qa"),open=!q.classList.contains("open");
  $$(".qa",q.parentNode).forEach(x=>{x.classList.remove("open");$("button",x).setAttribute("aria-expanded","false")});
  if(open){q.classList.add("open");b.setAttribute("aria-expanded","true")}
}));

/* ---------- Galerie plein écran ---------- */
const lb=$("#lb");let lbSet=[],lbI=0,lbFrom=null;
function lbShow(){const f=lbSet[lbI],im=$("img",f);const big=$("img",lb);big.src=im.dataset.full||im.currentSrc||im.src;big.alt=im.alt;$(".cap",lb).textContent=im.alt}
function lbOpen(f){lbSet=$$("figure",f.closest(".gal"));lbI=lbSet.indexOf(f);lbFrom=document.activeElement;lbShow();lb.hidden=false;document.body.classList.add("lock");requestAnimationFrame(()=>lb.classList.add("show"));$(".x",lb).focus()}
function lbClose(){lb.classList.remove("show");document.body.classList.remove("lock");setTimeout(()=>lb.hidden=true,300);if(lbFrom)lbFrom.focus()}
$$(".gal figure").forEach(f=>{f.tabIndex=0;f.setAttribute("role","button");f.setAttribute("aria-label","Agrandir la photo : "+$("img",f).alt);
  f.addEventListener("click",()=>lbOpen(f));f.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();lbOpen(f)}})});
lb.addEventListener("click",e=>{if(e.target===lb||e.target.closest(".x"))lbClose()});
$(".prev",lb).addEventListener("click",()=>{lbI=(lbI-1+lbSet.length)%lbSet.length;lbShow()});
$(".next",lb).addEventListener("click",()=>{lbI=(lbI+1)%lbSet.length;lbShow()});
let tx0=null;lb.addEventListener("touchstart",e=>tx0=e.touches[0].clientX,{passive:true});
lb.addEventListener("touchend",e=>{if(tx0==null)return;const dx=e.changedTouches[0].clientX-tx0;if(Math.abs(dx)>50){lbI=(lbI+(dx<0?1:-1)+lbSet.length)%lbSet.length;lbShow()}tx0=null});

/* ---------- Menu mobile ---------- */
const mm=$("#mmenu"),mb=$("#menuBtn");
function menu(open){mm.classList.toggle("open",open);mm.setAttribute("aria-hidden",!open);mb.setAttribute("aria-expanded",open);document.body.classList.toggle("lock",open);if(open)setTimeout(()=>$("#menuClose").focus(),50);else if(mm.contains(document.activeElement))mb.focus()}
mb.addEventListener("click",()=>menu(true));
$("#menuClose").addEventListener("click",()=>menu(false));
$$("a",mm).forEach(a=>a.addEventListener("click",()=>menu(false)));
addEventListener("keydown",e=>{
  if(e.key==="Escape"){if(!lb.hidden)lbClose();if(mm.classList.contains("open"))menu(false)}
  if(!lb.hidden&&(e.key==="ArrowRight"||e.key==="ArrowLeft")){lbI=(lbI+(e.key==="ArrowRight"?1:-1)+lbSet.length)%lbSet.length;lbShow()}
});

/* ---------- Diaporama de la couverture ---------- */
const hero=$(".hero"),slides=$$(".slide");
if(hero&&slides.length>1){
  const DUR=6500;let k=0,timer=null,paused=false;
  const go=n=>{
    k=(n+slides.length)%slides.length;
    slides.forEach((s,i)=>{s.classList.toggle("on",i===k);s.setAttribute("aria-hidden",i!==k)});
    const nx=slides[(k+1)%slides.length].querySelector("img");if(nx&&nx.loading==="lazy")nx.loading="eager";
    schedule();
  };
  const schedule=()=>{clearTimeout(timer);if(!RM&&!paused&&!document.hidden)timer=setTimeout(()=>go(k+1),DUR)};
  const pause=v=>{paused=v;hero.classList.toggle("paused",v);if(v)clearTimeout(timer);else schedule()};
  hero.addEventListener("focusin",()=>pause(true));hero.addEventListener("focusout",()=>pause(false));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(timer);else go(k)});
  let sx=null;hero.addEventListener("touchstart",e=>sx=e.touches[0].clientX,{passive:true});
  hero.addEventListener("touchend",e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)go(k+(dx<0?1:-1));sx=null});
  if(RM)hero.classList.add("paused");
  setTimeout(()=>{$$(".slide img").forEach(i=>{if(i.loading==="lazy")i.loading="eager"})},2500);
  schedule();
}

/* ---------- En-tête au défilement ---------- */
const head=$(".site-head");

/* ---------- Sous-navigation de la carte ---------- */
$$("[data-scroll]").forEach(b=>b.addEventListener("click",()=>{const t=document.getElementById(b.dataset.scroll);if(t)t.scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}));
const subBtns=$$(".subnav button");
if(subBtns.length&&"IntersectionObserver" in window){
  const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){subBtns.forEach(b=>b.classList.toggle("on",b.dataset.scroll===e.target.id));const on=subBtns.find(b=>b.classList.contains("on"));if(on&&on.parentNode.scrollWidth>on.parentNode.clientWidth)on.parentNode.scrollTo({left:on.offsetLeft-20,behavior:RM?"auto":"smooth"})}}),{rootMargin:"-40% 0px -55% 0px"});
  subBtns.forEach(b=>{const t=document.getElementById(b.dataset.scroll);if(t)so.observe(t)});
}

/* ---------- Animations ---------- */
const root=document.documentElement,FINE=matchMedia("(pointer: fine)").matches;
const PT=root.classList.contains("first")?1550:400;
if(root.classList.contains("first"))setTimeout(()=>root.classList.remove("first"),4200);

// Titres : chaque mot monte derrière un cache
function split(el){
  let i=0;
  const walk=n=>[...n.childNodes].forEach(c=>{
    if(c.nodeType===3){
      const f=document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(t=>{
        if(!t)return;
        if(/^\s+$/.test(t)){f.appendChild(document.createTextNode(t));return}
        const w=document.createElement("span"),wi=document.createElement("span");
        w.className="w";wi.className="wi";wi.style.setProperty("--i",i++);wi.textContent=t;w.appendChild(wi);f.appendChild(w);
      });
      c.replaceWith(f);
    }else if(c.nodeType===1&&c.tagName!=="BR")walk(c);
  });
  walk(el);el.classList.add("wsplit");
  if(!el.classList.contains("hx")&&!el.classList.contains("rv"))el.classList.add("rv");
}
if(!RM){
  $$(".t-hero,.t-1,.t-2,.quote blockquote").forEach(split);
  $$(".site-foot .foot-top>*").forEach((el,k)=>el.classList.add("rv","d"+Math.min(k,3)));
}

// Apparitions au défilement, avec un léger décalage entre éléments voisins
const targets=$$(".rv");
// les images (rognées tant qu'elles sont cachées) sont suivies par leur position, pas par IntersectionObserver
let imgs=$$(".rv-img"),imgsOn=false;
function checkImgs(){if(!imgsOn||!imgs.length)return;const vh=innerHeight;let k=0;
  imgs=imgs.filter(el=>{const r=el.getBoundingClientRect();if(!r.height&&!r.width)return true;if(r.top<vh*.9&&r.bottom>0){el.style.transitionDelay=k*110+"ms";const im=$("img",el);if(im)im.style.transitionDelay=k*110+"ms";k++;el.classList.add("in");setTimeout(()=>{el.style.transitionDelay="";if(im)im.style.transitionDelay=""},3200);return false}return true})}
function reveal(){
  imgsOn=true;
  if(!("IntersectionObserver" in window)||RM){targets.forEach(el=>el.classList.add("in"));imgs.forEach(el=>el.classList.add("in"));imgs=[];return}
  checkImgs();
  const io=new IntersectionObserver(es=>{let k=0;es.forEach(e=>{
    if(!e.isIntersecting)return;const el=e.target;
    if(el.classList.contains("wsplit"))el.style.setProperty("--bd",k*90+"ms");
    else if(!/\bd[1-4]\b/.test(el.className)&&k){el.style.transitionDelay=k*90+"ms";setTimeout(()=>el.style.transitionDelay="",2600)}
    k++;el.classList.add("in");io.unobserve(el);
  })},{threshold:.12,rootMargin:"0px 0px -6% 0px"});
  targets.forEach(el=>io.observe(el));
}
setTimeout(reveal,RM?0:Math.max(0,PT-250));

// Prix qui défilent jusqu'à leur valeur
const counters=$$(".price-line b,.rit .price");
if(!RM&&"IntersectionObserver" in window){
  const run=el=>{
    const tn=[...el.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.textContent));if(!tn)return;
    const orig=tn.textContent,end=+orig.replace(/\D/g,""),sep=(orig.match(/\d(\D)\d/)||[," "," "])[1];if(!end)return;
    const f=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,sep),t0=performance.now(),D=1700;
    const step=t=>{const p=Math.min(1,(t-t0)/D);tn.textContent=p<1?f(end*(1-Math.pow(1-p,4))):orig;if(p<1)requestAnimationFrame(step)};
    tn.textContent=f(0);requestAnimationFrame(step);
  };
  const co=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){co.unobserve(e.target);setTimeout(()=>run(e.target),250)}}),{threshold:.6});
  setTimeout(()=>counters.forEach(el=>co.observe(el)),PT);
}

// Parallaxe douce, hero qui s'efface, en-tête qui se retire, filet de progression
const pxEls=RM?[]:$$(".quote>img,.signature .ph img,.page-head .ph img,.stack .a img,.cat .ph img");
pxEls.forEach(i=>i.classList.add("px"));
const heroEl=$(".hero");
let lastY=scrollY,ticking=false,away=false;
function frame(){
  ticking=false;const vh=innerHeight,y=scrollY;
  pxEls.forEach(img=>{const r=img.parentElement.getBoundingClientRect();if(r.bottom<-80||r.top>vh+80||!r.height)return;
    const p=(r.top+r.height/2-vh/2)/(vh/2+r.height/2);img.style.setProperty("--py",(-p*r.height*.06).toFixed(1)+"px")});
  if(heroEl&&!RM&&y<vh*1.3&&heroEl.offsetParent){heroEl.style.setProperty("--hy",(y*.3).toFixed(1)+"px");heroEl.style.setProperty("--hc",(y*.14).toFixed(1)+"px");heroEl.style.setProperty("--ho",Math.max(0,1-y/(vh*.7)).toFixed(3))}
  const max=document.documentElement.scrollHeight-vh;head.style.setProperty("--sp",max>0?Math.min(1,y/max).toFixed(4):0);
  head.classList.toggle("scrolled",y>24);
  if(!RM&&!document.body.classList.contains("lock")){
    if(y>360&&y>lastY+6)away=true;else if(y<lastY-6||y<=360)away=false;
    head.classList.toggle("away",away);document.body.classList.toggle("head-away",away);
  }
  lastY=y;checkImgs();
}
const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(frame)}};
addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);frame();

// Boutons qui suivent légèrement la souris
if(FINE&&!RM)$$(".btn-primary,.btn-light,.btn-outline").forEach(b=>{
  b.classList.add("mag");
  b.addEventListener("mousemove",e=>{const r=b.getBoundingClientRect();b.style.translate=`${(((e.clientX-r.left)/r.width-.5)*10).toFixed(1)}px ${(((e.clientY-r.top)/r.height-.5)*8).toFixed(1)}px`});
  b.addEventListener("mouseleave",()=>b.style.translate="");
});

/* ---------- Navigation ---------- */
function markNav(){const c=current();$$("[data-nav]").forEach(a=>{const on=a.dataset.nav===c;a.classList.toggle("on",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")})}
if(SPA){
  const show=()=>{const c=current();$$("[data-page]").forEach(p=>p.hidden=p.dataset.page!==c);markNav();menu(false);window.scrollTo(0,0);sync();
    const m=$("main");m.style.animation="none";void m.offsetWidth;m.style.animation=""};
  addEventListener("hashchange",()=>{
    root.classList.remove("first");
    if(RM){show();return}
    document.body.classList.add("leaving");
    setTimeout(()=>{show();document.body.classList.remove("leaving")},640);
  });show();
}else{
  markNav();sync();
  // Transition douce entre les pages
  document.addEventListener("click",e=>{
    const a=e.target.closest("a[href]");if(!a||RM||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||a.target==="_blank")return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin||url.pathname===location.pathname||!/\.html$|\/$/.test(url.pathname))return;
    e.preventDefault();root.classList.remove("first");document.body.classList.add("leaving");setTimeout(()=>location.href=url.href,620);
  });
  addEventListener("pageshow",ev=>{if(ev.persisted)document.body.classList.remove("leaving")});
}
})();
