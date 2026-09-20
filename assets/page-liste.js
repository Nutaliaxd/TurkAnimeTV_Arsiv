"use strict";
/* animeler.html (tüm seriler + harf) ve kategori.html (kategoriler) */

function harfBar(aktif){
  const harfler = ['0'].concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  return `<div class="az" style="margin:var(--sp-3) 0">
    <a href="animeler.html" class="${!aktif?'on':''}" style="width:auto;padding:0 12px">Tümü</a>
    ${harfler.map(h=>`<a href="${harfUrl(h)}" style="${h===aktif?'border-color:var(--ac);color:var(--ac)':''}">${h==='0'?'0-9':h}</a>`).join('')}
  </div>`;
}

function listeVerisi(){
  const sayfaAdi = location.pathname.split('/').pop() || 'animeler.html';
  if (sayfaAdi.indexOf('kategori') === 0 || qp('k')){
    const k = KATS.find(x=>x.id===qp('k'));
    if (!k) return {tip:'kategori-index'};
    let arr = ANIME.filter(k.f);
    if (k.id==='uzun') arr.sort((a,b)=>b.eps-a.eps);
    return {tip:'kategori', ad:k.ad, kat:k, arr, temel:kategoriUrl(k.id)};
  }
  const harf = qp('harf');
  if (harf){
    const h = harf.toLowerCase();
    const arr = ANIME.filter(a=>{ const c = a.nTitle[0]||''; return h==='0' ? !/[a-z]/.test(c) : c===h; });
    return {tip:'harf', ad:(harf==='0'?'0-9':harf.toUpperCase())+' ile başlayan animeler', harf:harf.toUpperCase(), arr, temel:harfUrl(harf)};
  }
  return {tip:'tum', ad:'Tüm animeler', arr:ANIME.slice(), temel:'animeler.html'};
}

function kategoriIndex(){
  KATS.forEach(k=>{ if (k.n==null) k.n = ANIME.filter(k.f).length; });
  seoSet({
    title: 'Kategoriler — ' + SITE_ADI,
    desc: 'Filmler, OVA ve özel bölümler, kısa seriler, sezonluk ve uzun soluklu animeler: kategoriye göre gözat.',
    canonical: 'kategori.html',
    robots: 'index,follow',
    crumbs: [{ad:'Ana sayfa', href:'index.html'}, {ad:'Kategoriler', href:'kategori.html'}]
  });
  appEl().innerHTML = `
    ${crumbHtml([{ad:'Ana sayfa', href:'index.html'}, {ad:'Kategoriler'}])}
    <h1 class="anime-title">Kategoriler</h1>
    <div class="count-line">Arşivdeki ${ANIME.length.toLocaleString('tr-TR')} seri, ${KATS.length} kategoriye ayrıldı.</div>
    <div class="kats">${KATS.map(k=>`<a class="kat" style="--h:${k.h}" href="${kategoriUrl(k.id)}"><i class="fa-solid ${k.ic}"></i><b>${k.ad}</b><small>${k.n.toLocaleString('tr-TR')} seri</small></a>`).join('')}</div>
    <div class="sh"><h2>Harfe göre gözat</h2></div>
    ${harfBar('')}`;
}

function renderListe(){
  const v = listeVerisi();
  if (v.tip === 'kategori-index'){ kategoriIndex(); return; }
  let sayfa = Math.max(1, parseInt(qp('s')||'1', 10) || 1);
  const pages = Math.max(1, Math.ceil(v.arr.length/PAGE));
  if (sayfa > pages) sayfa = pages;
  const dilim = v.arr.slice((sayfa-1)*PAGE, sayfa*PAGE);
  const ek = sayfa>1 ? ` — sayfa ${sayfa}` : '';
  const crumbs = v.tip==='kategori'
    ? [{ad:'Ana sayfa', href:'index.html'}, {ad:'Kategoriler', href:'kategori.html'}, {ad:v.ad}]
    : [{ad:'Ana sayfa', href:'index.html'}, {ad:'Animeler', href:'animeler.html'}].concat(v.tip==='harf'?[{ad:v.harf}]:[]);
  const hrefFn = i => v.temel + (v.temel.indexOf('?')>=0 ? (i>1?'&s='+i:'') : (i>1?'?s='+i:''));
  seoSet({
    title: v.ad + ek + ' — ' + SITE_ADI,
    desc: `${v.ad}: ${v.arr.length.toLocaleString('tr-TR')} seri, bölümleri ve oynatma linkleriyle ${SITE_ADI}'nde.`,
    canonical: hrefFn(sayfa),
    robots: 'index,follow',
    crumbs
  });
  appEl().innerHTML = `
    ${crumbHtml(crumbs)}
    <h1 class="anime-title">${esc(v.ad)}${ek}</h1>
    <div class="count-line">${v.arr.length.toLocaleString('tr-TR')} seri</div>
    ${v.tip!=='kategori' ? harfBar(v.harf||'') : ''}
    ${v.arr.length ? `<div class="grid">${dilim.map(card).join('')}</div>${pagerHTML(sayfa, v.arr.length, PAGE, hrefFn)}`
      : `<div class="empty"><div class="big"><i class="fa-solid fa-film"></i></div>Bu listede seri yok.</div>`}
    ${v.tip==='kategori' ? `<div class="sh"><h2>Diğer kategoriler</h2></div>
      <div class="kats">${KATS.filter(k=>k.id!==v.kat.id).map(k=>`<a class="kat" style="--h:${k.h}" href="${kategoriUrl(k.id)}"><i class="fa-solid ${k.ic}"></i><b>${k.ad}</b></a>`).join('')}</div>` : ''}`;
}

(function boot(){
  renderListe();
  bindHeader(false);
  initAniList();
})();
