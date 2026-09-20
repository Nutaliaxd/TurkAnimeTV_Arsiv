"use strict";
/* seri (anime) sayfası */
/* ============ anime sayfası ============ */
const EP_PAGE = 100;
let epPage = 1;


function epRow(ep, slug){
  const ids = kaldirilanFiltre(ep.links);   // M2: kaldırılanlar sayılmaz
  const ok = ids.filter(l=>l.durum==='calisiyor').length;
  const bad = ids.filter(l=>l.durum==='olu').length;
  const wr = ids.filter(l=>l.durum==='supheli').length;
  const players = [...new Set(ids.map(l=>l.player))].slice(0,4);
  return `<a class="ep" href="${bolumUrl(slug, bolumIdFor(ep))}">
    <span class="no">${ep.no!=null? '#'+ep.no : '<i class="fa-solid fa-star"></i>'}</span>
    <span class="ea">${esc(ep.ad)}</span>
    <span class="meta">
      <span>${ids.length} link</span>
      ${ok?`<span>${dot('calisiyor')}${ok}</span>`:''}
      ${wr?`<span>${dot('supheli')}${wr}</span>`:''}
      ${bad?`<span>${dot('olu')}${bad}</span>`:''}
      <span class="pchip" style="border:none;padding:0">${esc(players.join(' · '))}</span>
    </span>
  </a>`;
}

function renderAnime(slug, data){
  const meta = ANIME.find(a=>a.slug===slug) || {baslik:slug, urls:0, masks:0, top:[]};
  const pages = Math.max(1, Math.ceil(data.length/EP_PAGE));
  if (epPage>pages) epPage = pages;
  const slice = data.slice((epPage-1)*EP_PAGE, epPage*EP_PAGE);
  const st = {url:0, mask:0, olu:0};
  for (const ep of data) for (const l of kaldirilanFiltre(ep.links)){
    if (l.tip==='url') st.url++; else if (l.tip==='mask') st.mask++;
    if (l.durum==='olu') st.olu++;
  }
  const olu = oluGoster.get();
  appEl().innerHTML = `
    ${crumbHtml([{ad:'Ana sayfa', href:'index.html'}, {ad:'Animeler', href:'animeler.html'}, {ad:meta.baslik}])}
    <div class="ahead"><div class="aposter">${poster({slug, baslik:meta.baslik, eps:data.length})}</div><div class="atxt"><h1 class="anime-title">${esc(meta.baslik)}</h1>
    <div class="stats">
      <span class="stat"><b>${data.length}</b> bölüm</span>
      <span class="stat"><b>${st.url}</b> url linki</span>
      <span class="stat"><b>${st.mask}</b> mask linki</span>
      ${st.olu?`<span class="stat"><b>${st.olu}</b> ölü</span>`:''}
    </div>
    ${meta.top.length?`<div class="players-chips" style="margin-bottom:6px">${meta.top.map(p=>`<span class="pchip">${esc(p)}</span>`).join('')}</div>`:''}
    </div></div>
    <div class="controls">
      <button class="btn" id="indirBtn"><i class="fa-solid fa-download"></i> Animeyi indir</button>
      <label class="tgl"><input type="checkbox" id="tumTgl"> tüm fansub/seçenekler</label>
      <label class="tgl"><input type="checkbox" id="oluTgl" ${olu?'checked':''}> ölüleri göster</label>
      <span style="color:var(--tx3);font-size:12px">bat + sh üretir (yt-dlp)</span>
    </div>
    ${data.length?`
      <div id="eplist">${slice.map(e=>epRow(e, slug)).join('')}</div>
      ${pagerHTML(epPage, data.length, EP_PAGE, i=> animeUrl(slug) + (i>1 ? '&sayfa='+i : ''))}
      ${pages>1?`<div class="jump">Bölüme git: <input id="jumpNo" inputmode="numeric"> <button id="jumpGo">Git</button></div>`:''}
    `:`<div class="empty"><div class="big"><i class="fa-solid fa-film"></i></div>Bu animede bölüm kaydı yok.</div>`}
    ${relatedHtml(slug)}
    ${yorumlarHtml('anime/'+slug)}
  `;
  mountGiscus();
  const tgl = $('#oluTgl');
  if (tgl) tgl.onchange = ()=>{ oluGoster.set(tgl.checked); renderAnime(slug, data); };
  const ib = $('#indirBtn');
  if (ib) ib.onclick = ()=>{
    const tt = $('#tumTgl');
    const tumu = !!(tt && tt.checked);
    const sc = buildIndirScripts(slug, data, tumu);
    indirFile('indir-'+slug+'.bat', sc.bat);
    setTimeout(()=> indirFile('indir-'+slug+'.sh', sc.sh, 'text/x-shellscript;charset=utf-8'), 350);
    flashDone(ib, 'indirildi ✓', 1600, '<i class="fa-solid fa-download"></i> Animeyi indir');
  };
  const jg = $('#jumpGo');
  if (jg) jg.onclick = ()=>{
    const n = parseInt($('#jumpNo').value,10);
    if (isNaN(n)) return;
    let idx = data.findIndex(e=>e.no===n);
    if (idx===-1) idx = data.findIndex(e=>e.slug.indexOf('-'+n+'-bolum')!==-1);
    if (idx===-1){ alert('Bölüm bulunamadı: '+n); return; }
    epPage = Math.floor(idx/EP_PAGE)+1;
    renderAnime(slug, data);
    const el = appEl().querySelectorAll('.ep')[idx-(epPage-1)*EP_PAGE];
    if (el){ el.scrollIntoView({block:'center'}); el.style.borderColor='var(--ac2)'; }
  };
}

/* ============ bağlantılı seriler (OVA / film / diğer sezonlar) ============ */
const REL_DROP = new Set(['season','seasons','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th',
  'final','part','cour','movie','movies','film','the','animation','ova','ona','tv','special','specials',
  'recap','recaps','picture','drama','edition','memorial','hen','gaiden','omake','shorts','short','mini','ii','iii','iv']);

function relKey(slug){
  const t = String(slug||'').split('-');
  while (t.length>1 && (REL_DROP.has(t[t.length-1]) || /^\d+$/.test(t[t.length-1]))) t.pop();
  return t.join('-');
}
function relTag(a){
  const s = (String(a.slug)+' '+String(a.baslik||'')).toLowerCase();
  if (/final[- ]season|saishuushou|saishuu-shou/.test(s)) return 'Final';
  let m = s.match(/(\d+)(?:st|nd|rd|th)[- ]season/) || s.match(/season[- ](\d+)/) || s.match(/[- ](\d+)(?:st|nd|rd|th)[- ]/);
  if (m) return m[1]+'. Sezon';
  if (/\b(movie|film)\b/.test(s)) return 'Film';
  if (/\bova\b/.test(s)) return 'OVA';
  if (/\bona\b/.test(s)) return 'ONA';
  if (/special/.test(s)) return 'Özel';
  if (/recap|soush?uuhen/.test(s)) return 'Özet';
  if (/\bpart[- ](\d+)\b/.test(s)) return 'Part '+RegExp.$1;
  return null;
}
/* "86" → "86 2nd Season" gibi doğrudan devam eki taşıyan slug'lar */
const REL_SEQ = /^(?:\d+|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|season|seasons|final|part|cour|movie|movies|film|ova|ona|special|specials|recap|recaps|tv|the|gaiden|hen|ii|iii|iv|v)$/;
function relSeq(uzun, kisa){
  if (!uzun.startsWith(kisa+'-')) return false;
  return REL_SEQ.test(uzun.slice(kisa.length+1).split('-')[0]);
}
function relatedOf(slug){
  const key = relKey(slug);
  if (!key || key.length < 2) return [];
  const genis = key.indexOf('-')!==-1 || key.length >= 6;   // tek ve kısa kök için sadece birebir eşleşme
  const out = [];
  for (const a of ANIME){
    if (a.slug === slug) continue;
    const k2 = relKey(a.slug);
    const ayni = k2===key
      || (genis && a.slug.startsWith(key+'-'))
      || (k2.length>=6 && k2.indexOf('-')!==-1 && slug.startsWith(k2+'-'))
      || relSeq(a.slug, slug) || relSeq(slug, a.slug);
    if (ayni) out.push(a);
  }
  out.sort((a,b)=> String(a.slug).localeCompare(String(b.slug),'tr'));
  return out.slice(0, 18);
}
function relCard(a){
  const tag = relTag(a);
  return `<a class="card rel-card" href="${animeUrl(a.slug)}">
    ${tag?`<span class="rel-tag">${esc(tag)}</span>`:''}
    ${poster(a)}<span class="ct">${esc(a.baslik||a.slug)}</span>
    <span class="cs">${esc(a.eps?a.eps+' bölüm':'bölüm yok')}</span></a>`;
}
function relatedHtml(slug){
  const rel = relatedOf(slug);
  if (!rel.length) return '';
  return `<div class="sh"><h2>Bağlantılı seriler</h2><span style="color:var(--tx3);font-size:12.5px">${rel.length} seri</span></div>
    <div class="rail">${rel.map(relCard).join('')}</div>`;
}



/* ============ sayfa açılışı ============ */
(function boot(){
  const slug = qp('seri') || (location.pathname.match(/\/anime\/([^/]+)/)||[])[1] || '';
  window.CUR_SLUG = slug;
  if (!slug){ location.replace('animeler.html'); return; }
  const meta = ANIME.find(a=>a.slug===slug);
  const ad = meta ? meta.baslik : slug;
  epPage = Math.max(1, parseInt(qp('sayfa')||'1', 10) || 1);

  seoSet({
    title: ad + ' izle — tüm bölümler | ' + SITE_ADI,
    desc: `${ad} animesinin ${meta&&meta.eps?meta.eps+' bölümü, ':''}oynatma linkleri ve indirme komutları ${SITE_ADI}'nde.`,
    canonical: animeUrl(slug) + (epPage>1 ? '&sayfa='+epPage : ''),
    robots: 'index,follow',
    crumbs: [{ad:'Ana sayfa', href:'index.html'}, {ad:'Animeler', href:'animeler.html'}, {ad:ad, href:animeUrl(slug)}]
  });

  bindHeader(false);
  initAniList();
  showLoading('Bölümler yükleniyor...');
  loadAnime(slug).then(data=>{
    renderAnime(slug, data);
    enrichAnime(slug);
  }).catch(err=>{
    robotsSet('noindex,follow');
    appEl().innerHTML = `${crumbHtml([{ad:'Ana sayfa', href:'index.html'}, {ad:'Animeler', href:'animeler.html'}, {ad:ad}])}
      <div class="errbox"><b>${esc(ad)}</b> verisi yüklenemedi: ${esc(err.message)}<br>b/${esc(slug)}.js dosyası siteyle aynı klasörde olmalı.</div>`;
  });
  pingServer();
})();
