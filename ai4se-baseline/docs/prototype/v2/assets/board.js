/* ==========================================================================
   RouteMe 路觅 · 原型图 v2 — 设计板装配
   3×2 排布六屏，等比缩放进屏框；点任一屏进入放大层（可交互）。
   ========================================================================== */
(function (global) {
  'use strict';

  var APP_W = 1120;
  var APP_H = 1142;

  var SCREENS = [
    { key: 'discover', no: 1, title: '旅行灵感', kind: '浏览' },
    { key: 'map', no: 2, title: '旅行地图', kind: '地图探索' },
    { key: 'create', no: 3, title: '发布行程', kind: '创建行程' },
    { key: 'ai', no: 4, title: 'AI 规划', kind: '智能推荐' },
    { key: 'mine', no: 5, title: '我的旅行', kind: '行程管理' },
    { key: 'chat', no: 6, title: '同行消息', kind: '社交沟通' }
  ];

  var board = document.getElementById('board');
  var ovl = document.getElementById('ovl');
  var ovlApp = document.getElementById('ovl-app');
  var ovlScaler = document.getElementById('ovl-scaler');
  var ovlStage = document.getElementById('ovl-stage');
  var ovlCap = document.getElementById('ovl-cap');
  var ovlIndex = -1;

  /* --------------------------------------------------------------- 设计板 */
  board.innerHTML = SCREENS.map(function (s) {
    return '<article class="cell" id="cell-' + s.key + '">'
      + '<h2 class="cell-cap"><span class="no">' + s.no + '.</span>'
      + '<span class="kind">' + s.title + '（' + s.kind + '）</span></h2>'
      + '<div class="frame" role="button" tabindex="0" data-open="' + s.key + '" title="点击放大并交互：' + s.title + '">'
      + '<div class="frame-scaler">' + global.APP.render(s.key) + '</div>'
      + '<span class="frame-zoom">' + global.APP.ic('expand') + '放大查看</span>'
      + '</div></article>';
  }).join('');

  function fitFrames() {
    var frames = board.querySelectorAll('.frame');
    for (var i = 0; i < frames.length; i++) {
      var w = frames[i].clientWidth;
      if (!w) continue;
      frames[i].firstElementChild.style.transform = 'scale(' + (w / APP_W) + ')';
    }
  }

  if (global.ResizeObserver) {
    new ResizeObserver(fitFrames).observe(board);
  }
  global.addEventListener('resize', fitFrames);
  fitFrames();
  global.addEventListener('load', fitFrames);
  /* 字体载入后行高会变，补一次 */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFrames);

  /* --------------------------------------------------------------- 放大层 */
  function fitOverlay() {
    var z = Math.min((global.innerWidth - 56) / APP_W, (global.innerHeight - 104) / APP_H, 1);
    ovlScaler.style.transform = 'scale(' + z + ')';
    ovlStage.style.height = Math.round(APP_H * z + 18) + 'px';
  }

  function paint(i) {
    ovlIndex = (i + SCREENS.length) % SCREENS.length;
    var s = SCREENS[ovlIndex];
    ovlCap.innerHTML = '<span class="no">' + s.no + '.</span>' + s.title
      + '<span class="kind">（' + s.kind + '）</span>';
    ovlApp.innerHTML = global.APP.render(s.key);
    fitOverlay();
  }

  function open(key) {
    var i = 0;
    for (var k = 0; k < SCREENS.length; k++) if (SCREENS[k].key === key) i = k;
    paint(i);
    ovl.hidden = false;
    document.body.style.overflow = 'hidden';
    fitOverlay();
    var closeBtn = ovl.querySelector('[data-ov="close"]');
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (ovl.hidden) return;
    ovl.hidden = true;
    document.body.style.overflow = '';
    var s = SCREENS[ovlIndex];
    var cell = s && document.getElementById('cell-' + s.key);
    if (cell) cell.querySelector('.frame').focus();
  }

  board.addEventListener('click', function (e) {
    var frame = e.target.closest('[data-open]');
    if (frame) { e.preventDefault(); open(frame.getAttribute('data-open')); }
  });
  board.addEventListener('keydown', function (e) {
    var frame = e.target.closest('[data-open]');
    if (!frame) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(frame.getAttribute('data-open')); }
  });

  ovl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ov]');
    if (!btn) return;
    var act = btn.getAttribute('data-ov');
    if (act === 'close') close();
    if (act === 'prev') { paint(ovlIndex - 1); ovlStage.scrollTop = 0; }
    if (act === 'next') { paint(ovlIndex + 1); ovlStage.scrollTop = 0; }
  });

  document.addEventListener('keydown', function (e) {
    if (ovl.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' && !isTyping(e)) { paint(ovlIndex + 1); }
    if (e.key === 'ArrowLeft' && !isTyping(e)) { paint(ovlIndex - 1); }
  });

  function isTyping(e) {
    var t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  }

  /* --------------------------------------------------- 放大层内的轻交互 */
  function setGroupOn(el, groupSel) {
    var group = el.parentElement;
    while (group && !group.matches(groupSel)) group = group.parentElement;
    if (!group) group = el.parentElement;
    var peers = group.querySelectorAll('.on');
    for (var i = 0; i < peers.length; i++) {
      if (peers[i].matches('.chip, .a-tab, .t-tab, .a-plan-tab, .cx-tab')) peers[i].classList.remove('on');
    }
    el.classList.add('on');
  }

  ovlApp.addEventListener('click', function (e) {
    /* 侧栏切屏 */
    var go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      var key = go.getAttribute('data-go');
      for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i].key === key) paint(i);
      return;
    }
    /* 标签 / 筛选 */
    var chip = e.target.closest('[data-chip], [data-tab]');
    if (chip && !chip.matches('.a-plan-tab, .t-tab, .a-tab, .cx-tab, .chip')) chip.classList.toggle('on');
    if (chip && chip.matches('.a-plan-tab, .t-tab, .a-tab, .cx-tab, .chip')) setGroupOn(chip);
    /* 收藏 */
    var like = e.target.closest('[data-like]');
    if (like) { like.classList.toggle('on'); return; }
    /* 会话切换 */
    var conv = e.target.closest('[data-conv]');
    if (conv) {
      var rows = ovlApp.querySelectorAll('.cv');
      for (var j = 0; j < rows.length; j++) rows[j].classList.remove('on');
      conv.classList.add('on');
      return;
    }
    if (e.target.closest('[data-send-msg]')) sendMsg();
    if (e.target.closest('[data-send-ai]')) sendAi();
  });

  ovlApp.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t.classList.contains('chat-input') || (t.tagName === 'INPUT' && t.closest('.cx-input'))) { e.preventDefault(); sendMsg(); }
    if (t.tagName === 'INPUT' && t.closest('.a-input')) { e.preventDefault(); sendAi(); }
  });

  function sendMsg() {
    var input = ovlApp.querySelector('.cx-input input');
    var body = ovlApp.querySelector('.cx-body');
    if (!input || !body || !input.value.trim()) return;
    var el = document.createElement('div');
    el.className = 'msg me';
    el.textContent = input.value.trim();
    body.appendChild(el);
    input.value = '';
    body.scrollTop = body.scrollHeight;
    global.setTimeout(function () {
      var reply = document.createElement('div');
      reply.className = 'msg them';
      reply.textContent = '收到～我把集合时间改到 9:00，出发前会在群里再确认一次。';
      body.appendChild(reply);
      body.scrollTop = body.scrollHeight;
    }, 600);
  }

  function sendAi() {
    var input = ovlApp.querySelector('.a-input input');
    var scroll = ovlApp.querySelector('.a-scroll');
    if (!input || !scroll || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';

    var mine = document.createElement('div');
    mine.className = 'a-msg me';
    mine.innerHTML = '<div class="a-bubble me"></div>';
    mine.firstElementChild.textContent = text;
    scroll.appendChild(mine);

    global.setTimeout(function () {
      var reply = document.createElement('div');
      reply.className = 'a-msg';
      reply.innerHTML = '<span class="a-ai-av">' + global.APP.ic('sparkle') + '</span>'
        + '<div class="a-bubble"><p class="lead">已按你的要求调整：</p>'
        + '<ul class="a-ask"><li><span class="bullet"></span><span>Day1 傍晚把情侣路换成「珠海渔女 → 日月贝」顺光机位</span></li>'
        + '<li><span class="bullet"></span><span>Day2 上午调整为早茶 + 老香洲 citywalk，避开人流</span></li></ul>'
        + '<p style="margin-top:6px">需要我把这条行程直接发布成招募吗？</p></div>';
      scroll.appendChild(reply);
      scroll.scrollTop = scroll.scrollHeight;
    }, 700);
  }

  global.BOARD = { open: open, close: close, SCREENS: SCREENS };
})(window);