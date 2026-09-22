/* Kartu Pelajar SMK YAPIMDA — app */
(function () {
  'use strict';

  var CONFIG = window.CONFIG || { owner: '', repo: '', token: '' };
  var API = CONFIG.gsbase ? CONFIG.gsbase : null;

  var students = [];
  var problems = [];
  var comments = [];
  var verifiedMap = {};
  var localRecords = [];
  var pendingSync = [];
  var sheetRecords = [];
  var flushing = false;
  var syncFailedToast = false;
  var LS_REC = 'kartu_local_records_v1';
  var LS_PEND = 'kartu_pending_sync_v1';
  var confirmMode = 'verify';
  var activeJur = 'all';
  var query = '';
  var currentKey = null;
  var lastSeenKey = 'kp_lastseen';
  var totalPerJur = { MP1: 0, MP2: 0, AK: 0, PBS: 0, DKV: 0, BD: 0 };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), searchInput = $('searchInput'), emptyState = $('emptyState'),
      resultCount = $('resultCount'), modal = $('modal'), toast = $('toast'), modalImg = $('modalImg');

  var JUR_LABEL = { MP1: 'Manajemen Perkantoran 1', MP2: 'Manajemen Perkantoran 2', AK: 'Akuntansi', PBS: 'Perbankan Syariah', DKV: 'Desain Komunikasi Visual', BD: 'Bisnis Digital' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function showToast(msg, kind) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = kind === 'err' ? '#8f2f27' : kind === 'ok' ? 'var(--ok)' : '#17203f';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.add('hidden'); }, 4200);
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    var dte = d.getDate(), mo = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    return dte + ' ' + mo + ', ' + hh + ':' + mm;
  }
  function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* ---------------- data ---------------- */
  function loadData() {
    var ver = window.VERSION ? '?v=' + window.VERSION : '';
    return Promise.all([
      fetch('data/data.json' + ver).then(function (r) { return r.json(); }),
      fetch('data/problems.json' + ver).then(function (r) { return r.json(); })
    ]).then(function (arr) {
      students = arr[0].filter(function (s) { return !s.hidden; });
      var visibleKeys = {};
      students.forEach(function (s) { visibleKeys[s.key] = true; });
      problems = arr[1].filter(function (p) { return visibleKeys[p.key]; });
      students.forEach(function (s) { totalPerJur[s.jurusan]++; });
    });
  }

  function problemByKey(key) {
    for (var i = 0; i < problems.length; i++) if (problems[i].key === key) return problems[i];
    return null;
  }

  /* URL gambar + cache-busting versi deploy (mencegah browser memakai JPG lama) */
  function imgUrl(s) {
    return s + (window.VERSION ? '?v=' + window.VERSION : '');
  }

  /* ---------------- render ---------------- */
  var PAGE_SIZE = 12;
  var shownCount = PAGE_SIZE;
  var userRendered = false;

  function render() {
    $('cntAll').textContent = students.length;
    ['MP1','MP2','AK','PBS','DKV','BD'].forEach(function (j) { $('cnt' + j).textContent = totalPerJur[j]; });
    $('issueTotal').textContent = problems.length;
    renderGrid(true);
    renderIssues();
  }

  /* daftar siswa setelah difilter (jurusan + pencarian) */
  function currentList() {
    return students.filter(function (s) {
      if (activeJur !== 'all' && s.jurusan !== activeJur) return false;
      if (query) {
        var q = norm(query);
        if (norm(s.name).indexOf(q) === -1 && String(s.nis).indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function tileImgHTML(s, i) {
    var ver = window.VERSION ? '?v=' + window.VERSION : '';
    var attrs = i < 4
      ? 'loading="eager" fetchpriority="high" decoding="async"'
      : 'loading="lazy" decoding="async"';
    if (s.noThumb) {
      return '<img ' + attrs + ' src="' + esc(s.img + ver) + '" alt="Kartu ' + esc(s.name) + '">';
    }
    var thumb = 'cards/thumb/' + s.key + '.jpg' + ver;
    var webp = 'cards/thumb/' + s.key + '.webp' + ver;
    return '<picture>' +
      '<source type="image/webp" srcset="' + esc(webp) + '">' +
      '<img ' + attrs + ' src="' + esc(thumb) + '" alt="Kartu ' + esc(s.name) + '">' +
      '</picture>';
  }

  function tileHTML(s, i) {
    var badge = verifiedMap[s.key] === true
      ? '<span class="ver-stamp">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
        'TERVERIFIKASI</span>'
      : '';
    return '<div class="tile" data-key="' + esc(s.key) + '" role="button" tabindex="0" style="animation-delay:' + ((i % 14) * 0.022) + 's">' +
      '<div class="imgwrap">' + badge + tileImgHTML(s, i) + '</div>' +
      '<div class="cap"><div><b>' + esc(s.name) + '</b><small>' + esc(JUR_LABEL[s.jurusan] || s.jurusan) + '</small></div>' +
      '</div></div>';
  }

  function bindTiles(nodes) {
    Array.prototype.forEach.call(nodes, function (t) {
      t.addEventListener('click', function () { openModal(t.dataset.key); });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter') openModal(t.dataset.key); });
    });
  }

  function updateResultCount(total, shown) {
    resultCount.textContent = shown < total
      ? 'Menampilkan ' + shown + ' dari ' + total + ' kartu'
      : (total === students.length
          ? 'Menampilkan semua ' + total + ' kartu'
          : 'Menampilkan ' + total + ' kartu');
  }

  function updateLoadMore(total, shown) {
    var wrap = $('loadMoreWrap');
    if (!wrap) return;
    if (total > shown) {
      var left = total - shown;
      $('loadMoreCount').textContent = left + ' kartu lagi';
      $('loadMoreBtn').disabled = false;
      wrap.classList.remove('hidden');
    } else {
      wrap.classList.add('hidden');
    }
  }

  function renderGrid(resetPage) {
    var list = currentList();
    var total = list.length;
    if (resetPage) shownCount = PAGE_SIZE;
    if (shownCount > total) shownCount = total;
    if (shownCount < 0) shownCount = 0;
    var visible = list.slice(0, shownCount);

    updateResultCount(total, visible.length);
    emptyState.classList.toggle('hidden', total !== 0);
    grid.innerHTML = visible.map(tileHTML).join('');
    bindTiles(grid.querySelectorAll('.tile'));
    updateLoadMore(total, visible.length);
  }

  function loadMoreTiles() {
    var list = currentList();
    var prev = shownCount;
    shownCount = Math.min(shownCount + PAGE_SIZE, list.length);
    if (shownCount === prev) { updateLoadMore(list.length, shownCount); return; }
    var holder = document.createElement('div');
    holder.innerHTML = list.slice(prev, shownCount).map(function (s, i) { return tileHTML(s, prev + i); }).join('');
    var added = holder.querySelectorAll('.tile');
    bindTiles(added);
    Array.prototype.forEach.call(added, function (t) { grid.appendChild(t); });
    updateResultCount(list.length, shownCount);
    updateLoadMore(list.length, shownCount);
  }

  function renderIssues() {
    $('issueList').innerHTML = problems.map(function (p) {
      return '<div class="issue" data-key="' + esc(p.key) + '">' +
        '<div class="issue-head"><span class="no">' + p.no + '</span>' +
        '<div class="who"><b>' + esc(p.name) + '</b><small>' + esc(JUR_LABEL[p.jurusan] || p.jurusan) + '</small></div>' +
        '<span class="chev">▾</span></div>' +
        '<div class="issue-body"><p><b>Masalah:</b> ' + esc(p.masalah) + (p.extra ? ' <b style="color:#c09a5a">· ' + esc(p.extra) + '</b>' : '') + '</p>' +
        '<div class="perbaikan"><b>Yang harus diperbaiki:</b><br>' + esc(p.perbaikan) + '</div>' +
        '<div class="foot-actions"><button class="btn ghost small" data-open="' + esc(p.key) + '">Buka kartu &amp; isi data →</button></div></div></div>';
    }).join('');

    $('issueList').querySelectorAll('.issue').forEach(function (card) {
      var head = card.querySelector('.issue-head');
      head.addEventListener('click', function () { card.classList.toggle('open'); });
      var btn = card.querySelector('[data-open]');
      if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); openModal(btn.dataset.open); });
    });
  }

  /* ---------------- modal ---------------- */
  function openModal(key) {
    var st = null, prob = null;
    for (var i = 0; i < students.length; i++) if (students[i].key === key) { st = students[i]; break; }
    if (!st) return;
    prob = problemByKey(key);
    currentKey = key;

    modalImg.classList.remove('zoomed');
    modalImg.src = imgUrl(st.img);
    $('mName').textContent = st.name;
    $('mChip').textContent = prob ? '⚠ Data belum lengkap' : '✓ Data lengkap';
    $('mChip').className = 'chip static ' + (prob ? 'status-warn' : 'status-ok');
    $('mNis').textContent = st.nis || '—';
    $('mNisn').textContent = st.nisn || '—';
    $('mJur').textContent = st.jurusan + ' · ' + (JUR_LABEL[st.jurusan] || st.jurusan);
    $('modalStamp').classList.toggle('hidden', verifiedMap[st.key] !== true);

    $('problemBox').classList.toggle('hidden', !prob);
    if (prob) {
      $('mProblem').textContent = prob.masalah + (prob.extra ? ' — ' + prob.extra : '.');
      $('mPerbaikan').innerHTML = '<b>Yang harus diperbaiki:</b> ' + esc(prob.perbaikan);
    }

    $('fMsg').value = '';
    $('fName').value = '';
    $('fStatus').textContent = '';
    $('fStatus').className = 'status';
    var isDesk = window.innerWidth >= 761;
    setSec('secForm', isDesk || !!prob);
    setSec('secComments', isDesk);
    renderCommentList(key);
    renderVerBox();

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modalImg.classList.remove('zoomed');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentKey = null;
  }

  function currentStudent() {
    if (!currentKey) return null;
    for (var i = 0; i < students.length; i++) if (students[i].key === currentKey) return students[i];
    return null;
  }

  /* ---------------- verifikasi kartu ---------------- */
  var CHK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function renderVerBox() {
    var st = currentStudent();
    var box = $('verBox');
    if (!st || !box) return;
    box.innerHTML = '';
    if (verifiedMap[st.key] === true) {
      box.innerHTML = '<div class="ver-state on"><span class="ver-ico">' + CHK + '</span>' +
        '<div class="ver-txt"><b>Kartu sudah diverifikasi</b><small>Kamu sudah menandai data di kartu ini benar.</small></div>' +
        '<button id="verCancel" type="button" class="btn small ghost danger">Batalkan</button></div>';
    } else {
      box.innerHTML = '<div class="ver-state"><span class="ver-ico">' + CHK + '</span>' +
        '<div class="ver-txt"><b>Data kartu kamu sudah benar?</b><small>Periksa TTL &amp; alamat di kartu, lalu verifikasi.</small></div>' +
        '<button id="verGo" type="button" class="btn small primary">Verifikasi</button></div>';
    }
    box.classList.remove('hidden');
    var ms = $('modalStamp');
    if (ms) ms.classList.toggle('hidden', verifiedMap[st.key] !== true);
    var go = $('verGo'), cancel = $('verCancel');
    if (!API) {
      var note = document.createElement('div');
      note.className = 'ver-note';
      note.textContent = 'Fitur verifikasi aktif setelah sekolah menghubungkan penyimpanan data (Google Sheets).';
      box.appendChild(note);
      if (go) go.disabled = true;
      if (cancel) cancel.disabled = true;
    }
    if (go) go.addEventListener('click', function () { openConfirm('verify'); });
    if (cancel) cancel.addEventListener('click', function () { openConfirm('cancel'); });
  }

  /* ---------------- dialog konfirmasi verifikasi ---------------- */
  function openConfirm(mode) {
    var st = currentStudent();
    if (!st) return;
    confirmMode = mode;
    var isVer = mode === 'verify';
    var ico = $('confirmIco');
    ico.className = 'confirm-ico ' + (isVer ? 'verify' : 'cancel');
    ico.innerHTML = isVer ? CHK
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    $('confirmTitle').textContent = isVer ? 'Verifikasi kartu pelajar' : 'Batalkan verifikasi';
    $('confirmSub').innerHTML = isVer
      ? 'Hanya verifikasi jika <b>semua data di kartu sudah benar</b> sesuai data kamu.'
      : 'Yakin ingin membatalkan verifikasi kartu <b>' + esc(st.name) + '</b>?';
    $('cfName').textContent = st.name || '—';
    $('cfNis').textContent = st.nis || '—';
    $('cfNisn').textContent = st.nisn || '—';
    $('cfJur').textContent = st.jurusan + ' · ' + (JUR_LABEL[st.jurusan] || st.jurusan);
    $('confirmData').classList.toggle('hidden', !isVer);
    var warn = $('confirmWarn');
    warn.textContent = isVer
      ? 'Setelah diverifikasi, kartu kamu ditandai ✓ dan pihak sekolah mengetahui kamu sudah memastikan datanya benar.'
      : 'Status terverifikasi pada kartu ini akan dihapus.';
    warn.className = 'confirm-warn' + (isVer ? '' : ' cancel');
    var ok = $('cfOk');
    ok.textContent = isVer ? 'Ya, data sudah benar' : 'Ya, batalkan';
    ok.disabled = false;
    ok.className = 'btn ' + (isVer ? 'primary' : 'danger');
    $('cfCancel').textContent = 'Batal';
    $('confirm').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeConfirm() {
    $('confirm').classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }
  function postVerification() {
    var st = currentStudent();
    if (!st || !currentKey) return;
    if (!API) {
      closeConfirm();
      showToast('Verifikasi belum aktif — admin belum mengisi tautan Google Sheets.', 'err');
      return;
    }
    var isVer = confirmMode === 'verify';
    postComment(currentKey, isVer ? 'Verifikasi' : 'Batal Verifikasi',
      isVer ? 'Murid memverifikasi kartu — data sudah benar.' : 'Murid membatalkan verifikasi kartu.', '')
      .then(function () {
        closeConfirm();
        renderVerBox();
        renderGrid();
        renderCommentList(currentKey);
        renderPanel();
        showToast(isVer ? 'Kartu berhasil diverifikasi ✓' : 'Verifikasi dibatalkan.', 'ok');
      });
  }

  function renderCommentList(key) {
    var box = $('commentList');
    var mine = comments.filter(function (c) { return c.key === key; });
    updateCmtCount(mine.length);
    if (!mine.length) {
      box.innerHTML = '<div class="muted small">Belum ada laporan untuk kartu ini.</div>';
      return;
    }
    box.innerHTML = mine.map(function (c) {
      return '<div class="comment"><div class="c-meta"><span class="c-tag ' + esc(c.type) + '">' + esc(c.type) + '</span>' +
        '<span>' + fmtDate(c.date) + '</span></div>' +
        (c.author ? '<b>' + esc(c.author) + ':</b> ' : '') + esc(c.msg) + '</div>';
    }).join('');
  }

  function updateCmtCount(n) {
    var el = $('cmtCnt');
    if (!el) return;
    el.textContent = n || '';
  }

  function setSec(id, open) {
    var box = $(id);
    var head = document.querySelector('[data-sec="' + id + '"]');
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (box) box.classList.toggle('open', open);
  }

  /* ---------------- comments (Google Apps Script + Sheets) ---------------- */
  /* fetch dengan timeout — Google Apps Script dapat sangat lambat atau menggantung */
  function fetchT(url, opts, ms) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 30000) : null;
    var o = opts || {};
    if (ctrl) o = Object.assign({}, o, { signal: ctrl.signal });
    return fetch(url, o).then(function (r) {
      if (timer) clearTimeout(timer);
      return r;
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (ctrl && ctrl.signal.aborted) { var e = new Error('Waktu habis — jaringan/Google Sheets lambat, coba lagi.'); e.name = 'TimeoutError'; throw e; }
      throw err;
    });
  }
  var recordsCache = null;
  function fetchRecords() {
    if (recordsCache) return recordsCache;
    if (!API) return Promise.resolve([]);
    var byKey = {};
    students.forEach(function (s) { byKey[s.key] = s.name; });
    recordsCache = fetchT(API + (API.indexOf('?') > -1 ? '&' : '?') + 'action=list', null, 30000)
      .then(function (r) { return r.json(); })
      .then(function (items) {
        return (items || []).filter(function (c) { return c && c.key && byKey[c.key]; }).map(function (c) {
          return {
            key: c.key,
            name: byKey[c.key] || '',
            type: c.type || 'Komentar',
            msg: c.msg || '',
            author: c.author || '',
            date: c.date || ''
          };
        });
      })
      .catch(function () { recordsCache = null; return []; });
    return recordsCache;
  }
  /* ---------------- penyimpanan lokal (instan) + sinkron latar belakang ke Sheets ---------------- */
  function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function loadLS(key, dflt) { try { return JSON.parse(localStorage.getItem(key)) || dflt; } catch (e) { return dflt; } }
  function loadLocal() {
    localRecords = loadLS(LS_REC, []);
    pendingSync = loadLS(LS_PEND, []);
  }
  function nameByKey(key) {
    for (var i = 0; i < students.length; i++) if (students[i].key === key) return students[i].name;
    return '';
  }
  function timeMs(v) {
    var d = typeof v === 'number' ? new Date(v) : new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  function dtKey(v) {
    var d = typeof v === 'number' ? new Date(v) : new Date(v);
    return isNaN(d.getTime()) ? '0000-00-00' : d.toISOString().slice(0, 10);
  }
  function fpOf(r) { return (r.key || '') + '|' + (r.type || '') + '|' + (r.msg || '') + '|' + (r.author || '') + '|' + dtKey(r.date); }
  function rebuildState() {
    var seen = {};
    var all = [];
    function add(c) {
      var fp = fpOf(c);
      if (seen[fp]) return;
      seen[fp] = 1;
      all.push({ key: c.key, name: c.name || nameByKey(c.key), type: c.type, msg: c.msg, author: c.author, date: c.date });
    }
    localRecords.forEach(add);
    sheetRecords.forEach(add);
    all.sort(function (a, b) { return timeMs(b.date) - timeMs(a.date); });
    comments = all;
    var v = {};
    all.forEach(function (c) {
      if ((c.type === 'Verifikasi' || c.type === 'Batal Verifikasi') && !(c.key in v)) v[c.key] = c.type === 'Verifikasi';
    });
    verifiedMap = v;
  }
  function flushPending() {
    if (!API || flushing || !pendingSync.length) return;
    flushing = true;
    var rec = pendingSync[0];
    var st = null;
    for (var i = 0; i < students.length; i++) if (students[i].key === rec.key) { st = students[i]; break; }
    fetchT(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: rec.key, type: rec.type, msg: rec.msg, name: rec.author, nama: st ? st.name : '' })
    }, 60000).then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error('respon tidak dikenali');
        recordsCache = null;
        pendingSync.shift();
        saveLS(LS_PEND, pendingSync);
        flushing = false;
        flushPending();
      })
      .catch(function () {
        flushing = false;
        if (!syncFailedToast) {
          syncFailedToast = true;
          showToast('Tersimpan di perangkat. Sinkronisasi ke admin belum berhasil — akan dicoba lagi otomatis.', 'err');
        }
      });
  }
  function syncSheet() {
    if (!API) return;
    flushPending();
    fetchRecords().then(function (rs) {
      sheetRecords = rs;
      rebuildState();
      if (userRendered) { renderGrid(); } else { render(); }
      renderPanel();
      if (currentKey) { renderCommentList(currentKey); renderVerBox(); }
    });
  }
  function postComment(key, type, msg, author) {
    var now = Date.now();
    var dup = localRecords.some(function (r) {
      return r.key === key && r.type === type && r.msg === msg && now - timeMs(r.date) < 4000;
    });
    if (!dup) {
      var rec = { key: key, type: type, msg: msg, author: author || '', date: now };
      localRecords.push(rec);
      pendingSync.push(rec);
      saveLS(LS_REC, localRecords.slice(-500));
      saveLS(LS_PEND, pendingSync);
      rebuildState();
      flushPending();
    }
    return Promise.resolve();
  }

  /* ---------------- notification panel ---------------- */
  function getLastSeen() { return +(localStorage.getItem(lastSeenKey) || 0); }
  function unreadCount() {
    var ls = getLastSeen();
    return comments.filter(function (c) { return new Date(c.date).getTime() > ls; }).length;
  }
  function renderPanel() {
    var box = $('panelList');
    if (!comments.length) {
      box.innerHTML = '<div class="muted center pad">Belum ada laporan.\nJika ada siswa yang melaporkan masalah, akan muncul di sini.</div>';
      $('unreadHint').textContent = '';
      return;
    }
    var count = unreadCount();
    $('bellBadge').textContent = count;
    $('bellBadge').classList.toggle('hidden', count === 0);
    $('unreadHint').textContent = count ? count + ' belum dibaca' : 'semua sudah dibaca';
    box.innerHTML = comments.map(function (c) {
      var st = null;
      for (var i = 0; i < students.length; i++) if (students[i].key === c.key) { st = students[i]; break; }
      return '<div class="panel-item" data-key="' + esc(c.key) + '">' +
        '<div class="p-top"><span class="p-name">' + esc(c.name) + '</span>' +
        '<span class="p-date">' + fmtDate(c.date) + '</span></div>' +
        '<div class="p-sub">NIS ' + esc(st && st.nis ? st.nis : '-') + ' &middot; ' +
        esc(st && st.jurusan ? (JUR_LABEL[st.jurusan] || st.jurusan) : '-') + '</div>' +
        '<div class="p-msg"><span class="c-tag ' + esc(c.type) + '">' + esc(c.type) + '</span> ' + esc(c.msg) + '</div></div>';
    }).join('');
    box.querySelectorAll('.panel-item').forEach(function (el) {
      el.addEventListener('click', function () {
        closePanel();
        openModal(el.dataset.key);
      });
    });
  }
  function openPanel() {
    $('commentPanel').classList.add('open');
    $('bellBtn').setAttribute('aria-expanded', 'true');
    $('markReadBtn').style.display = comments.length ? '' : 'none';
    renderPanel();
  }
  function closePanel() {
    $('commentPanel').classList.remove('open');
    $('bellBtn').setAttribute('aria-expanded', 'false');
  }

  /* ---------------- events ---------------- */
  searchInput.addEventListener('input', debounce(function () {
    query = searchInput.value.trim();
    $('clearSearch').classList.toggle('hidden', !query);
    userRendered = true;
    render();
  }, 130));
  $('clearSearch').addEventListener('click', function () { searchInput.value = ''; query = ''; this.classList.add('hidden'); userRendered = true; render(); });
  $('searchBtn').addEventListener('click', function () { searchInput.focus(); userRendered = true; render(); });
  $('chips').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    activeJur = chip.dataset.jur;
    $('chips').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
    userRendered = true;
    render();
  });
  var loadMoreBtn = $('loadMoreBtn');
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreTiles);
  $('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modalImg.addEventListener('click', function () { modalImg.classList.toggle('zoomed'); });
  $('confirm').addEventListener('click', function (e) { if (e.target === $('confirm')) closeConfirm(); });
  $('cfCancel').addEventListener('click', closeConfirm);
  $('cfOk').addEventListener('click', postVerification);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!$('confirm').classList.contains('hidden')) { closeConfirm(); return; }
      if (modalImg.classList.contains('zoomed')) { modalImg.classList.remove('zoomed'); return; }
      closeModal(); closePanel();
    }
  });

  $('fSend').addEventListener('click', function () {
    var msg = $('fMsg').value.trim();
    var author = $('fName').value.trim();
    var type = $('fType').value;
    var st = null;
    for (var i = 0; i < students.length; i++) if (students[i].key === currentKey) { st = students[i]; break; }
    if (!msg) { $('fStatus').className = 'status err'; $('fStatus').textContent = 'Tulis dulu isi laporan / perbaikannya.'; return; }
    if (!API) {
      $('fStatus').className = 'status err';
      $('fStatus').textContent = 'Komentar belum diaktifkan (admin belum mengisi tautan Google Sheets di config.js).';
      return;
    }
    var btn = $('fSend');
    btn.disabled = true;
    $('fStatus').className = 'status ok';
    $('fStatus').textContent = 'Tersimpan! Laporan dicatat dan dikirim ke admin secara otomatis.';
    postComment(currentKey, type, msg, author).then(function () {
      $('fStatus').textContent = 'Terima kasih! Laporan kamu sudah terkirim.';
      $('fMsg').value = '';
      renderCommentList(currentKey);
      renderPanel();
      renderGrid();
      btn.disabled = false;
    });
  });

  document.querySelectorAll('.sec-head').forEach(function (head) {
    head.addEventListener('click', function () {
      setSec(head.dataset.sec, head.getAttribute('aria-expanded') !== 'true');
    });
  });

  $('bellBtn').addEventListener('click', openPanel);
  $('panelClose').addEventListener('click', closePanel);
  $('markReadBtn').addEventListener('click', function () {
    var newL = comments.length ? new Date(comments[0].date).getTime() : Date.now();
    localStorage.setItem(lastSeenKey, String(newL));
    renderPanel();
  });

  /* ---------------- init ---------------- */
  function boot() {
    loadData().then(function () {
      loadLocal();
      rebuildState();
      render();
      renderPanel();
      syncSheet();
    }).catch(function () {
      grid.innerHTML =
        '<div class="es-card es-error">' +
          '<div class="es-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v7"/><path d="M12 17h.01"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>' +
          '</div>' +
          '<h3>Gagal memuat data</h3>' +
          '<p class="es-desc">Terjadi masalah saat memuat data kartu. Periksa koneksi internet kamu, lalu coba lagi.</p>' +
          '<button id="retryBtn" class="btn primary">Coba lagi</button>' +
        '</div>';
      var rb = $('retryBtn');
      if (rb) rb.addEventListener('click', function () { grid.innerHTML = ''; boot(); });
    });
  }
  boot();

  /* ---------------- tombol kembali ke atas ---------------- */
  var toTop = $('toTop');
  var topbarEl = $('topbar');
  var progEl = $('tbProgress');
  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      var y = window.pageYOffset;
      toTop.classList.toggle('hidden', y < 480);
      if (topbarEl) topbarEl.classList.toggle('scrolled', y > 10);
      if (progEl) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progEl.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      scrollTicking = false;
    });
  }, { passive: true });
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  var brandLink = document.querySelector('.brand-link');
  if (brandLink) brandLink.addEventListener('click', function (e) {
    if (window.pageYOffset > 0) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
})();