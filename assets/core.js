"use strict";
/* ============================================================
   core.js — tüm sayfaların ortak çekirdeği
   (index verisi assets/data.js içinde ayrı dosyadadır)
   ============================================================ */
/* ============ yardımcılar ============ */
const $ = s => document.querySelector(s);
const appEl = () => document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const TR_MAP = {'ı':'i','İ':'i','I':'i','ş':'s','Ş':'s','ğ':'g','Ğ':'g','ü':'u','Ü':'u','ö':'o','Ö':'o','ç':'c','Ç':'c'};
function norm(s){
  let t = '';
  for (const ch of String(s)) t += TR_MAP[ch] || ch;
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
          .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

/* ============ index hazırlığı ============ */
const ANIME = [];
(function buildIndex(){
  for (const row of window.INDEX){
    const slug=row[0], baslik=row[1], eps=row[2], urls=row[3], masks=row[4], top=row[5]||[];
    const n = norm(baslik);
    const nTok = new Set(n.split(' ').concat(norm(slug).split(' ')).filter(Boolean));
    ANIME.push({ slug, baslik, eps, urls, masks, top,
      nTitle: n, nTok, tokArr: [...nTok], hay: n+' '+norm(slug) });
  }
  ANIME.sort((a,b)=> a.nTitle < b.nTitle ? -1 : a.nTitle > b.nTitle ? 1 : 0);
})();

/* ============ durum ============ */
let _oluMem = false;   // localStorage kapalıysa (gizli mod vb.) oturum içinde bellekte tut
const oluGoster = {
  get:()=>{ try{ return localStorage.getItem('tk_olu')==='1'; }catch(e){ return _oluMem; } },
  set:v=>{ _oluMem = !!v; try{ localStorage.setItem('tk_olu', v?'1':'0'); }catch(e){} }
};
const dataCache = new Map();

/* ---- yönetici modu: × ve dışa aktarma sadece yerelde ya da ?admin=1 ile görünür ---- */
const ADMIN = (function(){
  try{
    const p = new URLSearchParams(location.search);
    if (p.get('admin')==='1') localStorage.setItem('tk_admin','1');
    if (p.get('admin')==='0') localStorage.removeItem('tk_admin');
    if (localStorage.getItem('tk_admin')==='1') return true;
  }catch(e){}
  return location.protocol==='file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
})();

/* ---- M2: kaldırılan linkler ----
   GLOBAL: repodaki kaldirilan.js (herkes için gizli, git ile yayınlanır)
   YEREL : bu tarayıcıda × ile kaldırılanlar (localStorage) — dışa aktarıp repoya eklenir */
const KLD_KEY = 'tk_kaldirilan';
const GLOBAL_KLD = new Set(Array.isArray(window.KALDIRILAN) ? window.KALDIRILAN : []);
let _yerelKld = null, _tumKld = null;
function yerelKaldirilanSet(){
  if (_yerelKld) return _yerelKld;
  try{ const a = JSON.parse(localStorage.getItem(KLD_KEY)||'[]'); _yerelKld = new Set(Array.isArray(a)?a:[]); }
  catch(e){ _yerelKld = new Set(); }
  return _yerelKld;
}
function kaldirilanSet(){
  if (!_tumKld) _tumKld = new Set([...GLOBAL_KLD, ...yerelKaldirilanSet()]);
  return _tumKld;
}
let _geriAl = [];   // bu oturumda × ile kaldırılanlar (son kaldırılan sonda)
function _yerelKaydet(){ try{ localStorage.setItem(KLD_KEY, JSON.stringify([...yerelKaldirilanSet()])); }catch(e){} _tumKld = null; }
function linkKaldir(u){ yerelKaldirilanSet().add(u); _geriAl.push(u); _yerelKaydet(); }
function linkGeriAl(){ const u = _geriAl.pop(); if (u==null) return null; yerelKaldirilanSet().delete(u); _yerelKaydet(); return u; }
function bekleyenKaldirilan(){ return [...yerelKaldirilanSet()].filter(u=>!GLOBAL_KLD.has(u)); }
function kaldirilanSay(){ return bekleyenKaldirilan().length; }
function kaldirilanFiltre(links){ const k = kaldirilanSet(); return links.filter(l=>!k.has(l.url)); }

/* ---- M7b: yardımcı sunucu var mı? (ping) ---- */
let SERVER_OK = false;
function pingServer(){
  if (location.protocol === 'file:' || /\.github\.io$/i.test(location.hostname)) return;  // API yok, sorgulamadan atla
  try{
    fetch('api/ping').then(r=> r.ok ? r.json() : null).then(j=>{
      if (j && j.ok && !SERVER_OK){
        SERVER_OK = true;
        if (typeof window.onSunucuHazir === 'function') window.onSunucuHazir();
      }
    }).catch(()=>{});
  }catch(e){}
}

const DURUM_LABEL = {calisiyor:'çalışıyor', olu:'ölü', supheli:'şüpheli'};
function badge(d){
  const k = d || 'n';
  const t = d ? (DURUM_LABEL[d]||d) : 'bilinmiyor';
  return `<span class="badge ${k}">${t}</span>`;
}
function dot(d){
  const k = d==='calisiyor'?'ok':d==='olu'?'bad':d==='supheli'?'warn':'n';
  return `<span class="dot ${k}" title="${d?esc(DURUM_LABEL[d]||d):'durum yok'}"></span>`;
}

/* ============ iframe dönüşümü ============ */
function cleanRawUrl(u){
  let s = String(u||'').trim();
  const h = s.indexOf('href.li/?'); if (h!==-1) s = s.slice(h+9);
  if (s.startsWith('https:https://')) s = s.slice(6);
  return s;
}
const BAD_SCHEME = /^\s*(javascript|data|vbscript|file):/i;
function embedUrl(raw, tip){
  if (tip!=='url') return null;               // mask/yol: gömülemez
  const s = cleanRawUrl(raw);
  if (!/^https?:\/\//i.test(s)) return BAD_SCHEME.test(s) ? null : s;     // garip form: ham döndür (tehlikeli şema hariç)
  try{
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./,'');
    const p = u.pathname;
    if (host==='drive.google.com'){
      const m = p.match(/^\/file\/d\/([^/]+)/);
      if (m && !p.endsWith('/preview')) return 'https://drive.google.com/file/d/'+m[1]+'/preview';
      return s;
    }
    if (host==='dailymotion.com' || host==='dai.ly'){
      const m = p.match(/^\/(?:video|embed\/video)\/([a-z0-9]+)/i);
      if (m) return 'https://www.dailymotion.com/embed/video/'+m[1];
      return s;
    }
    if (host==='vk.com'){
      if (p.startsWith('/video_ext.php')) return s;
      const m = p.match(/^\/video(-?\d+)_(\d+)/);
      if (m) return 'https://vk.com/video_ext.php?oid='+m[1]+'&id='+m[2];
      return s;
    }
    if (host==='sendvid.com'){
      const m = p.match(/^\/(?:v|embed)\/([a-z0-9]+)/i) || p.match(/^\/([a-z0-9]+)$/i);
      if (m) return 'https://sendvid.com/embed/'+m[1];
      return s;
    }
    if (host==='ok.ru' || host==='odnoklassniki.ru'){
      const m = p.match(/^\/video(?:embed)?\/(\d+)/);
      if (m) return 'https://odnoklassniki.ru/videoembed/'+m[1];
      return s;
    }
    /* SIBNET (shell.php), MP4UPLOAD (embed-*.html), VOE (/e/), DOOD (/e/),
       MAIL.RU (video/embed), UQLOAD/HDVID/VUDEO/MVIDOO/VTUBE/STREAMSB (embed-*.html),
       FILEMOON/EMBEDO/HIGHLOAD/TUBELOAD (/e/), EMBEDGRAM (/v/), SAVEFILEWAY, CLONE... */
    return s;
  }catch(e){ return s; }
}
function srcLink(raw, tip){
  const s = cleanRawUrl(raw||'');
  if (tip==='url' && /^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return 'https://www.turkanime.net'+s;
  return (s && !BAD_SCHEME.test(s)) ? s : null;
}

/* ============ M1: veri yükleme (JSONP — file:// dahil her yerde çalışır) ============ */
function loadAnime(slug){
  if (dataCache.has(slug)) return dataCache.get(slug);
  const pr = new Promise((resolve,reject)=>{
    if (window.__TKA__ && Object.prototype.hasOwnProperty.call(window.__TKA__, slug)){
      resolve(window.__TKA__[slug]); return;
    }
    const s = document.createElement('script');
    const temizle = ()=>{ clearTimeout(to); if (s.parentNode) s.parentNode.removeChild(s); };
    const to = setTimeout(()=>{ temizle(); reject(new Error('zaman aşımı (b/'+slug+'.js)')); }, 30000);
    s.onerror = ()=>{ temizle(); reject(new Error('b/'+encodeURIComponent(slug)+'.js yüklenemedi')); };
    s.onload = ()=>{
      if (window.__TKA__ && Object.prototype.hasOwnProperty.call(window.__TKA__, slug)){
        resolve(window.__TKA__[slug]);
        try{ delete window.__TKA__[slug]; }catch(e){}
      } else reject(new Error('b/'+encodeURIComponent(slug)+'.js boş/hatalı'));
    };
    s.src = 'b/'+encodeURIComponent(slug)+'.js';
    document.head.appendChild(s);
  });
  dataCache.set(slug, pr);
  pr.catch(()=> dataCache.delete(slug));
  return pr;
}

/* ============ M6: indirme betiği üretimi ============ */
function fsSafe(s){ return String(s||'').replace(/[\\/:*?"<>|`$!\x00-\x1f]/g,'_'); }
/* URL'yi çift tırnak içinde güvenle kullanmak için: " ` $ \ ! boşluk ve kontrol karakterlerini %XX yap */
function safeArg(u){ return String(u||'').replace(/[\x00-\x20"`$\\!]/g, c=>'%'+c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')); }
function bolumBase(ep){ return ep.no!=null ? String(ep.no)+'. Bolum' : fsSafe(ep.slug); }
function firstUrlLink(ep){
  const ls = kaldirilanFiltre(ep.links).filter(l=> l.tip==='url');
  return ls.find(l=> l.durum!=='olu') || ls[0] || null;   // canlı tercih edilir
}
function ytCmd(url, outName){ return 'yt-dlp "'+safeArg(url)+'" -o "'+fsSafe(outName)+'"'; }
function buildIndirScripts(slug, data, tumu){
  const rows = data.map(ep=>({ep, links: kaldirilanFiltre(ep.links).filter(l=>l.tip==='url')}))
                   .filter(x=> x.links.length);
  const b = ['@echo off','chcp 65001 >nul','rem TurkAnime Arsiv - '+slug,
             'rem yt-dlp gerekli: https://github.com/yt-dlp/yt-dlp',
             'rem kaldirilan linkler bu betikte yok','cd /d "%~dp0"',''];
  const s = ['#!/usr/bin/env bash','# TurkAnime Arsiv - '+slug,
             '# yt-dlp gerekli: https://github.com/yt-dlp/yt-dlp','# set -e',''];
  for (const {ep, links} of rows){
    const base = bolumBase(ep);
    const kullan = tumu ? links : [firstUrlLink(ep)];
    kullan.forEach((l,i)=>{
      let nm = base;
      if (tumu && i>0) nm = base+' ('+fsSafe(l.player)+')';
      const u = safeArg(l.url);
      const urlB = u.replace(/%/g,'%%');   // bat %% kuralı
      b.push('yt-dlp "'+urlB+'" -o "'+nm+'.mp4"');
      s.push('yt-dlp "'+u+'" -o "'+nm+'.mp4"');
    });
  }
  b.push('','pause');
  return { bat: b.join('\r\n')+'\r\n', sh: s.join('\n')+'\n' };
}
function indirFile(name, content, mime){
  const blob = new Blob([content], {type: mime||'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

/* ============ M7b: resolve API ============ */
async function apiResolve(url){
  const r = await fetch('api/resolve?url='+encodeURIComponent(url));
  const j = await r.json().catch(()=>({ok:false, hata:'HTTP '+r.status}));
  if (!j.ok) throw new Error(j.hata || ('HTTP '+r.status));
  return j.akismalar || [];
}
function resolveBoxHtml(u, list){
  return `<b style="color:var(--ac2)">akış çözüldü</b>
    <span style="color:var(--tx3);font-size:12px"> — çözülen adresi VLC/mpv gibi bir oyuncuda açabilirsin</span>
    ${list.length? list.map(a=>`
      <div class="rurl"><span class="tag ${a.tip==='m3u8'?'mask':'url'}">${esc(a.tip)}</span>
      <code>${esc(a.url)}</code>
      <button class="copybtn" data-cmd="${esc(a.url)}">kopyala</button></div>`).join('')
    : '<div class="rurl" style="color:var(--tx2)">akış döndürülmedi</div>'}`;
}
function bindResolveBox(box){
  box.querySelectorAll('.copybtn').forEach(x=>{
    x.onclick = ()=> copyText(x.dataset.cmd).then(()=> flashDone(x,'kopyalandı ✓'));
  });
}
async function showResolve(btn, u){
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'çözülüyor…';
  try{
    const list = await apiResolve(u);
    let box = document.getElementById('resolveBox');
    if (!box){
      box = document.createElement('div'); box.id = 'resolveBox'; box.className = 'resolvebox';
      const anchor = $('#optlist') || appEl().querySelector('.player-box') || appEl();
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
    }
    box.innerHTML = resolveBoxHtml(u, list);
    bindResolveBox(box);
  }catch(err){
    btn.title = err.message; flashDone(btn, 'hata: '+err.message, 2400, old);
  }
  btn.disabled = false; btn.textContent = old;
}


function bolumIdFor(ep){ return ep.no!=null ? String(ep.no) : encodeURIComponent(ep.slug); }

/* ============ sayfa adresleri (gerçek URL'ler, hash yok) ============ */
const QS = new URLSearchParams(location.search);
const qp = (k, d) => QS.get(k) || d || '';
const animeUrl   = s => 'anime.html?seri=' + encodeURIComponent(s);
const bolumUrl   = (s, b, pl, i) => 'bolum.html?seri=' + encodeURIComponent(s) + '&bolum=' + encodeURIComponent(b)
                   + (pl ? '&player=' + encodeURIComponent(pl) : '') + (i!=null && pl ? '&kaynak=' + i : '');
const kategoriUrl= (id, s) => 'kategori.html?k=' + encodeURIComponent(id) + (s>1 ? '&s='+s : '');
const harfUrl    = (h, s) => 'animeler.html?harf=' + encodeURIComponent(h) + (s>1 ? '&s='+s : '');
const listeUrl   = s => 'animeler.html' + (s>1 ? '?s='+s : '');
const araUrl     = q => 'ara.html?q=' + encodeURIComponent(q);

/* ============ SEO: başlık, açıklama, canonical, JSON-LD ============ */
const SITE_ADI = 'TürkAnime Arşiv';
function siteKok(){
  const c = document.querySelector('link[rel="canonical"]');
  try { return new URL(c ? c.href : location.href).origin + location.pathname.replace(/[^/]*$/, ''); }
  catch(e){ return location.href.replace(/[^/]*$/, ''); }
}
function canonicalSet(rel){
  let c = document.querySelector('link[rel="canonical"]');
  if (!c){ c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
  c.href = siteKok() + rel;
  const og = document.querySelector('meta[property="og:url"]'); if (og) og.content = c.href;
}
function robotsSet(v){
  let m = document.querySelector('meta[name="robots"]');
  if (!m){ m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
  m.content = v;
}
function seoSet(o){
  if (o.title){
    document.title = o.title;
    const t1 = document.querySelector('meta[property="og:title"]'); if (t1) t1.content = o.title;
    const t2 = document.querySelector('meta[name="twitter:title"]'); if (t2) t2.content = o.title;
  }
  if (o.desc!=null || o.image!=null) metaSet(o.desc, o.image);
  if (o.canonical) canonicalSet(o.canonical);
  if (o.robots) robotsSet(o.robots);
  if (o.ld!==undefined) ldSet(o.ld);
  if (o.crumbs) crumbLd(o.crumbs);
}
function crumbLd(list){
  let s = document.getElementById('ld-crumb');
  if (!s){ s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-crumb'; document.head.appendChild(s); }
  s.textContent = JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement: list.map((x,i)=>({'@type':'ListItem', position:i+1, name:x.ad, item: x.href ? siteKok()+x.href : undefined}))});
}
function crumbHtml(list){
  const par = '<span class="sep"><i class="fa-solid fa-chevron-right"></i></span>';
  return `<div class="crumb">` + list.map((x,i)=>
    (x.href ? `<a href="${x.href}">${esc(x.ad)}</a>` : `<span>${esc(x.ad)}</span>`) + (i<list.length-1 ? par : '')
  ).join('') + `</div>`;
}

/* ============ üst çubuk / alt menü davranışı ============ */
function bindHeader(canliArama){
  const q = document.getElementById('q');
  if (q){
    if (!canliArama){
      q.addEventListener('keydown', e=>{
        if (e.key==='Enter'){ const v = q.value.trim(); if (v) location.href = araUrl(v); }
      });
    }
    document.addEventListener('keydown', e=>{
      if (e.key==='/' && document.activeElement!==q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
        e.preventDefault(); q.focus();
      }
    });
  }
  document.querySelectorAll('.rnd').forEach(b=>{
    b.onclick = ()=>{ const a = ANIME[Math.floor(Math.random()*ANIME.length)]; location.href = animeUrl(a.slug); };
  });
  const bs = document.getElementById('bSearch');
  if (bs) bs.onclick = ()=>{ if (q){ window.scrollTo(0,0); q.focus(); } else location.href = 'ara.html'; };
  if (ADMIN){ const ab = document.getElementById('admBadge'); if (ab) ab.hidden = false; }
}
function showLoading(msg){
  appEl().innerHTML = `<div class="loading"><div class="spinner"></div><div>${esc(msg||'Yükleniyor...')}</div></div>`;
}
/* ============ arama ============ */
const PAGE = 60;
let lastQuery = '', lastPage = 1;

function searchAnime(q){
  const nq = norm(q);
  if (!nq) return [];
  const toks = nq.split(' ').filter(Boolean);
  const scored = [];
  for (const a of ANIME){
    let score = 0, ok = true;
    for (const t of toks){
      if (a.nTok.has(t)) continue;                                  // tam kelime
      let pre = false;
      for (const w of a.tokArr){ if (w.startsWith(t)){ pre = true; break; } }
      if (pre){ score += 1; continue; }                             // kelime başı: "mon" → monogatari
      if (t.length>=3 && a.hay.includes(t)){ score += 2; continue; } // kelime ortası
      ok = false; break;
    }
    if (ok) scored.push({a, score});
  }
  scored.sort((x,y)=>{
    const px = x.a.nTitle.startsWith(nq)?0:1, py = y.a.nTitle.startsWith(nq)?0:1;
    if (px!==py) return px-py;
    if (x.score!==y.score) return x.score-y.score;
    return x.a.nTitle < y.a.nTitle ? -1 : x.a.nTitle > y.a.nTitle ? 1 : 0;
  });
  return scored.map(x=>x.a);
}

function resultRow(a){ return card(a); }

function pagerHTML(page, total, perPage, hrefFn){
  const PP = perPage || PAGE;
  const pages = Math.max(1, Math.ceil(total/PP));
  if (pages<=1) return '';
  const btns = [];
  const win = [];
  for (let i=1;i<=pages;i++){
    if (i<=2 || i>pages-2 || Math.abs(i-page)<=2) win.push(i);
  }
  const el = (i, ic, on, kapali)=>{
    const ic2 = ic!=null ? ic : i;
    if (kapali) return `<button disabled aria-label="sayfa">${ic2}</button>`;
    if (hrefFn) return `<a class="pgbtn ${on?'on':''}" href="${hrefFn(i)}" rel="${i<page?'prev':i>page?'next':''}">${ic2}</a>`;
    return `<button class="${on?'on':''}" data-pg="${i}">${ic2}</button>`;
  };
  let prev=0;
  for (const i of win){
    if (prev && i-prev>1) btns.push('<span class="dots">…</span>');
    btns.push(el(i, null, i===page, false));
    prev=i;
  }
  return `<nav class="pager" aria-label="Sayfalar">
    ${el(Math.max(1,page-1), '<i class="fa-solid fa-chevron-left"></i>', false, page<=1)}
    ${btns.join('')}
    ${el(Math.min(pages,page+1), '<i class="fa-solid fa-chevron-right"></i>', false, page>=pages)}
  </nav>`;
}

/* ============ ana sayfa: günün önerisi, kategoriler, keşfet ============ */
const HUES = [178,205,232,268,318,350,18,42,96,150];
function hueOf(s){ let h=0; for (let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return HUES[h%HUES.length]; }
function initials(t){ const w=String(t||'?').replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/); return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase(); }
function poster(a){
  const h = hueOf(a.slug), t = a.baslik||a.slug;
  return `<div class="poster" data-slug="${esc(a.slug)}" style="--h:${h};--g:${(h+35)%360}"><span class="pl">${esc(initials(t))}</span>${a.eps!=null?`<span class="pn">${a.eps} bölüm</span>`:''}</div>`;
}
function card(a){
  return `<a class="card" href="${animeUrl(a.slug)}">${poster(a)}<span class="ct">${esc(a.baslik||a.slug)}</span><span class="cs">${esc(a.top.slice(0,2).join(', ')||'kaynak yok')}</span></a>`;
}
const KATS = [
  {id:'film', ad:'Filmler', ic:'fa-clapperboard', h:350, f:a=>/\b(movie|film)\b/i.test(a.baslik||'')},
  {id:'ova', ad:'OVA ve özel bölümler', ic:'fa-wand-magic-sparkles', h:268, f:a=>/\b(ova|ona|special)\b/i.test(a.baslik||'')},
  {id:'tek', ad:'Tek bölümlükler', ic:'fa-bolt', h:42, f:a=>a.eps===1},
  {id:'kisa', ad:'Kısa seriler', ic:'fa-hourglass-half', h:178, f:a=>a.eps>=2 && a.eps<=13},
  {id:'sezon', ad:'Sezonluk seriler', ic:'fa-tv', h:205, f:a=>a.eps>=14 && a.eps<=49},
  {id:'uzun', ad:'Uzun soluklular', ic:'fa-infinity', h:18, f:a=>a.eps>=50}
];
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function pickSome(pool, n, seed){ const r=rng(seed), p=pool.slice(); for (let i=p.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [p[i],p[j]]=[p[j],p[i]]; } return p.slice(0,n); }
const dayKey = ()=>{ const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); };
let _good, _top, dailyShift = 0, recShift = 0;
const goodPool = ()=> _good || (_good = ANIME.filter(a=>a.eps>=12 && a.urls>0));
const topPool = ()=> _top || (_top = ANIME.slice().sort((a,b)=>b.urls-a.urls).slice(0,14));
/* ============ AniList: kapak, tür, puan (public GraphQL API, anahtar gerekmez) ============ */
const DEF_TITLE = document.title;
const DEF_DESC = document.querySelector('meta[name="description"]').content;
const OG_IMG = document.querySelector('meta[property="og:image"]').content;
function metaSet(desc, img){
  const set = (sel, v)=>{ const m = document.querySelector(sel); if (m && v) m.setAttribute('content', v); };
  set('meta[name="description"]', desc); set('meta[property="og:description"]', desc); set('meta[name="twitter:description"]', desc);
  set('meta[property="og:image"]', img); set('meta[name="twitter:image"]', img);
}
function ldSet(o){
  let e = document.getElementById('ld-dyn');
  if (!o){ if (e) e.remove(); return; }
  if (!e){ e = document.createElement('script'); e.type = 'application/ld+json'; e.id = 'ld-dyn'; document.head.appendChild(e); }
  e.textContent = JSON.stringify(o);
}
const AL_URL = 'https://graphql.anilist.co', AL_KEY = 'tk_al1';
let AL = {}, alCool = 0, alTok = 0, infoFor = null;
const alPending = new Set(), DETAIL = new Map(), ANIME_BY = new Map();
try{ AL = JSON.parse(localStorage.getItem(AL_KEY)||'{}') || {}; }catch(e){ AL = {}; }
const alSave = debounce(()=>{ try{ localStorage.setItem(AL_KEY, JSON.stringify(AL)); }catch(e){ try{ localStorage.removeItem(AL_KEY); }catch(_){} } }, 800);
function titleOf(slug){
  if (!ANIME_BY.size) ANIME.forEach(a=>ANIME_BY.set(a.slug, a));
  const a = ANIME_BY.get(slug);
  return (a && a.baslik) || String(slug).replace(/-/g,' ');
}
const alPost = (query, variables)=> fetch(AL_URL, {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({query, variables})});
/* kapaklar: 10 başlığı tek istekte (alias) sorgular; sonuç localStorage'da kalır */
async function alBatch(slugs){
  const vars = {}, parts = [];
  slugs.forEach((s,i)=>{ vars['s'+i] = titleOf(s); parts.push(`m${i}: Media(search:$s${i}, type:ANIME, isAdult:false){id coverImage{large color}}`); });
  const r = await alPost(`query(${slugs.map((_,i)=>`$s${i}:String`).join(',')}){${parts.join(' ')}}`, vars);
  if (r.status===429){ alCool = Date.now()+((+r.headers.get('Retry-After')||60)*1000); throw new Error('limit'); }
  const j = await r.json();
  if (!j.data) throw new Error('yanıt yok');
  slugs.forEach((s,i)=>{ const m = j.data['m'+i]; AL[s] = m && m.coverImage ? [m.coverImage.large, m.coverImage.color||'', m.id] : 0; });
  alSave();
}
async function alDetail(slug){
  if (DETAIL.has(slug)) return DETAIL.get(slug);
  const p = (async()=>{
    const r = await alPost('query($s:String){Media(search:$s,type:ANIME,isAdult:false){id genres averageScore seasonYear description(asHtml:false) coverImage{large extraLarge color}}}', {s:titleOf(slug)});
    const j = await r.json(), m = j.data && j.data.Media;
    if (m && m.coverImage && !AL[slug]){ AL[slug] = [m.coverImage.large, m.coverImage.color||'', m.id]; alSave(); }
    return m || null;
  })().catch(()=>null);
  DETAIL.set(slug, p);
  return p;
}
const GTR = {Action:'Aksiyon',Adventure:'Macera',Comedy:'Komedi',Drama:'Drama',Fantasy:'Fantastik',Horror:'Korku','Mahou Shoujo':'Büyülü kız',Mecha:'Mecha',Music:'Müzik',Mystery:'Gizem',Psychological:'Psikolojik',Romance:'Romantik','Sci-Fi':'Bilim kurgu','Slice of Life':'Günlük yaşam',Sports:'Spor',Supernatural:'Doğaüstü',Thriller:'Gerilim',Ecchi:'Ecchi'};
function gchipsHtml(m){
  const c = [];
  if (m.averageScore) c.push(`<span class="pchip gchip"><i class="fa-solid fa-star"></i> ${(m.averageScore/10).toFixed(1)}</span>`);
  if (m.seasonYear) c.push(`<span class="pchip gchip">${m.seasonYear}</span>`);
  (m.genres||[]).slice(0,4).forEach(g=>c.push(`<span class="pchip gchip">${esc(GTR[g]||g)}</span>`));
  return c.length ? `<div class="gchips">${c.join('')}</div>` : '';
}
function synText(m){ const t = String(m.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); return t.length>340 ? t.slice(0,337)+'…' : t; }
function alPaint(){
  document.querySelectorAll('.poster[data-slug]:not([data-i])').forEach(p=>{
    const e = AL[p.dataset.slug]; if (!e) return;
    p.dataset.i = 1;
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    img.onload = ()=> img.classList.add('on'); img.onerror = ()=> img.remove();
    img.src = e[0]; p.appendChild(img);
  });
  const at = document.querySelector('.atxt');
  if (at && infoFor && !at.querySelector('.ainfo') && (window.CUR_SLUG||'')===infoFor.slug){
    const t = synText(infoFor.m);
    at.insertAdjacentHTML('beforeend', `<div class="ainfo">${gchipsHtml(infoFor.m)}${t?`<p class="syn">${esc(t)}<small>Özet: AniList (İngilizce)</small></p>`:''}</div>`);
  }
}
async function alHydrate(){
  alPaint();
  const tok = ++alTok;
  if (Date.now()<alCool) return;
  const need = [...new Set([...document.querySelectorAll('.poster[data-slug]:not([data-i])')].map(p=>p.dataset.slug))]
    .filter(s=> !(s in AL) && !alPending.has(s));
  const BATCH = 24;
  for (let i=0; i<need.length; i+=BATCH){
    if (tok!==alTok) return;
    const grp = need.slice(i, i+BATCH);
    grp.forEach(x=>alPending.add(x));
    try{ await alBatch(grp); }catch(e){ alCool = Math.max(alCool, Date.now()+30000); return; }
    finally{ grp.forEach(x=>alPending.delete(x)); }
    alPaint();
    if (i+BATCH < need.length) await new Promise(r=>setTimeout(r, 350));
  }
}
async function enrichAnime(slug){
  const t = titleOf(slug), a = ANIME_BY.get(slug), n = a ? a.eps : 0;
  document.title = `${t} izle — tüm bölümler | TürkAnime Arşiv`;
  metaSet(`${t} animesini izle: ${n?n+' bölüm, ':''}oynatma linkleri ve indirme komutları TürkAnime Arşiv'de.`);
  const m = await alDetail(slug);
  if (!m || (window.CUR_SLUG||'')!==slug) return;
  infoFor = {slug, m};
  const syn = synText(m), g = (m.genres||[]).map(x=>GTR[x]||x);
  const img = m.coverImage && (m.coverImage.extraLarge || m.coverImage.large);
  metaSet(`${t}${g.length?' ('+g.slice(0,3).join(', ')+')':''} animesini izle: ${n?n+' bölüm, ':''}oynatma linkleri ve indirme komutları.`, img);
  ldSet({'@context':'https://schema.org','@type':'TVSeries', name:t, numberOfEpisodes:n||undefined, genre:m.genres, image:img, description:syn||undefined, inLanguage:'ja'});
  alPaint();
}
function initAniList(){
  new MutationObserver(debounce(alHydrate, 120)).observe(appEl(), {childList:true});
  new MutationObserver(()=>{ document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(m=>m.setAttribute('content', document.title)); })
    .observe(document.querySelector('title'), {childList:true});
}

/* ============ yorumlar (giscus — GitHub Discussions) ============ */
const GISCUS = {
  repo: 'KerimDemirkaynak/Yorumlar',
  repoId: 'R_kgDOPPm0QA',
  category: 'Yorumlar',
  categoryId: 'DIC_kwDOPPm0QM4CtM73',
  theme: 'transparent_dark',
  lang: 'tr'
};
function yorumlarHtml(term){
  return `<section class="yorumlar">
    <h2><i class="fa-regular fa-comments"></i> Yorumlar</h2>
    <div class="gis" id="gis" data-term="${esc(term)}">
      <div class="gis-yukle"><i class="fa-solid fa-spinner fa-spin"></i> Yorumlar hazırlanıyor…</div>
    </div>
  </section>`;
}
let _gisObs = null;
function mountGiscus(){
  const box = document.getElementById('gis');
  if (!box) return;
  if (_gisObs){ _gisObs.disconnect(); _gisObs = null; }
  if (location.protocol === 'file:'){
    box.innerHTML = `<div class="gis-note">Yorumlar yalnızca site bir sunucudan (http/https) açıldığında yüklenir; yerel dosya olarak açıldığında GitHub oturumu çalışmaz.</div>`;
    return;
  }
  const yukle = ()=>{
    const term = box.dataset.term || '';
    box.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', GISCUS.repo);
    s.setAttribute('data-repo-id', GISCUS.repoId);
    s.setAttribute('data-category', GISCUS.category);
    s.setAttribute('data-category-id', GISCUS.categoryId);
    s.setAttribute('data-mapping', 'specific');     // her bölüm/seri kendi başlığını alsın
    s.setAttribute('data-term', term);
    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'top');
    s.setAttribute('data-theme', GISCUS.theme);
    s.setAttribute('data-lang', GISCUS.lang);
    s.setAttribute('data-loading', 'lazy');
    s.setAttribute('crossorigin', 'anonymous');
    s.async = true;
    s.onerror = ()=>{ box.innerHTML = `<div class="gis-note">Yorumlar yüklenemedi (giscus'a erişilemiyor).</div>`; };
    box.appendChild(s);
  };
  if (!('IntersectionObserver' in window)){ yukle(); return; }
  _gisObs = new IntersectionObserver((girisler, obs)=>{
    if (girisler.some(g=>g.isIntersecting)){ obs.disconnect(); _gisObs = null; yukle(); }
  }, {rootMargin: '400px'});
  _gisObs.observe(box);
}

async function copyText(txt){
  try{ await navigator.clipboard.writeText(txt); return true; }
  catch(e){
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(_){}
    ta.remove(); return true;
  }
}
function flashDone(btn, txt, ms, restore){
  const old = restore!=null ? restore : btn.innerHTML;
  const t = String(txt||'').replace(/\s*✓$/,'');
  btn.classList.add('done'); btn.innerHTML = '<i class="fa-solid fa-check"></i>'+(t?' '+esc(t):'');
  setTimeout(()=>{ btn.classList.remove('done'); btn.innerHTML = old; }, ms||1400);
}
function bindCopy(){
  document.querySelectorAll('.copybtn').forEach(b=>{
    if (b.dataset.act) return;   // "çöz" gibi özel butonlar ayrı bağlanır
    b.onclick = ()=> copyText(b.dataset.cmd).then(()=> flashDone(b,'kopyalandı ✓'));
  });
}

