"use strict";
/* bölüm (izleme) sayfası */
/* ============ bölüm seçenekleri ============ */
let optSelPlayers = new Set();
let optSelFansubs = new Set();
let optKey = '';

function tipClass(t){ return t==='url'?'url':t==='mask'?'mask':'diger'; }

function findEp(data, bolumId){
  if (/^\d+$/.test(bolumId)){
    const e = data.find(x=>String(x.no)===bolumId);
    if (e) return e;
  }
  let bs = null;
  try { bs = decodeURIComponent(bolumId); } catch(e){ bs = bolumId; }
  return data.find(x=>x.slug===bs || encodeURIComponent(x.slug)===bolumId);
}

function optionsFor(ep){
  return ep.links
    .map((l,i)=>({l,i}))
    .sort((a,b)=>{
      const au=a.l.tip==='url'?0:1, bu=b.l.tip==='url'?0:1;
      if (au!==bu) return au-bu;
      const pc = String(a.l.player).localeCompare(String(b.l.player),'tr');
      if (pc!==0) return pc;
      return String(a.l.fansub).localeCompare(String(b.l.fansub),'tr');
    });
}

function chipRowHtml(lbl, counts, sel, dim){
  const items = [...counts.entries()]
    .sort((a,b)=> b[1]-a[1] || String(a[0]).localeCompare(String(b[0]),'tr'));
  if (!items.length) return '';
  return `<div class="chiprow"><span class="lbl">${lbl}</span>` +
    items.map(([n,c])=>`<button class="fchip ${sel.has(n)?'on':''}" data-dim="${dim}" data-val="${esc(n)}">${esc(n)} <b>${c}</b></button>`).join('') +
    (sel.size?`<button class="fchip temizle" data-temizle="${dim}"><i class="fa-solid fa-xmark"></i> temizle</button>`:'') +
    `</div>`;
}

function optRowHtml(x, num){
  const u = String(x.l.url||'');
  const isUrl = x.l.tip==='url' && /^https?:\/\//i.test(u);
  const mp4cmd = isUrl ? ytCmd(u, num+'. Bolum.mp4') : '';
  return `<div class="opt" data-pl="${encodeURIComponent(x.l.player)}" data-i="${x.i}">
    <span class="pname">${esc(x.l.player)}</span>
    <span class="fansub">${esc(x.l.fansub)}</span>
    <span class="tag ${tipClass(x.l.tip)}">${esc(x.l.tip)}</span>
    ${badge(x.l.durum)}
    <span class="optacts">
      ${isUrl?`<button class="mini" data-act="dl-mp4" data-url="${esc(u)}" title="${esc(mp4cmd)}">yt-dlp</button>
      <button class="mini" data-act="dl-g" data-url="${esc(u)}" title="m3u8/akış: yt-dlp -g (doğrudan akış linkini verir)">m3u8</button>
      ${SERVER_OK?`<button class="mini" data-act="resolve" data-url="${esc(u)}" title="yardımcı sunucu ile akışı çöz">çöz</button>`:''}`:''}
      ${ADMIN?`<button class="mini x" data-act="kaldir" data-url="${esc(u)}" title="linki kaldır (yerel; dışa aktarıp repoya ekle)"><i class="fa-solid fa-xmark"></i></button>`:''}
    </span>
  </div>`;
}

/* varsayılan oynatıcı sırası: SIBNET > MAIL.RU > diğerleri */
function playerRank(name){
  const n = String(name||'').toUpperCase();
  if (n.indexOf('SIBNET')!==-1) return 0;
  if (n.indexOf('MAIL')!==-1) return 1;       // MAIL / MAIL.RU / MAILRU
  return 2;
}

function pickBest(items){
  if (!items || !items.length) return null;
  const score = x=> (x.l.tip==='url'?0:100) + 10*(x.l.durum==='calisiyor'?0:x.l.durum==='supheli'?1:x.l.durum==='olu'?3:2) + playerRank(x.l.player);
  let best = items[0];
  for (const x of items) if (score(x) < score(best)) best = x;
  return best;
}

/* sağdaki bölüm listesi: seçili bölüme kaydır + filtre kutusu */
function bindEpSide(){
  const body = $('#elsBody');
  if (!body) return;
  const aktif = body.querySelector('.els-item.on');
  if (aktif) body.scrollTop = Math.max(0, aktif.offsetTop - body.clientHeight/2 + aktif.clientHeight/2);
  const f = $('#epFilter');
  if (!f) return;
  f.oninput = ()=>{
    const q = f.value.trim().toLowerCase();
    let gorunen = 0;
    body.querySelectorAll('.els-item').forEach(a=>{
      const ok = !q || a.dataset.t.indexOf(q)!==-1;
      a.hidden = !ok; if (ok) gorunen++;
    });
    const bos = $('#elsEmpty'); if (bos) bos.hidden = gorunen>0;
  };
}

function renderEpisode(slug, data, bolumId, playerName, idxStr){
  const ep = findEp(data, bolumId);
  if (!ep){ appEl().innerHTML = `<div class="errbox">Bölüm bulunamadı: ${esc(bolumId)}</div>`; return; }
  const okey = slug+'|'+bolumId;
  if (optKey !== okey){ optKey = okey; optSelPlayers = new Set(); optSelFansubs = new Set(); }
  const meta = ANIME.find(a=>a.slug===slug) || {baslik:slug};
  const num = ep.no!=null?String(ep.no):ep.slug;
  const olu = oluGoster.get();
  const gorsel = optionsFor(ep).filter(x=> !kaldirilanSet().has(x.l.url));   // M2
  const canli = gorsel.filter(x=> olu || x.l.durum!=='olu');
  const deadCount = gorsel.length - canli.length;
  const cmd = `turkanime_ara.py ${slug} --bolum ${num}`;
  const ilkUrl = firstUrlLink(ep);
  const crumb = `<div class="crumb">
      <a href="index.html">Ana sayfa</a><span class="sep"><i class="fa-solid fa-chevron-right"></i></span>
      <a href="${animeUrl(slug)}">${esc(meta.baslik)}</a><span class="sep"><i class="fa-solid fa-chevron-right"></i></span>
      <span>${esc(ep.ad)}</span>
    </div>`;
  document.title = `${meta.baslik} — ${ep.ad} | TürkAnime Arşiv`;
  /* ---- önceki / sonraki bölüm + sağdaki bölüm listesi ---- */
  const epHref = e => bolumUrl(slug, bolumIdFor(e));
  const curIdxEp = data.indexOf(ep);
  const prevEp = curIdxEp>0 ? data[curIdxEp-1] : null;
  const nextEp = (curIdxEp>=0 && curIdxEp<data.length-1) ? data[curIdxEp+1] : null;
  const epNav = `<div class="epnav">
    ${prevEp? `<a class="btn ghost" href="${epHref(prevEp)}" title="${esc(prevEp.ad)}"><i class="fa-solid fa-arrow-left"></i> Önceki Bölüm</a>`
            : `<span class="btn ghost off"><i class="fa-solid fa-arrow-left"></i> Önceki Bölüm</span>`}
    <span class="spacer"></span>
    <span class="cnt">${curIdxEp>=0?curIdxEp+1:'?'} / ${data.length}</span>
    <span class="spacer"></span>
    ${nextEp? `<a class="btn" href="${epHref(nextEp)}" title="${esc(nextEp.ad)}">Sonraki Bölüm <i class="fa-solid fa-arrow-right"></i></a>`
            : `<span class="btn off">Sonraki Bölüm <i class="fa-solid fa-arrow-right"></i></span>`}
  </div>`;

  const sideList = `<aside class="eplist-side">
    <div class="els-head"><i class="fa-solid fa-list-ul"></i> Bölüm Listesi <b>${data.length}</b></div>
    <div class="els-search"><i class="fa-solid fa-magnifying-glass"></i><input id="epFilter" type="search" placeholder="Filtrele..." autocomplete="off" spellcheck="false"></div>
    <div class="els-body" id="elsBody">
      ${data.map(e=>{
        const on = e===ep;
        const no = e.no!=null ? String(e.no) : '★';
        return `<a class="els-item${on?' on':''}" href="${epHref(e)}" data-t="${esc((no+' '+(e.ad||'')).toLowerCase())}">
          <span class="n">${esc(no)}</span><span class="t">${esc(e.ad||e.slug)}</span>
        </a>`;
      }).join('')}
      <div class="els-empty" id="elsEmpty" hidden>Eşleşen bölüm yok.</div>
    </div>
  </aside>`;

  if (!canli.length){
    appEl().innerHTML = `${crumb}
      <h1 class="anime-title" style="font-size:20px">${esc(ep.ad)}</h1>
      <div class="watch">
        <div class="watch-top">
          ${epNav}
          <div class="controls">
            <label class="tgl"><input type="checkbox" id="oluTgl" ${olu?'checked':''}> ölüleri göster</label>
          </div>
          <div class="empty"><div class="big"><i class="fa-solid fa-ban"></i></div>Görünür seçenek yok.${!olu?' Ölüleri açmayı dene.':''}</div>
        </div>
        ${sideList}
        <div class="watch-bot"></div>
      </div>`;
    const tgl0 = $('#oluTgl');
    if (tgl0) tgl0.onchange = ()=>{ oluGoster.set(tgl0.checked); renderEpisode(slug, data, bolumId, playerName, idxStr); };
    bindEpSide();
    return;
  }

  /* ---- seçim: URL'de player/idx varsa onu kullan, yoksa en iyi seçeneği otomatik seç ---- */
  let pName = null;
  if (playerName){ try{ pName = decodeURIComponent(playerName); } catch(e){ pName = playerName; } }
  let cur = null;
  if (pName){
    const cands = canli.filter(x=> x.l.player===pName);
    const idxRaw = parseInt(idxStr||'',10);
    cur = (!isNaN(idxRaw) && cands.find(c=>c.i===idxRaw)) || pickBest(cands);
  }
  if (!cur) cur = pickBest(canli);
  const curPName = cur.l.player, curIdx = cur.i;
  const hrefFor = (pl,i)=> bolumUrl(slug, bolumId, pl, i);


  /* ---- çevirmen (fansub) grupları: üstte gösterilir ---- */
  const fansubMap = new Map();
  for (const x of canli){ if (!fansubMap.has(x.l.fansub)) fansubMap.set(x.l.fansub, []); fansubMap.get(x.l.fansub).push(x); }
  const fansubList = [...fansubMap.entries()].sort((a,b)=> b[1].length-a[1].length || String(a[0]).localeCompare(String(b[0]),'tr'));
  const fansubRow = `<div class="chiprow">
    <span class="lbl">Çevirmen</span>
    ${fansubList.map(([fs,items])=>{
      const on = fs===cur.l.fansub;
      const tgt = on ? cur : pickBest(items);
      return `<a class="fchip ${on?'on':''}" href="${hrefFor(tgt.l.player, tgt.i)}" data-pl="${encodeURIComponent(tgt.l.player)}" data-i="${tgt.i}">${esc(fs)} <b>${items.length}</b></a>`;
    }).join('')}
  </div>`;

  /* ---- aynı çevirmenin alternatif kaynakları (host/player): altta gösterilir ---- */
  const hostAlts = (fansubMap.get(cur.l.fansub)||[]).slice().sort((a,b)=>{
    const as=(a.l.tip==='url'?0:1), bs=(b.l.tip==='url'?0:1);
    if (as!==bs) return as-bs;
    return String(a.l.player).localeCompare(String(b.l.player),'tr');
  });
  const hostRow = hostAlts.length>1 ? `<div class="chiprow">
    <span class="lbl">Kaynak</span>
    ${hostAlts.map(x=>`<a class="fchip ${x.i===cur.i?'on':''}" href="${hrefFor(x.l.player,x.i)}" data-pl="${encodeURIComponent(x.l.player)}" data-i="${x.i}">${esc(x.l.player)} ${dot(x.l.durum)}</a>`).join('')}
  </div>` : '';

  /* ---- oynatıcı gömme (eski renderPlayer mantığı) ---- */
  const emb = embedUrl(cur.l.url, cur.l.tip);
  const src = srcLink(cur.l.url, cur.l.tip);
  const rawUrl = String(cur.l.url||'');
  const isHttpUrl = cur.l.tip==='url' && /^https?:\/\//i.test(rawUrl);
  const iframeHtml = emb
    ? `<div class="player-box"><iframe id="frm" src="${esc(emb)}" allowfullscreen referrerpolicy="no-referrer" allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe></div>`
    : `<div class="note">Bu seçenek <b>${esc(cur.l.tip)}</b> tipinde; doğrudan gömülemiyor. Kaynak linkinden siteye gidip izleyebilirsin.</div>`;
  const dlGrp = isHttpUrl ? `
      <span class="grp">
        <button class="copybtn" data-cmd="${esc(ytCmd(rawUrl, num+'. Bolum.mp4'))}" title="embed adresiyle indir">yt-dlp (mp4)</button>
        <button class="copybtn" data-cmd="${esc('yt-dlp -g "'+safeArg(rawUrl)+'"')}" title="-g doğrudan akış/m3u8 linkini verir">m3u8 (yt-dlp -g)</button>
        ${SERVER_OK?`<button class="copybtn" data-act="resolve" data-url="${esc(rawUrl)}">akışı çöz (m3u8/mp4)</button>`:''}
      </span>` : '';

  /* ---- gelişmiş: tüm bağlantılar (eski tam liste, isteğe bağlı açılır) ---- */
  const pCount = new Map(), fCount = new Map();
  for (const x of canli){
    pCount.set(x.l.player, (pCount.get(x.l.player)||0)+1);
    fCount.set(x.l.fansub, (fCount.get(x.l.fansub)||0)+1);
  }
  const advShown = canli
    .filter(x=> !optSelPlayers.size || optSelPlayers.has(x.l.player))
    .filter(x=> !optSelFansubs.size || optSelFansubs.has(x.l.fansub));
  const filtreli = optSelPlayers.size || optSelFansubs.size;
  const advancedHtml = `<details class="advanced">
    <summary>Tüm bağlantılar <span class="pchip" style="border:none;padding:0 0 0 4px">${canli.length}${deadCount?` · ${deadCount} ölü gizli`:''}</span></summary>
    ${chipRowHtml('Player', pCount, optSelPlayers, 'p')}
    ${chipRowHtml('Fansub', fCount, optSelFansubs, 'f')}
    <div id="optlist">
    ${advShown.length? advShown.map(x=>optRowHtml(x, num)).join('')
    : `<div class="empty"><div class="big"><i class="fa-solid fa-ban"></i></div>Görünür seçenek yok.${filtreli?' Filtreleri temizle.':''}</div>`}
    </div>
  </details>`;

  appEl().innerHTML = `${crumb}
    <h1 class="anime-title" style="font-size:20px">${esc(ep.ad)}</h1>
    <div class="watch">
      <div class="watch-top">
        ${epNav}
        ${fansubRow}
        ${iframeHtml}
        <div class="note-soft">Player açılmadıysa (üçüncü parti host engelleyebilir) <b>kaynak linkini</b> kullan ya da yt-dlp komutuyla indir.</div>
        ${hostRow}
      </div>
      ${sideList}
      <div class="watch-bot">
        <div class="pmeta">
          <span class="pname">${esc(cur.l.player)}</span>
          ${badge(cur.l.durum)}
          <span class="tag ${tipClass(cur.l.tip)}">${esc(cur.l.tip)}</span>
        </div>
        ${src?`<div class="src"><span class="lbl">Kaynak:</span><a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(src)}</a></div>`:''}
        ${dlGrp?`<div class="src"><span class="lbl">İndir:</span>${dlGrp}</div>`:''}
        <div class="controls">
          <button class="btn" id="epIndir"><i class="fa-solid fa-download"></i> Bu bölümü indir</button>
          <label class="tgl"><input type="checkbox" id="oluTgl" ${olu?'checked':''}> ölüleri göster</label>
          ${ADMIN&&_geriAl.length?`<button class="btn ghost" id="geriBtn" title="son kaldırdığın linki geri getir"><i class="fa-solid fa-rotate-left"></i> geri al (${_geriAl.length})</button>`:''}
          ${ADMIN&&kaldirilanSay()?`<button class="btn ghost" id="exportBtn" title="henüz repoya eklenmemiş kaldırmaları el_degisiklikleri.json olarak indir"><i class="fa-solid fa-file-export"></i> değişiklikleri dışa aktar (${kaldirilanSay()})</button>`:''}
        </div>
        ${ADMIN?`<div class="src"><span class="lbl">Yönetici:</span><button class="btn ghost" id="oluBtn"><i class="fa-solid fa-skull"></i> Bu link ölü — gizle</button><span style="color:var(--tx3);font-size:12px">bu tarayıcıda gizler; herkese açmak için bölüm sayfasından dışa aktar</span></div>`:''}
        <div class="src">
          <span class="lbl">Konsol komutu:</span>
          <button class="copybtn" data-cmd="${esc(cmd)}">${esc(cmd)}</button>
        </div>
        ${advancedHtml}
        ${yorumlarHtml('anime/'+slug+'/'+bolumId)}
      </div>
    </div>
  `;

  bindEpSide();
  mountGiscus();
  appEl().querySelectorAll('.fchip[data-pl]').forEach(a=>{
    a.addEventListener('click', e=>{ e.preventDefault(); kaynakDegistir(decodeURIComponent(a.dataset.pl), a.dataset.i); });
  });

  const tgl = $('#oluTgl');
  if (tgl) tgl.onchange = ()=>{ oluGoster.set(tgl.checked); renderEpisode(slug, data, bolumId, curPName, String(curIdx)); };
  const ei = $('#epIndir');
  if (ei) ei.onclick = ()=>{
    if (!ilkUrl){ alert('Bu bölümde indirilebilir url linki yok.'); return; }
    copyText(ytCmd(ilkUrl.url, num+'. Bolum.mp4')).then(()=> flashDone(ei,'kopyalandı ✓',1500,'<i class="fa-solid fa-download"></i> Bu bölümü indir'));
  };
  const gb = $('#geriBtn');
  if (gb) gb.onclick = ()=>{ linkGeriAl(); renderEpisode(slug, data, bolumId, curPName, String(curIdx)); };
  const ex = $('#exportBtn');
  if (ex) ex.onclick = ()=>{
    const payload = {kaldirilan_url: bekleyenKaldirilan(), tarih: new Date().toISOString()};
    indirFile('el_degisiklikleri.json', JSON.stringify(payload, null, 2), 'application/json');
    flashDone(ex, 'indirildi ✓', 1500);
  };
  const rv = appEl().querySelector('[data-act="resolve"]');
  if (rv) rv.onclick = ()=> showResolve(rv, rv.dataset.url);
  const ob = $('#oluBtn');
  if (ob) ob.onclick = ()=>{
    linkKaldir(rawUrl);
    const kalan = (fansubMap.get(cur.l.fansub)||[]).filter(c=> c.l.url!==rawUrl);
    if (kalan.length) kaynakDegistir(kalan[0].l.player, kalan[0].i);
    else renderEpisode(slug, data, bolumId, null, null);
  };
  /* gelişmiş liste: filtre çipleri + satırlar */
  appEl().querySelectorAll('.fchip[data-dim]').forEach(b=>{
    b.onclick = ()=>{
      const dim = b.dataset.dim, val = b.dataset.val;
      const set = dim==='p' ? optSelPlayers : optSelFansubs;
      if (set.has(val)) set.delete(val); else set.add(val);
      renderEpisode(slug, data, bolumId, curPName, String(curIdx));
    };
  });
  appEl().querySelectorAll('.fchip[data-temizle]').forEach(b=>{
    b.onclick = ()=>{
      if (b.dataset.temizle==='p') optSelPlayers = new Set();
      else optSelFansubs = new Set();
      renderEpisode(slug, data, bolumId, curPName, String(curIdx));
    };
  });
  appEl().querySelectorAll('#optlist .opt').forEach(el=>{
    el.onclick = (ev)=>{
      if (ev.target.closest('.mini')) return;
      kaynakDegistir(decodeURIComponent(el.dataset.pl), el.dataset.i);
    };
  });
  appEl().querySelectorAll('#optlist .mini').forEach(b=>{
    b.onclick = (ev)=>{
      ev.stopPropagation();
      const act = b.dataset.act, u = b.dataset.url;
      if (act==='kaldir'){ linkKaldir(u); renderEpisode(slug, data, bolumId, curPName, String(curIdx)); return; }
      if (act==='dl-mp4'){ copyText(ytCmd(u, num+'. Bolum.mp4')).then(()=> flashDone(b,'✓')); return; }
      if (act==='dl-g'){ copyText('yt-dlp -g "'+safeArg(u)+'"').then(()=> flashDone(b,'✓')); return; }
      if (act==='resolve'){ showResolve(b, u); return; }
    };
  });
  bindCopy();
}



/* ============ kaynak değişimi: sayfa yenilenmeden adres güncellenir ============ */
let EP_DATA = null, EP_SLUG = '', EP_ID = '';
function kaynakDegistir(player, i){
  if (!EP_DATA) return;
  history.replaceState(null, '', bolumUrl(EP_SLUG, EP_ID, player, i));
  renderEpisode(EP_SLUG, EP_DATA, EP_ID, player, String(i));
  const pb = document.querySelector('.player-box');
  if (pb) pb.scrollIntoView({block:'nearest'});
}

/* ============ sayfa açılışı ============ */
(function boot(){
  const yol = location.pathname.match(/\/bolum\/([^/]+)\/([^/]+)/) || [];   // isteğe bağlı temiz URL
  const slug = qp('seri') || yol[1] || '';
  const bolumId = qp('bolum') || yol[2] || '';
  window.CUR_SLUG = slug;
  if (!slug){ location.replace('animeler.html'); return; }
  if (!bolumId){ location.replace(animeUrl(slug)); return; }
  EP_SLUG = slug; EP_ID = bolumId;

  const meta = ANIME.find(a=>a.slug===slug);
  const ad = meta ? meta.baslik : slug;
  const bNo = /^\d+$/.test(bolumId) ? bolumId + '. Bölüm' : decodeURIComponent(bolumId);

  seoSet({
    title: `${ad} ${bNo} izle — ${SITE_ADI}`,
    desc: `${ad} ${bNo}: oynatıcı seçenekleri, çevirmen grupları ve indirme komutları.`,
    canonical: bolumUrl(slug, bolumId),
    robots: 'index,follow',
    crumbs: [{ad:'Ana sayfa', href:'index.html'}, {ad:'Animeler', href:'animeler.html'},
             {ad:ad, href:animeUrl(slug)}, {ad:bNo, href:bolumUrl(slug, bolumId)}]
  });

  bindHeader(false);
  initAniList();
  showLoading('Bölüm yükleniyor...');
  loadAnime(slug).then(data=>{
    EP_DATA = data;
    renderEpisode(slug, data, bolumId, qp('player') || null, qp('kaynak') || null);
    const e = findEp(data, bolumId);
    if (e) ldSet({'@context':'https://schema.org','@type':'TVEpisode', name: e.ad,
      episodeNumber: e.no!=null ? e.no : undefined, inLanguage:'ja',
      partOfSeries:{'@type':'TVSeries', name: ad, url: siteKok()+animeUrl(slug)}});
  }).catch(err=>{
    robotsSet('noindex,follow');
    appEl().innerHTML = `<div class="errbox"><b>${esc(ad)}</b> verisi yüklenemedi: ${esc(err.message)}</div>`;
  });
  window.onSunucuHazir = ()=>{ if (EP_DATA) renderEpisode(slug, EP_DATA, bolumId, qp('player') || null, qp('kaynak') || null); };
  pingServer();
})();
