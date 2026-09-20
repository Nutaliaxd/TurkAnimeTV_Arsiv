"use strict";
/* arama sayfası — sonuç sayfaları indekslenmez (noindex,follow) */
function renderAra(q, sayfa){
  const sonuc = q ? searchAnime(q) : [];
  const pages = Math.max(1, Math.ceil(sonuc.length/PAGE));
  if (sayfa > pages) sayfa = pages;
  const dilim = sonuc.slice((sayfa-1)*PAGE, sayfa*PAGE);
  seoSet({
    title: q ? `"${q}" için arama sonuçları — ${SITE_ADI}` : 'Anime ara — ' + SITE_ADI,
    desc: q ? `"${q}" aramasıyla eşleşen animeler.` : 'Arşivdeki animeler arasında arama yap.',
    canonical: q ? araUrl(q) : 'ara.html',
    robots: 'noindex,follow',
    crumbs: [{ad:'Ana sayfa', href:'index.html'}, {ad:'Arama'}]
  });
  appEl().innerHTML = `
    ${crumbHtml([{ad:'Ana sayfa', href:'index.html'}, {ad:'Arama'}])}
    <h1 class="anime-title">${q ? `"${esc(q)}" için sonuçlar` : 'Anime ara'}</h1>
    ${!q ? `<div class="empty"><div class="big"><i class="fa-solid fa-magnifying-glass"></i></div>Yukarıdaki kutuya bir anime adı yaz.</div>` : `
      <div class="count-line"><b>${sonuc.length.toLocaleString('tr-TR')}</b> sonuç</div>
      ${sonuc.length ? `<div class="grid">${dilim.map(card).join('')}</div>
        ${pagerHTML(sayfa, sonuc.length, PAGE, i=> araUrl(q) + (i>1 ? '&s='+i : ''))}`
      : `<div class="empty"><div class="big"><i class="fa-solid fa-magnifying-glass"></i></div>Sonuç bulunamadı.<br>Farklı bir kelime dene (Türkçe karakterler opsiyonel).</div>
         <div class="sh"><h2>Bunlara göz at</h2></div><div class="rail">${topPool().slice(0,10).map(card).join('')}</div>`}
    `}`;
}

(function boot(){
  let q = qp('q').trim();
  let sayfa = Math.max(1, parseInt(qp('s')||'1', 10) || 1);
  const qEl = document.getElementById('q');
  if (qEl) qEl.value = q;
  renderAra(q, sayfa);
  bindHeader(true);
  initAniList();
  if (qEl){
    const calis = debounce(()=>{
      q = qEl.value.trim(); sayfa = 1;
      history.replaceState(null, '', q ? araUrl(q) : 'ara.html');
      renderAra(q, sayfa);
    }, 160);
    qEl.addEventListener('input', calis);
    qEl.addEventListener('keydown', e=>{ if (e.key==='Enter') calis(); });
  }
})();
