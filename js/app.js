/* Kartu Pelajar SMK YAPIMDA — app */
(function () {
  'use strict';

  var CONFIG = window.CONFIG || { owner: '', repo: '', token: '' };
  var API = CONFIG.repo ? ('https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo) : null;

  var students = [];
  var problems = [];
  var comments = [];
  var activeJur = 'all';
  var query = '';
  var currentKey = null;
  var lastSeenKey = 'kp_lastseen';
  var totalPerJur = { MP1: 0, MP2: 0, AK: 0, PBS: 0 };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), searchInput = $('searchInput'), emptyState = $('emptyState'),
      resultCount = $('resultCount'), modal = $('modal'), toast = $('toast');

  var JUR_LABEL = { MP1: 'Manajemen Perkantoran 1', MP2: 'Manajemen Perkantoran 2', AK: 'Akuntansi', PBS: 'Perbankan Syariah' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function showToast(msg, isErr) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = isErr ? '#8f2f27' : '#17203f';
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

  /* ---------------- data ---------------- */
  function loadData() {
    return Promise.all([
      fetch('data/data.json').then(function (r) { return r.json(); }),
      fetch('data/problems.json').then(function (r) { return r.json(); })
    ]).then(function (arr) {
      students = arr[0];
      problems = arr[1];
      students.forEach(function (s) { totalPerJur[s.jurusan]++; });
    });
  }

  function problemByKey(key) {
    for (var i = 0; i < problems.length; i++) if (problems[i].key === key) return problems[i];
    return null;
  }

  /* ---------------- render ---------------- */
  function render() {
    $('cntAll').textContent = students.length;
    ['MP1','MP2','AK','PBS'].forEach(function (j) { $('cnt' + j).textContent = totalPerJur[j]; });
    $('issueTotal').textContent = problems.length;

    var list = students.filter(function (s) {
      if (activeJur !== 'all' && s.jurusan !== activeJur) return false;
      if (query) {
        var q = norm(query);
        if (norm(s.name).indexOf(q) === -1 && String(s.nis).indexOf(q) === -1) return false;
      }
      return true;
    });

    resultCount.textContent = list.length === students.length
      ? 'Menampilkan semua ' + students.length + ' kartu'
      : 'Menampilkan ' + list.length + ' dari ' + students.length + ' kartu';

    emptyState.classList.toggle('hidden', list.length !== 0);
    grid.innerHTML = list.map(function (s) {
      var prob = problemByKey(s.key);
      var chipCls = prob ? 'status-warn' : 'status-ok';
      var chipTxt = prob ? '⚠ lengkapi' : '✓ ok';
      return '<div class="tile" data-key="' + esc(s.key) + '" role="button" tabindex="0">' +
        '<div class="imgwrap"><img loading="lazy" src="' + esc(s.img) + '" alt="Kartu ' + esc(s.name) + '"></div>' +
        '<div class="cap"><div><b>' + esc(s.name) + '</b><small>' + esc(JUR_LABEL[s.jurusan] || s.jurusan) + '</small></div>' +
        '</div></div>';
    }).join('');

    grid.querySelectorAll('.tile').forEach(function (t) {
      t.addEventListener('click', function () { openModal(t.dataset.key); });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter') openModal(t.dataset.key); });
    });

    renderIssues();
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

    $('modalImg').src = st.img;
    $('mName').textContent = st.name;
    $('mChip').textContent = prob ? '⚠ Data belum lengkap' : '✓ Data lengkap';
    $('mChip').className = 'chip static ' + (prob ? 'status-warn' : 'status-ok');
    $('mNis').textContent = st.nis || '—';
    $('mNisn').textContent = st.nisn || '—';
    $('mJur').textContent = st.jurusan + ' · ' + (JUR_LABEL[st.jurusan] || st.jurusan);

    $('problemBox').classList.toggle('hidden', !prob);
    if (prob) {
      $('mProblem').textContent = prob.masalah + (prob.extra ? ' — ' + prob.extra : '.');
      $('mPerbaikan').innerHTML = '<b>Yang harus diperbaiki:</b> ' + esc(prob.perbaikan);
    }

    $('fMsg').value = '';
    $('fName').value = '';
    $('fStatus').textContent = '';
    $('fStatus').className = 'status';
    renderCommentList(key);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentKey = null;
  }

  function renderCommentList(key) {
    var box = $('commentList');
    var mine = comments.filter(function (c) { return c.key === key; });
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

  /* ---------------- comments (Google Apps Script + Sheets) ---------------- */
  function listComments() {
    if (!API) return Promise.resolve([]);
    var byKey = {};
    students.forEach(function (s) { byKey[s.key] = s.name; });
    return fetch(API + (API.indexOf('?') > -1 ? '&' : '?') + 'action=list')
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
      .catch(function () { return []; });
  }
  function postComment(key, type, msg, author) {
    var st = null, i;
    for (i = 0; i < students.length; i++) if (students[i].key === key) { st = students[i]; break; }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: key, type: type, msg: msg, name: author, nama: st ? st.name : '' })
    }).then(function (r) {
      return r.json();
    }).then(function (j) {
      if (!j || !j.ok) throw new Error('respon tidak dikenali');
      return j;
    });
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
      return '<div class="panel-item" data-key="' + esc(c.key) + '">' +
        '<div class="p-top"><span class="p-name">' + esc(c.name) + '</span>' +
        '<span class="p-date">' + fmtDate(c.date) + '</span></div>' +
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
    $('markReadBtn').style.display = comments.length ? '' : 'none';
    renderPanel();
  }
  function closePanel() { $('commentPanel').classList.remove('open'); }

  /* ---------------- events ---------------- */
  searchInput.addEventListener('input', function () {
    query = searchInput.value.trim();
    $('clearSearch').classList.toggle('hidden', !query);
    render();
  });
  $('clearSearch').addEventListener('click', function () { searchInput.value = ''; query = ''; this.classList.add('hidden'); render(); });
  $('chips').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    activeJur = chip.dataset.jur;
    $('chips').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
    render();
  });
  $('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closePanel(); } });

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
    $('fStatus').className = 'status';
    $('fStatus').textContent = 'Mengirim…';
    postComment(currentKey, type, msg, author).then(function () {
      $('fStatus').className = 'status ok';
      $('fStatus').textContent = 'Terima kasih! Laporan kamu sudah terkirim.';
      $('fMsg').value = '';
      return listComments().then(function (cs) {
        comments = cs;
        renderCommentList(currentKey);
        renderPanel();
      });
    }).catch(function (err) {
      $('fStatus').className = 'status err';
      $('fStatus').textContent = 'Gagal mengirim: ' + err.message + '. Coba lagi, atau hubungi admin sekolah.';
    }).finally(function () { btn.disabled = false; });
  });

  $('bellBtn').addEventListener('click', openPanel);
  $('panelClose').addEventListener('click', closePanel);
  $('markReadBtn').addEventListener('click', function () {
    var newL = comments.length ? new Date(comments[0].date).getTime() : Date.now();
    localStorage.setItem(lastSeenKey, String(newL));
    renderPanel();
  });

  /* ---------------- init ---------------- */
  loadData().then(function () {
    render();
    return listComments();
  }).then(function (cs) {
    comments = cs;
    renderPanel();
  }).catch(function () {
    grid.innerHTML = '<div class="empty"><p>Gagal memuat data. Muat ulang halaman.</p></div>';
  });
})();