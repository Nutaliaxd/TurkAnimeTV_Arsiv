"use strict";
/* ana sayfa */
function renderHome(){ appEl().innerHTML = landingHtml(); bindLanding(); }
function landingHtml(){
  const d = pickSome(goodPool(), 1, dayKey()+dailyShift*7919)[0] || ANIME[0];
  const rec = pickSome(goodPool(), 14, dayKey()*3+recShift);
  KATS.forEach(k=>{ if (k.n==null) k.n = ANIME.filter(k.f).length; });
  const eps = ANIME.reduce((n,a)=>n+a.eps,0), links = ANIME.reduce((n,a)=>n+a.urls+a.masks,0);
  const fmt = n=>n.toLocaleString('tr-TR');
  const href = animeUrl(d.slug);
  return `
    <section class="feat" style="--h:${hueOf(d.slug)};--g:${(hueOf(d.slug)+35)%360}">
      <a class="fposter" href="${href}" aria-label="${esc(d.baslik)}">${poster(d,{big:true})}</a>
      <div class="ftext">
        <span class="flabel"><i class="fa-solid fa-sun"></i> Günün önerisi</span>
        <h1>${esc(d.baslik)}</h1>
        <div class="fmeta"><span><i class="fa-solid fa-film"></i>${d.eps} bölüm</span><span><i class="fa-solid fa-link"></i>${fmt(d.urls+d.masks)} kaynak</span></div>
        ${d.top.length?`<div class="players-chips">${d.top.map(p=>`<span class="pchip">${esc(p)}</span>`).join('')}</div>`:''}
        <div class="facts">
          <a class="btn" href="${href}" style="color:#2b0f19"><i class="fa-solid fa-play"></i> İzlemeye başla</a>
          <button class="btn ghost" id="dailyNext"><i class="fa-solid fa-shuffle"></i> Başka öner</button>
        </div>
      </div>
    </section>
    <div class="stats">
      <span class="stat"><i class="fa-solid fa-tv"></i><b>${fmt(ANIME.length)}</b> anime</span>
      <span class="stat"><i class="fa-solid fa-film"></i><b>${fmt(eps)}</b> bölüm</span>
      <span class="stat"><i class="fa-solid fa-link"></i><b>${fmt(links)}</b> kaynak</span>
    </div>
    <div class="sh"><h2>Kategoriler</h2></div>
    <div class="kats">${KATS.map(k=>`<a class="kat" style="--h:${k.h}" href="${kategoriUrl(k.id)}"><i class="fa-solid ${k.ic}"></i><b>${k.ad}</b><small>${fmt(k.n)} seri</small></a>`).join('')}</div>
    <div class="sh"><h2>Öneri serileri</h2><button class="btn ghost sm" id="recNext"><i class="fa-solid fa-rotate"></i> Yenile</button></div>
    <div class="rail">${rec.map(card).join('')}</div>
    <div class="sh"><h2>En çok kaynağı olanlar</h2></div>
    <div class="rail">${topPool().map(card).join('')}</div>
    <div class="sh"><h2>Harfe göre gözat</h2><a class="btn ghost sm" href="animeler.html"><i class="fa-solid fa-list"></i> Tüm animeler</a></div>
    <div class="az"><a href="${harfUrl('0')}">0-9</a>${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=>`<a href="${harfUrl(l)}">${l}</a>`).join('')}</div>`;
}
function bindLanding(){
  const d0 = null;
  const d = $('#dailyNext'); if (d) d.onclick = ()=>{ dailyShift++; renderHome(); };
  const r = $('#recNext'); if (r) r.onclick = ()=>{ recShift++; renderHome(); };
  const hp = document.querySelector('.fposter .poster');
  if (hp) alDetail(hp.dataset.slug).then(m=>{
    const f = document.querySelector('.feat .fmeta');
    if (m && f && document.querySelector('.fposter .poster')===hp && !document.querySelector('.feat .gchips')) f.insertAdjacentHTML('afterend', gchipsHtml(m));
  });
}


(function boot(){
  seoSet({
    title: 'TürkAnime Arşiv — anime izle, bölümler ve oynatma linkleri',
    desc: ANIME.length.toLocaleString('tr-TR') + " animenin bölümlerini ve oynatma linklerini tek yerde bul: günün önerisi, kategoriler ve alfabetik liste.",
    canonical: 'index.html',
    crumbs: [{ad:'Ana sayfa', href:'index.html'}]
  });
  renderHome();
  bindHeader(false);
  initAniList();
  pingServer();
})();
